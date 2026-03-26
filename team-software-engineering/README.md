# team-software-engineering v5.0.0

> Plugin de Claude Code que simula un equipo completo de ingeniería de élite.
> **9 agentes** · **47 skills** · **3 flujos inteligentes** · **SDD + Context Engineering**

---

## El flujo completo de un vistazo

```mermaid
graph TD
    U([👤 Usuario]) -->|cualquier solicitud| A

    A["🏛️ @architect<br/>(punto de entrada)"]
    A --> RC["⚙️ Step 0<br/>repo-context-check"]
    RC --> FR["🔀 Step 1<br/>flow-router"]

    FR -->|"repo vacío"| F1["📦 FLUJO 1<br/>project-from-scratch"]
    FR -->|"lenguaje natural"| F2["✏️ FLUJO 2<br/>new-task"]
    FR -->|"#42, URL, AB#1234"| F3["🎫 FLUJO 3<br/>task-from-ticket"]

    F1 -->|"hand-off automático"| F2
    F2 -->|"crea ticket + hand-off"| F3

    F3 --> DONE["✅ PR mergeado<br/>ticket cerrado<br/>docs archivados"]

    style U fill:#4F46E5,color:#fff
    style A fill:#7C3AED,color:#fff
    style F1 fill:#059669,color:#fff
    style F2 fill:#D97706,color:#fff
    style F3 fill:#DC2626,color:#fff
    style DONE fill:#065F46,color:#fff
```

---

## Step 0 — repo-context-check

**Se ejecuta SIEMPRE, antes de cualquier otra cosa.**

```mermaid
graph TD
    START([Repositorio actual]) --> Q1{"¿Tiene archivos<br/>de código?<br/>.py .ts .cs .go..."}

    Q1 -->|NO| F1["→ FLUJO 1<br/>Proyecto desde cero"]

    Q1 -->|SÍ| Q2{"¿Existe<br/>/docs con<br/>contenido?"}

    Q2 -->|SÍ| Q3{"¿Hay tareas<br/>activas en<br/>/docs/tasks/active/?"}
    Q2 -->|NO| GEN["🔧 Generar /docs<br/>por ingeniería inversa<br/>(no bloquea)"]
    GEN --> Q3

    Q3 -->|SÍ| RESUME["💬 Preguntar al usuario:<br/>'Encontré TASK-42 en progreso.<br/>¿Continúo o empezamos algo nuevo?'"]
    Q3 -->|NO| ROUTER["→ flow-router"]
    RESUME --> ROUTER

    style START fill:#1E40AF,color:#fff
    style F1 fill:#059669,color:#fff
    style GEN fill:#D97706,color:#fff
    style RESUME fill:#7C3AED,color:#fff
    style ROUTER fill:#DC2626,color:#fff
```

### Qué genera si no existe /docs

```
/docs/
├── 01-architecture/
│   ├── PROJECT_CONTEXT.md    ← stack detectado, dependencias, patrones
│   └── adr/                  ← decisiones arquitectónicas registradas
├── 02-api/
│   └── openapi.yml           ← endpoints encontrados en el código
├── 03-design/
│   └── DESIGN_SYSTEM.md      ← tokens extraídos de CSS/Tailwind/theme
├── 04-project/
│   └── BACKLOG.md
├── 05-security/
└── tasks/
    ├── active/               ← tareas en curso
    └── completed/            ← tareas archivadas
```

---

## Step 1 — flow-router

```mermaid
graph TD
    INPUT([Input del usuario]) --> Q1{"¿El input contiene<br/>referencia a ticket?"}

    Q1 -->|"#42<br/>https://github.com/.../issues/42<br/>AB#1234<br/>dev.azure.com/..."| F3

    Q1 -->|No hay referencia| Q2{"¿El repo tiene<br/>código real?"}

    Q2 -->|NO| F1
    Q2 -->|SÍ| F2

    F1["📦 FLUJO 1<br/>project-from-scratch"]
    F2["✏️ FLUJO 2<br/>new-task"]
    F3["🎫 FLUJO 3<br/>task-from-ticket"]

    style F1 fill:#059669,color:#fff
    style F2 fill:#D97706,color:#fff
    style F3 fill:#DC2626,color:#fff
```

