---
name: agteamos-implement
description: >
  Workflow para tareas con ticket existente (GitHub issue, PR, o Azure work item).
  Lee el ticket, valida que sea workable, crea branch, implementa con tests,
  documenta, hace E2E con evidencia y cierra la tarea. Usa carga perezosa de
  contexto por tiers (1/2/3) para no cargar toda la documentacion del proyecto
  en tareas simples.
used_by:
  - architect
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - devops-engineer
  - project-manager
---

# Workflow: Implement (Flow 3)

## CONTRACT

- **Input**: URL o ID de ticket (GitHub issue/PR o Azure DevOps work item) + PROJECT_CONTEXT.md
- **Output**: PR mergeado + ticket cerrado + documentacion de tarea archivada en `agteamos/changes/archive/<fecha>-<id>-<slug>/`
- **Trigger**: `agteamos-flow-router` detecta referencia a ticket existente en el input del usuario,
  o hand-off automatico desde el workflow `agteamos-new-task`

---

## TRACKER ADAPTER

Los comandos de tracker se resuelven vía `agteamos/tracker/<tracker>.md`
(generado por `agteamos-setup`) — nunca hardcodear `gh`/`az`. Los pasos que
interactúan con ticket o PR usan la sintaxis `[operación: <nombre>]`; la fila
correspondiente en el adapter (GitHub o Azure DevOps, según `tracker:` de
`agteamos/platform.yml`) resuelve el comando real.

## PRECONDITIONS

- El ticket existe y es accesible via MCP github o MCP azure-devops.
- `agteamos/architecture/PROJECT_CONTEXT.md` existe y esta actualizado.
- No existe un branch activo con el mismo ID de ticket (verificar antes de crear).

---

## CONTEXT TIERS — carga perezosa de contexto

Antes de cargar contexto de proyecto, determinar qué nivel corresponde. El
objetivo es no gastar tokens leyendo documentación completa en tareas simples,
sin perder profundidad cuando la tarea realmente la necesita.

| Tier | Contenido cargado | Tamaño aprox. | Cuándo se usa |
|------|-------------------|----------------|---------------|
| **Tier 1** | Solo `task.yml` + sección "Next Action" de `progress.md` (incluye el chequeo de handoff de persona — ver Step 1) | ~1KB | Retomar una sesión rápido tras un reset de contexto, o tareas `schema: lite` — es lo mínimo para saber "qué tarea es esta y qué sigue". |
| **Tier 2** (default) | Tier 1 + `agteamos/standards/<tema>/README.md` de los temas **resueltos vía `agteamos/standards/index.yml`** (ver mecanismo abajo — nunca indexando `domains:` directo contra carpetas de tema) + `agteamos/specs/<dominio>.md` del/los dominio(s) afectado(s) | variable, acotado a 1-2 dominios | La mayoría de las tareas `schema: full` de complejidad S/M — un solo dominio, sin necesidad de contexto arquitectónico completo. |
| **Tier 3** (completo) | Tier 2 + `agteamos/architecture/PROJECT_CONTEXT.md` y `ARCHITECTURE.md` completos + ADRs relacionados (`agteamos/architecture/adr/`) + `agteamos/decisions/decision-log.md` | completo | Tareas complejas (L/XL) o que cruzan 2+ dominios (`domains:` con 2+ entradas), o cuando Tier 2 no fue suficiente para tomar una decisión de diseño. |

**Regla de selección**: leer `task.yml` primero (siempre, es Tier 1). Si
`schema: lite` o se está retomando solo para ver "qué sigue", detenerse en
Tier 1. Si no, subir a Tier 2 por defecto. Subir a Tier 3 solo si `domains:`
tiene 2+ entradas, la complejidad estimada en `specs/design.md` es L/XL, o el
agente detecta que Tier 2 no alcanza para decidir el approach técnico.

Esta selección se aplica explícitamente en el Step 6 (análisis técnico) y
cada vez que se retoma la tarea en una sesión nueva (Step 1).

### `context_tier` se persiste — no se decide en runtime y se olvida

El tier aplicado **se escribe en `task.yml` → `context_tier: 1|2|3`** (ver
skill `agteamos-task-tracking` para el campo). No es una decisión efímera del
agente de turno:

- `agteamos-new-task` lo fija al crear la tarea, según `schema` y luego según
  la complejidad/dominios detectados en su Step 5 (valor por defecto: `lite`
  → `1`, `full` → `2`; sube a `3` si complejidad L/XL o 2+ dominios).
