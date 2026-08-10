---
name: agteamos-new-project
description: >
  End-to-end workflow for bootstrapping a new project starting from an empty
  or near-empty repository. Covers stack definition, architecture, design system,
  CI/CD setup, and backlog creation before handing off to the agteamos-new-task
  workflow for the first feature.
used_by:
  - architect
  - product-owner
  - ui-ux-designer
  - devops-engineer
  - project-manager
---

# Workflow: AgTeamOS New Project

## CONTRACT

This workflow is activated when `agteamos-repo-context-check` determines the
repository contains no meaningful code and the user has described what they
want to build. Its responsibility is to produce a fully scaffolded, documented,
and CI/CD-ready repository with an initial backlog, ready to receive the first
feature task via the `agteamos-new-task` workflow.

---

## PRECONDITIONS

- `agteamos-repo-context-check` result: repository is empty (no source files, no `agteamos/`).
- User has provided at minimum a high-level description of what they want to build.
- No other workflow is currently in progress on this repository.

---

## PROCESS

### Step 1 — Leer `platform.yml` + clarification-protocol: solo lo que falta

`agteamos-flow-router` (Step 0) garantiza que `agteamos/platform.yml` ya
existe antes de llegar a este workflow — lo llenó `agteamos-setup` con
`repo_host`, `branch_strategy`, `ci_target`, `deploy_target` (o `null`),
`pr_convention` y `handoff_mode`. **Leer ese archivo primero y no volver a
preguntar nada de lo que ya contiene** — repetir esas preguntas duplica
trabajo que el usuario ya hizo y arriesga una respuesta inconsistente con lo
ya persistido.

Preguntar en un único mensaje (máximo 5-7 preguntas, nunca una por una) SOLO
lo que es específico de este proyecto y no vive en `platform.yml`:

- ¿Qué problema resuelve este producto y quiénes son los usuarios principales?
- ¿Hay restricciones duras de stack (lenguaje, framework, base de datos)?
- ¿Cuáles son las 3-5 features que definen el MVP?
- ¿Hay sistemas existentes con los que esto debe integrarse (proveedores de auth, APIs de terceros)?
- ¿Cuál es la escala esperada al lanzamiento (usuarios, volumen de datos, rate de requests)?

Preguntar de forma condicional, **solo si el campo quedó en `null`** en
`platform.yml` (no se resolvió todavía en `agteamos-setup`):
- Si `deploy_target: null` → "¿Cuál es el entorno de despliegue objetivo?" (VPS, Cloud Run, Vercel, mobile, desktop, etc.)
- Si `branch_strategy: custom` sin `branch_strategy_custom` claro → confirmar la convención exacta

**No hay default de branching en este paso.** `branch_strategy` es un campo
obligatorio que `agteamos-setup` no deja avanzar sin resolver — si de todos
modos llegara `null` acá, no asumir `feature/* → main` ni ningún otro
default: volver a disparar `agteamos-setup` para completarlo. Asumir un
default de branching contradice el principio rector de `agteamos-setup`
("nunca asumir, siempre preguntar").

Do not proceed to Step 2 until answers are received and unambiguous. See skill
`agteamos-clarification-protocol` for the full question protocol.

### Step 2 — @architect: Define stack and architecture

Using the answers from Step 1, the architect agent must:

1. Select and justify the full stack (language, framework, database, infrastructure).
2. Define the high-level architecture (monolith, modular monolith, microservices, etc.)
   with a Mermaid diagram.
3. Identify cross-cutting concerns: auth strategy, error handling, logging, observability.
4. Write `agteamos/architecture/PROJECT_CONTEXT.md` with:
   - Product summary (one paragraph)
   - Architecture diagram
   - Stack table (layer → technology → justification)
   - Key architectural decisions (brief, full ADRs come next)
5. Write initial ADRs under `agteamos/architecture/adr/`:
   - `ADR-001-stack-selection.md`
   - `ADR-002-database-model.md`
   - `ADR-003-auth-strategy.md` (if auth is in scope)