**Ejemplos de detección:**

| Input del usuario | Flujo activado |
|-------------------|---------------|
| `"Quiero crear una app de inventarios"` + repo vacío | Flujo 1 |
| `"Agrega notificaciones por email"` + proyecto existente | Flujo 2 |
| `"#42"` o `"issue 42"` | Flujo 3 (GitHub) |
| `https://github.com/user/repo/issues/42` | Flujo 3 (GitHub) |
| `"AB#1234"` | Flujo 3 (Azure DevOps) |

---

## FLUJO 1 — Proyecto desde cero

```mermaid
sequenceDiagram
    actor CEO as 👤 Usuario/CEO
    participant PO as @product-owner
    participant ARC as @architect
    participant UX as @ui-ux-designer
    participant DEV as @devops-engineer
    participant PM as @project-manager

    CEO->>ARC: "Quiero crear un SaaS de facturación"
    ARC->>CEO: clarification-protocol (7 preguntas en un mensaje)
    CEO->>ARC: Respuestas

    ARC->>ARC: Define stack + arquitectura + ADRs
    ARC-->>CEO: ✅ PROJECT_CONTEXT.md + ADR-001, 002, 003

    PO->>PO: Define visión, personas, ACs, roadmap
    PO-->>CEO: ✅ requirements.md + ROADMAP.md

    UX->>CEO: Propone DESIGN_SYSTEM.md
    CEO-->>UX: Aprobación

    DEV->>DEV: Scaffold: dirs, Dockerfile, docker-compose, CI/CD
    DEV-->>CEO: ✅ Repo listo, ramas creadas, pipeline configurado

    PM->>PM: Lee requirements.md, crea issues en GitHub/Azure
    PM-->>CEO: ✅ 5 issues creados, milestone MVP

    ARC-->>PM: Hand-off automático → FLUJO 2 (primera feature)
```

**Resultado al finalizar Flujo 1:**
- `/docs` completamente poblado
- Repo con código skeleton que compila
- `docker-compose up` funciona
- CI/CD configurado y pasando
- Backlog inicial en GitHub/Azure

---

## FLUJO 2 — Tarea nueva sin ticket

```mermaid
sequenceDiagram
    actor CEO as 👤 Usuario/CEO
    participant PO as @product-owner
    participant ARC as @architect
    participant UX as @ui-ux-designer
    participant PM as @project-manager

    CEO->>ARC: "Quiero agregar notificaciones por email"

    Note over ARC: clarification-protocol
    ARC->>CEO: "3-5 preguntas focalizadas:<br/>¿qué eventos? ¿proveedor? ¿templates?"
    CEO->>ARC: Respuestas

    ARC->>PO: Contexto completo
    PO->>PO: Escribe specs/requirements.md<br/>con ACs en Given/When/Then
    PO-->>CEO: "¿Apruebas estos criterios?"
    CEO-->>PO: ✅ Aprobado

    ARC->>ARC: Analiza capas impactadas<br/>Escribe specs/design.md
    ARC-->>CEO: "¿Apruebas el diseño técnico?"
    CEO-->>ARC: ✅ Aprobado

    alt Feature toca Frontend
        UX->>CEO: Presenta wireframe/mockup
        CEO-->>UX: ✅ Aprobado (MANDATORIO antes de codear)
    end

    Note over PM: story-breakdown (INVEST check)
    PM->>PM: ¿Es XL? → split en subtareas<br/>Crea ticket(s) en GitHub/Azure<br/>Escribe specs/tasks.md

    PM-->>ARC: Hand-off automático → FLUJO 3
```

