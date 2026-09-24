---
name: agteamos-debug
description: >
  Debugging sistematico con analisis de causa raiz (5 Whys), reproduccion
  del error, fix minimo y test de regresion obligatorio. Categoriza el bug
  y lo documenta.
used_by:
  - backend-engineer
  - frontend-engineer
  - qa-engineer
---

# SKILL: Debug Workflow

## CONTRACT

- **Input**: descripcion del error, stack trace, o comportamiento inesperado
- **Output**: bug fixed + test de regresion escrito + causa raiz documentada + categoria del bug registrada + tarea cerrada vía `agteamos-implement`
- **Who runs this**: @backend-engineer or @frontend-engineer for implementation, @qa-engineer validates the regression test
- **Schema**: `lite` (ver Fase F.1 del plan AgTeamOS, adoptado de OpenSpec). Un
  bug puntual de 1 archivo NO crea los 4 artefactos completos de
  `agteamos/changes/<id>/specs/` — el 5 Whys (Step 3) + la categorizacion
  (Step 7) cumplen el rol de `requirements.md`/`design.md`, y el resumen de 1
  parrafo + el test de regresion (Step 6) son el unico output escrito ademas
  del propio fix. Si el 5 Whys revela un problema arquitectonico que cruza
  dominios, escalar a schema `full` (`agteamos-task` /
  `agteamos-spec`) en vez de seguir en `debug`.
- **Cierre**: esta skill NUNCA mergea ni cierra el ticket a mano — el Step 8
  invoca `agteamos-implement`, que maneja la bifurcación `schema: lite`
  (verify reducido al test de regresión, sin delta ni sync de spec maestra).
  No duplicar lógica de merge acá (misma regla que `agteamos-fix`).

---

## PROCESS

### Step 1 — Reproduce the context

Read every file referenced in the stack trace or error message. Never guess — read the exact code.

```bash
# Find the file from a stack trace line like "app/services/invoice_service.py:42"
# Read it with the Read tool at line 42 with ±20 lines of context

# For frontend errors, find the compiled source map reference
grep -r "functionNameFromStackTrace" src/ --include="*.ts" --include="*.tsx" -l
```

Confirm you can reproduce the error mentally by tracing the execution path from input to failure. If you cannot reproduce it from reading the code, add a minimal reproduction case before proceeding.

**Gate obligatorio antes de teorizar**: no pasar al Step 3 (5 Whys) sin un
**loop rojo/verde reproducible** — un comando o script que hoy falla de la
misma forma que el bug reportado, y que pasaría a estar verde si el bug
estuviera arreglado. Si te descubrís leyendo código para armar una teoría
sin que ese comando exista todavía, parar y construirlo primero. Orden de
preferencia (usar el más barato que alcance, no siempre el primero de la
lista):

1. Un test que falla (unit o integration) — el más barato si ya hay fixtures.
2. Un script `curl`/HTTP contra el endpoint afectado.
3. Un diff de CLI (correr el comando dos veces, comparar output esperado vs real).
4. Un browser headless (Playwright) si el bug es solo reproducible en UI.
5. Reproducir contra un trace/log capturado del incidente real, si existe.
6. Un harness descartable (script de una sola vez, se borra después).
7. Un loop de fuzzing acotado, si el bug depende de un input no determinístico.
8. Bisección (`git bisect`) si no se sabe en qué commit se rompió.
9. Un loop diferencial (correr versión vieja vs nueva del código con el mismo input).
10. Último recurso: un script bash guiado por humano (HITL) si nada de lo anterior aplica.

Sin este loop, cualquier "arreglo" es una corazonada — no hay forma de
confirmar que lo resolvió ni de que el test de regresión (Step 6) sea real.

---

### Step 2 — Create the branch

Misma convención de nombrado e id que `agteamos-fix` (no se duplica la tabla
acá — ver esa skill para el detalle completo): la rama siempre lleva el **id
de la tarea**, nunca solo el slug, y la rama base **nunca se hardcodea**,
se lee de `agteamos/platform.yml → branch_strategy`.

```bash
# Leer agteamos/platform.yml -> branch_strategy para la rama base
# personal (feature/*->main): rama base = main
# team (feature/*->develop->staging->main): rama base = develop
# custom: ver branch_strategy_custom

git checkout <rama-base-segun-platform.yml> && git pull
git checkout -b bugfix/<id>-<slug>
# Example: bugfix/78-invoice-total-null-crash
# Sin ticket todavia: bugfix/tmp-invoice-total-null-crash (id provisional
# "tmp", mismo criterio que agteamos-fix y agteamos-task)
```

---

### Step 3 — 5 Whys root cause analysis

Fill in this table before proposing any fix:

| Level | Question | Answer |
|-------|----------|--------|
| Error observado | What is happening? | [exact error message or behaviour] |
| Why 1 | Why does that happen? | [immediate technical cause] |
| Why 2 | Why does that cause exist? | [underlying mechanism] |
| Why 3 | Why was that mechanism flawed? | [design or logic gap] |
| Why 4 | Why was that gap not caught? | [missing test / missing validation] |
| Why 5 (root cause) | Why was there no safeguard? | [process or architectural gap] |

