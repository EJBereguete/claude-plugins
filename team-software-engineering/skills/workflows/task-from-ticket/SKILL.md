---
name: task-from-ticket
description: >
  Workflow para tareas con ticket existente (GitHub issue, PR, o Azure work item).
  Lee el ticket, valida que sea workable, crea branch, implementa con tests,
  documenta, hace E2E con evidencia y cierra la tarea.
used_by:
  - architect
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - devops-engineer
  - project-manager
---

# Workflow: Task From Ticket (Flow 3)

## CONTRACT

- **Input**: URL o ID de ticket (GitHub issue/PR o Azure DevOps work item) + PROJECT_CONTEXT.md
- **Output**: PR mergeado + ticket cerrado + documentacion de tarea archivada en `/docs/tasks/completed/`
- **Trigger**: `flow-router` detecta referencia a ticket existente en el input del usuario,
  o hand-off automatico desde el workflow `new-task`

---

## PRECONDITIONS

- El ticket existe y es accesible via MCP github o MCP azure-devops.
- `/docs/01-architecture/PROJECT_CONTEXT.md` existe y esta actualizado.
- No existe un branch activo con el mismo ID de ticket (verificar antes de crear).

---

## PROCESS

### Step 1 — Leer el ticket

Usar el MCP correspondiente a la plataforma detectada por `flow-router`:

**GitHub:**
```bash
gh issue view <number>
# o via MCP github: get_issue
```

**Azure DevOps:**
```
# Via MCP azure-devops: leer work item por ID
```

Extraer y registrar los siguientes campos:

| Campo | Extraido de |
|-------|------------|
| Titulo | title del issue/work item |
| Descripcion | body / description |
| Acceptance Criteria | body (buscar seccion "## Acceptance Criteria") |
| Labels / Tags | labels del issue o tags del work item |
| Assignees | usuarios asignados |
| Milestone / Sprint | milestone de GitHub o sprint de Azure |
| Dependencias | linked issues, "depends on", "blocked by" |

Si el ticket es un PR en lugar de un issue, leer la descripcion y el
diff para entender que cambios existen y donde continuar.

### Step 2 — definition-of-ready check

Validar que el ticket tiene la informacion minima para trabajar.
Mostrar el resultado como tabla antes de continuar:

| Campo | Requerido | Encontrado | Estado |
|-------|-----------|------------|--------|
| Titulo claro | SI | [valor] | ✅ / ❌ |
| Al menos 1 AC verificable | SI | [valor] | ✅ / ❌ |
| Tipo definido (feature/bug/etc) | SI | [valor] | ✅ / ❌ |
| Sin dependencia bloqueante | SI | [valor] | ✅ / ❌ |
| Testeable | SI | [valor] | ✅ / ❌ |

**Si pasa DoR** (todos los campos requeridos en ✅): continuar con Step 3.

**Si NO pasa DoR**: activar `clarification-protocol` inmediatamente.

```
Ejemplo de ticket que no pasa:
  Titulo: "Fix login"
  Descripcion: "Login is broken"
  → Falta AC, tipo, y descripcion clara

Respuesta del agente:
  "El ticket #42 no tiene suficiente informacion para trabajar.
   Necesito que me aclares:
   1. ¿Que error exacto ves? (screenshot o stack trace si es posible)
   2. ¿Que deberia pasar al hacer login correctamente?
   3. ¿Es un bug (funcionaba antes) o una mejora?"
```

No proceder a Step 3 hasta que el ticket pase DoR.

### Step 3 — story-breakdown

Aplicar criterio INVEST sobre el ticket ya validado:

```
¿Toca 3+ capas arquitectonicas?
  SI → Dividir por capa, crear sub-issues

¿Tiene mas de 5 ACs?
  SI → Evaluar split por funcionalidad

¿Estimado es XL (> 5 story points)?
  SI → Dividir obligatoriamente

¿Requiere investigacion tecnica previa?
  SI → Crear ticket spike separado, este ticket depende de el
```

