# 🤖 team-software-engineering (Expert Edition v4.0.0)

> Plugin de Claude Code que simula un equipo completo de ingeniería de software de élite.
> Desde la idea estratégica del CEO y el Product Owner hasta el deploy resiliente de SRE, orquestando 7 agentes especializados que colaboran siguiendo un flujo de ramas profesional y real.

---

## 🌟 ¿Qué hace este plugin?

Convierte a Claude Code en un equipo de ingeniería completo de alto rendimiento. En lugar de pedirle a Claude que haga todo de forma genérica, el plugin orquesta a especialistas que trabajan juntos de la misma forma que lo haría un equipo real en una empresa de tecnología de primer nivel (FAANG/Silicon Valley):

- **El @product-owner (PO)** (evolucionado de PM): Asegura que cada feature tenga un valor de negocio (ROI) y KPIs definidos antes de tocar una línea de código.
- **El @architect**: Diseña la solución técnica, evalúa trade-offs y documenta decisiones en **ADRs** (Architecture Decision Records).
- **El @frontend-ui-ux-engineer**: Crea interfaces intuitivas, accesibles (WCAG 2.1) y consistentes mediante **Design Systems**.
- **@backend-engineer**: Implementa la lógica de servidor con patrones de **Clean Architecture** e idempotencia.
- **@qa-engineer**: Revisa PRs, ejecuta tests **E2E (Playwright)**, **Mutation Testing** y **Regresión Visual**.
- **@security-engineer**: Protege el sistema mediante modelado de amenazas **STRIDE** y arquitectura **Zero Trust**.
- **@devops-engineer (SRE)**: Verifica el CI, despliega de forma segura y monitorea la salud con **Sentry** y **SonarQube**.

Todo esto se realiza con branches reales en GitHub/Azure, PRs reales, issues estructurados y automatización profesional.

---

## 🛠️ Instalación y Configuración

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

### Configuración de MCPs (Requerido)
El plugin utiliza 9 servidores MCP. Configura las siguientes variables de entorno:
- `GITHUB_TOKEN`: Acceso a repositorios, issues y PRs.
- `DATABASE_URL`: Para inspección de esquemas con el MCP de Postgres.
- `AZURE_DEVOPS_PAT`: Si utilizas Azure DevOps.
- `SENTRY_AUTH_TOKEN`: Para monitoreo de errores.
- `SONAR_TOKEN`: Para auditoría de calidad de código.

---

## 🏗️ Flujo de Ramas (GitFlow Moderno)

El equipo trabaja con 4 ramas permanentes para garantizar la estabilidad total del software:

```
main        → producción (solo DevOps/SRE puede mergear aquí tras smoke tests)
staging     → pre-producción (entorno donde el CI corre tests de integración automáticos)
testing     → territorio de QA (recibe los PRs de desarrollo para validación y E2E)
feature/*   → donde se implementa la lógica (se crean siempre desde main)
```

### Ciclo de vida de una feature (Expert Flow)

```
CEO plantea idea o requerimiento de negocio
  → @product-owner analiza el valor de negocio (ROI) y define KPIs
    → @architect diseña la solución técnica y registra ADRs
      → @product-owner crea los Issues detallados en GitHub/Azure con criterios de aceptación
        → @frontend-ui-ux-engineer define el UX Flow y Design Tokens
        → @security-engineer realiza el análisis de amenazas STRIDE preventivo
          → @backend-engineer y @frontend-ui-ux-engineer
              crean feature/* desde main
              implementan lógica + Tests unitarios y de mutación
              abren PR → testing
            → @qa-engineer
                revisa el PR (6 dimensiones de calidad)
                ejecuta tests E2E, Regresión Visual y Accesibilidad
                si aprueba → abre PR → staging
              → GitHub Actions / CI corre tests automáticos en staging
                → @devops-engineer
                    verifica CI y métricas en SonarQube
                    smoke tests en staging
                    merge staging → main
                    smoke tests en producción y monitoreo en Sentry
                    ✅ Feature en producción con valor medible
```

### Flujo de errores y Rollback

```
DevOps detecta fallo en staging o producción
  → Rollback automático a la última versión estable
  → Notifica a @qa-engineer y @security-engineer con los logs de Sentry
    → @qa-engineer analiza la causa raíz y notifica al @product-owner
      → @product-owner crea issue de corrección priorizado (Hotfix)
        → El equipo inicia el ciclo desde feature/fix-* sobre main
```

