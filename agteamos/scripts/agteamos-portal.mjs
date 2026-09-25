#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { collectPortalProject } from "./lib/project-state.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(scriptDirectory, "..");
const workflowPath = join(pluginRoot, "contracts", "workflow.json");
const layoutPath = join(pluginRoot, "contracts", "project-layout.json");
const portalContractPath = join(pluginRoot, "contracts", "portal.json");
const contextBudgetPath = join(pluginRoot, "contracts", "context-budget.json");
const defaultHome = join(homedir(), ".claude", "agteamos");

function parseArguments(argv) {
  const options = {
    projects: join(defaultHome, "projects.yml"),
    out: join(defaultHome, "portal.html"),
    json: false,
    now: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      options.json = true;
    } else if (["--projects", "--out", "--now"].includes(argument)) {
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
  options.projects = resolve(options.projects);
  options.out = resolve(options.out);
  if (options.now && Number.isNaN(Date.parse(options.now))) {
    throw new Error("--now requiere una fecha ISO válida");
  }
  return options;
}

function usage() {
  return [
    "Uso: node scripts/agteamos-portal.mjs [opciones]",
    "",
    "  --projects <path>  Registry projects.yml",
    "  --out <path>       HTML de salida",
    "  --json             Emite snapshot JSON y no escribe",
  ].join("\n");
}

function stripComment(value) {
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if ((char === '"' || char === "'") && value[index - 1] !== "\\") {
      quote = quote === char ? null : quote || char;
    } else if (char === "#" && quote === null) {
      return value.slice(0, index).trim();
    }
  }
  return value.trim();
}

function scalar(value) {
  const clean = stripComment(value);
  if (
    clean.length >= 2
    && ((clean.startsWith('"') && clean.endsWith('"'))
      || (clean.startsWith("'") && clean.endsWith("'")))
  ) {
    return clean.slice(1, -1);
  }
  if (clean === "true") return true;
  if (clean === "false") return false;
  if (clean === "null" || clean === "~") return null;
  if (clean.startsWith("[") && clean.endsWith("]")) {
    return clean
      .slice(1, -1)
      .split(",")
      .map((item) => scalar(item.trim()))
      .filter(Boolean);
  }
  return clean;
}

export function parseProjectsRegistry(content) {
  const projects = [];
  let current = null;
  for (const line of content.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const item = line.match(/^\s*-\s+([\w-]+)\s*:\s*(.*?)\s*$/);
    if (item) {
      if (current) projects.push(current);
      current = { [item[1]]: scalar(item[2]) };
      continue;
    }
    const field = line.match(/^\s+([\w-]+)\s*:\s*(.*?)\s*$/);
    if (field && current) current[field[1]] = scalar(field[2]);
  }
  if (current) projects.push(current);
  const invalid = projects.find(
    (project) => typeof project.path !== "string" || !project.path.trim(),
  );
  if (invalid) {
    throw new Error(
      `Entrada de proyecto sin path: ${invalid.name || "(sin nombre)"}`,
    );
  }
  return projects;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function registeredRoot(entry) {
  const candidate = isAbsolute(entry.path)
    ? resolve(entry.path)
    : resolve(dirname(entry.registry_path), entry.path);
  if (!existsSync(candidate) || !statSync(candidate).isDirectory()) {
    throw new Error("root inexistente o no es directorio");
  }
  const canonical = realpathSync(candidate);
  const agteamos = join(canonical, "agteamos");
  if (!existsSync(agteamos) || !statSync(agteamos).isDirectory()) {
    throw new Error("el root no contiene agteamos/");
  }
  return canonical;
}

function pendingBacklog(items) {
  return items.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return !["done", "closed", "cerrado", "completado", "en-ticket"].includes(status);
  }).length;
}

