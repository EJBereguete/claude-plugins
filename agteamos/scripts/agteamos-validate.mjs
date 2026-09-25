#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_SKILLS = 23;
const EXPECTED_AGENTS = 8;
const DELTA_SECTIONS = new Set(["ADDED", "MODIFIED", "REMOVED"]);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const layoutContractPath = join(
  scriptDirectory,
  "..",
  "contracts",
  "project-layout.json",
);
const workflowContractPath = join(
  scriptDirectory,
  "..",
  "contracts",
  "workflow.json",
);

function parseArguments(argv) {
  const options = {
    root: process.cwd(),
    json: false,
    strict: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      options.json = true;
    } else if (argument === "--strict") {
      options.strict = true;
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
    "Uso: node scripts/agteamos-validate.mjs [--root <project>] [--json] [--strict]",
    "",
    "Valida un proyecto consumidor o el contrato del plugin AgTeamOS.",
  ].join("\n");
}

function normalizePath(path) {
  return path.split(sep).join("/");
}

function displayPath(root, path) {
  const result = normalizePath(relative(root, path));
  return result || ".";
}

function createReporter(root) {
  const diagnostics = [];

  function report(code, severity, path, message) {
    diagnostics.push({
      code,
      severity,
      path: displayPath(root, path),
      message,
    });
  }

  return { diagnostics, report };
}

function readText(path, reporter, code = "FILE_READ_FAILED") {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    reporter.report(code, "error", path, `No se pudo leer: ${error.message}`);
    return null;
  }
}

function readJson(path, reporter, code = "JSON_INVALID") {
  const content = readText(path, reporter);
  if (content === null) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    reporter.report(code, "error", path, `JSON inválido: ${error.message}`);
    return null;
  }
}

function filesRecursively(directory, predicate = () => true) {
  if (!existsSync(directory)) return [];
  const files = [];
  const entries = readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...filesRecursively(path, predicate));
    } else if (entry.isFile() && predicate(path)) {
      files.push(path);
    }
  }
  return files;
}

function directoriesAt(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(directory, entry.name))
    .sort();
}

function directoriesRecursively(directory) {
  if (!existsSync(directory)) return [];
  const directories = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(directory, entry.name);
    directories.push(path, ...directoriesRecursively(path));
  }
  return directories.sort();
}

function stripYamlComment(value) {
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if ((character === '"' || character === "'") && value[index - 1] !== "\\") {
      quote = quote === character ? null : quote || character;
    } else if (character === "#" && quote === null) {
      return value.slice(0, index).trim();
    }
  }
  return value.trim();
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2
    && ((trimmed.startsWith('"') && trimmed.endsWith('"'))
      || (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseTopLevelYaml(content) {
  const values = new Map();
  const duplicates = new Set();

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#") || /^\s/.test(line)) {
      continue;
    }
    const match = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const value = unquote(stripYamlComment(match[2]));
    if (values.has(key)) duplicates.add(key);
    values.set(key, value);
  }

  return { values, duplicates };
}

