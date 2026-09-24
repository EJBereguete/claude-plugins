---
name: agteamos-quality
description: >
  Calidad de codigo en cuatro modos: review de PR/diff puntual (8 dimensiones),
  domain-review continuo por archivo tocado (10 domain smells con cache),
  static-analysis para CI (linting/typing/security por lenguaje y quality
  gates), y auditoria integral de todo el proyecto (radar de deuda tecnica,
  DORA). Cada modo aplica ratchet rule donde corresponde (bloqueante solo si
  el cambio lo introduce) y usa su propio cache de hallazgos independiente
  via findings-ledger.js.
used_by:
  - qa-engineer
  - architect
  - security-engineer
  - devops-engineer
  - product-manager
---

# SKILL: Quality (agteamos-quality)

## CONTRACT

- **Input**: depende del modo — archivo(s)/directorio/PR number (Modo
  PR-review), archivo(s) o modulo(s) modificado(s) (Modo domain-review
  continuo), repositorio completo o pipeline de CI (Modo static-analysis),
  repositorio del proyecto activo (Modo auditoria integral).
- **Output**: depende del modo — ver el CONTRACT especifico dentro de cada
  seccion mas abajo.
- **Who runs this**: `@qa-engineer` (PR-review estandar), `@architect`
  (domain-review, decisiones arquitectonicas de PR-review, seccion de
  arquitectura de la auditoria), `@security-engineer` (dimension de
  seguridad de PR-review, static-analysis, auditoria), `@devops-engineer`
  (CI gates de static-analysis, seccion DevOps/observabilidad de la
  auditoria), `@product-manager` (priorizacion de negocio en la auditoria).
- **Nota sobre `findings-ledger.js`**: los modos que cachean hallazgos usan
  prefijos y archivos de cache **independientes** — ver la nota al final de
  este archivo, "Prefijos y caches de findings-ledger.js". No se unifican en
  un solo cache: son corridas independientes con historiales independientes.

---

## Diferenciacion de modos — cuando se usa cada uno

No confundir los cuatro modos entre si. Cada uno responde a un disparador y un
alcance distintos:

| Modo | Cuando se usa | Alcance | Es bloqueante de merge |
|------|----------------|---------|--------------------------|
| **PR-review** | A demanda, sobre un PR o diff puntual ya armado | El diff + contexto completo de los archivos tocados | Si (REQUEST_CHANGES si hay bloqueantes introducidos) |
| **domain-review continuo** | Continuo, por archivo/modulo tocado — normalmente como sub-paso de la Dimension 4 de PR-review, o standalone sobre un modulo especifico | El/los modulo(s) modificado(s) + expansion de profundidad 1 (imports/importers), cap ~15 archivos | Si, pero solo lo introducido por el cambio (ratchet) |
| **static-analysis** | Estatico, en cada commit (pre-commit) y en cada PR (CI) | Todo el codigo tocado, via linters/type-checkers/scanners automatizados | Si, via quality gates de CI (no es un agente leyendo codigo) |
| **auditoria integral** | Integral, de todo el proyecto — periodico o a demanda, nunca por PR individual | Arquitectura, seguridad, calidad, deuda tecnica, observabilidad y DORA de todo el repo | No — un audit no bloquea un merge, solo prioriza deuda (P0/P1/P2) |

Regla practica: si hay un PR concreto sobre la mesa, es **PR-review** (que a su
vez puede invocar **domain-review continuo** si toca 3+ archivos relacionados).
Si se esta configurando o corriendo CI, es **static-analysis**. Si se pide "como
esta el proyecto en general" o un chequeo periodico de salud de ingenieria, es
**auditoria integral**.

---

## Modo PR-review

> Contenido completo y preservado de la antigua skill `agteamos-quality`.

### Contrato del modo

- **Input**: archivo(s), directorio o PR number
- **Output**: reporte de review con bloqueantes/importantes/sugerencias/positivos + decision APPROVE / REQUEST_CHANGES / COMMENT
- **Who runs this**: @qa-engineer for standard reviews, @architect for architectural decisions, @security-engineer for security-critical changes
- **Tracker commands**: se resuelven vía `agteamos/tracker/<tracker>.md` (generado por `agteamos-setup`) — nunca hardcodear `gh`/`az`.

### Proceso

#### Paso 1 — Identify the scope and read the code

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

#### Paso 2 — Analyze in 8 dimensions

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
considerar invocar el **Modo domain-review continuo** (mismo archivo, más
abajo) como sub-paso de la Dimensión 4 — ver esa nota más abajo.

**Nota sobre cache**: este modo (PR-review) usa `findings-ledger.js scope`
solo para calcular el ratchet (introducido vs. preexistente) — no mantiene un
cache propio de hallazgos entre corridas (a diferencia de domain-review
continuo y auditoría integral, que sí reconcilian contra un JSON persistente).
Ver la nota final "Prefijos y caches de findings-ledger.js".

##### Dimension 1 — Security

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

##### Dimension 2 — Correctness

What to look for:
- Logic errors: off-by-one, wrong operator, inverted condition
- Unhandled edge cases: empty list, None/null, zero value, negative number, Unicode input
- Type mismatches: string used where int expected, optional not checked before use
- Race conditions: shared mutable state accessed without locking
- Error handling: errors swallowed silently (`except: pass`, empty catch blocks)
- Off-by-one in pagination, date ranges, or index calculations

##### Dimension 3 — Performance

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

##### Dimension 4 — Maintainability

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
mismo módulo, considerar invocar el **Modo domain-review continuo** (más
abajo en este mismo archivo) sobre ese módulo antes de cerrar esta dimensión
— detecta smells de dominio (concepto disperso, God Module, leaky boundary,
ver `skills/quality/smells.md`) que esta dimensión, centrada en un archivo,
no alcanza a ver. Sus Bloqueantes se insertan aquí mismo con el prefijo
`[DR-...]`.

##### Dimension 5 — Tests

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

##### Dimension 6 — Technical Debt

What to look for:
- `TODO` and `FIXME` comments without a linked ticket number
- Dead code: functions, classes, or imports that are never called
- Deprecated dependency versions with known CVEs
- Anti-patterns that are spreading: if this pattern is copied 3 times already, the 4th instance is tech debt
- Commented-out code blocks (delete them — git history preserves them)
- Hard-coded environment-specific values (URLs, credentials, limits)

##### Dimension 7 — Project Standards Conformance

Check whether `agteamos/standards/index.yml` exists (generated by `agteamos-project-docs`):

```bash
find . -maxdepth 3 -path "*/agteamos/standards/index.yml"
```

**If it exists**:
1. Read `agteamos/standards/index.yml` (flat `keyword: folder/` map) and
   `index.meta.yml` if present.
2. Resolve the topic(s) relevant to the code under review (e.g. a new endpoint →
   `api`/`security`; a new component → `frontend`; a schema change → `database`).
3. For a topic `status: done`, read the matching
   `agteamos/standards/<folder>/README.md` and compare the code against its
   documented rules. For a topic `pending`, invoke
   `ensure-artifact(standards.<tema>)` (see `agteamos-context-engineering`
   §Lazy Artifacts) before comparing — this is exactly the kind of real,
   concrete trigger that justifies generating the topic now.
