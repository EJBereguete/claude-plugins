# Flujos de Trabajo

El plugin maneja 3 flujos principales. El flujo correcto se selecciona automáticamente basado en el contexto del repositorio y la instrucción del usuario. No es necesario especificar qué flujo usar.

## Paso 0: repo-context-check (siempre corre primero)

Antes de activar cualquier flujo, el Architect ejecuta `repo-context-check` para entender el estado real del repositorio:

```mermaid
flowchart TD
    START([Usuario envía instrucción]) --> CHECK{¿Hay archivos\nde código?\n.py .ts .cs .go...}

    CHECK -->|No| EMPTY[Repo vacío\no solo README/.gitignore]
    CHECK -->|Sí| HASCODE[Repo con código]

    EMPTY --> SCRATCH[FLUJO 1: project-from-scratch]

    HASCODE --> DOCS{¿Existe\n/docs con\ncontenido real?}
    DOCS -->|No| GENDOCS[Genera /docs\npor ingeniería inversa\nno bloquea la tarea]
    DOCS -->|Sí| READDOCS[Lee PROJECT_CONTEXT.md\ncomo contexto base]
    GENDOCS --> ACTIVE
    READDOCS --> ACTIVE{¿Hay TASK-*.md\nen /docs/tasks/active/?}

    ACTIVE -->|Sí| RESUME[Pregunta al usuario:\n¿Continúo TASK-42\no empezamos algo nuevo?]
    ACTIVE -->|No| ROUTER[flow-router]
    RESUME --> ROUTER
```

### ¿Qué genera si no existe /docs?

Cuando el proyecto tiene código pero no tiene `/docs`, el Architect genera la documentación mínima por ingeniería inversa. Este paso **no bloquea** la tarea — genera el contexto base y continúa:

```
/docs/
├── 01-architecture/
│   └── PROJECT_CONTEXT.md    ← stack detectado, dependencias, patrones
├── 02-api/
│   └── endpoints.md          ← mapa de endpoints encontrados en el código
├── 03-ui-ux/
│   └── DESIGN_SYSTEM.md      ← tokens extraídos de CSS/Tailwind/theme
├── 04-devops/
│   └── INFRASTRUCTURE.md     ← entornos, CI/CD, variables detectadas
├── 05-security/
├── 06-incidents/
├── 07-decisions/
│   └── decision-log.md
└── tasks/
    ├── active/
    └── completed/
```

---

## Paso 1: flow-router

Después de `repo-context-check`, el `flow-router` determina cuál de los 3 flujos activar:

```mermaid
flowchart TD
    INPUT([Input del usuario]) --> P1{¿Contiene\nreferencia a ticket?}

    P1 -->|"#42, AB#1234\nhttps://github.com/.../issues/42\nhttps://dev.azure.com/..."| TICKET[FLUJO 3: task-from-ticket]

    P1 -->|No| P2{¿El repo tiene\ncódigo real?}
    P2 -->|No| SCRATCH[FLUJO 1: project-from-scratch]
    P2 -->|Sí| NEW[FLUJO 2: new-task]
```

**Tabla de detección:**

| Input del usuario | Flujo activado |
|-------------------|----------------|
| `"Quiero crear una app de inventarios"` + repo vacío | Flujo 1 |
| `"Agrega notificaciones por email"` + proyecto existente | Flujo 2 |
| `"#42"` o `"issue 42"` | Flujo 3 (GitHub) |
| `https://github.com/user/repo/issues/42` | Flujo 3 (GitHub) |
| `"AB#1234"` | Flujo 3 (Azure DevOps) |

---

## Flujo 1: project-from-scratch

Para repositorios vacíos o proyectos completamente nuevos. Activa **todos los agentes** para crear la base del proyecto.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant AR as Architect
    participant PO as Product Owner
    participant UX as UI/UX Designer
    participant DO as DevOps Engineer
    participant PM as Project Manager

    U->>AR: "Quiero crear un SaaS de facturación"
    AR->>U: clarification-protocol (7 preguntas en un mensaje)
    U->>AR: Respuestas

    AR->>AR: Define stack + arquitectura
    AR->>AR: Crea ADRs (database, auth, cloud)
    AR-->>U: PROJECT_CONTEXT.md + ADR-001, 002, 003

    PO->>PO: Define visión, personas, ACs, roadmap
    PO-->>U: requirements.md + ROADMAP.md

    UX->>U: Propone DESIGN_SYSTEM.md
    U-->>UX: Aprobación

    DO->>DO: Scaffold: dirs, Dockerfile, docker-compose, CI/CD
    DO-->>U: Repo listo, ramas creadas, pipeline configurado

    PM->>PM: Lee requirements.md, crea issues en GitHub/Azure
    PM-->>U: 5 issues creados, milestone MVP definido

    Note over AR,PM: Hand-off automático a FLUJO 2 para la primera feature