export function buildPortalSnapshot({
  registryPath,
  now = new Date().toISOString(),
}) {
  const contract = readJson(workflowPath);
  const layoutContract = readJson(layoutPath);
  const portalContract = readJson(portalContractPath);
  const contextBudgetContract = readJson(contextBudgetPath);
  const diagnostics = [];
  let entries = [];

  if (!existsSync(registryPath)) {
    diagnostics.push({
      code: "PROJECTS_REGISTRY_MISSING",
      severity: "warning",
      project: null,
      message: `No existe ${registryPath}`,
    });
  } else {
    try {
      entries = parseProjectsRegistry(readFileSync(registryPath, "utf8"));
    } catch (error) {
      diagnostics.push({
        code: "PROJECTS_REGISTRY_INVALID",
        severity: "error",
        project: null,
        message: error.message,
      });
    }
  }

  const projects = [];
  const seenRoots = new Set();
  for (const entry of entries) {
    try {
      const root = registeredRoot({ ...entry, registry_path: registryPath });
      if (seenRoots.has(root)) {
        diagnostics.push({
          code: "PROJECT_ROOT_DUPLICATE",
          severity: "warning",
          project: entry.name || root,
          message: "El mismo root aparece más de una vez; se conservó la primera entrada",
        });
        continue;
      }
      seenRoots.add(root);
      projects.push(collectPortalProject(
        root,
        contract,
        layoutContract,
        entry,
        contextBudgetContract,
      ));
    } catch (error) {
      diagnostics.push({
        code: "PROJECT_ROOT_UNAVAILABLE",
        severity: "warning",
        project: entry.name || null,
        message: error.message,
      });
    }
  }

  projects.sort((left, right) => {
    const dateOrder = String(right.registry.last_active || "")
      .localeCompare(String(left.registry.last_active || ""));
    return dateOrder || left.registry.name.localeCompare(right.registry.name);
  });

  const summary = {
    projects: projects.length,
    active_changes: projects.reduce((sum, project) => sum + project.changes.length, 0),
    blocked_changes: projects.reduce(
      (sum, project) => sum + project.summary.blocked_changes,
      0,
    ),
    in_review: projects.reduce(
      (sum, project) => sum + (project.summary.by_status.in_review || 0),
      0,
    ),
    archived_changes: projects.reduce((sum, project) => sum + project.archive.length, 0),
    abandoned_changes: projects.reduce(
      (sum, project) => sum
        + (project.summary.by_status.abandoned || 0)
        + project.archive.filter((change) => change.status === "abandoned").length,
      0,
    ),
    pending_backlog: projects.reduce(
      (sum, project) => sum + pendingBacklog(project.backlog.items),
      0,
    ),
    estimated_context_tokens: projects.reduce(
      (sum, project) => sum + project.context_budget.estimated_tokens,
      0,
    ),
    context_over_budget: projects.filter(
      (project) => project.context_budget.over_budget,
    ).length,
  };

  return {
    contract_version: portalContract.contract_version,
    generated_at: now,
    registry_path: registryPath,
    summary,
    projects,
    diagnostics,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slug(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "project";
}

function fileHref(path) {
  return path ? pathToFileURL(path).href : null;
}

function allowedExternalHref(value) {
  const raw = String(value || "").replace(/^\[.*?]\((.*?)\)$/, "$1");
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function pill(value, tone = "") {
  return `<span class="pill ${escapeHtml(tone)}">${escapeHtml(value)}</span>`;
}

function stat(label, value) {
  return `<div class="stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function backlogRows(project) {
  if (project.backlog.items.length === 0) return "";
  return project.backlog.items.map((item) => {
    const id = item.id || "—";
    const idea = item.title || "Sin título";
    const status = item.status || "pendiente";
    const priority = item.priority || "—";
    const ticket = item.ticket || "";
    const href = allowedExternalHref(ticket);
    return `<tr class="searchable" data-search="${escapeHtml(`${id} ${idea} ${status} ${priority}`.toLowerCase())}">
      <td>${escapeHtml(id)}</td><td>${escapeHtml(idea)}</td>
      <td>${pill(status, "neutral")}</td><td>${escapeHtml(priority)}</td>
      <td>${href ? `<a href="${escapeHtml(href)}">${escapeHtml(ticket)}</a>` : escapeHtml(ticket || "—")}</td>
    </tr>`;
  }).join("");
}

function changeRows(changes) {
  if (changes.length === 0) return "";
  return changes.map((change) => `<tr class="searchable" data-search="${escapeHtml(
    `${change.id} ${change.title} ${change.status} ${change.phase} ${change.risk || ""} ${change.tracker_result?.status || ""}`.toLowerCase(),
  )}">
    <td>${escapeHtml(change.id)}</td><td>${escapeHtml(change.title)}</td>
    <td>${pill(change.status || "unknown", change.blocked ? "danger" : "info")}</td>
    <td>${escapeHtml(change.phase)}</td>
    <td>${escapeHtml(change.risk || "—")}</td>
    <td>${escapeHtml(change.tracker_result?.status || "—")}</td>
    <td>${escapeHtml(change.next_action || "—")}</td>
  </tr>`).join("");
}

function archiveRows(project) {
  return project.archive.slice(0, 25).map((change) => {
    const reportPath = change.report_present
      ? join(project.project.root, ...change.path.split("/"), "report.html")
      : null;
    return `<tr class="searchable" data-search="${escapeHtml(
      `${change.id} ${change.title}`.toLowerCase(),
    )}">
      <td>${escapeHtml(change.id)}</td><td>${escapeHtml(change.title)}</td>
      <td>${escapeHtml(change.status || "—")}</td>
      <td>${escapeHtml(change.schema || "—")}</td>
      <td>${escapeHtml(change.risk || "—")}</td>
      <td>${escapeHtml(change.tracker_result?.status || "—")}</td>
      <td>${reportPath ? `<a href="${escapeHtml(fileHref(reportPath))}">Abrir reporte</a>` : "—"}</td>
    </tr>`;
  }).join("");
}

function projectSection(project, index) {
  const id = `${slug(project.registry.name)}-${index}`;
  const onboardingPending = (project.onboarding.counts.pending || 0)
    + (project.onboarding.counts.candidate || 0)
    + (project.onboarding.counts.stale || 0);
  const incidents = project.health.incidents;
  const projectRoot = fileHref(project.files.root);
  const dashboard = fileHref(project.files.dashboard);
  return `<section class="project-detail" id="project-${id}" data-project="${id}" ${index === 0 ? "" : "hidden"}>
    <div class="detail-head">
      <div><p class="eyebrow">Proyecto</p><h2>${escapeHtml(project.registry.name)}</h2>
      <p class="path">${escapeHtml(project.project.root)}</p></div>
      <div class="actions">
        <a class="button" href="${escapeHtml(projectRoot)}">Abrir carpeta</a>
        ${dashboard ? `<a class="button secondary" href="${escapeHtml(dashboard)}">Dashboard del proyecto</a>` : ""}
      </div>
    </div>
    <div class="stats">
      ${stat("Cambios activos", project.changes.length)}
      ${stat("Bloqueados", project.summary.blocked_changes)}
      ${stat("Backlog", project.backlog.items.length)}
      ${stat("Archivados", project.archive.length)}
      ${stat("Onboarding pendiente", onboardingPending)}
      ${stat(
    `Contexto Tier ${project.context_budget.selected_tier} (estimado)`,
    `~${project.context_budget.estimated_tokens} tokens`,
  )}
    </div>
    <div class="grid two">
      <article class="panel"><h3>Configuración</h3>
        <dl>
          <dt>Repo host</dt><dd>${escapeHtml(project.platform.repo_host || "pendiente")}</dd>
          <dt>Tracker</dt><dd>${escapeHtml(project.platform.tracker || "pendiente")}</dd>
          <dt>Branching</dt><dd>${escapeHtml(project.platform.branch_strategy || "pendiente")}</dd>
          <dt>CI</dt><dd>${escapeHtml(project.platform.ci_target || "pendiente")}</dd>
          <dt>Revisado</dt><dd>${project.platform.reviewed ? "sí" : "no"}</dd>
          <dt>Última actividad</dt><dd>${escapeHtml(project.registry.last_active || "sin registro")}</dd>
        </dl>
      </article>
      <article class="panel"><h3>Conocimiento y salud</h3>
        <dl>
          <dt>Perfil</dt><dd>${escapeHtml(project.onboarding.profile || "legacy")}</dd>
          <dt>Lifecycle</dt><dd>${escapeHtml(project.onboarding.lifecycle || "legacy")}</dd>
          <dt>Standards</dt><dd>${project.health.standards.topics}</dd>
          <dt>Specs</dt><dd>${project.health.specs.documents}</dd>
          <dt>Quality reports</dt><dd>${project.health.quality.reports}</dd>
          <dt>Diagnósticos</dt><dd>${project.diagnostics.length}</dd>
          <dt>Context bytes</dt><dd>${project.context_budget.bytes}</dd>
          <dt>Context estimate</dt><dd>~${project.context_budget.estimated_tokens} tokens; no host telemetry</dd>
          <dt>Context budget</dt><dd>${project.context_budget.over_budget ? "sobre presupuesto" : "dentro del presupuesto"}</dd>
        </dl>
      </article>
    </div>
    ${project.changes.length ? `<article class="panel"><h3>Trabajo activo</h3><div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Título</th><th>Estado</th><th>Fase</th><th>Riesgo</th><th>Tracker receipt</th><th>Siguiente acción</th></tr></thead>
      <tbody>${changeRows(project.changes)}</tbody></table></div></article>` : ""}
    ${project.backlog.items.length ? `<article class="panel"><h3>Backlog local</h3><div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Idea</th><th>Estado</th><th>Prioridad</th><th>Ticket</th></tr></thead>
      <tbody>${backlogRows(project)}</tbody></table></div></article>` : ""}
    ${project.archive.length ? `<article class="panel"><h3>Archivo reciente</h3><div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Título</th><th>Estado</th><th>Schema</th><th>Riesgo</th><th>Tracker receipt</th><th>Reporte</th></tr></thead>
      <tbody>${archiveRows(project)}</tbody></table></div></article>` : ""}
    <div class="grid two">
      <article class="panel"><h3>Operaciones</h3>
        <dl>
          <dt>Infrastructure</dt><dd>${project.health.operations.infrastructure ? "disponible" : "—"}</dd>
          <dt>DORA</dt><dd>${project.health.operations.dora ? "disponible" : "—"}</dd>
          <dt>SLO</dt><dd>${project.health.operations.slo ? "disponible" : "—"}</dd>
          <dt>Deploys registrados</dt><dd>${project.health.operations.deploy_rows}</dd>
        </dl>
      </article>
      <article class="panel"><h3>Riesgo y respuesta</h3>
        <dl>
          <dt>Security docs</dt><dd>${project.health.security.reports}</dd>
          <dt>Post-mortems</dt><dd>${incidents.post_mortems}</dd>
          <dt>Runbooks</dt><dd>${incidents.runbooks}</dd>
          <dt>Playbooks</dt><dd>${incidents.playbooks}</dd>
        </dl>
      </article>
    </div>
  </section>`;
}

export function renderPortal(snapshot) {
  const embedded = JSON.stringify(snapshot).replaceAll("<", "\\u003c");
  const projectButtons = snapshot.projects.map((project, index) => {
    const id = `${slug(project.registry.name)}-${index}`;
    return `<button class="project-button ${index === 0 ? "active" : ""}" data-target="${id}">
      <span>${escapeHtml(project.registry.name)}</span>
      <small>${project.changes.length} activos · ${project.backlog.items.length} backlog</small>
    </button>`;
  }).join("");
  const details = snapshot.projects.map(projectSection).join("");
  const diagnostics = snapshot.diagnostics.length
    ? `<div class="notice">${snapshot.diagnostics.map((item) => escapeHtml(
      `${item.project ? `${item.project}: ` : ""}${item.message}`,
    )).join("<br>")}</div>`
    : "";

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: file:; connect-src 'none'; object-src 'none'; base-uri 'none';">
  <title>AgTeamOS Portal</title>
  <style>
    :root{color-scheme:dark;--bg:#0d1117;--surface:#151b23;--surface2:#1d2530;--line:#303944;--text:#e6edf3;--muted:#97a3b1;--accent:#58a6ff;--danger:#ff7b72;--ok:#7ee787}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    a{color:var(--accent);text-decoration:none}button,input{font:inherit}
    .shell{display:grid;grid-template-columns:280px minmax(0,1fr);min-height:100vh}
    aside{border-right:1px solid var(--line);padding:22px 16px;position:sticky;top:0;height:100vh;overflow:auto}
    main{padding:28px;min-width:0}.brand{font-size:18px;font-weight:700}.snapshot{color:var(--muted);font-size:12px;margin:4px 0 18px}
    .search{width:100%;background:var(--surface);border:1px solid var(--line);border-radius:7px;color:var(--text);padding:9px 11px;margin-bottom:12px}
    .project-button{width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:2px;background:transparent;color:var(--text);border:0;border-radius:7px;padding:10px;text-align:left;cursor:pointer}
    .project-button:hover,.project-button.active{background:var(--surface2)}.project-button small{color:var(--muted)}
    .overview{margin-bottom:26px}.eyebrow{text-transform:uppercase;letter-spacing:.12em;color:var(--muted);font-size:11px;margin:0 0 4px}
    h1,h2,h3{margin:0}h1{font-size:25px}h2{font-size:22px}h3{font-size:15px;margin-bottom:14px}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:18px 0}
    .stat{background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:13px}.stat strong{display:block;font-size:22px}.stat span{color:var(--muted)}
    .detail-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.path{color:var(--muted);font-family:ui-monospace,monospace;word-break:break-all}
    .actions{display:flex;gap:8px;flex-wrap:wrap}.button{display:inline-block;background:var(--accent);color:#08111c;padding:8px 11px;border-radius:7px;font-weight:600}.button.secondary{background:var(--surface2);color:var(--text);border:1px solid var(--line)}
    .grid{display:grid;gap:12px}.grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.panel{background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:16px;margin:12px 0}
    dl{display:grid;grid-template-columns:minmax(120px,.7fr) 1fr;gap:8px;margin:0}dt{color:var(--muted)}dd{margin:0;word-break:break-word}
    .table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;min-width:680px}th,td{text-align:left;border-bottom:1px solid var(--line);padding:9px}th{color:var(--muted);font-weight:600}
    .pill{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:2px 7px;font-size:12px}.pill.danger{color:var(--danger)}.pill.info{color:var(--accent)}
    .notice{border:1px solid var(--line);background:var(--surface);padding:12px;border-radius:8px;color:var(--muted);margin:12px 0}
    .empty{padding:40px 0;color:var(--muted)}[hidden]{display:none!important}
    @media(max-width:800px){.shell{display:block}aside{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line)}main{padding:20px}.grid.two{grid-template-columns:1fr}.detail-head{display:block}.actions{margin-top:12px}}
  </style>
</head>
<body>
<div class="shell">
  <aside>
    <div class="brand">AgTeamOS Portal</div>
    <div class="snapshot">Snapshot ${escapeHtml(snapshot.generated_at)}</div>
    <input id="search" class="search" type="search" placeholder="Buscar proyecto o trabajo">
    <nav id="projects">${projectButtons || '<p class="empty">No hay proyectos válidos.</p>'}</nav>
  </aside>
  <main>
    <header class="overview">
      <p class="eyebrow">Vista global · solo lectura</p>
      <h1>Portafolio de proyectos</h1>
      <div class="stats">
        ${stat("Proyectos", snapshot.summary.projects)}
        ${stat("Cambios activos", snapshot.summary.active_changes)}
        ${stat("Bloqueados", snapshot.summary.blocked_changes)}
        ${stat("En review", snapshot.summary.in_review)}
        ${stat("Backlog pendiente", snapshot.summary.pending_backlog)}
        ${stat("Archivados", snapshot.summary.archived_changes)}
        ${stat("Abandonados", snapshot.summary.abandoned_changes)}
        ${stat("Context tokens estimados", `~${snapshot.summary.estimated_context_tokens}`)}
        ${stat("Context sobre presupuesto", snapshot.summary.context_over_budget)}
      </div>
      ${diagnostics}
    </header>
    ${details || '<p class="empty">Registra un proyecto con agteamos-setup para verlo aquí.</p>'}
  </main>
</div>
<script id="agteamos-snapshot" type="application/json">${embedded}</script>
<script>
(() => {
  const buttons = [...document.querySelectorAll('.project-button')];
  const sections = [...document.querySelectorAll('.project-detail')];
  const search = document.getElementById('search');
  const select = (id) => {
    buttons.forEach((button) => button.classList.toggle('active', button.dataset.target === id));
    sections.forEach((section) => { section.hidden = section.dataset.project !== id; });
  };
  buttons.forEach((button) => button.addEventListener('click', () => select(button.dataset.target)));
  search?.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    buttons.forEach((button) => {
      button.hidden = query && !button.textContent.toLowerCase().includes(query);
    });
    document.querySelectorAll('.searchable').forEach((row) => {
      row.hidden = Boolean(query) && !row.dataset.search.includes(query);
    });
  });
})();
</script>
</body>
</html>`;
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

  const snapshot = buildPortalSnapshot({
    registryPath: options.projects,
    now: options.now || new Date().toISOString(),
  });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
    return;
  }

  mkdirSync(dirname(options.out), { recursive: true });
  writeFileSync(options.out, renderPortal(snapshot), "utf8");
  console.log(`AgTeamOS portal: ${options.out}`);
  console.log(
    `${snapshot.summary.projects} proyecto(s), `
    + `${snapshot.summary.active_changes} cambio(s) activo(s), `
    + `${snapshot.summary.pending_backlog} item(s) de backlog pendiente(s)`,
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) main();
