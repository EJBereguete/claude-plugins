# Estructura de Carpetas

El plugin crea y gestiona carpetas específicas dentro de tu proyecto para persistir documentación, tracking y evidencia. Esta estructura es la fuente de verdad que todos los agentes consultan en cada sesión.

## Estructura completa generada

```
tu-proyecto/
├── docs/                              ← Creado por repo-context-check
│   │
│   ├── 01-architecture/
│   │   ├── PROJECT_CONTEXT.md         ← Stack, patrones, convenciones detectadas
│   │   ├── ARCHITECTURE.md            ← Decisiones de arquitectura general
│   │   └── adr/                       ← Architecture Decision Records
│   │       ├── ADR-001-database-choice.md
│   │       ├── ADR-002-auth-strategy.md
│   │       └── ADR-003-cloud-platform.md
│   │
│   ├── 02-api/
│   │   ├── openapi.yml                ← Endpoints encontrados en el código
│   │   └── endpoints.md               ← Catálogo legible de endpoints
│   │
│   ├── 03-ui-ux/
│   │   └── DESIGN_SYSTEM.md           ← Tokens extraídos de CSS/Tailwind/theme
│   │
│   ├── 04-devops/
│   │   └── INFRASTRUCTURE.md          ← Entornos, CI/CD, variables detectadas
│   │
│   ├── 05-security/                   ← Notas de seguridad y threat models
│   │
│   ├── 06-incidents/                  ← Post-mortems e incidentes
│   │
│   ├── 07-decisions/
│   │   └── decision-log.md            ← Log cronológico de decisiones técnicas
│   │
│   └── tasks/
│       ├── active/
│       │   └── TASK-42-email-notifications/
│       │       ├── TASK-42-email-notifications.md   ← Tracking file con Next Action
│       │       ├── evidence/                         ← Screenshots de QA
│       │       │   ├── e2e-login-flow.png
│       │       │   ├── e2e-email-sent.png
│       │       │   └── e2e-error-state.png
│       │       └── specs/                            ← SDD artifacts
│       │           ├── requirements.md
│       │           ├── design.md
│       │           └── tasks.md
│       └── completed/                               ← Archivadas tras task-closure
│           └── TASK-001-jwt-auth/
│               └── [misma estructura]
│
└── [tu código aquí]
```

## ¿Qué genera cada skill/agente?

### repo-context-check genera:
Cuando el proyecto tiene código pero no tiene `/docs`:

- `docs/01-architecture/PROJECT_CONTEXT.md` — detectando el stack desde `package.json`, `pyproject.toml`, `*.csproj`, estructura de carpetas
- `docs/02-api/openapi.yml` — escaneando routers, controllers, decorators
- `docs/03-ui-ux/DESIGN_SYSTEM.md` — leyendo `tailwind.config.js`, archivos CSS, theme providers
- `docs/04-devops/INFRASTRUCTURE.md` — leyendo `Dockerfile`, `docker-compose.yml`, workflows de GitHub Actions
- `docs/tasks/active/` y `docs/tasks/completed/` — estructura vacía lista para usar

### SDD Protocol genera (por tarea):
En `docs/tasks/active/TASK-{id}-{slug}/specs/`:
- `requirements.md` — Product Owner
- `design.md` — Architect
- `tasks.md` — Project Manager

### task-tracking genera:
En `docs/tasks/active/TASK-{id}-{slug}/`:
- `TASK-{id}-{slug}.md` — tracking file con progress log, unit tests, evidencia y Next Action
- `task.yml` — metadata estructurada en YAML

### QA Engineer genera:
- Screenshots en `docs/tasks/active/TASK-{id}-{slug}/evidence/` usando Playwright:
  ```typescript
  await page.screenshot({
    path: 'docs/tasks/active/TASK-42-email-notifications/evidence/e2e-login-flow.png',
    fullPage: true
  });
  ```

### adr-management genera:
En `docs/01-architecture/adr/`:
- `ADR-{NNN}-{slug}.md` — cada decisión arquitectónica importante

### task-closure archiva:
Mueve `docs/tasks/active/TASK-{id}/` → `docs/tasks/completed/TASK-{id}/`
Limpia la branch del feature y cierra el ticket en GitHub/Azure DevOps.

