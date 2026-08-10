---
name: agteamos-repo-context-check
description: >
  Step 0 obligatorio. Detecta si el repositorio tiene codigo real y si
  existe agteamos/ con documentacion del proyecto. Se ejecuta SIEMPRE antes
  de cualquier flujo de trabajo.
used_by:
  - architect
---

# Skill: Repository Context Check

## CONTRACT
- **Input**: Directorio de trabajo actual (repositorio)
- **Output**: Estado del repo (tiene codigo, tiene agteamos/, tiene changes activos)
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

### Step 2: Verificar agteamos/

Si REPO_HAS_CODE = true:

```
¿Existe agteamos/? (senial de "proyecto ya inicializado con AgTeamOS")
├── SI → ¿Tiene contenido real (no solo carpetas vacias)?
│   ├── SI → Leer agteamos/architecture/PROJECT_CONTEXT.md como contexto base
│   └── NO → Generar documentacion via ingenieria inversa (Step 3)
└── NO → Crear agteamos/ y generar documentacion (Step 3)
```

### Step 3: Generar agteamos/ via ingenieria inversa (si no existe)

Cuando el proyecto tiene codigo pero no tiene `agteamos/`, los agentes deben:

1. **@architect** analiza el proyecto:
   - Lee `package.json`, `pyproject.toml`, `*.csproj` para detectar stack
   - Lee estructura de carpetas para detectar patron arquitectonico
   - Lee archivos principales para entender el dominio

2. Crea la estructura base (ver arbol completo y detalle de cada carpeta en la skill `agteamos-onboard`):
   ```
   agteamos/
   ├── platform.yml               ← branch_strategy y config de plataforma
   ├── dashboard.html
   ├── product/
   │   └── roadmap.md             ← mission, roadmap, kpis, backlog
   ├── architecture/
   │   ├── PROJECT_CONTEXT.md     ← stack, patrones, dependencias clave
   │   └── adr/
   ├── api/
   │   └── endpoints.md           ← mapa de endpoints encontrados
   ├── design/
   │   └── DESIGN_SYSTEM.md       ← tokens extraidos de CSS/Tailwind/theme
   ├── devops/
   │   └── INFRASTRUCTURE.md      ← entornos, CI/CD, variables detectadas
   ├── security/
   ├── incidents/
   │   └── runbooks/
   ├── decisions/
   │   ├── decision-log.md
   │   └── rfcs/
   ├── standards/
   ├── specs/
   └── changes/
       └── archive/
   ```

   Si `platform.yml` se crea aca con valores asumidos (branch_strategy, repo_host)
   en vez de confirmados por el usuario via `agteamos-setup`, marcarlo con
   `reviewed: false` explicito en el archivo — detalle del campo en
   `agteamos-onboard` Step 2. Ese campo es lo que le permite a
   `agteamos-flow-router` (fuera del alcance de esta skill) distinguir "el archivo
   existe" de "el archivo fue confirmado por el usuario".

3. Este paso **no bloquea** — genera la doc mínima y continua con la tarea. Para la
   ingenieria inversa completa (todas las secciones, todos los agentes), delega en
   la skill `agteamos-onboard`.

### Step 4: Verificar changes activos

Con mas de una persona en el equipo, `agteamos/changes/` en la rama principal
puede tener tareas activas de varios devs al mismo tiempo. No corresponde
interrogar al usuario actual sobre el trabajo de sus companeros — la pregunta
de "tarea en progreso, ¿continuo?" se filtra siempre por la tarea del usuario
actual.

```
¿Existe agteamos/changes/ con carpetas <id>-<slug>/ (fuera de archive/)?
├── SI → Para cada carpeta, leer `task.yml` y quedarse solo con las que matchean:
│         owner.email == `git config user.email` (usuario actual)
│         O branch: de la tarea == rama git actual (`git branch --show-current`)
│   ├── Hay alguna que matchea → Es trabajo en progreso del usuario actual
│   │     Leer el `progress.md` mas reciente para saber donde se quedo
│   │     Preguntar al usuario: "Encontre una tarea en progreso: [titulo]. ¿Continuo con ella o empezamos algo nuevo?"
│   └── Ninguna matchea (son de otros miembros del equipo) → No preguntar por
│         ellas. Tratar como "no hay trabajo pendiente del usuario actual" y
│         continuar con agteamos-flow-router. Opcional, sin bloquear: informar
│         "Hay N tarea(s) en progreso de otros miembros del equipo" sin pedir
│         decision sobre ellas.
└── NO → No hay trabajo pendiente, continuar con agteamos-flow-router
```

## EXAMPLE: PROJECT_CONTEXT.md generado automaticamente

```markdown
# Project Context

**Generated**: 2026-03-25 (auto-detected via agteamos-repo-context-check)
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
- [ ] Se verifico si `agteamos/` existe y tiene contenido
- [ ] Si faltaba `agteamos/`, se genero via ingenieria inversa
- [ ] Si se creo `platform.yml` con valores asumidos, quedo marcado `reviewed: false`
- [ ] Se verifico si hay changes activos de sesiones anteriores, filtrados por owner.email o branch del usuario actual (nunca se pregunta por tareas de otros miembros del equipo)
- [ ] El resultado se paso al `agteamos-flow-router` para determinar el flujo
