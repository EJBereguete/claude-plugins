'use strict';

const { readStdinSync } = require('./lib/read-stdin');

// PreToolUse / Write|Edit — pide confirmacion si el contenido a escribir
// parece tener una credencial hardcodeada. El payload que llega por stdin es
// el tool_input serializado como JSON, asi que las comillas del contenido
// original vienen escapadas (\") — el patron tolera ese backslash opcional.
const HARDCODED_SECRET = /(password|secret|api_key|private_key)\s*[=:]\s*\\?["]{1,2}[A-Za-z0-9_./+=-]{4,}/i;

const input = readStdinSync();

if (HARDCODED_SECRET.test(input)) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason:
          '[agteamos] Posible credencial hardcodeada detectada. Usa variables de entorno.',
      },
    })
  );
}

process.exit(0);
