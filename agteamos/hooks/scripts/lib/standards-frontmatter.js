'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Parseo minimo (sin dependencias) del frontmatter YAML de
 * standards/<tema>/README.md (el del PLUGIN, no el generado por proyecto) --
 * ver agteamos-knowledge SKILL.md #FRONTMATTER. Soporta:
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
 * Parser minimo del catalogo metadata-only standards/registry.yml. Solo
 * soporta la forma controlada que usa el plugin: una lista "topics", campos
 * escalares e inline arrays. No pretende ser un parser YAML general.
 */
function parseTopicRegistry(content) {
  const topics = [];
  let current = null;
  let insideTopics = false;

  function parseValue(rawValue) {
    const value = rawValue.trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      return inner === ''
        ? []
        : inner.split(',').map((item) => item.trim().replace(/^["']|["']$/g, ''));
    }
    return value.replace(/^["']|["']$/g, '');
  }

  function commitCurrent() {
    if (!current || typeof current.id !== 'string' || !current.id) return;
    const folder = typeof current.folder === 'string' && current.folder ? current.folder : current.id;
    topics.push({
      id: current.id,
      topic: current.id,
      folder,
      description: typeof current.description === 'string' ? current.description : '',
      keywords: Array.isArray(current.keywords) ? current.keywords : [],
      globs: Array.isArray(current.globs) ? current.globs : [],
      first_consumers: Array.isArray(current.first_consumers) ? current.first_consumers : [],
      aliases: Array.isArray(current.aliases) ? current.aliases : [],
    });
  }

  for (const line of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (/^topics\s*:\s*$/.test(trimmed)) {
      insideTopics = true;
      continue;
    }
    if (!insideTopics) continue;

    const itemMatch = line.match(/^\s*-\s+([\w-]+)\s*:\s*(.*?)\s*$/);
    if (itemMatch) {
      commitCurrent();
      current = { [itemMatch[1]]: parseValue(itemMatch[2]) };
      continue;
    }

    const fieldMatch = line.match(/^\s+([\w-]+)\s*:\s*(.*?)\s*$/);
    if (fieldMatch && current) {
      current[fieldMatch[1]] = parseValue(fieldMatch[2]);
    }
  }
  commitCurrent();
  return topics;
}

function loadLegacyFrontmatterTopics(standardsDir) {
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
      id: fm.topic,
      topic: fm.topic,
      folder: entry.name,
      description: fm.description || '',
      keywords: fm.keywords || [],
      globs: fm.globs || [],
      first_consumers: fm.first_consumers || [],
      aliases: fm.aliases || [],
    });
  }
  return topics;
}

/**
 * Lee primero standards/registry.yml. Para plugins antiguos que aun no traen
 * el catalogo, conserva el fallback al frontmatter de cada README.
 */
function loadTopicRegistry(pluginRoot) {
  const standardsDir = path.join(pluginRoot, 'standards');
  const registryPath = path.join(standardsDir, 'registry.yml');
  try {
    return parseTopicRegistry(fs.readFileSync(registryPath, 'utf-8'));
  } catch (err) {
    return loadLegacyFrontmatterTopics(standardsDir);
  }
}

// Nombre historico conservado como alias para consumidores existentes.
const loadPluginTopics = loadTopicRegistry;

/**
 * Lee primero agteamos/standards/index.meta.yml del proyecto. Antes del
 * primer discovery esa carpeta no existe: usa entonces onboarding.yml como
 * manifest L0. Devuelve topic -> status ('done'|'pending'|...).
 */
function loadProjectTopicStatus(projectCwd) {
  const metaPath = path.join(projectCwd, 'agteamos', 'standards', 'index.meta.yml');
  let raw;
  try {
    raw = fs.readFileSync(metaPath, 'utf-8');
  } catch (err) {
    const onboardingPath = path.join(projectCwd, 'agteamos', 'onboarding.yml');
    try {
      raw = fs.readFileSync(onboardingPath, 'utf-8');
    } catch (onboardingError) {
      return {};
    }

    const onboardingStatus = {};
    let currentTopic = null;
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const topicMatch = line.match(/^\s+standards\.([\w-]+)\s*:\s*(?:\{(.*)\})?\s*$/);
      if (topicMatch) {
        currentTopic = topicMatch[1];
        const inlineStatus = topicMatch[2]?.match(/\bstatus\s*:\s*([^,}]+)/);
        if (inlineStatus) {
          onboardingStatus[currentTopic] = inlineStatus[1]
            .trim()
            .replace(/^["']|["']$/g, '');
        }
        continue;
      }
      const fieldMatch = line.match(/^\s+status\s*:\s*(.+?)\s*$/);
      if (fieldMatch && currentTopic) {
        onboardingStatus[currentTopic] = fieldMatch[1].replace(/^["']|["']$/g, '');
      } else if (/^\s{0,2}\S/.test(line)) {
        currentTopic = null;
      }
    }
    return onboardingStatus;
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

module.exports = {
  parseFrontmatter,
  parseTopicRegistry,
  loadTopicRegistry,
  loadPluginTopics,
  loadProjectTopicStatus,
};
