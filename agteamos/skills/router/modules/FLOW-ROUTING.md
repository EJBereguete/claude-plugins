# Flow routing (Fase C)

Load after `REPO-STATE.md`. Input is its compact repository state plus the
user's current request.

## Decision order

1. If `platform_ready=false`, run `agteamos-setup` only for unresolved
   blockers (`repo_host`, `tracker`, `branch_strategy`). Do not repeat already
   confirmed setup.
2. If the user explicitly requests cancelling or abandoning an active local
   change, route to `agteamos-implement` → `ABANDON-CHANGE.md`. Inspect first;
   external mutation and archive require one exact dry-run approval.
3. If `repo_has_code=false`, select Flow 1.
4. If the request only manages a tracker/board, use `agteamos-work-items`:
   - reads/reports: inspect repo and tracker; no approval needed;
   - mutations: structured draft, exact approval, apply, and read-back verify.
   If implementation is later requested, continue routing with the verified
   work-item ID.
5. Detect an existing ticket reference:
   - GitHub issue/PR URL, `#42`, `issue 42`, or `PR 42`;
   - Azure work-item URL, `AB#1234`, `work item 1234`, or equivalent.
   If found, select Flow 3. Do not infer its type from wording; read it.
6. If no ticket exists and the request is a symptom/problem without a proposed
   solution, offer `agteamos-explore`. This is a suggestion, never a gate.
7. Otherwise select Flow 2.

Do not infer a ticket solely from an unrelated number.

## Flow 1 — New project

Use `agteamos-bootstrap`:

1. Architect captures vision, stack, project context, and initial ADR.
2. Product manager captures mission/KPIs and a proposed roadmap, not a
   fabricated backlog.
3. DevOps creates the minimal scaffold, branch setup, and CI.
4. Architect finalizes lazy onboarding and initial README.

Design systems, backlog, tickets, and domain artifacts appear only from their
real trigger.

## Explore mode

Use `agteamos-explore` when requested directly or accepted after a
problem-first suggestion. It reads real code and compares concrete trade-offs
without creating a branch or `agteamos/changes/`. Its output either feeds
Flow 2 or records that exploration should continue.

## Flow 2 — New work without ticket

Use `agteamos-task`:

1. Gather only missing product context.
2. Product manager defines acceptance criteria and value.
3. Architect inspects real code and impact.
4. Validate INVEST and split work when necessary.
5. `agteamos-work-items` inspects the provider, builds a draft, requests exact
   approval, applies, and verifies.
6. Continue automatically as Flow 3 with the verified ID.

## Flow 3 — Existing work item

Use:

1. `agteamos-work-items inspect-tracker` for a read-only current snapshot.
2. If the real item is a Bug, load
   `agteamos-fix/modules/BUG-INTAKE.md`; it inspects repo evidence and chooses
   simple lite or complex full before any branch/code.
3. Otherwise, `agteamos-implement` checks minimum readiness.
4. If information is insufficient, `agteamos-task` gathers/splits it.
5. Initialize durable tracking, branch, implementation, tests, QA, validation,
   review, PR/merge, tracker reconciliation, and archive through
   `agteamos-implement`.

Provider routing comes from confirmed `platform.yml`:

- GitHub tracker/repo operations use supported GitHub adapters; issue
  auto-close may use `Closes #42`.
- Azure work items use supported Azure DevOps adapters; references may use
  `AB#1234`.
- PR operations belong to `agteamos-pr`, not directly to this router.

## Classification examples

- "Agrega autenticacion JWT" -> Flow 2.
- "Trabaja en #42" -> Flow 3, GitHub.
- "Trabaja en AB#1234" -> Flow 3, Azure.
- Empty repo + product idea -> Flow 1.
- "Las listas van lentas y no sé por qué" -> offer Explore, then Flow 2 if
  declined.
- "Mueve AB#1234 al Sprint 12" -> board-only `agteamos-work-items`.

The router returns the selected flow and hands off. It does not duplicate the
selected skill's implementation.
