'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { readStdinSync } = require('./lib/read-stdin');
const { loadTopicRegistry, loadProjectTopicStatus } = require('./lib/standards-frontmatter');
const { matchAny } = require('./lib/glob-match');
const { longestFunctionSpan } = require('./lib/function-length');

// PostToolUse / Write|Edit -- consolidado. Reemplaza a remind-python-lint.js,
// jit-standards.js y quality-pulse.js (fusionados por evento del ciclo de
// vida, ver plan de consolidacion). Cada sub-check corre independiente y
// aporta sus propias lineas al additionalContext final; ninguna bloquea a
// las otras si falla o no aplica.

function getPayload(raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

// --- 1. Recordatorio de lint Python (ex-remind-python-lint.js) -------------

function pythonLintReminder(raw) {
  const PYTHON_FILE_WRITTEN = /"file_path"\s*:\s*"[^"]*\.py"/;
  if (!PYTHON_FILE_WRITTEN.test(raw)) return null;
  return '[agteamos] Archivo Python creado/editado. Recuerda ejecutar: ruff check y black --check';
}

// --- 2. Estándares acoplados a archivos (ex-jit-standards.js) --------------

function jitStandardsDedupeKey(cwd, sessionId, topic) {
  const scope = sessionId || new Date().toISOString().slice(0, 10);
  const hash = crypto.createHash('sha1').update(`${scope}:${topic}`).digest('hex').slice(0, 12);
  return path.join(cwd, 'agteamos', '.cache', 'jit-standards', `${hash}.seen`);
}

function jitStandardsCheck(cwd, filePath, sessionId) {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (!filePath || !pluginRoot) return null;

  const topics = loadTopicRegistry(pluginRoot);
  if (topics.length === 0) return null;

  const relFile = path.relative(cwd, filePath) || filePath;
  const matchedTopic = topics.find((t) => t.globs.length > 0 && matchAny(relFile, t.globs));
  if (!matchedTopic) return null;

  const key = jitStandardsDedupeKey(cwd, sessionId, matchedTopic.topic);
  if (fs.existsSync(key)) return null;

  const statusByTopic = loadProjectTopicStatus(cwd);
  const status = statusByTopic[matchedTopic.topic];

  let message;
  if (status === 'done') {
    message = `[agteamos] Este archivo cae en el tema "${matchedTopic.topic}": ver ` +
      `agteamos/standards/${matchedTopic.folder}/README.md (y deviations.md si existe).`;
  } else {
    message = `[agteamos] Tema "${matchedTopic.topic}" (${matchedTopic.description}) ` +
      `aun no generado para este proyecto. Antes de seguir, considera ` +
      `ensure-artifact(standards.${matchedTopic.topic}) -- ver agteamos-knowledge --topic.`;
  }

  fs.mkdirSync(path.dirname(key), { recursive: true });
  fs.writeFileSync(key, '', 'utf-8');
  return message;
}

// --- 3. Quality pulse (ex-quality-pulse.js) --------------------------------

const CODE_EXTENSIONS = /\.(py|ts|tsx|js|jsx|cs|razor|go|rb|java)$/i;
const LINE_THRESHOLDS = [400, 800, 1000];
const MAX_FUNCTION_LINES = 40;