Si se divide, cada sub-issue recibe:
- Su propio branch (`feature/<parent-id>/<sub-id>-<description>`)
- Sus propios ACs (subset del ticket original)
- Su propia entrada en `task.yml` bajo `depends_on`

Ver `story-breakdown` skill para los patrones de split disponibles.

### Step 4 — task-tracking INIT

Crear la estructura de documentacion local de la tarea:

```
/docs/tasks/active/TASK-<id>-<slug>/
├── TASK-<id>-<slug>.md     ← tracking principal
├── task.yml                ← metadatos estructurados
├── evidence/               ← screenshots QA obligatorios
└── specs/
    ├── requirements.md     ← ACs del ticket (copiados o referenciados)
    └── design.md           ← decision tecnica del @architect (Step 6)
```

**Crear `task.yml` inicial:**
```yaml
id: "<id-del-ticket>"
title: "<titulo del ticket>"
type: feature              # feature | bug | hotfix | refactor | spike
layer: backend             # frontend | backend | fullstack | infra
priority: medium           # critical | high | medium | low
branch: feature/<id>-<slug>
platform: github           # github | azure
ticket_url: <url completa del ticket>
created: <fecha hoy YYYY-MM-DD>
status: in_progress
assigned_to:
  - <agentes que intervienen>
depends_on: []
```

**Crear `TASK-<id>-<slug>.md` con template inicial:**
Ver skill `task-tracking` para el template completo. La seccion
"Next Action" debe completarse inmediatamente con el primer paso a ejecutar.

### Step 5 — Creacion de branch

Crear el branch desde la rama base correcta segun el proyecto:

```bash
# Personal project (feature/* → main)
git checkout main && git pull
git checkout -b feature/<id>-<slug>

# Team project (feature/* → develop)
git checkout develop && git pull
git checkout -b feature/<id>-<slug>
```

**Naming rules (del skill story-breakdown):**
```
Feature:    feature/<id>-<description>
Bug fix:    bugfix/<id>-<description>
Hotfix:     hotfix/<id>-<description>
Refactor:   refactor/<id>-<description>
Spike:      spike/<id>-<description>
Subtarea:   feature/<parent-id>/<sub-id>-<description>
```

Reglas:
- Minusculas siempre
- Palabras separadas con guiones
- Incluir ID para trazabilidad
- Descripcion max 60 caracteres

Actualizar `task.yml` con el nombre de branch definitivo.

### Step 6 — @architect: Analisis tecnico y artefactos SDD

Antes de implementar, completar los 3 artefactos SDD requeridos. Seguir el
skill `sdd-protocol` para el formato y contenido de cada documento.

**Los 3 artefactos son obligatorios antes de iniciar la implementacion:**

1. `specs/requirements.md` — escrito o validado por @product-owner.
   Si vino del workflow `new-task`, ya existe. Si vino de un ticket externo,
   @product-owner lo crea desde los ACs del ticket. No proceder sin este archivo.

2. `specs/design.md` — escrito por @architect con el enfoque tecnico completo.
   Ver formato completo abajo.

3. `specs/tasks.md` — escrito por @project-manager con el checklist de
   implementacion desglosado por capa y agente responsable.

**SDD Checklist de aprobacion:**
- [ ] requirements.md revisado y aprobado por el usuario
- [ ] design.md escrito por @architect y aprobado por el usuario
- [ ] tasks.md creado por @project-manager con checklist completo
- [ ] Ningun engineer empieza a codificar hasta que los 3 artefactos esten listos

El @architect determina el enfoque exacto para design.md:

1. Leer `/docs/01-architecture/PROJECT_CONTEXT.md` para entender el stack,
   los patrones arquitectonicos y las convenciones del proyecto.
2. Leer los archivos relevantes del proyecto (componentes existentes,
   servicios relacionados, tests existentes como referencia de estilo).
