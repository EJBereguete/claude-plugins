---
name: agteamos-decisions
description: >
  Reemplaza a agteamos-adr, agteamos-rfc, agteamos-out-of-scope y
  agteamos-premortem, fusionadas en una sola skill de gobernanza de
  decisiones. Cubre los cuatro sub-tipos del mismo proceso, que vive en
  agteamos/decisions/: RFC (discusion abierta antes de implementar), ADR
  formato Nygard (decision tomada e inmutable), Out-of-scope (direccion
  rechazada explicitamente por el usuario) y Premortem (critica opcional de
  ocho angulos, invocable antes de que un RFC o ADR pase a Accepted).
used_by:
  - architect
  - product-manager
  - security-engineer
---

# Skill: Decisions (agteamos-decisions)

## CONTRACT

RFC, ADR, Out-of-scope y Premortem son cuatro sub-tipos de un mismo proceso
de gobernanza de decisiones que vive en `agteamos/decisions/`:

- **RFC** (`agteamos/decisions/rfcs/`): discusión abierta antes de que
  empiece la implementación. Se usa cuando el cambio es cross-team, toca un
  contrato público o tiene riesgo arquitectónico significativo.
- **ADR** (`agteamos/architecture/adr/`, formato Nygard): la decisión ya
  tomada, registrada de forma numerada e inmutable una vez `Accepted`.
- **Out-of-scope** (`agteamos/decisions/out-of-scope/`): una dirección que el
  usuario evaluó y rechazó explícitamente — no una decisión tomada (eso es
  un ADR), sino un pedido declinado con su razonamiento.
- **Premortem**: crítica opcional de ocho ángulos, de solo lectura y
  opinión, invocable a demanda o como paso antes de que un RFC o un ADR pase
  de `Under Review`/`Proposed` a `Accepted`. Nunca es un gate automático ni
  bloqueante.

Un RFC aceptado suele producir uno o más ADRs. Un ADR nunca reemplaza a un
registro de out-of-scope ni viceversa — son memorias complementarias. El
premortem puede alimentar tanto a un RFC como a un ADR antes de que pasen a
`Accepted`, pero también se invoca standalone sobre cualquier idea, plan o
proyecto.

---

## RFC (discusión abierta)

### CONTRACT

Un RFC es requerido antes de empezar cualquier trabajo cuando un cambio es
cross-team, introduce una abstracción compartida nueva, modifica un
contrato de API público, o carga un riesgo arquitectónico significativo. El
RFC es el registro escrito de la propuesta, la discusión y la decisión
final. La implementación no puede empezar hasta que el RFC llegue a estado
`Accepted`.

### CORE CONCEPTS

#### When an RFC is required

**RFC required:**
- Introducing or replacing a shared service, library, or platform component
- Changing a public API contract (adding mandatory fields, removing endpoints,
  changing auth scheme)
- Changing data models that multiple services depend on
- Introducing a new technology into the stack (new language, database, queue)
- Changing a process that affects how multiple teams ship (deploy pipeline,
  branching strategy, testing policy)
- Any decision with a blast radius that crosses one team boundary

**RFC NOT required — a PR with a detailed description is enough:**
- Bug fixes, even complex ones, that stay within one service
- Adding a new endpoint that follows an established pattern
- Refactors that do not change public contracts
- New features entirely contained within one team's scope
- Dependency upgrades without breaking changes

**Borderline cases:** if in doubt, write a short RFC. A one-page RFC that
turns out to be unnecessary costs less than a contentious implementation that
needs to be rolled back.

#### RFC vs. ADR

| Artifact | Purpose | When created | Who writes |
|----------|---------|--------------|------------|
| RFC | Propose and discuss a change before it happens | Before implementation | Any engineer |
| ADR | Record a decision that was made | At decision time | Architect or lead |

An accepted RFC often produces one or more ADRs. The RFC captures the
deliberation; the ADR captures the final decision concisely.

#### Lifecycle

```
Draft → Under Review → Accepted
                     → Rejected
                     → Withdrawn  (author decides not to proceed)
```

- **Draft**: author is still writing; not open for formal review yet.
- **Under Review**: RFC is published, review period is open (minimum 5
  business days for cross-team RFCs, 2 days for single-team).
- **Accepted**: consensus reached, implementation can begin.
- **Rejected**: proposal declined; rejection reason recorded in the RFC.
- **Withdrawn**: author abandons the proposal; no implementation.

Once `Accepted` or `Rejected`, the RFC content is frozen. Append a
resolution summary at the top rather than editing body sections.

#### Review process

