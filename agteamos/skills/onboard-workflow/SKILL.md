---
name: agteamos-onboard
description: >
  Ingenieria inversa de un proyecto existente. Crea el esqueleto agteamos/
  completo y siembra su contenido de forma incremental y honesta (headers de
  Estado/Confidence, nunca una foto final) leyendo el codigo actual: invoca
  agteamos-standards para convenciones y siembra agteamos/specs/<dominio>.md +
  specs/index.yml por dominio de negocio, confirmado con el usuario. Delegado a
  agteamos-repo-context-check para la deteccion y a agteamos-new-project si el
  repo esta vacio.
used_by:
  - architect
  - product-owner
  - devops-engineer
  - ui-ux-designer
---

# SKILL: Onboard Workflow

## CONTRACT

- **Input**: repositorio existente sin `agteamos/` (o con `agteamos/` incompleto)
- **Output**: el esqueleto completo de `agteamos/` (product/, architecture/, api/, design/, devops/, security/, incidents/, decisions/, standards/, specs/, changes/) más un primer avance de documentación en cada carpeta — PROJECT_CONTEXT.md, API map, Design System, Infrastructure docs, estándares vía `agteamos-standards`, specs maestras sembradas por dominio (`agteamos/specs/<dominio>.md` + `agteamos/specs/index.yml`), y SQUAD_HANDOVER.md inicial
- **Who runs this**: @architect leads, all agents contribute their domain sections
- **Regla de honestidad — no es una foto completa**: esto es progreso incremental con confianza declarada, no una documentación definitiva del proyecto. Cada documento generado lleva su propio header de proveniencia (`Estado`/`Confidence`/`Fuentes revisadas`/`Última revisión`) — ningún valor (versión de librería, decisión arquitectónica, token de diseño, URL de entorno) se presenta como dato duro sin evidencia citable; si no se pudo confirmar, se marca inline como inferido/no confirmado. La siembra de specs (Step 5) es best-effort y parcial por diseño: el objetivo es que la spec exista con honestidad sobre sus límites, no que esté completa. Nunca se crea una spec, ni se marca `Estado: complete`, sin confirmación explícita del usuario.

---

## PROCESS

### Step 1 — Execute agteamos-repo-context-check

Run the `agteamos-repo-context-check` skill first. This skill detects:
- Stack and framework (FastAPI / Django / Express / NestJS / Rails / other)
- Frontend framework (React / Vue / Angular / vanilla)
- Database engine and ORM
- Whether `agteamos/` exists and what it contains
- Active changes in progress from previous sessions
- CI/CD platform

If `agteamos-repo-context-check` reports the repository is empty — stop and run the `agteamos-new-project` skill instead.

Do not proceed to Step 2 until `agteamos-repo-context-check` has completed its full checklist.

---

### Step 2 — Create the full `agteamos/` skeleton

Before writing any domain document, create the complete folder structure so every
later step (and every other skill in the system) finds the folder it expects,
even if that folder starts empty:

```
agteamos/
├── platform.yml
├── dashboard.html
├── product/
├── architecture/
│   └── adr/
├── api/
├── design/
├── devops/
│   └── prr/
├── security/
│   └── threat-models/
├── incidents/
│   ├── post-mortems/
│   ├── runbooks/
│   └── playbooks/
├── decisions/
│   └── rfcs/
├── standards/
├── specs/
└── changes/
    └── archive/
```

- Do not overwrite any file that already exists — this step only fills in missing
  folders/files, never destroys prior content.
- `platform.yml` is normally created by `agteamos-setup`; if it is missing here,
  create a minimal version with the detected repo host, branch strategy and
  `handoff_mode: explicit` as default, **and add `reviewed: false` as an explicit
  field in the file**. `reviewed: false` marks that `branch_strategy`/`repo_host`
  (mandatory fields per `agteamos-setup`) were assumed from detection, not
  confirmed by the user — only `agteamos-setup` running to completion with the
  user should flip it to `reviewed: true`. (Note out of this skill's scope:
  `agteamos-flow-router` should treat a `platform.yml` with `reviewed: false` the
  same as a missing one and trigger `agteamos-setup` — that wiring belongs to
  `agteamos-flow-router`, not to this skill.)
- `agteamos/standards/` is populated by invoking `agteamos-standards` explicitly
  (Step 4 below) — this step only ensures the folder exists so that invocation has
  somewhere to write. `agteamos/dashboard.html` is populated by the
  `agteamos-dashboard` skill the same way — this step only ensures the folder/file
  slot exists.

