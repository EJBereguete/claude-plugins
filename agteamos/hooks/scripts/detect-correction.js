'use strict';

const { readStdinSync } = require('./lib/read-stdin');

// UserPromptSubmit -- detecta frases donde el usuario esta corrigiendo una
// convencion ("no, aca usamos X", "siempre usa Y", "en este proyecto...").
// Solo sugiere -- nunca escribe nada por si solo. agteamos-knowledge es quien
// captura, y solo despues de que el usuario confirme.

const PATTERNS = [
  /\bno,?\s+ac[áa]\s+(usamos|hacemos)\b/i,
  /\bsiempre\s+us[áa]\b/i,
  /\bnunca\s+hagas\b/i,
  /\ben\s+este\s+proyecto\s+(usamos|hacemos|siempre|nunca)\b/i,
  /\bwe\s+always\s+use\b/i,
  /\b(don't|do not)\s+use\b/i,
  /\balways\s+use\b/i,
  /\bnever\s+do\b/i,
];

function getPrompt(raw) {
  try {
    const payload = JSON.parse(raw);
    if (typeof payload.prompt === 'string') return payload.prompt;
  } catch (err) {
    // no-op
  }
  return '';
}

const prompt = getPrompt(readStdinSync());

if (prompt && PATTERNS.some((re) => re.test(prompt))) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext:
        '[agteamos] Esto suena a una convencion del proyecto, no solo una correccion puntual. ' +
        'Si es asi, ofrece registrarla con agteamos-knowledge (una linea, no interrumpe el trabajo actual).',
    },
  }) + '\n');
}

process.exit(0);