---

## 🛠️ Trabajando con Proyectos Existentes: El Flujo de Onboarding

A diferencia de un proyecto que empieza de cero, al unirse a un codebase existente, el equipo de agentes primero debe **aprender**. Para esto, se utiliza un flujo centrado en el comando `/onboard-project`.

```
Tú ejecutas /onboard-project
  → @architect, @devops-engineer y @product-owner analizan el codebase
    → Leen la estructura, archivos de configuración (package.json, pyproject.toml), CI/CD y código fuente.
    → Usan las skills de 'code-analysis' y 'convention-detection' para inferir arquitectura y estilo.
  → Se genera el archivo PROJECT_CONTEXT.md
    → Este archivo contiene el "ADN" del proyecto: comandos de build/test, estilo de código, patrones y stack.
  → Opcionalmente, se ejecuta /document-project para crear o actualizar la carpeta /docs.
    → Se genera documentación de arquitectura (ADRs), API y UI/UX mediante diagramas Mermaid.js.
```

Una vez completado el onboarding, los agentes están "conscientes del contexto" y todos los comandos posteriores usarán el `PROJECT_CONTEXT.md` como guía para asegurar que su trabajo se alinee perfectamente con el proyecto.

---

## 📋 Comandos del Equipo (Detallados)

### Comandos de Ciclo Completo
#### `/sprint` — El comando principal
Punto de entrada para una feature completa de principio a fin. Verifica la existencia de `PROJECT_CONTEXT.md` antes de empezar.
```bash
/team-software-engineering:sprint "Sistema de facturación con exportación a PDF y Dashboard"
```

#### `/work` — Implementación en tarea asignada
Activa al ingeniero adecuado (Backend o Frontend) para implementar una tarea específica en un proyecto existente, incluyendo tests y preparación de PR.
```bash
/team-software-engineering:work "Corregir error de paginación en el endpoint GET /products"
```

### Comandos de Planificación y Diseño
#### `/plan` — Planificación Estratégica
Solo el **@product-owner** y el **@architect** trabajan. Útil para definir el roadmap, KPIs y diseño técnico antes de comprometer recursos.
```bash
/team-software-engineering:plan "Módulo de suscripciones con Stripe"
```
**Produce:** Diseño técnico + ADRs + Issues en GitHub listos para ejecutar.

#### `/design` — Diseño de Arquitectura
Solo el **@architect**. Para decisiones técnicas puntuales sin crear el backlog completo.
```bash
/team-software-engineering:design "¿Cómo manejar uploads de archivos de más de 1GB?"
/team-software-engineering:design "Estrategia de caché para el catálogo de productos"
```

### Comandos de Implementación Granular
#### `/build-api` — Implementación Backend
Solo el **@backend-engineer**. Implementa endpoints, migraciones, servicios o lógica de negocio servidora.
```bash
/team-software-engineering:build-api "POST /invoices con generación de PDF"
/team-software-engineering:build-api "Migración para agregar tabla de 'audit_logs'"
```

#### `/build-ui` — Implementación UI/UX
Solo el **@frontend-ui-ux-engineer**. Implementa componentes, flujos de usuario, temas o integraciones de API.
```bash
/team-software-engineering:build-ui "Formulario de checkout con validación en tiempo real y A11y"
/team-software-engineering:build-ui "Dashboard de métricas con gráficas interactivas"
```

### Comandos de Calidad y Mantenimiento
#### `/review` — Code Review y QA
El **@qa-engineer** revisa código o PRs analizando: correctitud, seguridad, tests, performance, mantenibilidad y criterios de aceptación.
```bash
/team-software-engineering:review #42
/team-software-engineering:review src/api/routes/payments.py
```

#### `/audit` — Auditoría Integral (Potenciado)
Genera un **Radar de Deuda Técnica** categorizado: Código, Arquitectura, Seguridad, UI/UX y Documentación.
```bash
/team-software-engineering:audit
```

#### `/onboard-project` — Análisis de proyecto existente
Orquesta al equipo para analizar un proyecto y crear el `PROJECT_CONTEXT.md`.
```bash
/team-software-engineering:onboard-project
```