**SDD Checkpoints en Flujo 2:**

```
requirements.md  →  [CEO aprueba ACs]  →  design.md  →  [CEO aprueba diseño]  →  tasks.md  →  FLUJO 3
```

---

## FLUJO 3 — Tarea desde ticket existente

```mermaid
sequenceDiagram
    actor CEO as 👤 Usuario/CEO
    participant ARC as @architect
    participant BE as @backend-engineer
    participant FE as @frontend-engineer
    participant SEC as @security-engineer
    participant QA as @qa-engineer
    participant PM as @project-manager

    CEO->>ARC: "#42" o URL de ticket

    ARC->>ARC: Lee ticket via MCP github/azure-devops
    Note over ARC: definition-of-ready check
    alt Ticket incompleto
        ARC->>CEO: Preguntas para completar el ticket
        CEO->>ARC: Respuestas
    end

    Note over ARC: story-breakdown (INVEST)
    alt Ticket es L/XL
        ARC->>PM: Split en subtareas
        PM->>PM: Crea sub-issues
    end

    PM->>PM: Inicializa /docs/tasks/active/TASK-42/
    PM->>PM: Crea task.yml + TASK-42.md
    PM->>PM: git checkout -b feature/42-email-notifications

    ARC->>ARC: Escribe specs/design.md
    ARC-->>CEO: "¿Apruebas el diseño técnico?"
    CEO-->>ARC: ✅ Aprobado

    par Backend (si aplica)
        BE->>BE: Implementa + unit tests (mín 3)
        BE->>BE: Documenta en TASK-42.md
    and Frontend (si aplica)
        FE->>FE: Implementa + component tests
        FE->>FE: Documenta en TASK-42.md
    end

    SEC->>SEC: Análisis STRIDE + ASVS checklist

    QA->>QA: Tests E2E con Playwright
    QA->>QA: Screenshots → evidence/
    QA->>QA: Accessibility audit

    Note over PM: task-closure
    PM->>PM: PR con "Closes #42"
    QA-->>PM: ✅ Aprobado con evidencia
    PM->>PM: Merge + cierre ticket + archive TASK-42/
```

---

## SDD — Spec-Driven Development

**El principio:** la especificación es la fuente de verdad. El código es su expresión.

```mermaid
graph LR
    subgraph "SPEC (antes de codear)"
        R["📋 requirements.md<br/>QUÉ<br/>@product-owner"]
        D["🏗️ design.md<br/>CÓMO<br/>@architect"]
        T["📝 tasks.md<br/>CUÁNDO<br/>@project-manager"]
    end

    subgraph "APROBACIONES"
        AR["👤 CEO aprueba<br/>requirements.md"]
        AD["👤 CEO aprueba<br/>design.md"]
    end

    subgraph "IMPLEMENTACIÓN (después)"
        BE["⚙️ @backend-engineer"]
        FE["🎨 @frontend-engineer"]
        QA["🧪 @qa-engineer"]
    end

    R --> AR --> D --> AD --> T
    T --> BE
    T --> FE
    T --> QA

    QA -->|"valida contra"| R

    style R fill:#1E40AF,color:#fff
    style D fill:#7C3AED,color:#fff
    style T fill:#065F46,color:#fff
    style AR fill:#D97706,color:#fff
    style AD fill:#D97706,color:#fff
```

### Los 3 artefactos en detalle

**1. requirements.md** — escrito por `@product-owner`
```markdown
# Feature: Email Notifications

## Objetivo de negocio
Reducir el churn un 15% enviando recordatorios antes de vencimiento.

## User Stories
- Como usuario registrado, quiero recibir un email al completar mi registro,
  para confirmar que mi cuenta fue creada exitosamente.

## Acceptance Criteria
- [ ] Given: usuario completa el registro
  When: hace click en "Crear cuenta"
  Then: recibe email de bienvenida en menos de 60 segundos

## Out of Scope
- Notificaciones push (ticket separado)
- Emails de marketing

## Definition of Done
- [ ] Todos los ACs pasan
- [ ] Unit tests: happy path + error + edge
- [ ] E2E con screenshots como evidencia
- [ ] PR aprobado por QA
```

