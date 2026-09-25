#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectPortalProject,
  parseTopLevelYaml,
  portablePath,
} from "./lib/project-state.mjs";
import {
  buildPortalSnapshot,
  renderPortal,
} from "./agteamos-portal.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(scriptDirectory, "..");
const workflowPath = join(pluginRoot, "contracts", "workflow.json");
const layoutPath = join(pluginRoot, "contracts", "project-layout.json");
const contextBudgetPath = join(pluginRoot, "contracts", "context-budget.json");

function parseArguments(argv) {
  const options = {
    mode: "project",
    root: process.cwd(),
    projects: null,
    out: null,
    now: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (["--project", "--portal", "--pulse"].includes(argument)) {
      options.mode = argument.slice(2);
    } else if (["--root", "--projects", "--out", "--now"].includes(argument)) {
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
  if (options.projects) options.projects = resolve(options.projects);
  if (options.out) options.out = resolve(options.out);
  return options;
}

function usage() {
  return [
    "Uso: node scripts/agteamos-dashboard.mjs [modo] [opciones]",
    "",
    "  --project              Genera dashboard/reportes del proyecto (default)",
    "  --portal               Genera el portal multi-proyecto",
    "  --pulse                Imprime salud local; no escribe",
    "  --root <path>          Root del proyecto",
    "  --projects <path>      Registry para --portal",
    "  --out <path>           Salida portal opcional",
  ].join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function page(title, body) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; object-src 'none'; base-uri 'none';">
<title>${escapeHtml(title)}</title><style>
:root{color-scheme:dark;--bg:#0d1117;--surface:#161b22;--line:#30363d;--text:#e6edf3;--muted:#8b949e;--accent:#58a6ff;--danger:#ff7b72}
*{box-sizing:border-box}body{max-width:1180px;margin:auto;padding:28px;background:var(--bg);color:var(--text);font:14px/1.5 system-ui,sans-serif}
a{color:var(--accent)}h1{font-size:25px}.muted{color:var(--muted)}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:18px 0}
.stat,.panel{background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:15px}.stat strong{display:block;font-size:22px}.stat span{color:var(--muted)}
.panel{margin:12px 0}.table{overflow:auto}table{border-collapse:collapse;width:100%;min-width:680px}th,td{text-align:left;padding:9px;border-bottom:1px solid var(--line)}th{color:var(--muted)}
.pill{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:2px 7px}.danger{color:var(--danger)}input{width:100%;max-width:360px;padding:9px;background:var(--surface);border:1px solid var(--line);border-radius:7px;color:var(--text)}
</style></head><body>${body}</body></html>`;
}

function stat(label, value) {
  return `<div class="stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function changeDirectories(root) {
  const changes = join(root, "agteamos", "changes");
  if (!existsSync(changes)) return [];
  const directories = [];
  for (const entry of readdirSync(changes, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(changes, entry.name);
    if (entry.name === "archive") {
      for (const archived of readdirSync(path, { withFileTypes: true })) {
        if (archived.isDirectory()) directories.push(join(path, archived.name));
      }
    } else {
      directories.push(path);
    }
  }
  return directories.sort();
}

function taskRecord(directory) {
  const taskPath = ["task.yml", "task.yaml"]
    .map((name) => join(directory, name))
    .find((path) => existsSync(path));
  if (!taskPath) return null;
  const task = parseTopLevelYaml(readFileSync(taskPath, "utf8"));
  return {
    directory,
    id: task.id || directory.split(/[\\/]/).at(-1),
    title: task.title || directory.split(/[\\/]/).at(-1),
    status: task.status || "unknown",
    schema: task.schema || "unknown",
    risk: task.risk || "—",
    branch: task.branch || null,
    archived: portablePath(directory).includes("/changes/archive/"),
  };
}

function renderReport(record, change, generatedAt, dashboardHref) {
  const evidence = join(record.directory, "evidence");
  const evidenceCount = existsSync(evidence) && statSync(evidence).isDirectory()
    ? readdirSync(evidence, { withFileTypes: true }).filter((entry) => entry.isFile()).length
    : 0;
  const body = `<p><a href="${escapeHtml(dashboardHref)}">Volver al dashboard</a></p>
  <p class="muted">Snapshot local · ${escapeHtml(generatedAt)}</p>
  <h1>${escapeHtml(record.id)} · ${escapeHtml(record.title)}</h1>
  <div class="stats">
    ${stat("Estado", record.status)}
    ${stat("Schema", record.schema)}
    ${stat("Riesgo", record.risk)}
    ${stat("Fase", change?.phase || (record.archived ? "DONE" : "—"))}
    ${stat("Evidencias", evidenceCount)}
  </div>
  <div class="panel"><h2>Siguiente acción</h2><p>${escapeHtml(change?.next_action || "Sin acción pendiente registrada.")}</p></div>
  <div class="panel"><h2>Integridad</h2>
    <p>Branch: ${escapeHtml(record.branch || "—")}</p>
    <p>Artefactos faltantes: ${escapeHtml(change?.missing_artifacts?.join(", ") || "ninguno detectado")}</p>
    <p>Verify report: ${existsSync(join(record.directory, "verify-report.md")) ? "disponible" : "—"}</p>
  </div>`;
  return page(`${record.id} · ${record.title}`, body);
}

function relativeReport(root, record) {
  return portablePath(relative(join(root, "agteamos"), join(record.directory, "report.html")));
}

function renderProjectDashboard(project, records, generatedAt) {
  const changesById = new Map(project.changes.map((change) => [String(change.id), change]));
  const rows = records.map((record) => {
    const change = changesById.get(String(record.id));
    const blocked = Boolean(change?.blocked);
    return `<tr data-search="${escapeHtml(
      `${record.id} ${record.title} ${record.status}`.toLowerCase(),
    )}"><td><a href="${escapeHtml(relativeReport(project.project.root, record))}">${escapeHtml(record.id)}</a></td>
      <td>${escapeHtml(record.title)}</td><td><span class="pill ${blocked ? "danger" : ""}">${escapeHtml(record.status)}</span></td>
      <td>${escapeHtml(change?.phase || (record.archived ? "DONE" : "—"))}</td>
      <td>${escapeHtml(record.risk)}</td>
      <td>${record.archived ? "sí" : "no"}</td></tr>`;
  }).join("");
  const body = `<p class="muted">Snapshot local · ${escapeHtml(generatedAt)}</p>
  <h1>${escapeHtml(project.registry.name)}</h1>
  <p class="muted">${escapeHtml(project.project.root)}</p>
  <div class="stats">
    ${stat("Activos", project.changes.length)}
    ${stat("Bloqueados", project.summary.blocked_changes)}
    ${stat("Backlog", project.backlog.items.length)}
    ${stat("Archivados", project.archive.length)}
    ${stat(
    `Contexto Tier ${project.context_budget.selected_tier}`,
    `~${project.context_budget.estimated_tokens} tokens estimados`,
  )}
  </div>
  <p class="muted">Contexto: ${project.context_budget.bytes} UTF-8 bytes;
  estimación ceil(bytes/4), no telemetría del host.</p>
  <input id="filter" type="search" placeholder="Filtrar tareas">
  <div class="panel table"><table><thead><tr><th>ID</th><th>Título</th><th>Estado</th><th>Fase</th><th>Riesgo</th><th>Archivado</th></tr></thead>
  <tbody>${rows}</tbody></table></div>
  <script>(()=>{const f=document.getElementById('filter');f.addEventListener('input',()=>{const q=f.value.toLowerCase();document.querySelectorAll('tbody tr').forEach(r=>r.hidden=q&&!r.dataset.search.includes(q));});})();</script>`;
  return page(`${project.registry.name} · AgTeamOS`, body);
}

function generateProject(options) {
  const contract = JSON.parse(readFileSync(workflowPath, "utf8"));
  const layoutContract = JSON.parse(readFileSync(layoutPath, "utf8"));
  const contextBudgetContract = JSON.parse(
    readFileSync(contextBudgetPath, "utf8"),
  );
  const project = collectPortalProject(
    options.root,
    contract,
    layoutContract,
    { name: options.root.split(/[\\/]/).at(-1) },
    contextBudgetContract,
  );
  const generatedAt = options.now || new Date().toISOString();
  const records = changeDirectories(options.root).map(taskRecord).filter(Boolean);
  const changesById = new Map(project.changes.map((change) => [String(change.id), change]));
  const dashboardPath = join(options.root, "agteamos", "dashboard.html");
  for (const record of records) {
    const reportPath = join(record.directory, "report.html");
    const dashboardHref = portablePath(relative(dirname(reportPath), dashboardPath));
    writeFileSync(
      reportPath,
      renderReport(
        record,
        changesById.get(String(record.id)),
        generatedAt,
        dashboardHref,
      ),
      "utf8",
    );
  }
  writeFileSync(
    dashboardPath,
    renderProjectDashboard(project, records, generatedAt),
    "utf8",
  );
  console.log(`AgTeamOS dashboard: ${dashboardPath}`);
}

function generatePortal(options) {
  const home = join(homedir(), ".claude", "agteamos");
  const registryPath = options.projects || join(home, "projects.yml");
  const out = options.out || join(home, "portal.html");
  const snapshot = buildPortalSnapshot({
    registryPath,
    now: options.now || new Date().toISOString(),
  });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderPortal(snapshot), "utf8");
  console.log(`AgTeamOS portal: ${out}`);
}

function printPulse(options) {
  const contract = JSON.parse(readFileSync(workflowPath, "utf8"));
  const layoutContract = JSON.parse(readFileSync(layoutPath, "utf8"));
  const contextBudgetContract = JSON.parse(
    readFileSync(contextBudgetPath, "utf8"),
  );
  const project = collectPortalProject(
    options.root,
    contract,
    layoutContract,
    { name: options.root.split(/[\\/]/).at(-1) },
    contextBudgetContract,
  );
  const pending = (project.onboarding.counts.pending || 0)
    + (project.onboarding.counts.candidate || 0)
    + (project.onboarding.counts.stale || 0);
  console.log(`AgTeamOS pulse: ${project.registry.name}`);
  console.log(`- cambios: ${project.changes.length} (${project.summary.blocked_changes} bloqueados)`);
  console.log(`- backlog: ${project.backlog.items.length}`);
  console.log(`- onboarding pendiente/stale: ${pending}`);
  console.log(`- standards: ${project.health.standards.topics}`);
  console.log(`- specs: ${project.health.specs.documents}`);
  console.log(
    `- contexto Tier ${project.context_budget.selected_tier}: `
    + `${project.context_budget.bytes} bytes, `
    + `~${project.context_budget.estimated_tokens} tokens estimados`
    + `${project.context_budget.over_budget ? " (SOBRE PRESUPUESTO)" : ""}`,
  );
  console.log("- contexto es estimación ceil(bytes/4), no telemetría del host");
  console.log(`- incidentes: ${Object.values(project.health.incidents).reduce((a, b) => a + b, 0)}`);
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
  if (options.mode === "portal") generatePortal(options);
  else if (options.mode === "pulse") printPulse(options);
  else generateProject(options);
}

main();