1. Author opens a PR with the RFC file in `agteamos/decisions/rfcs/RFC-NNN-slug.md`.
2. Author announces in the team channel with a link and the review deadline.
3. Reviewers leave comments directly on the PR.
4. Author updates the RFC to address feedback (edits are allowed during
   `Under Review`).
4.5. **Premortem opcional (nunca automático, nunca bloqueante)**: antes de
   que el architect decida, cualquiera puede ofrecer correr
   `agteamos-decisions` (ver sección "Premortem" más abajo) sobre la opción
   propuesta (no sobre las descartadas en "Alternatives Considered" — esa
   tabla ya es comparativa; el premortem ataca la opción ganadora, algo que
   hoy nadie hace de forma sistemática). Es distinto de "Alternatives
   Considered": esa sección explica por qué NO se eligieron otras opciones;
   el premortem argumenta por qué la elegida podría fallar igual. Si se
   corre, el veredicto se anexa en la sección `## Premortem` del RFC (ver
   template) antes de pasar a Accepted — no bloquea la decisión, es
   información para tomarla con los ojos abiertos.
5. Architect (or tech lead) posts the final decision as a PR comment:
   `Decision: Accepted` or `Decision: Rejected — reason`.
6. PR is merged with status updated to `Accepted` or `Rejected`.
7. If the RFC produces ADRs, they are linked from the RFC resolution section.

Quorum: at least two engineers outside the author's immediate team must
review a cross-team RFC before it can be accepted.

#### Numbering and file location

```
agteamos/decisions/rfcs/RFC-001-unified-auth-service.md
agteamos/decisions/rfcs/RFC-002-event-driven-notifications.md
agteamos/decisions/rfcs/README.md   ← index
```

Numbers are sequential, zero-padded to 3 digits, and never reused.

### EXAMPLES

#### RFC Template

```markdown
# RFC-{NNN}: {Title}

**Status:** Draft | Under Review | Accepted | Rejected | Withdrawn
**Date:** YYYY-MM-DD
**Author:** {name or role}
**Reviewers:** {names or roles}
**Review Deadline:** YYYY-MM-DD
**Related ADRs:** ADR-NNN (if any)

---

## Summary

One or two sentences describing what this RFC proposes.

## Motivation

Why is this change needed? What problem does it solve?
Describe the current situation and its shortcomings. Be specific —
reference tickets, metrics, or incidents if relevant.

## Proposal

Describe the proposed solution in enough detail that a reviewer can
evaluate it without asking clarifying questions.

Include:
- Technical design (diagrams, schemas, pseudocode if helpful)
- API changes (new endpoints, modified contracts)
- Data model changes
- Migration strategy for existing data or clients
- Rollout plan (feature flags, phased rollout, etc.)

## Alternatives Considered

List the alternatives that were evaluated and explain why they were
not chosen. This section is mandatory — an RFC with no alternatives
suggests the proposal was not thoroughly evaluated.

| Alternative | Reason Not Chosen |
|-------------|-------------------|
| Option A    | ...               |
| Option B    | ...               |

## Premortem (optional — fill in only if `agteamos-decisions` was run)

Veredicto de `agteamos-decisions` sobre la opción propuesta (no sobre las
descartadas arriba). Omitir esta sección por completo si no se corrió — no
inventar un premortem falso para "completar" el template.

**Veredicto:** {una a tres frases, sin anestesia}
**Grieta más letal:** {la que mataría esta propuesta si se materializa}
**Mitigación aceptada:** {qué se decidió hacer al respecto, o "se acepta el
riesgo tal cual" si el equipo decidió seguir de todos modos}

## Impact

### Services affected
List every service, team, or external consumer that will need to change.

### Breaking changes
Explicitly state: "This RFC introduces no breaking changes" or describe
what breaks, for whom, and the migration path.

### Performance implications
Estimated impact on latency, throughput, storage, or cost.

### Security implications
New attack surface, changed trust boundaries, or data sensitivity changes.

## Acceptance Criteria

A numbered list of verifiable conditions that must be true for this RFC
to be considered fully implemented.

1. All existing API consumers pass their contract tests against the new
   implementation.
2. Migration script runs in under 10 minutes on staging dataset.
3. P99 latency on /auth/token endpoint stays below 150ms under load test.

---

## Resolution (filled in when status changes from Under Review)

**Decision:** Accepted / Rejected / Withdrawn
**Date:** YYYY-MM-DD
**Decided by:** {name or role}
**Summary:** One paragraph explaining the final decision and any conditions.
**Follow-up ADRs:** ADR-NNN, ADR-NNN
```

#### Real RFC example — Unified Auth Service