**2. design.md** — escrito por `@architect`
````markdown
# Design: Email Notifications

## Arquitectura
```mermaid
graph LR
    API[FastAPI] --> SVC[NotificationService]
    SVC --> SG[SendGrid SDK]
    SVC --> DB[(notifications table)]
```

## Modelo de datos
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

## Decisiones técnicas
| Decisión | Alternativas | Razón |
|----------|-------------|-------|
| SendGrid | SMTP, SES | SDK oficial Python, deliverability superior |
| Cola async | Síncrono | No bloquear la respuesta al usuario |
````

**3. tasks.md** — escrito por `@project-manager`
```markdown
# Tasks: Email Notifications
## Branch: feature/42-email-notifications

### Backend (@backend-engineer)
1. [ ] Migration: CREATE TABLE notifications
2. [ ] NotificationService.send_welcome()
3. [ ] NotificationService.send_reset_password()
4. [ ] POST /api/notifications/send (admin)
5. [ ] Unit tests (4 tests mínimo)

### QA (@qa-engineer)
6. [ ] E2E: usuario recibe email en < 60s
7. [ ] Screenshots en evidence/
8. [ ] Accessibility audit
```

---

## Context Engineering — Cómo los agentes no pierden contexto

**El problema:** los modelos de IA tienen ventanas de tokens finitas. Un sprint largo puede requerir múltiples sesiones.

**La solución:** todo el estado vive en archivos, nunca en la conversación.

```mermaid
graph TD
    subgraph "Sesión 1"
        A1["@architect<br/>define diseño"] -->|escribe| D1["specs/design.md"]
        B1["@backend-engineer<br/>implementa BE"] -->|escribe| T1["TASK-42.md<br/>Step 3: COMPLETED ✅<br/>Step 4: IN_PROGRESS 🔄"]
    end

    subgraph "Sesión 2 (tokens agotados)"
        T1 -->|lee| B2["@frontend-engineer<br/>lee Next Action:<br/>'Conectar NotificationBadge<br/>a POST /api/notifications'"]
        B2 -->|escribe| T2["TASK-42.md<br/>Step 4: COMPLETED ✅<br/>Step 5: IN_PROGRESS 🔄"]
    end

    subgraph "Sesión 3"
        T2 -->|lee| Q1["@qa-engineer<br/>lee qué está pendiente<br/>ejecuta E2E + screenshots"]
    end

    style T1 fill:#7C3AED,color:#fff
    style T2 fill:#7C3AED,color:#fff
```

### La carpeta de cada tarea

```
/docs/tasks/active/TASK-42-email-notifications/
│
├── task.yml                    ← metadata estructurada
│   id: "42"
│   status: in_progress
│   branch: feature/42-email-notifications
│   layer: fullstack
│   assigned_to: [backend-engineer, frontend-engineer]
│
├── TASK-42-email-notifications.md   ← ESTADO PERSISTENTE
│   ├── Progress Log (step a step)
│   ├── Files Modified (tabla)
│   ├── Unit Tests Written (tabla)
│   ├── Evidence / Screenshots (tabla)
│   ├── Decisions Made (tabla)
│   └── ⭐ Next Action ← lo primero que lee el agente que retoma
│
├── evidence/
│   ├── e2e-registration-flow.png   ← screenshot obligatorio QA
│   ├── e2e-email-received.png
│   └── e2e-error-state.png
│
└── specs/
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

### El checkpoint protocol

Cada agente actualiza `TASK-42.md` **en cada step**, no al final:

```markdown
## Next Action (si el contexto se resetea)