## Formato del PROJECT_CONTEXT.md

Este es el archivo más importante del directorio `/docs`. Todos los agentes lo leen antes de cualquier acción:

```markdown
# Project Context

**Generated**: 2026-03-31 (auto-detected via repo-context-check)
**Stack**: Python 3.12 + FastAPI 0.115 + PostgreSQL 16 + React 19 + TypeScript 5.7
**Architecture**: Monorepo, Clean Architecture (backend), Component-based (frontend)

## Backend
- Framework: FastAPI 0.115
- ORM: SQLAlchemy 2.0 + Alembic migrations
- Auth: JWT via python-jose + passlib[bcrypt]
- Entry point: src/main.py
- Patterns detected: Repository pattern, Service layer, Pydantic DTOs

## Frontend
- Framework: React 19 + Vite 6
- State: Zustand
- Styling: Tailwind CSS 4
- Entry point: frontend/src/main.tsx
- Testing: Vitest + Testing Library

## Database
- PostgreSQL 16
- Migrations: Alembic (alembic/versions/)
- Tables detected: users, organizations, invoices, payments

## Infrastructure
- Docker: docker-compose.yml (dev), Dockerfile (prod multistage)
- CI/CD: GitHub Actions (.github/workflows/ci.yml)
- Deploy target: Google Cloud Run
- Monitoring: Sentry, UptimeRobot

## Environment Variables Required
- DATABASE_URL
- JWT_SECRET_KEY
- SENDGRID_API_KEY
- GOOGLE_CLIENT_ID

## Coding Conventions
- Conventional Commits (feat, fix, chore, test, refactor, docs)
- Branch naming: feature/{id}-{slug}, bugfix/{id}-{slug}
- Python: type hints en todas las funciones, async/await
- TypeScript: interfaces explícitas, no `any`
```

## Formato del ADR

```markdown
# ADR-002: Autenticación con JWT + Refresh Tokens

**Status**: Accepted
**Date**: 2026-03-31
**Author**: @architect

## Contexto
El sistema necesita autenticación stateless compatible con Cloud Run (sin sesiones de servidor).

## Decisión
Implementar JWT access tokens (15 min) + refresh tokens (7 días) almacenados en httpOnly cookies.

## Alternativas evaluadas
- Session-based auth (descartada: no compatible con multi-instancia en Cloud Run)
- OAuth2 solo con Google (descartada: necesitamos auth con email también)
- API Keys (descartada: no hay rotación automática por usuario)

## Consecuencias
- Positivo: Stateless, escalable horizontalmente
- Positivo: Refresh tokens permiten UX sin re-login frecuente
- Negativo: Revocación de tokens requiere blacklist en Redis (complejidad adicional)
- Mitigación: Token de 15 min limita el daño si se compromete
```

## Reglas de la carpeta /docs

1. **Siempre existe** — si no existe, `repo-context-check` la crea por ingeniería inversa antes de cualquier tarea
2. **Es la fuente de verdad** — los agentes leen `/docs` antes de cualquier acción; nunca asumen el estado del proyecto
3. **Se actualiza con cada tarea** — cada cambio significativo queda documentado
4. **Control de versiones** — todo en `/docs` va a git (excepto datos sensibles como screenshots que superan el tamaño límite)
5. **Las specs van en la carpeta de la tarea** — `docs/tasks/active/TASK-XXX/specs/`, no en la raíz de `/docs`

## Naming conventions

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Task ID | `TASK-{número}` | `TASK-42` |
| Task folder | `TASK-{id}-{slug}` | `TASK-42-email-notifications` |
| Task file | `TASK-{id}-{slug}.md` | `TASK-42-email-notifications.md` |
| ADR | `ADR-{NNN}-{slug}.md` | `ADR-003-cloud-platform.md` |
| Evidence | `{flujo}-{estado}.png` | `e2e-login-success.png` |
| Branch (GitHub) | `feature/{id}-{slug}` | `feature/42-email-notifications` |
| Branch (Azure) | `feature/AB{id}-{slug}` | `feature/AB1234-email-notifications` |
