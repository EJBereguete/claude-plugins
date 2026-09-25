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

const validator = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "agteamos-validate.mjs",
);
const temporaryDirectories = [];

function makeProject(name) {
  const root = mkdtempSync(join(tmpdir(), `agteamos-validator-${name}-`));
  temporaryDirectories.push(root);
  return root;
}

function write(root, relativePath, content) {
  const path = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function taskYaml({
  id = "1",
  title = "Fixture",
  schema,
  contextTier = 2,
  status = "in_progress",
  workflowContract = null,
  phase = null,
  gates = null,
  risk = "standard",
  riskReason = "Fixture without elevated-risk signals",
}) {
  const lines = [
    `id: "${id}"`,
    `title: "${title}"`,
    `status: ${status}`,
    `schema: ${schema}`,
    `context_tier: ${contextTier}`,
  ];
  if (workflowContract) lines.push(`workflow_contract: "${workflowContract}"`);
  if (workflowContract === "3") {
    lines.push(`risk: ${risk}`);
    lines.push(`risk_reason: "${riskReason}"`);
  }
  if (phase) lines.push(`phase: ${phase}`);
  const durableValues = workflowContract === "3"
    ? {
      risk_review_approved: false,
      reviewed_sha: null,
      risk_review_sha: null,
      ...(gates || {}),
    }
    : gates;
  if (durableValues) {
    for (const [field, value] of Object.entries(durableValues)) {
      lines.push(`${field}: ${value}`);
    }
  }
  return [...lines, ""].join("\n");
}

function run(root, ...arguments_) {
  return spawnSync(
    process.execPath,
    [validator, "--root", root, ...arguments_],
    { encoding: "utf8" },
  );
}

function addFullArtifacts(root, delta) {
  const base = "agteamos/changes/1-fixture/specs";
  write(root, `${base}/requirements.md`, "# Requirements\n");
  write(root, `${base}/design.md`, "# Design\n");
  write(root, `${base}/tasks.md`, "# Tasks\n");
  write(root, `${base}/deltas/billing.md`, delta);
}

function validAddedDelta() {
  return [
    "# Spec Delta: Fixture",
    "",
    "## ADDED Requirements",
    "",
    "### Requirement: Export Invoice",
    "El sistema MUST exportar una factura.",
    "",
    "#### Scenario: Factura existente",
    "- GIVEN una factura existente",
    "- WHEN el usuario la exporta",
    "- THEN recibe el archivo",
    "",
  ].join("\n");
}

function onboarding(profile, lifecycle = "initialized") {
  return [
    'layout_contract: "1"',
    `profile: ${profile}`,
    "mode: lazy",
    `lifecycle: ${lifecycle}`,
    "artifacts:",
    "  standards.testing:",
    "    path: standards/testing/",
    "    status: pending",
    '    trigger: "primera tarea que requiere testing"',
    "",
  ].join("\n");
}

function addAdoptedLayout(root, lifecycle = "initialized") {
  write(root, "agteamos/platform.yml", "reviewed: false\n");
  write(root, "agteamos/onboarding.yml", onboarding("adopted_l0", lifecycle));
  write(
    root,
    "agteamos/architecture/PROJECT_CONTEXT.md",
    "# Project Context\n",
  );
}

function testAdoptedL0Strict() {
  const root = makeProject("adopted-l0");
  addAdoptedLayout(root);

  const result = run(root, "--strict", "--json");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.summary.warnings, 0);
  console.log("OK  layout adopted_l0 mínimo");
}

function testGreenfieldPhase0Strict() {
  const root = makeProject("greenfield");
  write(root, "agteamos/platform.yml", "reviewed: true\n");
  write(
    root,
    "agteamos/onboarding.yml",
    onboarding("greenfield_phase0"),
  );
  write(
    root,
    "agteamos/architecture/PROJECT_CONTEXT.md",
    "# Project Context\n",
  );
  write(
    root,
    "agteamos/architecture/adr/ADR-001-runtime.md",
    "# ADR-001\n",
  );
  write(root, "agteamos/product/mission.md", "# Mission\n");
  write(root, "agteamos/product/kpis.md", "# KPIs\n");
  write(root, "agteamos/product/roadmap.md", "# Roadmap\n");

  const result = run(root, "--strict", "--json");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  console.log("OK  layout greenfield_phase0 mínimo");
}

