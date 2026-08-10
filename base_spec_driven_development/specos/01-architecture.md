# Architecture

spec-os organizes everything into four independent layers. Each layer has a clear owner and a specific role.

```
+-------------------------------------------------------------+
|                         SPEC-OS                             |
|                                                             |
|  LAYER 1: Standards    LAYER 2: Specs    LAYER 3: Workflow  |
|  "How we build"        "What we build"   "How we execute"   |
|                                                             |
|       +---------------------+------------------+            |
|                             |                               |
|                    LAYER 4: Tracker Adapter                 |
|                    "With whom we coordinate"                |
|                    (ADO | GitHub)                           |
+-------------------------------------------------------------+
```

## Layer 1 — Standards: How We Build

Coding conventions extracted from your codebase or derived from design documents, stored in indexed, discoverable files.

- `spec-os/standards/index.yml` — maps keywords to standard files
- `spec-os/standards/{category}/{name}.md` — concise, declarative rules
- Skills: `/spec-os-discover` (extract), `/spec-os-inject` (load on demand), `/spec-os-standard` (update)

Instead of loading all conventions into every prompt, `/spec-os-inject` reads the task's keywords and loads only the relevant standards. A task about `.NET error handling` loads `error-handling.md` and `dotnet.md`, not everything.

→ [Deep dive: Standards](02-standards.md)

## Layer 2 — Specs: What We Build

Observable system behavior documented in two places:

- `spec-os/specs/{domain}/spec.md` — source of truth for current behavior, organized by domain
- `spec-os/changes/{feature}/spec.md` — in-progress spec for a feature being built, owned by `/spec-os-design`

Specs describe **observable behavior only** — inputs, outputs, states, and transitions. Not class names, library choices, or implementation steps.

→ [Deep dive: Specs](03-specs.md)

## Layer 3 — Workflow: How We Execute

The skill chain organized into two phases with distinct ownership:

```
PHASE 1 — Design
─────────────────────────────────────────────
/spec-os-brainstorm ──► /spec-os-design ──► /spec-os-plan
                                                   │
                                         tasks.md handed to developer
                                                   │
PHASE 2 — Implementation (Developer)              ▼
─────────────────────────────────────────────────────────────────────
/spec-os-implement ──► /spec-os-verify ──┬──► /spec-os-doc  (if doc-impact: true)
                                         └──► /spec-os-sync  (automatic, post-PR)
```

→ [Deep dive: Workflow Phases](04-workflow-phases.md)

## Layer 4 — Tracker Adapter: With Whom We Coordinate

Every skill that needs tracker access reads `spec-os/tracker/config.yaml` to get the tracker type, then loads `spec-os/tracker/{type}.md` for the full adapter. Set up via `/spec-os-tracker`. If `spec-os/tracker/` does not exist, skills continue in tracker-free mode — no configuration needed.

```
spec-os/tracker/
├── config.yaml     ← type: ado | github
├── ado.md          ← ADO adapter (field mapping, state mapping, MCP operations)
└── github.md       ← GitHub adapter (field mapping, state mapping, MCP operations)
```

Skills call abstract operations (`create-feature`, `create-us`, `update-status`). The adapter resolves which MCP to call. Adding a new tracker means a new adapter file — zero skill changes.

## Philosophy

```
→ developer-controlled  — you invoke each skill; /spec-os-sync is the sole exception (runs automatically post-PR)
→ tracker-agnostic      — ADO, GitHub, or any supported tracker via config
→ standards as code     — conventions live in indexed files, not in prompts
→ spec before code      — observable behavior documented before implementation
→ context-efficient     — load only what each task actually needs
→ brownfield-first      — designed for existing codebases, not just greenfield
```

## Next Steps

← [Back to Concepts Overview](00-concepts-overview.md)

- [Standards](02-standards.md) — how conventions are stored and loaded
- [Specs](03-specs.md) — how behavior is documented
- [Workflow Phases](04-workflow-phases.md) — how the skill chain is organized
