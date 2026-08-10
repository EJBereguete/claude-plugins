# Standards

Standards are coding conventions extracted from your codebase into indexed, discoverable files. They are Layer 1 of spec-os — the answer to "how do we build things here?"

## What Standards Are

A standard is a concise, declarative file that describes one aspect of how your team writes code:

- Naming conventions
- Architectural patterns
- Error handling rules
- Test structure
- Stack-specific practices (dotnet, nextjs, python, etc.)

Standards are **not** prompts. They're reference files that the AI reads when relevant to a task.

## Where They Live

```
spec-os/standards/
├── index.yml              ← keyword → file mapping
├── global/
│   ├── naming.md
│   ├── commits.md
│   ├── security.md
│   └── pr-template.md
├── backend/
│   ├── architecture.md
│   ├── patterns.md
│   ├── testing.md
│   ├── error-handling.md
│   ├── dotnet.md          ← stack-specific (one of: dotnet | python | odoo)
│   └── ...
└── frontend/
    ├── components.md
    ├── state.md
    ├── testing.md
    └── nextjs.md          ← stack-specific (one of: nextjs | react)
```

Stack-specific files are created only for the stacks in use. `/spec-os-discover` supports: `dotnet`, `python`, `odoo` (backend) and `nextjs`, `react` (frontend). Adding a new stack via `/spec-os-init update` also creates the missing stubs and updates `index.yml`.

## The Index

`spec-os/standards/index.yml` maps keywords to standard files. This is what drives `/spec-os-inject` matching:

```yaml
standards:
  - file: backend/error-handling.md
    keywords: [error, exception, result, failure, handling]
  - file: backend/testing.md
    keywords: [test, unit, integration, coverage, mock, assertion]
  - file: global/commits.md
    keywords: [commit, git, message, branch]
```

A standard not in `index.yml` will never be injected into a subagent's context. `/spec-os-standard` always updates `index.yml` when keywords change.

## How Standards Are Created

| Method | Skill | When to use |
|--------|-------|-------------|
| Automatic extraction | `/spec-os-discover` | After init, after a major refactor, or when adopting spec-os on an existing codebase |
| Design-derived | `/spec-os-discover` | When no codebase exists yet — derives standards from `docs/design/` files |
| Manual creation or update | `/spec-os-standard` | When you need a specific convention that discover didn't surface, or to refine an extracted standard |

Every proposal requires developer approval before writing. `/spec-os-discover` processes one standard at a time.

**Scoping discover:** pass a category to limit the scan:
```
/spec-os-discover backend    ← only backend/ standards
/spec-os-discover frontend   ← only frontend/ standards
/spec-os-discover global     ← only global/ standards
/spec-os-discover            ← all categories (default)
```

**Updating existing standards:** if a standard file already exists, `/spec-os-discover` presents a diff-style update proposal instead of overwriting it. The developer approves or rejects each change.

**One standard per `/spec-os-standard` session:** if you need to update multiple standards, run the skill once per standard — each gets its own full approval cycle.

**Stack source priority:** if `docs/design/01-stack.md` exists, discover reads it as the authoritative stack source — it takes priority over the `stack` field in `spec-os/config.yaml` for determining which stack-specific standards apply.

**Design file → standard mapping:** when deriving from `docs/design/`, discover reads specific files per standard:

| Standard | Source in docs/design/ |
|----------|------------------------|
| `global/naming.md` | `08-glossary.md` |
| `global/security.md` | `02-security.md` |
| `backend/architecture.md` | `00-overview.md`, `05-data-model.md`, `06-integrations.md` |
| `backend/patterns.md` | `00-overview.md`, `03-performance.md` |
| `backend/error-handling.md` | `07-error-handling.md` |
| `backend/testing.md` | `01-stack.md` |
| `backend/{stack}.md` | `01-stack.md` |
| `frontend/components.md` | `09-design-system.md` |
| `frontend/state.md` | `01-stack.md` |
| `frontend/{framework}.md` | `01-stack.md` |

## Standard File Header

Every standard file carries a status header:

```
> Status: EXTRACTED — 2026-03-22
> Managed by: /spec-os-standard | Keywords: error, exception, result
```

| Status | Set by | Meaning |
|--------|--------|---------|
| `STUB` | `/spec-os-discover` | Created but no evidence found — needs manual population |
| `EXTRACTED` | `/spec-os-discover` | Derived from codebase scan |
| `DESIGN-DERIVED` | `/spec-os-discover` | Derived from `docs/design/` only |
| `EXTRACTED + DESIGN-DERIVED` | `/spec-os-discover` | Derived from both codebase and design docs |
| `CREATED` | `/spec-os-standard` | Written manually from scratch |
| `UPDATED` | `/spec-os-standard` | Modified after initial creation |

## How Standards Are Injected

`/spec-os-inject` is called at the start of every implementation session — **except when `context-level: 1`**, in which case inject is skipped entirely and `standards-paths: none` is passed to the dev-agent. It returns **file paths only** — the dev-agent reads the files directly. Standard content never transits through the skill's context, keeping it lean.

**Keyword enrichment:** inject automatically adds:
- The project stack from `spec-os/config.yaml` as an implicit keyword (e.g., `dotnet`) — always
- The feature's domain from `spec.md` frontmatter — **only if** the active feature folder is known from context; if a feature's `spec.md` declares a different stack, that overrides the project-level default

This means a task about "testing" in a .NET project always gets `backend/testing.md` AND `backend/dotnet.md`, without the caller having to pass those keywords explicitly.

**Subagent-type filter:** inject scopes matches to avoid injecting irrelevant standards:

| Subagent | Categories injected |
|----------|---------------------|
| `backend` | `global` + `backend` |
| `frontend` | `global` + `frontend` |
| (none) | all categories |

**Graceful degradation:** if a file is listed in `index.yml` but does not exist on disk (e.g., a STUB that was never populated), inject skips it with a warning and continues with whatever can be loaded.

## When Standards Are Used

Standards are read by subagents during:

- `/spec-os-implement` — injected per task before delegating to `backend-dev` or `frontend-dev` (skipped if `context-level: 1`)
- `/spec-os-verify` — injected for conventions compliance check (Check 2) and AC coverage audit (Step 3); `global/pr-template.md` is used directly to create the PR
- `/spec-os-plan` — injected before delegating to `project-manager` (only if `spec-os/standards/` exists)
- `/spec-os-design` — injected with keywords `architecture patterns backend` when a `context-level: 3` spec invokes the architect agent for Domain model and Design decisions sections

## Keeping Standards Current

Standards decay. Update them when:

- `/spec-os-verify` surfaces a conventions violation → update the relevant standard to prevent recurrence
- A session-log lesson is tagged as generalizable → consider whether it belongs in a standard
- A major refactor changes the architectural patterns in use
- `/spec-os-discover` surfaces a conflict the developer resolves → update the standard to reflect the canonical decision

Run `/spec-os-standard {path}` to update a specific standard. Run `/spec-os-discover` to re-extract all standards from the codebase.

## Next Steps

← [Back to Architecture](01-architecture.md)

- [Specs](03-specs.md) — how behavior is documented
- [Setup Workflow](../Workflow/02-setup.md) — extract standards from your codebase
- [Skills Reference: /spec-os-discover](../Workflow/06-skills-reference.md#spec-os-discover)
