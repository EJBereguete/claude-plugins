'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Parseo minimo (sin dependencias) del frontmatter YAML de
 * standards/<tema>/README.md (el del PLUGIN, no el generado por proyecto) --
 * ver agteamos-project-docs SKILL.md #FRONTMATTER. Soporta:
 *   topic: valor
 *   description: valor
 *   keywords: [a, b, c]
 *   globs: ["**\/*.py", "otro"]
 *   first_consumers: [a, b]
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const block = match[1];
  const result = {};
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const kv = trimmed.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      result[key] = inner === ''
        ? []
        : inner.split(',').map((item) => item.trim().replace(/^["']|["']$/g, ''));
    } else {
      result[key] = value.replace(/^["']|["']$/g, '');
    }
  }
  return result;
}

/**
 * Lee todos los temas empaquetados con el plugin (standards/<tema>/README.md)
 * y devuelve su frontmatter parseado, uno por carpeta. pluginRoot es
 * CLAUDE_PLUGIN_ROOT (o equivalente) -- funciona sin importar cual sea el cwd
 * del proyecto consumidor.
 */
function loadPluginTopics(pluginRoot) {
  const standardsDir = path.join(pluginRoot, 'standards');
  let entries;
  try {
    entries = fs.readdirSync(standardsDir, { withFileTypes: true });
  } catch (err) {
    return [];
  }

  const topics = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const readmePath = path.join(standardsDir, entry.name, 'README.md');
    let content;
    try {
      content = fs.readFileSync(readmePath, 'utf-8');
    } catch (err) {
      continue;
    }
    const fm = parseFrontmatter(content);
    if (!fm || !fm.topic) continue;
    topics.push({
      topic: fm.topic,
      description: fm.description || '',
      keywords: fm.keywords || [],
      globs: fm.globs || [],
      first_consumers: fm.first_consumers || [],
    });
  }
  return topics;
}

/**
 * Lee agteamos/standards/index.meta.yml del PROYECTO (no del plugin) y
 * devuelve un mapa topic -> status ('done'|'pending'|...). Ausente -> {}.
 */
function loadProjectTopicStatus(projectCwd) {
  const metaPath = path.join(projectCwd, 'agteamos', 'standards', 'index.meta.yml');
  let raw;
  try {
    raw = fs.readFileSync(metaPath, 'utf-8');
  } catch (err) {
    return {};
  }
  const status = {};
  let currentTopic = null;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const topicMatch = line.match(/^([\w-]+)\s*:\s*$/);
    if (topicMatch) {
      currentTopic = topicMatch[1];
      continue;
    }
    const fieldMatch = line.match(/^\s+status\s*:\s*(.+?)\s*$/);
    if (fieldMatch && currentTopic) {
      status[currentTopic] = fieldMatch[1].replace(/^["']|["']$/g, '');
    }
  }
  return status;
}

module.exports = { parseFrontmatter, loadPluginTopics, loadProjectTopicStatus };