Output: `agteamos/architecture/PROJECT_CONTEXT.md` and ADR files committed.
Template ya existe completa en esta skill — solo cambia la ruta de destino.

### Step 3 — @product-owner: Define MVP scope

The product owner agent must:

1. Translate user answers into the product-layer documents (Agent OS style).
2. Write `agteamos/product/mission.md` with:
   - Vision statement
   - User personas (at least one)
   - Out-of-scope list (explicit exclusions prevent scope creep)
   - Definition of Done for this project
3. Write `agteamos/product/kpis.md` with:
   - KPIs to measure MVP success
4. Write `agteamos/product/roadmap.md` with:
   - Phase 0: Infrastructure and scaffolding (this workflow)
   - Phase 1: MVP features (feature list with acceptance criteria per feature,
     linked to backlog items created in Step 6)
   - Phase 2+: Post-MVP ideas (parking lot)

Output: `agteamos/product/mission.md`, `kpis.md`, and `roadmap.md` committed.
Templates ya existen completas en esta skill — solo cambia la ruta de destino.

### Step 4 — @ui-ux-designer: Create design system baseline

If the project has any user-facing interface (web, mobile, desktop), this step
is mandatory. For pure API/backend projects, skip this step.

The designer agent must write `agteamos/design/DESIGN_SYSTEM.md` containing:

- Color palette (primary, secondary, neutrals, semantic colors) with hex values.
- Typography scale (font families, sizes, weights, line heights).
- Spacing scale (base unit and scale steps).
- Breakpoints (if responsive).
- Base component list (Button, Input, Card, Modal, etc.) with usage rules.
- Accessibility baseline: minimum contrast ratios, focus management rules,
  ARIA usage guidelines.
- Reference to any external design tool (Figma URL, Storybook, etc.) if provided
  by the user.

Output: `agteamos/design/DESIGN_SYSTEM.md` committed.

### Step 5 — @devops-engineer: Initialize repository structure and CI/CD

The devops agent must:

1. Create the project directory structure appropriate for the chosen stack.
   Example for a FastAPI + React project:
   ```
   /backend/
   /frontend/
   /agteamos/
   /scripts/
   Dockerfile
   docker-compose.yml
   .env.example
   .gitignore
   ```
2. Write a working `Dockerfile` and `docker-compose.yml` for local development.
3. Write `.env.example` with all required environment variables (no real values).
4. Create the CI/CD pipeline file (GitHub Actions `.github/workflows/ci.yml`
   or equivalent) with:
   - Lint step
   - Test step with coverage threshold (minimum 70%)
   - Build step
   - (Optional) Deploy step if target environment was defined
5. Initialize branches per the agreed branching strategy.
6. Write `agteamos/devops/INFRASTRUCTURE.md` documenting the pipeline stages and
   deploy process.

Output: Full repo scaffold committed, CI/CD file committed, branches created.

### Step 6 — @project-manager: Create initial backlog

The project manager agent must:

1. Read `agteamos/product/roadmap.md` to extract MVP features.
2. Create one GitHub issue (or Azure work item) per MVP feature with:
   - Title: `[Feature] <feature name>`
   - Body: acceptance criteria from roadmap.md, labels, milestone
3. Create a milestone called `MVP` targeting a reasonable date (ask user if needed).
4. Write `agteamos/product/backlog.md` mirroring the created tickets with their IDs.
   **`agteamos/product/backlog.md` es el backlog de producto de este proyecto**
   (features priorizadas con sus IDs de ticket) — no confundir con el
   `BACKLOG.md` del propio plugin AgTeamOS, que es un archivo distinto usado
   por `agteamos-self-audit` para mejoras del plugin en sí, no del proyecto
   del usuario.

Output: Issues created in tracker, `agteamos/product/backlog.md` committed.

### Step 7 — Generate complete agteamos/ structure