**Antes de aceptar la primera teoría que suene plausible**: listar 3-5
hipótesis candidatas para "Why 1" en formato falsable — *"si [hipótesis] es
la causa, entonces [cambio concreto] debería hacer que el bug desaparezca"*
— rankeadas de más a menos probable, y mostrarlas al usuario/equipo **antes**
de probar la primera. Esto evita anclarse en la primera explicación que
viene a la mente solo porque fue la primera. Recién con el loop del Step 1
se pueden probar una por una hasta confirmar cuál sobrevive.

**Example — NullPointerException in invoice total calculation**:

| Level | Answer |
|-------|--------|
| Error observado | `AttributeError: 'NoneType' object has no attribute 'total'` in `invoice_service.py:58` |
| Why 1 | `invoice.total` is None when the invoice has no line items |
| Why 2 | The `create_invoice` function does not validate that `line_items` is non-empty before saving |
| Why 3 | The validation was assumed to happen in the API layer but the schema allowed an empty list |
| Why 4 | No test covered the empty line_items case — only the happy path was tested |
| Why 5 (root cause) | The team convention "validate in the service layer" was not enforced — business rules lived in the wrong layer |

---

### Step 4 — Propose two solutions

Always present both options before implementing:

**Fix inmediato (tactical patch)**: the minimum change that stops the bleeding. Appropriate when production is down and the correct fix takes time.

**Fix correcto (structural solution)**: addresses the root cause, not just the symptom. This is what you implement unless there is an active production incident requiring the tactical patch first.

**Example**:

Fix inmediato:
```python
# Add a guard at the point of failure
if invoice.total is None:
    invoice.total = Decimal("0.00")
```

Fix correcto:
```python
# In the service layer — enforce the business rule where it belongs
async def create_invoice(self, payload: InvoiceCreate, owner_id: uuid.UUID) -> Invoice:
    if not payload.line_items:
        raise ValueError("Invoice must have at least one line item")
    total = sum(item.quantity * item.unit_price for item in payload.line_items)
    return await self.repo.create(owner_id=owner_id, total=total)
```

Implement the fix correcto. Document the tactical patch only if it was applied as an emergency measure.

---

### Step 5 — Implement the fix

Apply the fix with the Edit tool — surgical, minimum change.

**Before (broken)**:
```python
# services/invoice_service.py:55-60
async def create_invoice(self, payload: InvoiceCreate, owner_id: uuid.UUID) -> Invoice:
    total = sum(item.quantity * item.unit_price for item in payload.line_items)
    return await self.repo.create(owner_id=owner_id, total=total)
```

**After (fixed)**:
```python
# services/invoice_service.py:55-62
async def create_invoice(self, payload: InvoiceCreate, owner_id: uuid.UUID) -> Invoice:
    if not payload.line_items:
        raise ValueError("Invoice must have at least one line item")
    total = sum(item.quantity * item.unit_price for item in payload.line_items)
    return await self.repo.create(owner_id=owner_id, total=total)
```

---

### Step 5.5 — Verificar la causa confirmada (gate, patrón `obra/superpowers`)

**No pasar al Step 6 sin correr de nuevo el mismo loop del Step 1** (el
mismo test/script/comando, no uno nuevo) y confirmar que pasó de rojo a
verde. Esto es lo que distingue "arreglé el síntoma que yo creo que era el
bug" de "confirmé que era el bug real":

1. Correr el loop reproducible del Step 1 con el fix ya aplicado. Debe
   estar en verde ahora.
2. Si sigue en rojo (o falla distinto), el fix no ataca la causa
   identificada en el Step 3 — volver al Step 3 con esa evidencia, no
   ajustar el fix a ciegas hasta que "parezca" andar.
3. Si el fix es chico y el costo es bajo, revertirlo momentáneamente y
   confirmar que el loop vuelve a rojo (descarta que el loop estuviera mal
   armado y siempre diera verde) — opcional pero recomendado cuando la
   causa raíz no es obvia a simple vista.

Sin este gate, el Step 6 (test de regresión) podría estar documentando un
fix que en realidad no resuelve nada.

---

### Step 6 — Write the regression test

The regression test is the test that would have caught this bug BEFORE it reached production.

```python
# This test did not exist — it must exist now
@pytest.mark.asyncio
async def test_create_invoice_empty_line_items_raises_value_error():
    """
    Regression test for: AttributeError when creating invoice with no line items.
    Fixed in: feature/fix-empty-invoice-validation
    """
    service = InvoiceService(db=mock_db)
    with pytest.raises(ValueError, match="at least one line item"):
        await service.create_invoice(
            payload=InvoiceCreate(line_items=[]),
            owner_id=uuid.uuid4()
        )
```

The test must:
1. Test the exact condition that caused the bug
2. Include a docstring referencing the bug it prevents
3. Fail without the fix, pass with the fix (verify this mentally)

