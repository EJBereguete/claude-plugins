'use strict';

const fs = require('fs');
const path = require('path');
const { readStdinSync } = require('./lib/read-stdin');
const { computeHotspots } = require('./lib/hotspots');

// SessionStart -- consolidado. Reemplaza a session-start-context.js,
// inject-standards-index.js e inject-debt-signal.js (fusionados por evento
// del ciclo de vida, ver plan de consolidacion). Compone los 3 mensajes en
// un solo additionalContext, en el mismo orden en que se inyectaban antes.

function getCwd(raw) {
  try {
    const payload = JSON.parse(raw);
    if (payload && typeof payload.cwd === 'string' && payload.cwd) return payload.cwd;
  } catch (err) {
    // payload vacio o no-JSON (ej. TTY interactivo) -> usar process.cwd()
  }
  return process.cwd();
}

// --- 1. Recordatorio de Step 0 (ex-session-start-context.js) ---------------

function stepZeroReminder() {
  return '[agteamos] Antes de cualquier accion, ejecuta la skill agteamos-router ' +
    '(Step 0 obligatorio) sin importar que agente invoques primero.';
}

// --- 2. Indice de standards (ex-inject-standards-index.js) -----------------

function parseStandardsIndexMeta(raw) {
  const meta = new Map();
  let currentTopic = null;
  for (const rawLine of raw.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const topicMatch = rawLine.match(/^([\w-]+)\s*:\s*$/);
    if (topicMatch) {
      currentTopic = topicMatch[1];
      meta.set(currentTopic, { description: null, status: null });
      continue;
    }
    const fieldMatch = rawLine.match(/^\s+(description|status)\s*:\s*(.+?)\s*$/);
    if (fieldMatch && currentTopic) {
      const [, field, value] = fieldMatch;
      meta.get(currentTopic)[field] = value.replace(/^["']|["']$/g, '');
    }
  }
  return meta;
}

function standardsIndexSummary(cwd) {
  const indexPath = path.join(cwd, 'agteamos', 'standards', 'index.yml');
  const metaPath = path.join(cwd, 'agteamos', 'standards', 'index.meta.yml');

  let content;
  try {
    content = fs.readFileSync(indexPath, 'utf-8');
  } catch (err) {
    return null; // agteamos-project-docs (--topic) no corrio todavia en este proyecto
  }

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
  if (byFolder.size === 0) return null;

  let metaByTopic = null;
  try {
    metaByTopic = parseStandardsIndexMeta(fs.readFileSync(metaPath, 'utf-8'));
  } catch (err) {
    metaByTopic = null; // sin index.meta.yml -> compatibilidad total, sin filtrar nada
  }

  const MAX_TOPICS = 15;
  const summaryLines = [];
  let count = 0;
  let pendingCount = 0;

  for (const [folder, keywords] of byFolder) {
    const meta = metaByTopic ? metaByTopic.get(folder) : null;

    if (metaByTopic && meta && meta.status && meta.status !== 'done') {
      pendingCount += 1;
      continue;
    }

    if (count >= MAX_TOPICS) {
      summaryLines.push('- ... (indice truncado, ver agteamos/standards/index.yml completo)');
      break;
    }

    const description = meta && meta.description ? ` — ${meta.description}` : '';
    summaryLines.push(`- ${folder}${description} (keywords: ${keywords.join(', ')})`);
    count += 1;
  }

  if (summaryLines.length === 0 && pendingCount === 0) return null;

  const pendingLine = pendingCount > 0
    ? `\n${pendingCount} tema(s) mas detectados pero aun no generados — se generan bajo demanda ` +
      'la primera vez que una tarea real los necesita (ver agteamos-project-docs --topic).'
    : '';

  return '[agteamos] Standards del proyecto disponibles en agteamos/standards/. ' +
    'Indice keyword -> carpeta (agteamos/standards/index.yml):\n' +
    (summaryLines.length ? summaryLines.join('\n') : '(ningun tema generado todavia)') +
    pendingLine +
    '\nAntes de escribir o revisar codigo, resuelve el tema relevante contra este ' +
    'indice y lee agteamos/standards/<carpeta>/README.md (y deviations.md si existe).';
}

// --- 3. Radar de deuda (ex-inject-debt-signal.js) ---------------------------

const DEBT_THROTTLE_DAYS = 7;

function daysSince(isoDate) {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return Infinity;
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

function loadDebtSnapshots(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return [];
  }
  const snapshots = [];
  let current = null;
  for (const line of raw.split(/\r?\n/)) {
    const dateMatch = line.match(/^\s*-\s*date:\s*(.+)$/);
    if (dateMatch) {
      current = { date: dateMatch[1].trim(), hotspots: [] };
      snapshots.push(current);
      continue;
    }
    if (!current) continue;
    const hotspotMatch = line.match(/^\s+-\s*file:\s*(.+)$/);
    if (hotspotMatch) {
      current.hotspots.push({ file: hotspotMatch[1].trim(), commits: null, lines: null });
      continue;
    }
    const commitsMatch = line.match(/^\s+commits_\d+d:\s*(\d+)/);
    if (commitsMatch && current.hotspots.length) {
      current.hotspots[current.hotspots.length - 1].commits = parseInt(commitsMatch[1], 10);
      continue;
    }
    const linesMatch = line.match(/^\s+lines:\s*(\d+)/);
    if (linesMatch && current.hotspots.length) {
      current.hotspots[current.hotspots.length - 1].lines = parseInt(linesMatch[1], 10);
    }
  }
  return snapshots;
}

function writeDebtSnapshot(filePath, snapshots, sinceDays) {
  const lines = ['# agteamos/quality/debt-trend.yml', '# Generado por hooks/scripts/session-start.js -- no editar a mano', 'snapshots:'];
  for (const snap of snapshots) {
    lines.push(`  - date: ${snap.date}`);
    lines.push(`    hotspots:`);
    for (const h of snap.hotspots) {
      lines.push(`      - file: ${h.file}`);
      lines.push(`        commits_${sinceDays}d: ${h.commits}`);
      lines.push(`        lines: ${h.lines}`);
    }
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

function debtSignal(cwd) {
  const agteamosDir = path.join(cwd, 'agteamos');
  const throttlePath = path.join(agteamosDir, '.cache', 'debt-signal-last-run.txt');
  let lastRun = null;
  try {
    lastRun = fs.readFileSync(throttlePath, 'utf-8').trim();
  } catch (err) {
    lastRun = null;
  }
  if (lastRun && daysSince(lastRun) < DEBT_THROTTLE_DAYS) return null;

  const sinceDays = 90;
  const hotspots = computeHotspots(cwd, { sinceDays, topN: 5 });

  fs.mkdirSync(path.dirname(throttlePath), { recursive: true });
  fs.writeFileSync(throttlePath, new Date().toISOString(), 'utf-8');

  if (hotspots.length === 0) return null;

  const trendPath = path.join(agteamosDir, 'quality', 'debt-trend.yml');
  const snapshots = loadDebtSnapshots(trendPath);
  const previous = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  const top = hotspots[0];
  const previousTop = previous ? previous.hotspots.find((h) => h.file === top.file) : null;

  snapshots.push({ date: new Date().toISOString().slice(0, 10), hotspots });
  writeDebtSnapshot(trendPath, snapshots.slice(-12), sinceDays);

  let message = null;
  if (!previousTop) {
    message = `"${top.file}" es el hotspot #1 (${top.commits} commits en ${sinceDays} dias, ${top.lines} lineas) -- primera vez que se registra.`;
  } else if (top.lines > previousTop.lines || top.file !== (previous.hotspots[0] || {}).file) {
    message = `"${top.file}" subio de ${previousTop.lines} a ${top.lines} lineas y es el hotspot #1 (${top.commits} commits en ${sinceDays} dias).`;
  }

  return message ? `[agteamos] Radar de deuda: ${message} Ver agteamos/quality/debt-trend.yml.` : null;
}

// --- orquestacion ------------------------------------------------------

function main() {
  const cwd = getCwd(readStdinSync());
  const hasAgteamos = fs.existsSync(path.join(cwd, 'agteamos'));

  const parts = [stepZeroReminder()];
  if (hasAgteamos) {
    const standards = standardsIndexSummary(cwd);
    if (standards) parts.push(standards);
    const debt = debtSignal(cwd);
    if (debt) parts.push(debt);
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: parts.join('\n\n'),
    },
  }) + '\n');
  process.exit(0);
}

main();
