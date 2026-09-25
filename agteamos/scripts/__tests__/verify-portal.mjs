#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildPortalSnapshot,
  renderPortal,
} from "../agteamos-portal.mjs";

const testRoot = mkdtempSync(join(tmpdir(), "agteamos-portal-"));
const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function allFiles(root) {
  const result = {};
  if (!existsSync(root)) return result;
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) {
        result[relative(root, path).replaceAll("\\", "/")] = readFileSync(path, "utf8");
      }
    }
  };
  visit(root);
  return result;
}

function createModernProject(root) {
  write(join(root, "agteamos", "platform.yml"), `repo_host: github
tracker: azure_boards
branch_strategy: trunk
ci_target: github_actions
deploy_target: azure
reviewed: true
api_token: ULTRA_SECRET_TOKEN
owner_email: private@example.test
`);
  write(join(root, "agteamos", "onboarding.yml"), `layout_contract: "1"
profile: adopted_l0
mode: lazy
lifecycle: active
artifacts:
  product_backlog:
    status: done
    path: agteamos/product/backlog.md
  standards:
    status: pending
    path: agteamos/standards
`);
  write(
    join(root, "agteamos", "architecture", "PROJECT_CONTEXT.md"),
    "# Context\n",
  );
  write(join(root, "agteamos", "product", "backlog.md"), `# Project Backlog

| # | Fecha | Idea | Origen | Prioridad | Estado | Ticket | Owner Email | Secret |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-09-25 | <script>alert("xss")</script> Exportar PDF | usuario | alta | pendiente | AB#45 | backlog-owner@example.test | BACKLOG_SECRET |
`);
  write(join(root, "agteamos", "changes", "AB-45-export", "task.yml"), `id: AB-45
title: Exportar facturas
schema: lite
status: in_progress
branch: feature/ab-45-export
`);
  write(join(root, "agteamos", "changes", "AB-45-export", "progress.md"), `# Progress

## Resumen (schema: lite)
Implementación en progreso.

## Test de regresión
Pendiente.

## Next Action
Ejecutar pruebas.
`);
  write(
    join(root, "agteamos", "changes", "AB-45-export", "report.html"),
    "<!doctype html><title>report</title>",
  );
  write(
    join(root, "agteamos", "changes", "AB-45-export", "tracker-result.md"),
    `# Tracker Result

## Change set
- Fingerprint: ${"a".repeat(64)}
- Status: verified

Raw response: TRACKER_RAW_SHOULD_NOT_LEAK
`,
  );
  write(
    join(root, "agteamos", "changes", "archive", "2026-09-24-GH-9-done", "task.yml"),
    "id: GH-9\ntitle: Tarea cerrada\nschema: lite\nstatus: done\nbranch: feature/gh-9\n",
  );
  write(
    join(root, "agteamos", "changes", "archive", "2026-09-24-GH-9-done", "progress.md"),
    "# Progress\n\n## Next Action\nNinguna.\n",
  );
  write(
    join(root, "agteamos", "changes", "archive", "2026-09-24-GH-9-done", "tracker-result.md"),
    `# Tracker Result

## Change set
- Fingerprint: ${"b".repeat(64)}
- Status: partial
`,
  );
  write(
    join(root, "agteamos", "changes", "archive", "2026-09-24-AB-8-abandoned", "task.yml"),
    "id: AB-8\ntitle: Tarea abandonada\nschema: lite\nstatus: abandoned\nphase: ABANDONED\nrisk: high\nbranch: feature/ab-8\n",
  );
  write(
    join(root, "agteamos", "changes", "archive", "2026-09-24-AB-8-abandoned", "progress.md"),
    "# Progress\n\n## Next Action\nConsultar abandon-record.md.\n",
  );
  write(
    join(root, "agteamos", "changes", "archive", "2026-09-24-AB-8-abandoned", "abandon-record.md"),
    "# Abandon Record\n",
  );
  write(join(root, "agteamos", "quality", "debt-trend.yml"), "score: 10\n");
  write(join(root, "agteamos", "quality", "review.md"), "# Review\n");
  write(join(root, "agteamos", "standards", "api", "README.md"), "# API\n");
  write(
    join(root, "agteamos", "standards", "index.meta.yml"),
    "api:\n  status: done\n",
  );
  write(join(root, "agteamos", "specs", "billing.md"), "# Billing\n");
  write(join(root, "agteamos", "incidents", "runbooks", "billing.md"), "# Runbook\n");
  write(join(root, "agteamos", "security", "audit.md"), "# Audit\n");
  write(join(root, "agteamos", "devops", "SLO.md"), "# SLO\n");
  write(join(root, "agteamos", "devops", "deploy_log.csv"), "date,status\n2026-09-25,ok\n");
  write(join(root, "agteamos", "dashboard.html"), "<!doctype html><title>dashboard</title>");
}

