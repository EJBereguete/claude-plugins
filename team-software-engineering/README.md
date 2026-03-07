# 🤖 team-software-engineering

> Plugin de Claude Code que simula un equipo completo de ingeniería de software.
> Desde la idea del CEO hasta el deploy en producción, con 6 agentes especializados
> que colaboran siguiendo un flujo de ramas profesional y real.

---

## ¿Qué hace este plugin?

Convierte a Claude Code en un equipo de ingeniería completo. En lugar de pedirle
a Claude que haga todo, el plugin orquesta 6 agentes especializados que trabajan
juntos de la misma forma que lo haría un equipo real:

- El **Architect** diseña la solución técnica antes de escribir una línea de código
- El **PM** crea los issues en GitHub con criterios de aceptación claros
- **Backend** y **Frontend** implementan en paralelo con tests unitarios
- **QA** revisa los PRs, ejecuta tests E2E y aprueba antes de subir a staging
- **DevOps** verifica el CI, despliega y hace rollback si algo falla

Todo con branches reales en GitHub, PRs reales, issues reales y GitHub Actions.

---

## Instalación

### Desde el marketplace (recomendado)

```bash
# En Claude Code
/plugin marketplace add https://github.com/EJBereguete/claude-plugins
/plugin install team-software-engineering@team-plugins
```

### Verificar instalación

```bash
/plugin list
# → team-software-engineering · team-plugins · ✓ enabled
```

---

## Flujo de ramas

El equipo trabaja con 4 ramas permanentes:

```
main        → producción (solo DevOps puede mergear aquí)
staging     → pre-producción (CI corre tests automáticos aquí)
testing     → territorio de QA (recibe los PRs de los developers)
feature/*   → donde backend y frontend implementan (se crean desde main)
```

### Ciclo de vida de una feature

```
CEO plantea idea
  → @architect diseña la solución
    → @pm crea issues en GitHub
      → @backend-engineer y @frontend-engineer
          crean feature/* desde main
          implementan + tests unitarios
          abren PR → testing
        → @qa-engineer
            revisa PRs en testing
            ejecuta tests E2E
            si aprueba → backend/frontend abren PR → staging
          → GitHub Actions corre tests en staging
            → @devops-engineer
                verifica CI
                smoke tests en staging
                merge staging → main
                smoke tests en producción
                ✅ Feature en producción
```

### Flujo de errores

```
DevOps detecta fallo en staging/producción
  → rollback automático
  → notifica a @qa-engineer con los logs
    → @qa-engineer analiza y notifica a @pm
      → @pm crea issue de corrección
        → backend o frontend crea feature/fix-* desde main
          → mismo ciclo desde el principio
```

---

## Comandos

### `/sprint` — El comando principal

Punto de entrada para una feature completa de principio a fin.
El equipo entero colabora para convertir una idea en código deployado.

```bash
/team-software-engineering:sprint Sistema de facturación con exportación a PDF
/team-software-engineering:sprint Autenticación con Google OAuth
/team-software-engineering:sprint Dashboard de métricas en tiempo real
```

El sprint se detiene en cada fase y pide confirmación antes de continuar.

---

### `/setup-repo` — Configuración inicial del repositorio

Ejecuta esto **una sola vez** cuando empiezas un proyecto nuevo.
Configura todo lo necesario para que el equipo funcione.

```bash
/team-software-engineering:setup-repo
```

Crea:
- Ramas `testing` y `staging` en GitHub
- Labels del equipo (`backend`, `frontend`, `qa`, `ready-for-qa`, `priority:*`, etc.)
- GitHub Actions para CI en testing/staging y deploy a producción

---

### `/plan` — Planificación sin implementación

Solo el @architect y el @pm trabajan. Útil para planificar antes de comprometerse.

```bash
/team-software-engineering:plan Módulo de suscripciones con Stripe
```

Produce: diseño técnico + issues en GitHub listos para que el equipo empiece.

---

### `/design` — Diseño de arquitectura

Solo el @architect. Para decisiones técnicas puntuales sin crear issues.

```bash
/team-software-engineering:design ¿Cómo manejar uploads de archivos grandes?
/team-software-engineering:design Estrategia de caché para el dashboard
```

---

### `/build-api` — Implementación de backend

Solo el @backend-engineer. Para implementar un endpoint, migración o servicio específico.

```bash
/team-software-engineering:build-api POST /invoices con generación de PDF
/team-software-engineering:build-api Migración para agregar tabla de subscriptions
/team-software-engineering:build-api Webhook handler para eventos de Stripe
```

---

### `/build-ui` — Implementación de frontend

Solo el @frontend-engineer. Para implementar componentes, páginas o integraciones.

