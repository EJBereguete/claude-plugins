---
name: onboard-workflow
description: >
  Ingenieria inversa de un proyecto existente. Genera la estructura /docs completa
  leyendo el codigo actual. Delegado a repo-context-check para la deteccion
  y a project-from-scratch si el repo esta vacio.
used_by:
  - architect
  - product-owner
  - devops-engineer
  - ui-ux-designer
---

# SKILL: Onboard Workflow

## CONTRACT

- **Input**: repositorio existente sin `/docs` (o con `/docs` incompleto)
- **Output**: `/docs` completo con PROJECT_CONTEXT.md, API map, Design System, Infrastructure docs, y SQUAD_HANDOVER.md inicial
- **Who runs this**: @architect leads, all agents contribute their domain sections

---

## PROCESS

### Step 1 — Execute repo-context-check

Run the `repo-context-check` skill first. This skill detects:
- Stack and framework (FastAPI / Django / Express / NestJS / Rails / other)
- Frontend framework (React / Vue / Angular / vanilla)
- Database engine and ORM
- Whether `/docs` exists and what it contains
- Active tasks in progress from previous sessions
- CI/CD platform

If `repo-context-check` reports the repository is empty — stop and run the `workflows/project-from-scratch` skill instead.

Do not proceed to Step 2 until `repo-context-check` has completed its full checklist.

---

### Step 2 — Architecture documentation (@architect)

Read the codebase structure systematically:

```bash
# Top-level structure
find . -maxdepth 3 -type f -name "*.py" -o -name "*.ts" -o -name "*.tsx" | \
  grep -v node_modules | grep -v __pycache__ | grep -v ".next" | head -60

# Dependencies
cat requirements.txt 2>/dev/null || cat pyproject.toml 2>/dev/null
cat package.json 2>/dev/null
```

Create `/docs/01-architecture/PROJECT_CONTEXT.md`:

```markdown
# PROJECT_CONTEXT.md

**Last updated**: YYYY-MM-DD
**Project name**: [name]
**Status**: [Active / Maintenance / Sunset]

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | FastAPI | 0.115.x |
| Frontend | React + Vite | 18.x |
| Database | PostgreSQL | 15 |
| Auth | JWT (python-jose) | — |
| Cache | Redis | 7 |
| Hosting | Google Cloud Run | — |

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

[List the top 3-5 decisions that anyone working on this project must know]

1. All database access goes through the repository layer — never query from routes or services directly
2. Pydantic models are used for all input validation — no manual validation in route handlers
3. Background tasks use Celery with Redis broker — FastAPI BackgroundTasks only for lightweight operations

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

Also create initial ADRs for any architectural decisions that are clearly deliberate but undocumented. Use the `adr-management` skill.

---

### Step 3 — API documentation (@backend-engineer)

Read all route files and extract the API surface:

```bash
# FastAPI — find all routers
grep -r "APIRouter\|@router\|@app" . --include="*.py" -l

# Express/NestJS — find all controllers
grep -r "Router\|@Controller\|app\.get\|app\.post" . --include="*.ts" -l
```

Create `/docs/02-api/endpoints.md`:

```markdown
# API Endpoints Map

**Base URL**: https://api.yourapp.com
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

---

### Step 4 — Design system extraction (@ui-ux-designer)

If the project has a frontend, read the theme and component configuration:

```bash
# Tailwind config
cat tailwind.config.ts 2>/dev/null || cat tailwind.config.js 2>/dev/null

# CSS variables / design tokens
find . -name "tokens.css" -o -name "variables.css" -o -name "theme.ts" | head -5

# Existing components
find . -name "*.tsx" -path "*/components/ui/*" | head -20
```

Create `/docs/03-design/DESIGN_SYSTEM.md`:

```markdown
# Design System

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

---

### Step 5 — Infrastructure documentation (@devops-engineer)

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

Create `/docs/04-devops/INFRASTRUCTURE.md`:

```markdown
# Infrastructure

## Environments

| Environment | URL | Branch | Deploy trigger |
|-------------|-----|--------|----------------|
| Development | localhost:8000 | feature/* | Manual |
| Staging | https://staging.myapp.com | develop | Push to develop |
| Production | https://api.myapp.com | main | Manual approval |

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

---

### Step 6 — Product status (@product-owner)

Identify current product state by reading:
- README.md
- Any ROADMAP or CHANGELOG files
- GitHub issues and milestones

Document in `/docs/00-product/PRODUCT_STATUS.md`:
- Current version and release notes summary
- Active KPIs (if measurable from the codebase or README)
- Known gaps between current state and desired state

---

### Step 7 — Repository setup (@project-manager)

Verify GitHub/Azure configuration:

```bash
# Check existing labels
gh label list

# Check existing milestones
gh api /repos/{owner}/{repo}/milestones
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

### Step 8 — Generate SQUAD_HANDOVER.md

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
| /docs/01-architecture/PROJECT_CONTEXT.md | Full stack and architecture overview |
| /docs/02-api/endpoints.md | Complete API surface |
| /docs/03-design/DESIGN_SYSTEM.md | Visual tokens and component patterns |
| /docs/04-devops/INFRASTRUCTURE.md | Deployment and environment setup |

## Active State

- Active task: [None / TASK-XX if in progress]
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

- Skipping `repo-context-check` and jumping straight to documentation — generates docs based on assumptions rather than what the code actually does
- Creating `/docs` without reading any actual code — produces generic templates that do not reflect the project
- Documenting "what should be" instead of "what is" — PROJECT_CONTEXT.md must reflect reality; it is a map, not a wish list
- Generating documentation and not creating the SQUAD_HANDOVER.md — the handover is what future agents use to resume work without repeating the onboarding analysis
- Running onboard-workflow on an empty repo — use `workflows/project-from-scratch` for that case