#### `/document-project` — Generación de Documentación Viva
Analiza el código y genera una carpeta `/docs` con diagramas Mermaid.js, ADRs y contratos de API.
```bash
/team-software-engineering:document-project
```

#### `/deploy` — Despliegue de Servicios
El **@devops-engineer** prepara o ejecuta el deploy, verifica el CI, hace smoke tests y monitorea producción.
```bash
/team-software-engineering:deploy "api-service production"
```

#### `/debug` — Debugging Colaborativo de Élite
Múltiples agentes analizan un fallo complejo desde perspectivas de negocio, seguridad y técnica.
```bash
/team-software-engineering:debug "Error 500 intermitente en el procesamiento de pagos"
```

---

## 🎭 El Equipo de Agentes de Élite

### 🏛️ Architect (`@architect`)
Diseña sistemas antes de que se escriba código. Su foco es la escalabilidad y la coherencia técnica.
- **Cuándo usarlo**: Decisiones técnicas críticas, elección de stack, diseño de sistemas o ADRs.
- **Skills**: `code-architecture`, `api-design`, `performance-optimization`, `git-workflow`.
- **MCPs**: `context7`, `filesystem`, `github`.

### 💎 Product Owner (`@product-owner`)
El guardián del valor de negocio. Convierte ideas en requerimientos accionables con KPIs claros.
- **Cuándo usarlo**: Crear issues, priorizar backlog, definir valor de negocio y criterios de aceptación.
- **Skills**: `product-strategy`, `business-analysis`, `git-workflow`, `documentation-skill`.
- **MCPs**: `github`, `filesystem`, `sonarqube`.

### 🎨 Principal UI/UX & Frontend (`@frontend-ui-ux-engineer`)
Experto híbrido en diseño y desarrollo. Asegura que el producto sea intuitivo, accesible y hermoso.
- **Cuándo usarlo**: Diseño de interfaces, sistemas de diseño, accesibilidad WCAG 2.1 y componentes.
- **Skills**: `frontend-patterns`, `design-systems`, `a11y-testing`, `visual-regression`.
- **MCPs**: `playwright`, `context7`, `sonarqube`.

### ⚙️ Backend Engineer (`@backend-engineer`)
Implementa APIs, lógica de negocio, migraciones y servicios con patrones Clean Architecture.
- **Especialidades**: Python (FastAPI), C#/.NET, Node.js (NestJS), SQL, Redis, Docker.
- **Skills**: `api-design`, `db-migrations`, `security-checklist`, `idempotency`, `error-handling`.
- **MCPs**: `postgres`, `filesystem`, `github`.

### 🧪 QA Automation Expert (`@qa-engineer`)
Dueño de la calidad. Valida PRs, ejecuta tests y asegura que no haya regresiones.
- **Cuándo usarlo**: Revisar PRs, automatizar tests E2E, auditoría de accesibilidad.
- **Skills**: `mutation-testing`, `testing-strategy`, `visual-regression`, `code-review`.
- **MCPs**: `playwright`, `github`, `sonarqube`.

### 🛡️ AppSec Specialist (`@security-engineer`)
Protege el sistema proactivamente. Identifica vulnerabilidades mediante modelado de amenazas.
- **Especialidades**: OWASP Top 10, STRIDE, OAuth2/OIDC, Gestión de Secretos.
- **Skills**: `threat-modeling-stride`, `security-checklist`, `zero-trust`, `git-workflow`.
- **MCPs**: `github`, `filesystem`, `playwright`.

### 🚀 DevOps / SRE Engineer (`@devops-engineer`)
Opera la infraestructura y el despliegue. Su foco es la observabilidad y la resiliencia.
- **Especialidades**: CI/CD, Docker, Kubernetes, Cloud Run, Sentry, Prometheus.
- **Skills**: `devops-workflows`, `observability`, `docker-containers`, `env-configuration`.
- **MCPs**: `docker`, `sentry`, `azure-devops`.

---

## 🧠 Skills Maestro (18 en total)

Las skills son las bases de conocimiento experto que los agentes consultan automáticamente:

| Skill | Lo que aporta al equipo | Agentes que la usan |
|-------|-------------------------|---------------------|
| `code-architecture` | Patrones SOLID, Clean Architecture y registro de ADRs. | Architect, PO |
| `testing-strategy` | Mutation Testing, Visual Regression y Contract Testing (Pact). | QA, Backend |
| `security-checklist` | Modelado STRIDE, Zero Trust, OAuth2/OIDC y gestión de secretos. | Todos |
| `ui-ux-patterns` | Atomic Design, Design Tokens y Accesibilidad WCAG 2.1. | Frontend |
| `documentation-skill`| Estándar de diagramas Mermaid.js y Living Documentation. | Todos |
| `api-design` | REST/GraphQL experto, idempotencia y paginación por cursor. | Backend, Architect |
| `db-migrations` | Migraciones seguras, rollback, índices y performance. | Backend |
| `devops-workflows` | CI/CD avanzado, estrategias de Rollout y observabilidad. | DevOps |
| `git-workflow` | Branch strategy avanzada, conventional commits y PR templates. | Todos |
| `error-handling` | Jerarquía de errores, HTTP mapping y Error Boundaries. | Backend, Frontend |
| `performance-opt` | N+1 queries, índices, caché y optimización de bundles. | Backend, Frontend |
| `docker-containers` | Multi-stage Dockerfiles y orquestación resiliente. | Backend, DevOps |
| `env-configuration` | Gestión de secretos, Vaults y esquemas de configuración (Zod/Pydantic). | Todos |
| `code-review` | Revisión en 6 dimensiones, comentarios estructurados. | QA, Security |
| `code-analysis` | Análisis de código para identificar arquitectura y lenguaje. | Todos |
| `safe-refactoring` | Técnicas de refactorización segura con red de tests. | Backend, Frontend |
| `convention-detect` | Inferencia de estilos de código y comandos del proyecto. | Todos |
| `logging-observability`| Structured logging, Sentry y trazabilidad (Request-ID). | Backend, DevOps |

---

## 🔌 Infraestructura MCP (9 Servidores)

El equipo utiliza herramientas reales mediante el Model Context Protocol para actuar sobre tu entorno:

| MCP | Para qué lo usan los agentes |
|-----|------------------------------|
| **github** | Crear/Gestionar issues, PRs, labels, milestones y comentarios. |
| **sonarqube** | Análisis estático de calidad, seguridad y monitoreo de deuda técnica. |
| **sentry** | Monitoreo de errores en tiempo real y performance en producción/staging. |
| **playwright** | Ejecutar tests E2E y Regresión Visual directamente. |
| **filesystem** | Explorar y editar la estructura del proyecto con seguridad. |
| **postgres** | Inspeccionar esquemas, validar migraciones y ejecutar queries seguras. |
| **docker** | Gestión de contenedores, builds locales y despliegues. |
| **context7** | Consultar documentación actualizada de cualquier framework o librería. |
| **azure-devops** | Gestionar Work Items, repositorios y pipelines en ecosistemas Azure. |

---

## 🛡️ Hooks de Seguridad e Integridad Automatizados

El plugin incluye hooks que se ejecutan automáticamente para proteger tu proyecto:

- **Anti-SQL Destructivo**: Bloquea comandos como `DROP TABLE`, `TRUNCATE` o `DELETE` sin `WHERE` en Bash.
- **Secret Scanning**: Detecta patrones de API Keys, Passwords o Tokens antes de que se commiteen.
- **Quality Feedback**: Sugiere automáticamente la ejecución de Linters (Ruff, ESLint, Black) al crear nuevos archivos.

---

## 📂 Estructura del Plugin

```
team-software-engineering/
├── .claude-plugin/
│   └── plugin.json                    # Manifiesto v4.0.0 (Expert Edition)
├── .mcp.json                          # Configuración de los 9 MCP servers
├── agents/                            # Prompts expertos de los 7 agentes de élite
├── commands/                          # Definición de flujos de trabajo orquestados
├── skills/                            # 18 Bases de conocimiento especializadas
├── hooks/                             # Seguridad e integridad automatizada
└── README.md                          # Guía definitiva del equipo
```

---

## Actualización y Mantenimiento

```bash
/plugin marketplace update team-plugins
/plugin list  # Verificar versión 4.0.0
```

---

## Autor
**EJBereguete** — [github.com/EJBereguete](https://github.com/EJBereguete)
Plugin versión `4.0.0` (Expert Edition)
