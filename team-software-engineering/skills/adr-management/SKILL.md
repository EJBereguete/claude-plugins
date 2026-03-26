---
name: ADR Management
description: >
  Architecture Decision Records using the Nygard format. Covers the full
  lifecycle of an ADR, numbering conventions, index management, immutability
  rules, and guidance on when to write an ADR vs. a lighter decision-log entry.
used_by:
  - architect
  - security-engineer
---

# Skill: ADR Management

## CONTRACT

Every architecturally significant decision MUST be captured in a numbered ADR
file before the implementation begins. An ADR that has been accepted is
IMMUTABLE. To revise a past decision, open a new ADR that supersedes the old
one. The old ADR is updated only to add the `Superseded-By` field and to
change its status to `Superseded`.

---

## CORE CONCEPTS

### What qualifies as an ADR

Write an ADR when the decision:

- Affects more than one service or team
- Changes a technology choice, framework, library, or protocol
- Establishes a cross-cutting pattern (auth strategy, error format, pagination)
- Has meaningful long-term consequences if changed later
- Would cause confusion if a new team member discovered it without context

Do NOT write an ADR for:

- Implementation details inside a single service
- Third-party configuration choices with low switching cost
- Decisions that will be re-evaluated in the same sprint

For lightweight decisions that do not meet the ADR bar, append an entry to
`docs/decision-log.md` with date, context, and conclusion in one paragraph.

### Nygard Format

```markdown
# ADR-{NNN}: {Title}

**Status:** {Proposed | Accepted | Deprecated | Superseded}
**Date:** YYYY-MM-DD
**Deciders:** {names or roles}
**Superseded-By:** ADR-{NNN}  <!-- only if status is Superseded -->
**Supersedes:** ADR-{NNN}     <!-- only if this ADR replaces another -->

## Context

Describe the forces at play: technical constraints, business requirements,
team experience, time pressure, and alternatives that were considered.
Write in present tense. Keep it factual, not opinionated.

## Decision

State the decision clearly in active voice.
"We will use X because Y."

## Consequences

### Positive
- List benefits that follow from this decision.

### Negative
- List costs, risks, or trade-offs accepted.

### Neutral
- List things that change but are neither good nor bad on their own.
```

### Lifecycle

```
Proposed → Accepted → Deprecated   (decision still valid but being phased out)
                    → Superseded   (replaced by a newer ADR)
```

- **Proposed**: draft, open for team discussion. Can be changed freely.
- **Accepted**: merged into the main branch. IMMUTABLE — no edits to content.
- **Deprecated**: the decision is still in effect but being retired. Add a
  deprecation note at the top pointing to the migration path.
- **Superseded**: a new ADR replaces this one. Add `Superseded-By: ADR-NNN`
  and change status. Do not delete the file.

### Numbering conventions

- Files are named `ADR-NNN-short-title.md` where NNN is zero-padded to 3 digits.
- Numbers are sequential and permanent. Never reuse a number.
- Start at `ADR-001`.
- The title slug uses kebab-case and is derived from the ADR title.

Examples:
```
docs/adr/ADR-001-use-fastapi-over-flask.md
docs/adr/ADR-002-postgres-as-primary-datastore.md
docs/adr/ADR-003-jwt-for-api-authentication.md
```

### Index management

Maintain `docs/adr/README.md` as the ADR index. Update it every time a new
ADR is merged or a status changes.

```markdown
# Architecture Decision Records

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](ADR-001-use-fastapi-over-flask.md) | Use FastAPI over Flask | Accepted | 2024-03-01 |
| [ADR-002](ADR-002-postgres-as-primary-datastore.md) | PostgreSQL as primary datastore | Accepted | 2024-03-05 |
| [ADR-003](ADR-003-jwt-for-api-authentication.md) | JWT for API authentication | Superseded | 2024-04-10 |
| [ADR-004](ADR-004-oauth2-opaque-tokens.md) | OAuth2 opaque tokens supersede JWT | Accepted | 2024-06-01 |
```

---

## EXAMPLES

### Real ADR — FastAPI over Flask

