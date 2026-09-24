---
name: agteamos-fix
description: >
  Hotfix rapido y tactico para bugs o cambios menores. Omite fases estrategicas
  pero mantiene calidad: test obligatorio, PR hacia rama correcta, cierre de ticket.
used_by:
  - backend-engineer
  - frontend-engineer
  - product-manager
  - qa-engineer
---

# SKILL: Fix Workflow

## CONTRACT

- **Input**: descripcion del bug o cambio menor a realizar
- **Output**: fix implementado + test unitario + PR hacia la rama base correcta + tarea cerrada vía `agteamos-implement` (merge + cierre de ticket + limpieza de rama)
- **Who runs this**: @product-manager triages, @backend-engineer or @frontend-engineer implements, @qa-engineer validates
- **Cierre**: esta skill NUNCA mergea ni cierra el ticket a mano — el Step 7
  invoca `agteamos-implement`, que sabe manejar la bifurcación `schema: lite`
  (verify reducido al test de regresión, sin delta ni sync de spec maestra).
  No duplicar lógica de merge acá.
- **Schema**: `lite` (ver Fase F.1 del plan AgTeamOS, adoptado de OpenSpec). Un
  hotfix o cambio trivial de 1 archivo NO crea los 4 artefactos completos de
  `agteamos/changes/<id>/specs/` (`requirements.md` + `design.md` +
  `tasks.md` + `deltas/<dominio>.md`). En su lugar produce solo:
  1. Un resumen de 1 parrafo (que bug, que cambio, por que) — puede vivir
     directamente en el cuerpo del PR, sin necesidad de crear la carpeta
     `agteamos/changes/<id>-<slug>/` si el cambio es de una sola linea.
  2. El test de regresion obligatorio (Step 4 abajo).
  Si el fix termina tocando mas de un dominio o requiere coordinacion entre
  agentes, escalar a schema `full` y usar `agteamos-new-task` /
  `agteamos-sdd-protocol` en su lugar — `fix` es solo para el caso tactico.

---

## PROCESS

### Step 1 — Triage: classify the fix

@product-manager analyzes the report and answers three questions:

**1. What layer is affected?**
- Backend only → assign @backend-engineer
- Frontend only → assign @frontend-engineer
- Both → assign both, coordinate

**2. What is the urgency?**

Toda rama lleva el **id de la tarea** para trazabilidad, aunque sea un id
provisional (ver Step 2) — nunca `hotfix/<slug>` ni `bugfix/<slug>` a secas,
porque eso deja el hotfix fuera del dashboard y sin traza (ver `agteamos-implement`,
"incluir ID para trazabilidad"). La rama base **nunca se hardcodea** — se lee
de `agteamos/platform.yml → branch_strategy`:

| `branch_strategy` | Rama de producción | Rama de integración |
|---|---|---|
| `personal` (`feature/* → main`) | `main` | no existe — usar la misma rama de producción |
| `team` (`feature/* → develop → staging → main`) | `main` | `develop` |
| `custom` | ver `branch_strategy_custom` en `platform.yml` | ver `branch_strategy_custom` |

| Level | Definition | Rama base | Nombre de rama |
|-------|-----------|-----------|-----------------|
| P0 — Hotfix | Production is down or data is at risk | rama de producción | `hotfix/<id>-<slug>` |
| P1 — Urgent | Major feature broken, no workaround | rama de producción | `bugfix/<id>-<slug>` |
| P2 — Standard | Feature broken with workaround | rama de integración (si existe) | `bugfix/<id>-<slug>` |
| P3 — Minor | Cosmetic, typo, low impact | rama de integración (si existe) | `bugfix/<id>-<slug>` |

**3. Is this a change at all?**

Sometimes the correct answer is NOT to change the code. Document when this applies:
- The "bug" is expected behaviour per the spec — educate the reporter
- The fix would require architectural changes that cannot be done in a hotfix — create a P1 ticket and handle via sprint planning
- The reported issue is in an environment-specific configuration — update `.env` documentation, not code

If the decision is NO CHANGE — document the reason and close the ticket with explanation.

---

### Step 2 — Create the correct branch

