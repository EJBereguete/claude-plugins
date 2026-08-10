# Specs

Specs are the answer to "what does this system do?" They describe observable behavior — inputs, outputs, states, and transitions — before any code is written.

## Two Kinds of Specs

**Domain specs** — source of truth for current system behavior, organized by domain:
```
spec-os/specs/{domain}/spec.md
```
Updated by `/spec-os-sync` after each completed User Story (runs automatically after PR creation, or manually).

**Feature specs** — in-progress spec for a feature being built:
```
spec-os/changes/{feature}/spec.md
```
Created and owned by `/spec-os-design`. Updated during implementation via UPDATE MODE when undocumented behavior is discovered.

## The Changes Folder

Every feature or bug gets a self-contained folder under `spec-os/changes/`:

```
spec-os/changes/F042-S24-equipment-notifications/
├── brief.md         ← why we're building this (never modified)        [brainstorm]
├── spec.md          ← what we're building (behavior contract)          [design]
├── spec-delta.md    ← how the spec evolved during implementation       [design]
├── tasks.md         ← atomic execution plan with User Stories          [plan]
├── session-log.md   ← agent memory across sessions                     [implement]
├── verify-report.md ← quality gate results                             [verify]
└── analysis.md      ← root cause analysis (complex bugs only)          [bug]
```

`analysis.md` is only created by `/spec-os-bug` for complex bugs. It is not part of the standard feature lifecycle.

Folder name format: `F{id}-{cadence}-{slug}` for features, `B{id}-{slug}` for bugs.

When a feature is complete: `/spec-os-clean` archives the folder to `spec-os/archive/`.

## brief.md

The permanent record of why a feature was built. Created by `/spec-os-brainstorm`, **never modified** afterward (except to fill an empty `## Resolution notes` section when `/spec-os-design` resolves pending decisions).

Contains: original input, real problem identified, proposed solution, feature ID from tracker, complexity signal, and pending decisions at brainstorm time.

**Multiple requirements for one feature:** if `/spec-os-brainstorm` is run again on an existing feature folder, it creates `origin-{slug}.md` alongside `brief.md` instead of overwriting it. `/spec-os-design` enters EXTEND MODE to incorporate all unincorporated origin files into the existing `spec.md`.

## spec-delta.md

Every time `spec.md` changes during implementation, `/spec-os-design` UPDATE MODE writes a delta entry:

```markdown
## Delta — T05 — 2026-03-15

### MODIFIED
- Equipment.Status: added 'calibration-pending' state
  Reason: edge case discovered during AC
  Tasks affected: T06, T07
```

This answers "why does the spec look different from the original brainstorm?" without losing history.

UPDATE MODE is triggered by `/spec-os-implement` during RECONCILE — when implementation reveals behavior not covered by the spec, or when the developer modifies `spec.md` directly. Any spec change that affects tasks also triggers `/spec-os-plan` UPDATE MODE to adjust `tasks.md`.

**`spec-delta.md` is also a verification gate.** `/spec-os-verify` reads it before giving PASS: every task listed as affected in a delta entry must be `status: done`. An undone affected task means a spec change was not fully implemented — verify blocks until it is resolved.

## Spec Format

A spec describes observable behavior using requirements and scenarios. There are two levels:

Both levels include `## Definition of Done` — `/spec-os-verify` reads it to run Check 3.

**lite spec** — for bug fixes and bounded single-file changes:

```markdown
## Scope
{what is in and out of scope}

## Requirements

### Requirement: {name}
The system MUST {behavior}.

#### Scenario: {name}
- GIVEN {precondition}
- WHEN {action}
- THEN {outcome}

## Definition of Done
- [ ] All tasks status: done
- [ ] Tests passing
- [ ] All AC verified
- [ ] PR created
```

**full spec** — for new features, cross-domain changes, and anything with security or compliance impact. Adds two extra sections before DoD:

```markdown
## Domain model
{entities, states, and relationships introduced or modified by this feature}

## Design decisions
{architectural choices made during spec — each resolved pending decision from brief.md}

## Definition of Done
- [ ] All tasks status: done
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] All AC verified
- [ ] PR created
- [ ] doc-impact tasks covered (if applicable)
```

**RFC 2119 keywords** communicate requirement strength:
- `MUST` / `SHALL` — absolute requirement (verify FAIL if not met)
- `SHOULD` — recommended, exceptions exist (verify WARNING if not met)
- `MAY` — optional (not checked by verify)

## spec.md Lifecycle

`spec.md` carries a `status` field in its frontmatter that advances automatically as the feature progresses:

| Status | Set by | Meaning |
|--------|--------|---------|
| `planned` | `/spec-os-design` | Spec written, implementation not started |
| `in-progress` | `/spec-os-implement` | First task started |
| `in-review` | `/spec-os-verify` | All tasks done, PR created |
| `done` | *(manual after PR merge)* | Merged — signals `/spec-os-clean` to archive |
| `abandoned` | `/spec-os-abandon` | Feature closed without completing |

> **Note — bug path exception:** `/spec-os-bug` simple path creates `spec.md` with `status: in-progress` directly, skipping `planned`. Bugs enter implementation immediately after the folder is created.
>
> **Note — `status: done`:** no skill sets this automatically. After a PR is merged, set it manually in `spec.md` frontmatter so `/spec-os-clean` can find the folder as an archival candidate.

## Spec Levels

| Condition | spec-level | context-level |
|-----------|-----------|---------------|
| Bug fix, single-file, no behavior change | `lite` | 1 |
| New feature, bounded scope, single domain | `full` | 2 |
| Cross-repo, API/event contract, migration | `full` | 3 |
| Security, privacy, or compliance impact | `full` | 3 |

Use the lightest level that still makes the change verifiable.

## Prerequisites

`/spec-os-design` requires `docs/design/` to exist before writing a spec — it reads `00-overview.md`, `01-stack.md`, and `05-data-model.md` for context. If `docs/design/` is not present, run `/spec-os-product` first.

## Next Steps

← [Back to Architecture](01-architecture.md)

- [Workflow Phases](04-workflow-phases.md) — how specs are created and used in the skill chain
- [Skills Reference: /spec-os-design](../Workflow/06-skills-reference.md#spec-os-design)