```markdown
# RFC-001: Introduce a Unified Authentication Service

**Status:** Accepted
**Date:** 2024-05-10
**Author:** backend-engineer
**Reviewers:** architect, security-engineer, frontend-engineer
**Review Deadline:** 2024-05-17
**Related ADRs:** ADR-005

---

## Summary

Replace the per-service JWT validation logic with a single internal
AuthService that all backend services call to validate tokens.

## Motivation

We currently have token validation logic duplicated in four services
(api-gateway, billing-service, notification-service, admin-api). When
we discovered a timing attack in our JWT comparison in March 2024
(incident INC-042), we had to patch four codebases. A shared service
eliminates that duplication and centralizes the security surface.

## Proposal

Deploy `auth-service` as an internal gRPC service. Each backend service
calls `auth-service.ValidateToken(token)` on every authenticated request
instead of validating locally.

gRPC interface:
```protobuf
service AuthService {
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
}

message ValidateTokenRequest {
  string token = 1;
}

message ValidateTokenResponse {
  bool valid = 1;
  string user_id = 2;
  repeated string roles = 3;
  google.protobuf.Timestamp expires_at = 4;
}
```

Migration: services migrate one at a time behind a feature flag. Both
local and remote validation run in parallel for two sprints; local
validation is removed once remote is stable.

## Alternatives Considered

| Alternative | Reason Not Chosen |
|-------------|-------------------|
| API Gateway handles all auth | Couples gateway to business auth rules; hard to test services in isolation |
| Shared library (pip package) | Still duplicates the logic across processes; patching requires redeploying all services |

## Impact

### Services affected
api-gateway, billing-service, notification-service, admin-api

### Breaking changes
None for external API consumers. Internal service-to-service contracts
change, but migration is phased.

### Performance implications
Adds one internal gRPC call per authenticated request. Expected P99
latency increase: 2-4ms. Acceptable given current SLA of 200ms.

### Security implications
Token validation is now a network call. The internal network must
enforce mTLS between services to prevent token interception.

## Acceptance Criteria

1. All four services validate tokens via auth-service in production.
2. Local validation code is removed from all four services.
3. auth-service has 99.9% uptime over a 30-day observation period.
4. P99 latency increase on /api/v1/* endpoints is below 10ms.

---

## Resolution

**Decision:** Accepted
**Date:** 2024-05-18
**Decided by:** architect
**Summary:** Proposal accepted with one condition: mTLS must be
enforced at the network layer before auth-service reaches production.
The phased rollout plan is approved.
**Follow-up ADRs:** ADR-005
```

### CHECKLIST

- [ ] Change meets the RFC threshold (cross-team, public contract, new tech)
- [ ] All mandatory sections are present: Summary, Motivation, Proposal,
      Alternatives Considered, Impact, Acceptance Criteria
- [ ] At least two alternatives are documented
- [ ] Para RFCs cross-team o de alto riesgo, se ofreció (no necesariamente se corrió) `agteamos-decisions` antes de la decisión — si se corrió, la sección `## Premortem` está llena; si no se ofreció y el RFC es de alto riesgo, es una omisión a señalar en review
- [ ] Breaking changes are explicitly stated (or explicitly absent)
- [ ] Review deadline is set (minimum 5 business days for cross-team)
- [ ] At least two reviewers outside the author's team are named
- [ ] RFC is announced in the team channel before review period starts
- [ ] Resolution section is filled in before the RFC PR is merged as Accepted
      or Rejected
- [ ] ADRs that follow from this RFC are linked in the Resolution section
- [ ] RFC index (`agteamos/decisions/rfcs/README.md`) is updated

### ANTI-PATTERNS

**Starting implementation before the RFC is accepted.**
Work done before consensus creates sunk-cost pressure to accept a flawed
proposal. If exploration is needed to write the RFC, timebox it as a spike
and do not merge the spike code.

**RFC as a rubber stamp for an already-decided plan.**
The review period must be genuine. If the author is not willing to change
the proposal based on feedback, the RFC process is theater. Reviewers should
feel empowered to reject or request substantial changes.

**Skipping the Alternatives section.**
"We only considered one option" is almost never true. Omitting alternatives
signals that the evaluation was shallow. Reviewers will (correctly) push back.

**Writing an RFC for every PR.**
RFCs add process overhead. Applying them to single-service changes or
routine features slows delivery without proportional benefit. Use the
criteria table in the Core Concepts section to decide.

**Acceptance Criteria that cannot be verified.**
"The system will be more maintainable" is not a criterion. Every acceptance
criterion must be binary: pass or fail. If it cannot be tested or measured,
rewrite it.

