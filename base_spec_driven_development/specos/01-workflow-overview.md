# Workflow Overview

spec-os organizes all development work into four phases. Each phase has a clear owner and produces specific artifacts.

## The Full Flow

```
PHASE 0 — Setup (once per project)
══════════════════════════════════════════════════════════
/spec-os-product   →  docs/ (mission, roadmap, design)
/spec-os-init      →  spec-os/ structure + config.yaml
/spec-os-tracker   →  spec-os/tracker/ (ADO or GitHub)
/spec-os-discover  →  spec-os/standards/ + index.yml


PHASE 1 — Design (Team Lead / Product Owner, per feature)
══════════════════════════════════════════════════════════
/spec-os-brainstorm  →  brief.md + Feature in tracker
/spec-os-design      →  spec.md + spec-delta.md
/spec-os-plan        →  tasks.md + User Stories in tracker

                    ↓  tasks.md handed to developer


PHASE 2 — Implementation (Developer, per feature)
══════════════════════════════════════════════════════════
/spec-os-implement T01..TN  (loop, one task per session)
/spec-os-verify      →  QA gate → PR
/spec-os-doc         →  docs/manual/ (if doc-impact: true)
/spec-os-sync        →  knowledge-base.md


PHASE 3 — Framework quality (post-session)
══════════════════════════════════════════════════════════
/spec-os-audit       →  spec-os/audit-log.md
```

## Decision Table

| Situation | Start with |
|-----------|------------|
| New idea or requirement | `/spec-os-brainstorm` (Phase 1) |
| Bug reported in tracker | `/spec-os-bug {id}` |
| Initiative spanning multiple repos | `/spec-os-explore` (Claude Desktop) |
| New project setup | `/spec-os-product` then `/spec-os-init` |
| Existing project, no spec-os yet | `/spec-os-init` (Adopt mode) |
| Adding new domains | `/spec-os-init update` |
| Standards are stale or missing | `/spec-os-discover` |
| Feature needs to be cancelled | `/spec-os-abandon` |
| Release close / cleanup | `/spec-os-clean` |

## Each Arrow Is a Confirmation

Every skill-to-skill handoff requires your approval. Nothing advances silently. You can set `skill-handoffs: auto` in `config.yaml` to relax this once you trust the workflow.

## Next Steps

- [Phase 0 — Setup](02-setup.md) — set up a new project
- [Phase 1 — Design](03-design.md) — brainstorm, spec, plan
- [Phase 2 — Implementation](04-implement.md) — implement, verify, sync
- [Maintenance](05-maintenance.md) — bugs, abandons, cleanup
- [Skills Reference](06-skills-reference.md) — full reference for every skill