---

### Step 3 — Architecture documentation (@architect)

Read the codebase structure systematically:

```bash
# Top-level structure
find . -maxdepth 3 -type f -name "*.py" -o -name "*.ts" -o -name "*.tsx" | \
  grep -v node_modules | grep -v __pycache__ | grep -v ".next" | head -60

# Dependencies
cat requirements.txt 2>/dev/null || cat pyproject.toml 2>/dev/null
cat package.json 2>/dev/null
```

Ningún valor va como dato duro sin evidencia citable: una versión de librería
sin manifest que la respalde, una decisión arquitectónica sin código/ADR que la
confirme, o una URL de entorno sin config real se marcan inline como
`(inferido, no confirmado)` — nunca se presentan como hecho.

Create `agteamos/architecture/PROJECT_CONTEXT.md` con el header de proveniencia
obligatorio (mismo formato que usa `agteamos-standards`):

```markdown
# PROJECT_CONTEXT.md

**Estado**: EXTRACTED           <!-- STUB | EXTRACTED | DESIGN-DERIVED | CREATED | UPDATED -->
**Confidence**: N/5              <!-- 1-5. Nunca declarar 5/5 sin haber leido el archivo fuente -->
**Fuentes revisadas**: [archivos concretos leidos: package.json, requirements.txt, src/main.py, ...]
**Última revisión**: YYYY-MM-DD
**Project name**: [name]
**Status**: [Active / Maintenance / Sunset]

## Stack

| Layer | Technology | Version | Fuente |
|-------|-----------|---------|--------|
| Backend | FastAPI | 0.115.x | requirements.txt |
| Frontend | React + Vite | 18.x | package.json |
| Database | PostgreSQL | 15 | docker-compose.yml (inferido, no confirmado en produccion) |
| Auth | JWT (python-jose) | — | src/core/auth.py |
| Cache | Redis | 7 | docker-compose.yml |
| Hosting | Google Cloud Run | — | cloudbuild.yaml (inferido, no confirmado) |

## Architecture

[Brief description: monolith / microservices / modular monolith / BFF pattern]

### Module Structure

```
src/
├── api/           # FastAPI routers — thin layer, no business logic
├── services/      # Business logic — all domain rules live here
├── repositories/  # Database access — SQLAlchemy queries
├── models/        # SQLAlchemy ORM models
├── schemas/       # Pydantic input/output schemas
└── core/          # Config, auth, middleware
```

## Key Architectural Decisions

[List the top 3-5 decisions that anyone working on this project must know.
Only list a decision as deliberate if there is code or an ADR that confirms it —
otherwise mark it `(inferred, not confirmed with the team)`]

1. All database access goes through the repository layer — never query from routes or services directly (confirmed: src/repositories/*.py, no direct query found outside that layer)
2. Pydantic models are used for all input validation — no manual validation in route handlers (confirmed: src/schemas/*.py)
3. Background tasks use Celery with Redis broker — FastAPI BackgroundTasks only for lightweight operations (inferred, not confirmed: Celery config found in src/core/celery_app.py but no ADR documents this as a deliberate choice)

## ADRs

| ID | Title | Status |
|----|-------|--------|
| ADR-001 | Use PostgreSQL over MySQL | Accepted |

## Known Technical Debt

[Honest list of things that are suboptimal but deliberately accepted]

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql+asyncpg://user:pass@host/db |
| JWT_SECRET | Secret for signing JWTs | (generate with openssl rand -hex 32) |
```

ADRs generated in this step live in `agteamos/architecture/adr/`.

Also create initial ADRs for any architectural decisions that are clearly deliberate but undocumented. Use the `agteamos-adr` skill.

---

### Step 4 — Invoke `agteamos-standards` (@architect)

With the stack already identified (Step 3), run the `agteamos-standards` skill
explicitly as part of this workflow — do not leave `agteamos/standards/` as
"some other skill populates this eventually". This step is what actually
triggers it:

- Run `agteamos-standards` against the real codebase. It compares the code
  against the plugin's 11 base standards and writes
  `agteamos/standards/<topic>/README.md` + `examples.md` (+ `deviations.md`) +
  `standards.yml` + `index.yml`, each with its own `Estado`/`Confidence`
  provenance header — see `skills/standards/SKILL.md` for the exact format.
