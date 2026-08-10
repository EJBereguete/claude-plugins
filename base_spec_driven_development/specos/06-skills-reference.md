# Skills Reference

Complete reference for all `/spec-os-*` skills. For workflow patterns and when to use each skill, see [Workflow Overview](01-workflow-overview.md).

## Quick Reference

### Setup skills — run once per project

| Skill | Purpose |
|-------|---------|
| `/spec-os-product` | Create product documentation (`docs/`: mission, roadmap, design) |
| `/spec-os-init` | Install spec-os framework structure in a project |
| `/spec-os-tracker` | Configure tracker integration (ADO, GitHub) for a project |

### Portfolio skill — Claude Desktop personal skill

| Skill | Purpose |
|-------|---------|
| `/spec-os-explore` | Analyze a business initiative across multiple repos → generate context packages |

### Phase 1 — Design skills *(Team Lead / Product Owner)*

| Skill | Purpose |
|-------|---------|
| `/spec-os-brainstorm` | Analyze an idea → create `brief.md`, resolve Feature in tracker |
| `/spec-os-design` | Write technical spec from `brief.md` |
| `/spec-os-plan` | Decompose spec into User Stories and atomic tasks |

### Phase 2 — Implementation skills *(Developer)*

| Skill | Purpose |
|-------|---------|
| `/spec-os-implement` | Execute one task (one session, one commit) |
| `/spec-os-verify` | Quality gate per User Story → PR |
| `/spec-os-doc` | Update user documentation (conditional on `doc-impact`) |
| `/spec-os-sync` | Sync lessons to knowledge base (always last in chain) |

### Phase 3 — Framework quality

| Skill | Purpose |
|-------|---------|
| `/spec-os-audit` | Capture framework quality signals after a session |

### Bug path

| Skill | Purpose |
|-------|---------|
| `/spec-os-bug` | Analyze a bug → route to simple or complex path |

### Maintenance

| Skill | Purpose |
|-------|---------|
| `/spec-os-discover` | Scan codebase → extract coding conventions into standards |
| `/spec-os-inject` | Load relevant standards for the current task (called by implement) |
| `/spec-os-standard` | Update or create a standard |
| `/spec-os-abandon` | Close a feature without completing it |
| `/spec-os-clean` | Clean up knowledge base + archive completed features (release close) |

---

## Skill Reference

---

### `/spec-os-init`

Install spec-os in a new project, adopt it in an existing one, or update an installed version.

**Syntax:**
```text
/spec-os-init [mode]
```

**Arguments:**
| Argument | Required | Values |
|----------|----------|--------|
| `mode` | No | `initialize` \| `adopt` \| `update` — auto-detected if omitted |

**Modes:**

**Initialize** — new project, no existing code:
- Optionally reads `docs/mission.md` (if `/spec-os-product` was run) to seed project description
- Asks: project name, description, stack, tracker type, cadence format, domains
- Creates complete `spec-os/` structure, `.claude/agents/`, and `CLAUDE.md`

**Adopt** — existing project:
- Scans codebase (namespaces, modules, bounded contexts) to propose domains
- Seeds domain spec stubs from existing code
- Proposes a replacement `CLAUDE.md` for dev approval — does not overwrite without explicit confirmation

**Update** — spec-os already installed:
- Reads `spec-os/version` to detect current installation
- Can add new domains or update `config.yaml` schema

**What it creates:**
```
CLAUDE.md
spec-os/config.yaml
spec-os/version
spec-os/GETTING-STARTED.md
spec-os/standards/index.yml
spec-os/standards/global/     (naming, commits, security, pr-template)
spec-os/standards/backend/    (architecture, patterns, testing, error-handling, {stack})
spec-os/standards/frontend/   (components, state, testing, {stack})  [if frontend]
spec-os/specs/_index.md
spec-os/specs/{domain}/spec.md  (one per declared domain)
spec-os/specs/knowledge-base.md
spec-os/changes/              (empty)
```

