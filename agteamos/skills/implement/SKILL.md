---
name: agteamos-implement
description: >
  Workflow para tareas con ticket existente (GitHub issue, PR, o Azure work item).
  Lee el ticket, valida que sea workable, crea branch, implementa con tests,
  documenta, hace E2E con evidencia y cierra la tarea. Usa carga perezosa de
  contexto por tiers (1/2/3) para no cargar toda la documentacion del proyecto
  en tareas simples. Esta mega-skill cubre el Flujo 3 de punta a punta: incluye
  como fases inline definition-of-ready (Step 2, valida que el ticket sea
  workable), task-tracking (Step 4, estructura de agteamos/changes/<id>-<slug>/,
  task.yml, progress.md, checkpoints y captura automatica de owner) y
  task-closure (Step 9, PR, verify-report.md, merge, sync de specs, archivado
  y regeneracion de dashboard) — no son sub-skills separadas, son fases del
  mismo flujo continuo desde "leer ticket" hasta "tarea archivada".
used_by:
  - architect
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - devops-engineer
  - product-manager
  - security-engineer
---

# Workflow: Implement (Flow 3)

## CONTRACT

- **Input**: URL o ID de ticket (GitHub issue/PR o Azure DevOps work item) + PROJECT_CONTEXT.md
- **Output**: PR mergeado + ticket cerrado + documentacion de tarea archivada en `agteamos/changes/archive/<fecha>-<id>-<slug>/`
- **Trigger**: `agteamos-router` detecta referencia a ticket existente en el input del usuario,
  o hand-off automatico desde el workflow `agteamos-new-task`
- **Fases inline de este flujo** (antes skills separadas, ahora Steps de esta
  misma skill): **definition-of-ready** (Step 2 — READY / NOT READY antes de
  seguir), **task-tracking** (Step 4 — creacion y mantenimiento de
  `agteamos/changes/<id>-<slug>/`) y **task-closure** (Step 9 — checklist de
  cierre completo de 12 puntos, PR → QA → verify → merge → sync → archivado).

---

## TRACKER ADAPTER

Los comandos de tracker se resuelven vía `agteamos/tracker/<tracker>.md`
(generado por `agteamos-setup`) — nunca hardcodear `gh`/`az`. Los pasos que
interactúan con ticket o PR usan la sintaxis `[operación: <nombre>]`; la fila
correspondiente en el adapter (GitHub o Azure DevOps, según `tracker:` de
`agteamos/platform.yml`) resuelve el comando real. Esto aplica tanto a los
Steps de implementacion (1-8.5) como al checklist de cierre completo del
Step 9.

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
Step 4 para el detalle del campo). No es una decisión efímera del agente de
turno:

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
   `handoffs:` (mismo mecanismo descrito en Step 4): `{ name: "<git config user.name>", email: "<git config user.email>", date: <hoy> }`.
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

Usar el MCP correspondiente a la plataforma detectada por `agteamos-router`:

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

### Step 2 — Definition of Ready (DoR) check

Validar que el ticket tiene la informacion minima para trabajar antes de
seguir. Esta fase corresponde a lo que antes era la skill separada
`agteamos-implement` — ahora vive aca, inline, como Step 2 del
mismo flujo.

**Contrato de esta fase**: Input = ticket de GitHub o Azure DevOps ya leido
en Step 1. Output = READY (proceder a Step 3) o NOT READY (activar
`agteamos-new-task`).

#### Checklist de readiness

Un ticket esta READY si cumple al menos 5 de 7:

| # | Criterio | Obligatorio | Descripcion |
|---|----------|-------------|-------------|
| 1 | **Descripcion clara** | SI | El problema o feature esta bien definido, no ambiguo |
| 2 | **Acceptance Criteria** | SI | Al menos 2 ACs verificables en formato Given/When/Then |
| 3 | **Tipo definido** | SI | Es feature, bug, hotfix, refactor, o tech debt |
| 4 | **Prioridad asignada** | NO | P0/P1/P2/P3 o equivalente |
| 5 | **Estimable** | NO | El equipo puede asignar talla (S/M/L/XL) |
| 6 | **Independiente** | SI | No esta bloqueado por otro ticket abierto |
| 7 | **Testeable** | SI | Hay forma clara de verificar que el trabajo esta completo |

Mostrar el resultado como tabla resumida antes de continuar:

| Campo | Requerido | Encontrado | Estado |
|-------|-----------|------------|--------|
| Titulo claro | SI | [valor] | ✅ / ❌ |
| Al menos 1 AC verificable | SI | [valor] | ✅ / ❌ |
| Tipo definido (feature/bug/etc) | SI | [valor] | ✅ / ❌ |
| Sin dependencia bloqueante | SI | [valor] | ✅ / ❌ |
| Testeable | SI | [valor] | ✅ / ❌ |

#### Proceso de validacion

```
Leer ticket completo (titulo + descripcion + comments + labels)
    ↓
¿Tiene descripcion clara?
  NO → Preguntar al usuario que quiere exactamente
    ↓
¿Tiene ACs verificables?
  NO → Proponer ACs basados en la descripcion y pedir confirmacion
    ↓
¿Tipo definido?
  NO → Inferir del contexto (bug si menciona error, feature si es nuevo)
    ↓
¿Es independiente?
  NO → Alertar: "Este ticket depende de #X que aun esta abierto"
    ↓
¿Es testeable?
  NO → Definir criterio de verificacion con el usuario
    ↓
READY → Proceder con Step 3 (story-breakdown)
```

**Si pasa DoR** (todos los campos requeridos en ✅): continuar con Step 3.

**Si NO pasa DoR**: activar `agteamos-new-task` inmediatamente.
No proceder a Step 3 hasta que el ticket pase DoR.

#### Ejemplo: ticket que PASA DoR

```
Title: Add JWT refresh token rotation
Type: Feature
Priority: P1

Description:
Currently tokens expire and users must re-login. Implement automatic
token refresh using rotation pattern.

Acceptance Criteria:
- Given a user with an expired access token and valid refresh token,
  When they make an API request,
  Then a new access/refresh token pair is issued automatically
- Given a user with a revoked refresh token,
  When they attempt to refresh,
  Then they receive 401 and must re-login
- Given a refresh token that has been used before (replay),
  When it's presented for refresh,
  Then ALL tokens for that user are invalidated (security measure)

Labels: feature, auth, backend
```

→ READY. Continuar.

#### Ejemplo: ticket que NO PASA DoR

```
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

```
Title: Fix login
Description: Login is broken

→ NOT READY. Falta:
  - ¿Que esta roto exactamente? ¿Error? ¿Lentitud? ¿UX?
  - ¿Desde cuando? ¿Funciona en staging?
  - Sin ACs verificables
  - Sin tipo (¿es bug? ¿es mejora?)

→ Activar agteamos-new-task:
  "El ticket #42 dice 'Fix login'. Necesito mas contexto:
  1. ¿Que error exacto ves? (screenshot o stack trace si es posible)
  2. ¿Esto funcionaba antes? ¿Desde cuando falla?
  3. ¿Afecta a todos los usuarios o solo a algunos?"