3. Determinar exactamente que archivos se crean y cuales se modifican.
4. Definir el approach tecnico completo.

Escribir `/docs/tasks/active/TASK-<id>-<slug>/specs/design.md`:

```markdown
# Technical Design: TASK-<id>

## Approach
[Descripcion del enfoque tecnico elegido y por que]

## Files to Create
| File | Description |
|------|-------------|
| src/notifications/service.py | NotificationService class |

## Files to Modify
| File | What changes |
|------|-------------|
| src/core/dependencies.py | Inject NotificationService |

## Database Changes
[Migraciones necesarias, si aplica]

## API Changes
[Nuevos endpoints o cambios a existentes, si aplica]

## Environment Variables
[Nuevas variables de entorno requeridas]

## Security Considerations
[Superficie nueva, datos sensibles, auth required]
```

### Step 7 — Implementacion por capas

Cada engineer MUST check `specs/requirements.md` before writing code.
Implementation MUST NOT deviate from `specs/design.md` — if deviation is needed,
update design.md first (with architect approval), then implement.

Implementar siguiendo las convenciones del proyecto detectadas en Step 6.
Documentar en `TASK-<id>.md` a medida que se avanza — no al final.

#### BACKEND (si la capa backend esta impactada)

`@backend-engineer` implementa siguiendo los patrones del proyecto:

- Funciones pequeñas con responsabilidad unica (max ~40 lineas)
- Sin logica de negocio en routers/controllers — delegar a servicios
- Manejo explicito de errores (HTTPException, Result types)
- Sin secrets hardcodeados — variables de entorno para todo

**Unit tests OBLIGATORIOS** — minimo 3 por cada pieza funcional:

```python
# test_notification_service.py

def test_send_welcome_email_success(mock_sendgrid):
    """Happy path: email sent correctly."""
    ...

def test_send_email_invalid_recipient_raises_error(mock_sendgrid):
    """Error case: invalid email raises ValueError."""
    ...

def test_send_email_rate_limit_enforced(mock_sendgrid, mock_cache):
    """Edge case: >10 emails/min/user raises RateLimitError."""
    ...
```

Tests deben **pasar** antes de marcar el step como completado.
Documentar cada test en la tabla "Unit Tests Written" del TASK file.

#### FRONTEND (si la capa frontend esta impactada)

`@frontend-engineer` implementa siguiendo los patrones del proyecto:

- TypeScript siempre — no `any`
- Interfaces explicitas para todos los tipos de datos
- Async/await sobre `.then()`
- Manejo de errores siempre presente en llamadas a la API

**Component tests OBLIGATORIOS:**

```typescript
// NotificationBadge.test.tsx

test('renders unread count when notifications exist', async () => {
  // Happy path
})

test('renders nothing when count is zero', () => {
  // Edge case
})

test('shows error state when API call fails', async () => {
  // Error case
})
```

Documentar cada componente creado en "Files Modified" del TASK file.

#### SECURITY (siempre — sin excepcion)

`@security-engineer` ejecuta analisis STRIDE sobre la nueva superficie:

- **S**poofing: ¿Se puede suplantar identidad en el nuevo flujo?
- **T**ampering: ¿Los datos en transito estan protegidos?
- **R**epudiation: ¿Hay logs de auditoria donde aplique?
- **I**nformation Disclosure: ¿Se exponen datos sensibles en errores o logs?
- **D**enial of Service: ¿Hay rate limiting donde aplique?
- **E**levation of Privilege: ¿Se validan permisos en cada endpoint nuevo?

Si la feature involucra autenticacion, sesiones o datos de usuarios:
revisar OWASP Top 10 items relevantes.

### Step 8 — @qa-engineer: E2E con evidencia obligatoria

El QA engineer ejecuta tests E2E con Playwright cubriendo todos los ACs
del ticket. Screenshots son **obligatorios** en cada paso critico.