```markdown
# ADR-001: Use FastAPI Over Flask for the Backend API

**Status:** Accepted
**Date:** 2024-03-01
**Deciders:** backend-engineer, architect

## Context

We need a Python HTTP framework for a new internal SaaS API. The team has
Flask experience but has been evaluating alternatives. Key requirements:

- Automatic OpenAPI 3.1 documentation generation (required by the client)
- Native async/await support to handle concurrent I/O without threads
- Runtime request validation without boilerplate
- Active maintenance and growing community

Flask 3.x added async support but it is opt-in and the ecosystem (extensions)
remains mostly synchronous. Generating OpenAPI docs with Flask requires
flask-smorest or flasgger, which add complexity. FastAPI provides all of this
out of the box via Pydantic and Starlette.

Django was also evaluated and discarded: it carries ORM, admin, and template
engine overhead that is irrelevant for a pure API service.

## Decision

We will use FastAPI (0.111+) with Pydantic v2 for all new backend services.
Flask will not be used for new projects but will not be migrated forcibly in
existing services.

## Consequences

### Positive
- Automatic OpenAPI docs at /docs and /redoc with zero extra configuration.
- Request/response validation via Pydantic models eliminates manual validation
  boilerplate.
- Native async allows efficient handling of database and HTTP I/O.
- Type hints are enforced at runtime, improving IDE support and catching bugs
  earlier.

### Negative
- The team needs to learn Pydantic v2 (migration from v1 has breaking changes).
- Starlette middleware patterns differ from Flask blueprints; existing Flask
  knowledge does not transfer directly.

### Neutral
- Dependency injection via Depends() replaces Flask's application context
  pattern. Neither is objectively better; it is a different mental model.
- Testing approach changes from Flask test_client to httpx.AsyncClient or
  FastAPI TestClient.
```

### Supersession example

When ADR-003 (JWT) is replaced by ADR-004 (OAuth2 opaque tokens):

```markdown
# ADR-003: JWT for API Authentication

**Status:** Superseded
**Date:** 2024-04-10
**Deciders:** backend-engineer, security-engineer
**Superseded-By:** ADR-004

## Context
...original context...

## Decision
We will use JWT (RS256) for authenticating API requests.

## Consequences
...original consequences...

---
> This ADR was superseded by ADR-004 on 2024-06-01 due to token revocation
> limitations discovered during the security audit.
```

---

## CHECKLIST

- [ ] Decision meets the ADR threshold (cross-cutting, long-term consequences)
- [ ] File is named `ADR-NNN-slug.md` with sequential number
- [ ] All four sections present: Context, Decision, Consequences (Positive /
      Negative / Neutral)
- [ ] Status field is one of: Proposed / Accepted / Deprecated / Superseded
- [ ] Date field is set to the acceptance date
- [ ] Deciders field lists who approved the decision
- [ ] ADR index (`docs/adr/README.md`) is updated
- [ ] If superseding an older ADR: the old file has `Superseded-By` added and
      status changed to `Superseded`
- [ ] ADR is merged before implementation begins, not after

---

## ANTI-PATTERNS

**Editing an accepted ADR.**
An accepted ADR is a historical record. Editing it erases the audit trail.
Instead, open a new ADR with `Supersedes: ADR-NNN` and explain what changed
and why.

**Writing ADRs retroactively.**
An ADR written after the code is deployed cannot change the decision. It
creates a false sense of documentation without the actual deliberation.
If caught late, mark it as `Accepted` with the real date and note in Context
that it was documented retroactively.

**Using ADRs for implementation details.**
"We will use a `UserService` class with a `create_user` method" is not an
ADR — it is a code-level design choice. ADRs document technology and
architecture decisions, not implementation specifics.

**Skipping the Consequences section.**
A decision without documented trade-offs is incomplete. Future maintainers
need to know what was knowingly accepted, not just what was chosen.

**Leaving ADRs in Proposed status indefinitely.**
A Proposed ADR that is never accepted or rejected creates confusion. If the
decision was made informally and already implemented, mark it Accepted. If it
was abandoned, add a note explaining why and change status to a custom
`Rejected` status.

**One ADR for multiple unrelated decisions.**
Each ADR must capture exactly one decision. Bundling multiple choices makes
it impossible to supersede one without affecting the others.
