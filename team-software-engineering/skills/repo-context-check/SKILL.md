---
name: repo-context-check
description: >
  Step 0 obligatorio. Detecta si el repositorio tiene codigo real y si
  existe /docs con documentacion del proyecto. Se ejecuta SIEMPRE antes
  de cualquier flujo de trabajo.
used_by:
  - architect
  - project-manager
---

# Skill: Repository Context Check

## CONTRACT
- **Input**: Directorio de trabajo actual (repositorio)
- **Output**: Estado del repo (tiene codigo, tiene /docs, tiene tasks activas)
- **Trigger**: Se ejecuta SIEMPRE como primer paso antes de cualquier flujo

## PROCESS

### Step 1: Detectar si el repo tiene codigo real

Busca evidencia de codigo fuente real (no solo config o README):

```bash
# Archivos que indican proyecto con codigo:
# Python:     *.py, requirements.txt, pyproject.toml, setup.py
# JavaScript: *.ts, *.tsx, *.js, package.json
# C#:         *.cs, *.csproj, *.sln
# Go:         *.go, go.mod
# Rust:       *.rs, Cargo.toml
# Java:       *.java, pom.xml, build.gradle

# Carpetas que indican proyecto con codigo:
# src/, app/, lib/, cmd/, internal/, pages/, components/
```

Usa `Glob` para buscar estos patrones. Si encuentra al menos uno:
- **REPO_HAS_CODE = true**

Si el repo esta vacio o solo tiene README/.gitignore:
- **REPO_HAS_CODE = false** → FLUJO 1 (proyecto desde cero)

### Step 2: Verificar /docs

Si REPO_HAS_CODE = true:

```
¿Existe /docs/?
├── SI → ¿Tiene contenido real (no solo carpetas vacias)?
│   ├── SI → Leer /docs/01-architecture/PROJECT_CONTEXT.md como contexto base
│   └── NO → Generar documentacion via ingenieria inversa (Step 3)
└── NO → Crear /docs/ y generar documentacion (Step 3)
```

### Step 3: Generar /docs via ingenieria inversa (si no existe)

Cuando el proyecto tiene codigo pero no tiene /docs, los agentes deben:

1. **@architect** analiza el proyecto:
   - Lee `package.json`, `pyproject.toml`, `*.csproj` para detectar stack
   - Lee estructura de carpetas para detectar patron arquitectonico
   - Lee archivos principales para entender el dominio

2. Crea la estructura base:
   ```
   /docs/
   ├── 01-architecture/
   │   └── PROJECT_CONTEXT.md    ← stack, patrones, dependencias clave
   ├── 02-api/
   │   └── endpoints.md          ← mapa de endpoints encontrados
   ├── 03-ui-ux/
   │   └── DESIGN_SYSTEM.md      ← tokens extraidos de CSS/Tailwind/theme
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

3. Este paso **no bloquea** — genera la doc mínima y continua con la tarea.

### Step 4: Verificar tasks activas

```
¿Existe /docs/tasks/active/ con archivos TASK-*.md?
├── SI → Hay trabajo en progreso de sesiones anteriores
│   Leer el TASK mas reciente para saber donde se quedo
│   Preguntar al usuario: "Encontre una tarea en progreso: [titulo]. ¿Continuo con ella o empezamos algo nuevo?"
└── NO → No hay trabajo pendiente, continuar con flow-router
```

## EXAMPLE: PROJECT_CONTEXT.md generado automaticamente

```markdown
# Project Context

**Generated**: 2026-03-25 (auto-detected via repo-context-check)
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

## Database
- PostgreSQL 16
- Migrations: Alembic (alembic/versions/)
- Tables detected: users, organizations, invoices, payments

## Infrastructure
- Docker: docker-compose.yml (dev)
- CI/CD: GitHub Actions (.github/workflows/ci.yml)
- Deploy target: Google Cloud Run

## Environment Variables Required
- DATABASE_URL
- JWT_SECRET_KEY
- GOOGLE_CLIENT_ID (OAuth)
- SENDGRID_API_KEY
```

## CHECKLIST
- [ ] Se verifico si el repo tiene codigo real
- [ ] Se verifico si /docs existe y tiene contenido
- [ ] Si faltaba /docs, se genero via ingenieria inversa
- [ ] Se verifico si hay tasks activas de sesiones anteriores
- [ ] El resultado se paso al flow-router para determinar el flujo
