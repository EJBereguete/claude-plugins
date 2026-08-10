# Configurar la plataforma (`agteamos-setup`)

Guía de referencia rápida para configurar o reconfigurar `agteamos/platform.yml`. Si es la primera vez que usas AgTeamOS, ve al recorrido guiado en [Primeros pasos](../primeros-pasos/02-primer-proyecto.md).

## Cuándo se dispara

- Automáticamente desde `agteamos-flow-router` (Step 0), si `agteamos/platform.yml` todavía no existe.
- A demanda: pídele directamente a `@architect` "configura el proyecto" o invoca `/agteamos-setup`.
- Para completar campos que quedaron pendientes de una ejecución anterior — no regenera el archivo completo salvo que lo pidas explícitamente.

## Las 8 preguntas (siempre en un solo mensaje)

1. **Dónde vive el repo y los tickets**: GitHub, Azure DevOps, o ambos.
2. **Org/proyecto**: nombre exacto del repo o del proyecto de Azure DevOps.
3. **Nombres de las variables de entorno** para los tokens de acceso (nunca el valor — solo el nombre, ej. `GITHUB_TOKEN`).
4. **Estrategia de branching**: personal (`feature/* → main`), equipo (`feature/* → develop → staging → main`), u otra.
5. **CI/CD target**: GitHub Actions, GitLab CI, Azure Pipelines, u otro.
6. **Deploy target**: Vercel, Railway, Fly.io, Cloud Run, VPS, AWS, Azure, u "todavía no definido".
7. **Convención de PR**: reviewers obligatorios y merge strategy (squash / merge commit / rebase).
8. **`handoff_mode`**: `explicit` (default) o `auto` — ver más abajo.

Ningún campo tiene un default silencioso, salvo `handoff_mode`. Si el usuario no puede responder algo (ej. "todavía no elegimos deploy target"), el valor queda como `null` — nunca se inventa.

## El campo `handoff_mode`

Controla cómo se comportan las transiciones entre agentes durante un flujo (ej. `@product-owner` → `@architect` → `@project-manager`):

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
env_var_names:                 # NOMBRES de variables, nunca valores
  github_token: GITHUB_TOKEN
  azure_devops_pat: null
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
| `agteamos-flow-router` | existencia del archivo | Step 0 — decide si disparar `agteamos-setup` primero |
| Backend/Frontend Engineer | `branch_strategy` | Rama destino del PR |
| `agteamos-deploy` | `deploy_target`, `ci_target` | Comandos de deploy y verificación de CI |
| `agteamos-pr-standards` | `pr_convention` | Reviewers requeridos, merge strategy |
| MCP `github`/`azure-devops` | `repo_host`, `repo.*`, `env_var_names` | Qué servidor MCP usar y con qué variable de auth |
| Todos los agentes | `handoff_mode` | Si piden confirmación en cada handoff o continúan solos |

## Errores comunes a evitar

- Asumir `branch_strategy: personal` porque el repo es chico — un repo pequeño puede ser de equipo. Siempre se pregunta.
- Escribir el valor real de un token en `platform.yml` — solo el *nombre* de la variable de entorno; el valor va fuera de la conversación.
- Regenerar el archivo completo cuando ya existe — `agteamos-setup` actualiza campos puntuales salvo pedido explícito de recrearlo desde cero.
- Asumir `handoff_mode: auto` sin preguntarlo.

## Siguiente paso sugerido

Si `agteamos-repo-context-check` determinó que el repo está vacío, sigue con `agteamos-new-project`. Si el repo ya tiene código, sigue con `agteamos-onboard` para documentar lo existente contra esta configuración.