function testUnexpectedEagerDirectoryFails() {
  const root = makeProject("eager");
  addAdoptedLayout(root);
  write(root, "agteamos/standards/index.yml", "testing: testing\n");

  const result = run(root, "--json");
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(
    report.diagnostics.some(
      (diagnostic) => diagnostic.code === "INITIAL_LAYOUT_DIRECTORY_UNEXPECTED",
    ),
  );
  console.log("OK  carpeta eager inesperada falla");
}

function testActiveLayoutAllowsMaterialization() {
  const root = makeProject("active");
  addAdoptedLayout(root, "active");
  write(
    root,
    "agteamos/standards/testing/README.md",
    "# Testing observado\n",
  );

  const result = run(root, "--strict", "--json");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  console.log("OK  layout activo permite materialización JIT");
}

function testValidFullProject() {
  const root = makeProject("full");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({ schema: "full" }),
  );
  addFullArtifacts(root, validAddedDelta());

  const result = run(root);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /validation OK/);
  console.log("OK  proyecto full válido");
}

function testUnknownModifiedRequirementFails() {
  const root = makeProject("modified");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({ schema: "full" }),
  );
  write(
    root,
    "agteamos/specs/billing.md",
    [
      "# Spec: billing",
      "",
      "## Requirements",
      "",
      "### Requirement: Existing Requirement",
      "El sistema MUST conservar el requisito.",
      "",
      "#### Scenario: Caso existente",
      "- GIVEN un estado",
      "- WHEN ocurre una acción",
      "- THEN se conserva",
      "",
    ].join("\n"),
  );
  addFullArtifacts(
    root,
    [
      "# Spec Delta: Fixture",
      "",
      "## MODIFIED Requirements",
      "",
      "### Requirement: Missing Requirement",
      "El sistema MUST cambiar.",
      "",
      "#### Scenario: Cambio",
      "- GIVEN un estado",
      "- WHEN ocurre una acción",
      "- THEN cambia",
      "",
    ].join("\n"),
  );

  const result = run(root, "--json");
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(
    report.diagnostics.some(
      (diagnostic) => diagnostic.code === "DELTA_REQUIREMENT_NOT_IN_MASTER",
    ),
  );
  console.log("OK  MODIFIED inexistente falla");
}

function testIncompleteFullProjectFails() {
  const root = makeProject("incomplete");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({ schema: "full" }),
  );

  const result = run(root, "--json");
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(
    report.diagnostics.some(
      (diagnostic) => diagnostic.code === "FULL_ARTIFACT_MISSING",
    ),
  );
  assert.ok(
    report.diagnostics.some(
      (diagnostic) => diagnostic.code === "FULL_DELTAS_MISSING",
    ),
  );
  console.log("OK  proyecto full incompleto falla");
}

function testValidLiteProject() {
  const root = makeProject("lite");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({ schema: "lite", contextTier: 1 }),
  );

  const result = run(root);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  console.log("OK  proyecto lite válido");
  return root;
}

function testJsonOutputIsParseable(root) {
  const result = run(root, "--json");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(Array.isArray(report.diagnostics));
  assert.equal(report.summary.errors, 0);
  assert.equal(report.summary.valid, true);
  console.log("OK  salida JSON parseable");
}

function testCurrentWorkflowBlocksMissingGates() {
  const root = makeProject("workflow-gates-missing");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({
      schema: "lite",
      status: "in_review",
      workflowContract: "3",
      phase: "PR_REVIEW",
    }),
  );

  const result = run(root, "--json");
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.diagnostics.some(
    (diagnostic) => diagnostic.code === "TASK_GATE_FIELD_INVALID",
  ));
  assert.ok(report.diagnostics.some(
    (diagnostic) => diagnostic.code === "WORKFLOW_GATE_MISSING",
  ));
  console.log("OK  workflow actual bloquea gates ausentes");
}

function testCurrentWorkflowAllowsPreClose() {
  const root = makeProject("workflow-pre-close");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({
      schema: "lite",
      status: "in_review",
      workflowContract: "3",
      phase: "PRE_CLOSE_VALIDATE",
      gates: {
        qa_pass: true,
        validator_pass: true,
        review_approved: true,
        merge_confirmed: false,
        ticket_reconciled: false,
        reviewed_sha: "abcdef1",
      },
    }),
  );
  write(
    root,
    "agteamos/changes/1-fixture/verify-report.md",
    "# Verify\n\n**Resultado**: PASS\n",
  );

  const result = run(root, "--strict", "--json");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  console.log("OK  workflow actual permite pre-close válido");
}

