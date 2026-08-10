'use strict';

const { readStdinSync } = require('./lib/read-stdin');

// PreToolUse / Bash — pide confirmacion antes de borrados destructivos
// (rm -rf, git clean -f, Remove-Item -Recurse -Force en cualquier orden).
const DESTRUCTIVE_DELETE =
  /rm\s+-[a-zA-Z]*rf[a-zA-Z]*|rm\s+-[a-zA-Z]*fr[a-zA-Z]*|git\s+clean[^"]*-f|Remove-Item[^"]*-Recurse[^"]*-Force|Remove-Item[^"]*-Force[^"]*-Recurse/;

const input = readStdinSync();

if (DESTRUCTIVE_DELETE.test(input)) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason:
          '[agteamos] Comando destructivo de borrado detectado (rm -rf / git clean -f / Remove-Item -Recurse -Force). Confirma antes de continuar.',
      },
    })
  );
}

process.exit(0);