**Example:**
```text
You: /spec-os-init

AI:  Detecting mode... No spec-os/ found. Mode: INITIALIZE

     Project name:
     Description:
     Stack: dotnet | python | odoo | nextjs | react | other
     Tracker: ado | github
     Cadence: sprint | milestone | quarter | custom

You: Equip360 | Equipment management system | dotnet + nextjs | ado | sprint

AI:  ADO organization URL:
     ADO project name:
     Repo name:

You: https://dev.azure.com/company | Equip360 | equip360-api

AI:  Domains?

You: equipment, maintenance, reporting, users

AI:  Will create: [list] Proceed? [y/n]

You: y

AI:  spec-os v1.0.0 installed.
     Next: review config.yaml, run /spec-os-discover.
```

**Tips:**
- Run `/spec-os-product` first for full product context — if you skip it, init will offer to invoke it at the end when `docs/mission.md` is missing
- After init, run `/spec-os-discover` to replace standard stubs with your actual conventions
- Use `update` mode to add domains as your project grows

---

### `/spec-os-tracker`

Set up and manage tracker integration for a project. Creates `spec-os/tracker/` with the adapter config and MCP mappings. Run after `/spec-os-init` or whenever tracker settings need updating.

**Syntax:**
```text
/spec-os-tracker
```

**What it does:**
- Asks for tracker type: `ado`, `github`, or `none`
- Collects connection details (organization URL, project name, repo name)
- Creates `spec-os/tracker/config.yaml` (type) and `spec-os/tracker/{type}.md` (full adapter with MCP mappings and required env vars)
- Validates the connection if credentials are available

**What it creates:**
```
spec-os/tracker/
├── config.yaml     ← tracker type declaration
└── ado.md          ← or github.md — adapter with MCP operation mappings
```

**Tips:**
- Re-run to update connection details or switch tracker type
- The adapter file (`ado.md` / `github.md`) documents the required environment variables for MCP authentication
- If `spec-os/tracker/` does not exist, all skills skip tracker operations gracefully

---

### `/spec-os-product`

Create and maintain product documentation. Runs before `/spec-os-init` so the framework has product context at setup time. Owns `docs/` entirely — never touches `spec-os/` or `.claude/`.

**Syntax:**
```text
/spec-os-product [mode]
```

**Arguments:**
| Argument | Required | Values |
|----------|----------|--------|
| `mode` | No | `initialize` \| `generate` \| `update` — auto-detected if omitted |

**Modes:**

**Initialize** — new project: conversational → generates `docs/mission.md` + `docs/roadmap.md` + `docs/design/` structure

**Generate** — existing project: scans codebase → proposes content from what the code actually does → dev approves

**Update** — targeted updates to specific sections → dev approves before writing

---

### `/spec-os-brainstorm`

Analyze an idea or requirement. Identify the real problem. Resolve or create the Feature in the tracker. Create `brief.md`.

**Syntax:**
```text
/spec-os-brainstorm [description]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `description` | No | Brief description — prompted if not provided |

**What it does:**
- Reads `spec-os/config.yaml` for tracker type
- Opens an exploratory conversation about the idea
- Identifies the real problem behind the stated request
- Classifies: feature / maintenance / bug / spike
- Sets `complexity: simple | medium | complex` (directional signal, not SP)
- Searches tracker for an existing related Feature
  - If found → proposes linking → dev confirms → `feature-id` stored in `brief.md`
  - If not found → proposes creating a new Feature → dev confirms → creates it → `feature-id` stored
- Creates `brief.md` in `spec-os/changes/{folder}/`
- Notifies dev → proposes handoff to `/spec-os-design`

**Example:**
```text
You: /spec-os-brainstorm

AI:  What idea would you like to analyze?

You: Equipment status email notifications when status changes