function testCompatibleWorkflowV2AllowsPreClose() {
  const root = makeProject("workflow-v2-compatible");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({
      schema: "lite",
      status: "in_review",
      workflowContract: "2",
      phase: "PRE_CLOSE_VALIDATE",
      gates: {
        qa_pass: true,
        validator_pass: true,
        review_approved: true,
        merge_confirmed: false,
        ticket_reconciled: false,
      },
    }),
  );
  write(
    root,
    "agteamos/changes/1-fixture/verify-report.md",
    "# Verify\n\n**Resultado**: PASS\n",
  );

  const result = run(root, "--strict", "--json");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  console.log("OK  workflow v2 conserva compatibilidad de lectura");
}

function testHighRiskRequiresShaBoundReview() {
  const root = makeProject("workflow-high-risk-review");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({
      schema: "lite",
      status: "in_review",
      workflowContract: "3",
      phase: "PRE_CLOSE_VALIDATE",
      risk: "high",
      riskReason: "Authentication surface changed",
      gates: {
        qa_pass: true,
        validator_pass: true,
        review_approved: true,
        merge_confirmed: false,
        ticket_reconciled: false,
        reviewed_sha: "abcdef1",
        risk_review_approved: false,
        risk_review_sha: "abcdef2",
      },
    }),
  );
  write(
    root,
    "agteamos/changes/1-fixture/verify-report.md",
    "# Verify\n\n**Resultado**: PASS\n",
  );

  const result = run(root, "--json");
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.diagnostics.some(
    (diagnostic) => diagnostic.code === "RISK_REVIEW_MISSING",
  ));
  assert.ok(report.diagnostics.some(
    (diagnostic) => diagnostic.code === "RISK_REVIEW_SHA_MISMATCH",
  ));
  console.log("OK  riesgo alto exige review ligado al SHA");
}

function testHighRiskAllowsMatchingReviewSha() {
  const root = makeProject("workflow-high-risk-approved");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({
      schema: "lite",
      status: "in_review",
      workflowContract: "3",
      phase: "PRE_CLOSE_VALIDATE",
      risk: "high",
      riskReason: "Payment processing changed",
      gates: {
        qa_pass: true,
        validator_pass: true,
        review_approved: true,
        merge_confirmed: false,
        ticket_reconciled: false,
        reviewed_sha: "abcdef1",
        risk_review_approved: true,
        risk_review_sha: "abcdef1",
      },
    }),
  );
  write(
    root,
    "agteamos/changes/1-fixture/verify-report.md",
    "# Verify\n\n**Resultado**: PASS\n",
  );

  const result = run(root, "--strict", "--json");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  console.log("OK  riesgo alto acepta review del mismo SHA");
}

function testAbandonedWorkflowRequiresRecord() {
  const root = makeProject("workflow-abandoned-missing-record");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({
      schema: "lite",
      status: "abandoned",
      workflowContract: "3",
      phase: "ABANDONED",
      gates: {
        qa_pass: false,
        validator_pass: false,
        review_approved: false,
        merge_confirmed: false,
        ticket_reconciled: true,
      },
    }),
  );

  const result = run(root, "--json");
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.diagnostics.some(
    (diagnostic) => diagnostic.code === "WORKFLOW_GATE_MISSING"
      && diagnostic.message.includes("abandon-record.md"),
  ));
  console.log("OK  abandono sin record falla");
}

function testAbandoningDoesNotRequireDeliveryGates() {
  const root = makeProject("workflow-abandoning");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({
      schema: "lite",
      status: "in_progress",
      workflowContract: "3",
      phase: "ABANDONING",
      gates: {
        qa_pass: false,
        validator_pass: false,
        review_approved: false,
        merge_confirmed: false,
        ticket_reconciled: false,
      },
    }),
  );
  write(
    root,
    "agteamos/changes/1-fixture/abandon-record.md",
    "# Abandon Record\n\n- Status: abandoning\n",
  );

  const result = run(root, "--strict", "--json");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  console.log("OK  ABANDONING no reutiliza gates de entrega");
}

