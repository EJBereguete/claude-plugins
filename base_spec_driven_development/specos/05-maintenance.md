# Maintenance

Skills for situations outside the main feature lifecycle: bugs, cancellations, cleanup, standards updates, and framework quality.

---

## /spec-os-bug

Analyze a bug and route to the appropriate fix path.

### Simple path (most bugs)

```text
You: /spec-os-bug 1847

AI:  Reading bug #1847: "Null reference on equipment export when no results"
     Root cause: ExportHandler doesn't guard against empty result set.
     Scope: single file — EquipmentExportHandler.cs
     Estimated fix: < 30 minutes
     Classification: SIMPLE

     Created: spec-os/changes/B1847-equipment-export-null/
       spec.md   (bug context + expected behavior)
       tasks.md  (T01: add null guard)

     Run /spec-os-implement T01.
```

### Complex path

```text
You: /spec-os-bug 1902

AI:  Root causes: multiple (cache invalidation + event ordering race condition)
     Cross-layer: cache, domain events, read model
     Classification: COMPLEX

     Created: spec-os/changes/B1902-stale-readings/analysis.md
     Review analysis.md, then run /spec-os-design to write the spec.
```

---

## /spec-os-abandon

Close a feature without completing it. Preserves all artifacts.

```text
You: /spec-os-abandon F042

AI:  Abandonment reason?

You: Cancelled by PO — requirements changed, will be re-evaluated next quarter.

AI:  Updated spec.md status → abandoned.
     Updated ADO Feature F042 → Cancelled.
     Folder remains in spec-os/changes/ — run /spec-os-clean at release close.
```

---

## /spec-os-clean

Maintenance for the knowledge layer. Run at sprint or release close — not part of the daily workflow.

**Knowledge base cleanup** — scans `knowledge-base.md` for obsolete, contradictory, or invalid-domain entries. Proposes removals and corrections for your approval.

**Feature archival** — scans `spec-os/changes/` for completed or abandoned features. Moves to `spec-os/archive/` after your confirmation.

**Documentation debt scan** — checks `docs/design/` for stub files that still contain `TBD` markers and reports them in the final summary with actionable next steps (run `/spec-os-discover` for stubs inferable from code, run `/spec-os-product update` for stubs that require product decisions).

```text
You: /spec-os-clean
```

Or by mode: `/spec-os-clean kb` (knowledge base only) | `/spec-os-clean archive` (archival only).

---

## /spec-os-standard

Update or create a standard.

```text
You: /spec-os-standard backend/error-handling

AI:  Current: spec-os/standards/backend/error-handling.md
     ──────────────────────────────────────────────────
     [current content]
     ──────────────────────────────────────────────────
     What would you like to change or add?

You: We use Result<T> from ErrorOr. Never throw except for truly unexpected conditions.

AI:  Proposed update:
     [full proposed file]
     Apply? [y / n / edit]

You: y
```

Use after `/spec-os-verify` surfaces a conventions violation, or when the team agrees on a new rule.

---

## /spec-os-audit

Capture framework quality signals after a session. Produces an entry in `spec-os/audit-log.md`.

**Three modes:**

```text
/spec-os-audit context    ← analyzes current session history
/spec-os-audit analyze    ← reads feature artifacts (brief.md, spec.md, session-log.md)
/spec-os-audit feedback   ← guided Q&A with you
```

`audit-analyst` produces a structured draft. You approve before it's written to `audit-log.md`.

---

## Next Steps

← [Back to Workflow Overview](01-workflow-overview.md)

- [Skills Reference](06-skills-reference.md) — complete reference for every skill
