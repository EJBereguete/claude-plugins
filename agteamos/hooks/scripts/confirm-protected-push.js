'use strict';

const { readStdinSync } = require('./lib/read-stdin');

// PreToolUse / Bash — pide confirmacion antes de push a main/master o con --force.
const PUSH_TO_PROTECTED_BRANCH = /git\s+push[^"]*(origin\s+)?(main|master)([\s"]|$)/;
const PUSH_FORCE = /git\s+push[^"]*(--force|-f)([\s"]|$)/;

const input = readStdinSync();

function ask(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: reason,
      },
    })
  );
}

if (PUSH_TO_PROTECTED_BRANCH.test(input)) {
  ask(
    '[agteamos] Push directo a main/master detectado. Confirma segun CLAUDE.md (pide confirmacion antes de push a main/master).'
  );
} else if (PUSH_FORCE.test(input)) {
  ask('[agteamos] Push con --force detectado. Confirma antes de continuar.');
}

process.exit(0);