**Letting RFCs expire in Under Review.**
An RFC that nobody merges or rejects is noise. The architect or tech lead
is responsible for driving to a decision within one week of the review
deadline. If the RFC needs more work, move it back to Draft explicitly.

**Tratar `agteamos-decisions` como un gate obligatorio del RFC.**
Es opcional siempre — forzarlo en cada RFC (incluso los chicos) convierte
una herramienta de alto valor para decisiones grandes en burocracia
adicional. Ofrecerlo quiere decir preguntarlo, no imponerlo.

---

## ADR (decisión tomada, formato Nygard)

### CONTRACT

Every architecturally significant decision MUST be captured in a numbered ADR
file before the implementation begins. An ADR that has been accepted is
IMMUTABLE. To revise a past decision, open a new ADR that supersedes the old
one. The old ADR is updated only to add the `Superseded-By` field and to
change its status to `Superseded`.

### CORE CONCEPTS

#### What qualifies as an ADR

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

#### Nygard Format

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

## Premortem (optional — fill in only if `agteamos-decisions` was run)

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

#### Lifecycle

```
Proposed → Accepted → Deprecated   (decision still valid but being phased out)
                    → Superseded   (replaced by a newer ADR)
```

- **Proposed**: draft, open for team discussion. Can be changed freely.
  **Premortem opcional (nunca automático, nunca bloqueante)** antes de pasar
  a `Accepted`: para decisiones de alto impacto o difíciles de revertir,
  ofrecer correr `agteamos-decisions` (ver sección "Premortem" más abajo)
  sobre la decisión propuesta. Si se corre, el veredicto se anexa en la
  sección `## Premortem` del ADR (ver template) — no bloquea la aceptación,
  es información para decidir con los ojos abiertos. Una vez `Accepted`, el
  ADR (y su sección Premortem, si la tiene) queda inmutable como el resto
  del documento.
- **Accepted**: merged into the main branch. IMMUTABLE — no edits to content.
- **Deprecated**: the decision is still in effect but being retired. Add a
  deprecation note at the top pointing to the migration path.
- **Superseded**: a new ADR replaces this one. Add `Superseded-By: ADR-NNN`
  and change status. Do not delete the file.

#### Numbering conventions

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

#### Index management

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

### EXAMPLES

#### Real ADR — FastAPI over Flask

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

#### Supersession example

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

### CHECKLIST

- [ ] Decision meets the ADR threshold (cross-cutting, long-term consequences)
- [ ] File is named `ADR-NNN-slug.md` with sequential number
- [ ] All four sections present: Context, Decision, Consequences (Positive /
      Negative / Neutral)
- [ ] Para decisiones de alto impacto o difíciles de revertir, se ofreció (no necesariamente se corrió) `agteamos-decisions` antes de `Accepted` — si se corrió, la sección `## Premortem` está llena
- [ ] Status field is one of: Proposed / Accepted / Deprecated / Superseded
- [ ] Date field is set to the acceptance date
- [ ] Deciders field lists who approved the decision
- [ ] ADR index (`agteamos/architecture/adr/README.md`) is updated
- [ ] If superseding an older ADR: the old file has `Superseded-By` added and
      status changed to `Superseded`
- [ ] ADR is merged before implementation begins, not after

### ANTI-PATTERNS

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

**Tratar `agteamos-decisions` como un gate obligatorio del ADR.**
Es opcional siempre — forzarlo en cada ADR (incluso los triviales) convierte
una herramienta de alto valor para decisiones grandes en burocracia
adicional. Ofrecerlo quiere decir preguntarlo, no imponerlo.

---

## Out-of-scope (dirección rechazada)

### CONTRACT

- **Input**: una idea/feature/dirección que el usuario rechazó explícitamente
  durante una conversación (no un ticket cerrado como "ya implementado" —
  eso no es un rechazo, es duplicado, y NO se registra acá, ver ANTI-PATTERNS).
- **Output**: `agteamos/decisions/out-of-scope/<slug>.md`, un archivo por
  concepto rechazado.
- **Quién ejecuta**: quien esté liderando la conversación donde ocurrió el
  rechazo — normalmente `@product-manager` (features/producto) o `@architect`
  (decisiones técnicas). Nunca bloquea el flujo: escribir el archivo es un
  paso de un segundo, no una interrupción.
- **Diferencia con la sección ADR**: un ADR documenta una decisión **tomada**
  (elegimos X). Este archivo documenta un pedido **declinado** (nos pidieron
  X, dijimos que no, y esto es por qué). Son memorias complementarias, no
  intercambiables — un ADR nunca reemplaza a este archivo ni viceversa.

### CUÁNDO SE ESCRIBE

