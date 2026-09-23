---
name: agteamos-review
description: >
  Code review experto en 8 dimensiones. Analiza seguridad, correctitud,
  performance, mantenibilidad (incluye code-judo, regla de 1k lineas,
  spaghetti y boundaries), tests, deuda tecnica, conformidad con
  agteamos/standards/ y DevEx/feature-gate leaks. Aplica ratchet rule: solo
  bloquea por lo que el cambio introduce o extiende, lo preexistente es
  follow-up. Usa agteamos-pr-standards para el formato de feedback y genera
  reporte con severidades.
used_by:
  - qa-engineer
  - architect
  - security-engineer
---

# SKILL: Review Workflow

## CONTRACT

- **Input**: archivo(s), directorio o PR number
- **Output**: reporte de review con bloqueantes/importantes/sugerencias/positivos + decision APPROVE / REQUEST_CHANGES / COMMENT
- **Who runs this**: @qa-engineer for standard reviews, @architect for architectural decisions, @security-engineer for security-critical changes
- **Tracker commands**: se resuelven vía `agteamos/tracker/<tracker>.md` (generado por `agteamos-setup`) — nunca hardcodear `gh`/`az`.

---

## PROCESS

### Step 1 — Identify the scope and read the code

**If given a PR number**:
```bash
# Read PR metadata and description
[operación: get-pr] (leer metadata y descripción del PR)

# Read the diff
[operación: get-pr] (leer el diff del PR)

# Read full changed files for context (not just the diff)
[operación: get-pr] (listar archivos modificados del PR)
```

> **Nota**: la fila `get-pr` documentada en `agteamos/tracker/<tracker>.md` solo
> define recuperar `state,mergeable,reviews`. Diff y lista de archivos
> modificados no están cubiertos explícitamente — habría que extender esa fila
> o agregar `get-pr-diff` / `get-pr-files` al adapter.

Then read each changed file in full with the Read tool to understand the complete context, not just the changed lines.

**If given a file or directory**:
Use Read, Grep, and Glob to examine the code. Start with the entry point and trace the call graph.

---

### Step 2 — Analyze in 8 dimensions

Work through each dimension systematically. Do not skip any.

**Ratchet rule (aplica a todas las dimensiones)**: un hallazgo es
**Bloqueante** solo si el cambio bajo review lo introduce o lo extiende. Todo
lo preexistente que el diff no toca es **follow-up** — se reporta igual
(nunca se oculta), pero baja a Importante o se marca explícitamente como
"preexistente, no bloqueante", sin importar su severidad intrínseca. Para
determinarlo:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/lib/findings-ledger.js" scope .
# -> {"changedLines": ["path/file.py:42", ...], "base": "main"}
```
Un hallazgo está "introducido en este cambio" si su `file:line` (con margen de
+/-2 líneas) aparece en `changedLines`. Si `base` viene `null`, no se pudo
determinar la base branch — tratar todo como preexistente (ver arriba).

Si no se puede determinar la base branch (repo sin historial, rama huérfana),
tratar todo como preexistente y decirlo en el Resumen — no asumir bloqueante
por defecto. Cada hallazgo en el reporte final indica
`(introducido en este cambio)` o `(preexistente → follow-up)`.

Para PRs o archivos con contexto de módulo (varios archivos relacionados),
considerar invocar `agteamos-domain-review` como sub-paso de la Dimensión 4 —
ver esa nota más abajo.

#### Dimension 1 — Security

**Paso previo (barato, sin gastar el analisis del agente)**: correr el scanner
determinista antes de leer el código a mano:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/security-scanner.mjs" scan --format json <archivo(s)>
```
Detecta SQLi, XSS, secrets hardcodeados, `eval()`, path traversal y command
injection por patrón regex. Sus hallazgos son un piso, no un techo — el
agente sigue revisando manualmente lo que el regex no puede ver (lógica de
autorización, IDOR, timing attacks).