function validateDurableGates(
  taskPath,
  agteamosDirectory,
  values,
  workflowContract,
  reporter,
) {
  if (!workflowContract) return;
  const status = values.get("status");
  const archived = normalizePath(relative(agteamosDirectory, taskPath))
    .startsWith("changes/archive/");
  const declaredContract = values.get("workflow_contract");
  const currentContract = declaredContract === workflowContract.contract_version;
  const compatibleContracts = new Set(
    workflowContract.compatible_contract_versions
      || [workflowContract.contract_version],
  );
  const durableFields = Object.keys(workflowContract.durable_gate_fields || {});

  if (declaredContract && !compatibleContracts.has(declaredContract)) {
    reporter.report(
      "TASK_WORKFLOW_CONTRACT_INVALID",
      "error",
      taskPath,
      `workflow_contract ${declaredContract} no es compatible con ${workflowContract.contract_version}`,
    );
  }
  if (declaredContract && compatibleContracts.has(declaredContract)) {
    if (!values.get("phase")) {
      reporter.report(
        "TASK_PHASE_MISSING",
        "error",
        taskPath,
        "Una tarea con workflow_contract compatible requiere phase",
      );
    }
    for (const field of durableFields) {
      if (!values.has(field) || !["true", "false"].includes(values.get(field))) {
        reporter.report(
          "TASK_GATE_FIELD_INVALID",
          "error",
          taskPath,
          `${field} debe existir como booleano true/false`,
        );
      }
    }
  }

  let phase = values.get("phase")?.toUpperCase() || null;
  if (!phase && status === "in_review") phase = "PR_REVIEW";
  if (!phase && status === "abandoned") phase = "ABANDONED";
  if (!phase && status === "done") phase = archived ? "DONE" : "ARCHIVE";
  if (!phase) return;

  const phaseOrders = new Map(
    workflowContract.phases.map((candidate) => [candidate.id, candidate.order]),
  );
  if (!phaseOrders.has(phase)) {
    reporter.report(
      "TASK_PHASE_INVALID",
      "error",
      taskPath,
      `Fase desconocida: ${phase}`,
    );
    return;
  }
  const compatible = workflowContract.status_phase_compatibility?.[status] || [];
  if (!compatible.includes(phase)) {
    reporter.report(
      "TASK_STATUS_PHASE_INCOMPATIBLE",
      "error",
      taskPath,
      `Status ${status} no es compatible con fase ${phase}`,
    );
  }

  const enforceLateGates = !archived || currentContract;
  if (!enforceLateGates) return;
  const currentOrder = phaseOrders.get(phase);
  const taskDirectory = dirname(taskPath);
  if (currentContract) {
    const risk = values.get("risk");
    const allowedRisks = workflowContract.risk?.allowed_levels || [];
    if (!allowedRisks.includes(risk)) {
      reporter.report(
        "TASK_RISK_INVALID",
        "error",
        taskPath,
        `risk debe ser uno de: ${allowedRisks.join(", ")}`,
      );
    }
    if (!values.get("risk_reason")) {
      reporter.report(
        "TASK_RISK_REASON_MISSING",
        "error",
        taskPath,
        "workflow_contract actual requiere risk_reason sustentado",
      );
    }
    if (
      !values.has("risk_review_approved")
      || !["true", "false"].includes(values.get("risk_review_approved"))
    ) {
      reporter.report(
        "RISK_REVIEW_FIELD_INVALID",
        "error",
        taskPath,
        "risk_review_approved debe existir como booleano true/false",
      );
    }
    for (const field of ["reviewed_sha", "risk_review_sha"]) {
      if (!values.has(field)) {
        reporter.report(
          "REVIEW_SHA_FIELD_MISSING",
          "error",
          taskPath,
          `${field} debe existir; usar null hasta review`,
        );
      }
    }
    const riskReviewPhase = workflowContract.risk?.review_phase;
    const riskReviewOrder = phaseOrders.get(riskReviewPhase)
      ?? Number.POSITIVE_INFINITY;
    if (
      status !== "abandoned"
      && !["ABANDONING", "ABANDONED"].includes(phase)
      && currentOrder >= riskReviewOrder
    ) {
      const reviewedSha = values.get(
        workflowContract.risk?.reviewed_sha_field || "reviewed_sha",
      );
      if (!/^[a-f0-9]{7,64}$/i.test(reviewedSha || "")) {
        reporter.report(
          "REVIEWED_SHA_INVALID",
          "error",
          taskPath,
          "PRE_CLOSE_VALIDATE requiere reviewed_sha válido",
        );
      }
      if (
        (workflowContract.risk?.additional_review_levels || []).includes(risk)
      ) {
        const approvalField = workflowContract.risk
          ?.additional_review_approved_field || "risk_review_approved";
        const shaField = workflowContract.risk
          ?.additional_review_sha_field || "risk_review_sha";
        const riskReviewSha = values.get(shaField);
        if (values.get(approvalField) !== "true") {
          reporter.report(
            "RISK_REVIEW_MISSING",
            "error",
            taskPath,
            `${risk} requiere review adicional aprobado`,
          );
        }
        if (
          !/^[a-f0-9]{7,64}$/i.test(riskReviewSha || "")
          || riskReviewSha !== reviewedSha
        ) {
          reporter.report(
            "RISK_REVIEW_SHA_MISMATCH",
            "error",
            taskPath,
            "risk_review_sha debe coincidir exactamente con reviewed_sha",
          );
        }
      }
    }
  }
  const lateGateIds = new Set([
    "pre_pr_validate",
    "pre_close_validate",
    "archive",
    "abandon_started",
    "abandon_archive",
  ]);
  for (const [gateId, gate] of Object.entries(workflowContract.gates || {})) {
    if (!lateGateIds.has(gateId)) continue;
    if (Array.isArray(gate.statuses) && !gate.statuses.includes(status)) continue;
    if (
      Array.isArray(gate.excluded_phases)
      && gate.excluded_phases.includes(phase)
    ) {
      continue;
    }
    if ((phaseOrders.get(gate.phase) ?? Number.POSITIVE_INFINITY) > currentOrder) {
      continue;
    }
    for (const requirement of gate.requires || []) {
      const satisfied = requirement.endsWith(".md")
        ? existsSync(join(taskDirectory, requirement))
        : values.get(requirement) === "true";
      if (!satisfied) {
        reporter.report(
          "WORKFLOW_GATE_MISSING",
          "error",
          taskPath,
          `Gate ${gateId} requiere ${requirement}`,
        );
      }
    }
  }
}

