'use strict';

const { readStdinSync } = require('./lib/read-stdin');

// SessionStart — inyecta el recordatorio de Step 0 obligatorio al arrancar cualquier sesion.
readStdinSync(); // se lee y descarta; SessionStart no necesita inspeccionar el payload.

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext:
        '[agteamos] Antes de cualquier accion, ejecuta la skill agteamos-repo-context-check (Step 0 obligatorio) sin importar que agente invoques primero.',
    },
  })
);

process.exit(0);