```bash
/team-software-engineering:build-ui Formulario de pago con validación en tiempo real
/team-software-engineering:build-ui Dashboard con gráficas de métricas
/team-software-engineering:build-ui Modal de confirmación reutilizable
```

---

### `/review` — Code review y QA

El @qa-engineer revisa código o PRs con las 6 dimensiones de calidad.

```bash
/team-software-engineering:review #42
/team-software-engineering:review src/api/routes/invoices.py
/team-software-engineering:review src/components/PaymentForm.tsx
```

Analiza: correctitud, seguridad, tests, performance, mantenibilidad y criterios de aceptación.

---

### `/deploy` — Deploy de un servicio

El @devops-engineer prepara o ejecuta el deploy.

```bash
/team-software-engineering:deploy api-service
/team-software-engineering:deploy frontend production
```

Verifica CI, hace smoke tests en staging, mergea a main y monitorea producción.

---

### `/debug` — Debugging colaborativo

Múltiples agentes analizan un error desde distintas perspectivas.

```bash
/team-software-engineering:debug Error 500 en /api/invoices al generar PDF
/team-software-engineering:debug Memory leak en el worker de Celery
```

---

### `/audit` — Auditoría completa del proyecto

Revisión integral del estado del proyecto.

```bash
/team-software-engineering:audit
```

Revisa: seguridad, deuda técnica, cobertura de tests, configuración de CI/CD,
dependencias desactualizadas y calidad general del código.

---

## Agentes

### 🏛️ Architect (`@architect`)

Diseña sistemas antes de que se escriba código. Produce decisiones técnicas
documentadas y claras para que el equipo las ejecute sin ambigüedad.

**Cuándo usarlo:** Al empezar algo nuevo, ante decisiones técnicas importantes,
o cuando hay que evaluar trade-offs de arquitectura.

**Skills:** `code-architecture`, `security-checklist`, `git-workflow`,
`performance-optimization`, `env-configuration`

---

### 📋 PM (`@pm`)

Convierte decisiones técnicas en GitHub Issues accionables. Escribe criterios
de aceptación verificables y mantiene el flujo del equipo cuando algo falla.

**Cuándo usarlo:** Para crear issues, priorizar el backlog, gestionar el sprint,
o coordinar cuando hay bloqueos o bugs.

**Skills:** `git-workflow`

---

### ⚙️ Backend Engineer (`@backend-engineer`)

Implementa APIs, lógica de negocio, migraciones y servicios. Siempre entrega
código con tests unitarios y PR hacia `testing`.

**Compatible con:** Python (FastAPI, Django), C#/.NET, Node.js (Express, NestJS),
PostgreSQL, MySQL, Redis, SQLAlchemy, Prisma, Entity Framework.

**Skills:** `api-design`, `db-migrations`, `security-checklist`, `git-workflow`,
`error-handling`, `logging-observability`, `performance-optimization`,
`docker-containers`, `env-configuration`

---

### 🎨 Frontend Engineer (`@frontend-engineer`)

Implementa interfaces, componentes, formularios e integraciones con APIs.
Siempre entrega código con tests unitarios y PR hacia `testing`.

**Compatible con:** React, Vue, Angular, Blazor, Razor, MAUI, TypeScript,
Tailwind, Zustand, Pinia, React Query, Vitest.

**Skills:** `frontend-patterns`, `security-checklist`, `git-workflow`,
`error-handling`, `performance-optimization`, `env-configuration`

---

### 🧪 QA Engineer (`@qa-engineer`)

Dueño del branch `testing`. Revisa PRs, ejecuta tests unitarios y E2E,
aprueba o rechaza cambios. Nada sale de testing sin su visto bueno.

**Frameworks E2E:** usa el que el proyecto ya tenga — Playwright, Selenium,
Cypress, Puppeteer, WebdriverIO. Si es proyecto nuevo, elige el más adecuado.

**Skills:** `testing-strategy`, `security-checklist`, `git-workflow`, `code-review`

---

### 🚀 DevOps Engineer (`@devops-engineer`)

Opera staging → main. Verifica CI, hace smoke tests, deploya y ejecuta rollback
si algo falla. Notifica a QA cuando hay problemas post-staging.

**Compatible con:** Cloud Run, Vercel, Railway, Fly.io, VPS con Docker,
GitHub Actions, cualquier plataforma de hosting.

**Skills:** `devops-workflows`, `security-checklist`, `git-workflow`,
`logging-observability`, `docker-containers`, `env-configuration`

---

## Skills (14 en total)

Las skills son bases de conocimiento que los agentes consultan automáticamente
según el contexto de la tarea. No las invocas tú — el agente las usa cuando
las necesita.

