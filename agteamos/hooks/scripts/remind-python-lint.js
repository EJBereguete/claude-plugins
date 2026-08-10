'use strict';

const { readStdinSync } = require('./lib/read-stdin');

// PostToolUse / Write — recordatorio (no bloqueante) tras crear un archivo .py.
const PYTHON_FILE_WRITTEN = /"file_path"\s*:\s*"[^"]*\.py"/;

const input = readStdinSync();

if (PYTHON_FILE_WRITTEN.test(input)) {
  process.stderr.write('[agteamos] Archivo Python creado. Recuerda ejecutar: ruff check y black --check\n');
}

process.exit(0);