function testAbandoningRequiresDurableRecord() {
  const root = makeProject("workflow-abandoning-no-record");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({
      schema: "lite",
      status: "in_progress",
      workflowContract: "3",
      phase: "ABANDONING",
      gates: {
        qa_pass: false,
        validator_pass: false,
        review_approved: false,
        merge_confirmed: false,
        ticket_reconciled: false,
      },
    }),
  );

  const result = run(root, "--json");
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.diagnostics.some((diagnostic) => (
    diagnostic.code === "WORKFLOW_GATE_MISSING"
    && diagnostic.message.includes("abandon-record.md")
  )));
  console.log("OK  ABANDONING exige record durable");
}

function testAbandonedWorkflowAllowsPreservedArchive() {
  const root = makeProject("workflow-abandoned-valid");
  write(
    root,
    "agteamos/changes/archive/2026-09-25-1-fixture-abandoned/task.yml",
    taskYaml({
      schema: "lite",
      status: "abandoned",
      workflowContract: "3",
      phase: "ABANDONED",
      gates: {
        qa_pass: false,
        validator_pass: false,
        review_approved: false,
        merge_confirmed: false,
        ticket_reconciled: true,
      },
    }),
  );
  write(
    root,
    "agteamos/changes/archive/2026-09-25-1-fixture-abandoned/abandon-record.md",
    "# Abandon Record: 1\n\n- Status: abandoned\n",
  );

  const result = run(root, "--strict", "--json");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  console.log("OK  abandono preservado válido sin gates de entrega");
}

function trackerResult(extra = "") {
  return [
    "# Tracker Result",
    "",
    "## Change set",
    "- Provider: azure_devops",
    `- Fingerprint: ${"a".repeat(64)}`,
    "- Status: verified",
    "- Doctor: configured/snapshot-1/REST",
    "",
    "## Operations",
    "| Key | Kind | Target | Status | Provider ID/URL | Read-back |",
    "|---|---|---|---|---|---|",
    "| A | create | Story | verified | AB#42 | Title PASS |",
    "",
    "## Failures and unexecuted",
    "- none",
    extra,
    "",
  ].join("\n");
}

function testValidTrackerResult() {
  const root = makeProject("tracker-result-valid");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({ schema: "lite", contextTier: 1 }),
  );
  write(
    root,
    "agteamos/changes/1-fixture/tracker-result.md",
    trackerResult(),
  );
  const result = run(root, "--strict", "--json");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  console.log("OK  tracker-result sanitizado válido");
}

function testSensitiveTrackerResultFails() {
  const root = makeProject("tracker-result-secret");
  write(
    root,
    "agteamos/changes/1-fixture/task.yml",
    taskYaml({ schema: "lite", contextTier: 1 }),
  );
  write(
    root,
    "agteamos/changes/1-fixture/tracker-result.md",
    trackerResult("access_token=super-secret"),
  );
  const result = run(root, "--json");
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.diagnostics.some(
    (diagnostic) => diagnostic.code === "TRACKER_RESULT_SENSITIVE_DATA",
  ));
  console.log("OK  tracker-result sensible falla");
}

try {
  testAdoptedL0Strict();
  testGreenfieldPhase0Strict();
  testUnexpectedEagerDirectoryFails();
  testActiveLayoutAllowsMaterialization();
  testValidFullProject();
  testUnknownModifiedRequirementFails();
  testIncompleteFullProjectFails();
  const liteRoot = testValidLiteProject();
  testJsonOutputIsParseable(liteRoot);
  testCurrentWorkflowBlocksMissingGates();
  testCurrentWorkflowAllowsPreClose();
  testCompatibleWorkflowV2AllowsPreClose();
  testHighRiskRequiresShaBoundReview();
  testHighRiskAllowsMatchingReviewSha();
  testAbandoningDoesNotRequireDeliveryGates();
  testAbandoningRequiresDurableRecord();
  testAbandonedWorkflowRequiresRecord();
  testAbandonedWorkflowAllowsPreservedArchive();
  testValidTrackerResult();
  testSensitiveTrackerResultFails();
  console.log("\nValidator verification OK (20 scenarios)");
} finally {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
}