Cuando el usuario, en el curso de cualquier conversación, dice explícitamente
que no quiere algo que se propuso o se discutió — no cuando simplemente no
lo pidió. Ejemplos de disparadores reales:
- "No, eso no lo queremos hacer por ahora."
- "Lo evaluamos y decidimos no meter [tecnología/feature] todavía."
- Un veredicto de la sección "Premortem" (más abajo) que el usuario acepta
  como motivo para no seguir con una idea.

**Cuándo NO se escribe** (ver ANTI-PATTERNS): un ticket cerrado como
"ya implementado", un bug ya resuelto, o una feature simplemente pospuesta
sin haber sido evaluada y rechazada de fondo (eso es backlog, no rechazo).

### PROCESS

#### Step 1 — Escribir el archivo

`agteamos/decisions/out-of-scope/<slug-del-concepto>.md`:

```markdown
# Out of Scope: <nombre del concepto>

**Fecha:** YYYY-MM-DD
**Contexto:** <qué se estaba discutiendo cuando surgió>

## Qué se propuso

<descripción concreta del concepto rechazado — suficiente para reconocerlo
si alguien lo vuelve a proponer con otras palabras>

## Por qué se rechazó

<razonamiento real, no una frase genérica — "no hay presupuesto para X este
trimestre" o "el premortem mostró que Y no cierra porque Z">

## Bajo qué condición podría reconsiderarse

<opcional — si hay una condición concreta que cambiaría el veredicto
("si conseguimos el partner de pagos Y", "si el volumen supera 10k/día"),
anotarla; si no hay ninguna, decir "ninguna identificada por ahora">
```

#### Step 2 — Consulta futura (por similitud conceptual, no keyword)

Cuando `agteamos-task` o la sección "Premortem" (más abajo) estén por
proponer o preguntar sobre algo nuevo, revisar los archivos de
`agteamos/decisions/out-of-scope/` buscando **el mismo concepto expresado
distinto**, no una coincidencia literal de palabras — "agregar pagos con
crypto" y "aceptar Bitcoin como método de pago" son el mismo concepto aunque
no compartan ninguna palabra clave.

Si hay match: decirlo explícitamente antes de seguir — *"Esto ya se evaluó
el `<fecha>` y se descartó por `<razón>` (ver
`agteamos/decisions/out-of-scope/<slug>.md`). ¿Cambió algo que justifique
reabrirlo?"* — nunca lo trates como una idea nueva sin decir que ya existe
un veredicto anterior.

### ANTI-PATTERNS

- Escribir un archivo por cada ticket cerrado como "ya implementado" —
  eso es duplicado, no rechazo; contaminaría la búsqueda por similitud con
  falsos positivos.
- Escribir un archivo por una feature simplemente pospuesta sin evaluación
  real — eso es backlog (`agteamos/product/backlog.md`), no un rechazo de
  fondo.
- Buscar coincidencia literal de palabras en vez de similitud conceptual —
  el valor de este mecanismo está en atrapar la misma idea reformulada, no
  en un grep.
- Usarlo como excusa para cerrar una conversación ("ya lo dijimos que no")
  cuando el contexto real cambió — siempre preguntar si la condición que
  motivó el rechazo sigue vigente, no asumir que un rechazo es permanente.
- Confundirlo con un ADR — si la decisión fue "elegimos X en vez de Y", eso
  va en la sección "ADR" de esta skill (Alternatives Considered /
  Consequences), no acá.

---

## Premortem (crítica opcional de 8 ángulos)

### CONTRACT

- **Input**: una idea, plan, feature, RFC, o proyecto entero (path o descripción).
- **Output**: veredicto + grietas priorizadas por severidad + lista de arreglos, en el formato fijo de la sección "FORMATO DE SALIDA". Es de **solo lectura y opinión** — nunca modifica código, nunca crea tickets, nunca escribe en `agteamos/`.
- **Quién ejecuta**: quien esté liderando el paso donde se invoca — `@product-manager` para los ángulos de negocio/mercado/números, `@architect` para premisas/viabilidad/ejecución técnica. También se invoca standalone, sin depender de ningún flujo ni agente fijo.
- **Trigger**: invocación directa del usuario, o como gate **opcional** (nunca automático, nunca bloqueante) ofrecido por `agteamos-bootstrap` (Step 1.5), `agteamos-task` (Step 1.5), y por las secciones "RFC" y "ADR" de esta misma skill antes de que una propuesta pase a `Accepted`. El usuario decide si lo corre y si sigue adelante pese al veredicto — esta sección nunca detiene un flujo por sí sola.

### POR QUÉ EXISTE ESTA SECCIÓN

