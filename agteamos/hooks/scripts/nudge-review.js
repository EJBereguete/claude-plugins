'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { readStdinSync } = require('./lib/read-stdin');

// Stop hook — recuerda correr agteamos-review / agteamos-domain-review si el
// turno modifico >=30 lineas de codigo o agrego un archivo de codigo nuevo.
// Silencioso en arbol limpio. Dedupea por hash del diff actual: no repite el
// mismo recordatorio para el mismo estado de arbol (mismo patron que el Stop
// hook de paslavskyi/anti-slop).

const CODE_EXTENSIONS = /\.(py|ts|tsx|js|jsx|cs|razor|go|rb|java)$/i;
const MIN_CHANGED_LINES = 30;

function getCwd(input) {
  try {
    const payload = JSON.parse(input);
    if (payload && typeof payload.cwd === 'string') return payload.cwd;
  } catch (err) {
    // payload no es JSON valido o no trae cwd -> usar cwd del proceso
  }
  return process.cwd();
}

function getDiffStat(cwd) {
  try {
    return execSync('git diff --stat HEAD', { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    return '';
  }
}

function getChangedFiles(cwd) {
  try {
    const tracked = execSync('git diff --name-only HEAD', { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    const untracked = execSync('git ls-files --others --exclude-standard', { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    return `${tracked}\n${untracked}`
      .split('\n')
      .filter(Boolean)
      // excluir el propio cache: si no, cada corrida se auto-invalida al crearlo/actualizarlo
      .filter((f) => !f.replace(/\\/g, '/').includes('agteamos/.cache/'));
  } catch (err) {
    return [];
  }
}

function countChangedLines(diffStat) {
  const summaryLine = diffStat.trim().split('\n').pop() || '';
  const match = /(\d+) insertion|(\d+) deletion/g;
  let total = 0;
  let m;
  while ((m = match.exec(summaryLine)) !== null) {
    total += parseInt(m[1] || m[2] || '0', 10);
  }
  return total;
}

function loadLastHash(cachePath) {
  try {
    return fs.readFileSync(cachePath, 'utf-8').trim();
  } catch (err) {
    return null;
  }
}

function saveLastHash(cachePath, hash) {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, hash, 'utf-8');
}

function main() {
  const input = readStdinSync();
  const cwd = getCwd(input);

  const diffStat = getDiffStat(cwd);
  const changedFiles = getChangedFiles(cwd);
  const hasNewCodeFile = changedFiles.some((f) => CODE_EXTENSIONS.test(f));

  if (!diffStat.trim() && !hasNewCodeFile) {
    process.exit(0); // arbol limpio, nada que decir
  }

  const changedLines = countChangedLines(diffStat);

  if (changedLines < MIN_CHANGED_LINES && !hasNewCodeFile) {
    process.exit(0);
  }

  const diffHash = crypto.createHash('sha1').update(diffStat + changedFiles.sort().join(',')).digest('hex');
  const cachePath = path.join(cwd, 'agteamos', '.cache', 'last-nudge-diff-hash.txt');
  const lastHash = loadLastHash(cachePath);

  if (lastHash === diffHash) {
    process.exit(0); // ya se avisó para este mismo estado de arbol
  }

  saveLastHash(cachePath, diffHash);
  process.stderr.write(
    '[agteamos] Cambios sin revisar (>=30 lineas o archivo de codigo nuevo). ' +
      'Considera correr agteamos-review y/o agteamos-domain-review antes de cerrar.\n'
  );
  process.exit(0);
}

main();
