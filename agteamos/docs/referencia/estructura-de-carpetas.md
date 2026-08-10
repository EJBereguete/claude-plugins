# Estructura de carpetas (`agteamos/`)

AgTeamOS gestiona **una sola carpeta visible `agteamos/`** en la raíz de tu proyecto. Reemplaza por completo cualquier esquema anterior basado en `docs/00-08` + `docs/specs` + `docs/tasks` — todo lo que el sistema toca vive en su propia carpeta con nombre de marca, sin mezclarse con documentación humana genérica. No hay prefijos numéricos: insertar una categoría nueva en el medio no requiere renumerar nada.

> **Esta página es el árbol canónico único.** `README.md` no mantiene su propia copia — cita o replica este árbol tal cual. Si alguna skill (`agteamos-new-project`, `agteamos-onboard`, `agteamos-docs`, `agteamos-repo-context-check`, `agteamos-task-tracking`) muestra un árbol distinto de este, es una divergencia a corregir ahí, no una variante válida.

> **Qué se commitea**: ver [Control de versiones](#control-de-versiones-qué-se-commitea-y-qué-no) más abajo — casi todo `agteamos/` se commitea como código fuente, con dos excepciones marcadas explícitamente en el árbol.

## Árbol completo

```
tu-proyecto/
├── agteamos/
│   ├── platform.yml                     ← agteamos-setup
│   ├── dashboard.html                    ← agteamos-dashboard (generado, NO se commitea)
│   │
│   ├── product/
│   │   ├── mission.md
│   │   ├── roadmap.md
│   │   ├── kpis.md
│   │   └── backlog.md                    ← agteamos-new-project Step 6 (mirror de los tickets creados)
│   │
│   ├── architecture/
│   │   ├── PROJECT_CONTEXT.md
│   │   ├── ARCHITECTURE.md
│   │   └── adr/
│   │       ├── ADR-001-database-choice.md
│   │       └── ADR-002-auth-strategy.md
│   │
│   ├── api/
│   │   ├── openapi.yml
│   │   └── endpoints.md
│   │
│   ├── design/
│   │   ├── DESIGN_SYSTEM.md
│   │   └── mockup-v1.png
│   │
│   ├── devops/
│   │   ├── INFRASTRUCTURE.md
│   │   ├── DORA_METRICS.md
│   │   ├── SLO.md
│   │   └── prr/
│   │       └── PRR-v1.2.3.md
│   │
│   ├── security/
│   │   ├── AUDIT-2026-08-09.md
│   │   └── threat-models/
│   │
│   ├── incidents/
│   │   ├── post-mortems/
│   │   ├── runbooks/
│   │   └── playbooks/
│   │
│   ├── decisions/
│   │   ├── decision-log.md
│   │   └── rfcs/
│   │       └── RFC-001-unified-auth-service.md
│   │
│   ├── standards/                       ← agteamos-standards
│   │   ├── standards.yml                 ← manifest: qué aplica, qué se adapta, qué se desvía
│   │   ├── index.yml                     ← keyword → carpeta, para no escanear las ~11 carpetas
│   │   ├── api/
│   │   │   ├── README.md                 ← reglas adaptadas a ESTE proyecto
│   │   │   ├── examples.md               ← ejemplos reales tomados del código del proyecto
│   │   │   └── deviations.md             ← solo si hay desviaciones (opcional)
│   │   ├── git/README.md
│   │   ├── security/README.md
│   │   ├── testing/README.md
│   │   ├── database/README.md
│   │   ├── frontend/README.md
│   │   ├── clean-architecture/README.md
│   │   ├── solid-principles/README.md
│   │   ├── dry-kiss-yagni/README.md
│   │   ├── domain-driven-design/README.md
│   │   └── devops/README.md
│   │
│   ├── specs/                            ← specs maestras persistentes, estilo OpenSpec
│   │   ├── index.yml                     ← keyword → dominio.md (mismo criterio que standards/index.yml)
│   │   ├── notifications.md              ← Coverage: seeded | partial | complete
│   │   └── invoicing.md
│   │
│   └── changes/                          ← reemplaza tasks/active + tasks/completed
│       ├── 42-email-notifications/       ← activa
│       │   ├── task.yml                   (metadata: schema full|lite, status, owner, domains...)
│       │   ├── brief.md                   (input original del usuario — solo schema full, inmutable)
│       │   ├── progress.md                (tracking de sesión/handoff — checkpoint protocol)
│       │   ├── report.html                (generado, NO se commitea)
│       │   ├── verify-report.md           (aparece recién al cierre — paso "verify")
│       │   ├── knowledge-base.md          (aprendizajes/decisiones reutilizables — escrito al cerrar)
│       │   ├── evidence/                  (screenshots QA)
│       │   │   ├── e2e-login-flow.png
│       │   │   └── e2e-email-sent.png
│       │   └── specs/                     (solo si schema: full)
│       │       ├── requirements.md
│       │       ├── design.md
│       │       ├── tasks.md
│       │       └── deltas/
│       │           └── notifications.md
│       └── archive/
│           └── 2026-07-15-1-jwt-auth/    ← close-task mueve aquí al cerrar
│               └── [misma estructura]
│
└── [tu código aquí]
```

## Control de versiones: qué se commitea y qué no

**`agteamos/` se commitea como cualquier código fuente** — es la misma decisión de fondo que Agent OS y OpenSpec aplican a `.agent-os/`/`openspec/`: la spec y el estado de las tareas viven en git, versionados junto con el código que describen, no aparte.

**Excepción — 2 archivos siempre generados, nunca commiteados**, porque son 100% derivables de `task.yml` + `progress.md` + `verify-report.md`, y versionarlos garantiza un conflicto de merge en cada PR en cuanto hay más de un desarrollador tocando tareas distintas al mismo tiempo:

- `agteamos/dashboard.html`
- `agteamos/changes/**/report.html`

Agregalos a tu `.gitignore`:

```
agteamos/dashboard.html
agteamos/changes/**/report.html
```

Ambos se regeneran on-demand con `agteamos-dashboard` (o automáticamente al cerrar una tarea) — no hace falta que existan en el repo para que el sistema funcione, solo abrirlos localmente con `file://`. Ver el detalle completo en [Compartir con tu equipo](../primeros-pasos/03-compartir-con-tu-equipo.md).

## Tabla de mapeo (esquema anterior → `agteamos/`)

Si venías de un proyecto documentado con el esquema anterior (`docs/00-08`), esta es la equivalencia:

| Antes | Ahora |
|---|---|
| `docs/00-product/` | `agteamos/product/` |
| `docs/01-architecture/` | `agteamos/architecture/` |
| `docs/02-api/` | `agteamos/api/` |
| `docs/03-ui-ux/` | `agteamos/design/` |
| `docs/04-devops/` | `agteamos/devops/` |
| `docs/05-security/` | `agteamos/security/` |
| `docs/06-incidents/` | `agteamos/incidents/` |
| `docs/07-decisions/` | `agteamos/decisions/` |
| `docs/08-standards/` | `agteamos/standards/` |
| `docs/specs/<dominio>.md` | `agteamos/specs/<dominio>.md` |
| `docs/tasks/active/TASK-<id>-<slug>/` | `agteamos/changes/<id>-<slug>/` |
| `docs/tasks/completed/TASK-<id>-<slug>/` | `agteamos/changes/archive/<fecha>-<id>-<slug>/` |
| `.../specs/spec-delta.md` (dentro de la tarea) | `.../specs/deltas/<dominio>.md` |
| `TASK-<id>-<slug>.md` (archivo de tracking) | `progress.md` |

## Qué genera cada skill/agente

### `agteamos-repo-context-check` / `agteamos-onboard` generan (proyecto sin `agteamos/` todavía):

- `agteamos/architecture/PROJECT_CONTEXT.md` — stack detectado desde `package.json`, `pyproject.toml`, `*.csproj`
- `agteamos/api/openapi.yml` — escaneando routers/controllers
- `agteamos/design/DESIGN_SYSTEM.md` — leyendo `tailwind.config.js`, CSS, theme providers
- `agteamos/devops/INFRASTRUCTURE.md` — leyendo `Dockerfile`, `docker-compose.yml`, workflows de CI
- `agteamos/specs/<dominio>.md` con `Coverage: seeded` — siembra parcial, por ingeniería inversa, del comportamiento que puede confirmar contra el código real (ver [Adoptar un proyecto existente](../primeros-pasos/04-adoptar-proyecto-existente.md))
- `agteamos/changes/` — estructura vacía lista para usar

### `agteamos-new-project` genera además:

- `agteamos/product/backlog.md` — mirror de los tickets creados en GitHub/Azure para el MVP (Step 6)

### `agteamos-sdd-protocol` genera (por tarea), en `agteamos/changes/<id>-<slug>/`:

- `brief.md` — input original del usuario, inmutable (solo `schema: full`)
- `specs/requirements.md` — Product Owner
- `specs/design.md` — Architect
- `specs/deltas/<dominio>.md` — Architect
- `specs/tasks.md` — Project Manager

### `agteamos-task-tracking` genera, en `agteamos/changes/<id>-<slug>/`:

- `progress.md` — tracking file con progress log, unit tests, evidencia y Next Action
- `task.yml` — metadata estructurada, incluyendo `owner` capturado vía `git config`

### `agteamos-close-task` genera al cerrar:

- `verify-report.md` — gate RFC 2119 antes del merge
- `knowledge-base.md` — aprendizajes y decisiones reutilizables de la tarea, para que el próximo agente (o `agteamos-onboard`/`agteamos-docs`) no repita la misma investigación

### `agteamos-dashboard` genera:

- `report.html` por tarea (se regenera cada vez que `agteamos-task-tracking` actualiza `progress.md`/`task.yml`) — **no se commitea**
- `agteamos/dashboard.html` — agrega el estado de todas las tareas activas y archivadas — **no se commitea**

### QA Engineer genera:

Screenshots en `agteamos/changes/<id>-<slug>/evidence/` usando Playwright:
```typescript
await page.screenshot({
  path: 'agteamos/changes/42-email-notifications/evidence/e2e-login-flow.png',
  fullPage: true
});
```

### `agteamos-adr` genera:

En `agteamos/architecture/adr/`: `ADR-{NNN}-{slug}.md` por cada decisión arquitectónica importante.

### `agteamos-close-task` archiva:

Mueve `agteamos/changes/{id}-{slug}/` → `agteamos/changes/archive/{fecha}-{id}-{slug}/` — solo después de generar `verify-report.md`, confirmar el merge y aplicar el paso `sync` sobre `agteamos/specs/<dominio>.md`. Limpia la branch y cierra el ticket en GitHub/Azure DevOps.

## Reglas de la carpeta `agteamos/`

1. **Siempre existe** — si no existe, `agteamos-repo-context-check` dispara `agteamos-onboard` para crearla por ingeniería inversa antes de cualquier tarea.
2. **Es la fuente de verdad** — los agentes la leen antes de cualquier acción; nunca asumen el estado del proyecto.
3. **Se actualiza con cada tarea** — salvo que `task.yml` declare `doc_impact: false`.
4. **Se commitea como código fuente** — con las 2 excepciones generadas (`dashboard.html`, `changes/**/report.html`) listadas arriba en `.gitignore`.
5. **Las specs de tarea van en `agteamos/changes/<id>-<slug>/specs/`** — la spec maestra persistente va en `agteamos/specs/<dominio>.md`, nunca mezcladas.

## Naming conventions

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| ID de tarea | `{número}` | `42` |
| Carpeta de tarea | `{id}-{slug}` | `42-email-notifications` |
| Archivo de tracking | `progress.md` | `progress.md` |
| ADR | `ADR-{NNN}-{slug}.md` | `ADR-003-cloud-platform.md` |
| Evidencia | `{flujo}-{estado}.png` | `e2e-login-success.png` |
| Branch (GitHub) | `feature/{id}-{slug}` | `feature/42-email-notifications` |
| Branch (Azure) | `feature/AB{id}-{slug}` | `feature/AB1234-email-notifications` |
| Archivo archivado | `{fecha}-{id}-{slug}/` | `2026-07-15-1-jwt-auth/` |

## Re-verificar cuando terminen todas las olas

`knowledge-base.md` y `specs/index.yml` se documentan acá como decisión ya tomada para esta ronda de cambios, pero no se pudo confirmar el Step exacto de generación en `skills/task-closure/SKILL.md` ni en `skills/sdd-protocol/SKILL.md` al momento de escribir esta página (esos archivos los tocan otros agentes en paralelo). Confirmar que ambos quedaron efectivamente cableados antes de dar esta página por definitiva.
