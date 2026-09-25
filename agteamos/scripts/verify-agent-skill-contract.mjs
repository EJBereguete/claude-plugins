#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_AGENTS = 8;
const EXPECTED_SKILLS = 23;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function portable(path) {
  return path.split(sep).join("/");
}

function display(path) {
  return portable(relative(root, path));
}

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    errors.push(`${display(path)}: no se pudo leer (${error.message})`);
    return null;
  }
}

function frontmatter(path) {
  const content = read(path);
  if (content === null) return null;
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    errors.push(`${display(path)}: frontmatter ausente o inválido`);
    return null;
  }
  return match[1];
}

function topLevelFields(yaml, path) {
  const fields = new Map();
  const lines = yaml.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!match) continue;
    const [, key, inline] = match;
    if (fields.has(key)) {
      errors.push(`${display(path)}: campo frontmatter duplicado "${key}"`);
      continue;
    }

    const block = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (/^[A-Za-z_][\w-]*\s*:/.test(lines[cursor])) break;
      const item = lines[cursor].match(/^\s+-\s+(.+?)\s*$/);
      if (item) block.push(item[1]);
    }
    fields.set(key, { inline: inline.trim(), block });
  }

  return fields;
}

function clean(value) {
  const withoutComment = value.replace(/\s+#.*$/, "").trim();
  if (
    withoutComment.length >= 2
    && (
      (withoutComment.startsWith('"') && withoutComment.endsWith('"'))
      || (withoutComment.startsWith("'") && withoutComment.endsWith("'"))
    )
  ) {
    return withoutComment.slice(1, -1);
  }
  return withoutComment;
}

function scalar(fields, key, path) {
  const field = fields.get(key);
  if (!field || !field.inline) {
    errors.push(`${display(path)}: falta "${key}" en frontmatter`);
    return "";
  }
  return clean(field.inline);
}

function list(fields, key, path) {
  const field = fields.get(key);
  if (!field) {
    errors.push(`${display(path)}: falta "${key}" en frontmatter`);
    return [];
  }

  const raw = field.block.length > 0
    ? field.block
    : field.inline.replace(/^\[/, "").replace(/\]$/, "").split(",");
  const values = raw.map(clean).filter(Boolean);
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`${display(path)}: "${key}" contiene duplicado "${value}"`);
    }
    seen.add(value);
  }
  return values;
}

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(directory, entry.name))
    .sort();
}

function skillFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(directory, entry.name, "SKILL.md"))
    .filter((path) => existsSync(path))
    .sort();
}

const agentPaths = markdownFiles(join(root, "agents"));
const skillPaths = skillFiles(join(root, "skills"));
const routerPath = join(root, "skills", "router", "SKILL.md");
const routerText = read(routerPath) ?? "";
for (const module of [
  "PROJECT-RESOLUTION.md",
  "REPO-STATE.md",
  "FLOW-ROUTING.md",
]) {
  const modulePath = join(root, "skills", "router", "modules", module);
  if (!existsSync(modulePath)) {
    errors.push(`${display(modulePath)}: módulo de router ausente`);
  }
  if (!routerText.includes(`modules/${module}`)) {
    errors.push(`${display(routerPath)}: no referencia modules/${module}`);
  }
}

if (agentPaths.length !== EXPECTED_AGENTS) {
  errors.push(
    `agents/: se esperaban ${EXPECTED_AGENTS} agentes y se encontraron ${agentPaths.length}`,
  );
}
if (skillPaths.length !== EXPECTED_SKILLS) {
  errors.push(
    `skills/: se esperaban ${EXPECTED_SKILLS} skills y se encontraron ${skillPaths.length}`,
  );
}

const agents = new Map();
for (const path of agentPaths) {
  const yaml = frontmatter(path);
  if (yaml === null) continue;
  const fields = topLevelFields(yaml, path);
  const name = scalar(fields, "name", path);
  const skills = list(fields, "skills", path);

  if (name && agents.has(name)) {
    errors.push(
      `${display(path)}: nombre de agente duplicado "${name}" (también en ${display(agents.get(name).path)})`,
    );
  } else if (name) {
    agents.set(name, { path, skills });
  }
}

const skills = new Map();
for (const path of skillPaths) {
  const yaml = frontmatter(path);
  if (yaml === null) continue;
  const fields = topLevelFields(yaml, path);
  const name = scalar(fields, "name", path);
  const usedBy = list(fields, "used_by", path);

  if (name && skills.has(name)) {
    errors.push(
      `${display(path)}: nombre de skill duplicado "${name}" (también en ${display(skills.get(name).path)})`,
    );
  } else if (name) {
    skills.set(name, { path, usedBy });
  }
}

for (const [agentName, agent] of agents) {
  if (!agent.skills.includes("agteamos-router")) {
    errors.push(
      `${display(agent.path)}: el agente "${agentName}" no declara el preflight agteamos-router`,
    );
  }
  for (const skillName of agent.skills) {
    if (!skills.has(skillName)) {
      errors.push(
        `${display(agent.path)}: el agente "${agentName}" referencia skill inexistente "${skillName}"`,
      );
    }
  }
}

for (const [skillName, skill] of skills) {
  for (const agentName of skill.usedBy) {
    if (!agents.has(agentName)) {
      errors.push(
        `${display(skill.path)}: used_by referencia agente inexistente "${agentName}"`,
      );
    }
  }

  const expected = [...agents]
    .filter(([, agent]) => agent.skills.includes(skillName))
    .map(([agentName]) => agentName)
    .sort();
  const actual = [...new Set(skill.usedBy)].sort();
  const missing = expected.filter((agentName) => !actual.includes(agentName));
  const extra = actual.filter((agentName) => !expected.includes(agentName));

  if (missing.length > 0 || extra.length > 0) {
    errors.push(
      `${display(skill.path)}: used_by no coincide con agents/*.md`
      + ` (faltan: ${missing.join(", ") || "ninguno"};`
      + ` sobran: ${extra.join(", ") || "ninguno"})`,
    );
  }
}

const manifestPath = join(root, ".claude-plugin", "plugin.json");
const manifestText = read(manifestPath);
if (manifestText !== null) {
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch (error) {
    errors.push(`${display(manifestPath)}: JSON inválido (${error.message})`);
  }

  if (manifest) {
    if (!Array.isArray(manifest.agents)) {
      errors.push(`${display(manifestPath)}: "agents" debe ser un array`);
    } else {
      const registered = manifest.agents
        .filter((entry) => {
          if (typeof entry !== "string") {
            errors.push(`${display(manifestPath)}: cada agente registrado debe ser una ruta`);
            return false;
          }
          return true;
        })
        .map((entry) => resolve(root, entry));
      const unique = new Set(registered);
      if (unique.size !== registered.length) {
        errors.push(`${display(manifestPath)}: contiene agentes duplicados`);
      }

      const actual = new Set(agentPaths.map((path) => resolve(path)));
      for (const path of agentPaths) {
        if (!unique.has(resolve(path))) {
          errors.push(`${display(manifestPath)}: no registra ${display(path)}`);
        }
      }
      for (const path of unique) {
        if (!actual.has(path)) {
          errors.push(
            `${display(manifestPath)}: registra agente inexistente o inesperado ${portable(relative(root, path))}`,
          );
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Agent-skill contract verification FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Agent-skill contract verification OK (${agentPaths.length} agents, ${skillPaths.length} skills)`,
);