function validateTask(
  taskPath,
  agteamosDirectory,
  workflowContract,
  reporter,
) {
  const content = readText(taskPath, reporter);
  if (content === null) return;

  const { values, duplicates } = parseTopLevelYaml(content);
  for (const field of duplicates) {
    reporter.report(
      "TASK_FIELD_DUPLICATE",
      "error",
      taskPath,
      `El campo "${field}" está repetido`,
    );
  }

  for (const field of ["id", "title", "status", "schema", "context_tier"]) {
    if (!values.has(field) || values.get(field).trim() === "") {
      reporter.report(
        "TASK_FIELD_MISSING",
        "error",
        taskPath,
        `Falta el campo obligatorio "${field}"`,
      );
    }
  }

  const schema = values.get("schema");
  if (schema && schema !== "full" && schema !== "lite") {
    reporter.report(
      "TASK_SCHEMA_INVALID",
      "error",
      taskPath,
      'schema debe ser "full" o "lite"',
    );
  }

  const contextTier = values.get("context_tier");
  if (contextTier && !/^[123]$/.test(contextTier)) {
    reporter.report(
      "TASK_CONTEXT_TIER_INVALID",
      "error",
      taskPath,
      "context_tier debe ser 1, 2 o 3",
    );
  }

  if (schema === "full") {
    validateFullTask(dirname(taskPath), agteamosDirectory, reporter);
  }
  const status = values.get("status");
  if (
    status
    && workflowContract
    && !workflowContract.task_statuses.includes(status)
  ) {
    reporter.report(
      "TASK_STATUS_INVALID",
      "error",
      taskPath,
      `status no permitido por workflow_contract: ${status}`,
    );
  }
  validateDurableGates(
    taskPath,
    agteamosDirectory,
    values,
    workflowContract,
    reporter,
  );
  validateTrackerResult(dirname(taskPath), reporter);
}

function validateTrackerResult(taskDirectory, reporter) {
  const resultPath = join(taskDirectory, "tracker-result.md");
  if (!existsSync(resultPath)) return;
  const content = readText(resultPath, reporter);
  if (content === null) return;

  for (const heading of [
    "# Tracker Result",
    "## Change set",
    "## Operations",
    "## Failures and unexecuted",
  ]) {
    if (!content.includes(heading)) {
      reporter.report(
        "TRACKER_RESULT_SECTION_MISSING",
        "error",
        resultPath,
        `Falta la sección "${heading}"`,
      );
    }
  }

  if (!/^- Fingerprint:\s*[a-f0-9]{64}\s*$/im.test(content)) {
    reporter.report(
      "TRACKER_RESULT_FINGERPRINT_INVALID",
      "error",
      resultPath,
      "Fingerprint ausente o no es SHA-256",
    );
  }
  if (
    !/^- Status:\s*(pending|partial|verified|failed)\s*$/im.test(content)
  ) {
    reporter.report(
      "TRACKER_RESULT_STATUS_INVALID",
      "error",
      resultPath,
      "Status debe ser pending, partial, verified o failed",
    );
  }

  const forbidden = [
    /\bAuthorization\s*:\s*Bearer\s+\S+/i,
    /\b(access[_-]?token|refresh[_-]?token|pat)\s*[:=]\s*\S+/i,
    /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/,
  ];
  if (forbidden.some((pattern) => pattern.test(content))) {
    reporter.report(
      "TRACKER_RESULT_SENSITIVE_DATA",
      "error",
      resultPath,
      "El receipt durable contiene token/header/email y debe sanitizarse",
    );
  }
}

function validateFullTask(taskDirectory, agteamosDirectory, reporter) {
  const specsDirectory = join(taskDirectory, "specs");
  for (const name of ["requirements.md", "design.md", "tasks.md"]) {
    const path = join(specsDirectory, name);
    if (!existsSync(path)) {
      reporter.report(
        "FULL_ARTIFACT_MISSING",
        "error",
        path,
        `Una tarea schema full requiere specs/${name}`,
      );
    }
  }

  const deltasDirectory = join(specsDirectory, "deltas");
  if (!existsSync(deltasDirectory) || !statSync(deltasDirectory).isDirectory()) {
    reporter.report(
      "FULL_DELTAS_MISSING",
      "error",
      deltasDirectory,
      "Una tarea schema full requiere specs/deltas/",
    );
    return;
  }

  const deltaFiles = filesRecursively(
    deltasDirectory,
    (path) => path.toLowerCase().endsWith(".md"),
  );
  if (deltaFiles.length === 0) {
    reporter.report(
      "FULL_DELTA_FILE_MISSING",
      "error",
      deltasDirectory,
      "specs/deltas/ debe contener al menos un archivo Markdown",
    );
    return;
  }

  for (const deltaPath of deltaFiles) {
    validateDelta(deltaPath, agteamosDirectory, reporter);
  }
}

function extractMasterRequirements(content) {
  const names = new Set();
  const pattern = /^### Requirement:\s*(.+?)\s*$/gm;
  for (const match of content.matchAll(pattern)) {
    names.add(match[1]);
  }
  return names;
}