```

#### Template para completar tickets incompletos

Cuando el ticket no pasa DoR, el agente puede proponer ACs:

```
"Basandome en la descripcion del ticket, propongo estos Acceptance Criteria:

- [ ] Given usuario con credenciales validas, When hace login, Then recibe token y es redirigido al dashboard
- [ ] Given usuario con password incorrecto, When hace login, Then recibe error 401 con mensaje claro
- [ ] Given usuario inexistente, When hace login, Then recibe error 404

¿Estan correctos? ¿Agrego o modifico alguno?"
```

### Step 3 — story-breakdown

Aplicar criterio INVEST sobre el ticket ya validado (skill `agteamos-new-task`):

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

Ver `agteamos-new-task` skill para los patrones de split disponibles.

### Step 4 — Task Tracking INIT

Crear y mantener la documentacion local de la tarea en `agteamos/changes/`.
Esta fase corresponde a lo que antes era la skill separada
`agteamos-implement` — ahora vive aca, inline, como Step 4 del mismo
flujo (mismo árbol que usa `agteamos-new-task`; si vino de `agteamos-new-task`
la carpeta ya existe con id definitivo desde su Step 8, y este paso solo la
completa).

**Contrato de esta fase**: Input = ticket validado (DoR passed en Step 2) +
branch a crear (Step 5). Output = `agteamos/changes/<id>-<slug>/` con
tracking completo. **Regla**: cada step completado se documenta
inmediatamente — no al final.

#### Estructura de carpeta por tarea

Árbol canónico — el mismo que usan `agteamos-new-task` y este workflow para
crear y referenciar esta carpeta. Si alguna otra skill muestra un árbol
distinto, es una divergencia a corregir, no una variante válida.

```
agteamos/changes/<id>-<slug>/
├── task.yml                 ← metadatos estructurados (ver mas abajo)
├── brief.md                 ← input original del usuario, problema, solucion
│                                propuesta y out-of-scope ORIGINAL. Inmutable salvo
│                                su seccion "## Resolution notes" (append-only).
│                                Solo si schema: full y la tarea vino de
│                                agteamos-new-task (lo crea esa skill en su Step 3).
│                                Con schema: lite no se crea (el resumen de 1
│                                parrafo vive en progress.md — ver agteamos-sdd-protocol)
├── progress.md               ← tracking principal (ex TASK-<id>.md)
├── report.html               ← reporte visual, generado/regenerado por agteamos-dashboard
├── verify-report.md          ← aparece recien en el cierre (Step 9, paso "verify")
│                                — no existe todavia durante la implementacion
├── evidence/                 ← screenshots QA y reportes obligatorios
│   ├── e2e-login-flow.png
│   ├── e2e-email-sent.png
│   ├── e2e-error-state.png
│   └── a11y-audit.png
└── specs/                    ← SDD artifacts, solo si schema: full
    ├── requirements.md       ← ACs del ticket (copiados o referenciados)
    ├── design.md             ← decision tecnica del @architect (Step 6)
    ├── tasks.md              ← checklist de @product-manager (Step 6)
    └── deltas/
        └── <dominio>.md      ← ADDED/MODIFIED/REMOVED contra agteamos/specs/<dominio>.md (Step 6)
```

#### `task.yml` — captura automatica de owner (sin preguntar)

Al crear la carpeta de la tarea (primera vez que se ejecuta este Step sobre
un `id` nuevo), capturar automáticamente — **sin preguntarle nada al
usuario** — la persona real que está trabajando, vía:

```bash
git config user.name
git config user.email
```

y escribirla en el campo `owner:` de `task.yml`. Esto es independiente de
`assigned_to:` (los agentes de IA que intervienen, ej. `@backend-engineer`) —
`owner` es siempre una persona, nunca un agente.

**Si otra persona retoma la tarea en otra sesión** (el `git config user.name`
actual no coincide con `owner.name` ya guardado en `task.yml`): **no
sobreescribir `owner`** — agregar una entrada nueva a `handoffs:` con nombre,
email y fecha. `owner` conserva siempre a quien creó la tarea originalmente;
`handoffs` es el historial de quién más la tocó.

**Fallback si `git config user.name` está vacío o es genérico** (ej. "user",
"admin", el hostname de la máquina): usar `git config user.email` como
identificador de la persona. Si tampoco hay email configurado, preguntar una
única vez quién está trabajando y no repetir la pregunta en esa sesión — es
la única excepción a "sin preguntarle nada al usuario" de este contrato.

**Esta comparación no se hace solo al crear la carpeta**: cada vez que se
retoma una tarea existente en una sesión nueva, este mismo Step 4 (via el
sub-paso de handoff descrito en Step 1) repite el chequeo (`git config
user.name` vs `owner.name`) antes de releer el ticket. Es el mismo mecanismo,
aplicado en dos momentos distintos del ciclo de vida de la tarea.

**Crear `task.yml` inicial** (esquema completo; los valores de `owner` de
abajo son un **ejemplo de lo que la captura automática produce**, nunca se
deja en `null` — ejecutar `git config user.name` / `git config user.email`
en este mismo paso, sin preguntarle nada al usuario):

```yaml
# agteamos/changes/42-email-notifications/task.yml
id: "42"
title: "Add email notifications"
type: feature               # feature | bug | hotfix | refactor | spike
schema: full                 # full | lite — ver skill agteamos-sdd-protocol
context_tier: 2              # 1 | 2 | 3 — ver "CONTEXT TIERS" arriba. Si la tarea vino de
                              # agteamos-new-task ya trae este valor; si el ticket es externo
                              # (sin new-task previo), fijarlo aca segun la misma regla
                              # (schema lite→1, full→2, sube a 3 si L/XL o 2+ dominios)
layer: fullstack             # frontend | backend | fullstack | infra
priority: medium             # critical | high | medium | low
status: in_progress          # pending | in_progress | in_review | done
branch: feature/42-email-notifications
platform: github             # github | azure
ticket_url: https://github.com/org/repo/issues/42
domains: [notifications]     # dominios de spec afectados (uno o mas)
doc_impact: true              # si false, el Step 9 salta el paso de docs. Default true.
created: 2026-08-09
updated: 2026-08-09
owner:                       # capturado automaticamente via git config, NUNCA null, no preguntado
  name: "Eddy Bereguete"
  email: "ebereguete@phoenixcalibrationdr.com"
handoffs: []                  # se agrega una entrada si otra persona retoma la tarea:
                              # - { name: "Maria Gonzalez", email: "maria@acme.com", date: 2026-08-10 }
assigned_to:                  # agentes de IA que intervinieron (distinto de owner)
  - backend-engineer
  - frontend-engineer
  - qa-engineer
depends_on: []
```

#### Template de `progress.md` (ex `TASK-<id>.md`)

La seccion "Next Action" debe completarse inmediatamente con el primer paso a
ejecutar — es la base de Tier 1 cuando se retoma la tarea.

```markdown
# TASK-<id>: <titulo>

| Campo | Valor |
|-------|-------|
| **Status** | IN_PROGRESS (40%) |
| **Owner** | Eddy Bereguete |
| **Branch** | feature/<id>-<description> |
| **Type** | Feature / Bug / Hotfix / Refactor |
| **Platform** | GitHub #<id> / Azure AB#<id> |
| **Created** | YYYY-MM-DD |
| **Last checkpoint** | YYYY-MM-DD HH:MM |

