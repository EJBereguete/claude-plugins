---
name: agteamos-pr
description: >
  Standards for creating, reviewing, and merging Pull Requests. Ensures every PR
  has proper context, references a ticket, includes tests, and gets reviewed before merge.
used_by:
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - architect
  - product-manager
---

# SKILL: PR Standards

## CONTRACT

- **Input**: Completed implementation on a feature branch
- **Output**: Merged PR with full traceability — ticket reference, passing CI, review approval, test evidence
- **Who runs this**: Any engineer opening or reviewing a PR

---

## PROCESS

### Step 1 — PR Title

Follow the same Conventional Commits format used for commit messages:

```
type(scope): short description
```

Examples:
- `feat(auth): add JWT refresh token rotation`
- `fix(invoices): correct VAT calculation for EU customers`
- `refactor(users): extract email validation to service layer`
- `test(payments): add edge cases for currency conversion`

**Rules**:
- Max 72 characters
- Lowercase after the colon
- No period at the end
- Must accurately describe what changed, not how

---

### Step 2 — PR Size

Prefer **< 400 lines changed** per PR. If the PR is larger, include an explicit justification in the body.

If a feature requires > 400 lines: split into multiple stacked PRs or use a feature flag to merge incrementally.

---

### Step 3 — PR Body

Use this template for every PR:

```markdown
## Summary
- What changed and why (3 bullet points max)

## Type of change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation

## Acceptance Criteria Verified
- [x] AC1: Given..., When..., Then... ✅
- [x] AC2: ... ✅

## Tests
- Unit tests: X added, all passing
- E2E: see agteamos/changes/<id>-<slug>/evidence/

## Screenshots
(if UI change — required, attach inline)

## Notes for reviewer
(anything unusual, shortcuts taken, known limitations, open questions)

Closes #<issue-number>
```

Every PR **must** reference a ticket via `Closes #N` or `Related to #N`.

---

### Step 4 — OpenAPI update (if applicable)

If the PR adds or modifies API endpoints, update `agteamos/api/openapi.yml`.

For FastAPI, export the spec with:

```bash
python -c "
import json
from src.main import app
print(json.dumps(app.openapi(), indent=2))
" > agteamos/api/openapi.yml
```

Commit the updated spec as part of the same PR.

---

### Step 5 — Code Review checklist (for reviewers)

Review every PR across these 6 dimensions before approving:

1. **Correctness** — Does the implementation match what the ticket describes? Are edge cases handled?
2. **Tests** — Are tests present? Do they test behavior, not implementation? Do they cover error and boundary cases?
3. **Security** — Any OWASP Top 10 concerns? (injection, auth bypass, insecure direct object reference, exposed secrets)
4. **Performance** — Any N+1 queries? Synchronous calls in hot paths? Unindexed queries on large tables?
5. **Maintainability** — Is the code readable? Functions < 40 lines? Does it follow project conventions?
6. **Technical Debt** — Is any new debt being introduced? If so, is it tracked in a follow-up ticket?

Leave comments as:
- `nit:` — optional, stylistic
- `suggestion:` — recommended but not blocking
- `must:` — blocking, must be resolved before approval

---

### Step 6 — Review SLA

| PR Type | Response Time |
|---------|---------------|
| Regular feature PR | 24 hours |
| Hotfix / incident fix | 4 hours |

If the reviewer cannot meet the SLA, they must re-assign or notify the author.

---

### Step 7 — Approval requirements

| Change Type | Approvals Required |
|-------------|-------------------|
| Standard feature | 1 approval (any engineer) |
| Auth, payments, or core infrastructure | 2 approvals (including @architect) |
| Database schema change | 1 approval + @devops-engineer sign-off |
| Any PR | QA must confirm E2E green before merge |

**Never merge your own PR**, regardless of approval count.

---

### Step 8 — Merge

- Merge only when CI is green (all checks passing)
- Use **Squash and Merge** for feature PRs to keep history clean
- Use **Merge Commit** only for release PRs (develop → staging, staging → main)
- Delete the feature branch after merge

---

### Step 9 — Disciplina PR/git (inspirado en OpenSpec)

OpenSpec resume su regla de git en una frase: **"OpenSpec never touches git"** — la
herramienta de specs no crea commits, ramas ni PRs por su cuenta; es el flujo
humano/agente el que lo hace, siguiendo una disciplina fija. AgTeamOS adopta el
mismo criterio para cada `agteamos/changes/<id>-<slug>/`:

- **1 change = 1 branch = 1 PR.** No se mezclan dos tareas de `agteamos/changes/`
  en el mismo PR, y no se abre más de un PR para la misma carpeta de cambio.
- **El PR contiene el delta de spec Y el código juntos**, nunca separados. El
  delta (`specs/deltas/<dominio>.md`) viaja en el mismo PR que el diff de
  implementación — un PR de "solo specs" seguido de otro de "solo código" rompe
  la trazabilidad y duplica el trabajo de review.