El `<id>` es el número de ticket real si existe. Si el fix no tiene ticket
(caso típico de un P0 en caliente), usar el id provisional `tmp-<slug>` —
mismo criterio que `agteamos-new-task` usa para su carpeta provisional en
`agteamos/changes/<id-provisional>-<slug>/` (ver NOTA al final de esta skill
si el id provisional termina siendo otro).

```bash
# Leer agteamos/platform.yml -> branch_strategy para la rama base (ver tabla arriba)

# P0 Hotfix (production down) — branch from rama de produccion
git checkout <rama-de-produccion> && git pull
git checkout -b hotfix/<id>-<slug>
# Example: hotfix/91-payment-webhook-500 (con ticket) o hotfix/tmp-payment-webhook-500 (sin ticket)

# P1/P2/P3 Bugfix — branch from rama de integracion (o de produccion si no existe)
git checkout <rama-de-integracion-o-produccion> && git pull
git checkout -b bugfix/<id>-<slug>
# Example: bugfix/78-invoice-total-calculation
```

---

### Step 3 — Surgical fix

The change must be the minimum that solves the problem. No refactoring, no cleanup, no "while I'm here" changes.

Read the exact file and line reported. Apply the minimum diff.

**Example — wrong tax calculation**:

Before:
```python
# services/invoice_service.py:78
def calculate_total(subtotal: Decimal, tax_rate: Decimal) -> Decimal:
    return subtotal * tax_rate  # BUG: missing the +1 multiplier
```

After:
```python
def calculate_total(subtotal: Decimal, tax_rate: Decimal) -> Decimal:
    return subtotal * (1 + tax_rate)
```

If you find other issues while reading the code — create a separate ticket. Do not fix them here.

---

### Step 4 — Write the unit test (MANDATORY)

Every fix must include a test that:
1. Fails without the fix
2. Passes with the fix
3. Has a docstring referencing the bug

```python
def test_calculate_total_applies_tax_correctly():
    """
    Regression test: calculate_total was returning subtotal * rate instead of
    subtotal * (1 + rate), causing undercharged invoices.
    Bug: #78 — Invoice total calculation incorrect for VAT
    """
    result = calculate_total(subtotal=Decimal("100.00"), tax_rate=Decimal("0.21"))
    assert result == Decimal("121.00")

def test_calculate_total_zero_tax():
    """Edge case: zero tax rate should return subtotal unchanged."""
    result = calculate_total(subtotal=Decimal("100.00"), tax_rate=Decimal("0.00"))
    assert result == Decimal("100.00")
```

---

### Step 5 — Open the PR toward the correct branch

| Fix type | Target branch |
|----------|--------------|
| P0 hotfix | rama de producción según `agteamos/platform.yml → branch_strategy` (luego cherry-pick a la rama de integración tras el merge, ver Step 8) |
| P1/P2/P3 bugfix | rama de integración según `branch_strategy` (o la misma rama de producción si `branch_strategy: personal`, que no tiene rama de integración separada) |

```
[operación: create-pr] (abre el PR hacia <target-branch>; se resuelve contra
  agteamos/tracker/<tracker de platform.yml>.md)

Title: fix(<scope>): <what was broken and what was fixed>
Body:
## Bug
<description of what was wrong>

## Root Cause
<one sentence>

## Fix
<what changed and why>

## Test
<what regression test was added>

Closes #<ticket-number>   # cumple link-pr-to-ticket
```

---

### Step 6 — @qa-engineer quick validation

@qa-engineer reviews the PR with focus on:
- Does the test actually verify the fix (not just pass vacuously)?
- Is the diff surgical (no unrelated changes)?
- Are there edge cases the test does not cover?

If the fix is P0 and there is no time for a full review — @qa-engineer approves conditionally with a comment: "Approved as emergency hotfix. Full review in post-mortem."

---

### Step 7 — Cerrar la tarea vía `agteamos-implement`