const NEW_SMELL_PATTERNS = [
  { re: /\bTODO\b|\bFIXME\b/, label: 'TODO/FIXME nuevo' },
  { re: /:\s*any\b/, label: "tipo 'any' nuevo (TypeScript)" },
  { re: /#\s*type:\s*ignore/, label: "'# type: ignore' nuevo" },
  { re: /console\.log\(/, label: 'console.log nuevo' },
  { re: /\bprint\(/, label: 'print( nuevo' },
  { re: /catch\s*\([^)]*\)\s*\{\s*\}/, label: 'catch {} vacio nuevo' },
  { re: /except\s*(Exception)?\s*:\s*pass/, label: "'except: pass' nuevo" },
];

function readHeadVersion(cwd, relFile) {
  try {
    return execFileSync('git', ['show', `HEAD:${relFile.replace(/\\/g, '/')}`], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 1024 * 1024 * 8,
      shell: false,
    });
  } catch (err) {
    return null;
  }
}

function crossedThreshold(before, after) {
  for (const t of LINE_THRESHOLDS) {
    if (before < t && after >= t) return t;
  }
  return null;
}

function newSmells(headContent, currentContent) {
  const headLines = new Set((headContent || '').split(/\r?\n/));
  const currentLines = currentContent.split(/\r?\n/);
  const found = [];
  for (const line of currentLines) {
    if (headLines.has(line)) continue;
    for (const pattern of NEW_SMELL_PATTERNS) {
      if (pattern.re.test(line) && !found.includes(pattern.label)) {
        found.push(pattern.label);
      }
    }
  }
  return found;
}

function qualityPulseDedupeKey(cwd, relFile, contentHash) {
  const hash = crypto.createHash('sha1').update(`${relFile}:${contentHash}`).digest('hex').slice(0, 16);
  return path.join(cwd, 'agteamos', '.cache', 'quality-pulse', `${hash}.seen`);
}

function readQualityPulseConfig(cwd) {
  const config = { enabled: true, lintOnEdit: false };
  let raw;
  try {
    raw = fs.readFileSync(path.join(cwd, 'agteamos', 'platform.yml'), 'utf-8');
  } catch (err) {
    return config;
  }
  const block = raw.match(/^quality_pulse:\r?\n((?:[ \t]+.*\r?\n?)*)/m);
  if (!block) return config;
  const enabledMatch = block[1].match(/^\s+enabled\s*:\s*(true|false)/m);
  const lintMatch = block[1].match(/^\s+lint_on_edit\s*:\s*(true|false)/m);
  if (enabledMatch) config.enabled = enabledMatch[1] === 'true';
  if (lintMatch) config.lintOnEdit = lintMatch[1] === 'true';
  return config;
}

function readCanonicalLintCommand(cwd) {
  let raw;
  try {
    raw = fs.readFileSync(path.join(cwd, 'agteamos', 'architecture', 'PROJECT_CONTEXT.md'), 'utf-8');
  } catch (err) {
    return null;
  }
  const match = raw.match(/\|\s*Lint\s*\|\s*`([^`]+)`/i);
  return match ? match[1] : null;
}

const LINT_TOOLS = new Set(['ruff', 'black', 'eslint', 'biome', 'golangci-lint']);

function tokenizeLintCommand(command) {
  if (typeof command !== 'string') return null;
  const input = command.trim();
  if (!input || input.length > 1000 || /[;&|`$<>\r\n\0]/.test(input)) return null;

  const tokens = [];
  let token = '';
  let quote = null;
  let started = false;

  for (const char of input) {
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        token += char;
      }
      started = true;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) {
        if (!token) return null;
        tokens.push(token);
        token = '';
        started = false;
      }
    } else {
      token += char;
      started = true;
    }
  }

  if (quote || (started && !token)) return null;
  if (started) tokens.push(token);
  return tokens.length > 0 ? tokens : null;
}

function lintInvocation(lintCommand, relFile) {
  const tokens = tokenizeLintCommand(lintCommand);
  if (!tokens) return null;

  const executable = tokens[0].toLowerCase();
  if (tokens[0] !== executable || /[\\/]/.test(executable)) return null;
  let args = tokens.slice(1);
  let pathMode = null;

  if (LINT_TOOLS.has(executable)) {
    pathMode = executable === 'golangci-lint' ? null : 'plain';
  } else if (executable === 'npm') {
    if (args[0] !== 'run' || args[1] !== 'lint') return null;
    pathMode = 'npm';
  } else if (executable === 'pnpm' || executable === 'yarn') {
    if (args[0] !== 'lint') return null;
    pathMode = 'plain';
  } else if (executable === 'dotnet') {
    if (args[0] !== 'format') return null;
    pathMode = 'dotnet';
  } else {
    return null;
  }

  const safeRelFile = relFile.startsWith('-') ? `.${path.sep}${relFile}` : relFile;
  if (pathMode === 'plain') {
    args = args.concat(safeRelFile);
  } else if (pathMode === 'npm') {
    if (!args.includes('--')) args.push('--');
    args.push(safeRelFile);
  } else if (pathMode === 'dotnet') {
    args.push('--include', safeRelFile);
  }

  return { executable, args };
}

