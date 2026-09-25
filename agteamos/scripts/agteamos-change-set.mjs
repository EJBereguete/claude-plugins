#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OMITTED_KEYS = new Set([
  "approved_at",
  "captured_at",
  "presented_at",
]);

function parseArguments(argv) {
  const options = { command: argv[0], file: null, receipt: null, out: null, actor: null, json: false };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      options.json = true;
    } else if (["--file", "--receipt", "--out", "--actor"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requiere un valor`);
      options[argument.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`argumento desconocido: ${argument}`);
    }
  }
  if (!["fingerprint", "approve", "verify"].includes(options.command)) {
    throw new Error("comando requerido: fingerprint | approve | verify");
  }
  if (!options.file) throw new Error("--file es obligatorio");
  options.file = resolve(options.file);
  if (options.receipt) options.receipt = resolve(options.receipt);
  if (options.out) options.out = resolve(options.out);
  return options;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => !OMITTED_KEYS.has(key))
        .sort()
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

export function canonicalChangeSet(changeSet) {
  return JSON.stringify(canonicalValue(changeSet));
}

export function fingerprintChangeSet(changeSet) {
  return createHash("sha256")
    .update(canonicalChangeSet(changeSet), "utf8")
    .digest("hex");
}

function readJson(path, label) {
  if (!existsSync(path)) throw new Error(`${label} inexistente: ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${label} no es JSON válido: ${error.message}`);
  }
}

function validateChangeSet(changeSet) {
  if (!changeSet || typeof changeSet !== "object" || Array.isArray(changeSet)) {
    throw new Error("change set debe ser un objeto JSON");
  }
  if (typeof changeSet.provider !== "string" || !changeSet.provider) {
    throw new Error("change set requiere provider");
  }
  if (!Array.isArray(changeSet.operations) || changeSet.operations.length === 0) {
    throw new Error("change set requiere operations no vacío");
  }
  for (const [index, operation] of changeSet.operations.entries()) {
    if (!operation || typeof operation !== "object" || Array.isArray(operation)) {
      throw new Error(`operations[${index}] debe ser un objeto`);
    }
    const kind = operation.op ?? operation.operation ?? operation.kind;
    if (typeof kind !== "string" || !kind) {
      throw new Error(`operations[${index}] requiere op/operation/kind`);
    }
    if (kind === "attach") {
      validateAttachment(operation, index, changeSet.provider);
    }
  }
}

function validateAttachment(operation, index, provider) {
  const label = `operations[${index}] attach`;
  const source = operation.source;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error(`${label} requiere source`);
  }
  if (
    typeof source.path !== "string"
    || !source.path
    || isAbsolute(source.path)
    || source.path.split(/[\\/]+/).includes("..")
  ) {
    throw new Error(`${label} source.path debe ser relativo y sin traversal`);
  }
  if (!/^[a-f0-9]{64}$/i.test(source.sha256 || "")) {
    throw new Error(`${label} source.sha256 debe ser SHA-256`);
  }
  if (!Number.isSafeInteger(source.size) || source.size < 0) {
    throw new Error(`${label} source.size debe ser entero no negativo`);
  }
  if (typeof source.media_type !== "string" || !source.media_type) {
    throw new Error(`${label} source.media_type es obligatorio`);
  }
  if (
    typeof source.filename !== "string"
    || !source.filename
    || /[\\/]/.test(source.filename)
  ) {
    throw new Error(`${label} source.filename debe ser un nombre seguro`);
  }
  if (
    !Array.isArray(operation.targets)
    || operation.targets.length === 0
    || operation.targets.some((target) => typeof target !== "string" || !target)
  ) {
    throw new Error(`${label} requiere targets`);
  }
  if (!operation.relation || typeof operation.relation.type !== "string") {
    throw new Error(`${label} requiere relation.type`);
  }
  if (
    provider === "azure_devops"
    && operation.relation.type !== "AttachedFile"
  ) {
    throw new Error(`${label} Azure requiere relation.type AttachedFile`);
  }
}

function resultOutput(value, json) {
  if (json) process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  else if (typeof value === "string") process.stdout.write(`${value}\n`);
  else process.stdout.write(`${value.status}: ${value.fingerprint}\n`);
}

function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
    const changeSet = readJson(options.file, "change set");
    validateChangeSet(changeSet);
    const fingerprint = fingerprintChangeSet(changeSet);

    if (options.command === "fingerprint") {
      resultOutput(options.json ? { fingerprint } : fingerprint, options.json);
      return;
    }

    if (options.command === "approve") {
      if (!options.out) throw new Error("approve requiere --out");
      if (!options.actor) throw new Error("approve requiere --actor");
      const receipt = {
        contract_version: "1",
        status: "approved",
        fingerprint,
        actor: options.actor,
        approved_at: new Date().toISOString(),
        source: options.file,
      };
      mkdirSync(dirname(options.out), { recursive: true });
      writeFileSync(options.out, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
      resultOutput(receipt, options.json);
      return;
    }

    if (!options.receipt) throw new Error("verify requiere --receipt");
    const receipt = readJson(options.receipt, "approval receipt");
    if (receipt.status !== "approved") throw new Error("approval receipt no está approved");
    if (receipt.fingerprint !== fingerprint) {
      throw new Error(
        `fingerprint cambió: aprobado ${receipt.fingerprint}, actual ${fingerprint}`,
      );
    }
    resultOutput({ status: "verified", fingerprint }, options.json);
  } catch (error) {
    console.error(`AgTeamOS change-set gate: ${error.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
