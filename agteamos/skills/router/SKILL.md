---
name: agteamos-router
description: >
  Punto de entrada compartido por todos los flujos de AgTeamOS, ejecutado en
  practicamente cada sesion. Tres fases secuenciales: (A) resolver a que
  proyecto/repo corresponde moverse cuando el usuario lo nombra explicitamente
  (registro global ~/.claude/agteamos/projects.yml), (B) verificar el estado
  del repo actual (codigo real, agteamos/ existente o generado via ingenieria
  inversa, changes activos del usuario), y (C) rutear al flujo de trabajo
  correcto (1, 2 o 3) segun ese estado y el mensaje del usuario. Fusiona
  project-switch + repo-context-check + flow-router.
used_by:
  - architect
---

# Skill: Router (agteamos-router)

## CONTRACT

- **Input**: mensaje del usuario (puede o no nombrar un proyecto explicito) +
  working directory actual
- **Output**: la sesion queda posicionada en el repo correcto, con su estado
  de contexto verificado (o generado si faltaba), y una decision de flujo (1,
  2 o 3) ya tomada — o una sugerencia de `agteamos-explore` cuando aplica
- **Trigger**: el punto de entrada de casi cualquier sesion de AgTeamOS. Se
  ejecuta en este orden estricto:

  ```
  Fase A — Resolver proyecto   (solo si el usuario nombra un proyecto)
        ↓
  Fase B — Contexto de repo    (siempre)
        ↓
  Fase C — Ruteo de flujo      (siempre)
        ↓
  Dispara el flujo/skill que corresponda (Flujo 1/2/3, o agteamos-explore)
  ```

  **Condicion de entrada a la Fase A**: el usuario menciona un proyecto por
  nombre o alias ("vamos a trabajar en X", "cambiate al proyecto X", "seguimos
  con X"), o pide un listado ("que proyectos tengo"). Si el usuario **no**
  nombra ningun proyecto, la Fase A se salta por completo y se asume que la
  sesion ya esta posicionada en el repo correcto — se arranca directo en la
  Fase B.

---

# FASE A — Resolver proyecto

Punto de entrada multi-proyecto: el usuario dice "vamos a trabajar en el
proyecto X" (o "que proyectos tengo") desde cualquier sesion, sin haber
abierto antes esa carpeta. Resuelve el nombre contra un registro global
(`~/.claude/agteamos/projects.yml`), mueve la sesion ahi con
`mcp__ccd_directory__change_directory`, y si el proyecto no existe todavia
ofrece crearlo. Base de resolucion nombre->path reutilizada por
`agteamos-capture`.

**Trigger de esta fase**: cualquier momento de la conversacion, sin importar
el working directory actual ni si hay un flujo en curso — es el unico punto
de entrada de AgTeamOS que no asume estar posicionado en un repo.

## EL REGISTRO — `~/.claude/agteamos/projects.yml`

Vive en el home del usuario, fuera de cualquier repo (no en el plugin, no en
ningun proyecto) para sobrevivir a que se cierre o borre un checkout local.

```yaml
# ~/.claude/agteamos/projects.yml
projects:
  - name: invoicing-api          # slug corto, lo que el usuario va a decir
    aliases: [invoicing, facturacion]
    path: "C:\\Users\\josu_\\code\\invoicing-api"
    has_agteamos: true
    repo_host: github            # copiado de platform.yml al registrar
    tracker: github
    reviewed: true                # copiado de platform.yml.reviewed
    last_active: "2026-09-20"
```

Campos minimos: `name`, `path`, `has_agteamos`, `reviewed`, `last_active`.
El resto (`repo_host`, `tracker`, `aliases`) es soft — se completa cuando se
sabe, nunca bloquea la resolucion.

Si el archivo no existe, se lo trata como `projects: []` (no como error) y
se crea vacio en la primera escritura.

**Quien escribe/actualiza este archivo**: `agteamos-setup` (crea/actualiza
la entrada completa al confirmar `platform.yml`) y esta misma skill, en su
Fase B (solo actualiza `last_active` de una entrada ya existente). La Fase A
lo lee siempre, y lo escribe unicamente para las dos operaciones descritas en
el Step 4 y Step 5 de abajo (actualizar `last_active` al resolver, o crear el
placeholder de un proyecto nuevo) — nunca reescribe campos que le
corresponden a `setup`.

## PROCESS — Fase A

### Step 1 — Leer el registro

Leer `~/.claude/agteamos/projects.yml`. Si no existe, tratarlo como lista
vacia (no bloquear, no preguntar nada todavia).

### Step 2 — ¿Es un pedido de listado?

Frases tipo "que proyectos tengo", "dame el estado de mis proyectos",
"listame los proyectos":

```
Listar cada entrada: name — path — last_active — reviewed
Ordenar por last_active descendente (mas reciente primero)
Fin del flujo — no continua a los steps siguientes
```

Si no es un pedido de listado → Step 3.

### Step 3 — Resolver el nombre mencionado contra el registro

Contra `projects[].name` y `projects[].aliases`, en este orden:
1. Match exacto (case-sensitive)
2. Match case-insensitive
3. Match por substring (el nombre dicho por el usuario esta contenido en
   `name`/`aliases`, o viceversa)

```
Un match unico    → Step 4
Varios matches    → preguntar cual, mostrando path de cada uno para
                     desambiguar (AskUserQuestion o lista corta en texto)
Ningun match      → Step 5 (proyecto nuevo)
```

### Step 4 — Proyecto conocido: mover la sesion ahi

1. Confirmar que `path` todavia existe en disco. Si no existe mas:
   avisar explicitamente ("el proyecto '<name>' estaba registrado en
   '<path>' pero esa carpeta ya no existe") y ofrecer: re-registrar con una
   ruta nueva, o eliminar la entrada del registro. Nunca fallar en silencio
   ni asumir una ruta distinta.
2. Si existe: llamar `mcp__ccd_directory__change_directory` con ese `path`
   absoluto.
3. Actualizar `last_active` de esa entrada a la fecha de hoy en
   `projects.yml`.
4. Confirmar en una linea ("Listo, estamos en <name> (<path>)") y continuar
   directo a la **Fase B** de esta misma skill (contexto de repo) — sin
   invocacion manual adicional.

### Step 5 — Proyecto nuevo: sin match en el registro

1. Confirmar con el usuario: "No tengo registrado ningun proyecto '<X>'.
   ¿Queres que lo cree?"
2. Si el usuario confirma:
   - Preguntar donde (ruta explicita, o una carpeta padre por default si el
     usuario ya tiene un patron conocido — ej. junto a otros proyectos
     registrados)
   - Crear el directorio si no existe todavia
   - `mcp__ccd_directory__change_directory` al path nuevo
   - Registrar una entrada minima en `projects.yml`: `name` (slug del
     nombre dicho por el usuario), `path`, `has_agteamos: false`,
     `reviewed: false`, `last_active: hoy` — el resto de los campos
     (`repo_host`, `tracker`) los completa `agteamos-setup` mas adelante
   - Continuar a la **Fase B**: va a detectar el repo vacio → **Fase C** →
     Flujo 1 (`agteamos-bootstrap`), que dispara `agteamos-setup` y
     termina de completar la entrada del registro
3. Si el usuario dice que no (se equivoco de nombre, no quiere crearlo
   todavia): no crear nada, preguntar si quiso decir otro proyecto conocido.

## EXAMPLE — Fase A

```
Usuario: "vamos a trabajar en invoicing"
  → Match exacto de alias "invoicing" → invoicing-api
  → change_directory a C:\Users\josu_\code\invoicing-api
  → "Listo, estamos en invoicing-api. Reviso si hay trabajo pendiente..."
  → (continua directo a la Fase B de agteamos-router)

Usuario: "que proyectos tengo"
  → Lista: invoicing-api (hace 3 dias), zarpe-islands (hace 8 dias), ...

Usuario: "arranquemos el proyecto de reportes financieros"
  → Sin match → "No tengo registrado ningun proyecto 'reportes financieros'.
     ¿Queres que lo cree?" → usuario confirma → pregunta ruta → crea carpeta
     → change_directory → Fase B → Flujo 1
```

## CHECKLIST — Fase A

- [ ] Se leyo `~/.claude/agteamos/projects.yml` (o se trato como vacio si no existe)
- [ ] Si era pedido de listado, se listo y no se continuo con el resto del flujo
- [ ] Se resolvio el nombre por match exacto → case-insensitive → substring, en ese orden
- [ ] Ante multiples matches, se pregunto cual en vez de asumir el primero
- [ ] Ante un proyecto conocido, se verifico que el `path` todavia exista antes de moverse
- [ ] Se uso `mcp__ccd_directory__change_directory` (nunca se le pidio al usuario que hiciera `cd` a mano)
- [ ] Se actualizo `last_active` en el registro tras resolver
- [ ] Ante un proyecto nuevo, se confirmo con el usuario antes de crear la carpeta, y se registro con `reviewed: false`

## ANTI-PATTERNS — Fase A

- Asumir la ruta de un proyecto nuevo sin preguntar — "no hay defaults silenciosos" es el mismo principio que ya aplica `agteamos-setup`.
- Crear una entrada en el registro para un directorio que el usuario no confirmo que queria crear.
- Reescribir campos como `repo_host`/`tracker`/`reviewed` de una entrada existente — esos son responsabilidad de `agteamos-setup`, esta fase solo los lee y actualiza `last_active`.
- Forzar un match cuando hay ambiguedad real (ej. "proyecto de facturacion" con dos entradas parecidas) — preguntar siempre que haya mas de un candidato razonable.

---

# FASE B — Contexto de repo

Step obligatorio. Detecta si el repositorio tiene codigo real y si existe
`agteamos/` con documentacion del proyecto. Se ejecuta SIEMPRE (haya habido
Fase A o no) antes de la Fase C.

**Input de esta fase**: directorio de trabajo actual (repositorio), ya
resuelto por la Fase A si aplico.
**Output de esta fase**: estado del repo (tiene codigo, tiene `agteamos/`,
tiene changes activos), pasado a la Fase C.

## PROCESS — Fase B

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
- **REPO_HAS_CODE = false** → FLUJO 1 (proyecto desde cero, ver Fase C)

### Step 2: Verificar agteamos/

Si REPO_HAS_CODE = true:

```
¿Existe agteamos/? (senial de "proyecto ya inicializado con AgTeamOS")
├── SI → ¿Tiene contenido real (no solo carpetas vacias)?
│   ├── SI → Leer agteamos/architecture/PROJECT_CONTEXT.md como contexto base
│   └── NO → Generar documentacion via ingenieria inversa (Step 3)
└── NO → Crear agteamos/ y generar documentacion (Step 3)
```

Si `agteamos/` existe (con o sin contenido): actualizar `last_active` a hoy
en la entrada de `~/.claude/agteamos/projects.yml` que matchee el `path`
absoluto de este repo, **solo si esa entrada ya existe** — nunca crear una
entrada nueva desde acá (eso es responsabilidad exclusiva de
`agteamos-setup`, para no registrar carpetas que ni siquiera son proyectos
AgTeamOS). Ver Fase A de esta misma skill para el esquema completo del
registro.

### Step 3: Generar agteamos/ via ingenieria inversa (si no existe)

Cuando el proyecto tiene codigo pero no tiene `agteamos/`, los agentes deben:

1. **@architect** analiza el proyecto:
   - Lee `package.json`, `pyproject.toml`, `*.csproj` para detectar stack
   - Lee estructura de carpetas para detectar patron arquitectonico
   - Lee archivos principales para entender el dominio

2. Crea la estructura base (ver arbol completo y detalle de cada carpeta en la skill `agteamos-knowledge`):
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
   `agteamos-knowledge` Step 2. Ese campo es lo que le permite a la Fase C de
   esta skill distinguir "el archivo existe" de "el archivo fue confirmado
   por el usuario".

3. Este paso **no bloquea** — genera la doc mínima y continua con la tarea. Para la
   ingenieria inversa completa (todas las secciones, todos los agentes), delega en
   la skill `agteamos-knowledge`.

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
│         continuar con la Fase C. Opcional, sin bloquear: informar
│         "Hay N tarea(s) en progreso de otros miembros del equipo" sin pedir
│         decision sobre ellas.
└── NO → No hay trabajo pendiente, continuar con la Fase C
```

## EXAMPLE: PROJECT_CONTEXT.md generado automaticamente

```markdown
# Project Context

**Generated**: 2026-03-25 (auto-detected via agteamos-router, Fase B)
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

## CHECKLIST — Fase B

- [ ] Se verifico si el repo tiene codigo real
- [ ] Se verifico si `agteamos/` existe y tiene contenido
- [ ] Si `agteamos/` existe, se actualizo `last_active` en `~/.claude/agteamos/projects.yml` (solo si la entrada ya existia, nunca creando una nueva)
- [ ] Si faltaba `agteamos/`, se genero via ingenieria inversa
- [ ] Si se creo `platform.yml` con valores asumidos, quedo marcado `reviewed: false`
- [ ] Se verifico si hay changes activos de sesiones anteriores, filtrados por owner.email o branch del usuario actual (nunca se pregunta por tareas de otros miembros del equipo)
- [ ] El resultado se paso a la Fase C de esta misma skill para determinar el flujo

---

# FASE C — Ruteo de flujo

Detecta automaticamente cual de los 3 flujos de trabajo activar basandose en
el estado del repositorio (resultado de la Fase B) y el input del usuario. Se
ejecuta siempre, despues de la Fase B.

**Input de esta fase**: resultado de la Fase B + mensaje del usuario.
**Output de esta fase**: decision de flujo (1, 2 o 3) + contexto inicial para
el flujo, o una sugerencia (no un gate obligatorio) de `agteamos-explore`
cuando el input describe un problema sin solucion propuesta, antes de forzar
el Flujo 2.

## DETECTION LOGIC

```
Step 0: ¿Existe agteamos/platform.yml Y estan confirmados los 3 campos
        bloqueantes (repo_host, tracker, branch_strategy)?

  Si el archivo tiene `field_status` (ver agteamos-setup §Ronda 0/1+):
    Los 3 bloqueantes en `confirmed` → Step 1, sin importar el estado del
       resto de los campos (esos son ask-and-continue, cada consumidor los
       pregunta cuando los necesita — ver agteamos-setup Step 1.5)
    Alguno de los 3 en `pending` o `detected` (todavia no confirmado por el
       usuario) → ejecutar `agteamos-setup` (Ronda 0) para confirmar esos
       campos puntuales — no hace falta repetir el resto si ya esta
       `confirmed`
  Si el archivo NO tiene `field_status` (proyecto onboardeado antes de este
  campo, o platform.yml no existe) → comportamiento historico, por `reviewed`:
    NO EXISTE → ejecutar skill `agteamos-setup` primero (repo host, tracker,
       branching, CI/CD, deploy target, convencion de PR) — no continuar sin esto
    EXISTE con `reviewed: false` → tratarlo igual que "no existe": el archivo
       fue generado con valores asumidos por `agteamos-knowledge` o por la
       Fase B de esta skill (branch_strategy/repo_host sin confirmar por el
       usuario) — ejecutar `agteamos-setup` para que el usuario los revise y
       confirme antes de continuar
    EXISTE con `reviewed: true` (o sin el campo — proyectos creados antes de
       que este campo existiera se tratan como ya revisados) → Step 1

Step 1: ¿El repo tiene codigo?
  NO → FLUJO 1: Proyecto desde cero
  SI → Step 2

Step 2: ¿El input del usuario contiene referencia a ticket existente?

  Patrones GitHub:
    - URL: https://github.com/{owner}/{repo}/issues/{number}
    - URL: https://github.com/{owner}/{repo}/pull/{number}
    - Shorthand: #42, ##42
    - Texto: "issue 42", "PR 42", "pull request 42"

  Patrones Azure DevOps:
    - URL: https://dev.azure.com/{org}/{project}/_workitems/edit/{id}
    - Shorthand: AB#1234
    - Texto: "work item 1234", "task 1234", "user story 1234"

  SI → FLUJO 3: Tarea desde ticket existente
  NO → Step 2.5

Step 2.5: ¿El input describe un PROBLEMA o dolor sin solucion propuesta,
en vez de una feature o cambio concreto?

  Sintoma sin solucion (dolor, no feature):
    - "las paginas van lentas"
    - "el auth es un desastre"
    - "esto esta mal disenado"
    - "no entiendo por que esto falla tanto"

  Feature o cambio concreto (ya sabe que quiere):
    - "agrega autenticacion con JWT"
    - "quiero que el checkout mande un email de confirmacion"
    - "cambia el boton de guardar a la esquina superior"

  SI (sintoma sin solucion) → SUGERIR (no forzar) `agteamos-explore`:
    "Esto suena a un problema sin solucion definida todavia. ¿Queres
     explorar opciones primero con agteamos-explore (@architect lee el
     codigo real y compara trade-offs concretos) antes de comprometerte a
     una tarea con agteamos-task? Si ya sabes lo que queres hacer,
     seguimos directo."
       usuario elige explorar  → agteamos-explore
       usuario elige ir directo → FLUJO 2
  NO (ya es una feature/cambio concreto) → FLUJO 2: Tarea nueva sin ticket

```

**Regla**: el Step 2.5 es una sugerencia, nunca un gate bloqueante — el
usuario puede ir directo a `agteamos-task` (FLUJO 2) aunque el input
suene a síntoma, si explícitamente dice que ya sabe lo que quiere hacer.

## FLUJO 1 — Proyecto desde cero

**Condicion**: El repo no tiene codigo real (vacio o solo README/.gitignore)

**Agentes activados**: Todos
**Workflow skill**: `agteamos-bootstrap`

```
@architect       → captura vision, define stack, arquitectura
@product-manager   → KPIs de MVP, backlog priorizado
@ui-ux-designer  → design system base, tokens, paleta
@devops-engineer → repo setup, ramas, CI/CD, variables
@product-manager → issues iniciales en GitHub/Azure
```

## MODO EXPLORACION — `agteamos-explore` (previo a comprometerse)

Todo el aparato SDD (`agteamos-spec`, `agteamos-task`,
`agteamos-implement`) protege contra "implementaron mal lo que pedí" pero no
contra "pedí lo incorrecto", que en general es más caro de deshacer.
`agteamos-explore` es el espacio para pensar antes de comprometerse: lee el
código real, compara opciones con trade-offs concretos contra ESE código, y
no crea ningún artefacto ni rama ni toca `agteamos/changes/`. Dueño:
`@architect`. Ver skill `agteamos-explore` para el detalle completo.

Se llega a `agteamos-explore` de dos formas:
1. Sugerido por el Step 2.5 de arriba, cuando el input suena a síntoma sin solución.
2. Invocado directamente por el usuario ("quiero explorar opciones para X", "ayudame a pensar Y").

`agteamos-explore` termina en una de dos conclusiones: pasar a
`agteamos-task` con una idea ya formada, o seguir explorando.

## FLUJO 2 — Tarea nueva sin ticket

**Condicion**: Repo tiene codigo + input es descripcion en lenguaje natural

**Agentes activados**: Segun impacto (FE/BE/Fullstack)
**Workflow skill**: `agteamos-task`

```
agteamos-task → preguntas hasta tener contexto claro
@product-manager         → define ACs y ROI
@architect             → analiza impacto tecnico (FE/BE/Full)
agteamos-task        → INVEST check, split si necesario
@product-manager       → crea ticket(s) en GitHub/Azure
                       → CONTINUA automaticamente con FLUJO 3
```

## FLUJO 3 — Tarea desde ticket existente

**Condicion**: Input contiene URL, ID o referencia a ticket

**Agentes activados**: Segun capas impactadas
**Workflow skill**: `agteamos-implement`

```
Lee ticket via MCP (github o azure-devops)
agteamos-implement check → ¿tiene lo minimo?
  NO → agteamos-task → preguntas al usuario
  SI → continua
agteamos-task → ¿es user story grande? → split en subtareas
agteamos-implement INIT → crea agteamos/changes/<id>-<slug>/
branch creation → feature/<id>-<slug> | bugfix/<id>-<slug>
implementacion con unit tests obligatorios
documentacion de la tarea (inline en progress.md)
@qa-engineer → E2E + screenshots en evidence/
agteamos-implement → PR, ticket cerrado, rama limpia, agteamos/ archivado
```

## PLATFORM DETECTION

Cuando se detecta un ticket, tambien se identifica la plataforma:

```
GitHub detected:
  → Usar MCP github para leer/crear issues, PRs, labels
  → PR keyword: "Closes #42" (cierre automatico)
  → Branch naming: feature/42-description

Azure DevOps detected:
  → Usar MCP azure-devops para leer/crear work items
  → PR keyword: "Fixes AB#1234"
  → Branch naming: feature/AB1234-description
```

## EXAMPLE: Deteccion en accion

```
Usuario dice: "Agrega autenticacion con JWT"
  → No hay URL/ID → FLUJO 2

Usuario dice: "Trabaja en el issue #42"
  → Detecta #42 → FLUJO 3 (GitHub)

Usuario dice: "https://github.com/user/repo/issues/42"
  → Detecta URL GitHub → FLUJO 3 (GitHub)

Usuario dice: "Trabaja en AB#1234"
  → Detecta AB# → FLUJO 3 (Azure DevOps)

Usuario dice: "Quiero crear una app de gestion de inventarios"
  → Repo vacio → FLUJO 1

Usuario dice: "Las paginas de listado van lentisimas, no se por que"
  → No hay URL/ID, es un sintoma sin solucion propuesta
  → Se SUGIERE agteamos-explore (no se fuerza FLUJO 2)

Usuario dice: "Se que el auth esta mal pero no se si migrar a otro proveedor
o arreglar lo que hay, quiero pensarlo antes de armar el ticket"
  → Sintoma + pedido explicito de pensar antes → agteamos-explore
```

---

## Próximo paso sugerido

**No aplica** — `agteamos-router` ES quien decide el próximo paso (Fase C
de este mismo archivo), no algo que sugiere al terminar (ver
`agteamos-context` §Próximo paso).