function parseDelta(content) {
  const requirements = [];
  let currentSection = null;
  let currentRequirement = null;
  let hasDeltaSection = false;
  let hasNoChangesSection = false;

  for (const line of content.split(/\r?\n/)) {
    const sectionMatch = line.match(
      /^##\s+(ADDED|MODIFIED|REMOVED)(?:\s+Requirements)?\s*$/i,
    );
    if (sectionMatch) {
      currentSection = sectionMatch[1].toUpperCase();
      currentRequirement = null;
      hasDeltaSection = true;
      continue;
    }
    if (/^##\s+Sin cambios en la spec maestra\s*$/i.test(line)) {
      currentSection = null;
      currentRequirement = null;
      hasNoChangesSection = true;
      continue;
    }
    if (/^##\s+/.test(line)) {
      currentSection = null;
      currentRequirement = null;
      continue;
    }

    const requirementMatch = line.match(/^### Requirement:\s*(.*?)\s*$/);
    if (requirementMatch) {
      currentRequirement = {
        name: requirementMatch[1],
        section: currentSection,
        scenarios: 0,
      };
      requirements.push(currentRequirement);
      continue;
    }

    if (/^#### Scenario:\s*\S/.test(line) && currentRequirement) {
      currentRequirement.scenarios += 1;
    }
  }

  return {
    requirements,
    hasDeltaSection,
    hasNoChangesSection,
  };
}

function validateDelta(deltaPath, agteamosDirectory, reporter) {
  const content = readText(deltaPath, reporter);
  if (content === null) return;

  const parsed = parseDelta(content);
  if (!parsed.hasDeltaSection && !parsed.hasNoChangesSection) {
    reporter.report(
      "DELTA_SECTION_MISSING",
      "error",
      deltaPath,
      "El delta requiere una sección ADDED, MODIFIED, REMOVED o Sin cambios",
    );
  }

  for (const requirement of parsed.requirements) {
    if (!requirement.name) {
      reporter.report(
        "DELTA_REQUIREMENT_NAME_MISSING",
        "error",
        deltaPath,
        "Un encabezado Requirement no tiene nombre",
      );
    }
    if (!DELTA_SECTIONS.has(requirement.section)) {
      reporter.report(
        "DELTA_REQUIREMENT_OUTSIDE_SECTION",
        "error",
        deltaPath,
        `Requirement "${requirement.name || "(sin nombre)"}" no está bajo ADDED, MODIFIED o REMOVED`,
      );
    }
    if (
      requirement.section !== "REMOVED"
      && requirement.scenarios === 0
    ) {
      reporter.report(
        "DELTA_SCENARIO_MISSING",
        "error",
        deltaPath,
        `Requirement "${requirement.name || "(sin nombre)"}" requiere al menos un Scenario`,
      );
    }
  }

  if (
    parsed.hasDeltaSection
    && parsed.requirements.length === 0
    && !parsed.hasNoChangesSection
  ) {
    reporter.report(
      "DELTA_REQUIREMENT_MISSING",
      "error",
      deltaPath,
      "El delta no contiene ningún Requirement ni declara Sin cambios",
    );
  }

  const domain = deltaPath.slice(deltaPath.lastIndexOf(sep) + 1, -3);
  const masterPath = join(agteamosDirectory, "specs", `${domain}.md`);
  if (!existsSync(masterPath)) return;

  const masterContent = readText(masterPath, reporter);
  if (masterContent === null) return;
  const masterRequirements = extractMasterRequirements(masterContent);

  for (const requirement of parsed.requirements) {
    if (
      (requirement.section === "MODIFIED" || requirement.section === "REMOVED")
      && !masterRequirements.has(requirement.name)
    ) {
      reporter.report(
        "DELTA_REQUIREMENT_NOT_IN_MASTER",
        "error",
        deltaPath,
        `${requirement.section} Requirement "${requirement.name}" no existe por nombre exacto en specs/${domain}.md`,
      );
    }
  }
}

function parseIndexMeta(content) {
  const statuses = new Map();
  let topic = null;

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const topicMatch = line.match(/^([\w-]+)\s*:\s*$/);
    if (topicMatch) {
      topic = topicMatch[1];
      continue;
    }
    const statusMatch = line.match(/^\s+status\s*:\s*(.+?)\s*$/);
    if (topic && statusMatch) {
      statuses.set(topic, unquote(stripYamlComment(statusMatch[1])));
    }
  }

  return statuses;
}

function parseIndexTargets(value) {
  let normalized = unquote(stripYamlComment(value)).trim();
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }
  return normalized
    .split(",")
    .map((item) => unquote(item.trim()))
    .filter(Boolean);
}