- `agteamos-implement` puede **elevarlo** (nunca bajarlo) en este mismo Step
  6 si, al analizar, descubre que la tarea es más compleja de lo previsto —
  por ejemplo Tier 2 no alcanzó para decidir el approach técnico. Al subirlo,
  dejar una fila en "Decisions Made" de `progress.md` con el motivo (ej.
  "context_tier 2→3: el approach requiere tocar un segundo dominio no
  detectado en el análisis inicial").
- Si `context_tier` ya está en `3` en `task.yml`, no hay nada que elevar —
  Tier 3 es el techo.

Esto es lo que hace la elección de tier **auditable entre sesiones**: un
agente que retoma la tarea en Tier 1 (Step 1) ve inmediatamente en qué tier
quedó sin tener que volver a analizarlo desde cero.

### Cómo se resuelve el standard aplicable en Tier 2/3 (mecanismo paso a paso)

`domains:` en `task.yml` son dominios de **negocio** (`notifications`,
`billing`) — las carpetas de `agteamos/standards/` son **temas de
ingeniería** (`api-design`, `security`, `testing`, `clean-architecture`, …).
No hay traducción directa entre uno y otro: indexar `domains:` contra
`standards/<tema>/` no resuelve nada. `agteamos/standards/index.yml` existe
exactamente para este mapeo (keyword → carpeta de tema) y es la única fuente
que se lee para esto:

1. **Reunir keywords** desde `task.yml`: `layer`, `type`, cada entrada de
   `domains:`, y palabras clave del título del ticket (Step 1) y de
   `specs/design.md` si ya existe (Step 6 lo escribe a continuación de este
   mismo paso, así que en la primera pasada puede no existir todavía — usar
   lo que haya).
2. **Leer `agteamos/standards/index.yml`** (mapa keyword → una o más carpetas
   de `standards/<tema>/`).
3. **Resolver cada keyword** contra las claves del índice (match
   case-insensitive; si el índice declara sinónimos, considerarlos también).
   Ej.: `layer: backend` + `type: feature` + `domains: [billing]` + título
   "Add rate limiting to checkout" podría resolver a `api-design`,
   `security` (rate limiting) y `database` (si el diseño toca schema).
4. **Cargar solo `agteamos/standards/<tema>/README.md` de los temas
   resueltos** — nunca los README de los 11 temas completos, y nunca
   `domains:` indexado directo contra un nombre de carpeta que coincida por
   casualidad.
5. **Si ninguna keyword resuelve ningún tema**, documentarlo explícitamente
   en `progress.md` ("Tier 2: sin standards resueltos vía index.yml para
   layer=X/domains=Y") en vez de omitir el paso en silencio — es una señal de
   que `index.yml` puede necesitar una entrada nueva, no de que no hacía
   falta cargar nada.

---

## PROCESS

### Step 1 — Leer el ticket

Si se está retomando una tarea existente tras un reset de contexto, cargar
primero **Tier 1** (`task.yml` + "Next Action" de `progress.md`) antes de
releer el ticket completo — evita releer todo el historial de la conversación
anterior.

**Sub-paso obligatorio al retomar (handoff de persona) — se ejecuta siempre
que Tier 1 se carga por un resume, no solo la primera vez que se crea la
tarea:**

1. Comparar `git config user.name` actual contra `task.yml → owner.name`.
2. Si coincide: no hay nada que hacer, continuar.
3. Si difiere: **no sobreescribir `owner`** — agregar una entrada nueva a
   `handoffs:` (mismo mecanismo que usa `agteamos-task-tracking` al crear la
   tarea): `{ name: "<git config user.name>", email: "<git config user.email>", date: <hoy> }`.
   `owner` sigue siendo siempre quien creó la tarea; `handoffs` es el
   historial de quién más la tocó.
4. **Fallback** si `git config user.name` está vacío o es un valor genérico
   (ej. "user", "admin", el hostname de la máquina): usar
   `git config user.email` como identificador. Si tampoco hay email
   configurado, preguntar una única vez quién está retomando la tarea y no
   repetir la pregunta en el resto de la sesión.

Este es el caso real de equipo — "Beto retoma mañana la tarea a medias de
Ana" — y es la única razón por la que `handoffs:` deja de estar vacío en la
práctica: sin este sub-paso, la detección solo ocurría al crear la carpeta y
nunca se volvía a chequear.

Usar el MCP correspondiente a la plataforma detectada por `agteamos-flow-router`:

`[operación: get-ticket]` (leer el ticket completo — issue de GitHub o work
item de Azure DevOps; el comando real se resuelve contra
`agteamos/tracker/<tracker de platform.yml>.md`, generado por
`agteamos-setup` — nunca hardcodear `gh`/`az`).

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

Validar que el ticket tiene la informacion minima para trabajar (ver skill
`agteamos-definition-of-ready`). Mostrar el resultado como tabla antes de
continuar:

| Campo | Requerido | Encontrado | Estado |
|-------|-----------|------------|--------|
| Titulo claro | SI | [valor] | ✅ / ❌ |
| Al menos 1 AC verificable | SI | [valor] | ✅ / ❌ |
| Tipo definido (feature/bug/etc) | SI | [valor] | ✅ / ❌ |
| Sin dependencia bloqueante | SI | [valor] | ✅ / ❌ |
| Testeable | SI | [valor] | ✅ / ❌ |

**Si pasa DoR** (todos los campos requeridos en ✅): continuar con Step 3.

**Si NO pasa DoR**: activar `agteamos-clarification-protocol` inmediatamente.

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

Aplicar criterio INVEST sobre el ticket ya validado (skill `agteamos-story-breakdown`):

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

Ver `agteamos-story-breakdown` skill para los patrones de split disponibles.

### Step 4 — task-tracking INIT

Crear la estructura de documentacion local de la tarea (skill `agteamos-task-tracking`
— mismo árbol que usan esa skill y `agteamos-new-task`; si vino de `agteamos-new-task`
la carpeta ya existe con id definitivo desde su Step 8, y este paso solo la completa):

```
agteamos/changes/<id>-<slug>/
├── task.yml                 ← metadatos estructurados
├── brief.md                 ← solo si schema: full y la tarea vino de agteamos-new-task
│                               (inmutable salvo su seccion "## Resolution notes")
├── progress.md              ← tracking principal (ex TASK-<id>.md)
├── report.html               ← generado/regenerado por agteamos-dashboard
├── verify-report.md          ← aparece recien en el cierre (Step 9) — no existe todavia
├── evidence/                ← screenshots QA obligatorios
└── specs/                   ← solo si schema: full
    ├── requirements.md      ← ACs del ticket (copiados o referenciados)
    ├── design.md            ← decision tecnica del @architect (Step 6)
    ├── tasks.md             ← checklist de @project-manager (Step 6)
    └── deltas/
        └── <dominio>.md     ← ADDED/MODIFIED/REMOVED contra agteamos/specs/<dominio>.md (Step 6)
```

**Crear `task.yml` inicial** (esquema completo — ver skill `agteamos-task-tracking`
para el detalle de captura automática de `owner`/`handoffs`; los valores de
`owner` de abajo son un **ejemplo de lo que la captura automática produce**,
nunca se deja en `null` — ejecutar `git config user.name` / `git config
user.email` en este mismo paso, sin preguntarle nada al usuario):
```yaml
id: "<id-del-ticket>"
title: "<titulo del ticket>"
type: feature              # feature | bug | hotfix | refactor | spike
schema: full                # full | lite — ver skill agteamos-sdd-protocol
context_tier: 2              # 1 | 2 | 3 — ver "CONTEXT TIERS" arriba. Si la tarea vino de
                             # agteamos-new-task ya trae este valor; si el ticket es externo
                             # (sin new-task previo), fijarlo aca segun la misma regla
                             # (schema lite→1, full→2, sube a 3 si L/XL o 2+ dominios)
layer: backend             # frontend | backend | fullstack | infra
priority: medium           # critical | high | medium | low
status: in_progress
branch: feature/<id>-<slug>
platform: github           # github | azure
ticket_url: <url completa del ticket>
domains: []                # dominios de spec afectados
doc_impact: true            # si false, agteamos-close-task salta el paso de docs
created: <fecha hoy YYYY-MM-DD>
updated: <fecha hoy YYYY-MM-DD>
owner:                     # capturado automaticamente via git config, NUNCA null, no preguntado
  name: "<git config user.name>"
  email: "<git config user.email>"
handoffs: []               # se llena via el sub-paso de Step 1 si otra persona retoma la tarea
assigned_to:
  - <agentes que intervienen>
depends_on: []
```

**Crear `progress.md` con template inicial:**
Ver skill `agteamos-task-tracking` para el template completo. La seccion
"Next Action" debe completarse inmediatamente con el primer paso a ejecutar
— es la base de Tier 1 cuando se retoma la tarea.

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

**Naming rules (del skill agteamos-story-breakdown):**
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

Antes de implementar, determinar el **context tier** aplicable (ver sección
arriba) y cargar solo lo necesario para este análisis — no releer todo
`PROJECT_CONTEXT.md`/ADRs si Tier 2 alcanza.

Completar los artefactos SDD requeridos por el `schema` de la tarea. Seguir
el skill `agteamos-sdd-protocol` para el formato y contenido de cada documento.

**Si `schema: full`, los 4 artefactos son obligatorios antes de iniciar la implementacion:**

1. `specs/requirements.md` — escrito o validado por @product-owner.
   Si vino del workflow `agteamos-new-task`, ya existe. Si vino de un ticket
   externo, @product-owner lo crea desde los ACs del ticket. No proceder sin
   este archivo.

2. `specs/design.md` — escrito por @architect con el enfoque tecnico completo.
   Ver formato completo abajo.

3. `specs/deltas/<dominio>.md` — escrito por @architect junto con design.md, uno
   por cada dominio en `domains:`. Registra ADDED/MODIFIED/REMOVED contra la
   spec maestra `agteamos/specs/<dominio>.md` — se aplica en el paso "sync" de
   `agteamos-close-task`, no durante la implementacion.

4. `specs/tasks.md` — escrito por @project-manager con el checklist de
   implementacion desglosado por capa y agente responsable.

**Si `schema: lite`**: solo un resumen de 1 párrafo en `progress.md` y un test
de regresión — no se crean los 4 artefactos de `specs/`. Ver skill
`agteamos-sdd-protocol`.

**SDD Checklist de aprobacion (schema full):**
- [ ] requirements.md revisado y aprobado por el usuario
- [ ] design.md escrito por @architect y aprobado por el usuario
- [ ] specs/deltas/<dominio>.md escrito por @architect por cada dominio afectado (ADDED/MODIFIED/REMOVED, o "Sin cambios en la spec maestra")
- [ ] tasks.md creado por @project-manager con checklist completo
- [ ] Ningun engineer empieza a codificar hasta que los artefactos requeridos por el schema esten listos

El @architect determina el enfoque exacto para design.md:

1. Leer `agteamos/architecture/PROJECT_CONTEXT.md` (Tier 2/3 según corresponda)
   para entender el stack, los patrones arquitectonicos y las convenciones
   del proyecto.
2. Leer los archivos relevantes del proyecto (componentes existentes,
   servicios relacionados, tests existentes como referencia de estilo).
3. Determinar exactamente que archivos se crean y cuales se modifican.
4. Definir el approach tecnico completo.

Escribir `agteamos/changes/<id>-<slug>/specs/design.md`:

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
Documentar en `progress.md` a medida que se avanza — no al final.

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
Documentar cada test en la tabla "Unit Tests Written" de `progress.md`.

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

Documentar cada componente creado en "Files Modified" de `progress.md`.

#### SECURITY (siempre — sin excepcion)

`@security-engineer` ejecuta analisis STRIDE sobre la nueva superficie:

- **S**poofing: ¿Se puede suplantar identidad en el nuevo flujo?
- **T**ampering: ¿Los datos en transito estan protegidos?
- **R**epudiation: ¿Hay logs de auditoria donde aplique?
- **I**nformation Disclosure: ¿Se exponen datos sensibles en errores o logs?
- **D**enial of Service: ¿Hay rate limiting donde aplique?
- **E**levation of Privilege: ¿Se validan permisos en cada endpoint nuevo?

Si la feature involucra autenticacion, sesiones o datos de usuarios:
revisar OWASP Top 10 items relevantes (skill `agteamos-asvs-checklist`).

### Step 8 — @qa-engineer: E2E con evidencia obligatoria

El QA engineer ejecuta tests E2E con Playwright cubriendo todos los ACs
del ticket. Screenshots son **obligatorios** en cada paso critico.

**Patron de screenshot obligatorio:**

```typescript
// Playwright — guardar en la carpeta evidence de la tarea
await page.screenshot({
  path: `agteamos/changes/${id}-${slug}/evidence/${stepName}.png`,
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
  path: `agteamos/changes/${id}-${slug}/evidence/a11y-audit.png`,
  fullPage: true
});
```

Documentar cada screenshot en la tabla "Evidence (QA Screenshots)" de `progress.md`.
Si un test falla, capturar screenshot del estado de fallo con nombre descriptivo
(ej: `e2e-error-invalid-email.png`).

### Step 9 — agteamos-close-task

Con todos los tests pasando y la evidencia capturada, ejecutar el skill
`agteamos-close-task` completo (incluye el paso `verify` con `verify-report.md`
antes de mergear, y el archivado después del merge — ver esa skill para el
detalle):

1. Verificar que todos los ACs estan cubiertos y marcados en `progress.md`.
2. Crear PR con referencia al ticket (keyword `Closes #<id>` o `Fixes AB#<id>`).
3. QA aprueba el PR con comentario de evidencia.
4. Verify: generar `verify-report.md` (bloquea el cierre si hay FAIL).
5. Merge PR (squash merge + delete branch).
6. Verificar cierre automatico del ticket.
7. Actualizar `agteamos/` si hubo cambios arquitectonicos y `doc_impact: true`.
8. Sync: aplicar `specs/deltas/<dominio>.md` sobre `agteamos/specs/<dominio>.md`.
9. Archivar tarea: mover `agteamos/changes/<id>-<slug>/` a `agteamos/changes/archive/<fecha>-<id>-<slug>/`.

---

## YAML FILES

Durante el workflow se gestionan los siguientes archivos YAML:

**`task.yml`** — metadatos de la tarea, actualizado en cada cambio de estado.
Ver Step 4 para el schema completo.

**`openapi.yml`** — si se agregaron o modificaron endpoints de la API,
actualizar `agteamos/api/openapi.yml` con los nuevos paths, schemas y
ejemplos. Hacerlo en Step 9 (`agteamos-close-task`), despues de que el PR
este mergeado.

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
```
[operación: get-ticket] → id 15 (comando real resuelto contra
agteamos/tracker/<tracker de platform.yml>.md)
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
agteamos/changes/15-user-profile-page/
├── task.yml              (context_tier: 2, owner capturado via git config)
├── progress.md
├── evidence/
└── specs/
    └── design.md          (se completa en Step 6)
```

**Step 5 — Branch:**
```bash
git checkout main && git pull
git checkout -b feature/15-user-profile-page
```

**Step 6 — @architect design.md (Tier 2, un solo dominio):**
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
    path: 'agteamos/changes/15-user-profile-page/evidence/01-profile-view.png',
    fullPage: true
  });
  expect(page.locator('[data-testid="profile-name"]')).toBeVisible();
});

