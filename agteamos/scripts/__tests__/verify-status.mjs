import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const testsDirectory = dirname(fileURLToPath(import.meta.url));
const statusScript = resolve(testsDirectory, "..", "agteamos-status.mjs");
const pluginRoot = resolve(testsDirectory, "..", "..");
const temporaryDirectories = [];

function makeProject(name) {
  const root = mkdtempSync(join(tmpdir(), `agteamos-status-${name}-`));
  temporaryDirectories.push(root);
  write(
    root,
    "agteamos/onboarding.yml",
    [
      "mode: lazy",
      "artifacts:",
      "  project_context:",
      "    path: architecture/PROJECT_CONTEXT.md",
      "    status: done",
      "  standards.testing:",
      "    path: standards/testing/",
      "    status: pending",
      '    trigger: "tests o QA"',
      "",
    ].join("\n"),
  );
  return root;
}

function makeLayoutProject(name, lifecycle = "initialized") {
  const root = mkdtempSync(join(tmpdir(), `agteamos-status-${name}-`));
  temporaryDirectories.push(root);
  write(root, "agteamos/platform.yml", "reviewed: false\n");
  write(
    root,
    "agteamos/onboarding.yml",
    [
      'layout_contract: "1"',
      "profile: adopted_l0",
      "mode: lazy",
      `lifecycle: ${lifecycle}`,
      "artifacts:",
      "  standards.testing:",
      "    path: standards/testing/",
      "    status: pending",
      '    trigger: "primera tarea que requiere testing"',
      "",
    ].join("\n"),
  );
  write(
    root,
    "agteamos/architecture/PROJECT_CONTEXT.md",
    "# Project Context\n",
  );
  return root;
}

