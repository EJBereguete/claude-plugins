# File Structure

The full structure is built incrementally across multiple skills:

| Order | Skill | What it creates |
|-------|-------|----------------|
| 1 | *(framework install)* | `.claude/agents/` and `.claude/skills/` — pre-installed |
| 2 | `/spec-os-product` | `docs/mission.md`, `docs/roadmap.md` — optional but recommended first; `init` reads from them |
| 3 | `/spec-os-init` | Core scaffold: `config.yaml`, `specs/`, `changes/`, `archive/`, `CLAUDE.md` |
| 4 | `/spec-os-tracker` | `tracker/` — init hands off here if tracker ≠ `none` |
| 5 | `/spec-os-discover` | `standards/` with indexed conventions |

```
your-project/
│
├── CLAUDE.md                          ← agent identity and rules (thin)         [init]
│
├── spec-os/
│   ├── config.yaml                    ← tracker, workflow, and project config   [init]
│   ├── version                        ← installed version (e.g. 1.0.0)          [init]
│   ├── GETTING-STARTED.md                                                        [init]
│   │
│   ├── standards/                     ← how your team builds                    [discover]
│   │   ├── index.yml                  ← keyword → file mapping for smart injection
│   │   ├── global/                    ← naming, commits, security, pr-template
│   │   ├── backend/                   ← architecture, patterns, testing, error-handling
│   │   │   └── {stack}.md             ← stack-specific (e.g. dotnet.md, python.md)
│   │   └── frontend/                  ← components, state, testing (if frontend stack)
│   │       └── {stack}.md             ← stack-specific (e.g. nextjs.md, react.md)
│   │
│   ├── specs/                         ← what your system does (source of truth) [init]
│   │   ├── _index.md                  ← domain registry
│   │   ├── knowledge-base.md          ← institutional lessons
│   │   └── {domain}/
│   │       └── spec.md
│   │
│   ├── tracker/                       ← tracker adapter                         [tracker]
│   │   ├── config.yaml                ← type: ado | github | none
│   │   └── ado.md / github.md         ← adapter with MCP mappings and env vars
│   │
│   ├── changes/                       ← work in progress (one folder per feature/bug)
│   │   └── {F{ID}-{cadence}-{name}/ or B{ID}-{name}/}
│   │       ├── brief.md               ← preserved brainstorm (never modified)
│   │       ├── spec.md                ← technical spec
│   │       ├── spec-delta.md          ← spec evolution log
│   │       ├── tasks.md               ← atomic task plan
│   │       ├── session-log.md         ← agent memory across sessions
│   │       └── verify-report.md       ← quality gate reports
│   │
│   └── archive/                       ← completed features (moved here by /spec-os-clean)
│       └── {YYYY-MM-DD}-{feature}/
│
├── docs/                              ← product documentation (stable, rarely changes)
│   ├── mission.md                     ← product purpose, audience, problem solved
│   ├── roadmap.md                     ← strategic north star and future features
│   ├── design/                        ← design specs and decisions
│   │   ├── 00-overview.md ... 09-design-system.md
│   │   └── adr/                       ← architecture decision records
│   ├── runbooks/
│   └── manual/
│
└── .claude/
    ├── agents/                        ← specialist subagents (pre-installed with framework)
    │   ├── backend-dev.md
    │   ├── frontend-dev.md
    │   └── ...
    └── skills/
        └── spec-os-*/                 ← all skill files (pre-installed with framework)
```

## Key Directories

**`spec-os/standards/`** — coding conventions indexed by keyword. `/spec-os-inject` reads this to load only relevant standards per task. Never dump all standards into a prompt. Stack-specific files (e.g. `dotnet.md`, `nextjs.md`) live alongside the shared ones.

**`spec-os/specs/`** — source of truth. Describes how your system currently behaves, organized by domain. Updated when features complete via `/spec-os-sync`.

**`spec-os/changes/`** — work in progress. Features are named `F{ID}-{cadence}-{name}/`, bugs are named `B{ID}-{name}/`. Each folder is self-contained. Moved to `spec-os/archive/` by `/spec-os-clean` at release close.

**`spec-os/archive/`** — completed and abandoned work. Organized by date: `{YYYY-MM-DD}-{feature}/`. Read-only reference.

**`spec-os/tracker/`** — tracker adapter. Skills call abstract operations; the adapter resolves the actual MCP call. Not present if tracker type is `none`.


## config.yaml Fields

Key fields in `spec-os/config.yaml`:

```yaml
project:
  name: Equip360
  stack: [dotnet, nextjs]
  domains: [equipment, maintenance, reporting, users]

tracker:
  type: ado           # ado | github | none

workflow:
  skill-handoffs: explicit    # explicit | auto
  max-iterations: 3           # inner loop retry limit
  cadence: sprint             # sprint | milestone | quarter | custom
```

## Glossary

| Term | Definition |
|------|------------|
| **Change** | A feature or bug packaged as a folder under `spec-os/changes/` |
| **Domain** | A bounded area of system behavior (e.g., `equipment`, `auth`) |
| **brief.md** | Preserved brainstorm output — why this feature was built. Created by /spec-os-brainstorm, never modified |
| **spec-delta.md** | Log of spec changes during implementation |
| **Skill** | A `/spec-os-*` command — the orchestration layer, invoked by the developer |
| **Agent** | A specialist subagent (`backend-dev`, `frontend-dev`) — the execution layer |
| **Standards** | Coding conventions in `spec-os/standards/`, injected on demand |
| **Tracker adapter** | The config pattern that makes skills work with any supported tracker |
| **context-level** | How much context `/spec-os-implement` loads for a task (1, 2, or 3) |
| **spec-level** | How detailed a spec needs to be (`lite` or `full`) |

## Next Steps

← [Back to Concepts Overview](00-concepts-overview.md)

- [Getting Started](../Getting%20Started/01-overview.md) — install and create this structure
- [Workflow Overview](../Workflow/01-workflow-overview.md) — start using it