- **Orden de lectura obligatorio para el reviewer**:
  1. `requirements.md` / `proposal.md` de la tarea (qué se pidió y por qué)
  2. El delta de spec, `specs/deltas/<dominio>.md` (qué cambia en el contrato del dominio)
  3. El diff de código (cómo se implementó lo anterior)

  Revisar el diff de código primero, sin haber leído el delta de spec, es la
  causa más común de reviews superficiales — el reviewer aprueba código
  correcto que no cumple lo que la spec pedía.
- **Archivar DESPUÉS del merge, no antes.** El paso de `agteamos-implement` que
  mueve la carpeta a `agteamos/changes/archive/<fecha>-<id>-<slug>/` solo corre
  una vez confirmado el merge a la rama destino — nunca mientras el PR sigue
  abierto. Archivar antes de merge arriesga archivar una tarea que después no
  pasa review y queda en un estado inconsistente (archivada pero sin mergear).

---

### Step 10 — Disciplina de redacción (aplica a PR body, comentarios de review, y a cualquier reporte que use este skill como referencia de tono — `agteamos-quality`, `agteamos-decisions`)

**Regla 1 — la conclusión primero.** La primera línea de un "Summary", un
comentario de review, o el resumen de un reporte debe ser algo accionable o
la conclusión misma — nunca un anuncio ("voy a explicar...") ni un halago
("buena pregunta"). Si alguien lee solo la primera línea y la última, tiene
que saber (a) qué hacer ahora y (b) qué pasó — si no, reescribir.

**Lista negra literal** (no traducir el concepto, prohibir las frases
exactas en español — un filtro conceptual no detiene "Buena pregunta"
aunque sí detenga "Great question"):

Aperturas prohibidas: "Buena pregunta", "Claro,", "Voy a...", "Déjame...",
repetir la pregunta del usuario antes de responder.
Cierres prohibidos: "Espero que te sirva", "¿Necesitas algo más?", "Por
cierto, también valdría la pena...".

**Checklist pre-envío** (correrlo antes de publicar un PR body, un comentario
de review, o el resumen de cualquier reporte largo):
1. ¿La primera oración anuncia lo que vas a hacer en vez de decirlo? Si sí, borrarla.
2. ¿La última oración resume o pregunta "¿algo más?" sin agregar información nueva? Si sí, borrarla.
3. ¿Hay un "por cierto" con una idea suelta sin acción asociada? Sacarlo o convertirlo en un ítem accionable.
4. ¿Hay una duda vaga sin información concreta? Reemplazarla por la pregunta específica o quitarla.

**Excepciones** (cuando estas reglas ceden): el usuario pidió explícitamente
una explicación completa; la acción es destructiva y necesita contexto antes
de ejecutarse; hay ambigüedad real que se resuelve mejor con 2-4 opciones
con trade-offs en vez de una sola respuesta seca.

---

## EXAMPLE

### Bad PR

```
Title: fix stuff

Body: (empty)

No ticket reference.
No tests mentioned.
CI is failing but "it works on my machine".
```

### Good PR

```
Title: fix(invoices): correct VAT calculation for EU customers

## Summary
- VAT was being applied to non-taxable line items for EU customers
- Added country-code check before applying VAT multiplier
- Fixes regression introduced in #412

## Type of change
- [x] Bug fix

## Acceptance Criteria Verified
- [x] AC1: Given EU customer, When invoice generated, Then VAT applied only to taxable items ✅
- [x] AC2: Given non-EU customer, When invoice generated, Then behavior unchanged ✅

## Tests
- Unit tests: 4 added (happy path, non-EU bypass, zero-tax item, mixed cart)
- E2E: see agteamos/changes/089-invoice-vat-fix/evidence/

## Screenshots
N/A — backend change

## Notes for reviewer
The `is_eu_customer` helper already existed in `src/utils/geo.py`, just wasn't being called in the invoice service. Kept the fix minimal.

Closes #501
```

---

## ANTI-PATTERNS

- Merging your own PR — always required at least one other reviewer
- Merging with red CI — no exceptions, even for "small" fixes
- Giant PRs (> 800 lines) — impossible to review meaningfully, always split
- No ticket reference — every PR must trace back to a user story or bug report
- Approval without reading the code — "LGTM" with no comments on a 500-line PR is not a review
- Fixing review comments but not re-requesting review — always ping the reviewer when ready
- Force-pushing to a PR branch after review has started — use new commits so reviewers can see what changed
- Opening a separate PR just for `specs/deltas/<dominio>.md` — the spec delta and the code it implements belong in the same PR
- Archiving `agteamos/changes/<id>-<slug>/` to `changes/archive/` before the PR is actually merged — archive after merge, never before
- Reviewing the code diff before reading `requirements.md` and the spec delta — leads to approving code that technically works but does not satisfy what was asked

---

## Próximo paso sugerido

**Próximo paso sugerido**: vuelve al Step de cierre de `agteamos-implement`
que invocó esta skill (ver `agteamos-context` §Próximo paso).
