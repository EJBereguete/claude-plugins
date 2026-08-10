'use strict';

const fs = require('fs');
const path = require('path');
const { readStdinSync } = require('./lib/read-stdin');

// SessionStart — si agteamos-standards ya corrio en este proyecto, inyecta un
// resumen de agteamos/standards/index.yml para que los agentes resuelvan el
// tema relevante antes de escribir o revisar codigo. Si no existe, no hace nada.
const raw = readStdinSync();

let cwd = process.cwd();
try {
  const payload = JSON.parse(raw);
  if (payload && typeof payload.cwd === 'string' && payload.cwd) {
    cwd = payload.cwd;
  }
} catch (err) {
  // payload vacio o no-JSON (ej. TTY interactivo) -> usar process.cwd()
}

const indexPath = path.join(cwd, 'agteamos', 'standards', 'index.yml');

let content;
try {
  content = fs.readFileSync(indexPath, 'utf-8');
} catch (err) {
  // agteamos-standards no corrio todavia en este proyecto -> no romper nada
  process.exit(0);
}

// Parseo minimo del formato plano "keyword: carpeta/" (sin dependencias
// externas de YAML): agrupamos keywords por carpeta destino.
const byFolder = new Map();
for (const line of content.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const match = trimmed.match(/^([\w-]+)\s*:\s*(.+?)\/?\s*$/);
  if (!match) continue;
  const [, keyword, folder] = match;
  const normalizedFolder = folder.replace(/\/+$/, '');
  if (!byFolder.has(normalizedFolder)) byFolder.set(normalizedFolder, []);
  byFolder.get(normalizedFolder).push(keyword);
}

if (byFolder.size === 0) {
  process.exit(0);
}

// Resumen acotado: una linea por tema, tope de temas para no volcar indices gigantes.
const MAX_TOPICS = 15;
const summaryLines = [];
let count = 0;
for (const [folder, keywords] of byFolder) {
  if (count >= MAX_TOPICS) {
    summaryLines.push('- ... (indice truncado, ver agteamos/standards/index.yml completo)');
    break;
  }
  summaryLines.push(`- ${folder}: ${keywords.join(', ')}`);
  count += 1;
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext:
        '[agteamos] Standards del proyecto disponibles en agteamos/standards/. ' +
        'Indice keyword -> carpeta (agteamos/standards/index.yml):\n' +
        summaryLines.join('\n') +
        '\nAntes de escribir o revisar codigo, resuelve el tema relevante contra este ' +
        'indice y lee agteamos/standards/<carpeta>/README.md (y deviations.md si existe).',
    },
  })
);

process.exit(0);