Convierte a Claude en el oponente de su propia respuesta amable. Por defecto
el modelo tiende a validar, suavizar y buscar el lado bueno de todo. Eso se
siente bien y arruina decisiones. Cuando alguien arriesga tiempo, dinero o
reputación en una idea, un plan o una feature, lo que necesita no es un
aplauso: necesita que alguien encuentre las grietas **antes** que el
mercado, el inversionista o el usuario real.

El trabajo de esta sección es ser ese alguien. Asume que la idea va a
fracasar y se propone demostrarlo — no por crueldad, sino porque cada grieta
que encuentra aquí es una grieta que el usuario ya no descubre tarde y caro.

### REGLA NÚMERO UNO (no negociable)

**Prohibido validar, adular, felicitar o abrir con algo positivo.** Nada de
"buena idea, pero…", "tiene mucho potencial", "me encanta el enfoque", "vas
por buen camino". Cero relleno cortés. Cero hedging defensivo ("podría ser
que tal vez…"). El primer párrafo no contiene un solo cumplido. Y esto
aplica a **toda** la respuesta — apertura, transiciones y cierre —, no solo
al inicio: el único lugar donde una fortaleza puede nombrarse es el
veredicto de supervivencia (ver "Calibración honesta"), y ahí se dice seco,
sin entusiasmo.

Asumir, como punto de partida, que la idea **va a fracasar**. El objetivo no
es ser equilibrado: es construir el caso más fuerte posible **en contra**.
La otra parte (el optimismo) ya tiene quien la defienda — es el usuario.
Aquí no.

Esto **no** significa inventar defectos ni ser contrarian por deporte.
Significa atacar los puntos débiles **reales** con el máximo rigor. Una
crítica que no se sostiene debilita todo el caso. Apuntar a las suposiciones
que cargan el peso de la idea, no a detalles cosméticos.

### CUÁNDO SE USA

Invocar esta sección cuando el usuario:

- Pide explícitamente crítica brutal, sin filtros o "que le hagan pedazos" algo.
- Presenta una idea, plan de negocio, feature, RFC, decisión o estrategia y
  quiere saber qué tiene de malo antes de comprometerse.
- Pide un pre-mortem, un red team, un "devil's advocate" o una segunda opinión dura.
- Está dentro de un proyecto de AgTeamOS y quiere que se analice **entero**
  buscando todo lo que va a salir mal.
- Escribe "critica esto sin piedad", "¿por qué va a fallar?", "destruye este
  plan", "abogado del diablo", "segunda opinión brutal".

También se ofrece como gate **opcional** — nunca automático — en:
- `agteamos-bootstrap` Step 1.5, antes de que `@architect` defina el stack (Step 2).
- `agteamos-task` Step 1.5, antes de determinar el schema de la tarea (Step 2).
- La sección "RFC" de esta skill, antes de que la opción propuesta (no las
  descartadas) pase de `Under Review` a `Accepted` — ver sección
  `## Premortem` del template de RFC.
- La sección "ADR" de esta skill, antes de que una decisión de alto impacto
  pase de `Proposed` a `Accepted` — ver sección `## Premortem` del template
  de ADR, distinta de `Consequences → Negative`.

En todos los casos, el usuario elige si lo corre; si lo salta, el flujo
continúa exactamente igual que si esta sección no existiera.

Si la petición es ambigua, **no** preguntar tres cosas antes de empezar.
Identificar el objeto a criticar (la última idea/plan/proyecto del
contexto) y proceder. Como mucho, una sola pregunta de aclaración si de
plano no hay nada concreto que atacar.

### LA ACTITUD

Tono: un fiscal en su alegato de cierre. Directo, específico, implacable,
sin adornos. Sin emojis. Sin signos de exclamación de ánimo. Frases cortas
cuando el golpe debe doler. Honestidad por encima de la cortesía, siempre.

Por debajo de la hostilidad hay un objetivo constructivo que **nunca** se
dice con cursilería pero **siempre** se cumple: el usuario tiene que
terminar con un mapa claro de qué arreglar, no tirado en el piso. Brutal con
la idea, nunca con la persona. Se ataca el plan, jamás la inteligencia de
quien lo trajo.

### LOS OCHO ÁNGULOS DE ATAQUE

Recorrer los ocho. Para cada uno, no basta con nombrar el problema: hay que
volverlo concreto, específico de **esta** idea, y falsable. Si un ángulo de
verdad no aplica, decirlo en una línea y seguir — no rellenar por rellenar.
El detalle ampliado de cada ángulo (preguntas guía, ejemplos de golpes
reales) vive en `angulos.md` (mismo directorio que esta skill) — leerlo
cuando se necesite profundizar en uno.

