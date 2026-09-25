#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import process from "node:process";

function usage() {
  console.error(
    "Usage: node scripts/agteamos-analyze.mjs --change <change-dir> " +
      "[--stage preflight|verify] [--json]",
  );
}

function parseArgs(argv) {
  const options = { stage: "preflight", json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--change") options.change = argv[++index];
    else if (arg === "--stage") options.stage = argv[++index];
    else if (arg === "--json") options.json = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.change) throw new Error("--change is required");
  if (!["preflight", "verify"].includes(options.stage)) {
    throw new Error("--stage must be preflight or verify");
  }
  return options;
}

function read(path) {
  return readFileSync(path, "utf8");
}

function section(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^##\\s+${escaped}\\s*$`, "mi").exec(markdown);
  if (!match) return "";
  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const next = /^##\s+/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function isPlaceholder(value) {
  return /<[^>]+>|\[[^\]]*(nombre|path|archivo|valor|texto)[^\]]*\]/i.test(
    value,
  );
}

function parseRequirements(markdown) {
  const body = section(markdown, "Requirements (RFC 2119)");
  const requirements = [];
  const linePattern =
    /^\s*-\s+\*\*(R\d+)\*\*:\s+(.+?\b(MUST|SHALL|SHOULD|MAY)\b.+)$/gim;
  for (const match of body.matchAll(linePattern)) {
    requirements.push({
      id: match[1].toUpperCase(),
      text: match[2].trim(),
      modal: match[3].toUpperCase(),
    });
  }

  const acceptance = section(markdown, "Acceptance Criteria");
  const acRefs = [...acceptance.matchAll(/\*\*(R\d+)\*\*/gi)].map((match) =>
    match[1].toUpperCase(),
  );
  return { requirements, acRefs };
}

function parseTasks(markdown) {
  const tasks = [];
  const taskPattern = /^\s*(\d+)\.\s+\[([ xX])\]\s+(.+)$/gm;
  const matches = [...markdown.matchAll(taskPattern)];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const end = matches[index + 1]?.index ?? markdown.length;
    const block = markdown.slice(match.index, end);
    const requirementRefs = [...block.matchAll(/\bR\d+\b/gi)].map((item) =>
      item[0].toUpperCase(),
    );
    const deltaRefs = [
      ...block.matchAll(/\b(ADDED|MODIFIED)\s*:\s*([^\]\n*]+)/gi),
    ].map((item) => ({
      section: item[1].toUpperCase(),
      name: item[2].trim(),
    }));
    const files = [...block.matchAll(/`([^`\r\n]+)`/g)]
      .map((item) => item[1].trim())
      .filter((item) => !item.startsWith("<"));
    tasks.push({
      number: Number(match[1]),
      completed: match[2].toLowerCase() === "x",
      text: match[3].trim(),
      requirementRefs: [...new Set(requirementRefs)],
      deltaRefs,
      files,
    });
  }
  return tasks;
}

function parseDelta(markdown) {
  const result = { ADDED: [], MODIFIED: [], REMOVED: [] };
  for (const kind of Object.keys(result)) {
    const body = section(markdown, `${kind} Requirements`);
    result[kind] = [...body.matchAll(/^### Requirement:\s*(.+?)\s*$/gim)].map(
      (match) => match[1].trim(),
    );
  }
  return result;
}

function designPaths(markdown) {
  const body = section(markdown, "Archivos");
  return [...body.matchAll(/`([^`\r\n]+)`/g)]
    .map((match) => match[1].trim())
    .filter((path) => path && !isPlaceholder(path));
}