**Patron de screenshot obligatorio:**

```typescript
// Playwright — guardar en la carpeta evidence de la tarea
await page.screenshot({
  path: `docs/tasks/active/TASK-${id}-${slug}/evidence/${stepName}.png`,
  fullPage: true
});
```

**Steps de E2E a cubrir:**
- Estado inicial (antes de la accion)
- Durante la accion (formulario rellenado, loading state si aplica)
- Estado de exito (resultado esperado)
- Estado de error (si hay un AC de error)

**Accessibility audit si hay cambios de UI:**
```typescript
// axe-core via @axe-core/playwright
const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
expect(accessibilityScanResults.violations).toEqual([]);
await page.screenshot({
  path: `docs/tasks/active/TASK-${id}-${slug}/evidence/a11y-audit.png`,
  fullPage: true
});
```

Documentar cada screenshot en la tabla "Evidence (QA Screenshots)" del TASK file.
Si un test falla, capturar screenshot del estado de fallo con nombre descriptivo
(ej: `e2e-error-invalid-email.png`).

### Step 9 — task-closure

Con todos los tests pasando y la evidencia capturada, ejecutar el skill
`task-closure` completo:

1. Verificar que todos los ACs estan cubiertos y marcados en el TASK file.
2. Crear PR con referencia al ticket (keyword `Closes #<id>` o `Fixes AB#<id>`).
3. QA aprueba el PR con comentario de evidencia.
4. Merge PR (squash merge + delete branch).
5. Verificar cierre automatico del ticket.
6. Actualizar `/docs` si hubo cambios arquitectonicos (PROJECT_CONTEXT, openapi.yml, ADRs).
7. Archivar tarea: mover `/docs/tasks/active/TASK-<id>/` a `/docs/tasks/completed/`.

---

## YAML FILES

Durante el workflow se gestionan los siguientes archivos YAML:

**`task.yml`** — metadatos de la tarea, actualizado en cada cambio de estado.
Ver Step 4 para el schema completo.

**`openapi.yml`** — si se agregaron o modificaron endpoints de la API,
actualizar `/docs/02-api/openapi.yml` con los nuevos paths, schemas y
ejemplos. Hacerlo en Step 9 (task-closure), despues de que el PR este mergeado.

**`.github/workflows/ci.yml`** — si la feature requiere nuevas variables
de entorno en CI, o si se agrego una nueva suite de tests que debe correr
en el pipeline, actualizar el workflow. Coordinar con `@devops-engineer`.

---

## EXAMPLE: Walkthrough completo

**Input del usuario:**
```
https://github.com/user/repo/issues/15
```

**Step 1 — Leer ticket:**
```bash
gh issue view 15
# Titulo: "Add user profile page"
# Description: Users need to see and edit their profile information.
# Acceptance Criteria:
#   - Given a logged-in user, When they visit /profile, Then they see their info
#   - Given a logged-in user, When they edit and save, Then changes persist
#   - Given a user with invalid email format, When they save, Then they see error
# Labels: feature, frontend, backend
# Milestone: v1.2
```

**Step 2 — DoR check:**

| Campo | Requerido | Encontrado | Estado |
|-------|-----------|------------|--------|
| Titulo claro | SI | "Add user profile page" | ✅ |
| Al menos 1 AC | SI | 3 ACs en Given/When/Then | ✅ |
| Tipo definido | SI | label "feature" | ✅ |
| Sin bloqueante | SI | no linked dependencies | ✅ |
| Testeable | SI | ACs son verificables | ✅ |

→ READY. Continuar.

**Ejemplo alternativo — DoR FALLA:**
```
Titulo: "Fix profile"
Descripcion: "Profile page is broken"
→ NOT READY.

Agente activa clarification-protocol:
"El ticket #15 dice 'Fix profile'. Necesito mas contexto:
1. ¿Que parte del perfil esta rota? (foto, datos, formulario de edicion)
2. ¿Que error exacto ves? (screenshot o mensaje de error)
3. ¿Funcionaba antes? ¿Desde cuando falla?"
```

