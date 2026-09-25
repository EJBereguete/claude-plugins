#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseOnboarding,
  parseTopLevelYaml,
  portablePath,
} from "./lib/project-state.mjs";

function parseArguments(argv) {
  const options = {
    root: process.cwd(),
    json: false,
    now: new Date().toISOString(),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      options.json = true;
    } else if (["--root", "--now"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requiere un valor`);
      }
      options[argument.slice(2)] = value;
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`argumento desconocido: ${argument}`);
    }
  }
  options.root = resolve(options.root);
  if (Number.isNaN(Date.parse(options.now))) {
    throw new Error("--now requiere una fecha ISO válida");
  }
  return options;
}

function usage() {
  return [
    "Uso: node scripts/agteamos-release-inventory.mjs [--root <project>] [--now <iso>] [--json]",
    "",
    "Inventario read-only para agteamos-knowledge --maintain --release.",
  ].join("\n");
}

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function filesRecursively(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesRecursively(path));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort();
}

function directoriesRecursively(directory) {
  if (!existsSync(directory)) return [];
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(directory, entry.name);
    result.push(path, ...directoriesRecursively(path));
  }
  return result.sort();
}

function pathFrom(root, path) {
  return portablePath(relative(root, path)) || ".";
}

function safeSlug(value) {
  return String(value || "change")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "change";
}

function parseStandardsStale(path) {
  const content = read(path);
  if (content === null) return [];
  const stale = [];
  let topic = null;
  for (const line of content.split(/\r?\n/)) {
    const topicMatch = line.match(/^([\w-]+)\s*:\s*$/);
    if (topicMatch) {
      topic = topicMatch[1];
      continue;
    }
    if (topic && /^\s+status\s*:\s*stale\s*(?:#.*)?$/i.test(line)) {
      stale.push(topic);
    }
  }
  return stale.sort();
}

function protectedPath(path) {
  return [
    "agteamos/specs/",
    "agteamos/decisions/",
    "agteamos/architecture/adr/",
  ].some((prefix) => path.startsWith(prefix))
    || /\/(?:tracker-result|abandon-record|verify-report)\.md$/i.test(path);
}

export function buildReleaseInventory(root, now = new Date().toISOString()) {
  const agteamos = join(root, "agteamos");
  if (!existsSync(agteamos) || !statSync(agteamos).isDirectory()) {
    return {
      inventory_version: "1",
      generated_at: now,
      root,
      read_only: true,
      actions: [],
      blocked: [{
        path: "agteamos",
        reason: "No existe agteamos/; usar --init, no release maintenance",
      }],
      review_only: [],
      preserved: [],
    };
  }

  const actions = [];
  const blocked = [];
  const reviewOnly = [];
  const preserved = [];
  const changes = join(agteamos, "changes");
  const archive = join(changes, "archive");
  const date = now.slice(0, 10);

  if (existsSync(changes)) {
    const activeDirectories = readdirSync(changes, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "archive")
      .map((entry) => join(changes, entry.name))
      .sort();
    for (const directory of activeDirectories) {
      const taskPath = ["task.yml", "task.yaml"]
        .map((name) => join(directory, name))
        .find((path) => existsSync(path));
      const relativeDirectory = pathFrom(root, directory);
      if (!taskPath) {
        preserved.push({
          path: relativeDirectory,
          reason: "Directorio sin task.yml; posible trabajo parcial, no tocar",
        });
        continue;
      }
      const task = parseTopLevelYaml(read(taskPath) || "");
      const validDone = task.status === "done"
        && ["DONE", "ARCHIVE"].includes(String(task.phase || "").toUpperCase())
        && task.merge_confirmed === true
        && task.ticket_reconciled === true;
      const validAbandoned = task.status === "abandoned"
        && String(task.phase || "").toUpperCase() === "ABANDONED"
        && task.ticket_reconciled === true
        && existsSync(join(directory, "abandon-record.md"));
      if (validDone || validAbandoned) {
        const suffix = validAbandoned ? "-abandoned" : "";
        const name = `${date}-${safeSlug(task.id || basename(directory))}-${safeSlug(
          basename(directory).replace(/^(?:tmp-)?[^-]+-/, ""),
        )}${suffix}`;
        const targetPath = join(archive, name);
        if (existsSync(targetPath)) {
          blocked.push({
            path: relativeDirectory,
            reason: `Target de archive ya existe: ${pathFrom(root, targetPath)}`,
          });
          continue;
        }
        actions.push({
          kind: "archive-stranded-change",
          path: relativeDirectory,
          target: pathFrom(root, targetPath),
          reason: validAbandoned
            ? "Cambio ABANDONED válido aún fuera de archive"
            : "Cambio DONE con merge/ticket verificados aún fuera de archive",
          requires_approval: true,
        });
      } else if (["done", "abandoned"].includes(task.status)) {
        blocked.push({
          path: relativeDirectory,
          reason: "Estado final sin gates/record suficientes; preservar y reparar primero",
        });
      } else {
        preserved.push({
          path: relativeDirectory,
          reason: "Cambio activo o parcial; fuera del scope de limpieza",
        });
      }
    }
  }

  const onboardingPath = join(agteamos, "onboarding.yml");
  const onboardingContent = read(onboardingPath);
  if (onboardingContent !== null) {
    for (const item of parseOnboarding(onboardingContent).items) {
      if (item.status !== "stale" || !item.path) continue;
      const absoluteTarget = item.path.startsWith("agteamos/")
        ? resolve(root, ...item.path.split("/"))
        : resolve(agteamos, ...item.path.split("/"));
      if (
        absoluteTarget !== root
        && !absoluteTarget.startsWith(`${root}${sep}`)
      ) {
        blocked.push({
          path: item.path,
          reason: `onboarding ${item.id} apunta fuera del project root`,
        });
        continue;
      }
      actions.push({
        kind: "refresh-stale-artifact",
        path: pathFrom(root, absoluteTarget),
        reason: `onboarding.yml marca ${item.id} como stale`,
        requires_approval: true,
      });
    }
  }

  const standardsMeta = join(agteamos, "standards", "index.meta.yml");
  for (const topic of parseStandardsStale(standardsMeta)) {
    actions.push({
      kind: "rediscover-stale-standard",
      path: `agteamos/standards/${topic}`,
      reason: `index.meta.yml marca ${topic} como stale`,
      requires_approval: true,
    });
  }

  const dashboard = join(agteamos, "dashboard.html");
  if (existsSync(dashboard)) {
    actions.push({
      kind: "regenerate-derived-html",
      path: pathFrom(root, dashboard),
      reason: "Dashboard derivado presente; regenerar desde fuentes actuales",
      requires_approval: true,
    });
  }
  for (const path of filesRecursively(changes).filter(
    (candidate) => basename(candidate).toLowerCase() === "report.html",
  )) {
    actions.push({
      kind: "regenerate-derived-html",
      path: pathFrom(root, path),
      reason: "Reporte HTML derivado; regenerar desde estado durable",
      requires_approval: true,
    });
  }

  const cache = join(agteamos, ".cache");
  for (const path of filesRecursively(cache)) {
    actions.push({
      kind: "remove-cache-file",
      path: pathFrom(root, path),
      reason: "Cache regenerable y no commiteable",
      requires_approval: true,
    });
  }

  for (const path of filesRecursively(agteamos).filter(
    (candidate) => /\.(?:tmp|bak|orig)$/i.test(candidate),
  )) {
    const portable = pathFrom(root, path);
    if (protectedPath(portable)) {
      preserved.push({
        path: portable,
        reason: "Path protegido; nunca limpiar automáticamente",
      });
    } else {
      reviewOnly.push({
        path: portable,
        reason: "Posible artefacto huérfano; requiere clasificación humana",
      });
    }
  }

  for (const directory of directoriesRecursively(agteamos)) {
    if (readdirSync(directory).length !== 0) continue;
    const portable = `${pathFrom(root, directory)}/`;
    if (
      portable.startsWith("agteamos/changes/")
      || portable.startsWith("agteamos/specs/")
      || portable.startsWith("agteamos/decisions/")
      || portable.startsWith("agteamos/architecture/adr/")
    ) {
      preserved.push({
        path: portable,
        reason: "Directorio protegido o potencial trabajo parcial",
      });
    } else {
      reviewOnly.push({
        path: portable,
        reason: "Directorio vacío; no se elimina sin aprobación y contexto",
      });
    }
  }

  actions.sort((left, right) => (
    left.path.localeCompare(right.path)
    || left.kind.localeCompare(right.kind)
  ));
  actions.forEach((action, index) => {
    action.id = `RC-${String(index + 1).padStart(3, "0")}`;
  });
  blocked.sort((left, right) => left.path.localeCompare(right.path));
  reviewOnly.sort((left, right) => left.path.localeCompare(right.path));
  preserved.sort((left, right) => left.path.localeCompare(right.path));
  return {
    inventory_version: "1",
    generated_at: now,
    root,
    read_only: true,
    summary: {
      proposed_actions: actions.length,
      blocked: blocked.length,
      review_only: reviewOnly.length,
      preserved: preserved.length,
    },
    actions,
    blocked,
    review_only: reviewOnly,
    preserved,
  };
}

function printHuman(inventory) {
  console.log("AgTeamOS release maintenance inventory (read-only)");
  console.log(
    `${inventory.actions.length} proposed, ${inventory.blocked.length} blocked, `
    + `${inventory.review_only.length} review-only`,
  );
  for (const action of inventory.actions) {
    console.log(
      `- ${action.id} ${action.kind}: ${action.path}`
      + `${action.target ? ` -> ${action.target}` : ""} (${action.reason})`,
    );
  }
  for (const item of inventory.blocked) {
    console.log(`- BLOCKED ${item.path}: ${item.reason}`);
  }
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
  const inventory = buildReleaseInventory(options.root, options.now);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  } else {
    printHuman(inventory);
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) main();