## Acceptance Criteria
- [ ] AC 1: Given..., When..., Then...
- [ ] AC 2: Given..., When..., Then...
- [x] AC 3: Given..., When..., Then... (verified)

## Progress Log

### Step 1: Analysis & Setup [COMPLETED] ✅
- Read PROJECT_CONTEXT.md — stack: FastAPI + React + PostgreSQL
- Read existing notification patterns (none found, new feature)
- Branch created: feature/42-email-notifications
- **Time**: 2026-08-09 10:00

### Step 2: Backend implementation [COMPLETED] ✅
- Created: src/notifications/service.py (NotificationService)
- Created: src/notifications/schemas.py (SendEmailRequest, EmailTemplate)
- Created: src/notifications/router.py (POST /api/notifications/send)
- Modified: src/core/dependencies.py (added NotificationService DI)
- **Decision**: Used SendGrid SDK over raw SMTP — better deliverability + tracking
- **Time**: 2026-08-09 10:45

### Step 3: Unit Tests [COMPLETED] ✅
- Created: src/tests/test_notification_service.py
  - test_send_welcome_email_success (happy path)
  - test_send_email_invalid_recipient_returns_error (error case)
  - test_send_email_rate_limited (edge case — max 10/min/user)
  - test_send_reset_password_email_contains_token (integration)
- Results: 4 passed, 0 failed
- Coverage: 92% on new code
- **Time**: 2026-08-09 11:15

### Step 4: Frontend integration [IN_PROGRESS] 🔄
- Created: src/components/NotificationBadge.tsx
- TODO: Connect to API
- TODO: Write component tests
- **Time**: 2026-08-09 11:30

### Step 5: E2E Tests + Evidence [PENDING] ⏳
### Step 6: PR + Closure [PENDING] ⏳

## Files Modified
| File | Action | Description |
|------|--------|-------------|
| src/notifications/service.py | Created | NotificationService with send_welcome, send_reset |
| src/notifications/schemas.py | Created | Pydantic schemas for email requests |
| src/notifications/router.py | Created | API endpoint for sending notifications |
| src/core/dependencies.py | Modified | Added NotificationService to DI container |
| src/tests/test_notification_service.py | Created | 4 unit tests |
| .env.example | Modified | Added SENDGRID_API_KEY |

## Unit Tests Written
| Test | File | Status | What it covers |
|------|------|--------|----------------|
| test_send_welcome_email_success | test_notification_service.py | ✅ Pass | Happy path: email sent correctly |
| test_send_email_invalid_recipient | test_notification_service.py | ✅ Pass | Error: invalid email returns 422 |
| test_send_email_rate_limited | test_notification_service.py | ✅ Pass | Edge: rate limit of 10/min/user |
| test_send_reset_password_contains_token | test_notification_service.py | ✅ Pass | Token included in reset URL |

## Evidence (QA Screenshots)
| Screenshot | Description | Status |
|-----------|-------------|--------|
| evidence/e2e-login-flow.png | User logs in and sees notification | Pending |
| evidence/e2e-email-sent.png | Email received in inbox | Pending |
| evidence/e2e-error-state.png | Error displayed for invalid email | Pending |

## Decisions Made
| Decision | Alternatives | Reason |
|----------|-------------|--------|
| SendGrid SDK | SMTP, AWS SES | Better deliverability, Python SDK, free tier sufficient |
| Rate limit 10/min/user | No limit, global limit | Prevents abuse while allowing normal usage |

## Next Action (if context resets)
> **Resume point**: Step 4 — Frontend integration.
> Branch: feature/42-email-notifications (last commit: abc123)
> Run: `git checkout feature/42-email-notifications && git log --oneline -5`
> Then: Connect NotificationBadge.tsx to POST /api/notifications/send
> Then: Write component tests with Testing Library
```

#### Reglas obligatorias de tracking

**Para desarrolladores (@backend-engineer, @frontend-engineer)**

1. **Unit tests son OBLIGATORIOS** por cada pieza funcional implementada:
   - Minimo 3 tests: happy path + error case + edge case
   - Tests deben pasar ANTES de marcar step como completado
   - Documentar cada test en la tabla "Unit Tests Written"
2. **Documentar archivos modificados** en la tabla "Files Modified" inmediatamente
3. **Documentar decisiones tecnicas** en "Decisions Made" cuando:
   - Se elige una libreria sobre otra
   - Se cambia el approach respecto al design.md
   - Se encuentra una limitacion no prevista

**Para QA (@qa-engineer)**

1. **Screenshots son OBLIGATORIOS** en cada paso critico del E2E:
   ```typescript
   // Playwright — guardar en la carpeta evidence de la tarea
   await page.screenshot({
     path: 'agteamos/changes/42-email-notifications/evidence/e2e-login-flow.png',
     fullPage: true
   });
   ```
2. Documentar cada screenshot en la tabla "Evidence (QA Screenshots)"
3. Si un test falla, guardar screenshot del estado de fallo

**Para checkpoints (todos)**

1. Actualizar "Last checkpoint" timestamp cada vez que se completa un step
2. Mantener "Next Action" siempre actualizado — es lo primero que lee un agente que resume
3. El "Next Action" debe ser lo suficientemente detallado para que un agente sin contexto previo sepa exactamente que hacer
4. Actualizar `updated:` en `task.yml` en cada checkpoint

#### Regenerar el reporte visual de la tarea

Cada vez que se actualiza `progress.md` y/o `task.yml`, invocar la skill
`agteamos-dashboard` para regenerar `report.html` dentro de la carpeta de la
tarea (`agteamos/changes/<id>-<slug>/report.html`). Este Step 4 solo
mantiene los datos de origen (`progress.md`, `task.yml`, `evidence/`) — la
generación del HTML vive en `agteamos-dashboard`, para no duplicar esa
lógica acá.

#### Anti-patterns de task-tracking

- **No documentar al final** — documentar en cada paso, no al terminar
- **No omitir tests por "es un cambio simple"** — todo cambio tiene tests
- **No screenshots genericos** — cada screenshot muestra un paso/estado especifico
- **No dejar "Next Action" vacio** — si los tokens se cortan, el siguiente agente esta ciego
- **No preguntarle al usuario quién es** — `owner` se captura siempre vía `git config`, nunca con una pregunta (salvo el fallback de último recurso si `git config` está vacío)
- **No sobreescribir `owner` cuando cambia de persona** — usar `handoffs:`, `owner` es inmutable una vez creada la tarea
- **No mostrar `owner: {name: null, email: null}` en ningún ejemplo** — la captura es automática e inmediata en el momento en que se crea `task.yml`; un ejemplo con `null` contradice el propio contrato de este Step
- **No dejar `context_tier` sin escribir en `task.yml`** — si la elección del tier queda solo en la cabeza del agente de esa sesión, no es auditable ni planificable entre sesiones. Se escribe siempre, y solo sube, nunca baja
- **No olvidar regenerar `report.html`** — un dashboard desactualizado hace que el reporte general (`agteamos/dashboard.html`) muestre datos viejos

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

**Naming rules (del skill agteamos-new-task):**
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

1. `specs/requirements.md` — escrito o validado por @product-manager.
   Si vino del workflow `agteamos-new-task`, ya existe. Si vino de un ticket
   externo, @product-manager lo crea desde los ACs del ticket. No proceder sin
   este archivo.

2. `specs/design.md` — escrito por @architect con el enfoque tecnico completo.
   Ver formato completo abajo.

3. `specs/deltas/<dominio>.md` — escrito por @architect junto con design.md, uno
   por cada dominio en `domains:`. Registra ADDED/MODIFIED/REMOVED contra la
   spec maestra `agteamos/specs/<dominio>.md` — se aplica en el paso "sync" de
   Step 9, no durante la implementacion.

4. `specs/tasks.md` — escrito por @product-manager con el checklist de
   implementacion desglosado por capa y agente responsable.

**Si `schema: lite`**: solo un resumen de 1 párrafo en `progress.md` y un test
de regresión — no se crean los 4 artefactos de `specs/`. Ver skill
`agteamos-sdd-protocol`.

**SDD Checklist de aprobacion (schema full):**
- [ ] requirements.md revisado y aprobado por el usuario
- [ ] design.md escrito por @architect y aprobado por el usuario
- [ ] specs/deltas/<dominio>.md escrito por @architect por cada dominio afectado (ADDED/MODIFIED/REMOVED, o "Sin cambios en la spec maestra")
- [ ] tasks.md creado por @product-manager con checklist completo
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

**TDD opcional**: si el usuario pide TDD explícitamente, o la tarea es
lógica de negocio crítica (cálculos, montos, permisos), aplicar el mismo
patrón de `agteamos-build` Step 3.5/4.5 (`obra/superpowers`) — escribir el
test en rojo antes del código, confirmar que falla por la razón correcta,
implementar lo mínimo para ponerlo en verde, refactorizar. Default sin
pedido explícito: código primero, tests en Step 8 como siempre.

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
revisar OWASP Top 10 items relevantes (skill `agteamos-security`).

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

### Step 8.5 — Oportunidad de refactor acotada

Con los tests ya en verde (Step 8), y **antes** del cierre (Step 9):
cruzar los archivos tocados por esta tarea con (a) los follow-ups
`preexistente` del ledger de `agteamos-quality`
sobre esos mismos archivos, y (b) `agteamos/quality/debt-trend.yml` si
alguno de esos archivos es un hotspot reciente.

Si hay coincidencia, proponer **como máximo 1-2 refactors de 30 líneas o
menos**, cada uno con su propio test — nunca una lista larga, nunca sin
test. Para cada uno, el usuario elige una de tres opciones:

1. **Aplicarlo ahora**, en un commit separado `refactor(scope): ...` (no
   mezclado con el commit de la feature).
2. **Anotarlo** con `agteamos-capture` como item de tipo
   `tech-debt` — queda para después, no bloquea el cierre de esta tarea.
3. **Descartarlo** — se marca `KNOWN` en
   `agteamos/.cache/findings/refactor-dismissed.json` (mapa `id -> true`,
   mismo criterio de hash que `findings-ledger.js#findingId`) para no volver
   a proponer el mismo refactor en la próxima tarea sobre ese archivo.

