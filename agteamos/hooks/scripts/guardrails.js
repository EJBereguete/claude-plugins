'use strict';

const { readStdinSync } = require('./lib/read-stdin');

// PreToolUse / Bash -- guardrails consolidados. Reemplaza a block-destructive-sql.js,
// confirm-destructive-delete.js, confirm-protected-push.js y remind-merge-approval.js
// (fusionados por evento del ciclo de vida, ver DECISIONS.md
// y el plan de consolidacion). Mismo comportamiento que los 4 originales, evaluado en el
// mismo orden -- una sola tabla de reglas en vez de 4 archivos.
//
// mode 'block'  -> exit code 2 + stderr (el unico mecanismo que bloquea la accion en seco
//                  y muestra el motivo a Claude, igual que el original block-destructive-sql.js)
// mode 'ask'    -> stdout JSON { permissionDecision: 'ask', permissionDecisionReason }
//                  (igual que los 3 originales que ya usaban este formato)

const RULES = [
  {
    name: 'destructive-sql',
    mode: 'block',
    test: /\bDROP\s+(?:TABLE|DATABASE)\b|\bTRUNCATE(?:\s+TABLE)?\b|\bDELETE\s+FROM\b/i,
    message:
      '[agteamos] Operacion SQL destructiva detectada (DROP TABLE/DATABASE, TRUNCATE o DELETE FROM). ' +
      'Verifica que es intencional y que tienes backup.',
  },
  {
    name: 'destructive-delete',
    mode: 'ask',
    test: /(?:\brm\b(?=[^;&|\r\n]*(?:\s--recursive\b|\s-[a-z]*r[a-z]*\b))(?=[^;&|\r\n]*(?:\s--force\b|\s-[a-z]*f[a-z]*\b))|\bgit\s+clean\b(?=[^;&|\r\n]*\s-[a-z]*f[a-z]*\b)|\bRemove-Item\b(?=[^;&|\r\n]*\s-(?:Recurse|r)\b)(?=[^;&|\r\n]*\s-(?:Force|f)\b))/i,
    message:
      '[agteamos] Comando destructivo de borrado detectado (rm -rf / git clean -f / Remove-Item -Recurse -Force). Confirma antes de continuar.',
  },
  {
    name: 'push-protected-branch',
    mode: 'ask',
    test: /\bgit\s+push\b[^;\r\n]*(?:origin\s+)?(?:main|master)(?:\s|$)/i,
    message:
      '[agteamos] Push directo a main/master detectado. Confirma segun CLAUDE.md (pide confirmacion antes de push a main/master).',
  },
  {
    name: 'push-force',
    mode: 'ask',
    test: /\bgit\s+push\b[^;\r\n]*(?:--force|-f)(?:\s|$)/i,
    message: '[agteamos] Push con --force detectado. Confirma antes de continuar.',
  },
  {
    name: 'merge-approval-gh',
    mode: 'ask',
    test: /\bgh\s+pr\s+merge(?:\s|$)/i,
    message:
      '[agteamos] El merge a main/master requiere aprobacion QA + production-readiness check antes de proceder. ¿Ya se corrieron?',
  },
  {
    name: 'merge-approval-az',
    mode: 'ask',
    test: /\baz\s+repos\s+pr\s+update\b(?=[^;\r\n]*--status(?:\s+|=)completed(?:\s|$))/i,
    message:
      '[agteamos] El merge a main/master requiere aprobacion QA + production-readiness check antes de proceder. ¿Ya se corrieron?',
  },
];

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdinSync());
  } catch (err) {
    process.exit(0);
  }
  const command = payload && payload.tool_input && payload.tool_input.command;
  if (typeof command !== 'string') process.exit(0);

  for (const rule of RULES) {
    if (!rule.test.test(command)) continue;

    if (rule.mode === 'block') {
      process.stderr.write(rule.message + '\n');
      process.exit(2);
    }

    // mode 'ask' -- primer match gana (mismo criterio que los originales, que
    // ya usaban if/else en push-protected-branch/push-force).
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: rule.message,
        },
      })
    );
    process.exit(0);
  }

  process.exit(0);
}

main();
