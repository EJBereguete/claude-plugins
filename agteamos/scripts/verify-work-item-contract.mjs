import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspace = resolve(root, "..");
const errors = [];

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function filesUnder(dir, predicate = () => true) {
  const absolute = resolve(root, dir);
  const result = [];
  for (const name of readdirSync(absolute)) {
    const path = join(absolute, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      result.push(...filesUnder(relative(root, path), predicate));
    } else if (predicate(path)) {
      result.push(path);
    }
  }
  return result;
}

function requireText(path, patterns) {
  const content = read(path);
  for (const pattern of patterns) {
    if (!pattern.test(content)) {
      errors.push(`${path}: falta ${pattern}`);
    }
  }
}

const skillFiles = filesUnder("skills", (path) => path.endsWith("SKILL.md"));
if (skillFiles.length !== 23) {
  errors.push(`Se esperaban 23 skills; se encontraron ${skillFiles.length}`);
}

const modules = [
  "scripts/agteamos-change-set.mjs",
  "scripts/agteamos-analyze.mjs",
  "skills/work-items/SKILL.md",
  "skills/work-items/REPOSITORY-CONTEXT.md",
  "skills/work-items/WORK-ITEM-TEMPLATES.md",
  "skills/work-items/QUALITY-GATES.md",
  "skills/work-items/CHANGE-SETS.md",
  "skills/work-items/AZURE-OPERATIONS.md",
  "skills/work-items/AZURE-TRANSPORT.md",
  "skills/work-items/GITHUB-OPERATIONS.md",
  "skills/work-items/PLANNER-OPERATIONS.md",
  "skills/work-items/EXAMPLES.md",
  "skills/task/modules/AUDIT-BREAKDOWN.md",
  "skills/fix/modules/BUG-INTAKE.md",
  "skills/implement/modules/ABANDON-CHANGE.md",
  "skills/bootstrap/modules/DISCOVERY-AND-BLUEPRINT.md",
  "skills/bootstrap/modules/MATERIALIZE-FOUNDATION.md",
  "skills/bootstrap/modules/SCAFFOLD-AND-HANDOFF.md",
  "scripts/agteamos-release-inventory.mjs",
  "contracts/context-budget.json",
];

for (const module of modules) {
  try {
    read(module);
  } catch {
    errors.push(`Falta ${module}`);
  }
}

requireText("skills/work-items/SKILL.md", [
  /inspect-repo/,
  /inspect-tracker/,
  /change set/i,
  /agteamos-change-set\.mjs/,
  /aprobaci[oó]n/i,
  /verificar|verificaci[oó]n/i,
  /REPOSITORY-CONTEXT\.md/,
]);

requireText("skills/work-items/CHANGE-SETS.md", [
  /fingerprint/i,
  /approval receipt|receipt local/i,
  /agteamos-change-set\.mjs" verify/,
  /tracker-result\.md/,
  /Attachments/,
]);

requireText("skills/work-items/AZURE-TRANSPORT.md", [
  /UTF-8/,
  /Unicode NFC/,
  /form layout/i,
  /AttachedFile/,
  /SHA-256/,
  /Never add\/subtract a universal day/,
]);

requireText("skills/task/SKILL.md", [
  /AUDIT-BREAKDOWN\.md/,
  /reporte read-only/i,
]);
requireText("skills/task/modules/AUDIT-BREAKDOWN.md", [
  /Duplicados/,
  /Huecos/,
  /dependencias/i,
  /READY_WITH_CHANGES/,
  /No exigir Epic o Feature universal/,
]);

requireText("scripts/agteamos-validate.mjs", [
  /TRACKER_RESULT_FINGERPRINT_INVALID/,
  /TRACKER_RESULT_SENSITIVE_DATA/,
]);

requireText("skills/setup/SKILL.md", [
  /Planner queda `degraded`/,
  /Microsoft Graph/,
]);

for (const liteSkill of ["skills/fix/SKILL.md", "skills/debug/SKILL.md"]) {
  requireText(liteSkill, [
    /task\.yml/,
    /progress\.md/,
    /workflow_contract: "3"/,
    /no se crea `specs\/`/i,
  ]);
}

requireText("skills/implement/modules/DESIGN-AND-IMPLEMENT.md", [
  /agteamos-analyze\.mjs/,
  /--stage preflight/,
]);
requireText("skills/implement/modules/CLOSE-AND-ARCHIVE.md", [
  /--stage verify/,
  /goal-backward/i,
]);
requireText("skills/implement/modules/TEMPLATES.md", [
  /Goal-backward verification/,
  /Prueba no tautol[oó]gica/,
]);
requireText("skills/implement/SKILL.md", [
  /ABANDON-CHANGE\.md/,
  /standard\|high\|critical/,
  /mismo SHA/i,
]);
requireText("skills/knowledge/modules/MAINTAIN.md", [
  /--maintain --release/,
  /Release Maintenance — Dry Run/,
  /scripts\/agteamos-release-inventory\.mjs/,
  /Nunca borrar\/modificar specs maestras/,
]);
requireText("skills/context/SKILL.md", [
  /contracts\/context-budget\.json/,
  /--context-budget/,
  /telemetr[ií]a, billing/i,
]);