Si no hay ninguna coincidencia, este step no genera texto — sigue
directamente a Step 9, silencioso.

### Step 9 — Close Task: checklist de cierre completo

Con todos los tests pasando y la evidencia capturada, ejecutar el checklist
de cierre completo. Esta fase corresponde a lo que antes era la skill
separada `agteamos-implement` — ahora vive aca, inline, como Step 9 (el
ultimo) del mismo flujo.

**Contrato de esta fase**: Input = tarea completada con todos los tests
pasando; `task.yml` con el campo `schema: full | lite`; y, obligatorio para
el paso de QA Review y para `agteamos-dashboard`,
`agteamos/changes/<id>-<slug>/evidence/` con las capturas — no es un adjunto
opcional, ambos lo leen como input.

- **Output (schema `full`)**: PR mergeado que incluye código +
  `specs/deltas/<dominio>.md` + `agteamos/specs/<dominio>.md` sincronizada;
  `verify-report.md` sin FAIL; ticket cerrado; rama eliminada; `agteamos/`
  actualizado (si `doc_impact: true`); tarea archivada en
  `agteamos/changes/archive/<fecha>-<id>-<slug>/`; `report.html` y
  `dashboard.html` regenerados **localmente, sin commitear** (ver punto 11).
- **Output (schema `lite`)**: PR mergeado con el resumen de 1 párrafo + test
  de regresión; ticket cerrado; rama eliminada; tarea archivada. Sin delta,
  sin spec maestra, sin tabla RFC 2119 en `verify-report.md`.
- **Regla**: TODOS los pasos que apliquen al schema de la tarea (ver punto 0)
  deben completarse. Cierre parcial = tarea abierta.

#### Disciplina PR/git (de OpenSpec: "OpenSpec never touches git")

Principio explícito que gobierna todo este cierre, ver también skill
`agteamos-pr-standards`:

- **1 change = 1 branch = 1 PR.** No dividir el delta de spec y el código en
  PRs separados.
- **El PR contiene código, delta y spec maestra actualizada juntos** — en
  schema `full`, el punto 2 (`sync`) corre **en la rama, antes de abrir el
  PR**, así que `specs/deltas/<dominio>.md` y la
  `agteamos/specs/<dominio>.md` ya sincronizada llegan en el mismo commit set
  que el código, nunca aparte y nunca en un PR posterior.
- **Orden de lectura recomendado para el reviewer**: `requirements.md` →
  `specs/deltas/<dominio>.md` → diff de `agteamos/specs/<dominio>.md` → diff
  de código. Leer la spec antes que el código da contexto de *qué* se
  prometió antes de revisar *cómo* se hizo, y ver el diff de la spec maestra
  ya aplicada confirma que el merge fue el esperado.
- **Archivar después de confirmar el merge, no antes.** El paso de archivado
  (punto 9 más abajo) es explícitamente el último paso, posterior a la
  confirmación de que el PR está mergeado — evita archivar algo que después
  no pasa review o se revierte.

#### Checklist de cierre (en orden)

##### 0. Leer `schema` en `task.yml` y bifurcar

Primer paso, antes de tocar nada más. Lee `schema: full | lite` (ver skill
`agteamos-sdd-protocol`) y determina qué puntos de este checklist aplican tal
cual y cuáles cambian de alcance:

| Punto | Schema `full` | Schema `lite` |
|---|---|---|
| 1. Verificar implementación | Todos los ACs de `requirements.md` + tests | Solo el test de regresión pasa (no hay `requirements.md`) |
| 2. Sync (delta → spec maestra) | Obligatorio, en la rama, antes del PR | **Se salta completo** — `lite` no lleva delta ni toca la spec maestra |
| 3. Crear PR | Incluye delta + spec maestra sincronizada | Incluye el resumen de 1 párrafo + test de regresión |
| 4. QA Review | Completo (6 dimensiones + E2E + evidencia) | Igual, sin cambios |
| 5. Verify | RFC 2119 + `tasks.md` + cobertura del delta | **Se limita a comprobar que el test de regresión pasa** — no hay `tasks.md` ni `specs/deltas/` que chequear |
| 6–12 | Sin cambios | Sin cambios |