function validateStandardsIndex(agteamosDirectory, reporter) {
  const standardsDirectory = join(agteamosDirectory, "standards");
  const indexPath = join(standardsDirectory, "index.yml");
  if (!existsSync(indexPath)) return;

  let statuses = new Map();
  const metaPath = join(standardsDirectory, "index.meta.yml");
  if (existsSync(metaPath)) {
    const metaContent = readText(metaPath, reporter);
    if (metaContent !== null) statuses = parseIndexMeta(metaContent);
  }

  const content = readText(indexPath, reporter);
  if (content === null) return;

  for (const [lineIndex, line] of content.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = line.match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/);
    if (!match) {
      reporter.report(
        "STANDARDS_INDEX_LINE_INVALID",
        "warning",
        indexPath,
        `Línea ${lineIndex + 1} no reconocida`,
      );
      continue;
    }

    const targets = parseIndexTargets(match[2]);
    if (targets.length === 0) {
      reporter.report(
        "STANDARDS_INDEX_TARGET_MISSING",
        "error",
        indexPath,
        `La keyword "${match[1]}" no tiene carpeta`,
      );
      continue;
    }

    for (const rawTarget of targets) {
      const portableTarget = rawTarget.replaceAll("\\", "/").replace(/^\.?\//, "");
      const target = portableTarget.startsWith("standards/")
        ? portableTarget.slice("standards/".length)
        : portableTarget;
      const cleanTarget = target.replace(/\/+$/, "");
      const topic = cleanTarget.split("/")[0];
      const status = statuses.get(cleanTarget) || statuses.get(topic);
      const targetPath = resolve(standardsDirectory, cleanTarget);
      const escapesStandards = targetPath !== standardsDirectory
        && !targetPath.startsWith(`${standardsDirectory}${sep}`);

      if (
        !cleanTarget
        || isAbsolute(rawTarget)
        || /^[A-Za-z]:[\\/]/.test(rawTarget)
        || escapesStandards
      ) {
        reporter.report(
          "STANDARDS_INDEX_TARGET_INVALID",
          "error",
          indexPath,
          `La keyword "${match[1]}" apunta fuera de standards/: ${rawTarget}`,
        );
      } else if (
        existsSync(targetPath)
        && !statSync(targetPath).isDirectory()
      ) {
        reporter.report(
          "STANDARDS_INDEX_TARGET_INVALID",
          "error",
          indexPath,
          `La keyword "${match[1]}" no apunta a una carpeta: ${rawTarget}`,
        );
      } else if (!existsSync(targetPath) && status !== "pending") {
        reporter.report(
          "STANDARDS_INDEX_TARGET_MISSING",
          "error",
          indexPath,
          `La keyword "${match[1]}" apunta a una carpeta inexistente: ${rawTarget}`,
        );
      }
    }
  }
}

function matchesPortableGlob(value, pattern) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("**", "\u0000")
    .replaceAll("*", "[^/]*")
    .replaceAll("\u0000", ".*");
  return new RegExp(`^${escaped}$`).test(value);
}

function validateProjectLayout(root, agteamosDirectory, reporter) {
  const onboardingPath = join(agteamosDirectory, "onboarding.yml");
  if (!existsSync(onboardingPath)) return;

  const contract = readJson(
    layoutContractPath,
    reporter,
    "PROJECT_LAYOUT_CONTRACT_INVALID",
  );
  if (!contract) return;

  const content = readText(onboardingPath, reporter);
  if (content === null) return;
  const { values } = parseTopLevelYaml(content);
  const profileId = values.get("profile");

  // Proyectos v3 previos al contrato de layout siguen siendo válidos.
  if (!profileId) return;

  for (const field of contract.onboarding.required_fields || []) {
    if (!values.has(field) || values.get(field).trim() === "") {
      reporter.report(
        "ONBOARDING_LAYOUT_FIELD_MISSING",
        "error",
        onboardingPath,
        `Falta el campo de layout "${field}"`,
      );
    }
  }

  const declaredVersion = values.get("layout_contract");
  if (declaredVersion && declaredVersion !== contract.contract_version) {
    reporter.report(
      "ONBOARDING_LAYOUT_VERSION_INVALID",
      "error",
      onboardingPath,
      `layout_contract debe ser "${contract.contract_version}"`,
    );
  }

  const profile = contract.profiles?.[profileId];
  if (!profile) {
    reporter.report(
      "ONBOARDING_PROFILE_INVALID",
      "error",
      onboardingPath,
      `Perfil de inicio desconocido: ${profileId}`,
    );
    return;
  }

  const mode = values.get("mode");
  if (mode && !contract.onboarding.allowed_modes.includes(mode)) {
    reporter.report(
      "ONBOARDING_MODE_INVALID",
      "error",
      onboardingPath,
      `mode no permitido por el contrato: ${mode}`,
    );
  }

  const lifecycle = values.get("lifecycle");
  if (
    lifecycle
    && !contract.onboarding.allowed_lifecycles.includes(lifecycle)
  ) {
    reporter.report(
      "ONBOARDING_LIFECYCLE_INVALID",
      "error",
      onboardingPath,
      `lifecycle no permitido por el contrato: ${lifecycle}`,
    );
  }

  for (const requiredPath of profile.required_files || []) {
    const path = join(root, ...requiredPath.split("/"));
    if (!existsSync(path) || !statSync(path).isFile()) {
      reporter.report(
        "INITIAL_LAYOUT_FILE_MISSING",
        "error",
        path,
        `El perfil ${profileId} requiere ${requiredPath}`,
      );
    }
  }

  const files = filesRecursively(agteamosDirectory)
    .map((path) => normalizePath(relative(root, path)));
  for (const requiredGlob of profile.required_globs || []) {
    if (!files.some((path) => matchesPortableGlob(path, requiredGlob))) {
      reporter.report(
        "INITIAL_LAYOUT_GLOB_MISSING",
        "error",
        join(root, ...requiredGlob.split("/")),
        `El perfil ${profileId} requiere un archivo que coincida con ${requiredGlob}`,
      );
    }
  }

  if (lifecycle === "initialized") {
    const allowed = new Set(profile.allowed_initial_directories || []);
    for (const runtime of Object.values(contract.runtime_artifacts || {})) {
      if (typeof runtime.path === "string" && runtime.path.endsWith("/")) {
        allowed.add(runtime.path.replace(/\/+$/, ""));
      }
    }
    for (const directory of directoriesRecursively(agteamosDirectory)) {
      const relativePath = normalizePath(relative(root, directory));
      const isAllowed = allowed.has(relativePath)
        || [...allowed].some((path) => relativePath.startsWith(`${path}/`));
      if (!isAllowed) {
        reporter.report(
          "INITIAL_LAYOUT_DIRECTORY_UNEXPECTED",
          "error",
          directory,
          `El perfil ${profileId} no materializa esta carpeta durante initialization`,
        );
      }
    }
  }
}

