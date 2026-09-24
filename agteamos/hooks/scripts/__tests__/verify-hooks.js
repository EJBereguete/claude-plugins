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

const SCRIPTS_DIR = path.join(__dirname, '..');

function runHook(scriptName, stdinPayload, { expectNonZeroExit = false } = {}) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  try {
    const out = execFileSync('node', [scriptPath], { input: stdinPayload, encoding: 'utf-8' });
    if (expectNonZeroExit) throw new Error(`[${scriptName}] esperaba exit code != 0, salio 0`);
    return { stdout: out.trim(), stderr: '' };
  } catch (err) {
    if (!expectNonZeroExit) throw err;
    return { stdout: (err.stdout || '').trim(), stderr: (err.stderr || '').trim() };
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

  // 1. nudge-review.js (Stop) — diff grande en un repo temporal
  const nudgeOut = runHook('nudge-review.js', JSON.stringify({ cwd: repoDir }));
  assertJson('nudge-review.js', nudgeOut.stdout, ['decision', 'reason']);

  // 2. guardrails.js (PreToolUse/Bash) — bloqueo en seco (exit 2 + stderr)
  const sqlOut = runHook(
    'guardrails.js',
    JSON.stringify({ tool_input: { command: 'psql -c "DROP TABLE users;"' } }),
    { expectNonZeroExit: true }
  );
  if (!sqlOut.stderr.includes('SQL destructiva')) throw new Error('[guardrails.js block] stderr inesperado: ' + sqlOut.stderr);
  console.log(`OK  [guardrails.js block] stderr: ${sqlOut.stderr}`);

  // 3. guardrails.js (PreToolUse/Bash) — confirmacion (ask)
  const pushOut = runHook('guardrails.js', JSON.stringify({ tool_input: { command: 'git push origin main' } }));
  assertJson('guardrails.js ask', pushOut.stdout, ['hookSpecificOutput.permissionDecision', 'hookSpecificOutput.permissionDecisionReason']);

  // 4. session-start.js (SessionStart) — siempre trae el recordatorio de Step 0
  const sessionOut = runHook('session-start.js', JSON.stringify({ cwd: repoDir }));
  assertJson('session-start.js', sessionOut.stdout, ['hookSpecificOutput.additionalContext']);
  if (!JSON.parse(sessionOut.stdout).hookSpecificOutput.additionalContext.includes('agteamos-router')) {
    throw new Error('[session-start.js] no menciona agteamos-router');
  }

  // 5. post-write-checks.js (PostToolUse Write|Edit) — archivo .py con TODO nuevo
  fs.writeFileSync(path.join(repoDir, 'app.py'), 'x = 1\n# TODO fix this\n');
  const writeOut = runHook(
    'post-write-checks.js',
    JSON.stringify({ cwd: repoDir, tool_input: { file_path: path.join(repoDir, 'app.py') } })
  );
  assertJson('post-write-checks.js', writeOut.stdout, ['hookSpecificOutput.additionalContext']);

  fs.rmSync(repoDir, { recursive: true, force: true });
  console.log('\nLos hooks fusionados emiten JSON valido en stdout (o exit 2 + stderr para el bloqueo en seco).');
}

main();