1. **Premisas falsas.** ¿Qué está dando por hecho que podría no ser cierto?
   Sacar a la luz la suposición que, si se cae, se cae todo. "Esto solo
   funciona si asumimos que X — y X no está demostrado."

2. **El problema y el mercado.** ¿De verdad le duele a alguien este
   problema, o solo le incomoda? ¿Lo pagarían, o solo dirían que "estaría
   padre"? Distinguir un dolor de cabeza real de un "nice to have". ¿Cuánta
   gente lo tiene y con qué frecuencia?

3. **La competencia.** ¿Quién ya lo hace — mejor, más barato o primero?
   Incluir al competidor invisible: "no hacer nada", la hoja de cálculo, el
   statu quo. Si la respuesta es "no hay competencia", esa casi siempre es
   una mala señal, no una buena.

4. **Viabilidad.** ¿Qué se rompe en la práctica? ¿Qué es mucho más difícil
   de lo que suena en la frase de pitch? Lo técnico, lo legal, lo
   operativo, lo regulatorio. Dónde está el "y aquí ocurre un milagro".

5. **Los números.** ¿Cuadra la matemática? Costo de adquirir un cliente vs.
   lo que deja, márgenes, runway, supuestos de crecimiento. Pedir o estimar
   las cifras y mostrar dónde no cierran. Una idea puede ser hermosa y aun
   así no tener economía.

6. **La ejecución.** ¿**Esta** persona o equipo, con **estos** recursos y
   **este** tiempo, puede lograrlo? La idea no existe en abstracto: la
   ejecuta alguien concreto. ¿Dónde le falta tiempo, skill, capital,
   distribución o aguante?

7. **Pre-mortem (cómo muere).** Adelantar el reloj 12 meses: el proyecto
   fracasó. Narrar la autopsia. ¿Cuál fue la causa de muerte más probable?
   Contar la historia del fracaso con detalle, no en abstracto.

8. **El punto ciego.** ¿Qué es lo que el usuario está evitando pensar? El
   tema incómodo que no aparece en su descripción precisamente porque le da
   miedo. El "elefante en la sala" que nadie nombró.

**Antes de arrancar**: revisar `agteamos/decisions/out-of-scope/` (si existe)
por similitud conceptual con la idea a criticar — si ya se descartó algo
parecido antes, decirlo (ver sección "Out-of-scope" arriba) no invalida la
crítica nueva, pero le da contexto histórico al veredicto.

**Al aplicarse a una feature puntual (gate de `agteamos-task`) en vez de
a un proyecto/negocio entero**, los ángulos 2/3/5 (mercado, competencia,
números) se reinterpretan a escala de feature: "¿este problema le duele lo
suficiente a los usuarios actuales como para priorizar esto sobre lo demás
del backlog?", "¿ya existe una forma de resolverlo con lo que el producto ya
tiene?", "¿el esfuerzo de construirlo se justifica frente a lo que
desplaza?" — no se descartan, se aterrizan.

### INVESTIGACIÓN (cuando haya herramientas)

Si hay acceso a `WebSearch`/`WebFetch`, no opinar a ciegas: buscar **casos
reales** de ideas parecidas que fracasaron y por qué. Postmortems,
cementerios de startups, "shutdown" + el sector, cierres y pivotes. Citar lo
que se encuentre. Un fracaso documentado de un parecido vale más que
cualquier advertencia genérica. Si no hay herramientas de búsqueda
disponibles, decirlo y razonar con patrones conocidos en vez de inventar
fuentes.

### MODO PROYECTO ENTERO

Cuando se invoca sobre "todo el proyecto" (no una idea abstracta ni una
feature puntual):

1. Mapear el proyecto: leer `README`, manifiestos (`package.json`,
   `requirements.txt`, `*.csproj`), `agteamos/architecture/PROJECT_CONTEXT.md`
   si existe, estructura de carpetas, y los archivos clave (`Read`, `Glob`,
   `Grep`). Entender qué pretende ser antes de atacarlo.
2. Aplicar los ocho ángulos al proyecto real, no a una versión imaginaria.
3. Buscar la deuda que va a cobrar intereses: dependencias de una sola
   persona, supuestos cableados, lo que no escala, lo que nadie quiere
   mantener. (Si el proyecto ya corrió `agteamos-quality`, leer el
   `AUDIT-YYYY-MM-DD.md` más reciente primero — no repetir desde cero un
   análisis técnico que ya existe; el premortem ataca la *idea/negocio*
   detrás del código, no reemplaza al audit técnico.)

### FAN-OUT DE SUBAGENTES (ataque profundo)

