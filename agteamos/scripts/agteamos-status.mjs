#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPluginResult,
  collectProjectState,
  emptyContextBudget,
  emptyOnboarding,
  initialSummary,
} from "./lib/project-state.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workflowPath = join(scriptDirectory, "..", "contracts", "workflow.json");
const layoutPath = join(
  scriptDirectory,
  "..",
  "contracts",
  "project-layout.json",
);
const contextBudgetPath = join(
  scriptDirectory,
  "..",
  "contracts",
  "context-budget.json",
);

function parseArguments(argv) {
  const options = {
    root: process.cwd(),
    json: false,
    contextBudget: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      options.json = true;
    } else if (argument === "--context-budget") {
      options.contextBudget = true;
    } else if (argument === "--root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--root requiere una ruta");
      }
      options.root = value;
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`argumento desconocido: ${argument}`);
    }
  }
  options.root = resolve(options.root);
  return options;
}

function usage() {
  return [
    "Uso: node scripts/agteamos-status.mjs [--root <project>] [--context-budget] [--json]",
    "",
    "Lee el estado durable de un proyecto consumidor sin escribir archivos.",
  ].join("\n");
}

function printHuman(result) {
  console.log(`AgTeamOS status (${result.project.mode})`);
  if (result.project.mode === "plugin") {
    console.log(result.diagnostics[0].message);
    return;
  }
  console.log(
    `${result.summary.total_changes} change(s), ${result.summary.blocked_changes} blocked`,
  );
  for (const change of result.changes) {
    console.log(
      `- ${change.id} [${change.status ?? "unknown"}] ${change.phase}`
      + `${change.blocked ? " BLOCKED" : ""}: ${change.title}`,
    );
    if (change.next_action) console.log(`  Next: ${change.next_action}`);
  }
  console.log(
    `Context budget Tier ${result.context_budget.selected_tier}: `
    + `${result.context_budget.bytes} UTF-8 bytes, `
    + `~${result.context_budget.estimated_tokens} estimated tokens`
    + `${result.context_budget.over_budget ? " OVER BUDGET" : ""}`,
  );
  console.log("  Estimate only; host context-window telemetry is unavailable.");
}

function missingRootResult(root, contract, contextBudgetContract) {
  return {
    contract_version: contract.contract_version,
    project: {
      root,
      name: basename(root),
      mode: "consumer",
      agteamos_path: "agteamos",
    },
    onboarding: emptyOnboarding(),
    changes: [],
    context_budget: emptyContextBudget(contextBudgetContract),
    summary: initialSummary(contract),
    diagnostics: [{
      code: "ROOT_MISSING",
      severity: "error",
      path: ".",
      message: "La ruta indicada por --root no existe o no es un directorio",
    }],
  };
}

function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exit(2);
  }
  if (options.help) {
    console.log(usage());
    return;
  }

  const rootExists = existsSync(options.root)
    && statSync(options.root).isDirectory();
  const pluginMode = rootExists
    && existsSync(join(options.root, ".claude-plugin", "plugin.json"));

  let contract;
  let layoutContract;
  let contextBudgetContract;
  try {
    contract = JSON.parse(readFileSync(workflowPath, "utf8"));
    layoutContract = JSON.parse(readFileSync(layoutPath, "utf8"));
    contextBudgetContract = JSON.parse(readFileSync(contextBudgetPath, "utf8"));
  } catch (error) {
    console.error(`No se pudieron leer los contratos: ${error.message}`);
    process.exit(1);
  }

  const result = !rootExists
    ? missingRootResult(options.root, contract, contextBudgetContract)
    : pluginMode
      ? buildPluginResult(options.root, contract, contextBudgetContract)
      : collectProjectState(
        options.root,
        contract,
        layoutContract,
        contextBudgetContract,
      );

  if (options.json) {
    const output = options.contextBudget ? result.context_budget : result;
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else if (options.contextBudget) {
    console.log(
      `AgTeamOS context budget Tier ${result.context_budget.selected_tier}: `
      + `${result.context_budget.bytes} UTF-8 bytes, `
      + `~${result.context_budget.estimated_tokens} estimated tokens`,
    );
    console.log("Estimate only; host context-window telemetry is unavailable.");
    for (const tier of result.context_budget.tiers) {
      console.log(
        `- Tier ${tier.tier}: ${tier.bytes}/${tier.budget_bytes} bytes, `
        + `~${tier.estimated_tokens} estimated tokens`,
      );
    }
  } else {
    printHuman(result);
  }
  if (!rootExists) process.exitCode = 1;
}

main();