AI:  Real problem: operations has no visibility into status changes — they
     discover issues reactively, after delays.

     Proposed solution: event-driven email notifications on status change,
     configurable per equipment type and recipient role.

     Classification: Feature | Complexity: medium

     Searching ADO for related Feature... not found.
     Create Feature "Equipment status email notifications"? [y/n]

You: y

AI:  Created Feature F042 in ADO.
     Created: spec-os/changes/F042-S24-equipment-notifications/brief.md

     Ready to create the technical spec?
     Run /spec-os-design to continue.
```

**Tips:**
- Available as a personal skill (`~/.claude/skills/`) for use across projects
- The `brief.md` it creates is never modified or deleted — it's the permanent record of intent
- Story Points are NOT estimated here — that's `/spec-os-plan`'s responsibility

---

### `/spec-os-bug`

Analyze a bug and route it to simple or complex path.

**Syntax:**
```text
/spec-os-bug [bug-id]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `bug-id` | No | Tracker Bug ID — prompted if not provided |

**Routing:**

| Condition | Route |
|-----------|-------|
| Root cause clear, single file, fix < 2h | **Simple** — creates minimal folder → `/spec-os-implement` |
| Multiple root causes, cross-layer, requires design | **Complex** — creates `analysis.md` → dev reviews → full path |

**Simple path creates:**
```
spec-os/changes/B1847-equipment-export-null/
├── spec.md    (bug context + expected behavior)
└── tasks.md   (single T01 task)
```

---

### `/spec-os-design`

Write the technical specification for a feature from `brief.md`. Translates the "what and why" from brainstorm into a formal observable behavior contract.

**Syntax:**
```text
/spec-os-design [feature-id]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `feature-id` | No | e.g. `F042` — auto-detected from most recent `brief.md` without `spec.md` if omitted |

**Guards (stops if not met):**
- `docs/design/` must exist → run `/spec-os-product` first
- Domain must exist in `spec-os/specs/_index.md` → run `/spec-os-init update` first
- No conflicting in-progress feature in same domain → warns dev, who decides

**What it does:**
- Reads `brief.md` + tracker Feature + `docs/design/00-overview.md` + domain spec
- Determines `spec-level: lite | full` based on scope criteria (proposes to dev for confirmation)
- Drafts `spec.md` with RFC 2119 requirements and Given/When/Then scenarios
- Resolves pending decisions from `brief.md` in the Design decisions section
- Proposes full spec to dev for approval — never writes without confirmation
- Creates 4 files: `spec.md` + empty `spec-delta.md` + empty `session-log.md` + empty `verify-report.md`

**What it creates:**
```
spec-os/changes/{feature}/
├── spec.md          (technical spec — owned by this skill for full lifecycle)
└── spec-delta.md    (empty — ready for evolution tracking)
```

**Update mode** (invoked by `/spec-os-implement` during RECONCILE):
Proposes spec changes for dev approval → writes delta entry in `spec-delta.md` → returns list of tasks affected for `/spec-os-plan` Update mode.

**Example:**
```text
You: /spec-os-design

AI:  Found: spec-os/changes/F042-S24-equipment-notifications/brief.md
     Spec-level: full (observable API contract + domain state changes)
     Confirm? [y / change]

You: y

AI:  ─────────────────────────────────────────────────
     Proposed: spec.md
     ─────────────────────────────────────────────────
     [full spec draft]
     ─────────────────────────────────────────────────
     Create this spec? [y / n / edit]

You: y

AI:  Created: spec.md (spec-level: full), spec-delta.md
     Run /spec-os-plan to continue.
```

**Tips:**
- `spec-level: lite` is not an incomplete spec — it's deliberately scoped for small changes
- The spec describes observable behavior only — no class names, no library choices
- `MUST`/`SHALL` requirements will cause verify FAIL if not met; `SHOULD` causes WARNING

---

### `/spec-os-plan`

Decompose the technical spec into User Stories with Acceptance Criteria and atomic implementation tasks.

**Syntax:**
```text
/spec-os-plan [feature-id]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `feature-id` | No | e.g. `F042` — auto-detected from most recent `spec.md` without `tasks.md` if omitted |

