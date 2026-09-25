'use strict';

/**
 * Verificacion manual de los hooks fusionados (guardrails.js, session-start.js,
 * post-write-checks.js) mas nudge-review.js. Alimenta cada uno con un payload
 * de ejemplo y confirma que stdout sea JSON valido (o exit 2 + stderr para el
 * unico caso de bloqueo en seco) con el campo esperado.
 *
 * Uso: node hooks/scripts/__tests__/verify-hooks.js
 * No se ejecuta como parte de ningun hook — es una verificacion a demanda.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  loadTopicRegistry,
  loadPluginTopics,
  loadProjectTopicStatus,
} = require('../lib/standards-frontmatter');

const SCRIPTS_DIR = path.join(__dirname, '..');
const PLUGIN_ROOT = path.join(__dirname, '..', '..', '..');

function runHook(scriptName, stdinPayload, { expectNonZeroExit = false, env = {} } = {}) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  try {
    const out = execFileSync(process.execPath, [scriptPath], {
      input: stdinPayload,
      encoding: 'utf-8',
      env: { ...process.env, ...env },
    });
    if (expectNonZeroExit) throw new Error(`[${scriptName}] esperaba exit code != 0, salio 0`);
    return { stdout: out.trim(), stderr: '', status: 0 };
  } catch (err) {
    if (!expectNonZeroExit) throw err;
    return {
      stdout: (err.stdout || '').trim(),
      stderr: (err.stderr || '').trim(),
      status: err.status,
    };
  }
}

function assertJson(label, out, expectPresent) {
  if (!out) throw new Error(`[${label}] esperaba stdout con JSON, vino vacio`);
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch (err) {
    throw new Error(`[${label}] stdout no es JSON valido: ${out}`);
  }
  for (const key of expectPresent) {
    const value = key.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), parsed);
    if (value === undefined) throw new Error(`[${label}] falta el campo "${key}" en: ${JSON.stringify(parsed)}`);
  }
  console.log(`OK  [${label}] ${JSON.stringify(parsed)}`);
}

function assertAsk(label, result) {
  assertJson(label, result.stdout, [
    'hookSpecificOutput.permissionDecision',
    'hookSpecificOutput.permissionDecisionReason',
  ]);
  const parsed = JSON.parse(result.stdout);
  if (parsed.hookSpecificOutput.permissionDecision !== 'ask') {
    throw new Error(`[${label}] esperaba permissionDecision=ask`);
  }
}

function assertNoOutput(label, result) {
  if (result.stdout || result.stderr) {
    throw new Error(`[${label}] esperaba salida vacia: ${JSON.stringify(result)}`);
  }
  console.log(`OK  [${label}] no produjo bloqueo`);
}

function makeTempGitRepoWithBigDiff() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agteamos-hook-test-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@test.local'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'test'], { cwd: dir });
  fs.mkdirSync(path.join(dir, 'agteamos'));
  fs.writeFileSync(path.join(dir, 'app.py'), 'x = 1\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
  const bigContent = Array.from({ length: 40 }, (_, i) => `x_${i} = ${i}`).join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'app.py'), bigContent);
  return dir;
}

function main() {
  const repoDir = makeTempGitRepoWithBigDiff();
  const customPluginRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agteamos-plugin-test-'));
  const legacyPluginRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agteamos-legacy-plugin-test-'));

  // 1. nudge-review.js (Stop) — diff grande en un repo temporal
  const nudgeOut = runHook('nudge-review.js', JSON.stringify({ cwd: repoDir }));
  assertJson('nudge-review.js', nudgeOut.stdout, ['decision', 'reason']);

  // 2. guardrails.js (PreToolUse/Bash) — bloqueo en seco (exit 2 + stderr)
  const sqlOut = runHook(
    'guardrails.js',
    JSON.stringify({ tool_input: { command: 'psql -c "delete from users;"' } }),
    { expectNonZeroExit: true }
  );
  if (sqlOut.status !== 2) throw new Error(`[guardrails.js block] esperaba exit 2, recibio ${sqlOut.status}`);
  if (!sqlOut.stderr.includes('SQL destructiva')) throw new Error('[guardrails.js block] stderr inesperado: ' + sqlOut.stderr);
  console.log(`OK  [guardrails.js block] stderr: ${sqlOut.stderr}`);

  // 3. guardrails.js solo inspecciona tool_input.command.
  const outsideTextOut = runHook(
    'guardrails.js',
    JSON.stringify({
      description: 'DROP TABLE users; rm -rf /',
      tool_input: { command: 'echo seguro' },
    })
  );
  assertNoOutput('guardrails.js ignora texto externo', outsideTextOut);

  // 4. guardrails.js (PreToolUse/Bash) — confirmaciones (ask)
  const pushOut = runHook('guardrails.js', JSON.stringify({ tool_input: { command: 'git push origin main' } }));
  assertAsk('guardrails.js push ask', pushOut);

  const ghMergeOut = runHook(
    'guardrails.js',
    JSON.stringify({ tool_input: { command: 'gh pr merge 42 --squash' } })
  );
  assertAsk('guardrails.js gh merge ask', ghMergeOut);

  const azMergeOut = runHook(
    'guardrails.js',
    JSON.stringify({ tool_input: { command: 'az repos pr update --id 42 --status completed' } })
  );
  assertAsk('guardrails.js az completed ask', azMergeOut);

  const azMergeWithTargetOut = runHook(
    'guardrails.js',
    JSON.stringify({
      tool_input: {
        command: 'AZ REPOS PR UPDATE --id 42 --target-branch develop --status=COMPLETED',
      },
    })
  );
  assertAsk('guardrails.js az completed con target ask', azMergeWithTargetOut);

  const removeItemOut = runHook(
    'guardrails.js',
    JSON.stringify({ tool_input: { command: 'Remove-Item .\\build -Force -Recurse' } })
  );
  assertAsk('guardrails.js Remove-Item ask', removeItemOut);

  const rmOut = runHook(
    'guardrails.js',
    JSON.stringify({ tool_input: { command: 'rm -r -f ./build' } })
  );
  assertAsk('guardrails.js rm ask', rmOut);

  // 5. session-start.js (SessionStart) — siempre trae el recordatorio de Step 0
  const sessionOut = runHook('session-start.js', JSON.stringify({ cwd: repoDir }));
  assertJson('session-start.js', sessionOut.stdout, ['hookSpecificOutput.additionalContext']);
  if (!JSON.parse(sessionOut.stdout).hookSpecificOutput.additionalContext.includes('agteamos-router')) {
    throw new Error('[session-start.js] no menciona agteamos-router');
  }

  // 6. El registro real carga los siete temas y siempre expone folder.
  const topics = loadTopicRegistry(PLUGIN_ROOT);
  if (topics.length !== 7) throw new Error(`[registry] esperaba 7 temas, recibio ${topics.length}`);
  const designTopic = topics.find((topic) => topic.id === 'design-de-codigo');
  if (!designTopic || designTopic.folder !== 'design-de-codigo') {
    throw new Error('[registry] design-de-codigo no cargo el folder correcto');
  }
  if (!designTopic.aliases.includes('clean-architecture')) {
    throw new Error('[registry] falta alias historico clean-architecture');
  }
  if (loadPluginTopics !== loadTopicRegistry) {
    throw new Error('[registry] loadPluginTopics dejo de ser alias compatible');
  }
  console.log('OK  [registry] cargo 7 temas con folder y aliases');

  // 7. Plugins sin registry.yml mantienen el fallback al frontmatter legacy.
  const legacyTopicDir = path.join(legacyPluginRoot, 'standards', 'carpeta-legacy');
  fs.mkdirSync(legacyTopicDir, { recursive: true });
  fs.writeFileSync(
    path.join(legacyTopicDir, 'README.md'),
    [
      '---',
      'topic: legacy-topic',
      'description: Tema legacy',
      'keywords: [legacy]',
      'globs: ["**/*.legacy"]',
      'first_consumers: [quality]',
      '---',
      '',
    ].join('\n')
  );
  const legacyTopics = loadTopicRegistry(legacyPluginRoot);
  if (legacyTopics.length !== 1 || legacyTopics[0].folder !== 'carpeta-legacy') {
    throw new Error(`[registry fallback] resultado inesperado: ${JSON.stringify(legacyTopics)}`);
  }
  console.log('OK  [registry fallback] cargo frontmatter legacy con folder');

  // 8. Antes del primer discovery, el estado se resuelve desde onboarding.
  fs.writeFileSync(
    path.join(repoDir, 'agteamos', 'onboarding.yml'),
    [
      'layout_contract: "1"',
      'profile: adopted_l0',
      'mode: lazy',
      'lifecycle: initialized',
      'artifacts:',
      '  standards.testing:',
      '    path: standards/testing/',
      '    status: pending',
      '',
    ].join('\n')
  );
  const onboardingStatus = loadProjectTopicStatus(repoDir);
  if (onboardingStatus.testing !== 'pending') {
    throw new Error(`[onboarding fallback] resultado inesperado: ${JSON.stringify(onboardingStatus)}`);
  }
  console.log('OK  [onboarding fallback] cargo status lazy sin standards/');

  // 9. JIT usa folder del registro, no asume que sea igual al id.
  fs.mkdirSync(path.join(customPluginRoot, 'standards'), { recursive: true });
  fs.writeFileSync(
    path.join(customPluginRoot, 'standards', 'registry.yml'),
    [
      'topics:',
      '  - id: topic-id',
      '    folder: carpeta-real',
      '    description: Tema de prueba',
      '    keywords: [jit]',
      '    globs: ["**/*.jit"]',
      '    first_consumers: [quality]',
      '',
    ].join('\n')
  );
  fs.mkdirSync(path.join(repoDir, 'agteamos', 'standards'), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, 'agteamos', 'standards', 'index.meta.yml'),
    'topic-id:\n  status: done\n'
  );
  const jitFile = path.join(repoDir, 'src', 'ejemplo.jit');
  fs.mkdirSync(path.dirname(jitFile), { recursive: true });
  fs.writeFileSync(jitFile, 'contenido\n');
  const jitOut = runHook(
    'post-write-checks.js',
    JSON.stringify({
      cwd: repoDir,
      session_id: 'registry-folder-test',
      tool_input: { file_path: jitFile },
    }),
    { env: { CLAUDE_PLUGIN_ROOT: customPluginRoot } }
  );
  assertJson('post-write-checks.js JIT folder', jitOut.stdout, ['hookSpecificOutput.additionalContext']);
  const jitContext = JSON.parse(jitOut.stdout).hookSpecificOutput.additionalContext;
  if (!jitContext.includes('agteamos/standards/carpeta-real/README.md')) {
    throw new Error(`[post-write-checks.js JIT folder] path inesperado: ${jitContext}`);
  }

  // 9. Un lint malicioso se omite y nunca crea su archivo marcador.
  fs.mkdirSync(path.join(repoDir, 'agteamos', 'architecture'), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, 'agteamos', 'platform.yml'),
    'quality_pulse:\n  enabled: true\n  lint_on_edit: true\n'
  );
  fs.writeFileSync(
    path.join(repoDir, 'agteamos', 'architecture', 'PROJECT_CONTEXT.md'),
    '| Comando | Valor | Fuente |\n' +
      '|---|---|---|\n' +
      '| Lint | `eslint && node -e "require(\'fs\').writeFileSync(\'lint-pwned\',\'yes\')"` | test |\n'
  );
  const maliciousFile = path.join(repoDir, 'malicious.js');
  const markerFile = path.join(repoDir, 'lint-pwned');
  fs.writeFileSync(maliciousFile, 'const safe = true;\n');
  const maliciousLintOut = runHook(
    'post-write-checks.js',
    JSON.stringify({ cwd: repoDir, tool_input: { file_path: maliciousFile } })
  );
  assertJson('post-write-checks.js lint malicioso', maliciousLintOut.stdout, [
    'hookSpecificOutput.additionalContext',
  ]);
  const maliciousLintContext = JSON.parse(maliciousLintOut.stdout).hookSpecificOutput.additionalContext;
  if (!maliciousLintContext.includes('omitido')) {
    throw new Error(`[lint malicioso] no informo omision: ${maliciousLintContext}`);
  }
  if (fs.existsSync(markerFile)) throw new Error('[lint malicioso] el comando arbitrario se ejecuto');
  console.log('OK  [post-write-checks.js lint malicioso] omitido sin ejecutar');

  // 10. post-write-checks.js (PostToolUse Write|Edit) — archivo .py con TODO nuevo
  fs.writeFileSync(path.join(repoDir, 'app.py'), 'x = 1\n# TODO fix this\n');
  const writeOut = runHook(
    'post-write-checks.js',
    JSON.stringify({ cwd: repoDir, tool_input: { file_path: path.join(repoDir, 'app.py') } })
  );
  assertJson('post-write-checks.js', writeOut.stdout, ['hookSpecificOutput.additionalContext']);

  fs.rmSync(repoDir, { recursive: true, force: true });
  fs.rmSync(customPluginRoot, { recursive: true, force: true });
  fs.rmSync(legacyPluginRoot, { recursive: true, force: true });
  console.log('\nLos hooks fusionados emiten JSON valido en stdout (o exit 2 + stderr para el bloqueo en seco).');
}

main();
