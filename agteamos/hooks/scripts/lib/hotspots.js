'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CODE_EXTENSIONS = /\.(py|ts|tsx|js|jsx|cs|razor|go|rb|java)$/i;

/**
 * Hotspots clasicos: churn (commits en los ultimos N dias) x tamano actual
 * (lineas). No pondera por complejidad ciclomatica -- es deliberadamente
 * barato, para correr en un SessionStart sin frenar la sesion.
 */
function computeHotspots(cwd, { sinceDays = 90, topN = 5 } = {}) {
  let log;
  try {
    log = execSync(`git log --since=${sinceDays}.days --name-only --pretty=format:`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 1024 * 1024 * 16,
    });
  } catch (err) {
    return []; // no es un repo git, o no hay historial suficiente
  }

  const churn = new Map();
  for (const line of log.split('\n')) {
    const file = line.trim();
    if (!file || !CODE_EXTENSIONS.test(file)) continue;
    if (file.replace(/\\/g, '/').includes('agteamos/.cache/')) continue;
    churn.set(file, (churn.get(file) || 0) + 1);
  }

  const withSize = [...churn.entries()].map(([file, commits]) => {
    let lines = 0;
    try {
      lines = fs.readFileSync(path.join(cwd, file), 'utf-8').split(/\r?\n/).length;
    } catch (err) {
      lines = 0; // archivo borrado desde entonces
    }
    return { file, commits, lines };
  });

  return withSize
    .filter((f) => f.lines > 0)
    .sort((a, b) => b.commits * b.lines - a.commits * a.lines)
    .slice(0, topN);
}

module.exports = { computeHotspots };
