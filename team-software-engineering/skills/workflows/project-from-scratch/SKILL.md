---
name: project-from-scratch
description: >
  End-to-end workflow for bootstrapping a new project starting from an empty
  or near-empty repository. Covers stack definition, architecture, design system,
  CI/CD setup, and backlog creation before handing off to the new-task workflow
  for the first feature.
used_by:
  - "@architect"
  - "@product-owner"
  - "@ui-ux-designer"
  - "@devops-engineer"
  - "@project-manager"
---

# Workflow: Project From Scratch

## CONTRACT

This workflow is activated when `repo-context-check` determines the repository
contains no meaningful code and the user has described what they want to build.
Its responsibility is to produce a fully scaffolded, documented, and CI/CD-ready
repository with an initial backlog, ready to receive the first feature task via
the `new-task` workflow.

---

## PRECONDITIONS

- `repo-context-check` result: repository is empty (no source files, no `/docs`).
- User has provided at minimum a high-level description of what they want to build.
- No other workflow is currently in progress on this repository.

---

## PROCESS

### Step 1 — clarification-protocol: Understand the vision

Before any design or code decision is made, gather sufficient context to avoid
rework. Ask the following questions in a single message (do not ask one at a time):

- What problem does this product solve and who are the primary users?
- What is the target deployment environment? (VPS, Cloud Run, Vercel, mobile, desktop, etc.)
- Are there hard constraints on the tech stack (language, framework, database)?
- What are the 3–5 features that define the MVP?
- Are there existing systems this must integrate with (auth providers, third-party APIs)?
- What is the expected scale at launch (users, data volume, request rate)?
- Is there a preferred branching strategy? (default: `feature/* → main` for personal,
  `feature/* → develop → staging → main` for teams)

Do not proceed to Step 2 until answers are received and unambiguous.

### Step 2 — @architect: Define stack and architecture

Using the answers from Step 1, the architect agent must:

1. Select and justify the full stack (language, framework, database, infrastructure).
2. Define the high-level architecture (monolith, modular monolith, microservices, etc.)
   with a Mermaid diagram.
3. Identify cross-cutting concerns: auth strategy, error handling, logging, observability.
4. Write `/docs/01-architecture/PROJECT_CONTEXT.md` with:
   - Product summary (one paragraph)
   - Architecture diagram
   - Stack table (layer → technology → justification)
   - Key architectural decisions (brief, full ADRs come next)
5. Write initial ADRs under `/docs/01-architecture/adr/`:
   - `ADR-001-stack-selection.md`
   - `ADR-002-database-model.md`
   - `ADR-003-auth-strategy.md` (if auth is in scope)

Output: `/docs/01-architecture/PROJECT_CONTEXT.md` and ADR files committed.

### Step 3 — @product-owner: Define MVP scope

The product owner agent must:

1. Translate user answers into a structured requirements document.
2. Write `/docs/02-product/requirements.md` with:
   - Vision statement
   - User personas (at least one)
   - MVP feature list with acceptance criteria per feature
   - Out-of-scope list (explicit exclusions prevent scope creep)
   - KPIs to measure MVP success
   - Definition of Done for this project
3. Write `/docs/02-product/ROADMAP.md` with:
   - Phase 0: Infrastructure and scaffolding (this workflow)
   - Phase 1: MVP features (linked to backlog items created in Step 6)
   - Phase 2+: Post-MVP ideas (parking lot)

Output: `/docs/02-product/requirements.md` and `ROADMAP.md` committed.

### Step 4 — @ui-ux-designer: Create design system baseline

If the project has any user-facing interface (web, mobile, desktop), this step
is mandatory. For pure API/backend projects, skip this step.

The designer agent must write `/docs/03-design/DESIGN_SYSTEM.md` containing:

- Color palette (primary, secondary, neutrals, semantic colors) with hex values.
- Typography scale (font families, sizes, weights, line heights).
- Spacing scale (base unit and scale steps).
- Breakpoints (if responsive).
- Base component list (Button, Input, Card, Modal, etc.) with usage rules.
- Accessibility baseline: minimum contrast ratios, focus management rules,
  ARIA usage guidelines.
- Reference to any external design tool (Figma URL, Storybook, etc.) if provided
  by the user.

Output: `/docs/03-design/DESIGN_SYSTEM.md` committed.

### Step 5 — @devops-engineer: Initialize repository structure and CI/CD

The devops agent must:

1. Create the project directory structure appropriate for the chosen stack.
   Example for a FastAPI + React project:
   ```
   /backend/
   /frontend/
   /docs/
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
6. Write `/docs/05-devops/CI_CD.md` documenting the pipeline stages and deploy
   process.

Output: Full repo scaffold committed, CI/CD file committed, branches created.

### Step 6 — @project-manager: Create initial backlog

The project manager agent must:

1. Read `/docs/02-product/requirements.md` to extract MVP features.
2. Create one GitHub issue (or Azure work item) per MVP feature with:
   - Title: `[Feature] <feature name>`
   - Body: acceptance criteria from requirements.md, labels, milestone
3. Create a milestone called `MVP` targeting a reasonable date (ask user if needed).
4. Write `/docs/04-project/BACKLOG.md` mirroring the created tickets with their IDs.

Output: Issues created in tracker, `/docs/04-project/BACKLOG.md` committed.

### Step 7 — Generate complete /docs structure

Ensure the following directory tree exists with at minimum a README or index file
in each directory:

```
/docs/
  01-architecture/
    PROJECT_CONTEXT.md
    adr/
  02-product/
    requirements.md
    ROADMAP.md
  03-design/
    DESIGN_SYSTEM.md       (if UI project)
  04-project/
    BACKLOG.md
  05-devops/
    CI_CD.md
  tasks/
    active/
    completed/
```

### Step 8 — Hand off to new-task workflow

Notify the user that the project is scaffolded and ready. Automatically continue
with the `new-task` workflow for the first MVP feature unless the user says otherwise.

---

## POSTCONDITIONS

- `/docs` is fully populated with at minimum all files listed in Step 7.
- The repository contains a working code skeleton (compiles/starts with no errors).
- `docker-compose up` starts the development environment without errors.
- CI/CD pipeline is configured and passes on an empty build.
- All MVP features have corresponding tickets in the issue tracker.
- Initial backlog is reflected in `/docs/04-project/BACKLOG.md`.
- The `main` branch (and `develop` if team project) is protected.

---

## EXAMPLE

**User input:**
"I want to build a SaaS invoice management app for freelancers. Backend in FastAPI,
frontend in React, hosted on a VPS, PostgreSQL database, users log in with email/password."

**Resulting artifacts (partial list):**
- `/docs/01-architecture/PROJECT_CONTEXT.md` — stack: FastAPI + React + PostgreSQL,
  auth: JWT, deploy: Docker on VPS.
- `/docs/01-architecture/adr/ADR-001-stack-selection.md`
- `/docs/02-product/requirements.md` — MVP: create invoice, list invoices, send PDF
  by email, mark as paid.
- `/docs/03-design/DESIGN_SYSTEM.md` — neutral palette, Inter font, 4px base spacing.
- `docker-compose.yml` — services: `api`, `db`, `frontend`.
- `.github/workflows/ci.yml` — lint + pytest + vitest + build.
- GitHub issues #1–#4 for the four MVP features.