function write(root, relativePath, content) {
  const path = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function taskYaml({
  id,
  title,
  schema,
  status = "in_progress",
  phase = null,
  gates = {},
  workflowContract = null,
  risk = null,
  riskReason = null,
}) {
  const lines = [
    `id: "${id}"`,
    `title: "${title}"`,
    `schema: ${schema}`,
    `status: ${status}`,
    `branch: "feature/${id}-fixture"`,
  ];
  if (workflowContract) lines.push(`workflow_contract: "${workflowContract}"`);
  if (risk) lines.push(`risk: ${risk}`);
  if (riskReason) lines.push(`risk_reason: "${riskReason}"`);
  if (phase) lines.push(`phase: ${phase}`);
  const durableValues = workflowContract === "3"
    ? {
      risk_review_approved: false,
      reviewed_sha: null,
      risk_review_sha: null,
      ...gates,
    }
    : gates;
  for (const [name, value] of Object.entries(durableValues)) {
    lines.push(`${name}: ${value}`);
  }
  return [...lines, ""].join("\n");
}

function fullProgress(nextAction = "Implementar la primera unidad.") {
  return [
    "# Progress",
    "",
    "## Approvals",
    "- Requirements: approved 2026-09-25",
    "- Design/deltas: approved 2026-09-25",
    "",
    "## Next Action",
    `> ${nextAction}`,
    "",
  ].join("\n");
}

function liteProgress() {
  return [
    "# Progress",
    "",
    "## Resumen (schema: lite)",
    "Ajuste interno acotado que no cambia el contrato observable.",
    "",
    "## Test de regresión",
    "- Test: `test/fixture.test.js`",
    "- Antes: FAIL",
    "- Después: PASS",
    "",
    "## Next Action",
    "> Ejecutar la implementación y el test de regresión.",
    "",
  ].join("\n");
}

function addFullArtifacts(root, change) {
  const base = `agteamos/changes/${change}`;
  write(root, `${base}/brief.md`, "# Brief\n");
  write(root, `${base}/specs/requirements.md`, "# Requirements\n");
  write(root, `${base}/specs/design.md`, "# Design\n");
  write(root, `${base}/specs/tasks.md`, "# Tasks\n");
  write(
    root,
    `${base}/specs/deltas/billing.md`,
    "# Delta\n\n## Sin cambios en la spec maestra\nNo cambia el contrato.\n",
  );
}

function run(root, ...arguments_) {
  return spawnSync(
    process.execPath,
    [statusScript, "--root", root, ...arguments_],
    { encoding: "utf8" },
  );
}

function jsonReport(root) {
  const result = run(root, "--json");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return { raw: result.stdout, report: JSON.parse(result.stdout) };
}

function testFullBlocked() {
  const root = makeProject("full-blocked");
  const change = "41-full-blocked";
  write(
    root,
    `agteamos/changes/${change}/task.yml`,
    taskYaml({ id: "41", title: "Full blocked", schema: "full" }),
  );
  write(root, `agteamos/changes/${change}/progress.md`, fullProgress());
  write(root, `agteamos/changes/${change}/brief.md`, "# Brief\n");
  write(
    root,
    `agteamos/changes/${change}/specs/requirements.md`,
    "# Requirements\n",
  );

  const { report } = jsonReport(root);
  assert.equal(report.changes.length, 1);
  assert.equal(report.changes[0].phase, "DESIGN");
  assert.equal(report.changes[0].blocked, true);
  assert.deepEqual(
    report.changes[0].missing_artifacts,
    ["specs/deltas/*.md", "specs/design.md", "specs/tasks.md"],
  );
  console.log("OK  full bloqueado");
}

function testFullReady() {
  const root = makeProject("full-ready");
  const change = "42-full-ready";
  write(
    root,
    `agteamos/changes/${change}/task.yml`,
    taskYaml({ id: "42", title: "Full ready", schema: "full" }),
  );
  write(
    root,
    `agteamos/changes/${change}/progress.md`,
    fullProgress("Implementar T01."),
  );
  addFullArtifacts(root, change);

  const { report } = jsonReport(root);
  assert.equal(report.changes[0].phase, "IMPLEMENT");
  assert.equal(report.changes[0].blocked, false);
  assert.deepEqual(report.changes[0].missing_artifacts, []);
  assert.equal(report.changes[0].next_action, "Implementar T01.");
  assert.equal(report.summary.ready, true);
  console.log("OK  full listo");
  return root;
}

function testLite() {
  const root = makeProject("lite");
  const change = "43-lite";
  write(
    root,
    `agteamos/changes/${change}/task.yml`,
    taskYaml({ id: "43", title: "Lite ready", schema: "lite" }),
  );
  write(root, `agteamos/changes/${change}/progress.md`, liteProgress());

  const { report } = jsonReport(root);
  assert.equal(report.changes[0].schema, "lite");
  assert.equal(report.changes[0].phase, "IMPLEMENT");
  assert.equal(report.changes[0].blocked, false);
  assert.deepEqual(report.changes[0].ready_artifacts, [
    "progress.md",
    "task.yml",
  ]);
  console.log("OK  lite listo");
}

function testJsonParseable(root) {
  const result = run(root, "--json");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(report), [
    "contract_version",
    "project",
    "onboarding",
    "changes",
    "context_budget",
    "summary",
    "diagnostics",
  ]);
  assert.equal(report.contract_version, "3");
  assert.equal(report.context_budget.metric, "utf8-bytes");
  assert.equal(
    report.context_budget.estimated_tokens,
    Math.ceil(report.context_budget.bytes / 4),
  );
  assert.match(report.context_budget.telemetry, /estimate-only/);
  assert.equal(report.onboarding.items.length, 2);
  assert.equal(result.stderr, "");
  console.log("OK  JSON parseable");
}

function testContextBudgetOnly(root) {
  const result = run(root, "--context-budget", "--json");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.selected_tier, 2);
  assert.ok(report.artifacts.some(
    (artifact) => artifact.module === "task-state",
  ));
  assert.ok(report.artifacts.some(
    (artifact) => artifact.module === "change-spec",
  ));
  assert.equal(report.estimated_tokens, Math.ceil(report.bytes / 4));
  console.log("OK  context budget determinista por tier/módulo/artefacto");
}

function testPluginMode() {
  const { report } = jsonReport(pluginRoot);
  assert.equal(report.project.mode, "plugin");
  assert.deepEqual(report.changes, []);
  assert.equal(report.summary.ready, true);
  assert.ok(
    report.diagnostics.some(
      (diagnostic) => diagnostic.code === "PLUGIN_MODE_USE_VALIDATOR",
    ),
  );
  console.log("OK  modo plugin");
}

function testLayoutProfile() {
  const root = makeLayoutProject("layout");
  const { report } = jsonReport(root);
  assert.equal(report.onboarding.layout_contract, "1");
  assert.equal(report.onboarding.profile, "adopted_l0");
  assert.equal(report.onboarding.lifecycle, "initialized");
  assert.equal(report.summary.ready, true);
  console.log("OK  status expone layout lazy");
}

