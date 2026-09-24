'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

/**
 * Ledger compartido de hallazgos para review-workflow, audit-workflow y
 * domain-review. Implementa dos cosas:
 *
 * 1. scopeFromGit: separa lineas "introducidas/extendidas por este cambio"
 *    de "preexistentes", leyendo el diff contra la base branch.
 * 2. reconcile: compara una lista de hallazgos contra el cache de la corrida
 *    anterior por un ID estable, y devuelve cada uno marcado
 *    NEW | SEEN xN | CHANGED | KNOWN | RESOLVED.
 *
 * Regla de negocio (ratchet rule): un hallazgo es bloqueante solo si el
 * cambio actual lo introduce o lo extiende. Todo lo preexistente es
 * follow-up, sin importar la severidad. Este modulo no decide bloqueante/
 * follow-up por si mismo -- solo entrega `introducedByChange: true/false`
 * por hallazgo; la skill que lo consume aplica la regla.
 */

/**
 * Detecta la base branch mas probable (main o master) sin asumir una config
 * remota especifica. Devuelve null si no se puede determinar (repo sin
 * commits, o sin ninguna de las dos ramas).
 */
function detectBaseBranch(repoPath) {
  const candidates = ['main', 'master', 'origin/main', 'origin/master'];
  for (const branch of candidates) {
    try {
      execSync(`git rev-parse --verify ${branch}`, { cwd: repoPath, stdio: 'ignore' });
      return branch;
    } catch (err) {
      // rama no existe, probar la siguiente
    }
  }
  return null;
}

/**
 * Devuelve el set de "line keys" (`relative/path.ext:lineNumber`) que este
 * cambio introduce o modifica, comparando el working tree contra la base
 * branch detectada. Si no hay repo git o no hay base branch, devuelve un set
 * vacio -- el llamador debe tratar ese caso como "no se puede determinar
 * ratchet, todo cuenta como preexistente" (ver README de cada skill).
 */
function scopeFromGit(repoPath) {
  const changedLines = new Set();
  const base = detectBaseBranch(repoPath);
  if (!base) {
    return { changedLines, base: null };
  }

  let diff;
  try {
    diff = execSync(`git diff --unified=0 ${base}...HEAD`, {
      cwd: repoPath,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 32,
    });
  } catch (err) {
    return { changedLines, base };
  }

  let currentFile = null;
  let nextNewLine = null;
  const hunkHeader = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

  for (const rawLine of diff.split('\n')) {
    if (rawLine.startsWith('+++ ')) {
      const filePath = rawLine.slice(4).trim();
      currentFile = filePath === '/dev/null' ? null : filePath.replace(/^b\//, '');
      continue;
    }
    if (rawLine.startsWith('@@')) {
      const match = hunkHeader.exec(rawLine);
      if (match) {
        nextNewLine = parseInt(match[1], 10);
      }
      continue;
    }
    if (currentFile === null || nextNewLine === null) continue;

    if (rawLine.startsWith('+') && !rawLine.startsWith('+++')) {
      changedLines.add(`${currentFile}:${nextNewLine}`);
      nextNewLine += 1;
    } else if (!rawLine.startsWith('-')) {
      nextNewLine += 1;
    }
  }

  return { changedLines, base };
}

/**
 * true si la linea reportada (file:line) fue introducida o modificada por
 * este cambio, segun el scope calculado por scopeFromGit. Tolera un margen
 * de +/-2 lineas porque el numero de linea que reporta un review puede no
 * coincidir exactamente con el hunk (ej. si el hallazgo apunta al inicio de
 * una funcion que empieza una linea antes del cambio real).
 */
function isIntroducedByChange(changedLines, filePath, lineNumber) {
  if (changedLines.size === 0) return null; // no se pudo determinar
  const normalizedPath = filePath.replace(/\\/g, '/');
  for (let offset = -2; offset <= 2; offset += 1) {
    if (changedLines.has(`${normalizedPath}:${lineNumber + offset}`)) return true;
  }
  return false;
}

/**
 * Genera un ID estable para un hallazgo: prefijo por skill + hash corto de
 * (archivo + regla + fragmento normalizado). El fragmento se normaliza
 * (trim + colapsar espacios) para que un cambio cosmetico de indentacion no
 * genere un ID distinto.
 */
function findingId(prefix, finding) {
  const normalizedSnippet = (finding.snippet || '').trim().replace(/\s+/g, ' ');
  const raw = `${finding.file}::${finding.rule}::${normalizedSnippet}`;
  const hash = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 8);
  return `${prefix}-${hash}`;
}