---

### Step 7 — Categorize the bug

Document the following:

**Type**: choose one:
- `Logic Error` — incorrect business rule implementation
- `Auth Issue` — missing or bypassed authorization check
- `DB Error` — query, constraint, or transaction issue
- `Race Condition` — concurrent access without proper locking
- `Config Error` — missing or wrong environment variable / configuration
- `Integration Error` — contract mismatch with external service
- `Type Error` — wrong type assumption (null, undefined, type mismatch)
- `Performance` — query or algorithm causing unacceptable latency

**Severity**:
- `Critical` — production down, data loss, or security breach
- `High` — significant feature broken for all or most users
- `Medium` — feature broken for some users or with a workaround
- `Low` — cosmetic issue or edge case with low impact

**Is regression?**: Did this work before? If yes, identify the commit that introduced it:
```bash
git log --oneline --all -- path/to/affected/file.py
git bisect start HEAD <last-known-good-commit>
```

---

### Step 8 — Cerrar la tarea vía `agteamos-implement`

No mergear ni cerrar el ticket a mano. Con el fix implementado (Step 5), el
test de regresión pasando (Step 6) y el bug categorizado (Step 7), abrir el
PR hacia la rama base identificada en el Step 2 y luego invocar
`agteamos-implement` para que haga el merge, el cierre del ticket, la
limpieza de la rama y el archivado — usando su bifurcación para
`schema: lite` (ver `agteamos-spec`): `verify` se reduce a comprobar
que el test de regresión del Step 6 pasa, sin `specs/deltas/<dominio>.md` ni
sync contra `agteamos/specs/<dominio>.md`.

```
[operación: create-pr] (abre el PR con el fix hacia <rama-base>, incluyendo
  `Closes #<ticket>` en el body para link-pr-to-ticket; se resuelve contra
  agteamos/tracker/<tracker de platform.yml>.md)
# QA valida (test de regresion + causa raiz documentada)
Invocar: agteamos-implement
  con: schema: lite, test de regresión del Step 6 como único criterio de verify
```

Si el Step 9 (ADR) aplica, ese ADR se commitea en el mismo PR antes de
invocar `agteamos-implement` — no en un PR separado.

### Step 9 — Create ADR if the bug reveals an architectural gap

If the 5 Whys analysis reveals that the bug is a symptom of a systemic architectural problem (wrong layering, missing abstraction, unclear ownership), execute the `agteamos-decisions` skill to document the architectural decision that prevents this class of bugs.

**Example trigger**: "We have three different places where invoice validation is happening — we need a single source of truth for business rules."

---

## EXAMPLES

**5 Whys — Race condition in seat reservation**:

| Level | Answer |
|-------|--------|
| Error observado | Two users book the same seat simultaneously |
| Why 1 | Both read `status = "available"` before either writes "reserved" |
| Why 2 | No database-level locking on the read-modify-write sequence |
| Why 3 | The service uses two separate queries instead of a single atomic UPDATE |
| Why 4 | Load tests did not simulate concurrent requests on the same resource |
| Why 5 (root cause) | The team had no convention for handling concurrent writes — this was an implicit assumption that the framework would handle it |

Fix: Replace two-query pattern with `SELECT ... FOR UPDATE` + single transaction.

---

## ANTI-PATTERNS

- Fixing the symptom without completing the 5 Whys — the bug will reappear in a different form
- Teorizar sobre la causa antes de tener un loop rojo/verde reproducible — sin eso, ninguna "confirmación" es real
- Anclarse en la primera hipótesis plausible sin listar 3-5 candidatas falsables antes de probar — la primera idea rara vez es la correcta
- Implementing the tactical patch and forgetting the structural fix — patches accumulate into unmaintainable code
- Writing the regression test after the fix passes — write it first, verify it fails, then verify it passes
- Saltar el Step 5.5 y asumir que el fix funciona porque "tiene sentido" — sin re-correr el loop del Step 1 no hay confirmación real de que la causa era la correcta
- Not categorizing the bug — without categorization, the team cannot identify systemic patterns (e.g., "70% of our bugs are Type Errors — we need stricter schema validation")
- Fixing without reading the original code — assumptions about what the code does are almost always wrong
- Skipping the ADR when the root cause is architectural — the same class of bug will appear in a different module next sprint
- Mergear el PR o cerrar el ticket a mano en vez de invocar `agteamos-implement` — duplica lógica de cierre que ya vive en esa skill (misma regla que `agteamos-fix`)
- Crear la rama sin el id de la tarea (`bugfix/<slug>` en vez de `bugfix/<id>-<slug>`) — rompe la trazabilidad con el dashboard
- Hardcodear `main`/`develop`/`testing` en vez de leer `agteamos/platform.yml → branch_strategy`

---

## Próximo paso sugerido

**Próximo paso sugerido**: `agteamos-implement` — el Step 8 de esta skill
ya lo invoca para el cierre (ver `agteamos-context` §Próximo paso).