4. Check `agteamos/standards/<folder>/deviations.md` (if present) — any deviation
   from the rule that is NOT already documented there is a finding: report it under
   Importantes (or Bloqueantes if it contradicts a `status: applies` rule), not as a
   Sugerencia. A deviation already logged in `deviations.md` is not a finding.

**If `agteamos/standards/index.yml` does not exist at all**: skip this
dimension and state in the report's Resumen that "no `agteamos/standards/`
found — conformance could not be verified", not silently.

##### Dimension 8 — DevEx & Feature Gates

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

**Flags/config obsoletos (distinto del feature-gate leak de arriba)** —
patrón tomado de la skill "Identify Tech Debt": el feature-gate leak de
arriba es sobre código *nuevo* que ignora un flag ya existente; esto es
sobre flags *viejos* que nadie limpió después de que la decisión ya se
tomó. Solo aplica en `--mode auditoria-integral` (requiere ver el histórico
de git, no tiene sentido en el scope acotado de un PR-review puntual):

1. `grep` de patrones comunes de flag en el código (`feature_flag`,
   `FEATURE_`, `is_enabled(`, `flag_enabled`, `LaunchDarkly`/`launchdarkly`,
   `.flags.`, `feature.is_active`) — ajustar el patrón al que realmente use
   el proyecto (ver `agteamos/architecture/PROJECT_CONTEXT.md`).
2. Para cada flag encontrado, `git log -p --follow -- <archivo>` sobre la
   línea que lo define/lee, para ver desde cuándo tiene su valor actual
   (100% on o 100% off, o el valor por default sin ninguna rama que lo
   contradiga).
3. Si el flag lleva **3+ meses** en el mismo estado sin ninguna rama de
   código que lea el valor contrario (es decir, ya no hay ningún camino de
   ejecución real detrás del flag), reportarlo como Sugerencia (o
   Importante si el código muerto detrás del flag supera ~50 líneas):
   *"Flag `<nombre>` fijo en `<valor>` desde `<fecha>` (`<N>` meses) — el
   branch `<contrario>` parece código muerto, candidato a limpieza."*
4. No lo reportes si no se pudo determinar la fecha con confianza (repo
   sin historial suficiente, flag definido fuera del repo como en un
   servicio externo tipo LaunchDarkly) — decirlo explícito en vez de
   adivinar una fecha.

#### Paso 3 — Generate the review report

Follow the `agteamos-pr-standards` skill for the PR feedback conventions (tone, severity labels, structure). Use this exact format:

**Regla — contraargumento obligatorio antes de reportar** (patrón tomado de
`mlevison/refactoring-skills`): antes de escribir cualquier `Bloqueante` o
`Importante`, considerar explícitamente por qué el código podría estar bien
tal cual está (¿hay sanitización upstream? ¿es un endpoint interno detrás de
otro gate? ¿el "smell" es intencional y está documentado?) y dejar una línea
*Contraargumento considerado* debajo del hallazgo — aunque sea para decir
"ninguno encontrado, esto se sostiene". Esto no aplica a `Sugerencias` (ahí
el costo de un falso positivo es bajo). Reduce falsos positivos sin agregar
un paso nuevo al flujo — es una disciplina dentro del mismo hallazgo.

```markdown
## Code Review: [file/feature/PR name]

**Reviewer**: @qa-engineer
**Date**: YYYY-MM-DD
**Decision**: REQUEST_CHANGES | APPROVE | COMMENT

---

### Bloqueantes (must fix before merge)

**[B1] SQL injection risk** — `src/api/routes/search.py:34`
The search query concatenates user input directly into the SQL string.
*Contraargumento considerado*: `search_term` could be sanitized upstream by
a shared middleware — checked `src/api/middleware/`, no such sanitization
exists, so this stands.
```python
# Current (vulnerable)
query = f"SELECT * FROM products WHERE name LIKE '%{search_term}%'"

# Fix
query = select(Product).where(Product.name.ilike(f"%{search_term}%"))
```

**[B2] Missing auth check** — `src/api/routes/invoices.py:89`
The `DELETE /api/v1/invoices/{id}` endpoint does not verify that the
requesting user owns the invoice. Any authenticated user can delete any invoice.
*Contraargumento considerado*: none found — this is a real gap, not a
false positive.

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

#### Paso 4 — Submit the review decision

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

### Ejemplos (PR-review)

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

### Anti-patterns (PR-review)

- Reviewing only the diff and not the surrounding context — the most dangerous bugs often span multiple files
- Marking everything as a Sugerencia to avoid conflict — blockers must be called blockers; the reviewer's job is to protect the codebase, not to be pleasant
- Writing vague feedback without file:line references — "this could be cleaner" is not actionable
- Approving a PR with open blockers because the author is senior — seniority does not prevent security vulnerabilities
- Skipping the Security dimension because "this is an internal tool" — internal tools get exposed too
- Reviewing tests in isolation without reading the code under test — you cannot evaluate test quality without knowing what is being tested
- Skipping Dimension 7 silently when `agteamos/standards/index.yml` exists — it must be resolved and checked, not assumed to be satisfied
- Reporting a deviation already logged in `deviations.md` as a new finding — check it first, it is already accepted debt, not a fresh blocker

### Sub-modo `--parallel` (opcional, patrón thermos-claude)

Para diffs grandes (ver umbral abajo), el Paso 2 (8 dimensiones) se puede
correr como **2 subagentes read-only en paralelo** en vez de un solo agente
secuencial, reduciendo el tiempo de wall-clock — mismo patrón que
[`thermos-claude`](https://github.com/theocarranza/thermos-claude): dos
tracks especializados + síntesis, en vez de un revisor generalista que hace
las 8 dimensiones una por una.

**Cuándo usarlo**: por default en diffs de más de ~400 líneas cambiadas o
más de 8 archivos tocados (ajustable — si el usuario pide explícitamente
`--parallel`/`--no-parallel`, eso manda). En diffs chicos, el overhead de
lanzar y sincronizar 2 subagentes no vale la pena — seguir secuencial.

**Los 2 tracks** (mismo split que thermos-claude: correctness/security vs
code-quality):

```
Track A — Correctness & Security
  Dimensión 1 (Security) + Dimensión 2 (Correctness) + Dimensión 5 (Tests,
  solo la parte de "falta cubrir un caso de error crítico")

Track B — Maintainability & Debt
  Dimensión 3 (Performance) + Dimensión 4 (Maintainability) +
  Dimensión 6 (Technical Debt) + Dimensión 7 (Standards) +
  Dimensión 8 (DevEx & Feature Gates)
