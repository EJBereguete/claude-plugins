'use strict';

const { readStdinSync } = require('./lib/read-stdin');

// PreToolUse / Bash — bloquea operaciones SQL destructivas antes de ejecutarlas.
// Misma logica que el hook bash original: busca el patron en el payload JSON
// completo del evento (no solo en tool_input.command), case-sensitive.
const DESTRUCTIVE_SQL = /DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE|DELETE\s+FROM/;

const input = readStdinSync();

if (DESTRUCTIVE_SQL.test(input)) {
  process.stderr.write(
    '[agteamos] Operacion SQL destructiva detectada (DROP TABLE/DATABASE, TRUNCATE o DELETE FROM). ' +
      'Verifica que es intencional y que tienes backup.\n'
  );
  process.exit(2);
}

process.exit(0);
