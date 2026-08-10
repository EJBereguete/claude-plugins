'use strict';

const { readStdinSync } = require('./lib/read-stdin');

// PreToolUse / Bash — recordatorio (no bloqueante) al mergear PRs hacia main/master.
// Cubre ambos trackers que soporta agteamos/tracker/<tipo>.md: GitHub CLI y Azure CLI.
const GH_MERGE_TO_PROTECTED = /gh\s+pr\s+merge[^"]*--base\s+(main|master)([\s"]|$)/;
const AZ_MERGE_TO_PROTECTED = /az\s+repos\s+pr\s+update[^"]*--target-branch\s+(main|master)([\s"]|$)/;

const input = readStdinSync();

if (GH_MERGE_TO_PROTECTED.test(input) || AZ_MERGE_TO_PROTECTED.test(input)) {
  process.stderr.write(
    '[agteamos] Recuerda: el merge a main/master requiere aprobacion QA + production-readiness check antes de proceder.\n'
  );
}

process.exit(0);