```

**Contrato de solo-lectura (obligatorio para ambos subagentes)**: ninguno de
los 2 tracks escribe código, corre `git commit`, ni invoca operaciones de
tracker (`create-pr`, `comment-pr`, etc.) — solo leen el diff/archivos y
devuelven sus hallazgos de dimensión en el mismo formato del Paso 3 (con
`Contraargumento considerado` incluido). El agente que orquesta es quien,
al recibir los 2 resultados, hace la síntesis y ejecuta el Paso 4
(decisión + `comment-pr`) — nunca los subagentes por su cuenta.

**Paso de síntesis** (después de que ambos tracks terminan):
1. Concatenar los `Bloqueantes`/`Importantes`/`Sugerencias` de ambos tracks
   en un solo reporte, en el formato del Paso 3 — sin reordenar por track,
   ordenar por severidad como siempre.
2. Si ambos tracks señalan el mismo archivo/línea con conclusiones
   contradictorias (raro, pero posible — ej. Track A dice "esto es seguro
   como está" contra un hallazgo de Track B), no descartar ninguno de los
   dos automáticamente: mostrar ambas lecturas y marcar la línea para
   revisión manual antes de decidir.
3. El resto del Paso 3 (Lo que está bien, Resumen) lo escribe el agente
   orquestador leyendo ambos resultados, no un tercer subagente.

Esto no cambia la rúbrica ni el formato del reporte — solo cómo se computa.

---

## Modo domain-review continuo

> Contenido completo y preservado de la antigua skill `agteamos-quality`.

### Contrato del modo

- **Input**: archivo(s) o módulo(s) modificado(s) — normalmente invocada como
  sub-paso de la Dimensión 4 (Maintainability) del **Modo PR-review** cuando el
  cambio toca más de un archivo relacionado, o standalone sobre un módulo
  específico.
- **Output**: reporte con el mismo formato de severidad que el Modo PR-review
  (Bloqueante/Importante/Sugerencia), cada hallazgo con su smell (`D1`–`D10`),
  estado de ratchet (`introducido en este cambio` / `preexistente → follow-up`)
  y estado de ledger (`NEW`/`SEEN xN`/`RESOLVED`).
- **Quién ejecuta**: `@architect` (dueño conceptual, igual que `standards` y
  `self-audit`); invocable también por `@qa-engineer` durante un review.
- **Read-only**: nunca modifica código ni abre PRs — solo reporta.

### Por qué existe este modo

`agteamos-project-docs` compara el proyecto contra 7 estándares base, pero es una
foto puntual: se corre en onboarding o a demanda, y describe *convenciones*
(naming, capas, branch strategy). No mira si un cambio concreto está
introduciendo deuda de dominio nueva — duplicar un predicado en un tercer
archivo, o hacer crecer un God Module 50 líneas más, no rompe ninguna
convención "aplicable/adaptada/desviada" de `standards/`, pero sí degrada el
dominio con cada PR. Este modo llena ese hueco: revisión continua, acotada al
cambio, con memoria entre corridas.

### Proceso

#### Paso 0 — Asegurar el estándar de DDD del proyecto

Si es la primera vez que corre este modo en este proyecto (no hay
`agteamos/standards/domain-driven-design/` todavía), invocar
`ensure-artifact(standards.domain-driven-design)` (ver
`agteamos-context-engineering` §Lazy Artifacts) antes de evaluar los smells —
así el resto de las corridas ya tienen el estándar del proyecto como
contexto, no solo `smells.md` genérico del plugin.

#### Paso 1 — Calcular el scope

1. Identificar el/los archivo(s) modificado(s) (mismo input que recibe el
   Modo PR-review: archivo, directorio o PR).
2. Con Grep, expandir una capa: qué importa cada archivo modificado
   (`import`/`from`/`using`) y quién los importa a ellos (buscar el nombre del
   módulo/clase en el resto del repo). Capar la expansión a ~15 archivos —
   si se supera, priorizar los imports directos sobre los importers.
3. Archivos fuera de este scope se listan como "contexto excluido" en el
   reporte — no se leen en profundidad, evita el mismo problema que el Modo
   PR-review ya documenta (Paso 1) de leer todo el repo por cada review.

#### Paso 2 — Aplicar los 10 domain smells

Leer `smells.md` (mismo directorio, `skills/quality/smells.md`) y evaluar cada
smell contra el scope calculado en Paso 1. No aplicar los 10 mecánicamente
sobre cada línea — un domain smell requiere ver el patrón repetido o la
responsabilidad mezclada, no una sola ocurrencia aislada (excepto D6 God
Module y D9 Dead Layer, que sí pueden detectarse en un solo archivo).

#### Paso 3 — Ratchet rule

Para cada smell encontrado:

1. Correr:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/lib/findings-ledger.js" scope .
   # -> {"changedLines": ["path/file.py:42", ...], "base": "main"}
   ```
   para obtener el set de líneas introducidas/modificadas por este cambio
   (diff contra la base branch detectada).
2. Si el archivo/línea del smell cae dentro de ese set → **Bloqueante o
   Importante** según severidad normal.
3. Si el smell ya existía antes de este cambio (no está en el set de líneas
   cambiadas) → **Follow-up**, nunca bloqueante, sin importar qué tan grave
   sea. Se reporta igual, bajo su propia sección "Follow-ups (preexistente)",
   para que quede trazado sin bloquear el merge.
4. Si un mismo smell tiene varias copias (ej. D1/D10) y el cambio solo tocó
   una, el bloqueante se acota a esa copia; las demás se consolidan en un
   único follow-up con la misma guía de unificación.
5. Si `scopeFromGit` no puede determinar una base branch (repo sin historial,
   o rama huérfana) → tratar **todo** como preexistente/follow-up y decirlo
   explícitamente en el reporte ("no se pudo determinar el diff base — ningún
   hallazgo se marca bloqueante por ratchet, revisar manualmente").

#### Paso 4 — Cache de hallazgos (ledger, prefijo `DR`)

Volcar los hallazgos del Paso 2/3 a un JSON temporal y correr:
```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/lib/findings-ledger.js" \
  reconcile DR findings.json agteamos/.cache/findings/domain-review.json
```
Cada hallazgo recibe:
- `NEW` — primera vez que se ve este ID (`DR-<hash>`)
- `SEEN xN` — visto en corridas anteriores, sigue presente
- (los resueltos desde la corrida anterior se listan aparte como
  "Resueltos desde el último domain-review")

No usar el ledger como fuente de verdad para bloquear/no bloquear — eso lo
decide únicamente el Paso 3 (ratchet). El ledger es solo para no repetir el
mismo análisis completo en cada corrida y mostrar progreso. Este cache
(`agteamos/.cache/findings/domain-review.json`, prefijo `DR`) es propio de
este modo — no se comparte con el cache de auditoría integral (`AU`, ver
nota final).

**`SEEN x3` o más sobre la misma regla, en tareas/PRs distintos** → ofrecer
`agteamos-project-docs` (Disparador 2): *"El hallazgo '<regla>' ya apareció 3 veces.
¿Lo promuevo a estándar del proyecto?"* — una sola vez por hallazgo (no
repetir la oferta en cada corrida si el usuario ya dijo que no).

#### Paso 5 — Generar el reporte