What to look for:
- Inputs accepted from user or external sources without validation
- SQL injection: raw string interpolation in queries (`f"SELECT * FROM users WHERE id = {user_id}"`)
- Secrets or credentials in code or test files
- Missing authorization checks on endpoints (any route without an auth dependency)
- Insecure direct object references (user can access another user's resource by changing an ID)
- XSS: unsanitized user content rendered as HTML
- Mass assignment: accepting all fields from request body without an explicit allowlist
- Timing attacks in auth comparisons (use `hmac.compare_digest`, not `==`)

Flag every finding with file path and line number.

#### Dimension 2 — Correctness

What to look for:
- Logic errors: off-by-one, wrong operator, inverted condition
- Unhandled edge cases: empty list, None/null, zero value, negative number, Unicode input
- Type mismatches: string used where int expected, optional not checked before use
- Race conditions: shared mutable state accessed without locking
- Error handling: errors swallowed silently (`except: pass`, empty catch blocks)
- Off-by-one in pagination, date ranges, or index calculations

#### Dimension 3 — Performance

What to look for:
- N+1 queries: a query inside a loop over a collection
  ```python
  # BAD: N+1
  for invoice in invoices:
      invoice.client = db.query(Client).filter_by(id=invoice.client_id).first()

  # GOOD: eager load
  invoices = db.query(Invoice).options(joinedload(Invoice.client)).all()
  ```
- Missing database indexes on columns used in WHERE, JOIN, or ORDER BY
- Blocking I/O in async code (`time.sleep()`, synchronous DB call in async context)
- Unnecessary recomputation: expensive operation inside a render or loop that could be memoized
- Fetching more data than needed: `SELECT *` when only 2 columns are used
- React: unnecessary re-renders from unstable references (`{}` or `[]` as prop defaults)

#### Dimension 4 — Maintainability

What to look for:
- Functions longer than ~40 lines — likely violates single responsibility
- Magic numbers: `if status == 3` instead of `if status == InvoiceStatus.OVERDUE`
- Confusing names: `data`, `obj`, `temp`, `result` — what does it actually contain?
- Duplicated logic: same calculation or validation appearing in 2+ places
- Deep nesting: more than 3 levels of indentation in a single function
- Comments that explain WHAT (redundant with code) instead of WHY
- Missing type annotations in Python or TypeScript `any` usage

**Regla de 1k líneas**: si este cambio hace que un archivo cruce las 1000
líneas sin justificación estructural clara (ej. un archivo generado, un
enum largo) → Bloqueante presuntivo. Proponer extraer helpers/subcomponentes
antes de aceptar el crecimiento.

**Code-judo**: antes de aceptar el código tal como está, preguntar si existe
una reestructuración que preserva el comportamiento pero colapsa una rama,
condicional o helper entero (la solución que "en retrospectiva es obvia").
Si existe y no se aplicó, es Importante — no Sugerencia — porque el diff
final sería más chico y más simple, no solo "más lindo".

**Spaghetti**: branching ad-hoc insertado en un flujo ya existente, banderas
booleanas o modos "temporales" que probablemente se vuelvan permanentes,
manejo de un caso borde metido en medio de una función ya ocupada. Es un
problema de diseño → Importante, nunca solo Sugerencia. Remediación: mover a
una abstracción, helper o state machine dedicados, no seguir tangleando el
flujo existente.

**Boundaries**: uso de `any`/`unknown`/casts que ocultan un invariante de
datos o seguridad → Bloqueante; wrappers finos sin valor agregado, lógica de
una feature filtrada a un módulo genérico, o un helper bespoke que duplica
uno canónico ya existente en el repo → Importante.

**Nota — domain-review**: si el cambio toca 3+ archivos relacionados del
mismo módulo, considerar invocar `agteamos-domain-review` sobre ese módulo
antes de cerrar esta dimensión — detecta smells de dominio (concepto
disperso, God Module, leaky boundary, ver `skills/domain-review/smells.md`)
que esta dimensión, centrada en un archivo, no alcanza a ver. Sus
Bloqueantes se insertan aquí mismo con el prefijo `[DR-...]`.

#### Dimension 5 — Tests

What to look for:
- New code with no corresponding test
- Tests that always pass regardless of the implementation (vacuous assertions)
- Tests that test implementation details instead of behaviour (brittle, breaks on refactoring)
- Missing edge case tests: what happens when the input is empty, null, or at the boundary?
- Missing error case tests: what happens when the dependency throws?
- Absence of tests for security-critical code paths (auth, payment, data mutation)
- **Tautological tests**: the expected value is computed with the same
  logic as the implementation (`expect(total).toBe(sum(items))` when
  `total` itself is computed as `sum(items)` in production code) — passes
  by construction even if the underlying logic is wrong. A verifiable test
  needs a concrete, independently-known expected value (`expect(total).toBe(45.50)`),
  not a recomputed formula. See `agteamos-sdd-protocol`'s Acceptance
  Criteria rule for the same anti-pattern at the spec level.

#### Dimension 6 — Technical Debt

What to look for:
- `TODO` and `FIXME` comments without a linked ticket number
- Dead code: functions, classes, or imports that are never called
- Deprecated dependency versions with known CVEs
- Anti-patterns that are spreading: if this pattern is copied 3 times already, the 4th instance is tech debt
- Commented-out code blocks (delete them — git history preserves them)
- Hard-coded environment-specific values (URLs, credentials, limits)

#### Dimension 7 — Project Standards Conformance

Check whether `agteamos/standards/index.yml` exists (generated by `agteamos-standards`):

```bash
find . -maxdepth 3 -path "*/agteamos/standards/index.yml"
```

**If it exists**:
1. Read `agteamos/standards/index.yml` (flat `keyword: folder/` map).
2. Resolve the topic(s) relevant to the code under review (e.g. a new endpoint →
   `api`/`security`; a new component → `frontend`; a schema change → `database`).
3. Read the matching `agteamos/standards/<folder>/README.md` for that topic and
   compare the code against its documented rules.
4. Check `agteamos/standards/<folder>/deviations.md` (if present) — any deviation
   from the rule that is NOT already documented there is a finding: report it under
   Importantes (or Bloqueantes if it contradicts a `status: applies` rule), not as a
   Sugerencia. A deviation already logged in `deviations.md` is not a finding.

**If it does not exist**: skip this dimension and state in the report's Resumen that
"no `agteamos/standards/` found — conformance could not be verified", not silently.

#### Dimension 8 — DevEx & Feature Gates

What to look for:
- Cambios en cómo o dónde se leen secrets/env vars (nueva fuente de config,
  librería de secrets distinta a la ya usada en el proyecto)
- Variables de entorno nuevas o renombradas sin actualizar `.env.example` (o
  equivalente) ni la documentación de setup
- Remapeo de puertos o de networking local que rompe el flujo de desarrollo
  existente sin avisar
- Scripts nuevos que un desarrollador tiene que correr manualmente para que
  algo siga funcionando (migración, seed, build step) sin que quede
  documentado en el README o en `agteamos/docs/`
- **Feature-gate leak**: el código nuevo ignora un flag/feature-gate existente
  en algún branch de ejecución, exponiendo la feature antes de tiempo —
  requiere trazar el flag end-to-end, no asumir que "seguro está bien"

Estos hallazgos rara vez son Bloqueantes de seguridad, pero sí rompen el
flujo de trabajo de otros desarrolladores o exponen features a medio
terminar — reportar como Importante como mínimo; Bloqueante si hay leak de
una feature que no debía ser visible aún.

---

### Step 3 — Generate the review report

Follow the `agteamos-pr-standards` skill for the PR feedback conventions (tone, severity labels, structure). Use this exact format:

```markdown
## Code Review: [file/feature/PR name]

**Reviewer**: @qa-engineer
**Date**: YYYY-MM-DD
**Decision**: REQUEST_CHANGES | APPROVE | COMMENT

---

### Bloqueantes (must fix before merge)

**[B1] SQL injection risk** — `src/api/routes/search.py:34`
The search query concatenates user input directly into the SQL string.
```python
# Current (vulnerable)
query = f"SELECT * FROM products WHERE name LIKE '%{search_term}%'"

# Fix
query = select(Product).where(Product.name.ilike(f"%{search_term}%"))
```

**[B2] Missing auth check** — `src/api/routes/invoices.py:89`
The `DELETE /api/v1/invoices/{id}` endpoint does not verify that the
requesting user owns the invoice. Any authenticated user can delete any invoice.

---

### Importantes (should fix in this PR or create a follow-up ticket)

**[I1] N+1 query in invoice listing** — `src/services/invoice_service.py:45`
Each invoice triggers a separate client query. With 100 invoices, that is 101 queries.
Add `joinedload(Invoice.client)` to the initial query.
Impact: ~500ms → ~10ms for a typical list page.

**[I2] Missing error case test** — `tests/test_invoice_service.py`
The test file covers the happy path but not the case where `create_invoice` is
called with an empty `line_items` list. Add: `test_create_invoice_empty_line_items_raises`.

---

### Sugerencias (consider but optional)

**[S1] Extract validation to a named constant** — `src/services/invoice_service.py:22`
`if len(payload.description) > 500` — extract `MAX_DESCRIPTION_LENGTH = 500` to
`src/core/constants.py` for consistency with similar limits elsewhere.

**[S2] Function is 47 lines** — `src/services/invoice_service.py:55-102`
`process_invoice_payment` handles authorization, calculation, persistence, and
notification. Consider splitting into smaller focused functions.

---

### Lo que está bien

- Pydantic models used consistently for all input/output — no raw dict access
- Error messages are specific and actionable — good UX for API consumers
- The `InvoiceRepository` correctly separates all DB access from the service layer
- Tests use `AsyncClient` properly with isolated test DB session

---

### Resumen

2 blockers must be fixed. The SQL injection risk is critical. The N+1 query is
not a blocker for a low-traffic endpoint but should be addressed before launch.
Overall: good architecture, careful layering, solid test setup. The blockers are
isolated fixes.
```

---

### Step 4 — Submit the review decision

**Criteria**:
- `REQUEST_CHANGES`: any Bloqueante marcado `(introducido en este cambio)` está
  presente — do not approve. Un Bloqueante marcado `(preexistente → follow-up)`
  **no** dispara `REQUEST_CHANGES` por sí solo (ratchet rule) — se reporta
  igual, pero no bloquea este PR.
- `APPROVE`: zero blockers *introducidos por este cambio*, Importantes have been
  acknowledged (fix or ticket created)
- `COMMENT`: review of a draft PR or informational only — no approval decision

```bash
# Approve
[operación: comment-pr] (aprobar el PR con el comentario "LGTM. Minor suggestions in comments.")

# Request changes
[operación: comment-pr] (comentar solicitando cambios: detalle de los bloqueantes [B1], [B2], etc.)

# Comment only (draft or informational)
[operación: comment-pr] (dejar feedback temprano sin aprobar ni rechazar)
```

> **Nota**: `comment-pr` solo agrega un comentario. "Approve" y "Request changes"
> cambian el estado formal del review del PR, algo que las 10 operaciones del
> adapter no distinguen hoy — habría que agregar `approve-pr` y
> `request-changes-pr` a `agteamos/tracker/<tracker>.md` si se necesita ese
> estado formal (ej. para que `merge-pr` respete un gate de aprobaciones).

---

## EXAMPLES

**Review triggered by file path**:
```
Input: "review src/services/payment_service.py"
→ Read the full file
→ Grep for callers to understand the call graph
→ Read related test file: tests/test_payment_service.py
→ Analyze 8 dimensions
→ Output report (no GitHub action since no PR number)
```

**Review triggered by PR number**:
```
Input: "review PR #42"
→ [operación: get-pr] (read description and metadata)
→ [operación: get-pr] (read the diff — needs adapter extension, see Step 1 note)
→ Read each changed file in full
→ Analyze 8 dimensions
→ Output report
→ [operación: comment-pr] (request changes — approve/request-changes gap, see Step 4 note)
```

---

## ANTI-PATTERNS

- Reviewing only the diff and not the surrounding context — the most dangerous bugs often span multiple files
- Marking everything as a Sugerencia to avoid conflict — blockers must be called blockers; the reviewer's job is to protect the codebase, not to be pleasant
- Writing vague feedback without file:line references — "this could be cleaner" is not actionable
- Approving a PR with open blockers because the author is senior — seniority does not prevent security vulnerabilities
- Skipping the Security dimension because "this is an internal tool" — internal tools get exposed too
- Reviewing tests in isolation without reading the code under test — you cannot evaluate test quality without knowing what is being tested
- Skipping Dimension 7 silently when `agteamos/standards/index.yml` exists — it must be resolved and checked, not assumed to be satisfied
- Reporting a deviation already logged in `deviations.md` as a new finding — check it first, it is already accepted debt, not a fresh blocker