- **Legacy code with inconsistent styles**: if `agteamos-standards` finds 2-3
  conventions coexisting for the same topic (e.g. some endpoints use
  snake_case and others camelCase, some modules are layered and others are
  not), it must identify the dominant pattern (most frequent / most recent)
  and document the rest as exceptions in `deviations.md` — never average them
  or pick an "ideal" style the code does not actually follow.
- Do not proceed to Step 5 until this invocation has run — `agteamos/standards/`
  must end up populated by `agteamos-standards` itself, not left empty on the
  assumption that it runs "at some point".

---

### Step 5 — Domain & Master Spec Seeding (@architect)

This is the fix for the single biggest brownfield gap in the plugin: without
this step, `agteamos/specs/<dominio>.md` (the master spec defined by
`agteamos-sdd-protocol`) is unreachable in an existing project — the only other
writer of that file is `agteamos-close-task`'s `sync` step, which only ever
writes the delta of whatever task closes first, mislabeled as "current
behavior" of a domain it barely touched. This step seeds it honestly instead.

1. **Propose candidate domains from real code** — namespaces, module folders
   (`src/billing/`, `src/notifications/`), service/controller/router names —
   the same class of signal `agteamos-standards` (Step 4) already uses to
   detect conventions. Do not invent a domain without evidence: every
   candidate must point to at least one real file/folder that backs it.

   ```
   Carpetas detectadas: src/billing/, src/notifications/, src/auth/
   Dominios candidatos propuestos:
     - billing       (src/billing/*, 14 archivos)
     - notifications (src/notifications/*, 6 archivos)
     - auth          (src/auth/*, 9 archivos)
   ```

2. **Confirm with the user before writing anything** — same rule as the rest
   of the plugin, never seed without explicit confirmation:

   ```
   "Propongo sembrar specs maestras para estos dominios: billing, notifications,
   auth. ¿Confirmas la lista, editas nombres, agregas uno que no detecté, o
   descartas alguno? No genero ningún archivo de spec sin tu confirmación."
   ```

   Never create `agteamos/specs/<dominio>.md` for a domain the user did not
   confirm.

3. **For each confirmed domain**, generate `agteamos/specs/<dominio>.md` in the
   **exact** canonical format defined by `agteamos-sdd-protocol` — not a
   variant:

   ```markdown
   # Spec: <dominio>

   ## Coverage
   - **Estado**: seeded
   - **Confidence**: N/5   <!-- misma regla dura que agteamos-standards: nunca mas alto que la evidencia real -->
   - **Cubre**: [comportamientos inferidos con evidencia real de codigo]
   - **No cubre (todavia)**: [explicitamente NO vacio — es legacy, siempre falta algo]
   - **Ultima tarea aplicada**: ninguna (sembrado inicial)
   - **Origen**: onboarding (ingenieria inversa)

   ## Purpose
   [1-2 lineas inferidas del codigo real, citando la carpeta/modulo]

   ## Requirements

   ### Requirement: <Nombre unico y estable>
   El sistema MUST/SHOULD <comportamiento observable inferido del codigo>.
   <!-- Fuente: src/billing/service.py:charge_invoice -->

   #### Scenario: <caso observado en el codigo>
   - GIVEN <estado inicial>
   - WHEN <accion>
   - THEN <resultado observable>
   ```

   - `Estado` es **siempre** `seeded` en esta siembra — nunca `partial` ni
     `complete`. Es el estado inicial honesto sin excepción, sin importar
     cuánto código se haya podido leer; solo deltas posteriores de
     `agteamos-close-task` lo hacen avanzar.
   - Cada `### Requirement:` incluido debe citar el archivo/función real de
     donde se infirió (comentario `<!-- Fuente: ... -->` o mención en el
     texto) — el mismo patrón de "Fuentes revisadas" que usa
     `agteamos-standards`.
   - `No cubre (todavia)` nunca queda vacío en una siembra inicial: es código
     legacy, siempre hay comportamiento real sin especificar todavía.