**Step 3 — story-breakdown:**
```
Capas: FE (profile page) + BE (PATCH /users/me endpoint) → 2 capas → M → no dividir
Branch: feature/15-user-profile-page
```

**Step 4 — task-tracking INIT:**
```
/docs/tasks/active/TASK-15-user-profile-page/
├── TASK-15-user-profile-page.md
├── task.yml
├── evidence/
└── specs/
    └── design.md
```

**Step 5 — Branch:**
```bash
git checkout main && git pull
git checkout -b feature/15-user-profile-page
```

**Step 6 — @architect design.md:**
```markdown
## Files to Create
- frontend/src/pages/ProfilePage.tsx
- frontend/src/components/ProfileForm.tsx
- backend/src/users/schemas.py (UpdateUserRequest)

## Files to Modify
- backend/src/users/router.py (add PATCH /users/me)
- backend/src/users/service.py (add update_user method)

## API Changes
- PATCH /api/users/me — body: {name, email, avatar_url}
```

**Step 7 — Implementacion:**
```
@backend-engineer: PATCH /api/users/me + update_user service + 3 unit tests
@frontend-engineer: ProfilePage + ProfileForm + 3 component tests
@security-engineer: STRIDE — confirmar que PATCH solo permite al usuario propio
```

**Step 8 — QA E2E:**
```typescript
// e2e/profile.spec.ts
test('user can view profile', async ({ page }) => {
  await page.goto('/profile');
  await page.screenshot({
    path: 'docs/tasks/active/TASK-15-user-profile-page/evidence/01-profile-view.png',
    fullPage: true
  });
  expect(page.locator('[data-testid="profile-name"]')).toBeVisible();
});

test('user can edit and save profile', async ({ page }) => {
  // ... fill form
  await page.screenshot({
    path: 'docs/tasks/active/TASK-15-user-profile-page/evidence/02-edit-form.png',
    fullPage: true
  });
  await page.click('[data-testid="save-button"]');
  await page.screenshot({
    path: 'docs/tasks/active/TASK-15-user-profile-page/evidence/03-save-success.png',
    fullPage: true
  });
});
```

**Step 9 — task-closure:**
```bash
gh pr create \
  --title "feat(profile): add user profile page" \
  --body "Closes #15"
# → PR #87 created

gh pr merge 87 --squash --delete-branch
# → Issue #15 auto-closed via "Closes #15"

mv docs/tasks/active/TASK-15-user-profile-page/ \
   docs/tasks/completed/TASK-15-user-profile-page/
```

---

## ANTI-PATTERNS

- **No empezar implementacion sin design.md** — el @architect debe validar
  el enfoque tecnico antes de que cualquier ingeniero escriba codigo.

- **No omitir unit tests por "es un cambio simple"** — todo cambio funcional
  tiene minimo 3 tests: happy path, error case, edge case.

- **No capturar screenshots genericos** — cada screenshot debe mostrar un
  estado especifico del E2E (inicial, exito, error), nombrado descriptivamente.

- **No cerrar el ticket manualmente sin el PR** — el cierre debe ser via
  keyword `Closes #<id>` en el PR para mantener trazabilidad.

- **No dejar "Next Action" vacio en el TASK file** — si los tokens se agotan
  a mitad de la implementacion, el siguiente agente necesita saber exactamente
  donde retomar.

- **No saltarse el DoR check** — aunque el ticket parezca completo, la tabla
  de validacion debe mostrarse siempre antes de continuar.

- **No activar @ui-ux-designer ni @security-engineer en paralelo con la
  implementacion** — diseno debe aprobarse antes de codificar, y seguridad
  debe auditarse despues de que el codigo existe.