Un proyecto greenfield **no puede quedar con menos estructura que uno
legacy** — `agteamos-onboard` genera el esqueleto completo para proyectos
existentes, y este workflow debe garantizar el mismo árbol completo (ver
`docs/referencia/estructura-de-carpetas.md` como fuente de referencia del
árbol canónico). Ensure the following directory tree exists with at minimum
a README or index file in each directory (vacía cuando la carpeta todavía no
tiene contenido real — el objetivo es que la carpeta exista, no rellenarla
con contenido inventado):

```
agteamos/
├── platform.yml                  ← ya escrito por agteamos-setup
├── product/
│   ├── mission.md
│   ├── roadmap.md
│   ├── kpis.md
│   └── backlog.md                ← backlog de producto de ESTE proyecto (ver Step 6; no confundir con el BACKLOG.md del propio plugin)
├── architecture/
│   ├── PROJECT_CONTEXT.md
│   ├── ARCHITECTURE.md           (si aplica, ver skill agteamos-onboard o el agente @architect)
│   └── adr/
├── api/                           (esqueleto vacío si el proyecto no expone API todavía; openapi.yml + endpoints.md una vez que exista al menos un endpoint)
├── design/
│   └── DESIGN_SYSTEM.md          (if UI project)
├── devops/
│   ├── INFRASTRUCTURE.md
│   └── prr/                       (vacío hasta el primer deploy — ver agteamos-production-readiness)
├── security/                      (vacío hasta la primera auditoría — ver agteamos-audit)
├── incidents/
│   ├── post-mortems/
│   ├── runbooks/
│   └── playbooks/
├── decisions/
│   ├── decision-log.md
│   └── rfcs/
├── standards/                     (vacío hasta que corra agteamos-standards)
├── specs/                         (vacío — se puebla con la primera spec maestra al cerrar la primera tarea)
└── changes/
    └── archive/
```

**`dashboard.html` explícitamente NO se crea acá** (ni como placeholder ni
vacío) — es un artefacto local regenerable a demanda por `agteamos-dashboard`
que no se commitea (ver `agteamos-dashboard` skill, sección "ARTEFACTOS
LOCALES"). Generarlo la primera vez que haya al menos una tarea es
responsabilidad de esa skill, no de `agteamos-new-project`.

### Step 8 — Hand off to agteamos-new-task workflow

Notify the user that the project is scaffolded and ready. Automatically continue
with the `agteamos-new-task` workflow for the first MVP feature unless the user
says otherwise. Si `platform.yml` tiene `handoff_mode: explicit`, pedir
confirmación antes de continuar; si es `auto`, continuar directamente.

---

## POSTCONDITIONS

- `agteamos/` is fully populated with at minimum all files listed in Step 7.
- The repository contains a working code skeleton (compiles/starts with no errors).
- `docker-compose up` starts the development environment without errors.
- CI/CD pipeline is configured and passes on an empty build.
- All MVP features have corresponding tickets in the issue tracker.
- Initial backlog is reflected in `agteamos/product/backlog.md`.
- The `main` branch (and `develop` if team project) is protected.

---

## EXAMPLE

**User input:**
"I want to build a SaaS invoice management app for freelancers. Backend in FastAPI,
frontend in React, hosted on a VPS, PostgreSQL database, users log in with email/password."

**Resulting artifacts (partial list):**
- `agteamos/architecture/PROJECT_CONTEXT.md` — stack: FastAPI + React + PostgreSQL,
  auth: JWT, deploy: Docker on VPS.
- `agteamos/architecture/adr/ADR-001-stack-selection.md`
- `agteamos/product/roadmap.md` — MVP: create invoice, list invoices, send PDF
  by email, mark as paid.
- `agteamos/design/DESIGN_SYSTEM.md` — neutral palette, Inter font, 4px base spacing.
- `docker-compose.yml` — services: `api`, `db`, `frontend`.
- `.github/workflows/ci.yml` — lint + pytest + vitest + build.
- GitHub issues #1–#4 for the four MVP features.