> Resume point: Step 4 — Frontend integration
> Branch: feature/42-email-notifications (último commit: abc123)
> Ejecutar: git checkout feature/42-email-notifications && git log --oneline -3
> Tarea: Conectar NotificationBadge.tsx a POST /api/notifications/send
> Luego: escribir tests con Testing Library
> Archivo: frontend/src/components/NotificationBadge.tsx (creado, falta integración)
```

### SQUAD_HANDOVER.md — entre agentes

Cuando un agente termina y otro debe continuar:

```markdown
# SQUAD_HANDOVER.md

## Tarea activa
- ID: TASK-42 | Branch: feature/42-email-notifications

## Completado
- [x] DoR check (PASSED)
- [x] design.md aprobado por CEO
- [x] Backend: NotificationService + 4 unit tests (PASSING)
- [x] Endpoint POST /api/notifications/send

## Pendiente
- [ ] Frontend: NotificationBadge component (@frontend-engineer)
- [ ] E2E + screenshots (@qa-engineer)
- [ ] task-closure

## Contexto crítico
- Usamos SendGrid (no SMTP) — ver ADR en design.md
- Rate limit: 10 emails/min/usuario (implementado en service.py:47)
- SENDGRID_API_KEY debe estar en .env
```

---

## Mapa de interacción entre agentes

```mermaid
graph TD
    CEO([👤 CEO / Usuario])

    CEO -->|"idea / ticket / URL"| ARC
    ARC -->|"requirements"| PO
    ARC -->|"diseño aprobado"| BE
    ARC -->|"diseño aprobado"| FE
    ARC -->|"nueva feature"| SEC
    PO -->|"ACs verificados"| CEO
    UX -->|"mockup"| CEO
    CEO -->|"aprobación UI"| UX
    UX -->|"design tokens"| FE
    PM -->|"tickets + tasks.md"| BE
    PM -->|"tickets + tasks.md"| FE
    BE -->|"PR ready-for-qa"| QA
    FE -->|"PR ready-for-qa"| QA
    QA -->|"approved + evidence"| PM
    SEC -->|"STRIDE + ASVS"| PM
    PM -->|"merge + deploy"| DEV
    DEV -->|"smoke tests ✅"| CEO

    ARC["🏛️ @architect<br/>CTO / Entry Point"]
    PO["💎 @product-owner<br/>requirements.md"]
    PM["📋 @project-manager<br/>tickets + tracking"]
    BE["⚙️ @backend-engineer<br/>API + tests"]
    FE["🎨 @frontend-engineer<br/>UI + tests"]
    QA["🧪 @qa-engineer<br/>E2E + screenshots"]
    SEC["🛡️ @security-engineer<br/>STRIDE + ASVS"]
    DEV["🚀 @devops-engineer<br/>deploy + DORA"]
    UX["✏️ @ui-ux-designer<br/>wireframes + tokens"]

    style ARC fill:#7C3AED,color:#fff
    style PO fill:#1E40AF,color:#fff
    style PM fill:#065F46,color:#fff
    style BE fill:#374151,color:#fff
    style FE fill:#374151,color:#fff
    style QA fill:#92400E,color:#fff
    style SEC fill:#7F1D1D,color:#fff
    style DEV fill:#1C1917,color:#fff
    style UX fill:#4C1D95,color:#fff