function validateConsumer(root, reporter) {
  const agteamosDirectory = join(root, "agteamos");
  if (!existsSync(agteamosDirectory) || !statSync(agteamosDirectory).isDirectory()) {
    reporter.report(
      "AGTEAMOS_DIRECTORY_MISSING",
      "error",
      agteamosDirectory,
      "No existe la carpeta agteamos/ del proyecto consumidor",
    );
    return;
  }

  const changesDirectory = join(agteamosDirectory, "changes");
  const workflowContract = readJson(
    workflowContractPath,
    reporter,
    "WORKFLOW_CONTRACT_INVALID",
  );
  const taskFiles = filesRecursively(
    changesDirectory,
    (path) => path.endsWith(`${sep}task.yml`) || path.endsWith(`${sep}task.yaml`),
  );
  for (const taskPath of taskFiles) {
    validateTask(taskPath, agteamosDirectory, workflowContract, reporter);
  }

  validateStandardsIndex(agteamosDirectory, reporter);
  validateProjectLayout(root, agteamosDirectory, reporter);
}

function validateManifestPaths(pluginRoot, manifest, manifestPath, reporter) {
  if (manifest.name !== "agteamos") {
    reporter.report(
      "PLUGIN_NAME_INVALID",
      "error",
      manifestPath,
      'plugin.json debe declarar name: "agteamos"',
    );
  }

  if (typeof manifest.version !== "string" || manifest.version.trim() === "") {
    reporter.report(
      "PLUGIN_VERSION_MISSING",
      "error",
      manifestPath,
      "plugin.json debe declarar una versión",
    );
  }

  if (!Array.isArray(manifest.agents) || manifest.agents.length !== EXPECTED_AGENTS) {
    reporter.report(
      "PLUGIN_AGENT_REGISTRY_INVALID",
      "error",
      manifestPath,
      `plugin.json debe registrar exactamente ${EXPECTED_AGENTS} agentes`,
    );
  } else {
    if (new Set(manifest.agents).size !== manifest.agents.length) {
      reporter.report(
        "PLUGIN_AGENT_REGISTRY_INVALID",
        "error",
        manifestPath,
        "plugin.json contiene agentes duplicados",
      );
    }
    for (const entry of manifest.agents) {
      if (typeof entry !== "string") {
        reporter.report(
          "PLUGIN_AGENT_PATH_MISSING",
          "error",
          manifestPath,
          "Cada agente registrado debe ser una ruta",
        );
        continue;
      }
      const path = resolve(pluginRoot, entry);
      if (!existsSync(path) || !statSync(path).isFile()) {
        reporter.report(
          "PLUGIN_AGENT_PATH_MISSING",
          "error",
          manifestPath,
          `El agente registrado no existe: ${entry}`,
        );
      }
    }
  }

  if (
    !Array.isArray(manifest.skills)
    || !manifest.skills.some(
      (entry) => typeof entry === "string"
        && resolve(pluginRoot, entry) === join(pluginRoot, "skills"),
    )
  ) {
    reporter.report(
      "PLUGIN_SKILLS_REGISTRY_INVALID",
      "error",
      manifestPath,
      "plugin.json debe registrar el directorio ./skills/",
    );
  }
}

function validateHooksRegistry(pluginRoot, reporter) {
  const hooksPath = join(pluginRoot, "hooks", "hooks.json");
  if (!existsSync(hooksPath)) return;
  const hooks = readJson(hooksPath, reporter, "HOOKS_REGISTRY_INVALID");
  if (!hooks) return;

  const strings = [];
  function collect(value) {
    if (typeof value === "string") {
      strings.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(collect);
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(collect);
    }
  }
  collect(hooks);

  for (const value of strings) {
    const marker = "${CLAUDE_PLUGIN_ROOT}/";
    if (!value.startsWith(marker)) continue;
    const path = resolve(pluginRoot, value.slice(marker.length));
    if (!existsSync(path)) {
      reporter.report(
        "HOOK_SCRIPT_MISSING",
        "error",
        hooksPath,
        `El script registrado no existe: ${value}`,
      );
    }
  }
}

function stripFencedCode(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, "");
}

