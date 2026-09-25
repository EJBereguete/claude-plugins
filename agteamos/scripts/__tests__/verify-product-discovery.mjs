#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const read = (path) => readFileSync(join(pluginRoot, ...path.split("/")), "utf8");

const bootstrap = read("skills/bootstrap/SKILL.md");
const discovery = read(
  "skills/bootstrap/modules/DISCOVERY-AND-BLUEPRINT.md",
);
const materialize = read(
  "skills/bootstrap/modules/MATERIALIZE-FOUNDATION.md",
);
const scaffold = read(
  "skills/bootstrap/modules/SCAFFOLD-AND-HANDOFF.md",
);
const examples = read("skills/bootstrap/EXAMPLES.md");
const clarify = read("skills/task/modules/CLARIFY.md");
const shape = read("skills/task/modules/SHAPE-AND-SPEC.md");
const explore = read("skills/explore/SKILL.md");

for (const module of [
  "DISCOVERY-AND-BLUEPRINT.md",
  "MATERIALIZE-FOUNDATION.md",
  "SCAFFOLD-AND-HANDOFF.md",
]) {
  assert(bootstrap.includes(`modules/${module}`), `bootstrap no referencia ${module}`);
}
assert(
  bootstrap.split(/\r?\n/).length < 140,
  "bootstrap volvió a ser monolítico",
);
assert.match(discovery, /Stated request/);
assert.match(discovery, /material mismatch/);
assert.match(discovery, /Market research opt-in/);
assert.match(discovery, /blueprint consolidado/i);
assert.match(discovery, /aprobaci[oó]n/i);
assert.match(materialize, /market-research\.md/);
assert.match(materialize, /No crear\s+`product\/backlog\.md`/);
assert.match(scaffold, /No crear.*`changes\/`/s);
assert.match(clarify, /stated_request/);
assert.match(shape, /evidencia nueva/);
assert.match(explore, /market-research\.md/);
for (const fixture of [
  "Blueprint aprobado",
  "Blueprint rechazado",
  "Research aceptado pero no persistido",
  "Research aprobado",
]) {
  assert(examples.includes(`## ${fixture}`), `falta fixture ${fixture}`);
}

const skills = readdirSync(join(pluginRoot, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .filter((entry) => {
    try {
      readFileSync(join(pluginRoot, "skills", entry.name, "SKILL.md"), "utf8");
      return true;
    } catch {
      return false;
    }
  });
const agents = readdirSync(join(pluginRoot, "agents"), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"));
assert.equal(skills.length, 23);
assert.equal(agents.length, 8);

console.log("Product discovery verification OK (JIT blueprint and opt-in research)");