```

---

## Ciclo de vida completo de una tarea

```mermaid
stateDiagram-v2
    [*] --> Detección: Usuario invoca @architect

    Detección --> Flujo1: repo vacío
    Detección --> Flujo2: lenguaje natural
    Detección --> Flujo3: ticket existente

    Flujo1 --> Flujo2: hand-off automático

    Flujo2 --> Clarificación: clarification-protocol
    Clarificación --> SDD_Req: requirements.md
    SDD_Req --> AprobacionReq: CEO aprueba ACs
    AprobacionReq --> SDD_Design: design.md
    SDD_Design --> AprobacionDesign: CEO aprueba diseño
    AprobacionDesign --> Flujo3: crea ticket + hand-off

    Flujo3 --> DoR: definition-of-ready check
    DoR --> DoR: ticket incompleto → preguntas
    DoR --> Breakdown: ticket válido
    Breakdown --> Breakdown: XL → split en subtareas
    Breakdown --> Tracking: inicializa TASK-folder

    Tracking --> Branch: git checkout -b feature/id-slug
    Branch --> Implementación

    Implementación --> Backend: si capa BE
    Implementación --> Frontend: si capa FE
    Backend --> UnitTests: obligatorios
    Frontend --> ComponentTests: obligatorios
    UnitTests --> Security: STRIDE + ASVS
    ComponentTests --> Security
    Security --> QA

    QA --> E2E: Playwright
    E2E --> Screenshots: evidence/ obligatorios
    Screenshots --> PRReview

    PRReview --> Aprobado: QA approve
    PRReview --> Rechazado: QA request-changes
    Rechazado --> Implementación: fix + re-submit

    Aprobado --> Merge: squash merge
    Merge --> CierreTicket: Closes #id automático
    CierreTicket --> UpdateDocs: actualizar /docs si hubo cambios arch
    UpdateDocs --> Archive: mover TASK a completed/
    Archive --> DoraUpdate: actualizar DORA_METRICS.md
    DoraUpdate --> [*]: ✅ Tarea cerrada
```

---

## Mapa de skills por categoría

```mermaid
mindmap
  root((47 Skills))
    Workflows
      project-from-scratch
      new-task
      task-from-ticket
    Operaciones
      audit-workflow
      build-api-workflow
      build-ui-workflow
      debug-workflow
      deploy-workflow
      fix-workflow
      onboard-workflow
      review-workflow
      improve-skill-workflow
    Protocolo
      repo-context-check
      flow-router
      clarification-protocol
      sdd-protocol
      context-engineering
      context-protocol
      task-tracking
      task-closure
      story-breakdown
      definition-of-ready
    Arquitectura
      code-architecture
      api-design
      safe-refactoring
      code-analysis
      convention-detection
      documentation-skill
      frontend-patterns
      db-migrations
    DevOps y Ops
      devops-workflows
      git-workflow
      dora-metrics
      slo-management
      production-readiness
      pr-standards
    Seguridad
      security-checklist
      threat-modeling
      asvs-checklist
      incident-response
    Calidad
      testing-strategy
      adr-management
      rfc-management
      runbook-management
```

---

## Cómo interactúan las skills entre sí

```mermaid
graph LR
    RC[repo-context-check] --> FR[flow-router]

    FR --> WPS[workflows/project-from-scratch]
    FR --> WNT[workflows/new-task]
    FR --> WTT[workflows/task-from-ticket]

    WNT --> CP[clarification-protocol]
    WNT --> SDD[sdd-protocol]
    WNT --> SB[story-breakdown]
    WNT --> WTT

    WTT --> DoR[definition-of-ready]
    WTT --> SB
    WTT --> TT[task-tracking]
    WTT --> SDD
    WTT --> TC[task-closure]

    SDD --> SDD1["requirements.md<br/>(WHAT)"]
    SDD --> SDD2["design.md<br/>(HOW)"]
    SDD --> SDD3["tasks.md<br/>(WHEN)"]

    TC --> GW[git-workflow]
    TC --> PRS[pr-standards]

    style RC fill:#1E40AF,color:#fff
    style FR fill:#7C3AED,color:#fff
    style SDD fill:#065F46,color:#fff
    style TT fill:#92400E,color:#fff
    style TC fill:#7F1D1D,color:#fff
