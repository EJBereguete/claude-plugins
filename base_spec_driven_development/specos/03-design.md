# Phase 1 — Design

Owned by the **Team Lead or Product Owner**. Takes a raw idea to a fully specified, task-decomposed plan ready for a developer to execute.

```
/spec-os-brainstorm ──► /spec-os-design ──► /spec-os-plan
```

**Output:** `brief.md`, `spec.md`, `tasks.md` — everything the developer needs to start Phase 2.

---

## /spec-os-brainstorm

Analyze an idea. Identify the real problem. Create `brief.md` and resolve the Feature in the tracker.

```text
You: /spec-os-brainstorm

AI:  What idea would you like to analyze?

You: Equipment status email notifications when status changes

AI:  Real problem: operations has no visibility into status changes —
     they discover issues reactively, after delays.

     Proposed solution: event-driven email notifications on status change,
     configurable per equipment type and recipient role.

     Classification: Feature | Complexity: medium

     Searching ADO for related Feature... not found.
     Create Feature "Equipment status email notifications"? [y/n]

You: y

AI:  Created Feature F042 in ADO.
     Created: spec-os/changes/F042-S24-equipment-notifications/brief.md
     Run /spec-os-design to continue.
```

The `brief.md` it creates is **never modified** afterward — it's the permanent record of intent.

---

## /spec-os-design

Write the technical spec from `brief.md`. Translates "what and why" into a formal observable behavior contract.

```text
You: /spec-os-design

AI:  Found: F042 — Equipment status email notifications
     Spec-level: full (new feature with observable API contract)
     Confirm? [y/n]

You: y

AI:  ─────────────────────────────────────
     Proposed: spec.md
     ─────────────────────────────────────
     [full spec draft with requirements and Given/When/Then scenarios]
     ─────────────────────────────────────
     Create this spec? [y / n / edit]

You: y

AI:  Created: spec.md, spec-delta.md
     Run /spec-os-plan to continue.
```

---

## /spec-os-plan

Decompose the spec into User Stories with Acceptance Criteria and atomic implementation tasks.

```text
You: /spec-os-plan

AI:  ─────────────────────────────────────
     Proposed User Stories for F042:
     ─────────────────────────────────────
     US #1 — Configure notification recipients (SP: 3)
       AC-1: GIVEN an equipment type exists WHEN admin sets recipients
             THEN the configuration is saved and confirmable

     US #2 — Send status change notification (SP: 5)
       AC-1: GIVEN a recipient is configured WHEN equipment status changes
             THEN an email is sent within 30 seconds
     ─────────────────────────────────────
     Create these User Stories in ADO? [y / n / edit]

You: y

AI:  Created US #182, US #183 in ADO.
     [proposes full tasks.md]
     Create tasks.md? [y / n / edit]

You: y

AI:  2 US created · 6 tasks planned
     Run /spec-os-implement T01 to begin.
```

Story Points are set **exclusively** here. `/spec-os-brainstorm` sets only a directional complexity signal.

---

## Cross-Repo Initiative

When a business requirement affects multiple applications, use `/spec-os-explore` first (personal skill, Claude Desktop):

```text
[In Claude Desktop]
You: /spec-os-explore

You: Migrate equipment data from the legacy ERP to the new portal

AI:  Systems affected: erp (source) → shared-services (sync) → portal (target)
     Generated:
     20260322-1430-initiative-equipment-migration-erp.md
     20260322-1430-initiative-equipment-migration-portal.md
     ...
```

Then pass each per-repo file to `/spec-os-brainstorm` in the corresponding project:

```text
[In erp repo]
You: /spec-os-brainstorm 20260322-1430-initiative-equipment-migration-erp.md
```

## Next Steps

← [Back to Workflow Overview](01-workflow-overview.md)

- [Phase 2 — Implementation](04-implement.md) — execute what was designed