function validateMarkdownLinks(pluginRoot, reporter) {
  const markdownFiles = filesRecursively(
    pluginRoot,
    (path) => path.toLowerCase().endsWith(".md"),
  );
  const linkPattern = /!?\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;

  for (const markdownPath of markdownFiles) {
    const content = readText(markdownPath, reporter);
    if (content === null) continue;
    const withoutCode = stripFencedCode(content);
    for (const match of withoutCode.matchAll(linkPattern)) {
      let target = match[1].replace(/^<|>$/g, "");
      if (
        target.startsWith("#")
        || /^[a-z][a-z\d+.-]*:/i.test(target)
        || target.includes("<")
        || target.includes(">")
      ) {
        continue;
      }
      target = target.split("#")[0].split("?")[0];
      if (!target) continue;
      try {
        target = decodeURIComponent(target);
      } catch {
        // La existencia del path codificado se validará tal como fue escrito.
      }
      const linkedPath = resolve(dirname(markdownPath), target);
      if (!existsSync(linkedPath)) {
        reporter.report(
          "MARKDOWN_REFERENCE_MISSING",
          "error",
          markdownPath,
          `La referencia Markdown no existe: ${match[1]}`,
        );
      }
    }
  }
}

function validateMarketplaceRegistry(pluginRoot, manifest, reporter) {
  const candidates = [
    join(pluginRoot, ".claude-plugin", "marketplace.json"),
    join(dirname(pluginRoot), ".claude-plugin", "marketplace.json"),
  ];
  const registryPath = candidates.find((path) => existsSync(path));
  if (!registryPath) return;

  const registry = readJson(registryPath, reporter, "MARKETPLACE_REGISTRY_INVALID");
  if (!registry) return;
  const entries = Array.isArray(registry.plugins) ? registry.plugins : [];
  const entry = entries.find((plugin) => plugin && plugin.name === manifest.name);
  if (!entry) {
    reporter.report(
      "MARKETPLACE_ENTRY_MISSING",
      "error",
      registryPath,
      `El registry no contiene el plugin "${manifest.name}"`,
    );
    return;
  }

  if (entry.version !== manifest.version) {
    reporter.report(
      "MARKETPLACE_VERSION_MISMATCH",
      "error",
      registryPath,
      "La versión del registry no coincide con plugin.json",
    );
  }

  if (typeof entry.source === "string") {
    const sourcePath = resolve(dirname(registryPath), "..", entry.source);
    if (sourcePath !== pluginRoot) {
      reporter.report(
        "MARKETPLACE_SOURCE_MISMATCH",
        "error",
        registryPath,
        `La source "${entry.source}" no apunta al plugin validado`,
      );
    }
  } else {
    reporter.report(
      "MARKETPLACE_SOURCE_MISSING",
      "error",
      registryPath,
      "La entrada del plugin no declara source",
    );
  }
}

function validateWorkflowContract(pluginRoot, reporter) {
  const workflowPath = join(pluginRoot, "contracts", "workflow.json");
  if (!existsSync(workflowPath)) {
    reporter.report(
      "WORKFLOW_CONTRACT_MISSING",
      "error",
      workflowPath,
      "No existe contracts/workflow.json",
    );
    return;
  }
  const workflow = readJson(
    workflowPath,
    reporter,
    "WORKFLOW_CONTRACT_INVALID",
  );
  if (workflow && (
    typeof workflow.contract_version !== "string"
    || !Array.isArray(workflow.compatible_contract_versions)
    || !Array.isArray(workflow.phases)
    || typeof workflow.gates !== "object"
    || typeof workflow.durable_gate_fields !== "object"
    || typeof workflow.risk !== "object"
  )) {
    reporter.report(
      "WORKFLOW_CONTRACT_SHAPE_INVALID",
      "error",
      workflowPath,
      "Workflow requiere versión/compatibilidad, fases, gates, risk y durable_gate_fields",
    );
  }
  if (workflow && (
    workflow.contract_version !== "3"
    || !workflow.compatible_contract_versions?.includes("2")
    || !workflow.phases.some((phase) => phase.id === "ABANDONING")
    || !workflow.phases.some((phase) => phase.id === "ABANDONED")
    || typeof workflow.gates?.abandon_started !== "object"
    || typeof workflow.gates?.abandon_archive !== "object"
  )) {
    reporter.report(
      "WORKFLOW_V3_CONTRACT_INVALID",
      "error",
      workflowPath,
      "Workflow v3 debe leer v2 y definir abandono durable separado",
    );
  }

  const projectLayoutPath = join(pluginRoot, "contracts", "project-layout.json");
  if (!existsSync(projectLayoutPath)) {
    reporter.report(
      "PROJECT_LAYOUT_CONTRACT_MISSING",
      "error",
      projectLayoutPath,
      "No existe contracts/project-layout.json",
    );
    return;
  }
  readJson(
    projectLayoutPath,
    reporter,
    "PROJECT_LAYOUT_CONTRACT_INVALID",
  );

  const portalPath = join(pluginRoot, "contracts", "portal.json");
  if (!existsSync(portalPath)) {
    reporter.report(
      "PORTAL_CONTRACT_MISSING",
      "error",
      portalPath,
      "No existe contracts/portal.json",
    );
    return;
  }
  const portal = readJson(portalPath, reporter, "PORTAL_CONTRACT_INVALID");
  if (portal && (
    typeof portal.contract_version !== "string"
    || !Array.isArray(portal.project_sources)
    || !Array.isArray(portal.platform_public_fields)
    || !Array.isArray(portal.backlog_public_fields)
    || !Array.isArray(portal.excluded)
  )) {
    reporter.report(
      "PORTAL_CONTRACT_SHAPE_INVALID",
      "error",
      portalPath,
      "Portal requiere versión, fuentes y allowlists públicas",
    );
  }

  const contextBudgetPath = join(
    pluginRoot,
    "contracts",
    "context-budget.json",
  );
  if (!existsSync(contextBudgetPath)) {
    reporter.report(
      "CONTEXT_BUDGET_CONTRACT_MISSING",
      "error",
      contextBudgetPath,
      "No existe contracts/context-budget.json",
    );
    return;
  }
  const contextBudget = readJson(
    contextBudgetPath,
    reporter,
    "CONTEXT_BUDGET_CONTRACT_INVALID",
  );
  if (contextBudget && (
    typeof contextBudget.contract_version !== "string"
    || typeof contextBudget.estimation !== "object"
    || typeof contextBudget.tiers !== "object"
  )) {
    reporter.report(
      "CONTEXT_BUDGET_CONTRACT_SHAPE_INVALID",
      "error",
      contextBudgetPath,
      "Context budget requiere versión, estimation y tiers",
    );
  }
}