test('user can edit and save profile', async ({ page }) => {
  // ... fill form
  await page.screenshot({
    path: 'agteamos/changes/15-user-profile-page/evidence/02-edit-form.png',
    fullPage: true
  });
  await page.click('[data-testid="save-button"]');
  await page.screenshot({
    path: 'agteamos/changes/15-user-profile-page/evidence/03-save-success.png',
    fullPage: true
  });
});
```

**Step 9 — agteamos-close-task:**
```
[operación: create-pr] (título + "Closes #15"; comando real resuelto contra
agteamos/tracker/<tracker de platform.yml>.md)
# → PR #87 created

# ... verify-report.md generado, sin FAIL ...

[operación: merge-pr] (squash + delete branch — ver skill agteamos-close-task
Step 6 para la nota sobre merge-to-protected-branch si branch_strategy: personal)
# → Issue #15 auto-closed via "Closes #15"

mv agteamos/changes/15-user-profile-page/ \
   agteamos/changes/archive/2026-08-09-15-user-profile-page/
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

- **No dejar "Next Action" vacio en `progress.md`** — si los tokens se agotan
  a mitad de la implementacion, el siguiente agente necesita saber exactamente
  donde retomar (es la base de Tier 1).

- **No saltarse el DoR check** — aunque el ticket parezca completo, la tabla
  de validacion debe mostrarse siempre antes de continuar.