function testUnexpectedInitialDirectoryBlocks() {
  const root = makeLayoutProject("layout-eager");
  write(root, "agteamos/specs/index.yml", "domains: []\n");
  const { report } = jsonReport(root);
  assert.equal(report.summary.ready, false);
  assert.ok(
    report.diagnostics.some(
      (diagnostic) => diagnostic.code === "INITIAL_LAYOUT_DIRECTORY_UNEXPECTED",
    ),
  );
  console.log("OK  status bloquea carpeta eager");
}

function testLateGateBlocksReview() {
  const root = makeProject("review-gate-blocked");
  const change = "44-review-blocked";
  write(
    root,
    `agteamos/changes/${change}/task.yml`,
    taskYaml({
      id: "44",
      title: "Review blocked",
      schema: "full",
      status: "in_review",
      phase: "PR_REVIEW",
    }),
  );
  write(root, `agteamos/changes/${change}/progress.md`, fullProgress());
  addFullArtifacts(root, change);

  const { report } = jsonReport(root);
  assert.equal(report.changes[0].blocked, true);
  assert.deepEqual(report.changes[0].missing_gates, [
    "pre_pr_validate:qa_pass",
    "pre_pr_validate:validator_pass",
  ]);
  assert.ok(report.diagnostics.some(
    (diagnostic) => diagnostic.code === "WORKFLOW_GATE_MISSING",
  ));
  console.log("OK  gates tardíos bloquean review");
}

function testLateGatesAllowPreClose() {
  const root = makeProject("pre-close-ready");
  const change = "45-pre-close";
  write(
    root,
    `agteamos/changes/${change}/task.yml`,
    taskYaml({
      id: "45",
      title: "Pre-close ready",
      schema: "full",
      status: "in_review",
      phase: "PRE_CLOSE_VALIDATE",
      workflowContract: "3",
      risk: "high",
      riskReason: "Authentication contract changed",
      gates: {
        qa_pass: true,
        validator_pass: true,
        review_approved: true,
        reviewed_sha: "abcdef1",
        risk_review_approved: true,
        risk_review_sha: "abcdef1",
      },
    }),
  );
  write(root, `agteamos/changes/${change}/progress.md`, fullProgress());
  write(
    root,
    `agteamos/changes/${change}/verify-report.md`,
    "# Verify\n\n**Resultado**: PASS\n",
  );
  addFullArtifacts(root, change);

  const { report } = jsonReport(root);
  assert.equal(report.changes[0].phase, "PRE_CLOSE_VALIDATE");
  assert.equal(report.changes[0].risk, "high");
  assert.equal(report.changes[0].gates.reviewed_sha, "abcdef1");
  assert.equal(report.changes[0].blocked, false);
  assert.deepEqual(report.changes[0].missing_gates, []);
  console.log("OK  gates tardíos permiten pre-close");
}

function testAbandoningSkipsDeliveryGates() {
  const root = makeProject("abandoning");
  const change = "46-abandoning";
  write(
    root,
    `agteamos/changes/${change}/task.yml`,
    taskYaml({
      id: "46",
      title: "Abandoning",
      schema: "lite",
      status: "in_progress",
      phase: "ABANDONING",
      workflowContract: "3",
      risk: "standard",
      riskReason: "No elevated-risk signal",
      gates: {
        qa_pass: false,
        validator_pass: false,
        review_approved: false,
        merge_confirmed: false,
        ticket_reconciled: false,
      },
    }),
  );
  write(root, `agteamos/changes/${change}/progress.md`, liteProgress());
  write(
    root,
    `agteamos/changes/${change}/abandon-record.md`,
    "# Abandon Record\n\n- Status: abandoning\n",
  );

  const { report } = jsonReport(root);
  assert.equal(report.changes[0].phase, "ABANDONING");
  assert.equal(report.changes[0].blocked, false);
  assert.deepEqual(report.changes[0].missing_gates, []);
  console.log("OK  ABANDONING no exige gates de entrega");
}

try {
  testFullBlocked();
  const fullReadyRoot = testFullReady();
  testLite();
  testJsonParseable(fullReadyRoot);
  testContextBudgetOnly(fullReadyRoot);
  testPluginMode();
  testLayoutProfile();
  testUnexpectedInitialDirectoryBlocks();
  testLateGateBlocksReview();
  testLateGatesAllowPreClose();
  testAbandoningSkipsDeliveryGates();
  console.log("\nStatus verification OK (11 scenarios)");
} finally {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
}