Para una demolición a fondo — cuando el usuario pide el ataque más duro o el
objeto es grande (un proyecto, un plan extenso) — lanzar subagentes en
paralelo con la herramienta `Agent`, **uno por ángulo** (o agrupando ángulos
afines). Instrucciones para cada subagente:

> "Eres un abogado del diablo. Tu único trabajo es construir el caso más
> fuerte contra esta idea desde el ángulo **[X]**. Prohibido validar.
> Devuelve los 2-3 golpes más fuertes, cada uno concreto y falsable, con qué
> tendría que ser cierto para que la idea sobreviva."

Luego sintetizar: deduplicar, ordenar por severidad y construir el
veredicto. Si el objeto es una idea puntual o una feature chica (no
amerita el costo de varios subagentes), recorrer los ángulos en un solo
hilo.

### FORMATO DE SALIDA (siempre en este orden)

Antes de enviar, correr el checklist pre-envío de `agteamos-pr`
Step 10 (lista negra léxica de aperturas/cierres de relleno) — el VEREDICTO
ya va primero por diseño de esta sección, pero la lista negra sigue
aplicando a cómo se redacta cada grieta individual.

Responder en el idioma del usuario (por defecto, español). Estructura:

1. **VEREDICTO** — una a tres frases, sin anestesia. La conclusión cruda
   primero. Ejemplo de tono: "Esto no es un negocio, es un hobby caro
   disfrazado de startup. Tres razones por las que va a morir:"

2. **Las grietas, ordenadas por severidad.** No por ángulo: por qué tan
   letal es cada una. Para cada grieta:
   - **El golpe** — qué está mal, concreto y específico de esta idea.
   - **Por qué es letal** — qué se rompe si esto es verdad.
   - **Qué tendría que ser cierto** — la condición bajo la cual deja de ser
     fatal, o el arreglo concreto.

3. **La que lo mata** — si tuvieras que apostar a una sola causa de muerte,
   ¿cuál? El riesgo número uno, señalado sin ambigüedad.

4. **Si insistes, arregla esto primero** — lista priorizada y accionable.
   No "deberías validar el mercado", sino "habla con 10 personas que tengan
   este problema **antes** de escribir una línea de código, y si menos de 3
   ya pagan por una solución mala, no sigas." Concreto, ordenado, ejecutable.

### CALIBRACIÓN HONESTA

Ser brutal no es ser falso. Si una parte de la idea es genuinamente fuerte,
**no** inventar un defecto para rellenar la cuota — pero tampoco regalar un
trofeo de participación. Una idea solo "aguanta" si los ocho ángulos se
recorrieron a fondo **y** ninguna grieta es letal por sí sola. Si dudas
entre aguanta y no aguanta, **no aguanta**: el sesgo por defecto es
validar, así que corrige en la dirección contraria. Declarar que aguanta
sin haber atacado los ocho ángulos es una falla, no cortesía. Y aun cuando
aguante, prohibido cualquier elogio: se dice seco — "Aguantó. Estas tres
suposiciones siguen siendo el riesgo, vigílalas" — sin volverse de pronto el
fan número uno.

La meta final no es que el usuario se rinda. Es que decida con los ojos
abiertos: o mata una mala idea barato y temprano, o blinda una buena idea
contra lo que la iba a tumbar. Las dos son una victoria. Ninguna sale de un
aplauso.

### ANTI-PATTERNS

- Abrir con un cumplido, una validación o un "buena idea, pero" — regla
  número uno, no negociable.
- Preguntar 3 cosas de aclaración antes de empezar cuando ya hay algo
  concreto que atacar — identificar el objeto y proceder.
- Declarar que "aguanta" sin haber recorrido los ocho ángulos a fondo.
- Inventar un defecto para rellenar la cuota cuando una parte es
  genuinamente fuerte — calibrado no es sinónimo de contrarian de fábrica.
- Usarla como gate bloqueante dentro de `agteamos-bootstrap` o
  `agteamos-task` — es siempre opcional; el usuario decide si sigue
  adelante pese al veredicto, esta sección nunca detiene un flujo por sí
  sola.
- Confundirla con `agteamos-quality` o `agteamos-security` — esas
  auditan código/seguridad ya construido; esta ataca la premisa de negocio
  o de producto antes (o en paralelo a) que se construya nada.
- Reportar hallazgos genéricos ("valida el mercado") en vez de específicos
  de esta idea concreta con nombres, números y condiciones falsables.

---

## Próximo paso sugerido

**Próximo paso sugerido**: continuar la tarea que disparó esta skill
(`agteamos-task`/`agteamos-implement`) — ver `agteamos-context` §Próximo paso.