- **No activar @ui-ux-designer ni @security-engineer en paralelo con la
  implementacion** — diseno debe aprobarse antes de codificar, y seguridad
  debe auditarse despues de que el codigo existe.

- **No cargar Tier 3 por defecto** — leer PROJECT_CONTEXT.md completo, todos
  los ADRs y el decision-log en cada tarea simple desperdicia contexto; usar
  Tier 2 salvo que la tarea realmente cruce dominios o sea L/XL.

- **No indexar `domains:` directo contra carpetas de `agteamos/standards/`** —
  son dos taxonomías distintas (negocio vs. temas de ingeniería). Resolver
  siempre vía `agteamos/standards/index.yml` (ver mecanismo en "CONTEXT
  TIERS").

- **No dejar `context_tier` sin escribir en `task.yml`** — si la elección
  vive solo en el razonamiento de la sesión actual, la próxima sesión no
  puede auditarla ni retomarla donde quedó. Se escribe siempre, y solo sube.

- **No dejar `owner: {name: null, email: null}` en `task.yml`** — la captura
  vía `git config` ocurre en el mismo Step 4 en el que se crea el archivo;
  un `task.yml` con owner en `null` significa que este paso no se ejecutó.

- **No saltarse el sub-paso de handoff al retomar (Step 1)** — comparar
  `git config user.name` contra `owner.name` cada vez que se carga Tier 1,
  no solo la primera vez que se crea la tarea. Es la única forma en que
  `handoffs:` refleja la realidad de un equipo donde varias personas tocan
  la misma tarea en sesiones distintas.