Mismo formato que el Modo PR-review (ver más arriba, "Paso 3 — Generate the
review report"), reemplazando el encabezado por `## Domain Review:
[módulo/PR]` y agregando el smell (`D1`–`D10`) entre corchetes junto al ID:

```markdown
## Domain Review: src/billing/

**Reviewer**: @architect
**Scope**: src/billing/invoice_service.py + 3 imports + 2 importers (5 excluidos por cap)

### Bloqueantes (introducidos por este cambio)

**[DR-4a1f2c9d / D6] God Module creciendo** — `src/billing/invoice_service.py`
Este cambio agrega 80 líneas más a un archivo que ya tenía 410. Responsabilidades
mezcladas: cálculo de impuestos, persistencia y envío de notificación en la
misma clase. Extraer `TaxCalculator` y `InvoiceNotifier` antes de seguir
agregando aquí.

### Follow-ups (preexistente, no bloqueante)

**[DR-9b3e01aa / D1] Concepto disperso: "is_overdue"** — reimplementado en
`invoice_service.py:34`, `report_service.py:12` y `dashboard_service.py:88`.
Preexistente, no lo introdujo este cambio — no bloquea, pero considerar
centralizar en `Invoice.is_overdue` en un PR dedicado.

### Resueltos desde el último domain-review

- `DR-2f88ab01 / D9` (Dead Layer en `InvoiceFacade`) — ya no aparece, se
  eliminó en un commit anterior.
```

### Ejemplos (domain-review continuo)

**Invocación standalone**:
```
Input: "domain-review src/billing/"
→ Paso 1: scope = invoice_service.py + imports/importers (cap 15)
→ Paso 2: evaluar D1-D10 contra el scope
→ Paso 3: scopeFromGit() para separar introducido/preexistente
→ Paso 4: reconcile() contra el cache de domain-review (DR)
→ Output: reporte con Bloqueantes / Follow-ups / Resueltos
```

**Invocación como sub-paso del Modo PR-review**:
```
PR-review Dimensión 4 detecta que el cambio toca 3+ archivos
relacionados en el mismo módulo → invoca el Modo domain-review continuo sobre
ese módulo → sus hallazgos Bloqueantes se insertan en el reporte de review
bajo la Dimensión 4, con el mismo formato [B1], [B2]...
```

### Anti-patterns (domain-review continuo)

- Marcar un smell preexistente como bloqueante porque es grave — la severidad
  no anula la ratchet rule; grave + preexistente = follow-up, no bloqueante.
- Expandir el scope sin cap "para estar seguro" — el objetivo es contexto de
  dominio acotado, no un audit de todo el repo (para eso está el Modo
  auditoría integral).
- Usar el ledger para decidir bloqueante/no bloqueante — el ledger es memoria
  de hallazgos, no reemplaza el cálculo de ratchet contra el diff real.
- Aplicar D2 (Missing System Metaphor) a la primera repetición de una firma —
  esperar a la 2da/3ra ocurrencia real, introducir el tipo antes es
  sobre-diseño (`YAGNI`, ver `standards/dry-kiss-yagni/`).
- Reportar un smell sin decir en qué scope se buscó — el reporte siempre
  declara qué archivos entraron y cuáles quedaron excluidos por el cap.

---

## Modo static-analysis

> Contenido completo y preservado de la antigua skill `agteamos-quality`.
> Es el modo más largo (referencia de herramientas por lenguaje) — la tabla
> completa se preserva tal cual, sin resumir.

Static code analysis is the process of examining source code without executing it, to detect bugs, vulnerabilities, code smells, and style violations. When integrated into CI pipelines with enforced quality gates, it becomes a continuous mechanism that keeps technical debt from accumulating silently.

**Why it matters:**
- Bugs caught at analysis time cost ~10x less than bugs caught in production
- Type errors, security issues, and dead code are found before any reviewer has to comment
- Consistent quality gates prevent gradual degradation of a codebase across a team

### 1. Static Analysis per Language

#### Python

Use a layered approach: fast linting on pre-commit, deeper analysis in CI.

| Tool | Role | Speed |
|------|------|-------|
| `ruff` | Linting + formatting (replaces flake8, isort, black) | Very fast (Rust) |
| `mypy` | Type checking | Medium |
| `bandit` | Security scanning (hardcoded secrets, injection risks) | Medium |
| `pylint` | Deep code smell detection | Slow |

**ruff configuration (`pyproject.toml`):**
```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes (undefined names, unused imports)
    "I",   # isort
    "B",   # flake8-bugbear (likely bugs and design problems)
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade (modern Python syntax)
    "S",   # bandit-equivalent security rules
    "N",   # pep8-naming
]
ignore = ["E501"]  # line length handled separately

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101"]  # allow assert in tests

[tool.mypy]
python_version = "3.12"
strict = true
ignore_missing_imports = true
disallow_untyped_defs = true
disallow_any_generics = true
warn_unused_ignores = true
```

**bandit configuration (`pyproject.toml`):**
```toml
[tool.bandit]
skips = ["B101"]  # skip assert warnings in test files
exclude_dirs = ["tests", ".venv"]
```

**Run commands:**
```bash
ruff check .            # lint
ruff format --check .   # format check (no auto-fix in CI)
mypy src/               # type check
bandit -r src/ -ll      # security scan, low severity and above
pylint src/ --fail-under=8.0
```

#### TypeScript / JavaScript

| Tool | Role |
|------|------|
| `tsc --noEmit` | Type checking without emitting files |
| `eslint` with `typescript-eslint` | Linting with type-aware rules |
| `prettier` | Formatting (separate from linting) |

**`tsconfig.json` strict settings:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**`eslint.config.mjs` (flat config, ESLint v9+):**
```js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  }
);
```

**Run commands:**
```bash
tsc --noEmit                   # type check
eslint . --max-warnings 0      # lint, fail on any warning
prettier --check "src/**/*.ts" # format check
```

#### C# / .NET

| Tool | Role |
|------|------|
| Roslyn Analyzers | Built-in compiler warnings/errors (CA/IDE rules) |
| `dotnet format` | Formatting and analyzer fixes |
| Security Code Scan | Security-focused NuGet analyzer |
| SonarAnalyzer.CSharp | SonarQube rules as a local NuGet package |

**Enable analyzers in `.csproj`:**
```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
  <ImplicitUsings>enable</ImplicitUsings>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  <WarningsAsErrors />
  <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
  <EnableNETAnalyzers>true</EnableNETAnalyzers>
  <AnalysisMode>All</AnalysisMode>
</PropertyGroup>

<ItemGroup>
  <PackageReference Include="SonarAnalyzer.CSharp" Version="*" PrivateAssets="all" />
  <PackageReference Include="SecurityCodeScan.VS2019" Version="*" PrivateAssets="all" />
