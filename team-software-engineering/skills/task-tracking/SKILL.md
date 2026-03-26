---
name: task-tracking
description: >
  Crea y mantiene la documentacion local de cada tarea en /docs/tasks/active/.
  Incluye checkpoints para resumir si los tokens se agotan, progress log,
  archivos modificados y decisiones tomadas. Los desarrolladores documentan
  unit tests y el QA guarda screenshots como evidencia.
used_by:
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - project-manager
  - security-engineer
---

# Skill: Task Tracking

## CONTRACT
- **Input**: Ticket validado (DoR passed) + branch creada
- **Output**: /docs/tasks/active/TASK-<id>-<slug>/ con tracking completo
- **Regla**: Cada step completado se documenta inmediatamente — no al final

## ESTRUCTURA DE CARPETA POR TAREA

```
/docs/tasks/active/TASK-42-email-notifications/
├── TASK-42-email-notifications.md     ← tracking principal
├── evidence/                           ← screenshots QA y reportes
│   ├── e2e-login-flow.png
│   ├── e2e-email-sent.png
│   ├── e2e-error-state.png
│   └── a11y-audit.png
└── specs/                              ← SDD artifacts
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

## TEMPLATE DEL TASK FILE

```markdown
# TASK-<id>: <titulo>

| Campo | Valor |
|-------|-------|
| **Status** | IN_PROGRESS (40%) |
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
- **Time**: 2026-03-25 10:00

### Step 2: Backend implementation [COMPLETED] ✅
- Created: src/notifications/service.py (NotificationService)
- Created: src/notifications/schemas.py (SendEmailRequest, EmailTemplate)
- Created: src/notifications/router.py (POST /api/notifications/send)
- Modified: src/core/dependencies.py (added NotificationService DI)
- **Decision**: Used SendGrid SDK over raw SMTP — better deliverability + tracking
- **Time**: 2026-03-25 10:45

### Step 3: Unit Tests [COMPLETED] ✅
- Created: src/tests/test_notification_service.py
  - test_send_welcome_email_success (happy path)
  - test_send_email_invalid_recipient_returns_error (error case)
  - test_send_email_rate_limited (edge case — max 10/min/user)
  - test_send_reset_password_email_contains_token (integration)
- Results: 4 passed, 0 failed
- Coverage: 92% on new code
- **Time**: 2026-03-25 11:15

### Step 4: Frontend integration [IN_PROGRESS] 🔄
- Created: src/components/NotificationBadge.tsx
- TODO: Connect to API
- TODO: Write component tests
- **Time**: 2026-03-25 11:30

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
     path: 'docs/tasks/active/TASK-42-email-notifications/evidence/e2e-login-flow.png',
     fullPage: true
   });
   ```

2. Documentar cada screenshot en la tabla "Evidence (QA Screenshots)"

3. Si un test falla, guardar screenshot del estado de fallo

### Para checkpoints (todos)

1. Actualizar "Last checkpoint" timestamp cada vez que se completa un step
2. Mantener "Next Action" siempre actualizado — es lo primero que lee un agente que resume
3. El "Next Action" debe ser lo suficientemente detallado para que un agente sin contexto previo sepa exactamente que hacer

## ANTI-PATTERNS

- **No documentar al final** — documentar en cada paso, no al terminar
- **No omitir tests por "es un cambio simple"** — todo cambio tiene tests
- **No screenshots genericos** — cada screenshot muestra un paso/estado especifico
- **No dejar "Next Action" vacio** — si los tokens se cortan, el siguiente agente esta ciego