```

**Resultado de este flujo:**
- Stack y arquitectura definidos con ADRs
- Design System base documentado
- Estructura de carpetas y repo configurado
- Docker + docker-compose + CI/CD GitHub Actions
- Issues iniciales creados en GitHub o Azure DevOps
- Transición automática a Flujo 2 para la primera feature

---

## Flujo 2: new-task

Para tareas nuevas en proyectos existentes, descritas en lenguaje natural. Es el flujo más común en el día a día.

```mermaid
flowchart TD
    START([Instrucción en lenguaje natural]) --> CTX[Lee PROJECT_CONTEXT.md\ndel proyecto]
    CTX --> CLARIFY[clarification-protocol\nMáx 3-5 preguntas en un único mensaje]
    CLARIFY --> USER_ANS[Usuario responde]
    USER_ANS --> PO[Product Owner escribe requirements.md]
    PO --> GATE1{Usuario aprueba\nrequirements.md?}
    GATE1 -->|No| PO
    GATE1 -->|Sí| INVEST{¿Es una\nUser Story grande?\nAplicar INVEST}

    INVEST -->|Sí, dividir| SPLIT[story-breakdown\nen sub-stories]
    INVEST -->|No| DES
    SPLIT --> DES[Architect escribe design.md]
    DES --> GATE2{Usuario aprueba\ndesign.md?}
    GATE2 -->|No| DES
    GATE2 -->|Sí| TASKS[PM escribe tasks.md]
    TASKS --> GATE3{Usuario aprueba\ntasks.md?}
    GATE3 -->|No| TASKS
    GATE3 -->|Sí| TICKET[PM crea ticket en GitHub/Azure]
    TICKET --> F3[Continúa automáticamente\ncon FLUJO 3]
```

**Puntos clave del Flujo 2:**
- El `clarification-protocol` hace las preguntas en **un único mensaje** (máximo 3-5), nunca una por una
- Cada artefacto SDD requiere aprobación explícita del usuario antes de continuar
- El Flujo 2 termina creando un ticket y transicionando automáticamente al Flujo 3

---

## Flujo 3: task-from-ticket

Para tickets existentes en GitHub Issues o Azure DevOps. Es el flujo de implementación real.

```mermaid
flowchart TD
    START(["Ticket: URL / #42 / AB#1234"]) --> DETECT{Detectar plataforma}
    DETECT -->|"https://github.com/..."| GH[Fetch via MCP github]
    DETECT -->|"https://dev.azure.com/..."| AZ[Fetch via MCP azure-devops]

    GH & AZ --> DOR{Definition of Ready\n¿Tiene lo mínimo?}

    DOR -->|No cumple DoR| CLARIFY[clarification-protocol\nPreguntas al usuario]
    CLARIFY --> DOR
    DOR -->|Cumple DoR| CONTEXT[Lee PROJECT_CONTEXT.md\ny specs existentes]

    CONTEXT --> SDD{¿Existen specs\nen /docs/tasks/active/?}
    SDD -->|No, viene de Flujo 3 directo| SPEC[SDD Protocol:\nrequirements + design + tasks]
    SDD -->|Sí, viene de Flujo 2| BRANCH[Crear branch]
    SPEC --> BRANCH

    BRANCH --> BRANCH_NAME{"Tipo de tarea"}
    BRANCH_NAME -->|Feature| FBR["feature/42-slug"]
    BRANCH_NAME -->|Bug| BBR["bugfix/42-slug"]
    FBR & BBR --> LAYERS{Detectar capas\nimpactadas}

    LAYERS -->|Solo backend| BE[Backend Engineer]
    LAYERS -->|Solo frontend| FE[Frontend Engineer]
    LAYERS -->|Ambas| BOTH[Backend + Frontend\ncada uno en su capa]

    BE & FE & BOTH --> TESTS[Unit tests obligatorios\nmín. happy path + error + edge]
    TESTS --> TRACK[Actualizar TASK-XXX.md\ncada step completado]
    TRACK --> E2E[QA Engineer\nE2E + screenshots en evidence/]
    E2E --> PR["PR via gh CLI\n'Closes #42' o 'Fixes AB#1234'"]
    PR --> CLOSE[task-closure:\nbranch cleanup + docs archivados]
```

**Naming de branches por plataforma:**

| Plataforma | Formato | Ejemplo |
|------------|---------|---------|
| GitHub | `feature/42-slug` o `bugfix/42-slug` | `feature/42-jwt-auth` |
| Azure DevOps | `feature/AB1234-slug` | `feature/AB1234-email-notifications` |

**Definition of Ready — requisitos mínimos para un ticket:**

Un ticket cumple DoR cuando tiene:
- Título descriptivo
- Descripción con el problema o valor de negocio
- Al menos un criterio de aceptación
- Stack/capa identificada (backend, frontend, fullstack)

Si no cumple DoR, el agente pregunta al usuario para completar la información antes de continuar.

---

## Comparativa de flujos

| Aspecto | Flujo 1 | Flujo 2 | Flujo 3 |
|---------|---------|---------|---------|
| **Trigger** | Repo vacío | Lenguaje natural + repo con código | URL, #id, AB# |
| **Agentes** | Todos | PO + AR + PM + Engineers | Engineers + QA + DevOps |
| **SDD** | Completo | Completo | Completo (si no viene de F2) |
| **Branch** | No (scaffold) | Crea ticket → pasa a F3 | Sí, siempre |
| **Output** | Proyecto base | Ticket + transición a F3 | PR mergeado + ticket cerrado |
| **Duración típica** | 1-2 horas | 20-30 min (SDD) + F3 | 30 min – varias horas |
