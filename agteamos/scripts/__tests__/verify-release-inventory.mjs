#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildReleaseInventory } from "../agteamos-release-inventory.mjs";

const root = mkdtempSync(join(tmpdir(), "agteamos-release-inventory-"));
const script = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "agteamos-release-inventory.mjs",
);

function write(relativePath, content) {
  const path = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function snapshot(directory) {
  const result = {};
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) visit(path);
      else {
        result[relative(directory, path).replaceAll("\\", "/")]
          = readFileSync(path, "utf8");
      }
    }
  };
  visit(directory);
  return result;
}

try {
  write("agteamos/onboarding.yml", `mode: lazy
artifacts:
  human_docs.readme:
    path: ../README.md
    status: stale
`);
  write(
    "agteamos/standards/index.meta.yml",
    "testing:\n  status: stale\n",
  );
  write("agteamos/dashboard.html", "<html>derived</html>");
  write("agteamos/.cache/work-items/draft.json", "{}");
  write("agteamos/specs/protected.tmp", "preserve");
  write("agteamos/orphan.bak", "review");

  write("agteamos/changes/42-done/task.yml", `id: "42"
status: done
phase: DONE
merge_confirmed: true
ticket_reconciled: true
`);
  write("agteamos/changes/42-done/tracker-result.md", "# receipt\n");
  write("agteamos/changes/42-done/report.html", "<html>report</html>");

  write("agteamos/changes/43-abandoned/task.yml", `id: "43"
status: abandoned
phase: ABANDONED
merge_confirmed: false
ticket_reconciled: true
`);
  write(
    "agteamos/changes/43-abandoned/abandon-record.md",
    "# Abandon Record\n",
  );

  write("agteamos/changes/44-invalid/task.yml", `id: "44"
status: done
phase: DONE
merge_confirmed: false
ticket_reconciled: true
`);
  write("agteamos/changes/45-active/task.yml", `id: "45"
status: in_progress
phase: IMPLEMENT
`);

  const now = "2026-09-25T12:00:00.000Z";
  const before = snapshot(root);
  const first = buildReleaseInventory(root, now);
  const second = buildReleaseInventory(root, now);
  assert.deepEqual(first, second, "inventario no determinista");
  assert.deepEqual(snapshot(root), before, "inventario mutó el proyecto");
  assert.equal(first.read_only, true);

  const byPath = new Map(first.actions.map((action) => [action.path, action]));
  assert.equal(
    byPath.get("agteamos/changes/42-done").kind,
    "archive-stranded-change",
  );
  assert.match(
    byPath.get("agteamos/changes/43-abandoned").target,
    /-abandoned$/,
  );
  assert.equal(
    byPath.get("agteamos/.cache/work-items/draft.json").kind,
    "remove-cache-file",
  );
  assert.equal(
    byPath.get("README.md").kind,
    "refresh-stale-artifact",
  );
  assert.equal(
    byPath.get("agteamos/standards/testing").kind,
    "rediscover-stale-standard",
  );
  assert(first.blocked.some((item) => (
    item.path === "agteamos/changes/44-invalid"
  )));
  assert(first.preserved.some((item) => (
    item.path === "agteamos/changes/45-active"
  )));
  assert(first.preserved.some((item) => (
    item.path === "agteamos/specs/protected.tmp"
  )));
  assert(first.review_only.some((item) => (
    item.path === "agteamos/orphan.bak"
  )));
  assert(!first.actions.some((action) => (
    action.path.includes("tracker-result")
    || action.path.includes("abandon-record")
    || action.path.startsWith("agteamos/specs/")
  )));

  const cli = spawnSync(process.execPath, [
    script,
    "--root", root,
    "--now", now,
    "--json",
  ], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout), first);
  assert.deepEqual(snapshot(root), before, "CLI inventory mutó el proyecto");
  console.log("Release inventory verification OK (dry-run, preservation, read-only)");
} finally {
  rmSync(root, { recursive: true, force: true });
}
