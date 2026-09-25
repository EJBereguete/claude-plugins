# Configurar la plataforma (`agteamos-setup`)

Guía de referencia rápida para configurar o reconfigurar `agteamos/platform.yml`. Si es la primera vez que usas AgTeamOS, ve al recorrido guiado en [Quickstart](../primeros-pasos/01-quickstart.md).

## Cuándo se dispara

- Automáticamente desde `agteamos-router` (Step 0), si `agteamos/platform.yml` todavía no existe.
- A demanda: pídele directamente a `@architect` "configura el proyecto" o invoca `/agteamos-setup`.
- Para completar campos que quedaron pendientes de una ejecución anterior — no regenera el archivo completo salvo que lo pidas explícitamente.

## Ronda 0 y configuración diferida

La Ronda 0 confirma solo lo bloqueante:

1. **Dónde vive el repositorio**: GitHub, Azure DevOps o ambos.
2. **Dónde viven los tickets**: GitHub Issues, Azure Boards o Planner,
   independientemente del repo.
3. **Proceso esperado de Azure**, si aplica: Agile, Scrum, Basic o CMMI.
   `agteamos-work-items` valida después el proceso real.
4. **Estrategia de branching**.

`handoff_mode` queda en `explicit` si no se cambia. Org/proyecto/equipo,
área, iteración, plan/bucket, CI/CD, deploy y PR convention se completan
mediante ask-and-continue la primera vez que se necesitan. Nunca se inventan.

## El campo `handoff_mode`

Controla cómo se comportan las transiciones entre agentes durante un flujo (ej. `@product-manager` → `@architect` → `@product-manager`):

| Valor | Comportamiento |
|---|---|
| `explicit` (default) | Cada transición entre agentes pide confirmación explícita antes de continuar |
| `auto` | Los agentes se pasan la posta solos, sin pedir confirmación en cada paso |

Pasar a `auto` es una decisión consciente que hay que pedir explícitamente — nunca es el default silencioso, incluso en proyectos pequeños o personales.

## Esquema completo de `agteamos/platform.yml`

```yaml
repo_host: github              # github | azure_devops | both
repo:
  github:
    org: acme
    name: invoicing-api
  azure_devops:
    organization: null
    project: null
tracker: github                # dónde viven los tickets
tracker_azure_devops:
  process_template: agile      # expectativa; se valida contra Azure
  team: null
  default_area_path: null
  default_iteration_path: null
tracker_planner:
  plan_id: null
  default_bucket_id: null
  graph_permissions_consented: false
work_items:
  approval: exact_change_set
  inspect_repository: true
  verify_writes: true
env_var_names:                 # NOMBRES de variables, nunca valores
  github_token: GITHUB_TOKEN
  azure_devops_pat: AZURE_DEVOPS_PAT
branch_strategy: personal       # personal | team | custom
branch_strategy_custom: null
ci_target: github_actions       # github_actions | gitlab_ci | azure_pipelines | other
deploy_target: null             # vercel | railway | fly_io | cloud_run | vps | aws | azure | other | null
pr_convention:
  required_reviewers: 1
  reviewer_names: []
  merge_strategy: squash        # squash | merge_commit | rebase
handoff_mode: explicit          # explicit | auto
created_at: "2026-08-09"
```

## Quién consume cada campo

| Consumidor | Campo | Para qué |
|---|---|---|
| `agteamos-router` | existencia del archivo | Step 0 — decide si disparar `agteamos-setup` primero |
| Backend/Frontend Engineer | `branch_strategy` | Rama destino del PR |
| `agteamos-deploy` | `deploy_target`, `ci_target` | Comandos de deploy y verificación de CI |
| `agteamos-pr` | `pr_convention` | Reviewers requeridos, merge strategy |
| MCP `github`/`azure-devops` | `repo_host`, `repo.*`, `env_var_names` | Qué servidor MCP usar y con qué variable de auth |
| `agteamos-work-items` | `tracker`, `tracker_*`, `work_items` | Inspección, dry-run, aprobación y verificación de tickets |
| Todos los agentes | `handoff_mode` | Si piden confirmación en cada handoff o continúan solos |

Los adapters genéricos viven en `skills/work-items/` dentro del plugin. Setup
no crea `agteamos/tracker/`. Esa carpeta aparece únicamente para un override
personalizado aprobado; los archivos v3 existentes se preservan como
compatibilidad y nunca se regeneran automáticamente.

## Provider doctor

Antes del primer `apply`, `agteamos-work-items doctor` comprueba auth,
proyecto y capacidades reales del proveedor. En Azure también descubre
proceso, work item types, campos custom, estados, áreas, iteraciones, usuarios
y `bugsBehavior`. Cuando el draft lo necesita, comprueba además una ruta
estructurada Unicode-safe, layout efectivo y capacidades de attachments; no
se guardan paths ni correcciones horarias específicas de una organización.
En Planner valida Graph, plan, bucket y ETags.

Doctor es read-only y devuelve `configured`, `degraded` o `unavailable`.
Ninguna escritura comienza si falta, quedó stale o no tiene verdes las
capacidades del change set. Ver
[Contratos ejecutables y provider doctor](./contratos-y-doctor.md).

## Errores comunes a evitar

- Asumir `branch_strategy: personal` porque el repo es chico — un repo pequeño puede ser de equipo. Siempre se pregunta.
- Escribir el valor real de un token en `platform.yml` — solo el *nombre* de la variable de entorno; el valor va fuera de la conversación.
- Regenerar el archivo completo cuando ya existe — `agteamos-setup` actualiza campos puntuales salvo pedido explícito de recrearlo desde cero.
- Asumir `handoff_mode: auto` sin preguntarlo.
- Fijar `State: New`, `State: Closed` o `Iteration Path: Backlog` por
  convención — `agteamos-work-items` descubre los valores reales.
- Usar el tracker para operaciones de PR — los PRs pertenecen a `repo_host`.

## Siguiente paso sugerido

Si `agteamos-router` determinó que el repo está vacío, sigue con `agteamos-bootstrap`. Si el repo ya tiene código, sigue con `agteamos-knowledge` para documentar lo existente contra esta configuración.