</ItemGroup>
```

**`.editorconfig` for rule severity:**
```ini
[*.cs]
dotnet_diagnostic.CA1062.severity = error    # validate public API arguments
dotnet_diagnostic.CA2007.severity = warning  # ConfigureAwait
dotnet_diagnostic.CA1031.severity = warning  # don't catch general exceptions
dotnet_diagnostic.S1135.severity = warning   # TODO comments as warnings
```

**Run commands:**
```bash
dotnet build /p:TreatWarningsAsErrors=true
dotnet format --verify-no-changes
```

### 2. Code Metrics to Track

#### Cyclomatic Complexity

Counts the number of linearly independent paths through code. Based on number of branches (`if`, `for`, `while`, `case`, `&&`, `||`).

| Score | Assessment |
|-------|------------|
| 1–5 | Simple, easy to test |
| 6–10 | Moderate, acceptable |
| 11–20 | Complex, refactor when touched |
| 21+ | Untestable, must refactor |

**Threshold to enforce:** fail CI if any single function exceeds **15**.

#### Cognitive Complexity

Penalizes nested structures more heavily than sequential ones. Better reflects how hard code is to read mentally. Preferred over cyclomatic for modern code review.

**Threshold to enforce:** fail CI if any single function exceeds **10** (SonarQube default).

#### Code Coverage

| Level | Assessment |
|-------|------------|
| < 50% | Insufficient, risky changes |
| 50–70% | Minimum acceptable for legacy |
| 70–80% | Acceptable for maintained code |
| 80%+ | Target for new code (set as gate) |
| 100% | Usually over-engineered, not worth it |

**Quality gate rule:** New code introduced in a PR must have ≥ 80% coverage.

#### Duplication

Duplicate code blocks are technical debt that will diverge when one copy is updated.

**Threshold:** Fail if duplication exceeds **3%** of total lines (SonarQube default: 3%).

#### Maintainability Index (MI)

Composite metric combining cyclomatic complexity, Halstead volume, and lines of code. Used mainly by Visual Studio / .NET tooling.

| Score | Assessment |
|-------|------------|
| 0–9 | Low (unmaintainable) |
| 10–19 | Moderate |
| 20–100 | High (maintainable) |

### 2.5. Scanner determinista de patrones de seguridad (`security-scanner.mjs`)

Complementa a `bandit`/`eslint-plugin-security`/Roslyn analyzers: es un script
Node zero-dependency empaquetado en el plugin
(`agteamos/scripts/security-scanner.mjs`) que corre regex contra SQLi, XSS,
secrets hardcodeados, `eval()`, path traversal y command injection. No
reemplaza el linter de cada lenguaje — corre antes, gratis (sin gastar tokens
de LLM ni depender de que el analyzer del lenguaje esté instalado), como
primer gate barato tanto en el Modo PR-review (Dimensión 1) como en CI.

```bash
node agteamos/scripts/security-scanner.mjs scan --format json --fail-on high <archivo(s)>
```

Exit codes: `0` limpio o debajo del umbral, `1` hallazgos al umbral o por
encima, `2` error de uso. Líneas marcadas con `// agteamos-scanner-allow:
<razón>` se excluyen (falso positivo conocido, documentado inline).

**CI integration:**
```yaml
- name: Security scanner (deterministic)
  run: |
    git diff --name-only --diff-filter=d origin/main... | \
      xargs -r node agteamos/scripts/security-scanner.mjs scan --fail-on high
```

### 3. Dependency Vulnerability Scanning

#### Python — pip-audit

```bash
pip install pip-audit

# Scan against PyPI Advisory Database
pip-audit

# Scan a requirements file
pip-audit -r requirements.txt

# Output as JSON for CI parsing
pip-audit --format=json -o audit-report.json

# Fail only on high/critical (exit code 1 = vulnerabilities found)
pip-audit --fail-on-cvss 7.0
```

**CI integration:**
```yaml
- name: Security audit (pip-audit)
  run: |
    pip install pip-audit
    pip-audit -r requirements.txt --fail-on-cvss 7.0
```

#### Node.js — npm audit

```bash
# Fail if any high or critical vulnerability is found
npm audit --audit-level=high

# Output JSON
npm audit --json > audit-report.json

# Use audit-ci for more control
npx audit-ci --high
```

**`audit-ci` config (`audit-ci.json`):**
```json
{
  "high": true,
  "critical": true,
  "allowlist": [
    "GHSA-xxxx-xxxx-xxxx"
  ]
}
```

#### .NET — dotnet list package

```bash
# List vulnerable packages (requires NuGet.org as source)
dotnet list package --vulnerable

# Include transitive dependencies
dotnet list package --vulnerable --include-transitive

# Fail the build if vulnerabilities found (exit code 1)
dotnet list package --vulnerable --include-transitive 2>&1 | \
  grep -q "has the following vulnerable packages" && exit 1 || exit 0
```

**MSBuild approach (`.csproj`):**
```xml
<PropertyGroup>
  <!-- Treat NuGet audit warnings as errors in CI -->
  <NuGetAuditMode>all</NuGetAuditMode>
  <NuGetAuditLevel>high</NuGetAuditLevel>
  <WarningsAsErrors>NU1901;NU1902;NU1903;NU1904</WarningsAsErrors>
</PropertyGroup>
```

### 4. Interpreting Results and Prioritizing Fixes

#### Severity Classification

| Severity | Action |
|----------|--------|
| Critical / Blocker | Fix before merge. No exceptions. |
| High / Major | Fix in same sprint or open tracked issue |
| Medium / Minor | Fix when touching the file |
| Low / Info | Fix in dedicated tech debt sprint |

#### What to Fix First

1. **Security vulnerabilities** — any severity in auth, input handling, crypto, secrets
2. **Null reference / type errors** — these are runtime crashes waiting to happen
3. **Complexity > 20** — impossible to test correctly, source of hidden bugs
4. **Unused code** — dead code misleads future developers
5. **Duplication** — fix when you need to change one of the copies anyway

#### What to Ignore (Pragmatically)

- Style warnings in generated code (add to ignore list or suppress at top of file)
- False positives in well-tested utility functions (use inline suppression with a comment)
- Coverage gaps in trivial boilerplate (DTOs, migrations)

**Suppression patterns:**

```python
# Python — inline suppression with reason required
result = eval(user_input)  # noqa: S307 -- safe: input is validated against allowlist

# Bandit
result = subprocess.run(cmd, shell=False)  # nosec B603
```

```typescript
// TypeScript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy API response shape
const data: any = legacyApiCall();
```

```csharp
// C#
#pragma warning disable CA1031 // reason: top-level catch-all for unhandled exception logging
catch (Exception ex) { logger.LogCritical(ex, "Unhandled exception"); }
#pragma warning restore CA1031
```

### 5. CI Integration — GitHub Actions

#### Python Quality Pipeline

```yaml
# .github/workflows/quality-python.yml
name: Python Code Quality

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: pip install -r requirements-dev.txt

      - name: Lint (ruff)
        run: ruff check . --output-format=github

      - name: Format check (ruff)
        run: ruff format --check .

      - name: Type check (mypy)
        run: mypy src/ --junit-xml=mypy-report.xml

      - name: Security scan (bandit)
        run: bandit -r src/ -ll -f json -o bandit-report.json

      - name: Dependency audit (pip-audit)
        run: pip-audit -r requirements.txt --fail-on-cvss 7.0

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
      - run: pip install -r requirements-dev.txt
      - name: Run tests with coverage
        run: pytest --cov=src --cov-report=xml --cov-fail-under=80
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml
```

#### TypeScript Quality Pipeline

```yaml
# .github/workflows/quality-typescript.yml
name: TypeScript Code Quality

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npx eslint . --max-warnings 0 --format=@microsoft/eslint-formatter-sarif --output-file=eslint-results.sarif
        continue-on-error: true

      - name: Upload ESLint results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: eslint-results.sarif

      - name: Dependency audit
        run: npm audit --audit-level=high

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - name: Run tests with coverage
        run: npx vitest run --coverage --coverage.thresholds.lines=80