function validatePlugin(pluginRoot, reporter) {
  validateWorkflowContract(pluginRoot, reporter);

  const manifestPath = join(pluginRoot, ".claude-plugin", "plugin.json");
  const manifest = readJson(manifestPath, reporter, "PLUGIN_MANIFEST_INVALID");
  if (!manifest) return;

  validateManifestPaths(pluginRoot, manifest, manifestPath, reporter);

  const skillFiles = filesRecursively(
    join(pluginRoot, "skills"),
    (path) => path.endsWith(`${sep}SKILL.md`),
  );
  if (skillFiles.length !== EXPECTED_SKILLS) {
    reporter.report(
      "PLUGIN_SKILL_COUNT_INVALID",
      "error",
      join(pluginRoot, "skills"),
      `Se esperaban ${EXPECTED_SKILLS} skills y se encontraron ${skillFiles.length}`,
    );
  }

  const agentFiles = filesRecursively(
    join(pluginRoot, "agents"),
    (path) => path.toLowerCase().endsWith(".md"),
  );
  if (agentFiles.length !== EXPECTED_AGENTS) {
    reporter.report(
      "PLUGIN_AGENT_COUNT_INVALID",
      "error",
      join(pluginRoot, "agents"),
      `Se esperaban ${EXPECTED_AGENTS} agentes y se encontraron ${agentFiles.length}`,
    );
  }

  validateHooksRegistry(pluginRoot, reporter);
  validateMarkdownLinks(pluginRoot, reporter);
  validateMarketplaceRegistry(pluginRoot, manifest, reporter);
}

function determineMode(root) {
  if (existsSync(join(root, ".claude-plugin", "plugin.json"))) {
    return "plugin";
  }
  return "consumer";
}

function buildResult(root, mode, diagnostics, strict) {
  diagnostics.sort((left, right) => (
    left.path.localeCompare(right.path)
    || left.code.localeCompare(right.code)
    || left.message.localeCompare(right.message)
  ));
  const errors = diagnostics.filter((item) => item.severity === "error").length;
  const warnings = diagnostics.filter((item) => item.severity === "warning").length;
  const failed = errors > 0 || (strict && warnings > 0);

  return {
    root,
    mode,
    diagnostics,
    summary: {
      errors,
      warnings,
      total: diagnostics.length,
      strict,
      valid: !failed,
    },
  };
}

function printHuman(result) {
  const label = result.summary.valid ? "OK" : "FAILED";
  console.log(`AgTeamOS validation ${label} (${result.mode})`);
  for (const diagnostic of result.diagnostics) {
    console.log(
      `- ${diagnostic.severity.toUpperCase()} ${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`,
    );
  }
  console.log(
    `Summary: ${result.summary.errors} error(s), ${result.summary.warnings} warning(s)`,
  );
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

  const reporter = createReporter(options.root);
  const mode = determineMode(options.root);
  if (!existsSync(options.root)) {
    reporter.report(
      "ROOT_MISSING",
      "error",
      options.root,
      "La ruta indicada por --root no existe",
    );
  } else if (mode === "plugin") {
    validatePlugin(options.root, reporter);
  } else {
    validateConsumer(options.root, reporter);
  }

  const result = buildResult(
    options.root,
    mode,
    reporter.diagnostics,
    options.strict,
  );
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    printHuman(result);
  }
  process.exitCode = result.summary.valid ? 0 : 1;
}

main();
