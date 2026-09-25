import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";

export function portablePath(path) {
  return path.split(sep).join("/");
}

export function pathFrom(root, path) {
  const result = portablePath(relative(root, path));
  return result || ".";
}

function safeRead(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function filesRecursively(directory, predicate = () => true) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...filesRecursively(path, predicate));
    } else if (entry.isFile() && predicate(path)) {
      files.push(path);
    }
  }
  return files.sort();
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

function matchesPortableGlob(value, pattern) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("**", "\u0000")
    .replaceAll("*", "[^/]*")
    .replaceAll("\u0000", ".*");
  return new RegExp(`^${escaped}$`).test(value);
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

function scalar(value) {
  const clean = unquote(stripYamlComment(value));
  if (clean === "null" || clean === "~") return null;
  if (clean === "true") return true;
  if (clean === "false") return false;
  if (clean.startsWith("[") && clean.endsWith("]")) {
    return clean
      .slice(1, -1)
      .split(",")
      .map((item) => unquote(item.trim()))
      .filter(Boolean);
  }
  return clean;
}

export function parseTopLevelYaml(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#") || /^\s/.test(line)) {
      continue;
    }
    const match = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (match) result[match[1]] = scalar(match[2]);
  }
  return result;
}

export function parseOnboarding(content) {
  const stack = [];
  const records = new Map();

  function record(id) {
    if (!records.has(id)) records.set(id, {});
    return records.get(id);
  }

  for (const rawLine of content.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) continue;
    const match = rawLine.match(/^(\s*)([^:#][^:]*?)\s*:\s*(.*)$/);
    if (!match) continue;
    const indent = match[1].replaceAll("\t", "  ").length;
    const key = unquote(match[2].trim());
    const value = stripYamlComment(match[3]);
    while (stack.length > 0 && stack.at(-1).indent >= indent) stack.pop();
    const parent = stack.map((entry) => entry.key);
    if (value === "") {
      stack.push({ indent, key });
    } else {
      record(parent.join("."))[key] = scalar(value);
    }
  }

  const rootValues = records.get("") || {};
  const items = [...records.entries()]
    .filter(([id, values]) => id && typeof values.status === "string")
    .map(([id, values]) => ({
      id: id.replace(/^artifacts\./, ""),
      status: values.status,
      path: typeof values.path === "string" ? values.path : null,
      trigger: typeof values.trigger === "string" ? values.trigger : null,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const counts = {};
  for (const item of items) {
    counts[item.status] = (counts[item.status] || 0) + 1;
  }
  return {
    layout_contract: typeof rootValues.layout_contract === "string"
      ? rootValues.layout_contract
      : null,
    profile: typeof rootValues.profile === "string" ? rootValues.profile : null,
    mode: typeof rootValues.mode === "string" ? rootValues.mode : null,
    lifecycle: typeof rootValues.lifecycle === "string"
      ? rootValues.lifecycle
      : null,
    items,
    counts,
  };
}

export function emptyOnboarding() {
  return {
    present: false,
    path: "agteamos/onboarding.yml",
    layout_contract: null,
    profile: null,
    mode: null,
    lifecycle: null,
    items: [],
    counts: {},
  };
}

function extractNextAction(content) {
  const heading = /^##\s+Next Action(?:\s*\([^)]*\))?\s*$/im.exec(content);
  if (!heading) return null;
  const section = content
    .slice(heading.index + heading[0].length)
    .split(/\r?\n##\s+/)[0];
  const lines = section
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^>\s?/, "").replace(/^[-*]\s+/, ""))
    .filter(Boolean);
  return lines.length > 0 ? lines.join(" ") : null;
}

function progressMarkers(content) {
  const approved = "(?:approved|aprobados?|aprobadas?)";
  return {
    "approvals.requirements": new RegExp(
      `(?:^|\\n)\\s*(?:[-*]\\s*)?Requirements\\s*:\\s*${approved}\\b`,
      "i",
    ).test(content),
    "approvals.design_deltas": new RegExp(
      `(?:^|\\n)\\s*(?:[-*]\\s*)?Design(?:\\s*\\/\\s*deltas)?\\s*:\\s*${approved}\\b`,
      "i",
    ).test(content),
    next_action: extractNextAction(content) !== null,
    summary_lite: /^##\s+Resumen\s+\(schema:\s*lite\)\s*$/im.test(content),
    regression_test: /^##\s+Test de regresi[oó]n\s*$/im.test(content),
  };
}

const LATE_GATE_IDS = new Set([
  "pre_pr_validate",
  "pre_close_validate",
  "archive",
  "abandon_started",
  "abandon_archive",
]);

function phaseOrder(contract, phase) {
  return contract.phases.find((candidate) => candidate.id === phase)?.order
    ?? Number.POSITIVE_INFINITY;
}

function durableGateState(task, changeDirectory) {
  return {
    qa_pass: task.qa_pass === true,
    validator_pass: task.validator_pass === true,
    review_approved: task.review_approved === true,
    merge_confirmed: task.merge_confirmed === true,
    ticket_reconciled: task.ticket_reconciled === true,
    risk_review_approved: task.risk_review_approved === true,
    reviewed_sha: typeof task.reviewed_sha === "string"
      ? task.reviewed_sha
      : null,
    risk_review_sha: typeof task.risk_review_sha === "string"
      ? task.risk_review_sha
      : null,
    "verify-report.md": existsSync(join(changeDirectory, "verify-report.md")),
    "abandon-record.md": existsSync(join(changeDirectory, "abandon-record.md")),
  };
}

function trackerResultSummary(changeDirectory) {
  const path = join(changeDirectory, "tracker-result.md");
  const content = safeRead(path);
  if (!content) {
    return {
      present: false,
      status: null,
      fingerprint: null,
    };
  }
  return {
    present: true,
    status: content.match(/^- Status:\s*(pending|partial|verified|failed)\s*$/im)?.[1]
      ?.toLowerCase() || "unknown",
    fingerprint: content.match(/^- Fingerprint:\s*([a-f0-9]{64})\s*$/im)?.[1]
      || null,
  };
}

function requiredLateGates(contract, phase, status) {
  const currentOrder = phaseOrder(contract, phase);
  return Object.entries(contract.gates || {})
    .filter(([id, gate]) => (
      LATE_GATE_IDS.has(id)
      && (!Array.isArray(gate.statuses) || gate.statuses.includes(status))
      && (
        !Array.isArray(gate.excluded_phases)
        || !gate.excluded_phases.includes(phase)
      )
      && phaseOrder(contract, gate.phase) <= currentOrder
    ))
    .flatMap(([gateId, gate]) => (
      (gate.requires || []).map((requirement) => ({ gateId, requirement }))
    ));
}

function matchingFiles(changeDirectory, artifact) {
  if (!artifact.endsWith("/*.md")) {
    const path = join(changeDirectory, ...artifact.split("/"));
    return existsSync(path) && statSync(path).isFile() ? [path] : [];
  }
  const directory = join(
    changeDirectory,
    ...artifact.slice(0, -"/*.md".length).split("/"),
  );
  if (!existsSync(directory) || !statSync(directory).isDirectory()) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => join(directory, entry.name))
    .sort();
}

export function emptyContextBudget(contract = null) {
  return {
    contract_version: contract?.contract_version || null,
    metric: "utf8-bytes",
    token_estimate: "ceil(utf8_bytes / 4)",
    telemetry: "estimate-only; not host context-window usage",
    selected_tier: 1,
    active_changes: 0,
    bytes: 0,
    estimated_tokens: 0,
    budget_bytes: contract?.tiers?.["1"]?.budget_bytes || null,
    over_budget: false,
    tiers: [],
    artifacts: [],
  };
}

function collectContextBudget(root, contract) {
  if (!contract) return emptyContextBudget();
  const changesDirectory = join(root, "agteamos", "changes");
  if (!existsSync(changesDirectory)) return emptyContextBudget(contract);
  const artifacts = new Map();
  let selectedTier = 1;
  let activeChanges = 0;

  function addArtifact(path, module, minimumTier, changeId) {
    if (!existsSync(path) || !statSync(path).isFile()) return;
    const content = safeRead(path);
    if (content === null) return;
    const portable = pathFrom(root, path);
    const current = artifacts.get(portable);
    if (current) {
      current.minimum_tier = Math.min(current.minimum_tier, minimumTier);
      if (!current.change_ids.includes(changeId)) current.change_ids.push(changeId);
      return;
    }
    const bytes = Buffer.byteLength(content, "utf8");
    artifacts.set(portable, {
      path: portable,
      module,
      minimum_tier: minimumTier,
      bytes,
      estimated_tokens: Math.ceil(bytes / 4),
      change_ids: [changeId],
    });
  }

  function addReference(reference, changeId) {
    const clean = reference.replace(/[),.;:'"]+$/, "");
    const candidate = resolve(root, ...clean.split("/"));
    if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return;
    const module = clean.startsWith("agteamos/standards/")
      ? "standard"
      : "architecture-decision";
    const tier = module === "standard" ? 2 : 3;
    if (!existsSync(candidate)) return;
    if (statSync(candidate).isDirectory()) {
      for (const path of filesRecursively(
        candidate,
        (entry) => /\.(?:md|ya?ml|json)$/i.test(entry),
      )) {
        addArtifact(path, module, tier, changeId);
      }
    } else {
      addArtifact(candidate, module, tier, changeId);
    }
  }

  const directories = readdirSync(changesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "archive")
    .map((entry) => join(changesDirectory, entry.name))
    .sort();
  for (const directory of directories) {
    const taskPath = ["task.yml", "task.yaml"]
      .map((name) => join(directory, name))
      .find((path) => existsSync(path));
    if (!taskPath) continue;
    activeChanges += 1;
    const taskContent = safeRead(taskPath) || "";
    const task = parseTopLevelYaml(taskContent);
    const changeId = String(task.id || basename(directory));
    const parsedTier = Number(task.context_tier);
    selectedTier = Math.max(
      selectedTier,
      Number.isInteger(parsedTier) && parsedTier >= 1 && parsedTier <= 3
        ? parsedTier
        : task.schema === "lite" ? 1 : 2,
    );
    addArtifact(taskPath, "task-state", 1, changeId);
    const progressPath = join(directory, "progress.md");
    addArtifact(progressPath, "task-state", 1, changeId);
    addArtifact(
      join(directory, "abandon-record.md"),
      "task-state",
      1,
      changeId,
    );
    const specsDirectory = join(directory, "specs");
    for (const path of filesRecursively(
      specsDirectory,
      (entry) => entry.toLowerCase().endsWith(".md"),
    )) {
      addArtifact(path, "change-spec", 2, changeId);
    }
    const briefPath = join(directory, "brief.md");
    addArtifact(briefPath, "change-spec", 2, changeId);

    const domains = Array.isArray(task.domains)
      ? task.domains
      : typeof task.domains === "string" && task.domains
        ? [task.domains]
        : [];
    for (const domain of domains) {
      if (!/^[A-Za-z0-9._-]+$/.test(domain)) continue;
      addArtifact(
        join(root, "agteamos", "specs", `${domain}.md`),
        "domain-spec",
        2,
        changeId,
      );
    }

    const referenceSource = [
      taskContent,
      safeRead(progressPath) || "",
      safeRead(join(specsDirectory, "design.md")) || "",
    ].join("\n");
    const pattern = /agteamos\/(?:standards|architecture\/adr|decisions)\/[A-Za-z0-9_./-]+/g;
    for (const match of referenceSource.matchAll(pattern)) {
      addReference(match[0], changeId);
    }
  }

  const artifactList = [...artifacts.values()]
    .map((artifact) => ({
      ...artifact,
      change_ids: artifact.change_ids.sort(),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const tiers = [1, 2, 3].map((tier) => {
    const included = artifactList.filter(
      (artifact) => artifact.minimum_tier <= tier,
    );
    const modules = [...new Set(included.map((artifact) => artifact.module))]
      .sort()
      .map((module) => {
        const scoped = included.filter((artifact) => artifact.module === module);
        const bytes = scoped.reduce((sum, artifact) => sum + artifact.bytes, 0);
        return {
          id: module,
          artifacts: scoped.length,
          bytes,
          estimated_tokens: Math.ceil(bytes / 4),
        };
      });
    const bytes = included.reduce((sum, artifact) => sum + artifact.bytes, 0);
    const budgetBytes = contract.tiers?.[String(tier)]?.budget_bytes || null;
    return {
      tier,
      artifacts: included.length,
      bytes,
      estimated_tokens: Math.ceil(bytes / 4),
      budget_bytes: budgetBytes,
      over_budget: budgetBytes === null ? false : bytes > budgetBytes,
      modules,
    };
  });
  const selected = tiers.find((tier) => tier.tier === selectedTier) || tiers[0];
  return {
    contract_version: contract.contract_version,
    metric: contract.estimation?.metric || "utf8-bytes",
    token_estimate: contract.estimation?.estimated_tokens_formula
      || "ceil(utf8_bytes / 4)",
    telemetry: contract.estimation?.telemetry
      || "estimate-only; not host context-window usage",
    selected_tier: selectedTier,
    active_changes: activeChanges,
    bytes: selected.bytes,
    estimated_tokens: selected.estimated_tokens,
    budget_bytes: selected.budget_bytes,
    over_budget: selected.over_budget,
    tiers,
    artifacts: artifactList,
  };
}

function explicitPhase(progress, phaseIds) {
  const candidates = [];
  for (const pattern of [
    /(?:^|\n)\s*(?:[-*>]\s*)?(?:Phase|Fase)\s*:\s*([A-Z][A-Z_]*)\b/gi,
    /(?:^|\n)\s*(?:[-*>]\s*)?Estado\s*:\s*([A-Z][A-Z_]*)\b/gi,
  ]) {
    for (const match of progress.matchAll(pattern)) {
      candidates.push(match[1].toUpperCase());
    }
  }
  return candidates.reverse().find((candidate) => phaseIds.has(candidate)) || null;
}

function inferPhase({
  status,
  branch,
  progress,
  designReady,
  phaseIds,
  declaredPhase,
}) {
  if (declaredPhase && phaseIds.has(declaredPhase)) return declaredPhase;
  if (!progress) return "TRACKING";
  if (!branch) return "BRANCH";
  if (!designReady) return "DESIGN";
  if (status === "abandoned") return "ABANDONED";
  if (status === "done") return "ARCHIVE";
  if (status === "in_review") {
    const explicit = explicitPhase(progress, phaseIds);
    return ["PR_REVIEW", "PRE_CLOSE_VALIDATE", "MERGE"].includes(explicit)
      ? explicit
      : "PR_REVIEW";
  }
  if (status !== "in_progress") return "TRACKING";
  const explicit = explicitPhase(progress, phaseIds);
  return ["IMPLEMENT", "RECONCILE", "QA", "PRE_PR_VALIDATE"].includes(explicit)
    ? explicit
    : "IMPLEMENT";
}

function collectChange(changeDirectory, root, contract, diagnose) {
  const taskPath = ["task.yml", "task.yaml"]
    .map((name) => join(changeDirectory, name))
    .find((path) => existsSync(path));
  if (!taskPath) return null;

  let task;
  try {
    task = parseTopLevelYaml(readFileSync(taskPath, "utf8"));
  } catch (error) {
    diagnose(
      "TASK_READ_FAILED",
      "error",
      taskPath,
      `No se pudo leer task.yml: ${error.message}`,
      basename(changeDirectory),
    );
    return null;
  }

  const blockingCodes = [];
  const id = typeof task.id === "string" && task.id ? task.id : basename(changeDirectory);
  const title = typeof task.title === "string" && task.title
    ? task.title
    : basename(changeDirectory);
  const schema = typeof task.schema === "string" ? task.schema : null;
  const status = typeof task.status === "string" ? task.status : null;
  const workflowContract = typeof task.workflow_contract === "string"
    ? task.workflow_contract
    : null;
  const currentWorkflow = workflowContract === contract.contract_version;
  const risk = typeof task.risk === "string" ? task.risk : null;
  const riskReason = typeof task.risk_reason === "string"
    ? task.risk_reason
    : null;
  const branch = typeof task.branch === "string" && task.branch ? task.branch : null;
  const declaredPhase = typeof task.phase === "string"
    ? task.phase.toUpperCase()
    : null;
  const allowedStatuses = new Set(contract.task_statuses);
  const phaseIds = new Set(contract.phases.map((phase) => phase.id));

  if (!contract.schemas[schema]) {
    blockingCodes.push("TASK_SCHEMA_INVALID");
    diagnose(
      "TASK_SCHEMA_INVALID",
      "error",
      taskPath,
      `Schema ausente o no permitido: ${schema ?? "(ausente)"}`,
      id,
    );
  }
  if (!allowedStatuses.has(status)) {
    blockingCodes.push("TASK_STATUS_INVALID");
    diagnose(
      "TASK_STATUS_INVALID",
      "error",
      taskPath,
      `Estado ausente o no permitido: ${status ?? "(ausente)"}`,
      id,
    );
  }
  if (declaredPhase && !phaseIds.has(declaredPhase)) {
    blockingCodes.push("TASK_PHASE_INVALID");
    diagnose(
      "TASK_PHASE_INVALID",
      "error",
      taskPath,
      `Fase desconocida: ${declaredPhase}`,
      id,
    );
  }
  if (!branch) {
    blockingCodes.push("TASK_BRANCH_MISSING");
    diagnose(
      "TASK_BRANCH_MISSING",
      "error",
      taskPath,
      "Falta task.branch para superar el gate BRANCH",
      id,
    );
  }

  const schemaContract = contract.schemas[schema] || {
    required_artifacts: ["task.yml", "progress.md"],
    required_progress_markers: ["next_action"],
  };
  const readyArtifacts = [];
  const missingArtifacts = [];
  for (const artifact of schemaContract.required_artifacts) {
    const matches = artifact === "task.yml"
      ? [taskPath]
      : matchingFiles(changeDirectory, artifact);
    if (matches.length === 0) {
      missingArtifacts.push(artifact);
    } else {
      readyArtifacts.push(...matches.map((path) => pathFrom(changeDirectory, path)));
    }
  }
  if (missingArtifacts.length > 0) {
    blockingCodes.push("REQUIRED_ARTIFACT_MISSING");
    diagnose(
      "REQUIRED_ARTIFACT_MISSING",
      "error",
      changeDirectory,
      `Faltan artefactos de schema ${schema ?? "desconocido"}: ${missingArtifacts.join(", ")}`,
      id,
    );
  }
  for (const forbidden of schemaContract.forbidden_artifacts || []) {
    const matches = matchingFiles(changeDirectory, forbidden);
    if (matches.length > 0) {
      blockingCodes.push("FORBIDDEN_ARTIFACT_PRESENT");
      diagnose(
        "FORBIDDEN_ARTIFACT_PRESENT",
        "error",
        matches[0],
        `Schema ${schema} no permite ${forbidden}`,
        id,
      );
    }
  }

  const progressPath = join(changeDirectory, "progress.md");
  const progress = safeRead(progressPath) || "";
  const markers = progressMarkers(progress);
  const missingMarkers = (schemaContract.required_progress_markers || [])
    .filter((marker) => !markers[marker]);
  if (missingMarkers.length > 0) {
    blockingCodes.push("PROGRESS_GATE_MISSING");
    diagnose(
      "PROGRESS_GATE_MISSING",
      "error",
      progressPath,
      `Faltan señales durables: ${missingMarkers.join(", ")}`,
      id,
    );
  }
  if (status === "pending" && missingArtifacts.length === 0 && missingMarkers.length === 0) {
    diagnose(
      "TASK_STATUS_NOT_STARTED",
      "info",
      taskPath,
      "Los gates están listos, pero task.yml continúa en pending",
      id,
    );
  }
  if (status === "done" || status === "abandoned") {
    blockingCodes.push(status === "done"
      ? "DONE_CHANGE_NOT_ARCHIVED"
      : "ABANDONED_CHANGE_NOT_ARCHIVED");
    diagnose(
      status === "done"
        ? "DONE_CHANGE_NOT_ARCHIVED"
        : "ABANDONED_CHANGE_NOT_ARCHIVED",
      "warning",
      changeDirectory,
      status === "done"
        ? "Una tarea done aún está en changes/ y debe completar ARCHIVE"
        : "Una tarea abandoned aún está en changes/ y debe archivarse de forma preservativa",
      id,
    );
  }

  const designMarkers = schema === "full"
    ? markers["approvals.requirements"] && markers["approvals.design_deltas"]
    : markers.summary_lite && markers.regression_test;
  const designReady = missingArtifacts.length === 0 && Boolean(designMarkers);
  const phase = inferPhase({
    status,
    branch,
    progress,
    designReady,
    phaseIds,
    declaredPhase,
  });
  const compatiblePhases = contract.status_phase_compatibility?.[status] || [];
  if (!compatiblePhases.includes(phase)) {
    blockingCodes.push("TASK_STATUS_PHASE_INCOMPATIBLE");
    diagnose(
      "TASK_STATUS_PHASE_INCOMPATIBLE",
      "error",
      taskPath,
      `Status ${status ?? "(ausente)"} no es compatible con fase ${phase}`,
      id,
    );
  }

  if (currentWorkflow) {
    const allowedRisks = contract.risk?.allowed_levels || [];
    if (!allowedRisks.includes(risk)) {
      blockingCodes.push("TASK_RISK_INVALID");
      diagnose(
        "TASK_RISK_INVALID",
        "error",
        taskPath,
        `Risk ausente o no permitido: ${risk ?? "(ausente)"}`,
        id,
      );
    }
    if (!riskReason) {
      blockingCodes.push("TASK_RISK_REASON_MISSING");
      diagnose(
        "TASK_RISK_REASON_MISSING",
        "error",
        taskPath,
        "Falta risk_reason sustentado",
        id,
      );
    }
    if (typeof task.risk_review_approved !== "boolean") {
      blockingCodes.push("RISK_REVIEW_FIELD_INVALID");
      diagnose(
        "RISK_REVIEW_FIELD_INVALID",
        "error",
        taskPath,
        "risk_review_approved debe existir como booleano",
        id,
      );
    }
    for (const field of ["reviewed_sha", "risk_review_sha"]) {
      if (!Object.hasOwn(task, field)) {
        blockingCodes.push("REVIEW_SHA_FIELD_MISSING");
        diagnose(
          "REVIEW_SHA_FIELD_MISSING",
          "error",
          taskPath,
          `Falta ${field}; usar null hasta review`,
          id,
        );
      }
    }
    const reviewOrder = phaseOrder(contract, contract.risk?.review_phase);
    if (
      status !== "abandoned"
      && !["ABANDONING", "ABANDONED"].includes(phase)
      && phaseOrder(contract, phase) >= reviewOrder
    ) {
      const reviewedSha = typeof task.reviewed_sha === "string"
        ? task.reviewed_sha
        : "";
      if (!/^[a-f0-9]{7,64}$/i.test(reviewedSha)) {
        blockingCodes.push("REVIEWED_SHA_INVALID");
        diagnose(
          "REVIEWED_SHA_INVALID",
          "error",
          taskPath,
          "PRE_CLOSE_VALIDATE requiere reviewed_sha válido",
          id,
        );
      }
      if ((contract.risk?.additional_review_levels || []).includes(risk)) {
        if (task.risk_review_approved !== true) {
          blockingCodes.push("RISK_REVIEW_MISSING");
          diagnose(
            "RISK_REVIEW_MISSING",
            "error",
            taskPath,
            `${risk} requiere review adicional aprobado`,
            id,
          );
        }
        if (
          typeof task.risk_review_sha !== "string"
          || task.risk_review_sha !== reviewedSha
        ) {
          blockingCodes.push("RISK_REVIEW_SHA_MISMATCH");
          diagnose(
            "RISK_REVIEW_SHA_MISMATCH",
            "error",
            taskPath,
            "risk_review_sha no coincide con reviewed_sha",
            id,
          );
        }
      }
    }
  }

  const gateState = durableGateState(task, changeDirectory);
  const missingGates = requiredLateGates(contract, phase, status)
    .filter(({ requirement }) => !gateState[requirement]);
  for (const { gateId, requirement } of missingGates) {
    blockingCodes.push("WORKFLOW_GATE_MISSING");
    diagnose(
      "WORKFLOW_GATE_MISSING",
      "error",
      taskPath,
      `Gate ${gateId} requiere ${requirement}`,
      id,
    );
  }
  return {
    id,
    title,
    schema,
    status,
    phase,
    risk,
    risk_reason: riskReason,
    gates: gateState,
    tracker_result: trackerResultSummary(changeDirectory),
    missing_gates: missingGates.map(
      ({ gateId, requirement }) => `${gateId}:${requirement}`,
    ),
    ready_artifacts: [...new Set(readyArtifacts)].sort(),
    missing_artifacts: missingArtifacts.sort(),
    next_action: extractNextAction(progress),
    blocked: blockingCodes.length > 0,
  };
}

export function initialSummary(contract) {
  return {
    total_changes: 0,
    blocked_changes: 0,
    ready: true,
    by_status: Object.fromEntries(contract.task_statuses.map((status) => [status, 0])),
    by_phase: Object.fromEntries(contract.phases.map((phase) => [phase.id, 0])),
  };
}

export function buildPluginResult(root, contract, contextBudgetContract = null) {
  return {
    contract_version: contract.contract_version,
    project: {
      root,
      name: basename(root),
      mode: "plugin",
      agteamos_path: null,
    },
    onboarding: emptyOnboarding(),
    changes: [],
    context_budget: emptyContextBudget(contextBudgetContract),
    summary: initialSummary(contract),
    diagnostics: [{
      code: "PLUGIN_MODE_USE_VALIDATOR",
      severity: "info",
      path: ".",
      message: "Este root es el plugin; valida su contrato con node scripts/agteamos-validate.mjs --root .",
    }],
  };
}

export function collectProjectState(
  root,
  contract,
  layoutContract = null,
  contextBudgetContract = null,
) {
  const diagnostics = [];
  const changes = [];
  const agteamosDirectory = join(root, "agteamos");
  const onboardingPath = join(agteamosDirectory, "onboarding.yml");
  let onboarding = emptyOnboarding();

  function diagnose(code, severity, path, message, changeId = null) {
    diagnostics.push({
      code,
      severity,
      path: pathFrom(root, path),
      message,
      ...(changeId === null ? {} : { change_id: changeId }),
    });
  }

  if (!existsSync(agteamosDirectory) || !statSync(agteamosDirectory).isDirectory()) {
    diagnose(
      "AGTEAMOS_DIRECTORY_MISSING",
      "error",
      agteamosDirectory,
      "No existe la carpeta agteamos/ del proyecto consumidor",
    );
  }

  if (existsSync(onboardingPath)) {
    const raw = safeRead(onboardingPath);
    if (raw === null) {
      diagnose(
        "ONBOARDING_READ_FAILED",
        "warning",
        onboardingPath,
        "No se pudo leer onboarding.yml",
      );
    } else {
      onboarding = {
        present: true,
        path: pathFrom(root, onboardingPath),
        ...parseOnboarding(raw),
      };
    }
  } else {
    diagnose(
      "ONBOARDING_MISSING",
      "warning",
      onboardingPath,
      "No existe agteamos/onboarding.yml",
    );
  }

  if (layoutContract && onboarding.profile) {
    const profile = layoutContract.profiles?.[onboarding.profile];
    if (!profile) {
      diagnose(
        "ONBOARDING_PROFILE_INVALID",
        "error",
        onboardingPath,
        `Perfil de inicio desconocido: ${onboarding.profile}`,
      );
    } else {
      for (const requiredPath of profile.required_files || []) {
        const path = join(root, ...requiredPath.split("/"));
        if (!existsSync(path) || !statSync(path).isFile()) {
          diagnose(
            "INITIAL_LAYOUT_FILE_MISSING",
            "error",
            path,
            `El perfil ${onboarding.profile} requiere ${requiredPath}`,
          );
        }
      }
      const files = filesRecursively(agteamosDirectory)
        .map((path) => pathFrom(root, path));
      for (const requiredGlob of profile.required_globs || []) {
        if (!files.some((path) => matchesPortableGlob(path, requiredGlob))) {
          diagnose(
            "INITIAL_LAYOUT_GLOB_MISSING",
            "error",
            join(root, ...requiredGlob.split("/")),
            `El perfil ${onboarding.profile} requiere ${requiredGlob}`,
          );
        }
      }
      if (onboarding.lifecycle === "initialized") {
        const allowed = new Set(profile.allowed_initial_directories || []);
        for (const runtime of Object.values(layoutContract.runtime_artifacts || {})) {
          if (typeof runtime.path === "string" && runtime.path.endsWith("/")) {
            allowed.add(runtime.path.replace(/\/+$/, ""));
          }
        }
        for (const directory of directoriesRecursively(agteamosDirectory)) {
          const relativePath = pathFrom(root, directory);
          const isAllowed = allowed.has(relativePath)
            || [...allowed].some((path) => relativePath.startsWith(`${path}/`));
          if (!isAllowed) {
            diagnose(
              "INITIAL_LAYOUT_DIRECTORY_UNEXPECTED",
              "error",
              directory,
              `El perfil ${onboarding.profile} no materializa esta carpeta al iniciar`,
            );
          }
        }
      }
    }
  }

  const changesDirectory = join(agteamosDirectory, "changes");
  const changeDirectories = existsSync(changesDirectory)
    && statSync(changesDirectory).isDirectory()
    ? readdirSync(changesDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "archive")
      .map((entry) => join(changesDirectory, entry.name))
      .sort()
    : [];
  for (const directory of changeDirectories) {
    const change = collectChange(directory, root, contract, diagnose);
    if (change) changes.push(change);
  }

  changes.sort((left, right) => left.id.localeCompare(right.id));
  diagnostics.sort((left, right) => (
    left.path.localeCompare(right.path)
    || left.code.localeCompare(right.code)
    || left.message.localeCompare(right.message)
  ));

  const summary = initialSummary(contract);
  summary.total_changes = changes.length;
  for (const change of changes) {
    if (change.blocked) summary.blocked_changes += 1;
    if (Object.hasOwn(summary.by_status, change.status)) {
      summary.by_status[change.status] += 1;
    }
    if (Object.hasOwn(summary.by_phase, change.phase)) {
      summary.by_phase[change.phase] += 1;
    }
  }
  summary.ready = summary.blocked_changes === 0
    && !diagnostics.some((diagnostic) => diagnostic.severity === "error");

  return {
    contract_version: contract.contract_version,
    project: {
      root,
      name: basename(root),
      mode: "consumer",
      agteamos_path: pathFrom(root, agteamosDirectory),
    },
    onboarding,
    changes,
    context_budget: collectContextBudget(root, contextBudgetContract),
    summary,
    diagnostics,
  };
}

function parseMarkdownTable(content) {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length - 2; index += 1) {
    if (!lines[index].includes("|")) continue;
    if (!/^\s*\|?[\s:|-]+\|?\s*$/.test(lines[index + 1])) continue;
    const split = (line) => line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((value) => value.trim());
    const headers = split(lines[index]);
    const rows = [];
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      if (!lines[rowIndex].includes("|")) break;
      const values = split(lines[rowIndex]);
      rows.push(Object.fromEntries(headers.map((header, i) => [header, values[i] || ""])));
    }
    return rows;
  }
  return [];
}

function firstValue(record, keys) {
  for (const key of keys) {
    if (typeof record[key] === "string" && record[key]) return record[key];
  }
  return "";
}

function publicBacklogItem(item) {
  return {
    id: firstValue(item, ["#", "ID", "Id", "id"]),
    date: firstValue(item, ["Fecha", "Date", "date"]),
    title: firstValue(item, ["Idea", "Title", "Título", "title"]),
    origin: firstValue(item, ["Origen", "Origin", "origin"]),
    priority: firstValue(item, ["Prioridad", "Priority", "priority"]),
    status: firstValue(item, ["Estado", "Status", "status"]),
    ticket: firstValue(item, ["Ticket", "Work Item", "Issue", "ticket"]),
  };
}

function collectArchive(root, contract) {
  const archiveDirectory = join(root, "agteamos", "changes", "archive");
  if (!existsSync(archiveDirectory)) return [];
  const taskFiles = filesRecursively(
    archiveDirectory,
    (path) => /[\\/]task\.ya?ml$/i.test(path),
  );
  return taskFiles.map((taskPath) => {
    const directory = resolve(taskPath, "..");
    const task = parseTopLevelYaml(safeRead(taskPath) || "");
    const progress = safeRead(join(directory, "progress.md")) || "";
    return {
      id: task.id || basename(directory),
      title: task.title || basename(directory),
      schema: task.schema || null,
      status: task.status || "done",
      phase: task.status === "abandoned" ? "ABANDONED" : "DONE",
      risk: task.risk || null,
      reviewed_sha: task.reviewed_sha || null,
      risk_review_sha: task.risk_review_sha || null,
      next_action: extractNextAction(progress),
      tracker_result: trackerResultSummary(directory),
      abandon_record_present: existsSync(join(directory, "abandon-record.md")),
      report_present: existsSync(join(directory, "report.html")),
      path: pathFrom(root, directory),
    };
  }).sort((left, right) => String(left.id).localeCompare(String(right.id)));
}

function countMarkdown(directory) {
  return filesRecursively(directory, (path) => path.toLowerCase().endsWith(".md")).length;
}

function collectStandards(root) {
  const directory = join(root, "agteamos", "standards");
  if (!existsSync(directory)) return { present: false, topics: 0, statuses: {} };
  const meta = safeRead(join(directory, "index.meta.yml")) || "";
  const statuses = {};
  let topic = null;
  for (const line of meta.split(/\r?\n/)) {
    const topicMatch = line.match(/^([\w-]+)\s*:\s*$/);
    if (topicMatch) {
      topic = topicMatch[1];
      continue;
    }
    const statusMatch = line.match(/^\s+status\s*:\s*(.+?)\s*$/);
    if (topic && statusMatch) statuses[topic] = unquote(statusMatch[1]);
  }
  const topics = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(directory, entry.name, "README.md")))
    .length;
  return { present: true, topics, statuses };
}

function collectLocalHealth(root) {
  const agteamos = join(root, "agteamos");
  const specsDirectory = join(agteamos, "specs");
  const deployLog = join(agteamos, "devops", "deploy_log.csv");
  const deployRows = (safeRead(deployLog) || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(1).length;
  return {
    standards: collectStandards(root),
    specs: {
      present: existsSync(specsDirectory),
      documents: existsSync(specsDirectory)
        ? readdirSync(specsDirectory, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith(".md")).length
        : 0,
    },
    quality: {
      present: existsSync(join(agteamos, "quality")),
      reports: countMarkdown(join(agteamos, "quality")),
      debt_trend_present: existsSync(join(agteamos, "quality", "debt-trend.yml")),
    },
    incidents: {
      post_mortems: countMarkdown(join(agteamos, "incidents", "post-mortems")),
      runbooks: countMarkdown(join(agteamos, "incidents", "runbooks")),
      playbooks: countMarkdown(join(agteamos, "incidents", "playbooks")),
    },
    security: {
      reports: countMarkdown(join(agteamos, "security")),
    },
    operations: {
      infrastructure: existsSync(join(agteamos, "devops", "INFRASTRUCTURE.md")),
      dora: existsSync(join(agteamos, "devops", "DORA_METRICS.md")),
      slo: existsSync(join(agteamos, "devops", "SLO.md")),
      deploy_rows: deployRows,
    },
  };
}

export function collectPortalProject(
  root,
  contract,
  layoutContract,
  registryEntry = {},
  contextBudgetContract = null,
) {
  const base = collectProjectState(
    root,
    contract,
    layoutContract,
    contextBudgetContract,
  );
  const platformPath = join(root, "agteamos", "platform.yml");
  const platform = parseTopLevelYaml(safeRead(platformPath) || "");
  const backlogPath = join(root, "agteamos", "product", "backlog.md");
  const backlogContent = safeRead(backlogPath);
  const dashboardPath = join(root, "agteamos", "dashboard.html");
  return {
    ...base,
    registry: {
      name: registryEntry.name || base.project.name,
      aliases: Array.isArray(registryEntry.aliases) ? registryEntry.aliases : [],
      last_active: registryEntry.last_active || null,
    },
    platform: {
      repo_host: platform.repo_host ?? registryEntry.repo_host ?? null,
      tracker: platform.tracker ?? registryEntry.tracker ?? null,
      branch_strategy: platform.branch_strategy ?? null,
      ci_target: platform.ci_target ?? null,
      deploy_target: platform.deploy_target ?? null,
      reviewed: typeof platform.reviewed === "boolean"
        ? platform.reviewed
        : Boolean(registryEntry.reviewed),
    },
    backlog: {
      present: backlogContent !== null,
      path: pathFrom(root, backlogPath),
      items: backlogContent === null
        ? []
        : parseMarkdownTable(backlogContent).map(publicBacklogItem),
    },
    archive: collectArchive(root, contract),
    health: collectLocalHealth(root),
    files: {
      root,
      dashboard: existsSync(dashboardPath) ? dashboardPath : null,
      project_context: existsSync(join(root, "agteamos", "architecture", "PROJECT_CONTEXT.md"))
        ? join(root, "agteamos", "architecture", "PROJECT_CONTEXT.md")
        : null,
      backlog: backlogContent === null ? null : backlogPath,
    },
  };
}
