---
name: agteamos-adr
description: >
  Architecture Decision Records using the Nygard format. Covers the full
  lifecycle of an ADR, numbering conventions, index management, immutability
  rules, guidance on when to write an ADR vs. a lighter decision-log entry,
  and an optional agteamos-premortem pass before a decision moves to
  Accepted.
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

**Test de 3 cláusulas (AND, no OR)** — escribir un ADR solo si las tres son
ciertas a la vez; si falta una sola, no califica, sin importar cuán
importante se sienta la decisión:

1. **Difícil de revertir** — cambiarla después cuesta caro (migración de
   datos, romper un contrato público, reescribir una capa entera).
2. **Sorprendente sin contexto** — alguien que lea el código sin la
   deliberación detrás no entendería por qué se hizo así.
3. **Resultado de un trade-off real** — hubo al menos una alternativa seria
   evaluada y descartada, no una sola opción obvia.

Si la decisión es reversible fácilmente, o es autoexplicativa leyendo el
código, o no hubo ningún trade-off real (la opción elegida era la única
sensata), **no escribir el ADR** — anotarla en `decision-log.md` si acaso, y
seguir. ADRs ofrecidos con moderación valen más que un ADR por cada elección.

Ejemplos que sí pasan las 3 cláusulas:
- Affects more than one service or team, changes a technology choice/framework/library/protocol, or establishes a cross-cutting pattern (auth strategy, error format, pagination) — siempre que además sea difícil de revertir y haya habido alternativas reales evaluadas.

Do NOT write an ADR for:

- Implementation details inside a single service
- Third-party configuration choices with low switching cost
- Decisions that will be re-evaluated in the same sprint

For lightweight decisions that do not meet the ADR bar, append an entry to
`agteamos/decisions/decision-log.md` with date, context, and conclusion in one paragraph.

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

## Premortem (optional — fill in only if `agteamos-premortem` was run)

Distinto de "Consequences → Negative" abajo: esa lista es aditiva ("estos
son los costos que aceptamos"); esto es un caso argumentado en contra de la
decisión — construido para encontrar la grieta que la mata, no para listar
trade-offs conocidos. Omitir esta sección por completo si no se corrió el
premortem — no rellenarla con una versión suave de "Negative".

**Veredicto:** {una a tres frases, sin anestesia}
**Grieta más letal:** {la que invalidaría esta decisión si se materializa}
**Mitigación aceptada:** {qué se decidió hacer al respecto, o "se acepta el
riesgo tal cual" si el equipo decidió seguir de todos modos}

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
  **Premortem opcional (nunca automático, nunca bloqueante)** antes de pasar
  a `Accepted`: para decisiones de alto impacto o difíciles de revertir,
  ofrecer correr `agteamos-premortem` sobre la decisión propuesta. Si se
  corre, el veredicto se anexa en la sección `## Premortem` del ADR (ver
  template) — no bloquea la aceptación, es información para decidir con los
  ojos abiertos. Una vez `Accepted`, el ADR (y su sección Premortem, si la
  tiene) queda inmutable como el resto del documento.
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
agteamos/architecture/adr/ADR-001-use-fastapi-over-flask.md
agteamos/architecture/adr/ADR-002-postgres-as-primary-datastore.md
agteamos/architecture/adr/ADR-003-jwt-for-api-authentication.md
```

### Index management

Maintain `agteamos/architecture/adr/README.md` as the ADR index. Update it every time a new
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
- [ ] Para decisiones de alto impacto o difíciles de revertir, se ofreció (no necesariamente se corrió) `agteamos-premortem` antes de `Accepted` — si se corrió, la sección `## Premortem` está llena
- [ ] Status field is one of: Proposed / Accepted / Deprecated / Superseded
- [ ] Date field is set to the acceptance date
- [ ] Deciders field lists who approved the decision
- [ ] ADR index (`agteamos/architecture/adr/README.md`) is updated
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

**Escribir un ADR que solo pasa 1 o 2 de las 3 cláusulas.**
Una decisión reversible-pero-sorprendente, o difícil-de-revertir-pero-obvia,
no es un ADR — es ruido documental. Aplicar el AND-gate completo, no una
mayoría.

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

**Confundir la sección Premortem con Consequences → Negative.**
Negative es una lista de costos ya aceptados por quien decide; Premortem es
un caso argumentado en contra, construido antes de decidir. Rellenar
Premortem con una copia suave de Negative (o viceversa) le quita el valor a
ambas secciones.

**Tratar `agteamos-premortem` como un gate obligatorio del ADR.**
Es opcional siempre — forzarlo en cada ADR (incluso los triviales) convierte
una herramienta de alto valor para decisiones grandes en burocracia
adicional. Ofrecerlo quiere decir preguntarlo, no imponerlo.
