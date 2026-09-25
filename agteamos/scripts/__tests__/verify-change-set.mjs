#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fingerprintChangeSet } from "../agteamos-change-set.mjs";

const root = mkdtempSync(join(tmpdir(), "agteamos-change-set-"));
const script = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "agteamos-change-set.mjs",
);

function run(...arguments_) {
  return spawnSync(process.execPath, [script, ...arguments_], { encoding: "utf8" });
}

try {
  const draftPath = join(root, "draft.json");
  const reorderedPath = join(root, "reordered.json");
  const receiptPath = join(root, "approval.json");
  const draft = {
    provider: "azure_devops",
    target: { project: "Billing", team: "API" },
    captured_at: "ignored",
    operations: [
      { op: "create", temp_id: "WI-1", fields: { title: "Story", priority: 2 } },
      { op: "link", child: "WI-2", parent: "WI-1" },
      {
        operation: "attach",
        source: {
          path: "agteamos/changes/42/specs/design.md",
          sha256: "a".repeat(64),
          size: 512,
          media_type: "text/markdown",
          filename: "design.md",
        },
        targets: ["WI-1", "WI-2"],
        relation: { type: "AttachedFile", comment: "Approved design" },
      },
    ],
  };
  writeFileSync(draftPath, JSON.stringify(draft), "utf8");
  writeFileSync(
    reorderedPath,
    JSON.stringify({
      operations: draft.operations,
      captured_at: "also ignored",
      target: { team: "API", project: "Billing" },
      provider: "azure_devops",
    }),
    "utf8",
  );

  const first = run("fingerprint", "--file", draftPath);
  const second = run("fingerprint", "--file", reorderedPath);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout.trim(), second.stdout.trim());
  assert.equal(first.stdout.trim(), fingerprintChangeSet(draft));

  const approve = run(
    "approve",
    "--file", draftPath,
    "--out", receiptPath,
    "--actor", "product-owner",
    "--json",
  );
  assert.equal(approve.status, 0, approve.stderr);
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  assert.equal(receipt.status, "approved");
  assert.equal(receipt.fingerprint, first.stdout.trim());

  const verify = run(
    "verify",
    "--file", draftPath,
    "--receipt", receiptPath,
    "--json",
  );
  assert.equal(verify.status, 0, verify.stderr);
  assert.equal(JSON.parse(verify.stdout).status, "verified");

  draft.operations[0].fields.priority = 1;
  writeFileSync(draftPath, JSON.stringify(draft), "utf8");
  const changed = run(
    "verify",
    "--file", draftPath,
    "--receipt", receiptPath,
  );
  assert.equal(changed.status, 1);
  assert.match(changed.stderr, /fingerprint cambió/);

  draft.operations[0].fields.priority = 2;
  draft.operations[2].source.sha256 = "b".repeat(64);
  writeFileSync(draftPath, JSON.stringify(draft), "utf8");
  const attachmentChanged = run(
    "verify",
    "--file", draftPath,
    "--receipt", receiptPath,
  );
  assert.equal(attachmentChanged.status, 1);
  assert.match(attachmentChanged.stderr, /fingerprint cambió/);

  draft.operations[2].source.path = "../secret.txt";
  writeFileSync(draftPath, JSON.stringify(draft), "utf8");
  const invalidAttachment = run("fingerprint", "--file", draftPath);
  assert.equal(invalidAttachment.status, 1);
  assert.match(invalidAttachment.stderr, /relativo y sin traversal/);

  console.log(
    "Change-set verification OK (canonical, approval, attachments, traversal)",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
