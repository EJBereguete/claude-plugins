---
name: agteamos-setup
description: >
  Configura la plataforma real del proyecto: host del repo, tracker, branching,
  CI/CD, deploy, PRs y handoffs. Persiste solo agteamos/platform.yml; los
  adapters genéricos permanecen versionados dentro de agteamos-work-items.
used_by:
  - architect
---

# Skill: AgTeamOS Setup

## Contrato

- **Trigger**: falta `agteamos/platform.yml`, o el usuario pide configurar la
  plataforma.
- **Output obligatorio**: `agteamos/platform.yml`.
- **Output global**: upsert en `~/.claude/agteamos/projects.yml`.
- **No crea**: `tracker/`, standards, specs, backlog ni carpetas de dominio.
- **Responsable**: `@architect`.

Setup puede crear `agteamos/` porque escribe `platform.yml`; nunca crea
contenedores vacíos. El layout posterior lo gobierna
`contracts/project-layout.json`.

## Principio

Nunca convertir una detección en una decisión silenciosa. Mostrar la evidencia
y pedir confirmación para los tres campos bloqueantes:

```text
repo_host | tracker | branch_strategy
```

`handoff_mode` sí tiene default anunciado: `explicit`.

## Step 1 — Detectar sin escribir

Inspeccionar solo señales disponibles:

```bash
git remote -v
git branch -a
```

Además, buscar configuración existente de CI y deploy (`.github/workflows/`,
`azure-pipelines.yml`, `Dockerfile`, `fly.toml`, `vercel.json`,
`cloudbuild.yaml`). Una señal detectada queda `detected`, nunca `confirmed`
sin respuesta humana.

## Step 2 — Ronda 0

Hacer un único bloque de preguntas:

1. Host del código: GitHub, Azure DevOps o ambos.
2. Tracker: GitHub Issues, Azure Boards o Microsoft Planner.
3. Branching: personal, team o custom.

Si el tracker es Azure Boards, preguntar también la expectativa de proceso:
Agile, Scrum, Basic o CMMI. Es una expectativa que
`agteamos-work-items doctor` debe contrastar con el proyecto real; no autoriza
a asumir tipos, campos, estados o jerarquía.

Si el tracker es Planner, explicar que requiere un transporte Microsoft Graph
disponible (integración compatible o `az rest`) y permisos consentidos. Setup
registra la elección, pero no promete conectividad: hasta que
`agteamos-work-items doctor` compruebe transporte, identidad y permisos,
Planner queda `degraded` y `apply` permanece bloqueado.

No continuar mientras falte uno de los tres campos bloqueantes. No preguntar
todavía por datos que solo importan al primer uso.

## Step 3 — Ask-and-continue

Los campos siguientes se completan cuando su consumidor los necesita:

| Campo | Trigger | Consumidor |
|---|---|---|
| organización/nombre del repo | primera operación remota | PR/work-items |
| Azure team/area/iteration | primer doctor/draft Azure | work-items |
| Planner plan/bucket/permisos | primer doctor/draft Planner | work-items |
| CI target | primer cambio de CI o checks | implement/deploy |
| deploy target | primer deploy | deploy |
| convención de PR | primer create-pr | implement |

El consumidor hace una pregunta puntual, persiste el valor como `confirmed` y
continúa. Nunca obliga a repetir setup completo por un campo no bloqueante.

## Step 4 — Escribir `platform.yml`

Todas las claves existen; lo desconocido queda `null`/`pending`:

```yaml
repo_host: github                 # github | azure_devops | both
repo:
  github:
    org: null
    name: null
  azure_devops:
    organization: null
    project: null

tracker: github                   # github | azure_devops | planner
tracker_planner:
  plan_id: null
  default_bucket_id: null
  graph_permissions_consented: false
tracker_azure_devops:
  process_template: agile
  team: null
  default_area_path: null
  default_iteration_path: null

work_items:
  approval: exact_change_set
  inspect_repository: true
  verify_writes: true

env_var_names:
  github_token: GITHUB_TOKEN
  azure_devops_pat: AZURE_DEVOPS_PAT

branch_strategy: personal        # personal | team | custom
branch_strategy_custom: null
ci_target: null
deploy_target: null
pr_convention:
  required_reviewers: 1
  reviewer_names: []
  merge_strategy: squash
handoff_mode: explicit

field_status:
  repo_host: confirmed
  tracker: confirmed
  branch_strategy: confirmed
  ci_target: pending
  deploy_target: pending
  pr_convention: pending
reviewed: true

quality_pulse:
  enabled: true
  lint_on_edit: false
created_at: "YYYY-MM-DD"
```