```

---

## Los 9 agentes y sus skills

| Agente | Modelo | Skills principales | Produce |
|--------|--------|-------------------|---------|
| **@architect** | opus-4 | repo-context-check, flow-router, 3 workflows, adr-management, sdd-protocol | design.md, ADRs, dirección técnica |
| **@product-owner** | sonnet-4 | sdd-protocol, clarification-protocol, story-breakdown | requirements.md, ROADMAP.md |
| **@project-manager** | sonnet-4 | task-tracking, task-closure, story-breakdown, dora-metrics | tasks.md, tickets, DORA_METRICS.md |
| **@backend-engineer** | sonnet-4 | api-design, db-migrations, testing-strategy, task-tracking | endpoints, unit tests, migraciones |
| **@frontend-engineer** | sonnet-4 | frontend-patterns, testing-strategy, sdd-protocol, task-tracking | componentes, component tests |
| **@qa-engineer** | sonnet-4 | testing-strategy, pr-standards, production-readiness, task-tracking | E2E tests, screenshots, aprobaciones |
| **@security-engineer** | sonnet-4 | threat-modeling, asvs-checklist, security-checklist | STRIDE analysis, ASVS checklist |
| **@devops-engineer** | sonnet-4 | devops-workflows, production-readiness, dora-metrics, slo-management | CI/CD, deploy, PRR, DORA updates |
| **@ui-ux-designer** | sonnet-4 | frontend-patterns, clarification-protocol, sdd-protocol | wireframes, DESIGN_SYSTEM.md |

---

## Standards — Código de referencia

Los 11 archivos en `/standards/` son guías prescriptivas con código real:

| Archivo | Qué cubre |
|---------|-----------|
| `clean-architecture.md` | Capas, regla de dependencias, Use Cases — Python/TS |
| `solid-principles.md` | Los 5 principios con before/after — Python/TS |
| `dry-kiss-yagni.md` | DRY, KISS, YAGNI + el AHA Principle |
| `domain-driven-design.md` | Entities, Aggregates, Repos, Domain Events |
| `api-design-standard.md` | REST naming, RFC 9457 errors, paginación, rate limiting |
| `database-standard.md` | Naming, Expand-Contract migrations, índices, SQLAlchemy async |
| `testing-standard.md` | Pirámide, Given/When/Then, factories, Playwright E2E |
| `frontend-standard.md` | React/TS, WCAG 2.2, Core Web Vitals, Testing Library |
| `git-standard.md` | Conventional Commits, PR template, merge strategy |
| `security-standard.md` | OWASP Top 10, headers, secrets, ASVS L1 |
| `devops-standard.md` | Dockerfile multi-stage, GH Actions, PRR, SLOs |

---

## DORA Metrics — Midiendo el rendimiento

El plugin trackea automáticamente las 4 métricas DORA:

```
Deployment Frequency  → ¿Cuántas veces deployamos? (Meta: múltiples/semana)
Lead Time for Changes → ¿Cuánto tarda un commit en llegar a prod? (Meta: < 1 día)
Change Failure Rate   → ¿Qué % de deploys causa incidentes? (Meta: < 15%)
MTTR                  → ¿Cuánto tardamos en recuperarnos? (Meta: < 1 hora)
```

Se actualizan en `/docs/04-project/DORA_METRICS.md` después de cada deploy.

---

## MCPs disponibles

| MCP | Usado por | Para qué |
|-----|-----------|----------|
| `github` | Todos | Issues, PRs, reviews, labels, milestones |
| `azure-devops` | PM, Architect | Work items, repos, pipelines en Azure |
| `playwright` | QA, Security | E2E tests, screenshots de evidencia, DAST |
| `filesystem` | Todos | Leer/escribir archivos del proyecto con seguridad |
| `postgres` | Backend, DevOps | Inspeccionar esquemas, validar migraciones |
| `docker` | DevOps | Builds, gestión de contenedores |
| `sentry` | DevOps, QA | Errores en producción, alertas |
| `sonarqube` | QA, Security | Análisis estático de calidad |
| `context7` | Todos | Documentación actualizada de cualquier librería |

---

## Hooks de seguridad automáticos

Se ejecutan sin que el usuario los invoque:

```
🔴 Anti-SQL destructivo  → bloquea DROP TABLE, TRUNCATE, DELETE sin WHERE
🔴 Secret scanning       → detecta API keys, tokens, passwords en el código
🟡 Quality feedback      → sugiere linters (Ruff, ESLint) al crear archivos
```

---

## Instalación

```bash
/plugin install team-software-engineering
```

### Variables de entorno requeridas

```bash
GITHUB_TOKEN=ghp_...          # Issues, PRs, reviews, merges
AZURE_DEVOPS_PAT=...          # (opcional) Si usas Azure DevOps
DATABASE_URL=postgresql://... # Inspección de esquemas con MCP postgres
SENTRY_AUTH_TOKEN=...         # Monitoreo de errores en producción
SONAR_TOKEN=...               # Análisis estático de calidad
```

### Cómo invocarlo

```bash
# Proyecto nuevo
@architect "Quiero crear una app de gestión de inventarios en FastAPI + React"