function masterPath(root, deltaPath, markdown) {
  const declared = markdown.match(
    /^agteamos\/specs\/([^\s`]+\.md)\s*$/im,
  )?.[1];
  return resolve(root, "agteamos", "specs", declared ?? basename(deltaPath));
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    usage();
    console.error(error.message);
    process.exit(2);
  }

  const change = resolve(options.change);
  const root = resolve(change, "..", "..", "..");
  const diagnostics = [];
  const error = (code, file, message) =>
    diagnostics.push({ severity: "ERROR", code, file, message });
  const warning = (code, file, message) =>
    diagnostics.push({ severity: "WARNING", code, file, message });

  const required = ["task.yml", "requirements.md", "design.md", "tasks.md"];
  for (const name of required) {
    if (!existsSync(resolve(change, name))) {
      error("FILE_MISSING", name, `Missing required full-schema file: ${name}`);
    }
  }
  const deltaDir = resolve(change, "specs", "deltas");
  const deltaFiles = existsSync(deltaDir)
    ? readdirSync(deltaDir)
        .filter((name) => name.endsWith(".md"))
        .map((name) => resolve(deltaDir, name))
    : [];
  if (deltaFiles.length === 0) {
    error("DELTA_MISSING", "specs/deltas", "At least one domain delta is required");
  }

  if (diagnostics.some((item) => item.code === "FILE_MISSING")) {
    return finish(options, change, diagnostics);
  }

  const taskYml = read(resolve(change, "task.yml"));
  if (!/^schema:\s*full\s*$/im.test(taskYml)) {
    error("SCHEMA_NOT_FULL", "task.yml", "Semantic analysis requires schema: full");
  }

  const requirementsText = read(resolve(change, "requirements.md"));
  const designText = read(resolve(change, "design.md"));
  const tasksText = read(resolve(change, "tasks.md"));
  const { requirements, acRefs } = parseRequirements(requirementsText);
  const tasks = parseTasks(tasksText);
  const knownIds = new Set(requirements.map((item) => item.id));

  if (!section(requirementsText, "Objetivo de negocio").trim()) {
    error("GOAL_MISSING", "requirements.md", "Business objective is empty");
  }
  if (requirements.length === 0) {
    error(
      "REQUIREMENTS_MISSING",
      "requirements.md",
      "No canonical RFC 2119 requirements found",
    );
  }
  for (const requirement of requirements) {
    if (requirements.filter((item) => item.id === requirement.id).length > 1) {
      error(
        "REQUIREMENT_DUPLICATE",
        "requirements.md",
        `Duplicate requirement id ${requirement.id}`,
      );
    }
    if (!acRefs.includes(requirement.id)) {
      error(
        "REQUIREMENT_WITHOUT_AC",
        "requirements.md",
        `${requirement.id} has no acceptance criterion`,
      );
    }
    const covered = tasks.some((task) =>
      task.requirementRefs.includes(requirement.id),
    );
    if (!covered) {
      error(
        "REQUIREMENT_WITHOUT_TASK",
        "tasks.md",
        `${requirement.id} is not covered by any task`,
      );
    }
  }
  for (const id of acRefs) {
    if (!knownIds.has(id)) {
      error("AC_ORPHAN", "requirements.md", `Acceptance criterion cites unknown ${id}`);
    }
  }
  for (const task of tasks) {
    for (const id of task.requirementRefs) {
      if (!knownIds.has(id)) {
        error("TASK_REQUIREMENT_ORPHAN", "tasks.md", `Task ${task.number} cites unknown ${id}`);
      }
    }
    if (
      options.stage === "verify" &&
      !task.completed &&
      !/closure|verify|archive|merge/i.test(task.text)
    ) {
      error("TASK_INCOMPLETE", "tasks.md", `Task ${task.number} is incomplete`);
    }
  }

  const paths = designPaths(designText);
  if (paths.length === 0 && !/\bN\/A\b/i.test(section(designText, "Archivos"))) {
    error("DESIGN_PATHS_MISSING", "design.md", "No concrete file path or N/A in design");
  }
  const normalizedDesign = new Set(paths.map((path) => path.replaceAll("\\", "/")));
  for (const task of tasks) {
    for (const path of task.files) {
      const normalized = path.replaceAll("\\", "/");
      if (
        normalized.includes("/") &&
        !normalizedDesign.has(normalized) &&
        ![...normalizedDesign].some(
          (candidate) =>
            normalized.startsWith(`${candidate}/`) ||
            candidate.startsWith(`${normalized}/`),
        )
      ) {
        warning(
          "TASK_PATH_NOT_IN_DESIGN",
          "tasks.md",
          `Task ${task.number} cites ${path}, absent from design.md`,
        );
      }
    }
  }

  for (const deltaPath of deltaFiles) {
    const relativeDelta = deltaPath.slice(change.length + 1).replaceAll("\\", "/");
    const text = read(deltaPath);
    const delta = parseDelta(text);
    const noContractChange = /^## Sin cambios en la spec maestra\s*$/im.test(text);
    const changedCount = delta.ADDED.length + delta.MODIFIED.length + delta.REMOVED.length;
    if (changedCount === 0 && !noContractChange) {
      error("DELTA_EMPTY", relativeDelta, "Delta has no changes or explicit no-change declaration");
    }

    const master = masterPath(root, deltaPath, text);
    const masterNames = existsSync(master)
      ? new Set(
          [...read(master).matchAll(/^### Requirement:\s*(.+?)\s*$/gim)].map(
            (match) => match[1].trim(),
          ),
        )
      : new Set();

    for (const name of delta.ADDED) {
      if (masterNames.has(name)) {
        error("DELTA_ADDED_EXISTS", relativeDelta, `ADDED requirement already exists: ${name}`);
      }
    }
    for (const kind of ["MODIFIED", "REMOVED"]) {
      for (const name of delta[kind]) {
        if (!masterNames.has(name)) {
          error(
            "DELTA_ANCHOR_MISSING",
            relativeDelta,
            `${kind} requirement is absent from master spec: ${name}`,
          );
        }
      }
    }
    for (const kind of ["ADDED", "MODIFIED"]) {
      for (const name of delta[kind]) {
        const covering = tasks.filter((task) =>
          task.deltaRefs.some(
            (reference) =>
              reference.section === kind && reference.name === name,
          ),
        );
        if (covering.length === 0) {
          error(
            "DELTA_WITHOUT_TASK",
            "tasks.md",
            `${kind}: ${name} is not cited by any task`,
          );
        } else if (
          options.stage === "verify" &&
          !covering.some((task) => task.completed)
        ) {
          error(
            "DELTA_WITHOUT_COMPLETED_TASK",
            "tasks.md",
            `${kind}: ${name} has no completed task`,
          );
        }
      }
    }
  }

  return finish(options, change, diagnostics, {
    requirements: requirements.length,
    acceptance_criteria: acRefs.length,
    tasks: tasks.length,
    deltas: deltaFiles.length,
    design_paths: paths.length,
  });
}

function finish(options, change, diagnostics, counts = {}) {
  const result = {
    change,
    stage: options.stage,
    result: diagnostics.some((item) => item.severity === "ERROR")
      ? "FAIL"
      : diagnostics.length
        ? "PASS_WITH_WARNINGS"
        : "PASS",
    counts,
    diagnostics,
  };
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`AgTeamOS semantic ${options.stage}: ${result.result}`);
    for (const item of diagnostics) {
      console.log(`${item.severity} ${item.code} ${item.file}: ${item.message}`);
    }
  }
  if (result.result === "FAIL") process.exitCode = 1;
  return result;
}

main();