No mergear ni cerrar el ticket a mano acá. Invocar `agteamos-implement` y
dejar que esa skill haga el merge, el cierre del ticket, la limpieza de rama
y (si corresponde) el archivado — usando su bifurcación para `schema: lite`
(ver `agteamos-sdd-protocol`): el paso `verify` se reduce a comprobar que el
test de regresión del Step 4 pasa, sin generar `specs/deltas/<dominio>.md` ni
tocar `agteamos/specs/<dominio>.md`, porque un cambio `lite` por definición
no altera el contrato del dominio.

```
Invocar: agteamos-implement
  con: PR aprobado por @qa-engineer (Step 6), schema: lite, test de
       regresión del Step 4 como único criterio de verify
```

Esto reemplaza cualquier `gh pr merge` / `gh issue close` manual — mergear o
cerrar el ticket a mano en esta skill duplica lógica que ya vive en
`agteamos-implement` y es exactamente el tipo de divergencia que este fix
corrige.

### Step 8 — Cherry-pick para P0 hotfixes (después de confirmar el merge)

Solo si `branch_strategy` tiene una rama de integración separada de la de
producción (`team`, o `custom` si aplica) y el fix era P0: una vez que
`agteamos-implement` confirma que el merge a la rama de producción se
completó, traer el fix a la rama de integración para que no se pierda en el
próximo release:

```bash
git checkout <rama-de-integracion>
git cherry-pick <merge-commit-sha>
git push
```

Si `branch_strategy: personal` (no hay rama de integración separada) este
paso no aplica — la rama de producción ya es la única rama.

---

## EXAMPLES

**Decision tree example**:

```
Report: "Users cannot log in — getting 500 error" (ticket #91)
↓
Layer: Backend (auth endpoint)
Urgency: P0 — production login broken for all users
Decision: CHANGE → hotfix
Branch: hotfix/91-login-500-error from <rama de produccion, ver platform.yml>
Fix: Read auth route → found missing null check on user.last_login
Test: test_login_returns_200_for_user_without_last_login
PR → rama de produccion
agteamos-implement → verify (lite: solo el test de regresion) → merge → ticket #91 cerrado → rama eliminada
Cherry-pick → rama de integracion (si branch_strategy: team)
```

**No-change decision example**:

```
Report: "Password reset emails are not being sent"
↓
Layer: Backend (email service)
Investigation: Email sending IS working — SMTP credentials are missing in staging env
Decision: NO CHANGE to code
Action: Update .env.staging.example + notify DevOps to set SMTP_* vars
Ticket #92 closed with: "Root cause was missing environment variables in staging.
Code is correct. See .env.example for required SMTP_* variables."
```

---

## NOTA — id provisional cuando no hay ticket

Esta skill usa `tmp-<slug>` como id provisional para hotfixes/bugfixes sin
ticket todavía (ej. `hotfix/tmp-payment-webhook-500`). Es el mismo criterio
que `agteamos-new-task` usa para su carpeta provisional
`agteamos/changes/<id-provisional>-<slug>/`. Si `agteamos-new-task` terminó
adoptando un formato distinto para su id provisional, reconciliar ambas
skills para que usen el mismo prefijo — la trazabilidad se rompe si cada
skill inventa su propio esquema de id temporal.

---

## ANTI-PATTERNS

- Refactoring while fixing — mixes unrelated changes, makes code review harder, increases regression risk
- Skipping the test because "it's a one-liner fix" — one-liner fixes that regress are the most embarrassing bugs
- Opening the PR to the production branch for a P2 bug — bypasses the test/staging pipeline
- Fixing multiple bugs in a single PR — makes bisecting impossible and code review unfocused
- Merging a P0 hotfix without cherry-picking to the integration branch (`team` strategy) — the fix disappears in the next release
- Mergear el PR o cerrar el ticket a mano (`gh pr merge`, `gh issue close`) en vez de invocar `agteamos-implement` — duplica lógica de cierre en 3 skills distintas y las hace divergir con el tiempo
- Crear la rama sin el id de la tarea (`hotfix/<slug>` en vez de `hotfix/<id>-<slug>`) — rompe la trazabilidad con el dashboard y con el resto de las ramas del proyecto
- Hardcodear `main`/`develop`/`testing` en vez de leer `agteamos/platform.yml → branch_strategy` — la rama fantasma `testing` no existe en ningún `platform.yml` real