**What it does:**
- Reads `spec.md` fully including all Requirements, Scenarios, Domain model, and DoD
- Derives default `context-level` from `spec-level` (lite → 1, full → 2, complex → 3)
- Defines User Stories with role + Given/When/Then AC (happy path + edge cases per Requirement)
- Applies sizing rules: SP scale 1/2/3/5/8/13 · split if SP > 8 · merge if same role + same files + combined SP ≤ 5
- Proposes full US list to dev for confirmation **before** creating anything in the tracker
- Creates US in tracker (ADO or GitHub) via tracker adapter
- Decomposes each US into atomic tasks (one task = one agent session = one layer)
- Generates `tasks.md` with all required fields per task

**What it creates:**
```
spec-os/changes/{feature}/tasks.md
```

**Task fields generated:**
| Field | Notes |
|-------|-------|
| `subagent` | `backend` or `frontend` |
| `depends-on` | T-ID or `—` |
| `scope` | File paths |
| `done-when` | Verifiable criterion |
| `context-level` | Derived from spec-level, elevated per task risk |
| `doc-impact` | `true` if change requires documentation update |
| `test-scope` | Existing test files relevant to this task |
| `claimed-by` | Always `—` (set by implement at session start) |
| `status` | Always `planned` |
| `lessons-pending` | Always `[]` |

**Update mode** (invoked by `/spec-os-implement` during RECONCILE after a spec change):
Adjusts task scope/done-when, adds new tasks, or proposes US split. Dev approves before writing.

**Tips:**
- Story Points are set **exclusively** here — `brief.md` carries only `complexity` (directional, not SP)
- Always confirm the US list before task decomposition — rework at US level is expensive
- `doc-impact: false` on all tasks means `/spec-os-doc` will never run for this feature

---

### `/spec-os-implement`

Execute one task. One session per task. One atomic commit per task.

**Syntax:**
```text
/spec-os-implement [task-id] [feature-id] [mode]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `task-id` | Yes | e.g. `T01` |
| `feature-id` | No | e.g. `F042` — auto-detected if unambiguous |
| `mode` | No | `reconcile` or `unclaim` — see below |

**Session flow:**
```
INIT:       check claimed-by → assign → detect resume mode if in-progress
LOAD:       context by tier (1 always; 2-3 per context-level)
STANDARDS:  /spec-os-inject with task keywords + stack
CONFIRM:    notify dev of agent type → wait for approval [gate]
┌─ INNER LOOP (max-iterations: config.yaml, default 3) ──────────────┐
│  qa-engineer: audits test-scope → proposes gaps [gate]             │
│  dev-agent:   implements code + approved tests → commits           │
│  test-runner: runs unit tests                                      │
│    PASS → exit  │  FAIL → dev-agent corrects → loop               │
│    max-iterations exhausted → [gate: dev decides]                  │
└────────────────────────────────────────────────────────────────────┘
RECONCILE:  spec-reconciler agent (read-only) checks for spec drift
            drift → /spec-os-design Update [gate] → tasks? → /spec-os-plan Update [gate]
REVIEW:     dev approves diff + test results [gate]
LOG:        session-log.md entry + tasks.md → done
```

**Special modes:**
- `reconcile [task-id]` — run RECONCILE only on a completed task (standalone drift check)
- `unclaim [task-id]` — release `claimed-by` when abandoning a session mid-task

**Resume mode:** if task `status: in-progress`, automatically loads previous session-log entry and continues from last known state.

**Example:**
```text
You: /spec-os-implement T01

AI:  T01: Implement NotificationDispatcher service
     Context: Tier 2 | Subagent: backend-dev
     Confirm? [y/n]

You: y

AI:  Proposed tests (1 gap — AC-2 has no coverage):
     1. DispatcherShouldSkipWhenNoRecipientsConfigured
     Approve? [y/n]

You: y