4. **Create/update `agteamos/specs/index.yml`** — registry of confirmed
   domains, so `agteamos-new-task` can validate the `domains:` field of
   `task.yml` against a real list instead of unvalidated free text (this is
   what later prevents "pagos"/"payments"/"billing" from coexisting as three
   different domains due to a typo):

   ```yaml
   # agteamos/specs/index.yml
   domains:
     - name: billing
       status: seeded
       seeded_at: 2026-08-09
       spec_file: billing.md
     - name: notifications
       status: seeded
       seeded_at: 2026-08-09
       spec_file: notifications.md
   ```

   (Note out of this skill's scope: the actual validation of `domains:`
   against this index is implemented by `agteamos-new-task`, not here — this
   step only leaves the index written and up to date.)

5. **This seeding is best-effort and partial by design** — see the honesty
   rule in `## CONTRACT`. The goal is a spec that exists and is honest about
   its limits, not one that is complete.

---

### Step 6 — API documentation (@backend-engineer)

Read all route files and extract the API surface:

```bash
# FastAPI — find all routers
grep -r "APIRouter\|@router\|@app" . --include="*.py" -l

# Express/NestJS — find all controllers
grep -r "Router\|@Controller\|app\.get\|app\.post" . --include="*.ts" -l
```

Create `agteamos/api/endpoints.md` with the same provenance header used
throughout onboarding — a `Base URL` not seen in any config file is inferred,
not a fact:

```markdown
# API Endpoints Map

**Estado**: EXTRACTED           <!-- STUB | EXTRACTED | DESIGN-DERIVED | CREATED | UPDATED -->
**Confidence**: N/5              <!-- 1-5 -->
**Fuentes revisadas**: [archivos de rutas leidos, ej. src/api/routers/*.py (8 archivos)]
**Última revisión**: YYYY-MM-DD
**Base URL**: https://api.yourapp.com <!-- marcar (inferido, no confirmado) si no se encontro en config real -->
**Auth**: Bearer JWT in Authorization header

## Invoices

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/invoices | Required | List invoices (paginated) |
| POST | /api/v1/invoices | Required | Create invoice |
| GET | /api/v1/invoices/{id} | Required | Get invoice by ID |
| PATCH | /api/v1/invoices/{id} | Required | Update invoice |
| DELETE | /api/v1/invoices/{id} | Required | Soft delete invoice |

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/login | None | Get JWT token |
| POST | /api/v1/auth/refresh | Required | Refresh JWT |

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | None | Service health check |
```