| Skill | Qué aporta | Agentes que la usan |
|-------|-----------|---------------------|
| `code-architecture` | Patrones SOLID, Clean Architecture, ADRs | Architect |
| `api-design` | REST conventions, OpenAPI, versionado, paginación | Backend |
| `db-migrations` | Migraciones seguras, rollback, índices, Alembic/Prisma | Backend |
| `frontend-patterns` | Componentes, estado, formularios, accesibilidad | Frontend |
| `testing-strategy` | Unit, integration, E2E, cobertura mínima, mocks | QA |
| `devops-workflows` | CI/CD, pipelines, rollout, rollback, SLOs | DevOps |
| `security-checklist` | OWASP top 10, auth, secrets, SQL injection | Backend, Frontend, QA, DevOps |
| `git-workflow` | Branch strategy, conventional commits, PR template | Todos |
| `error-handling` | Jerarquía de errores, HTTP mapping, error boundaries | Backend, Frontend |
| `logging-observability` | Structured logging, Sentry, healthchecks, request ID | Backend, DevOps |
| `performance-optimization` | N+1 queries, índices, caché, bundle size, virtualización | Backend, Frontend |
| `docker-containers` | Multi-stage Dockerfiles, docker-compose, healthchecks | Backend, DevOps |
| `env-configuration` | .env structure, Pydantic Settings, Zod, GitHub Secrets | Backend, Frontend, DevOps |
| `code-review` | 6-dimension review, comentarios estructurados, criterios de aprobación | QA |

---

## MCPs integrados

El plugin incluye 5 MCP servers que los agentes usan directamente:

| MCP | Para qué lo usan los agentes |
|-----|------------------------------|
| **github** | Crear issues, PRs, labels, milestones, comentar, aprobar |
| **context7** | Consultar documentación actualizada de frameworks y librerías |
| **playwright** | Ejecutar tests E2E directamente desde el agente QA |
| **filesystem** | Explorar la estructura del proyecto antes de escribir código |
| **postgres** | Inspeccionar el esquema, validar migraciones, ejecutar queries |

> Los MCPs requieren configurar las variables de entorno correspondientes
> (`GITHUB_TOKEN`, `DATABASE_URL`). Ver `.mcp.json` para los detalles.

---

## Hooks de seguridad

El plugin incluye hooks que se ejecutan automáticamente antes de ciertos comandos:

- **Bloquea SQL destructivo** — previene `DROP TABLE`, `TRUNCATE` y `DELETE` sin `WHERE`
  antes de ejecutarlos sin confirmación
- **Detecta secrets hardcodeados** — alerta si detecta patrones de API keys,
  passwords o tokens en el código antes de un commit

---

## Estructura del plugin

```
team-software-engineering/
├── .claude-plugin/
│   └── plugin.json                    # Manifiesto — v3.3.0
├── .mcp.json                          # 5 MCP servers configurados
├── agents/
│   ├── architect.md
│   ├── pm.md
│   ├── backend-engineer.md
│   ├── frontend-engineer.md
│   ├── qa-engineer.md
│   └── devops-engineer.md
├── commands/
│   ├── sprint.md                      # Flujo completo end-to-end
│   ├── setup-repo.md                  # Configuración inicial del repo
│   ├── plan.md                        # Planificación sin implementar
│   ├── design.md                      # Arquitectura puntual
│   ├── build-api.md                   # Implementación backend
│   ├── build-ui.md                    # Implementación frontend
│   ├── review.md                      # Code review y QA
│   ├── deploy.md                      # Deploy a producción
│   ├── debug.md                       # Debugging colaborativo
│   └── audit.md                       # Auditoría del proyecto
├── skills/
│   ├── code-architecture/SKILL.md
│   ├── api-design/SKILL.md
│   ├── db-migrations/SKILL.md
│   ├── frontend-patterns/SKILL.md
│   ├── testing-strategy/SKILL.md
│   ├── devops-workflows/SKILL.md
│   ├── security-checklist/SKILL.md
│   ├── git-workflow/SKILL.md
│   ├── error-handling/SKILL.md
│   ├── logging-observability/SKILL.md
│   ├── performance-optimization/SKILL.md
│   ├── docker-containers/SKILL.md
│   ├── env-configuration/SKILL.md
│   └── code-review/SKILL.md
├── hooks/
│   └── hooks.json
└── README.md
```

---

## Actualizar el plugin

```bash
/plugin marketplace update team-plugins
/plugin list  # verificar versión
```

---

## Autor

**EJBereguete** — [github.com/EJBereguete](https://github.com/EJBereguete)

Plugin versión `3.3.0`