```

#### C# Quality Pipeline

```yaml
# .github/workflows/quality-dotnet.yml
name: .NET Code Quality

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  build-and-analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # required for SonarQube blame analysis

      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "9.x"

      - name: Build (treat warnings as errors)
        run: dotnet build /p:TreatWarningsAsErrors=true

      - name: Format check
        run: dotnet format --verify-no-changes

      - name: Run tests with coverage
        run: dotnet test --collect:"XPlat Code Coverage" --results-directory coverage/

      - name: Dependency vulnerability scan
        run: |
          dotnet list package --vulnerable --include-transitive 2>&1 | tee vuln-report.txt
          grep -q "has the following vulnerable packages" vuln-report.txt && exit 1 || echo "No vulnerabilities found"

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          directory: coverage/
```

#### SonarQube Quality Gate (any language)

```yaml
  sonarqube:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: SonarQube Scan
        uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

      - name: SonarQube Quality Gate check
        uses: SonarSource/sonarqube-quality-gate-action@master
        timeout-minutes: 5
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### 6. Quality Gate Configuration

#### SonarQube Quality Gate (recommended defaults)

Configure under **Administration > Quality Gates** in the SonarQube UI or via API:

```
New Code conditions (what is introduced in this PR):
  - Coverage on new code         >= 80%
  - Duplicated lines on new code <= 3%
  - Maintainability rating       = A
  - Reliability rating           = A
  - Security rating              = A
  - Security hotspots reviewed   = 100%

Overall Code conditions:
  - Blocker issues               = 0
  - Critical issues              = 0
```

#### `sonar-project.properties`

```properties
sonar.projectKey=my-project
sonar.sources=src
sonar.tests=tests
sonar.python.coverage.reportPaths=coverage.xml
sonar.python.version=3.12

# Exclusions
sonar.exclusions=**/migrations/**,**/__pycache__/**,**/node_modules/**
sonar.coverage.exclusions=tests/**,**/conftest.py,**/migrations/**
```

#### Pre-commit hooks (fast gates, local)

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.9.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.14.0
    hooks:
      - id: mypy
        additional_dependencies: [types-requests]

  - repo: local
    hooks:
      - id: eslint
        name: ESLint
        language: node
        entry: npx eslint --fix
        types: [ts, tsx]
        pass_filenames: true
```

### 7. Anti-Patterns and Common Issues

#### Anti-patterns to detect and reject

**God function / God class** — one function doing 5+ distinct things. Detected by: cyclomatic complexity > 15, function length > 50 lines.

**Magic numbers** — numeric literals without named constants. Pylint `W0108`, ESLint `no-magic-numbers`.

**Mutable default arguments (Python)**
```python
# Wrong — default list is shared across all calls
def add_item(item, items=[]):
    items.append(item)
    return items

# Correct
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```
Detected by: ruff rule `B006`.

**Floating promises (TypeScript)** — async calls not awaited, errors silently dropped.
```typescript
// Wrong
saveUser(data);  // fire and forget without intent

// Correct
await saveUser(data);
// or explicit: void saveUser(data);  // intentional fire-and-forget
```
Detected by: `@typescript-eslint/no-floating-promises`.

**Catching and swallowing exceptions**
```python
# Wrong — hides real errors
try:
    process()
except Exception:
    pass

# Correct — log at minimum, re-raise if unrecoverable
try:
    process()
except ValueError as e:
    logger.warning("Invalid input: %s", e)
    raise
```
Detected by: pylint `W0703`, ruff `BLE001`.

**Hardcoded credentials** — any string literal matching patterns like `password=`, `api_key=`, `token=`.
Detected by: bandit `B106`, `B107`; gitleaks in CI; trufflehog as pre-commit.

**Deeply nested conditionals** — cognitive complexity spike, symptom of missing early returns or extracted functions.
```python
# Wrong — 4 levels of nesting
def process(data):
    if data:
        if data.is_valid():
            if data.type == "A":
                if not data.is_expired():
                    return data.value

# Correct — guard clauses
def process(data):
    if not data:
        return None
    if not data.is_valid():
        return None
    if data.type != "A":
        return None
    if data.is_expired():
        return None
    return data.value
```

**Unused imports and dead code** — increases cognitive load and slows down linters. Detected by: ruff `F401`, `F841`; TypeScript `noUnusedLocals`, `noUnusedParameters`.

### 8. Recommended Toolchain Summary

| Stack | Linter | Type checker | Security | Dependency audit | Coverage |
|-------|--------|-------------|---------|-----------------|----------|
| Python | ruff + pylint | mypy | bandit | pip-audit | pytest-cov |
| TypeScript | eslint + typescript-eslint | tsc | eslint security plugin | npm audit / audit-ci | vitest / jest |
| C# | Roslyn analyzers | compiler | SecurityCodeScan | dotnet list --vulnerable | coverlet |
| All | SonarQube (CI) | — | SonarQube | — | SonarQube |

**Key principle:** fast tools (ruff, tsc, eslint) run on every commit via pre-commit hooks. Slow, deep tools (pylint, SonarQube, bandit full scan) run in CI on every PR. Quality gates block the merge, not the developer's local loop.

---

## Modo auditoría integral

> Contenido completo y preservado de la antigua skill `agteamos-quality`.

> **Nota — no confundir con `agteamos-plugin-improvement`**: este modo (auditoría
> integral) audita el codigo/arquitectura del **PROYECTO CONSUMIDOR** (el repo
> donde se instaló AgTeamOS). `agteamos-plugin-improvement` es una skill distinta que
> audita al **propio sistema AgTeamOS** (detecta friccion en su propio
> workflow, revisa `verify-report.md` de tareas archivadas, etc.). Ambas
> coexisten con responsabilidades separadas — no son intercambiables.

### Contrato del modo

- **Input**: repositorio del proyecto activo
- **Output**: `agteamos/security/AUDIT-YYYY-MM-DD.md` con Radar de Deuda
  Tecnica, score global 0-100 y plan de mitigacion P0/P1/P2
- **Who runs this**: equipo completo — cada agente aporta su dimension de
  analisis

### Proceso

#### Paso 0 — Context acquisition

Execute the `agteamos-router` skill first. Then read `agteamos/architecture/PROJECT_CONTEXT.md` if it exists.

If neither exists, run `agteamos-project-docs` (L0, default) before proceeding — an
audit without project context produces unreliable results. Then, before the
dimensions below that read `agteamos/standards/` (security, testing,
clean-architecture), invoke `ensure-artifact(standards.security)`,
`ensure-artifact(standards.testing)` y `ensure-artifact(standards.clean-architecture)`
(ver `agteamos-context-engineering` §Lazy Artifacts) para esos temas
puntuales — no hace falta `agteamos-project-docs --full` para auditar, alcanza con
L0 más los temas que este audit realmente compara.

**Cargar el audit anterior (si existe)**: buscar el `AUDIT-YYYY-MM-DD.md` más
reciente en `agteamos/security/` antes de este. Su tabla "Radar de Deuda
Tecnica" y "Vulnerabilidades Criticas" son la base para calcular la columna
`Estado` del Paso 6 (`NEW`/`SEEN`/`RESOLVED`). Volcar los hallazgos a un JSON
temporal y correr:
```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/lib/findings-ledger.js" \
  reconcile AU findings.json agteamos/.cache/findings/audit.json