requireText("skills/work-items/REPOSITORY-CONTEXT.md", [
  /Observed/,
  /Proposed/,
  /Pending decision/,
  /Revalidaci[oó]n antes de aplicar/,
  /Repos vac[ií]os/,
  /freshness: verified \| stale \| unverified/,
  /no ejecuta `reset --hard`/,
]);

const consumers = [
  "skills/task/SKILL.md",
  "skills/bootstrap/SKILL.md",
  "skills/capture/SKILL.md",
  "skills/implement/SKILL.md",
  "skills/knowledge/SKILL.md",
  "skills/incidents/SKILL.md",
  "skills/router/SKILL.md",
  "agents/product-manager.md",
];
for (const consumer of consumers) {
  requireText(consumer, [/agteamos-work-items/]);
}

const markdown = [
  ...filesUnder("skills", (path) => path.endsWith(".md")),
  ...filesUnder("agents", (path) => path.endsWith(".md")),
  ...filesUnder("docs", (path) => path.endsWith(".md")),
  resolve(root, "README.md"),
];

const forbidden = [
  /\bgh issue (create|edit|close|comment)\b/i,
  /\baz boards work-item (create|update|relation add)\b/i,
  /\baz rest --method (POST|PATCH)\b/i,
  /\bgh pr (create|view|diff|review|merge|comment)\b/i,
  /\[operaci[oó]n: (create-ticket|create-story|create-task|create-bug|create-epic|create-feature|close-ticket|comment-ticket|link-parent-child|link-external-url|create-label|get-ticket)\]/i,
  /crea ticket\(s\) en GitHub\/Azure/i,
  /Usar MCP github para leer\/crear issues/i,
  /Lee ticket via MCP/i,
];

for (const path of markdown) {
  const normalized = relative(root, path).replaceAll("\\", "/");
  if (normalized === "skills/setup/SKILL.md") continue;
  const content = readFileSync(path, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(content)) {
      errors.push(`${normalized}: mutación directa fuera de setup/work-items (${pattern})`);
    }
  }
  for (const pattern of [
    /^\s*(?:\$ )?git\s+reset\s+--hard\b/im,
    /^\s*(?:\$ )?git\s+add\s+-A\b/im,
    /^\s*(?:\$ )?git\s+checkout\s+--\s+/im,
  ]) {
    if (pattern.test(content)) {
      errors.push(`${normalized}: comando destructivo prohibido (${pattern})`);
    }
  }
}

for (const path of [
  ...filesUnder("skills", (candidate) => candidate.endsWith(".md")),
  ...filesUnder("agents", (candidate) => candidate.endsWith(".md")),
]) {
  const content = readFileSync(path, "utf8");
  for (const tenantTerm of [
    /phoenixcalibrationdr/i,
    /Phoenix Apps/i,
    /Calsystem Team/i,
    /Odoo Team/i,
    /\b4M[12]\b/,
  ]) {
    if (tenantTerm.test(content)) {
      errors.push(
        `${relative(root, path).replaceAll("\\", "/")}: acoplamiento tenant prohibido (${tenantTerm})`,
      );
    }
  }
}

for (const agent of [
  "agents/architect.md",
  "agents/product-manager.md",
  "agents/backend-engineer.md",
  "agents/frontend-engineer.md",
  "agents/qa-engineer.md",
  "agents/security-engineer.md",
  "agents/devops-engineer.md",
]) {
  requireText(agent, [/skills:.*agteamos-work-items/]);
}

requireText(".claude-plugin/plugin.json", [/"version": "3\.5\.0"/, /23 skills/]);
const marketplace = readFileSync(
  resolve(workspace, ".claude-plugin", "marketplace.json"),
  "utf8",
);
if (!/"version": "3\.5\.0"/.test(marketplace)) {
  errors.push("../.claude-plugin/marketplace.json: versión distinta de 3.5.0");
}
requireText("README.md", [/Las 23 skills/, /agteamos-work-items/, /3\.5\.0/]);
requireText("docs/README.md", [/23 skills/, /3\.5\.0/]);

const fixture = read("skills/work-items/EXAMPLES.md");
for (const scenario of [
  "Azure Agile con campos custom",
  "Azure Bug como Task",
  "GitHub sin sub-issues",
  "Planner",
  "Repo vacío",
  "Duplicado",
  "Snapshot obsoleto",
  "Ciclo de dependencias",
  "Fallo parcial",
  "Azure Unicode en Windows",
  "Azure Bug con layout custom",
  "Azure attachment verificado",
  "Multi-repo mirror stale",
  "Auditoría de desglose existente",
  "Bug ID simple a lite",
  "Bug ID complejo a full",
  "Abandono antes de implementar",
  "Abandono con cancelación parcial",
]) {
  if (!fixture.includes(`## ${scenario}`)) {
    errors.push(`EXAMPLES.md: falta fixture ${scenario}`);
  }
}

if (errors.length) {
  console.error("Work-item contract verification FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Work-item contract verification OK (${skillFiles.length} skills, ${consumers.length} consumers)`,
);