function runLintOnFile(cwd, relFile, lintCommand) {
  const invocation = lintInvocation(lintCommand, relFile);
  if (!invocation) return 'omitido: comando no seguro o no reconocido';

  try {
    execFileSync(invocation.executable, invocation.args, {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 1024 * 1024 * 8,
      shell: false,
    });
    return null;
  } catch (err) {
    const output = (err.stdout || err.stderr || err.message || '')
      .toString()
      .trim()
      .split(/\r?\n/)
      .slice(0, 3)
      .join(' | ');
    return output || 'lint fallo (sin detalle capturado)';
  }
}

function qualityPulseCheck(cwd, filePath) {
  if (!filePath || !CODE_EXTENSIONS.test(filePath)) return null;

  const config = readQualityPulseConfig(cwd);
  if (!config.enabled) return null;

  let currentContent;
  try {
    currentContent = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return null;
  }

  const relFile = path.relative(cwd, filePath) || filePath;
  const contentHash = crypto.createHash('sha1').update(currentContent).digest('hex').slice(0, 12);
  const dedupePath = qualityPulseDedupeKey(cwd, relFile, contentHash);
  if (fs.existsSync(dedupePath)) return null;

  const headContent = readHeadVersion(cwd, relFile);
  const currentLines = currentContent.split(/\r?\n/).length;
  const headLines = headContent === null ? 0 : headContent.split(/\r?\n/).length;

  const messages = [];

  const threshold = crossedThreshold(headLines, currentLines);
  if (threshold !== null) {
    messages.push(`"${relFile}" cruzo ${threshold} lineas (${headLines} -> ${currentLines}).`);
  }

  const smells = newSmells(headContent, currentContent);
  if (smells.length > 0) {
    messages.push(`Este edit agrega: ${smells.join(', ')}.`);
  }

  const funcSpan = longestFunctionSpan(filePath, currentContent);
  if (funcSpan > MAX_FUNCTION_LINES) {
    const headSpan = headContent === null ? 0 : longestFunctionSpan(filePath, headContent);
    if (funcSpan > headSpan) {
      messages.push(`Hay una funcion de ~${funcSpan} lineas en "${relFile}" (regla: ~${MAX_FUNCTION_LINES} max).`);
    }
  }

  if (config.lintOnEdit) {
    const lintCommand = readCanonicalLintCommand(cwd);
    if (lintCommand) {
      const lintIssue = runLintOnFile(cwd, relFile, lintCommand);
      if (lintIssue) messages.push(`Lint (${lintCommand}): ${lintIssue}`);
    }
  }

  fs.mkdirSync(path.dirname(dedupePath), { recursive: true });
  fs.writeFileSync(dedupePath, '', 'utf-8');

  return messages.length > 0 ? `[agteamos] quality-pulse: ${messages.join(' ')}` : null;
}

// --- orquestacion --------------------------------------------------------

function main() {
  const raw = readStdinSync();
  const payload = getPayload(raw);
  const cwd = typeof payload.cwd === 'string' && payload.cwd ? payload.cwd : process.cwd();
  const filePath = payload.tool_input && payload.tool_input.file_path;
  const hasAgteamos = fs.existsSync(path.join(cwd, 'agteamos'));

  const parts = [];

  const lintMsg = pythonLintReminder(raw);
  if (lintMsg) parts.push(lintMsg);

  if (hasAgteamos && filePath) {
    const jitMsg = jitStandardsCheck(cwd, filePath, payload.session_id);
    if (jitMsg) parts.push(jitMsg);

    const pulseMsg = qualityPulseCheck(cwd, filePath);
    if (pulseMsg) parts.push(pulseMsg);
  }

  if (parts.length === 0) process.exit(0);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: parts.join('\n'),
    },
  }) + '\n');
  process.exit(0);
}

main();