function loadCache(cachePath) {
  try {
    const raw = fs.readFileSync(cachePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function saveCache(cachePath, cache) {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * Compara `findings` (array de {file, rule, snippet, ...}) contra el cache
 * en `cachePath`, asigna un id estable a cada uno via `findingId`, y marca:
 *   - NEW: primera vez que se ve este id
 *   - SEEN: visto antes, sigue presente (incluye contador `seenCount`)
 *   - RESOLVED: estaba en el cache anterior pero no vino en `findings`
 * Persiste el cache actualizado y devuelve { findings: [...con status e id],
 * resolved: [...ids resueltos] }.
 */
function reconcile(prefix, findings, cachePath) {
  const cache = loadCache(cachePath);
  const seenIds = new Set();
  const nextCache = {};

  const annotated = findings.map((finding) => {
    const id = findingId(prefix, finding);
    seenIds.add(id);
    const prior = cache[id];
    const seenCount = prior ? (prior.seenCount || 1) + 1 : 1;
    nextCache[id] = { firstSeen: prior ? prior.firstSeen : new Date().toISOString(), seenCount };
    return { ...finding, id, status: prior ? 'SEEN' : 'NEW', seenCount };
  });

  const resolved = Object.keys(cache).filter((id) => !seenIds.has(id));

  saveCache(cachePath, nextCache);

  return { findings: annotated, resolved };
}

module.exports = { scopeFromGit, isIntroducedByChange, findingId, reconcile };

// --- CLI ---------------------------------------------------------------
// Este modulo se usa de dos formas:
//   1. require()'d desde otro script Node (ej. nudge-review.js).
//   2. invocado directamente por un agente via Bash dentro de una skill
//      (agteamos-quality, agteamos-quality, agteamos-quality), que no
//      puede "require" un modulo -- necesita un CLI que reciba/devuelva JSON.
//
// Uso:
//   node findings-ledger.js scope <repoPath>
//     -> {"changedLines": ["file.py:12", ...], "base": "main"}
//
//   node findings-ledger.js reconcile <prefix> <findingsJsonFile> <cachePath>
//     -> {"findings": [...con id/status/seenCount], "resolved": [...ids]}
//     findingsJsonFile: archivo JSON con un array de {file, rule, snippet, ...}

if (require.main === module) {
  const [, , command, ...rest] = process.argv;

  if (command === 'scope') {
    const [repoPath] = rest;
    const { changedLines, base } = scopeFromGit(repoPath || process.cwd());
    process.stdout.write(JSON.stringify({ changedLines: [...changedLines], base }, null, 2) + '\n');
  } else if (command === 'reconcile') {
    const [prefix, findingsFile, cachePath] = rest;
    if (!prefix || !findingsFile || !cachePath) {
      process.stderr.write('Uso: node findings-ledger.js reconcile <prefix> <findingsJsonFile> <cachePath>\n');
      process.exit(2);
    }
    const findings = JSON.parse(fs.readFileSync(findingsFile, 'utf-8'));
    const result = reconcile(prefix, findings, cachePath);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stderr.write('Uso: node findings-ledger.js scope <repoPath> | reconcile <prefix> <findingsJsonFile> <cachePath>\n');
    process.exit(2);
  }
}