```
Si no hay audit anterior, todo se marca `NEW` y se dice explícitamente en el
reporte ("primer audit registrado — sin baseline para comparar"). Este cache
(`agteamos/.cache/findings/audit.json`, prefijo `AU`) es propio de este modo
— no se comparte con el cache de domain-review continuo (`DR`, ver nota
final).

**Baseline de hotspots**: si existe `agteamos/quality/debt-trend.yml`
(generado por el hook `inject-debt-signal.js`, ver §4.5 de
`DECISIONS.md`), leer su última snapshot
y usarla como punto de partida de la sección de mantenibilidad (Paso 4) —
los archivos que ya aparecían como hotspot antes de este audit no son un
hallazgo nuevo, son la confirmación de una tendencia ya señalada.

#### Sub-modo `--parallel` (opcional, patrón tech-debt-reviewer/thermos-claude)

Los Pasos 1-5 de abajo (arquitectura, seguridad, calidad/testing, DevOps,
valor de negocio) ya están divididos por dimensión y por agente dueño —
hoy corren en secuencia, uno detrás del otro. En proyectos grandes eso es
lento. Con `--parallel`, cada Paso 1-5 se lanza como un **subagente
read-only independiente** (vía el tool `Agent`, en paralelo, no en
background sin supervisión) — mismo patrón que un "Tech Debt Reviewer" de
10 agentes especializados, adaptado a los 5 dueños que ya existen acá en
vez de inventar más:

```
Lanzar en paralelo (una sola tanda, un solo mensaje con 5 llamadas):
  Subagente 1 → Paso 1 completo (Architecture analysis)
  Subagente 2 → Paso 2 completo (Security analysis)
  Subagente 3 → Paso 3 completo (Quality and testing analysis)
  Subagente 4 → Paso 4 completo (DevOps and observability analysis)
  Subagente 5 → Paso 5 completo (Business value assessment)
```

Cada subagente recibe el mismo contexto base del Paso 0 (baseline de
hotspots, audit anterior, ledger `AU` ya cargado) y devuelve su sección tal
cual el formato que ese Paso ya define — no inventan un formato propio.
Ningún subagente escribe `AUDIT-YYYY-MM-DD.md` ni corre operaciones de
tracker — eso lo hace el orquestador en el Paso 6, después de recibir las 5
secciones. Si dos subagentes reportan el mismo hallazgo desde ángulos
distintos (ej. Seguridad y Arquitectura señalando el mismo módulo), el
Paso 6 los consolida en una sola fila del Radar en vez de duplicarla.

**Cuándo usarlo**: proyectos con más de ~50 archivos de código o cuando el
audit anterior ya tardó demasiado en modo secuencial. En proyectos chicos,
el overhead de coordinar 5 subagentes no compensa — seguir secuencial.

#### Paso 1 — Architecture analysis (@architect)

**Scoping por hot spots (antes de leer todo el repo)**: correr
`git log --since="90 days ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -30`
para identificar los archivos/módulos que más cambiaron recientemente — ahí
es donde la arquitectura real está bajo más presión, y donde un problema
estructural cuesta más caro. Priorizar la lectura profunda en esos módulos
antes de hacer un barrido uniforme de todo el repo (YAGNI aplicado al propio
audit: no vale la pena el mismo nivel de detalle en un módulo que nadie toca
hace un año). El barrido completo (`Glob`) sigue haciéndose para el mapeo
general, pero el análisis profundo se concentra en los hot spots.

Examine the codebase structure:
- Glob the entire project to map modules, layers and dependencies
- Identify coupling: are there circular imports, god classes, or fat controllers?
- Check ADRs: are architectural decisions documented and current?
- Assess scalability: stateless services, horizontal scaling readiness
- Flag any SOLID violations in the core domain logic

Produce a list of findings with severity: Critical / High / Medium / Low.

**Per-domain breakdown**: para cada bounded context o módulo grande
identificado en el mapeo de arriba, invocar el **Modo domain-review
continuo** sobre él (no sobre todo el repo de una — un módulo a la vez) para
localizar smells concretos (God Module, leaky boundary, concepto disperso —
ver `skills/quality/smells.md`) en vez de solo reportar "acoplamiento alto"
a nivel general. Sus hallazgos se listan bajo "Analisis de Arquitectura" en
el reporte final (Paso 6), citando el módulo, no como bloqueantes de PR (un
audit no bloquea un merge, solo prioriza deuda).

#### Paso 2 — Security analysis (@security-engineer)

Run all of these, document the results:

```bash
# Secret scanning
grep -rE "(key|secret|password|token|api_key|private_key)\s*=\s*['\"][^'\"]{8,}" . \
  --include="*.py" --include="*.ts" --include="*.js" --include="*.env" \
  -l

# Python dependency audit
pip audit 2>/dev/null || pip-audit 2>/dev/null

# Node dependency audit
npm audit --audit-level=moderate 2>/dev/null

# Check for hardcoded IPs or localhost references in non-dev files
grep -rE "(127\.0\.0\.1|localhost)" . --include="*.py" --include="*.ts" -l

# Scanner determinista (SQLi, XSS, secrets, eval, path traversal, command injection)
find . -type f \( -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.cs" \) \
  -not -path "*/node_modules/*" -not -path "*/.venv/*" \
  | xargs node "${CLAUDE_PLUGIN_ROOT}/scripts/security-scanner.mjs" scan --format json --fail-on none
```

Apply OWASP Top 10 as a checklist:
1. A01 Broken Access Control — are all endpoints protected?
2. A02 Cryptographic Failures — are secrets managed via env vars only?
3. A03 Injection — are all inputs validated/sanitized?
4. A04 Insecure Design — does the threat model match the code?
5. A05 Security Misconfiguration — debug mode, CORS wildcard, verbose errors?
6. A06 Vulnerable Components — any CVEs from the audit commands above?
7. A07 Auth Failures — brute force protection, session expiration?
8. A08 Data Integrity — are deserialized inputs validated?
9. A09 Logging Failures — are security events logged without exposing PII?
10. A10 SSRF — are outbound requests restricted to known domains?

Execute the `agteamos-security` skill if STRIDE analysis has not been done recently.

#### Paso 3 — Quality and testing analysis (@qa-engineer)

```bash
# Python coverage
pytest --cov=. --cov-report=term-missing 2>/dev/null | tail -20

# Node/TypeScript coverage
npx vitest run --coverage 2>/dev/null | tail -20
```

Assess:
- Unit test coverage (target: >80% on domain logic)
- E2E coverage: which critical user paths have no automated test?
- Estimated mutation score: are tests verifying behaviour or just coverage numbers?
- Contract tests: are API contracts tested between consumers and providers?
- Test quality: any tests that never fail (empty assertions, always-true conditions)?

#### Paso 4 — DevOps and observability analysis (@devops-engineer)

Run the `agteamos-metrics` skill to get the current team performance baseline.

Check observability:
- Are logs structured JSON (not plain strings)?
- Is error tracking (Sentry or equivalent) configured and receiving events?
- Are uptime alerts configured with < 2min detection SLA?
- Are p95 latency and error rate dashboards available?
- Is there a runbook for every critical alert?

Check production readiness:
- Does the service have a health check endpoint?
- Are environment variables documented in `.env.example`?
- Is the Docker image multi-stage (build vs runtime)?
- Is rollback tested and documented?

#### Paso 5 — Business value assessment (@product-manager)

For each finding identified in Steps 1-4, assess:
- **Business impact**: what happens if this is NOT fixed? (revenue loss / user frustration / security breach / dev velocity)
- **Effort estimate**: S/M/L/XL
- **ROI**: is the fix cost justified by the impact prevented?