# Feature nueva (proyecto existente)
@architect "Agrega un módulo de reportes en PDF exportables"

# Ticket existente — GitHub
@architect "#42"
@architect "https://github.com/miorg/mirepo/issues/42"

# Ticket existente — Azure DevOps
@architect "AB#1234"

# Tareas específicas directas
@backend-engineer "Implementa el endpoint POST /invoices"
@qa-engineer "Haz code review del PR #15"
@devops-engineer "Despliega el servicio api a Cloud Run"
@security-engineer "Audita el módulo de autenticación"
```

---

## Estructura del plugin

```
team-software-engineering/
├── .claude-plugin/
│   └── plugin.json              ← manifiesto v5.0.0
├── .mcp.json                    ← 9 MCP servers configurados
├── agents/                      ← 9 agentes especializados
│   ├── architect.md             ← punto de entrada, usa opus-4
│   ├── backend-engineer.md
│   ├── frontend-engineer.md
│   ├── product-owner.md
│   ├── project-manager.md
│   ├── qa-engineer.md
│   ├── security-engineer.md
│   ├── devops-engineer.md
│   └── ui-ux-designer.md
├── skills/                      ← 47 skills organizadas
│   ├── workflows/               ← 3 flujos de trabajo completos
│   │   ├── project-from-scratch/SKILL.md
│   │   ├── new-task/SKILL.md
│   │   └── task-from-ticket/SKILL.md
│   ├── audit-workflow/          ← operaciones (ex-commands)
│   ├── build-api-workflow/
│   ├── build-ui-workflow/
│   ├── debug-workflow/
│   ├── deploy-workflow/
│   ├── fix-workflow/
│   ├── onboard-workflow/
│   ├── review-workflow/
│   ├── improve-skill-workflow/
│   ├── repo-context-check/      ← protocolo (Step 0)
│   ├── flow-router/             ← protocolo (Step 1)
│   ├── clarification-protocol/
│   ├── sdd-protocol/
│   ├── context-engineering/
│   ├── task-tracking/
│   ├── task-closure/
│   ├── story-breakdown/
│   ├── definition-of-ready/
│   └── [28 skills más...]
├── standards/                   ← 11 estándares con código real
│   ├── clean-architecture.md
│   ├── solid-principles.md
│   ├── dry-kiss-yagni.md
│   ├── domain-driven-design.md
│   ├── api-design-standard.md
│   ├── database-standard.md
│   ├── testing-standard.md
│   ├── frontend-standard.md
│   ├── git-standard.md
│   ├── security-standard.md
│   └── devops-standard.md
├── hooks/
│   └── hooks.json               ← seguridad automática
└── README.md                    ← este archivo
```

---

**Autor**: EJBereguete — [github.com/EJBereguete](https://github.com/EJBereguete)
**Versión**: `5.0.0` | Sin commands · Solo skills · SDD + Context Engineering
