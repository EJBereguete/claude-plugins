---
name: agteamos-task-tracking
description: >
  Crea y mantiene la documentacion local de cada tarea en agteamos/changes/.
  Incluye checkpoints para resumir si los tokens se agotan, progress log,
  archivos modificados y decisiones tomadas. Captura automaticamente el
  owner real (persona, via git config) al crear la tarea. Los desarrolladores
  documentan unit tests y el QA guarda screenshots como evidencia.
used_by:
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - project-manager
  - security-engineer
---

# Skill: AgTeamOS Task Tracking

## CONTRACT
- **Input**: Ticket validado (DoR passed) + branch creada
- **Output**: `agteamos/changes/<id>-<slug>/` con tracking completo
- **Regla**: Cada step completado se documenta inmediatamente — no al final

## ESTRUCTURA DE CARPETA POR TAREA

Árbol canónico — el mismo que usan `agteamos-new-task` y `agteamos-implement`
para crear y referenciar esta carpeta. Si alguna de esas skills muestra un
árbol distinto, es una divergencia a corregir, no una variante válida.

```
agteamos/changes/42-email-notifications/
├── task.yml                            ← metadatos estructurados (ver mas abajo)
├── brief.md                            ← input original del usuario, problema, solucion
│                                          propuesta y out-of-scope ORIGINAL. Inmutable salvo
│                                          su seccion "## Resolution notes" (append-only).
│                                          Solo si schema: full — lo crea agteamos-new-task
│                                          Step 3. Con schema: lite no se crea (el resumen de
│                                          1 parrafo vive en progress.md — ver agteamos-sdd-protocol)
├── progress.md                         ← tracking principal (ex TASK-<id>.md)
├── report.html                         ← reporte visual, generado/regenerado por agteamos-dashboard
├── verify-report.md                    ← aparece recien en el cierre (agteamos-close-task, paso
│                                          "verify") — no existe durante la implementacion
├── evidence/                           ← screenshots QA y reportes
│   ├── e2e-login-flow.png
│   ├── e2e-email-sent.png
│   ├── e2e-error-state.png
│   └── a11y-audit.png
└── specs/                              ← SDD artifacts (solo si schema: full)
    ├── requirements.md
    ├── design.md
    ├── tasks.md
    └── deltas/
        └── notifications.md
```

## `task.yml` — CAPTURA AUTOMATICA DE OWNER (sin preguntar)

Al crear la carpeta de la tarea (primera vez que se ejecuta esta skill sobre
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
retoma una tarea existente en una sesión nueva, `agteamos-implement` repite
el mismo chequeo (`git config user.name` vs `owner.name`) en su Step 1, antes
de releer el ticket — ver esa skill para el sub-paso exacto. Es el mismo
mecanismo, aplicado en dos momentos distintos del ciclo de vida de la tarea.

```yaml
# agteamos/changes/42-email-notifications/task.yml
id: "42"
title: "Add email notifications"
type: feature              # feature | bug | hotfix | refactor | spike
schema: full                # full | lite — ver skill agteamos-sdd-protocol
context_tier: 2             # 1 | 2 | 3 — ver "CONTEXT TIERS" en agteamos-implement.
                             # Lo fija agteamos-new-task al crear la tarea (segun schema +
                             # complejidad). agteamos-implement puede SUBIRLO (nunca bajarlo)
                             # si descubre que la tarea es mas compleja de lo previsto,
                             # dejando el motivo como fila en "Decisions Made" de progress.md
layer: fullstack            # frontend | backend | fullstack | infra
priority: medium            # critical | high | medium | low
status: in_progress         # pending | in_progress | in_review | done
branch: feature/42-email-notifications
platform: github            # github | azure
ticket_url: https://github.com/org/repo/issues/42
domains: [notifications]    # dominios de spec afectados (uno o mas)
doc_impact: true             # si false, agteamos-close-task salta el paso de docs. Default true.
created: 2026-08-09
updated: 2026-08-09
owner:                      # capturado automaticamente via git config, NUNCA preguntado
  name: "Eddy Bereguete"
  email: "ebereguete@phoenixcalibrationdr.com"
handoffs: []                # se agrega una entrada si otra persona retoma la tarea:
                             # - { name: "Maria Gonzalez", email: "maria@acme.com", date: 2026-08-10 }
assigned_to:                 # agentes de IA que intervinieron (distinto de owner)
  - backend-engineer
  - frontend-engineer
  - qa-engineer
depends_on: []
```

## TEMPLATE DE `progress.md` (ex `TASK-<id>.md`)

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

## REGLAS OBLIGATORIAS

### Para desarrolladores (@backend-engineer, @frontend-engineer)

1. **Unit tests son OBLIGATORIOS** por cada pieza funcional implementada:
   - Minimo 3 tests: happy path + error case + edge case
   - Tests deben pasar ANTES de marcar step como completado
   - Documentar cada test en la tabla "Unit Tests Written"

2. **Documentar archivos modificados** en la tabla "Files Modified" inmediatamente

3. **Documentar decisiones tecnicas** en "Decisions Made" cuando:
   - Se elige una libreria sobre otra
   - Se cambia el approach respecto al design.md
   - Se encuentra una limitacion no prevista

### Para QA (@qa-engineer)

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

### Para checkpoints (todos)

1. Actualizar "Last checkpoint" timestamp cada vez que se completa un step
2. Mantener "Next Action" siempre actualizado — es lo primero que lee un agente que resume
3. El "Next Action" debe ser lo suficientemente detallado para que un agente sin contexto previo sepa exactamente que hacer
4. Actualizar `updated:` en `task.yml` en cada checkpoint

### Regenerar el reporte visual de la tarea

Cada vez que se actualiza `progress.md` y/o `task.yml`, invocar la skill
`agteamos-dashboard` para regenerar `report.html` dentro de la carpeta de la
tarea (`agteamos/changes/<id>-<slug>/report.html`). Esta skill (`agteamos-task-tracking`)
solo mantiene los datos de origen (`progress.md`, `task.yml`, `evidence/`) —
la generación del HTML vive en `agteamos-dashboard`, para no duplicar esa
lógica en cada skill que toca el tracking.

## ANTI-PATTERNS

- **No documentar al final** — documentar en cada paso, no al terminar
- **No omitir tests por "es un cambio simple"** — todo cambio tiene tests
- **No screenshots genericos** — cada screenshot muestra un paso/estado especifico
- **No dejar "Next Action" vacio** — si los tokens se cortan, el siguiente agente esta ciego
- **No preguntarle al usuario quién es** — `owner` se captura siempre vía `git config`, nunca con una pregunta (salvo el fallback de último recurso si `git config` está vacío)
- **No sobreescribir `owner` cuando cambia de persona** — usar `handoffs:`, `owner` es inmutable una vez creada la tarea
- **No mostrar `owner: {name: null, email: null}` en ningún ejemplo** — ni en esta skill ni en `agteamos-new-task` / `agteamos-implement`. La captura es automática e inmediata en el momento en que se crea `task.yml`; un ejemplo con `null` contradice el propio contrato de esta skill
- **No dejar `context_tier` sin escribir en `task.yml`** — si la elección del tier queda solo en la cabeza del agente de esa sesión, no es auditable ni planificable entre sesiones. Se escribe siempre, y solo sube, nunca baja
- **No olvidar regenerar `report.html`** — un dashboard desactualizado hace que el reporte general (`agteamos/dashboard.html`) muestre datos viejos
