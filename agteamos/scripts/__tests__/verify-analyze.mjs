import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const script = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "agteamos-analyze.mjs",
);
const temp = mkdtempSync(resolve(tmpdir(), "agteamos-analyze-"));
const change = resolve(temp, "agteamos", "changes", "42-example");

function write(relative, content) {
  const path = resolve(change, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function run(stage) {
  return spawnSync(
    process.execPath,
    [script, "--change", change, "--stage", stage, "--json"],
    { encoding: "utf8" },
  );
}

try {
  write("task.yml", 'id: "42"\nschema: full\n');
  write(
    "requirements.md",
    `# Feature: Example

## Objetivo de negocio
Permitir guardar un valor real.

## Requirements (RFC 2119)
- **R1**: El sistema MUST guardar el valor solicitado.

## Acceptance Criteria
- [ ] **R1** · Given valor 7, When se guarda, Then se obtiene 7.
`,
  );
  write(
    "design.md",
    `# Design

## Archivos
### Crear
- \`src/value.ts\`: persistencia.
`,
  );
  const openTasks = `# Tasks

1. [ ] **[R1 / ADDED: Value Storage]** Implementar persistencia
   - Files: \`src/value.ts\`
`;
  write("tasks.md", openTasks);
  write(
    "specs/deltas/value.md",
    `# Spec Delta

## Spec maestra afectada
agteamos/specs/value.md

## ADDED Requirements
### Requirement: Value Storage
El sistema MUST guardar el valor.

#### Scenario: Save
- GIVEN valor 7
- WHEN se guarda
- THEN se obtiene 7
`,
  );

  const preflight = run("preflight");
  if (preflight.status !== 0) {
    throw new Error(`valid preflight failed:\n${preflight.stdout}\n${preflight.stderr}`);
  }

  const incomplete = run("verify");
  if (incomplete.status === 0 || !incomplete.stdout.includes("TASK_INCOMPLETE")) {
    throw new Error("verify did not reject incomplete implementation task");
  }

  write("tasks.md", openTasks.replace("1. [ ]", "1. [x]"));
  const verified = run("verify");
  if (verified.status !== 0) {
    throw new Error(`valid verify failed:\n${verified.stdout}\n${verified.stderr}`);
  }

  const master = resolve(temp, "agteamos", "specs", "value.md");
  mkdirSync(dirname(master), { recursive: true });
  writeFileSync(
    master,
    "## Requirements\n### Requirement: Value Storage\nExisting behavior.\n",
    "utf8",
  );
  const duplicateAdded = run("preflight");
  if (
    duplicateAdded.status === 0 ||
    !duplicateAdded.stdout.includes("DELTA_ADDED_EXISTS")
  ) {
    throw new Error("preflight did not reject ADDED anchor already in master");
  }
  rmSync(master);

  write("tasks.md", openTasks.replace("R1", "R99"));
  const orphan = run("preflight");
  if (
    orphan.status === 0 ||
    !orphan.stdout.includes("TASK_REQUIREMENT_ORPHAN") ||
    !orphan.stdout.includes("REQUIREMENT_WITHOUT_TASK")
  ) {
    throw new Error("preflight did not reject orphan requirement references");
  }

  console.log(
    "Semantic analyzer verification OK (preflight, closure, delta, orphan coverage)",
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
