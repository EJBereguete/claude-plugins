# Phase 2 — Implementation

Owned by the **Developer**. Executes `tasks.md` produced in Phase 1. One task per session, one atomic commit per task.

```
/spec-os-implement ──► /spec-os-verify ──► /spec-os-doc ──► /spec-os-sync
```

---

## /spec-os-implement

Execute one task. One session. One commit.

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

AI:  [backend-dev implements NotificationDispatcher.cs + test]
     Tests: 12 passing
     Reconcile: clean

     Review diff and approve? [y/n]

You: y

AI:  Committed: feat(equipment): add NotificationDispatcher [F042-T01]
     T01 done. Next: T02.
```

Repeat for each task until all tasks in a User Story are done, then run `/spec-os-verify`.

### Resuming an Interrupted Session

If a session was cut short, just re-invoke the same task:

```text
You: /spec-os-implement T03

AI:  T03 status: in-progress (claimed by: ivan)
     Last known state: created NotificationSubscription entity,
                       DI registration pending.
     Continuing from last known state.
```

### Spec Change During Implementation

`/spec-os-implement` checks for spec drift automatically after each task (RECONCILE step):

```text
AI:  Reconciling spec...
     Discovery: equipment cannot receive notifications while 'decommissioned'.
     This constraint is not in spec.md.

     Propose spec update? [y/n]

You: y

AI:  Updated spec.md and wrote spec-delta.md entry.
     Tasks affected: T05 (add status guard in dispatcher)
     Propose tasks.md update for T05? [y/n]
```

---

## /spec-os-verify

Quality gate for a User Story. Run after all tasks in a US are done.

```text
You: /spec-os-verify
```

**Flow:**
1. `qa-engineer` audits AC coverage → proposes gaps → dev approves
2. Writes and runs tests, fills `verify-report.md`
3. Checks scope compliance, conventions, DoD, no placeholders

**PASS** → creates PR, updates tracker US to `in-review`, routes to `/spec-os-doc` (if `doc-impact: true`) and `/spec-os-sync`.

**FAIL** → writes FAIL entry to `verify-report.md`, identifies responsible task → routes back to `/spec-os-implement`.

---

## /spec-os-doc

Update user-facing documentation. Runs only if at least one task in the US has `doc-impact: true`.

Reads `spec.md` + tracker US → drafts `docs/manual/{domain}.md` update in plain language → dev approves before writing.

---

## /spec-os-sync

Sync lessons from session logs to the knowledge base. Always the last step in the chain.

Reads `session-log.md` lessons with `pending: true`, filters to `generalizable: yes`, validates domain tags, writes to `spec-os/specs/knowledge-base.md`. Idempotent — safe to re-run.

After `/spec-os-sync` completes, consider running `/spec-os-audit` to capture framework quality signals from the session.

---

## Next Steps

← [Back to Workflow Overview](01-workflow-overview.md)

- [Maintenance](05-maintenance.md) — bugs, abandons, cleanup, audit