AI:  [dev-agent implements NotificationDispatcher.cs + test]
     Tests: 12 passing
     Reconcile: clean

     Review diff and approve? [y/n]

You: y

AI:  Committed: feat(equipment): add NotificationDispatcher [F042-T01]
     T01 done. Next: T02.
```

---

### `/spec-os-verify`

Quality gate for a User Story. Runs after all tasks in the US are done.

**Syntax:**
```text
/spec-os-verify [feature-id] [us-id]
```

**Flow:**
1. **AUDIT** — qa-engineer audits US-level AC coverage → proposes gaps [gate]
2. **EXECUTE** — qa-engineer writes approved tests, runs full suite, writes `verify-report.md`
3. **CHECKS** — scope compliance, conventions, DoD, no placeholders, spec-delta completeness

**Results:**
- **PASS** → creates PR, updates tracker US to `in-review`, runs `/spec-os-sync`, offers `/spec-os-doc` handoff if `doc-impact: true`
- **FAIL** → writes FAIL entry to `verify-report.md` → identifies responsible T-ID → routes to `/spec-os-implement`

Writes `verify-report.md` entry in every case.

---

### `/spec-os-discover`

Scan the codebase and extract real coding conventions into `spec-os/standards/` files.

**Syntax:**
```text
/spec-os-discover [category]
```

**Arguments:**
| Argument | Required | Values |
|----------|----------|--------|
| `category` | No | `global` \| `backend` \| `frontend` — scans all if omitted |

**What it does:**
- Reads `spec-os/standards/index.yml` to know which files to populate
- Scans the codebase using grep and glob — naming patterns, commit format, layer structure, test conventions, error handling, stack-specific patterns
- Fetches official external sources (framework docs, style guides, security standards) before proposing each standard — training data summaries are not accepted as a source
- Surfaces inconsistencies rather than silently picking one pattern
- Reports a confidence score (1–5) before proposing; does not propose below 4/5
- Proposes each standard to the developer one at a time — never writes without approval
- Each standard is structured in three layers: **Current state** (what the codebase does today), **Best practice** (informed by fetched sources), **Migration path** (concrete steps, effort, risk)
- Updates `Status: STUB` to `Status: EXTRACTED — {date}` on approved files

**Tips:**
- Run after `/spec-os-init` to replace stubs with actual conventions
- Also fills `docs/design/` stubs (integrations, error-handling, glossary) when evidence is found in the codebase — no separate step needed
- Re-run with a specific category after a major refactor
- If the codebase has mixed patterns, use `/spec-os-standard` to record which one is canonical

---

### `/spec-os-inject`

Load only the standards relevant to the current task. Called internally by `/spec-os-implement` — not typically invoked directly.

**Syntax:**
```text
/spec-os-inject [keywords] [subagent-type]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `keywords` | Yes | Space-separated task keywords (e.g. `dotnet testing error-handling`) |
| `subagent-type` | No | `backend` \| `frontend` — scopes matching to relevant category |

**What it does:**
- Reads `spec-os/standards/index.yml`
- Matches keywords against each standard's keyword list
- Filters by `subagent-type`: `backend` gets `global` + `backend`; `frontend` gets `global` + `frontend`
- Returns the **file paths** of all matched files — subagents receive paths and read each file directly

---

### `/spec-os-standard`

Update an existing standard or create a new one in `spec-os/standards/`. Every change is proposed in full before writing.