function createLegacyProject(root) {
  write(join(root, "agteamos", "platform.yml"), "repo_host: azure\ntracker: github\n");
  write(
    join(root, "agteamos", "changes", "legacy-1", "task.yml"),
    "id: legacy-1\ntitle: Legacy\nschema: lite\nstatus: pending\nbranch: feature/legacy\n",
  );
  write(
    join(root, "agteamos", "changes", "legacy-1", "progress.md"),
    "## Resumen (schema: lite)\nListo.\n\n## Test de regresión\nListo.\n\n## Next Action\nEmpezar.\n",
  );
}

function yamlPath(path) {
  return `"${path.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function assertDiagnostic(snapshot, code) {
  assert(snapshot.diagnostics.some((item) => item.code === code), `falta diagnóstico ${code}`);
}

try {
  const alpha = join(testRoot, "alpha");
  const beta = join(testRoot, "beta");
  const missing = join(testRoot, "missing");
  createModernProject(alpha);
  createLegacyProject(beta);

  let aliasEntry = "";
  const alias = join(testRoot, "alpha-link");
  try {
    symlinkSync(alpha, alias, process.platform === "win32" ? "junction" : "dir");
    aliasEntry = `
  - name: Alpha Alias
    path: ${yamlPath(alias)}`;
  } catch {
    // La prueba de path duplicado cubre el mismo realpath cuando symlink no está permitido.
  }

  const registry = join(testRoot, "projects.yml");
  write(registry, `projects:
  - name: Alpha
    aliases: [billing]
    path: ${yamlPath(alpha)}
    last_active: 2026-09-25
  - name: Beta Legacy
    path: ${yamlPath(beta)}
  - name: Alpha Duplicate
    path: ${yamlPath(alpha)}
  - name: Missing
    path: ${yamlPath(missing)}${aliasEntry}
`);

  const now = "2026-09-25T13:30:00.000Z";
  const beforeAlpha = allFiles(alpha);
  const beforeBeta = allFiles(beta);
  const first = buildPortalSnapshot({ registryPath: registry, now });
  const second = buildPortalSnapshot({ registryPath: registry, now });
  assert.deepEqual(first, second, "el snapshot debe ser determinista");
  assert.equal(first.contract_version, "2");
  assert.equal(first.generated_at, now);
  assert.equal(first.summary.projects, 2);
  assert.equal(first.summary.active_changes, 2);
  assert.equal(first.summary.archived_changes, 2);
  assert.equal(first.summary.abandoned_changes, 1);
  assert.equal(first.summary.pending_backlog, 1);
  assert.ok(first.summary.estimated_context_tokens > 0);
  assert.equal(first.projects[0].context_budget.selected_tier, 1);
  assert.equal(
    first.projects[0].context_budget.estimated_tokens,
    Math.ceil(first.projects[0].context_budget.bytes / 4),
  );
  assertDiagnostic(first, "PROJECT_ROOT_DUPLICATE");
  assertDiagnostic(first, "PROJECT_ROOT_UNAVAILABLE");
  assert(first.projects.some((project) => (
    project.registry.name === "Beta Legacy"
    && project.diagnostics.some((diagnostic) => diagnostic.code === "ONBOARDING_MISSING")
  )));

  const serialized = JSON.stringify(first);
  assert(!serialized.includes("ULTRA_SECRET_TOKEN"));
  assert(!serialized.includes("private@example.test"));
  assert(!serialized.includes("backlog-owner@example.test"));
  assert(!serialized.includes("BACKLOG_SECRET"));
  assert(!serialized.includes("api_token"));
  assert.equal(first.projects[0].platform.tracker, "azure_boards");
  assert.equal(first.projects[0].changes[0].tracker_result.status, "verified");
  assert(first.projects[0].archive.some((change) => (
    change.id === "GH-9" && change.tracker_result.status === "partial"
  )));
  assert(first.projects[0].archive.some((change) => (
    change.status === "abandoned"
    && change.abandon_record_present === true
    && change.risk === "high"
  )));
  assert(!serialized.includes("TRACKER_RAW_SHOULD_NOT_LEAK"));

  const html = renderPortal(first);
  assert.equal(html, renderPortal(second), "el HTML debe ser determinista");
  assert(html.includes("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"));
  assert(!html.includes('<script>alert("xss")</script>'));
  assert(!html.includes("ULTRA_SECRET_TOKEN"));
  assert(!html.includes("private@example.test"));
  assert(html.includes("file://"));
  assert(html.includes("Content-Security-Policy"));
  assert(html.includes("Tracker receipt"));
  assert(html.includes("verified"));
  assert(html.includes("partial"));
  assert(html.includes("Abandonados"));
  assert(html.includes("tokens; no host telemetry"));

  const output = join(testRoot, "output", "portal.html");
  mkdirSync(dirname(output), { recursive: true });
  const cli = spawnSync(process.execPath, [
    join(pluginRoot, "scripts", "agteamos-portal.mjs"),
    "--projects", registry,
    "--out", output,
    "--now", now,
  ], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(readFileSync(output, "utf8"), html);
  assert.deepEqual(allFiles(alpha), beforeAlpha, "portal mutó el proyecto Alpha");
  assert.deepEqual(allFiles(beta), beforeBeta, "portal mutó el proyecto Beta");

  const dashboardCli = spawnSync(process.execPath, [
    join(pluginRoot, "scripts", "agteamos-dashboard.mjs"),
    "--project",
    "--root", alpha,
    "--now", now,
  ], { encoding: "utf8" });
  assert.equal(dashboardCli.status, 0, dashboardCli.stderr);
  const dashboard = readFileSync(join(alpha, "agteamos", "dashboard.html"), "utf8");
  assert(dashboard.includes("alpha"));
  assert(readFileSync(
    join(alpha, "agteamos", "changes", "AB-45-export", "report.html"),
    "utf8",
  ).includes("../../dashboard.html"));
  assert(readFileSync(
    join(
      alpha,
      "agteamos",
      "changes",
      "archive",
      "2026-09-24-GH-9-done",
      "report.html",
    ),
    "utf8",
  ).includes("../../../dashboard.html"));

  const beforePulse = allFiles(alpha);
  const pulseCli = spawnSync(process.execPath, [
    join(pluginRoot, "scripts", "agteamos-dashboard.mjs"),
    "--pulse",
    "--root", alpha,
  ], { encoding: "utf8" });
  assert.equal(pulseCli.status, 0, pulseCli.stderr);
  assert(pulseCli.stdout.includes("AgTeamOS pulse:"));
  assert(pulseCli.stdout.includes("tokens estimados"));
  assert(pulseCli.stdout.includes("no telemetría del host"));
  assert.deepEqual(allFiles(alpha), beforePulse, "pulse dejó de ser read-only");

  const malformed = join(testRoot, "malformed.yml");
  write(malformed, "projects:\n  - name: Sin path\n");
  const malformedSnapshot = buildPortalSnapshot({ registryPath: malformed, now });
  assertDiagnostic(malformedSnapshot, "PROJECTS_REGISTRY_INVALID");
  assert.equal(malformedSnapshot.projects.length, 0);

  assert.equal(realpathSync(alpha), first.projects[0].project.root);
  console.log("Portal verification OK (multi-project, security, determinism, read-only)");
} finally {
  rmSync(testRoot, { recursive: true, force: true });
}