Si durante la implementación aparece que un cambio `lite` en realidad altera
comportamiento observable de un dominio, la tarea está mal clasificada:
**detener el cierre, promoverla a `full`** (escribir
`specs/deltas/<dominio>.md`, actualizar `task.yml`) y recién entonces
continuar por la columna `full`. No "cerrarla como lite y documentarlo
después".

##### 1. Verificar que la implementación está completa

**Schema `full`:**
```
- [ ] Todos los ACs de requirements.md estan cubiertos
- [ ] Unit tests pasan (minimo: happy path + error + edge)
- [ ] Cobertura >= 80% en codigo nuevo
- [ ] Codigo sigue los standards del proyecto (lint, format)
- [ ] Sin secrets hardcodeados
- [ ] Sin console.log / print() de debug
```

**Schema `lite`:**
```
- [ ] El test de regresion (agteamos-sdd-protocol) falla antes del fix y pasa despues
- [ ] Codigo sigue los standards del proyecto (lint, format)
- [ ] Sin secrets hardcodeados
- [ ] Sin console.log / print() de debug
```
(No hay `requirements.md` en `lite` — no hay ACs contra los que verificar.)

##### 2. Sync — aplicar `specs/deltas/<dominio>.md` a la spec maestra (EN LA RAMA, antes del PR)

*(Solo schema `full` — en `lite` este paso se salta completo, ver punto 0.)*

**Por qué acá y no después del merge**: el PR debe contener código, delta y
spec maestra juntos (disciplina PR/git de arriba). Si el sync ocurriera
después del merge, el PR ya estaría cerrado y la rama borrada — no habría
dónde commitearlo. Por eso este paso corre antes del punto 3 (Crear PR), no
después del punto 6 (Merge).

**Regla de concurrencia (dos tareas activas sobre el mismo dominio)**: releer
`agteamos/specs/<dominio>.md` **en su estado actual del filesystem**, justo
antes de aplicar el delta — nunca contra la versión que existía cuando se
escribió el delta. Si otra tarea sobre el mismo dominio cerró primero (su
sync ya corrió), este paso debe aplicarse sobre lo que esa tarea dejó, no
sobre una copia vieja. Esto es lo que evita que dos cierres sobre `billing`
se pisen sin conflicto de git.

```
1. Leer cada specs/deltas/<dominio>.md de la tarea (ver skill agteamos-sdd-protocol).
2. Releer agteamos/specs/<dominio>.md TAL COMO ESTA AHORA en el filesystem
   (obligatorio incluso si ya se habia leido antes en la sesion).
3. ¿agteamos/specs/<dominio>.md existe?
     NO → crearlo ahora. Su contenido inicial ES el ADDED del delta
          (es la primera vez que este dominio recibe una spec maestra).
     SI → aplicar el delta por nombre de requirement (ancla de merge):
          - ADDED    → append del bloque ### Requirement: completo
          - MODIFIED → reemplazar el bloque completo (el nombre debe
            coincidir CARACTER POR CARACTER con la spec maestra actual)
          - REMOVED  → eliminar el bloque con ese nombre
4. Si el nombre de un requirement MODIFIED/REMOVED no coincide caracter por
   caracter con ningun ### Requirement: de la spec maestra actual (porque
   cambio de contenido desde que se escribio el delta, o nunca existio):
   DETENER el sync de ese dominio. No adivinar ni aplicar por similitud.
   Volver a @architect para re-clasificar el delta contra la version vigente.
   Esto no es un bug del proceso: es git avisando que dos cambios discrepan
   sobre como debe comportarse el sistema (doctrina de OpenSpec) — un
   conflicto en specs/ es una feature, no un error a silenciar.
5. Si el delta dice "Sin cambios en la spec maestra" → no tocar
   agteamos/specs/<dominio>.md, pero registrar en progress.md que se verifico.
6. Actualizar en la spec maestra: "Ultima tarea aplicada" y, si el alcance
   cambio, "Cubre" / "No cubre (todavia)".
```

**Regla de orden seguro / fallo parcial (transaccionalidad)**: si la tarea
toca 2+ dominios, sincronizar dominio por dominio y **no avanzar al punto 3
(crear PR) hasta que todos sincronizaron sin error**. Si un dominio falla en
el paso 4 de arriba, el sync de la tarea queda incompleto: no crear el PR con
una sincronización parcial, no archivar, no continuar. Escribir cada
`agteamos/specs/<dominio>.md` de forma atómica (archivo temporal + rename),
nunca editar in-place a medias — un fallo a mitad de escritura no debe dejar
el archivo corrupto para la próxima tarea que lo lea.