**Syntax:**
```text
/spec-os-standard [standard-path]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `standard-path` | No | Relative to `spec-os/standards/` (e.g. `backend/testing`) — prompted if omitted |

**What it does:**
- If `standard-path` exists: reads the current content, asks what to change, drafts and proposes the update
- If `standard-path` doesn't exist: collects category, description, keywords, and content — then proposes the new file
- Shows the complete proposed file (not just a diff) for clear approval
- Updates `spec-os/standards/index.yml` if keywords changed

---

### `/spec-os-sync`

Sync pending lessons from session logs to the knowledge base. Runs automatically after PR creation.

**Syntax:**
```text
/spec-os-sync [feature-id] [us-id]
```

Lesson sync only — no archival (that's `/spec-os-clean`). Idempotent — safe to re-run.

Reads `session-log.md` lessons with `pending: true`. Filters to `generalizable: yes`. Validates domain tags against `_index.md`. Writes to `spec-os/specs/knowledge-base.md`. Marks synced lessons `pending: false`.

---

### `/spec-os-doc`

Update user-facing documentation. Conditional — only runs if the US has at least one task with `doc-impact: true`.

**Syntax:**
```text
/spec-os-doc [feature-id] [us-id]
```

Reads `spec.md` + tracker US. Drafts `docs/manual/{domain}.md` update in plain language. Dev approves before writing.

---

### `/spec-os-audit`

Capture framework quality signals after a session. Produces an entry in `spec-os/audit-log.md`.

**Syntax:**
```text
/spec-os-audit [mode]
```

**Arguments:**
| Argument | Required | Values |
|----------|----------|--------|
| `mode` | No | `context` \| `analyze` \| `feedback` — prompted if omitted |

**Modes:**
- `context` — analyzes current session history
- `analyze` — reads feature artifacts (brief.md, spec.md, session-log.md)
- `feedback` — guided Q&A with the developer

`audit-analyst` produces a structured draft. Dev approves before it's written to `audit-log.md`.

---

### `/spec-os-abandon`

Close a feature without completing it. Preserves all artifacts.

**Syntax:**
```text
/spec-os-abandon [feature-id] [reason]
```

Asks for abandonment reason. Releases all claimed tasks. Updates `spec.md` + `tasks.md` status to `abandoned`. Updates tracker Feature to closed. Does NOT delete or move the folder — archival is `/spec-os-clean`'s responsibility at release close.

---

### `/spec-os-clean`

Maintenance skill for the spec-os knowledge layer. Run manually at sprint or release close.

**Syntax:**
```text
/spec-os-clean [mode]
```

**Arguments:**
| Argument | Required | Values |
|----------|----------|--------|
| `mode` | No | `kb` (knowledge base only) \| `archive` (archival only) — runs both if omitted |

**Knowledge base cleanup (`kb`):**
Scans `spec-os/specs/knowledge-base.md` for obsolete, contradictory, or invalid-domain entries. Proposes removals and corrections — dev approves each.

**Feature archival (`archive`):**
Scans `spec-os/changes/` for folders with `status: done` or `status: abandoned`. Moves to `spec-os/archive/` — dev approves before any move.

**Documentation debt scan:**
Checks `docs/design/` for unfilled stubs (`TBD` markers). Reports them in the final summary with actionable next steps — run `/spec-os-discover` for code-inferable stubs, `/spec-os-product update` for product-decision stubs.

---

### `/spec-os-explore`

Analyze a business initiative that spans multiple repos. **Personal skill — install in Claude Desktop**, not in individual repos.

**Syntax:**
```text
/spec-os-explore [initiative description]
```

**Output files** (in Claude Desktop project files):
```
{YYYYMMDD-HHmm}-initiative-{slug}.md          ← master (cross-repo view)
{YYYYMMDD-HHmm}-initiative-{slug}-{app}.md    ← one per affected app
```

**Handoff:** take each `{timestamp}-initiative-{slug}-{app}.md` and pass it to the corresponding repo's `/spec-os-brainstorm` as additional context.

**Tips:**
- Install at `~/.claude/skills/spec-os-explore/`
- Creating an Epic in ADO is optional — not every initiative needs one
- Timestamp-first naming groups all files from the same session when sorted by name

---

## Next Steps

← [Back to Workflow Overview](01-workflow-overview.md)

- [Getting Started](../Getting%20Started/01-overview.md) — install spec-os
- [Concepts](../Concepts/00-concepts-overview.md) — understand the architecture