`reviewed` es derivado: solo es `true` cuando los tres campos bloqueantes están
`confirmed`. Nunca guardar secretos; solo nombres de variables.

## Step 5 — Registro global y `.gitignore`

Upsert por path canónico en `~/.claude/agteamos/projects.yml`:

```yaml
projects:
  - name: <nombre>
    aliases: []
    path: <ruta-absoluta>
    has_agteamos: true
    repo_host: <valor>
    tracker: <valor>
    reviewed: <bool>
    last_active: YYYY-MM-DD
```

Preservar `name` y `aliases` existentes. No registrar paths no verificables.

Después del upsert, regenerar el portal global en modo best-effort:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-dashboard.mjs" --portal
```

Si falla, informar la advertencia y continuar: el registro confirmado es la
fuente canónica y el portal es una vista derivada.

Agregar sin duplicar:

```text
agteamos/dashboard.html
agteamos/changes/**/report.html
agteamos/.cache/
```

No inventar un `.gitignore` completo del stack.

## Step 6 — Proveedores sin copias por proyecto

Los defaults versionados son:

- `skills/work-items/GITHUB-OPERATIONS.md`;
- `skills/work-items/AZURE-OPERATIONS.md`;
- `skills/work-items/PLANNER-OPERATIONS.md`;
- `skills/work-items/PROVIDER-DOCTOR.md`.

`agteamos-work-items` elige el módulo desde `platform.yml`, ejecuta doctor
read-only, descubre capacidades reales y controla dry-run, aprobación,
escritura y read-back. Setup no genera `agteamos/tracker/<provider>.md` ni
duplica tablas CLI.

### Override personalizado

Crear `agteamos/tracker/<id>.md` únicamente si el usuario solicita y aprueba
un adapter custom que los módulos del plugin no pueden expresar. Debe:

1. declarar proveedor, alcance y razón;
2. contener solo diferencias respecto del módulo del plugin;
3. conservar el contrato doctor → draft → aprobación → apply → verify;
4. registrarse como `tracker_override: done` en onboarding si este existe;
5. cambiar `lifecycle` a `active`.

Un `agteamos/tracker/*.md` de proyectos v3 se preserva como override legacy y
se lee antes del default. No regenerarlo, copiarlo ni borrarlo
automáticamente.

## Step 7 — Handoff de onboarding

- Repo con código: sugerir `agteamos-knowledge --init` (`adopted_l0`).
- Repo vacío: sugerir `agteamos-bootstrap` (`greenfield_phase0`).

Mostrar el `platform.yml` final antes de escribir si reemplazaría valores
confirmados. Una creación solicitada o la actualización de campos pendientes
usa el flujo normal; no sobrescribir decisiones existentes.

## Dependencias

- **Hard**: falta `platform.yml` o un campo bloqueante. Detener y ejecutar
  setup.
- **Ask-and-continue**: falta un campo diferido concreto. Preguntar solo ese
  dato y continuar.
- **Soft**: el flujo puede operar sin el campo. Declarar la degradación.

## Pasos manuales

Si un proveedor exige consentimiento, credenciales o una acción de admin,
crear `agteamos/scripts/wizards/<paso>.sh` solo cuando esa necesidad real
aparezca y el usuario quiera un asistente reusable. La skill que escribe el
script crea su carpeta; setup inicial no crea `scripts/`.

## Anti-patrones

- Copiar adapters genéricos al proyecto.
- Asumir branching, tracker o campos de Azure por convención.
- Tratar la expectativa de proceso Azure como discovery real.
- Inventar IDs de Planner, areas, iteraciones o responsables.
- Guardar tokens en `platform.yml`.
- Crear backlog, tickets, standards o carpetas vacías desde setup.
- Reemplazar todo `platform.yml` para actualizar un único campo.

**Próximo paso sugerido**: `agteamos-bootstrap` o
`agteamos-knowledge --init` — según exista código real.