If the project exposes an OpenAPI/Swagger spec, also export it to `agteamos/api/openapi.yml` (e.g. `curl http://localhost:8000/openapi.json -o agteamos/api/openapi.yml` or the framework's equivalent export command).

---

### Step 7 — Design system extraction (@ui-ux-designer)

If the project has a frontend, read the theme and component configuration:

```bash
# Tailwind config
cat tailwind.config.ts 2>/dev/null || cat tailwind.config.js 2>/dev/null

# CSS variables / design tokens
find . -name "tokens.css" -o -name "variables.css" -o -name "theme.ts" | head -5

# Existing components
find . -name "*.tsx" -path "*/components/ui/*" | head -20
```

Create `agteamos/design/DESIGN_SYSTEM.md` with a provenance header — a color
value or spacing rule not found literally in a token file/config is a design
inference, not an extracted fact, and must say so:

```markdown
# Design System

**Estado**: EXTRACTED           <!-- STUB | EXTRACTED | DESIGN-DERIVED | CREATED | UPDATED -->
**Confidence**: N/5              <!-- 1-5. DESIGN-DERIVED cuando se infiere de componentes ya usados, no de un archivo de tokens -->
**Fuentes revisadas**: [tailwind.config.ts, src/styles/tokens.css, componentes en src/components/ui/*]
**Última revisión**: YYYY-MM-DD

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| primary-600 | #2563EB | Primary buttons, links |
| primary-100 | #DBEAFE | Button hover backgrounds |
| gray-900 | #111827 | Primary text |
| gray-500 | #6B7280 | Secondary text, placeholders |
| red-600 | #DC2626 | Error states |
| green-600 | #16A34A | Success states |

## Typography

| Role | Class | Size | Weight |
|------|-------|------|--------|
| Page title | text-2xl font-semibold | 24px | 600 |
| Section title | text-lg font-medium | 18px | 500 |
| Body | text-base | 16px | 400 |
| Caption | text-sm text-gray-500 | 14px | 400 |

## Spacing

Base unit: 4px (Tailwind default). Use multiples: 4, 8, 12, 16, 24, 32, 48, 64.

## Component Patterns

### Button variants
- Primary: `btn-primary` (blue, solid)
- Secondary: `btn-secondary` (gray, outlined)
- Danger: `btn-danger` (red, solid)

### Form inputs
All inputs use: `input-base` class. Error state: add `input-error` class.

## Accessibility Standards

- WCAG 2.2 AA compliance required
- Minimum contrast ratio: 4.5:1 for body text
- All interactive elements keyboard-accessible
- data-testid required on all testable elements
```

Any mockup screenshots captured during this step go in `agteamos/design/mockup-v<n>.png`.

---

### Step 8 — Infrastructure documentation (@devops-engineer)

Read deployment configuration:

```bash
# Docker and compose
cat Dockerfile 2>/dev/null
cat docker-compose.yml 2>/dev/null
cat docker-compose.prod.yml 2>/dev/null

# CI/CD
ls .github/workflows/ 2>/dev/null

# Cloud config
cat cloudbuild.yaml 2>/dev/null
cat fly.toml 2>/dev/null
```

Create `agteamos/devops/INFRASTRUCTURE.md` with a provenance header — an
environment URL not found in any config file (CI workflow, `cloudbuild.yaml`,
`fly.toml`) is a guess, not a detected fact:

```markdown
# Infrastructure

**Estado**: EXTRACTED           <!-- STUB | EXTRACTED | DESIGN-DERIVED | CREATED | UPDATED -->
**Confidence**: N/5              <!-- 1-5 -->
**Fuentes revisadas**: [Dockerfile, docker-compose.yml, .github/workflows/*.yml, cloudbuild.yaml]
**Última revisión**: YYYY-MM-DD

## Environments

| Environment | URL | Branch | Deploy trigger |
|-------------|-----|--------|----------------|
| Development | localhost:8000 | feature/* | Manual |
| Staging | https://staging.myapp.com (inferido, no confirmado si no aparece en un workflow real) | develop | Push to develop |
| Production | https://api.myapp.com (inferido, no confirmado si no aparece en un workflow real) | main | Manual approval |

## Platform

Google Cloud Run (production and staging)
- Region: us-central1
- Min instances: 1 (prod), 0 (staging)
- Memory: 512Mi

## CI/CD

GitHub Actions:
- `test.yml` — runs on every PR: lint + unit tests + type check
- `deploy.yml` — runs on push to main: build Docker image + deploy to Cloud Run

## Local Development

```bash
cp .env.example .env
docker-compose up
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

## Required Environment Variables

See `.env.example` for the full list with descriptions.
```

If the project has observable production metrics, also run the `agteamos-dora-metrics` and `agteamos-slo-management` skills to seed `agteamos/devops/DORA_METRICS.md` and `agteamos/devops/SLO.md`.

---

### Step 9 — Product status (@product-owner)

Identify current product state by reading:
- README.md
- Any ROADMAP or CHANGELOG files
- GitHub issues and milestones

Document in `agteamos/product/roadmap.md` (or `agteamos/product/mission.md`/`kpis.md` if the content fits those files better):
- Current version and release notes summary
- Active KPIs (if measurable from the codebase or README)
- Known gaps between current state and desired state

---

### Step 10 — Repository setup (@project-manager)

Verify GitHub/Azure configuration:

```bash
# Check existing labels
gh label list

# Check existing milestones
gh api /repos/{owner}/{repo}/milestones
# NOTA: "listar milestones" no tiene operación abstracta equivalente en
# agteamos/tracker/<tracker>.md hoy (get-ticket/create-ticket no cubren
# milestones) — si el proyecto usa tracker: azure_devops, faltaría agregar
# esta consulta al adapter (ej. `az boards iteration project list`); por
# ahora este paso asume tracker: github.
```

Create standard labels if missing:
```bash
gh label create "type: bug" --color "d73a4a"
gh label create "type: feature" --color "0075ca"
gh label create "type: tech-debt" --color "e4e669"
gh label create "priority: P0" --color "b60205"
gh label create "priority: P1" --color "d93f0b"
gh label create "priority: P2" --color "fbca04"
gh label create "layer: backend" --color "0052cc"
gh label create "layer: frontend" --color "1d76db"
gh label create "layer: infra" --color "5319e7"
```

---

### Step 11 — Generate SQUAD_HANDOVER.md

Create `SQUAD_HANDOVER.md` at the project root:

```markdown
# SQUAD_HANDOVER.md

**Generated**: YYYY-MM-DD
**Context**: Initial onboarding — reverse engineering of existing codebase

## Project Summary

[2-3 sentence description of what the project does and who uses it]

## Architecture at a Glance

- Backend: FastAPI + PostgreSQL (async, SQLAlchemy 2.0)
- Frontend: React 18 + TypeScript + Tailwind CSS
- Hosting: Google Cloud Run
- CI/CD: GitHub Actions

## Key Files for New Agents

| File | Purpose |
|------|---------|
| agteamos/architecture/PROJECT_CONTEXT.md | Full stack and architecture overview |
| agteamos/api/endpoints.md | Complete API surface |
| agteamos/design/DESIGN_SYSTEM.md | Visual tokens and component patterns |
| agteamos/devops/INFRASTRUCTURE.md | Deployment and environment setup |
| agteamos/standards/index.yml | Detected conventions per topic, with Confidence |
| agteamos/specs/index.yml | Seeded domains and their master spec files |
| agteamos/specs/<dominio>.md | Master spec per domain — read `Coverage` before assuming it is complete, it is seeded/partial by design |

## Active State

- Active change: [None / agteamos/changes/<id>-<slug>/ if in progress]
- Last deploy: [date and version if known]
- Known P0 issues: [None / list if found during onboarding]

## What to Know Before Touching This Codebase

[Top 3 "gotchas" discovered during reverse engineering]

1. [e.g., "All DB queries must go through the repository layer — direct SQLAlchemy calls in services will cause connection pool issues"]
2. [e.g., "The frontend uses a custom axios instance with auth interceptors — never import axios directly"]
3. [e.g., "Migrations are applied manually — Alembic is configured but not hooked into the deploy pipeline yet"]
```

---

## EXAMPLES

**Detected PROJECT_CONTEXT.md for a FastAPI + React monorepo**:

```
Project: InvoiceFlow
Stack detected:
  Backend: FastAPI 0.115.0 + SQLAlchemy 2.0 + PostgreSQL
  Frontend: React 18.3 + TypeScript 5.4 + Tailwind CSS 3.4
  Auth: python-jose JWT + httpx-oauth (Google OAuth)
  Background tasks: Celery 5.3 + Redis 7
  Email: SendGrid via httpx
  Hosting: Google Cloud Run (backend) + Vercel (frontend)
  CI/CD: GitHub Actions (2 workflows: test.yml, deploy-backend.yml)

Key patterns observed:
  - Strict layering: routes → services → repositories → models
  - All endpoints require auth except /health and /api/v1/auth/*
  - Pydantic v2 with model_validate (not .from_orm)
  - Alembic migrations in /alembic/versions/
  - pytest-asyncio with AsyncClient for integration tests
  - E2E: Playwright tests in /e2e/ directory (15 specs, ~80% critical path coverage)
```

---

## ANTI-PATTERNS

- Skipping `agteamos-repo-context-check` and jumping straight to documentation — generates docs based on assumptions rather than what the code actually does
- Creating `agteamos/` without reading any actual code — produces generic templates that do not reflect the project
- Documenting "what should be" instead of "what is" — PROJECT_CONTEXT.md must reflect reality; it is a map, not a wish list
- Generating documentation and not creating the SQUAD_HANDOVER.md — the handover is what future agents use to resume work without repeating the onboarding analysis
- Running `agteamos-onboard` on an empty repo — use `agteamos-new-project` for that case
- Creating only the files this skill directly writes and skipping the Step 2 skeleton — other skills (`agteamos-standards`, `agteamos-dashboard`, `agteamos-adr`) assume their target folders already exist
- Reaching Step 6 without having actually invoked `agteamos-standards` (Step 4) — leaving `agteamos/standards/` for "some other skill to fill in eventually" is exactly the gap that made the folder permanently empty in the past
- Seeding `agteamos/specs/<dominio>.md` for a domain the user did not explicitly confirm (Step 5) — a domain list is a proposal until the user approves it, never an autonomous decision
- Declaring `Estado: complete` (or even `partial`) on an onboarding seed — a freshly seeded master spec is always `Estado: seeded`; anything higher during onboarding is a fabricated confidence claim
- Presenting an unverified value (an exact library version, a real-looking URL, an architectural decision) as fact without a confidence marker — every generated document carries its `Estado`/`Confidence`/`Fuentes revisadas` header, and anything not confirmed by evidence is marked inline as inferred/unconfirmed, never stated as fact