Prioritize into:
- **P0**: fix now, blocks production safety or legal compliance
- **P1**: fix this sprint, significant impact on reliability or security
- **P2**: fix next quarter, important but not urgent

#### Paso 6 — Generate the audit report

Antes de publicarlo, correr el checklist pre-envío de `agteamos-pr-standards`
Step 10 sobre el "Resumen"/"Score" inicial del reporte — la conclusión (score
+ hallazgo más crítico) va primero, no al final de un documento largo.

Create `agteamos/security/AUDIT-YYYY-MM-DD.md` (use today's date):

```markdown
# Engineering Audit — [Project Name]

**Date**: YYYY-MM-DD
**Score Global de Salud**: [0-100]%
**Auditores**: @architect, @security-engineer, @qa-engineer, @devops-engineer, @product-manager

---

## Radar de Deuda Tecnica

| Categoria | Nivel de Deuda | Impacto en Negocio | Esfuerzo Fix | Estado |
|-----------|----------------|--------------------|--------------|--------|
| Codigo | Alta/Med/Baja | [descripcion] | S/M/L/XL | NEW/SEEN/RESOLVED |
| Arquitectura | Alta/Med/Baja | [descripcion] | S/M/L/XL | NEW/SEEN/RESOLVED |
| Seguridad | Alta/Med/Baja | [descripcion] | S/M/L/XL | NEW/SEEN/RESOLVED |
| Documentacion | Alta/Med/Baja | [descripcion] | S/M/L/XL | NEW/SEEN/RESOLVED |
| UI/UX & A11y | Alta/Med/Baja | [descripcion] | S/M/L/XL | NEW/SEEN/RESOLVED |
| Tests | Alta/Med/Baja | [descripcion] | S/M/L/XL | NEW/SEEN/RESOLVED |
| DevOps & Obs. | Alta/Med/Baja | [descripcion] | S/M/L/XL | NEW/SEEN/RESOLVED |

`Estado` sale de `reconcile('AU', ...)` contra el audit anterior (ver Paso 0):
`NEW` = no estaba en el último audit, `SEEN` = ya se había reportado y sigue
sin resolverse (con contador de veces), `RESOLVED` = estaba antes y ya no
aparece (se lista en "Resuelto desde el último audit" más abajo, no en esta
tabla).

---

## Vulnerabilidades Criticas

| ID | Descripcion | OWASP | Severidad | Archivo:Linea | Estado |
|----|-------------|-------|-----------|---------------|--------|
| V1 | [descripcion] | A0X | Critical | path/file.py:42 | NEW/SEEN xN |

---

## Cambios desde el ultimo audit

- **Resuelto**: [lista de IDs `AU-*` que estaban en el audit anterior y ya no
  aparecen — o "sin baseline, primer audit" si Paso 0 no encontró uno previo]
- **Empeoró (SEEN con severidad mayor)**: [lista, o "ninguno"]

---

## Plan de Mitigacion

### P0 — Inmediato (esta semana)
1. [Issue] — Responsable: @agente — Justificacion: [ROI]

### P1 — Este sprint
1. [Issue] — Responsable: @agente — Estimacion: M

### P2 — Proximo trimestre
1. [Issue] — Responsable: @agente — Estimacion: L

---

## Analisis de Arquitectura

- **ADRs registrados**: [N] — [estado: al dia / desactualizados]
- **Acoplamiento detectado**: [descripcion o "ninguno critico"]
- **Riesgos de escalabilidad**: [lista]

---

## Calidad y Testing

- **Cobertura unit**: X%
- **Cobertura E2E**: [paths cubiertos / paths totales]
- **Mutation score estimado**: X% (confianza en los tests)
- **Contract tests**: Activos / Inactivos

---

## Observabilidad (SRE)

- **Logs estructurados**: Si / No
- **Error tracking**: Si (Sentry) / No
- **Alertas configuradas**: Si / No
- **DORA metrics**: Deployment Frequency: X | Lead Time: Y | CFR: Z% | MTTR: W

---

## Fortalezas Detectadas

1. [Patron positivo que debe preservarse]
2. [Otro punto fuerte del proyecto]

---

## Score Calculation

| Dimension | Peso | Score |
|-----------|------|-------|
| Seguridad | 25% | X/25 |
| Arquitectura | 20% | X/20 |
| Tests | 20% | X/20 |
| DevOps | 15% | X/15 |
| Codigo | 15% | X/15 |
| Docs | 5% | X/5 |

**Score Total**: [suma]/100
```

### Ejemplos (auditoría integral)

**Scoring guide**:
- 90-100: Elite — the team is shipping at high confidence
- 75-89: High — solid foundation with specific gaps to address
- 50-74: Medium — significant debt that is slowing delivery
- < 50: Critical — requires a dedicated debt reduction sprint before new features

**Secret scanning example output** (findings that would be P0):
```
src/config.py:14: DB_PASSWORD = "mypassword123"
.env.staging:3: STRIPE_SECRET_KEY = "sk_live_abc..."
```

**DORA context**:
If Lead Time for Changes > 1 week, the team is accumulating release debt. Flag as P1 and recommend smaller PR size + automated merge queue.

### Anti-patterns (auditoría integral)

- Running the audit without reading PROJECT_CONTEXT.md first — the findings lack architectural context
- Listing every minor issue as P0 — creates alert fatigue and blocks action on real critical items
- Scoring only what is measurable (coverage %) and ignoring qualitative factors (naming, coupling) — the score becomes misleading
- Generating the audit report but not creating follow-up tickets — an audit without action items is a document graveyard
- Doing a security analysis without running the actual secret scanning command — assumptions are not evidence
- Reportar el Radar de Deuda Tecnica sin comparar contra el audit anterior cuando existe uno — sin la columna `Estado` no se puede saber si el equipo está mejorando o empeorando entre audits

---

## Prefijos y caches de findings-ledger.js (nota importante — no unificar)

Los tres modos que interactúan con `findings-ledger.js` lo hacen de forma
**independiente**, con prefijos y archivos de cache propios. No compartir
cache entre modos — son corridas con historiales distintos y preguntas
distintas:

| Modo | Usa `scope` (ratchet) | Usa `reconcile` (cache persistente) | Prefijo | Archivo de cache |
|------|------------------------|--------------------------------------|---------|-------------------|
| PR-review | Si | No — no mantiene cache propio entre corridas | — | — |
| domain-review continuo | Si | Si | `DR` | `agteamos/.cache/findings/domain-review.json` |
| static-analysis | No aplica (herramientas externas, no findings-ledger) | No aplica | — | — |
| auditoría integral | No (usa hotspots de `debt-trend.yml` en su lugar) | Si | `AU` | `agteamos/.cache/findings/audit.json` |

El Modo PR-review solo usa `findings-ledger.js scope .` para calcular qué
líneas cambió el diff actual y decidir ratchet (introducido vs. preexistente)
— no reconcilia contra un cache propio, así que no tiene prefijo ni archivo
de cache dedicado. Si el Modo PR-review invoca al Modo domain-review continuo
como sub-paso (Dimensión 4), ese sub-paso sí usa su propio cache `DR` normal,
tal como lo haría de forma standalone.