**Sub-paso — promover decisiones a la base de conocimiento (memoria
institucional)**: antes de seguir, revisar la tabla `## Decisions Made` de
`progress.md` de la tarea. Si alguna fila es **generalizable** (aplica más
allá de esta tarea puntual — ej. "usar SendGrid para todo email
transaccional" — y no es una decisión específica de esta tarea únicamente),
proponerla al usuario para agregarla a `agteamos/specs/knowledge-base.md`.
**Nunca automático**: requiere confirmación explícita del usuario sobre el
texto final de la fila antes de escribirla. Formato del archivo (append-only,
uno solo para todo el proyecto):

```markdown
# Knowledge Base

| Fecha | Decision | Contexto | Tarea de origen |
|---|---|---|---|
| 2026-08-09 | Usar SendGrid para todo email transaccional | SES tenia peor deliverability en las pruebas | TASK-42 |
```

Commitear `agteamos/specs/<dominio>.md` (y `agteamos/specs/knowledge-base.md`
si se actualizó) junto con el código y el delta, **en el mismo commit set**
— no en un commit separado.

**Subpaso — convenciones aprendidas (Disparador 3 de `agteamos-project-docs`)**:
distinto de una decisión puntual (arriba), si el diff de esta tarea introdujo
un **patrón nuevo y consistente** (un helper nuevo reutilizado 3+ veces, un
naming nuevo aplicado parejo en todos los archivos tocados), ofrecer
`agteamos-project-docs` para registrarlo como convención del proyecto — nunca
automático, misma confirmación explícita que el resto de este punto.

##### 3. Crear Pull Request

*(Schema `full`)* Gracias al punto 2, el PR ya incluye código,
`specs/deltas/<dominio>.md` y `agteamos/specs/<dominio>.md` actualizada — todo
en el mismo commit set.

*(Schema `lite`)* El PR incluye el código y el resumen de 1 párrafo + test de
regresión (no hay delta ni spec maestra que incluir).

`[operación: create-pr]` (crear el PR con título, body y label; el comando
real se resuelve contra `agteamos/tracker/<tracker de platform.yml>.md`):

```
--title "feat(notifications): add email notification system"
--body "$(cat <<'EOF'
## Summary
- Implemented NotificationService with SendGrid integration
- Added POST /api/notifications/send endpoint
- Created NotificationBadge frontend component

## Changes
- 6 files created, 2 files modified
- 4 unit tests, all passing
- Coverage: 92% on new code

## Acceptance Criteria Verification
- [x] Welcome email sent on registration
- [x] Reset password email contains valid token
- [x] Rate limit of 10 emails/min/user enforced

## Spec Delta
See specs/deltas/notifications.md — ya aplicado a
agteamos/specs/notifications.md en este mismo PR (punto 2 de este checklist)

## Screenshots
See agteamos/changes/42-email-notifications/evidence/

Closes #42
EOF
)"
--label "feature,ready-for-qa"
```

**Keywords importantes:**
- GitHub: `Closes #42`, `Fixes #42`, `Resolves #42`
- Azure DevOps: `Fixes AB#1234`, `Closes AB#1234`

Al crear el PR, actualizar `task.yml`:
```yaml
status: in_review
```
El PR queda abierto esperando QA — este es el único momento del flujo donde
corresponde escribir `status: in_review`, y es lo que le permite al dashboard
(`agteamos-dashboard`) contar correctamente las tareas en revisión.

##### 4. QA Review con evidencia

```
@qa-engineer:
- [ ] Code review en 6 dimensiones (seguridad, correctitud, perf, mantenibilidad, tests, deuda)
- [ ] Tests E2E ejecutados con Playwright
- [ ] Screenshots guardados en agteamos/changes/<id>-<slug>/evidence/
- [ ] Accessibility audit (axe-core) ejecutado
- [ ] Aprobar PR con evidencia: "QA approved. All tests passing. Evidence in agteamos/changes/<id>-<slug>/evidence/"
```

##### 5. Verify — generar `verify-report.md` (bloquea el cierre si hay FAIL)

*(Schema `lite`)*: este paso se limita a confirmar que el test de regresión
(punto 1) pasa. No hay `tasks.md`, no hay `specs/deltas/`, no hay
`## Requirements (RFC 2119)` — no se genera tabla RFC 2119 ni cobertura de
delta, solo se registra pass/fail del test de regresión.

*(Schema `full`)*: paso explícito entre la aprobación de QA y el merge/sync,
inspirado en `/opsx:verify` de OpenSpec y `verify-report.md` de spec-os. Se
genera `agteamos/changes/<id>-<slug>/verify-report.md` verificando:

1. **Todos los items de `specs/tasks.md` están `done`** (checklist marcado).
2. **Todo lo declarado en cada `specs/deltas/<dominio>.md` tiene al menos una
   tarea completada asociada** en `tasks.md` — el delta es también un gate,
   no solo un log: si algo dice `ADDED` en el delta pero ninguna tarea del
   checklist lo implementó, es una inconsistencia real.
3. **Clasificación de severidad RFC 2119 — fuente de datos concreta, no
   introspección del LLM**: la fuente es la sección
   `## Requirements (RFC 2119)` de `requirements.md` (ver skill
   `agteamos-sdd-protocol`). Cada requirement ahí tiene un id (`R1`, `R2`…),
   un modal y sus ACs asociados por id; verify recorre esa lista, no infiere
   modales leyendo el código. La severidad heredada está definida en
   `agteamos-sdd-protocol` y no se redefine acá:
   - `MUST` / `SHALL` no cumplido → **FAIL** (bloquea el cierre).
   - `SHOULD` no cumplido → **WARNING** (no bloquea, se documenta).
   - `MAY` → no se chequea.
4. **Disciplina de exit-code en cada comando de verify citado por un AC**:
   un AC verificado por un comando ejecutable (test, script, curl) solo
   cuenta como cumplido si ese comando sale con exit code 0 exactamente
   cuando el AC es cierto — nunca por inspección visual del output. Si el AC
   cubre un camino de error esperado (ej. "debe rechazar con 400"), el
   comando de verify tiene que envolver esa expectativa explícitamente
   (`test $? -eq 0` después de un curl que espera 400, o
   `! grep -q "500" response.txt`) — un comando que "falla" en el sentido
   shell pero cuyo fallo ES el comportamiento correcto no puede marcarse
   FAIL solo por su exit code crudo.
5. **Path-closure check**: para cada comando de verify que referencia un
   archivo (fixture, config, test file), confirmar que ese archivo existe y
   fue realmente escrito por esta tarea (aparece en "Files Modified" de
   `progress.md`) o ya existía antes. Un verify que apunta a un fixture que
   nadie creó es una inconsistencia real — inconsistencia que la revisión
   humana de un checklist marcado `[x]` no atrapa, pero un chequeo de rutas
   sí. Reportarlo como **FAIL** si el archivo no existe.

**Template de `verify-report.md`:**

```markdown
# Verify Report: TASK-<id>

**Generado**: 2026-08-09 14:00
**Resultado**: PASS / PASS_WITH_WARNINGS / FAIL

## tasks.md — checklist
- [x] 14/14 items marcados done

## specs/deltas/<dominio>.md — cobertura
| Item del delta | Tarea asociada en tasks.md | Estado |
|---|---|---|
| ADDED: welcome email on registration | #2 Implementar NotificationService | ✅ |
| ADDED: password reset email | #2 Implementar NotificationService | ✅ |

## Requirements (RFC 2119)
Fuente: sección `## Requirements (RFC 2119)` de `requirements.md`.

| Id | Requirement | Severidad | Cumplido | Resultado |
|---|---|---|---|---|
| R1 | El sistema MUST enviar el email en menos de 5s | MUST | SI | ✅ |
| R3 | El sistema SHOULD reintentar en caso de fallo de SendGrid | SHOULD | NO | ⚠️ WARNING |
| R4 | El sistema MAY loguear el payload completo | MAY | — | no chequeado |

## Path-closure check
| Comando de verify | Archivo referenciado | Existe y fue escrito por esta tarea | Estado |
|---|---|---|---|
| `pytest tests/test_notifications.py::test_welcome_email` | `tests/test_notifications.py` | Sí — ver Files Modified | ✅ |

## Bloqueantes (FAIL)
Ninguno.

## Advertencias (WARNING)
- Retry de SendGrid no implementado — documentado como deuda tecnica, no bloquea.
```

**Regla de bloqueo**: si hay al menos un `FAIL`, el cierre se detiene aquí —
no se procede al merge (punto 6) hasta resolver el requirement `MUST`/`SHALL`
incumplido o, si el usuario decide conscientemente aceptar el riesgo, dejar
constancia explícita de esa decisión en `verify-report.md` antes de
continuar.

Este archivo alimenta directamente el `report.html` de la tarea (skill
`agteamos-dashboard`) — no es un artefacto aislado, es una fuente más del
mismo reporte.

**Si `agteamos/architecture/SRS.md` existe** (proyecto con SRS formal opt-in,
ver `agteamos-new-project` Step 3.5) **y** `requirements.md` tiene la sección
`## Requisito SRS relacionado` citando uno o más `RF-XXX`: cuando este
`verify-report.md` da `PASS` (sin `FAIL` sin resolver), actualizar en
`SRS.md` la fila correspondiente de la sección 10.2 (Matriz de trazabilidad)
de `Pendiente`/`En progreso` a `Verificado`. Si el resultado es
`PASS_WITH_WARNINGS`, dejarla en `En progreso` y anotar el warning. Si no
existe `SRS.md` o `requirements.md` no cita ningún `RF-XXX`, omitir este paso
— no es un gate, es solo sincronización de estado.

**Si además `agteamos/platform.yml` tiene `tracker: planner`** y la fila del
`RF-XXX` en la sección 10.2 tiene un valor en la columna "Planner Task ID"
(no vacío): sincronizar también la tarea de Planner, resuelto igual que
siempre contra `agteamos/tracker/planner.md`:
- `PASS` → `[operación: close-ticket]` con ese task ID (marca
  `percentComplete: 100`).
- `PASS_WITH_WARNINGS` → `[operación: comment-ticket]` con ese task ID,
  agregando el detalle del warning — la tarea de Planner queda abierta.
- `FAIL` → no se toca la tarea de Planner (el cierre ya se detuvo arriba,
  antes de llegar a este punto).
Si `tracker` no es `planner`, o la fila no tiene Planner Task ID (proyecto
con SRS pero sin ese tracker configurado), omitir esta sincronización —
mismo criterio de "no es un gate" que el punto anterior.

##### 6. Merge PR

Solo si `verify-report.md` (punto 5) no tiene `FAIL` sin resolver:

`[operación: merge-pr]` (mergear con squash y borrar la rama; comando real
resuelto contra `agteamos/tracker/<tracker de platform.yml>.md`).

**Nota — `branch_strategy: personal`**: si `agteamos/platform.yml` declara
`branch_strategy: personal` (`feature/* → main`), este merge apunta
directamente a una rama protegida — en GitHub eso corresponde en realidad a
`[operación: merge-to-protected-branch]`, no a `merge-pr` genérico. Es la
operación que dispara el hook `remind-merge-approval`
(`hooks/scripts/remind-merge-approval.js`), cuya regex
(`gh\s+pr\s+merge...--base\s+(main|master)`) es **específica de la sintaxis
de GitHub CLI**. En un proyecto con `tracker: azure_devops`, el equivalente
(`az repos pr update --id <id> --status completed` contra una rama
protegida) **no dispara ningún hook análogo hoy** — si el equipo depende de
esa confirmación manual antes de mergear a `main`, hay que replicarla
explícitamente del lado de Azure DevOps (fuera del alcance de este archivo).

##### 7. Verificar cierre automatico del ticket

Si usaste el keyword de cierre (`Closes #42` / `Fixes AB#1234`, ver punto 3),
el ticket debería cerrarse automáticamente al mergear.

`[operación: get-ticket]` (verificar el estado actual del ticket; comando
real resuelto contra `agteamos/tracker/<tracker de platform.yml>.md`).

Si no se cerró automáticamente: `[operación: close-ticket]` (cerrar el
ticket con comentario "Completed in PR #<pr-number>"; misma resolución vía
tracker adapter).

##### 8. Actualizar `agteamos/` si hubo cambios arquitectonicos (condicional a `doc_impact`)

**Chequear primero el campo `doc_impact` en `task.yml`**: si es `false`,
**saltar este paso completo** — la tarea no tiene impacto de
arquitectura/API/decisiones (ej. un fix de un typo) y forzar la actualización
de docs sería trabajo innecesario. Si `doc_impact` no está declarado, tratarlo
como `true` (fail-safe: mejor revisar de más que de menos).

Si `doc_impact: true`:

```
¿Se creo un nuevo servicio o modulo?
  → Actualizar agteamos/architecture/PROJECT_CONTEXT.md

¿Se agrego o modifico un endpoint?
  → Actualizar agteamos/api/openapi.yml

¿Se tomo una decision arquitectonica nueva?
  → Crear ADR en agteamos/architecture/adr/

¿Se cambio infraestructura?
  → Actualizar agteamos/devops/INFRASTRUCTURE.md

¿Se agrego una variable de entorno nueva?
  → Documentar en agteamos/devops/INFRASTRUCTURE.md
```

##### 9. Archivar la tarea (DESPUÉS de confirmar el merge)

**Precondición**: punto 6 (merge) confirmado y, si `schema: full`, punto 2
(sync) completado sin error para todos los dominios. Con el orden de este
flujo eso ya está garantizado — el PR (punto 3) no se crea hasta que el sync
termina, así que si se llegó hasta acá el sync ya pasó. Si por algún motivo
se llega a este paso sin esa garantía (ej. un cierre manual fuera de este
flujo), **no archivar**: falta la sincronización.

```bash
# Mover la carpeta de la tarea a archive/, con fecha de cierre en el nombre
mv agteamos/changes/42-email-notifications/ \
   agteamos/changes/archive/2026-08-09-42-email-notifications/
```

Actualizar el status en `progress.md` y `task.yml`:
```markdown
| **Status** | COMPLETED ✅ |
| **Completed** | 2026-08-09 |
| **PR** | #123 (merged) |
```
```yaml
status: done
updated: 2026-08-09
```

##### 10. Limpiar rama (si no se hizo en merge)

```bash
# Verificar que la rama fue eliminada
git branch -d feature/42-email-notifications 2>/dev/null
git push origin --delete feature/42-email-notifications 2>/dev/null
```

##### 11. Regenerar `report.html` y `dashboard.html` (artefactos locales, no se commitean)

Invocar la skill `agteamos-dashboard` para:
- Finalizar `report.html` de la tarea (badge → `done`).
- Regenerar `agteamos/dashboard.html` completo, reflejando el nuevo conteo
  de tareas activas/en review/completadas.

**Regla de commit**: `agteamos/dashboard.html` y
`agteamos/changes/**/report.html` **no se versionan**. Son 100% derivables de
`task.yml` + `progress.md`, y con varios devs trabajando en paralelo generan
conflicto de merge garantizado en cada PR. Confirmar que están en
`.gitignore` y no incluirlos en ningún commit de este flujo (ni en el punto
3, ni acá).

##### 12. Pregunta opcional de fricción (una línea, nunca bloqueante)

Al mismo tiempo que se sugiere el próximo paso, agregar una pregunta opcional:

```
"¿Algo en este flujo te resultó torpe o mejorarías? (Enter para saltar)"
```

- Si el usuario responde con Enter (o no responde nada relevante): continuar
  sin más acción, no se escribe nada.
- Si el usuario responde con una idea: proponerla como fila nueva en el
  `BACKLOG.md` del repo del propio plugin (vía skill `agteamos-plugin-improvement`,
  que es la dueña de ese mecanismo) — **nunca se escribe sin confirmación
  explícita del usuario** sobre el texto final de la fila propuesta.

Este paso nunca bloquea el cierre — es puramente opcional y de captura de
bajísima fricción.

#### Ejemplo: cierre completo en secuencia (schema `full`)

```
0. ✅ Schema: full (feature nueva, impacta el contrato del dominio notifications)
1. ✅ Verificar: ACs de requirements.md cubiertos, 4 unit tests passing, 92% coverage, lint clean
2. ✅ Sync (en la rama, antes del PR): specs/deltas/notifications.md releido
      contra agteamos/specs/notifications.md vigente y aplicado
      (ADDED: "welcome email on registration", "password reset email")
3. ✅ PR created: #123 "feat(notifications): add email notification system"
      Incluye codigo + specs/deltas/notifications.md + specs/notifications.md
      actualizada. task.yml → status: in_review
4. ✅ QA: @qa-engineer approved with screenshots in evidence/
5. ✅ Verify: verify-report.md generado desde ## Requirements (RFC 2119) de
      requirements.md — PASS (0 FAIL, 1 WARNING documentado)
6. ✅ Merge: squash merge to main, branch auto-deleted
7. ✅ Ticket: #42 auto-closed via "Closes #42" keyword
8. ✅ Docs (doc_impact: true): Updated PROJECT_CONTEXT.md (added NotificationService)
           Updated openapi.yml (added POST /notifications/send)
           Added .env.example entry for SENDGRID_API_KEY
9. ✅ Archive: Moved agteamos/changes/42-email-notifications/ to
           agteamos/changes/archive/2026-08-09-42-email-notifications/
10. ✅ Branch cleanup confirmado
11. ✅ report.html finalizado (badge → done), dashboard.html regenerado
           (no commiteados — .gitignore)
12. ➡️  Pregunta de fricción: usuario responde Enter (sin comentarios)
```

**Próximo paso sugerido**: continuar con `agteamos-new-task` para la siguiente
iteración del backlog, o — si corresponde una revisión periódica — ejecutar
`agteamos-quality`, `agteamos-project-docs`.

#### Anti-patterns de task-closure

**Orden del flujo (sync / merge / archive)**
- **Ejecutar el sync después del merge** — el punto 2 (sync) corre en la
  rama, antes de abrir el PR (punto 3), precisamente porque después del merge
  ya no hay PR ni rama donde commitear la spec maestra actualizada.
- **No archivar sin ejecutar el paso de sync** — una tarea archivada sin
  aplicar `specs/deltas/<dominio>.md` deja `agteamos/specs/<dominio>.md`
  desactualizada para la próxima tarea sobre el mismo dominio.
- **No archivar antes de confirmar el merge** — el archivado (punto 9) es
  siempre el último paso operativo, después de merge y sync, nunca antes.
- **Crear el PR con un sync parcial** (algunos dominios sincronizados y otros
  no, tras un fallo de ancla) — completar o resolver todos los dominios antes
  de avanzar al punto 3.

**Schema full vs lite**
- **Tratar una tarea `lite` como `full`** — exigirle ACs de un
  `requirements.md` que no existe, o un delta que no debe escribir, traba la
  skill sin necesidad. Ver punto 0.
- **Tratar una tarea `full` como `lite`** — saltarse el sync o el verify
  RFC 2119 porque "total el cambio es chico" deja la spec maestra sin
  actualizar cuando sí había impacto de contrato.
- **Cerrar una tarea `lite` que en implementación resultó cambiar contrato**
  sin promoverla a `full` primero — "documentarlo después" nunca pasa.

**Verify (exit-code y path-closure)**
- **Marcar un AC cumplido por inspección visual del output** en vez de por
  el exit code del comando de verify — la inspección visual es exactamente
  lo que este chequeo existe para reemplazar.
- **Reportar FAIL en un comando cuyo exit code distinto de 0 es el
  comportamiento esperado** (ej. un test que confirma que algo se rechaza)
  sin envolver esa expectativa en el propio comando — el comando de verify
  tiene que declarar explícitamente qué exit code espera, no asumir que
  "0 siempre es éxito."
- **Saltarse el path-closure check "porque el test ya pasó"** — un test que
  pasa contra un fixture que no existe en el repo (por ejemplo, generado a
  mano fuera del control de versiones) no es reproducible por otra persona
  ni por CI.

**Sync y concurrencia**
- **Aplicar un delta contra una copia vieja de la spec maestra** — releer
  `agteamos/specs/<dominio>.md` en su estado actual del filesystem
  inmediatamente antes de aplicar, nunca contra lo que existía cuando se
  escribió el delta. Sin esto, dos cierres sobre el mismo dominio se pisan
  sin conflicto de git.
- **Forzar el merge de un requirement `MODIFIED`/`REMOVED` cuyo nombre no
  coincide carácter por carácter** con la spec maestra actual — eso es una
  señal real de que el delta quedó desactualizado; detener el sync y volver
  a @architect para re-clasificar, no adivinar por similitud.
- **Tratar un conflicto de `specs/` como un bug a silenciar** — es git
  avisando que dos cambios discrepan sobre el comportamiento del sistema
  (doctrina de OpenSpec); resolverlo es trabajo de re-clasificación, no un
  error a suprimir.

**Verify**
- **Marcar PASS en `verify-report.md` sin una fuente real de requirements**
  — la clasificación RFC 2119 sale de la sección
  `## Requirements (RFC 2119)` de `requirements.md`, no de que el LLM infiera
  modales leyendo el código.
- **No mergear con un FAIL sin resolver en `verify-report.md`** — un
  `MUST`/`SHALL` incumplido bloquea el cierre por diseño, no es una
  sugerencia.

**Otros**
- **No cerrar ticket sin verificar ACs** — cada AC debe ser verificado
  explícitamente (schema `full`).
- **No dejar ramas huerfanas** — si la rama no se elimino en el merge,
  eliminarla manualmente.
- **No olvidar actualizar `agteamos/`** cuando `doc_impact: true` — si la
  arquitectura cambio y no se actualizo, el siguiente agente trabaja con
  contexto viejo.
- **No forzar la actualizacion de docs cuando `doc_impact: false`** — es
  trabajo innecesario para tareas sin impacto real (ej. un typo).
- **No cerrar sin evidencia QA** — screenshots en `evidence/` son
  obligatorios como prueba de que funciona.
- **Commitear `report.html` o `dashboard.html`** — son artefactos derivados
  y regenerables, y garantizan conflicto de merge con varios devs; van en
  `.gitignore`, nunca en el commit set del PR.
- **Promover una fila de `## Decisions Made` a `knowledge-base.md` sin
  confirmación del usuario** — el sub-paso del punto 2 propone, nunca escribe
  directo.
- **No escribir en `BACKLOG.md` sin confirmación** — la pregunta de fricción
  es opcional y su respuesta se propone, nunca se escribe directamente.

---

## YAML FILES

Durante el workflow se gestionan los siguientes archivos YAML:

**`task.yml`** — metadatos de la tarea, actualizado en cada cambio de estado.
Ver Step 4 para el schema completo.

**`openapi.yml`** — si se agregaron o modificaron endpoints de la API,
actualizar `agteamos/api/openapi.yml` con los nuevos paths, schemas y
ejemplos. Hacerlo en Step 9 (checklist de cierre), despues de que el PR
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

**Step 9 — Close Task:**
```
[operación: create-pr] (título + "Closes #15"; comando real resuelto contra
agteamos/tracker/<tracker de platform.yml>.md)
# → PR #87 created

# ... verify-report.md generado, sin FAIL ...

[operación: merge-pr] (squash + delete branch — ver punto 6 del checklist
de cierre para la nota sobre merge-to-protected-branch si branch_strategy: personal)
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

Ver también los anti-patterns especificos de cada fase inline: "Anti-patterns
de task-tracking" (dentro de Step 4) y "Anti-patterns de task-closure"
(dentro de Step 9).
