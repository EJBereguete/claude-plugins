---
name: agteamos-setup
description: >
  Configuracion inicial completa de la plataforma del proyecto: repo host,
  task tracker (GitHub Issues, Azure Boards o Microsoft Planner, elegido de
  forma independiente de donde vive el codigo), estrategia de branching,
  CI/CD, deploy target, convencion de PR y modo de handoff entre agentes.
  Persiste el resultado en agteamos/platform.yml. Se dispara automaticamente
  desde agteamos-flow-router (Step 0) si ese archivo no existe todavia.
used_by:
  - architect
---

# Skill: AgTeamOS Setup

## CONTRACT

- **Input**: ninguno explicito — se dispara cuando `agteamos/platform.yml` no existe
- **Output**: `agteamos/platform.yml` committeado
- **Trigger**: `agteamos-flow-router` Step 0, o el usuario pide "configura el proyecto" / "setup" directamente
- **Quien ejecuta**: `@architect`

---

## PRINCIPIO — nunca asumir, siempre preguntar

Esta skill existe precisamente porque asumir configuración por defecto (branching
strategy, repo host, convención de PR) produce el tipo de inconsistencia que este
refactor corrigió (ej. una rama `testing` fantasma que nadie configuró). Todas las
preguntas de esta skill son obligatorias — no hay defaults silenciosos, salvo
`handoff_mode` que sí tiene un default explícito (`explicit`) documentado en el
Step 1.

---

## PROCESS

### Step 1 — Preguntar en un solo mensaje (no una por una)

```
1. ¿Dónde vive el repositorio de código?
   a) GitHub
   b) Azure DevOps
   c) Ambos (monorepo o repos espejo)

1.1 ¿Dónde viven las tareas/tickets del proyecto? — independiente de dónde
    vive el código: se puede tener código en GitHub y tickets en Azure
    Boards o en Microsoft Planner, por ejemplo. El usuario elige libremente
    entre las tres, sin que la respuesta de la pregunta 1 la condicione.
   a) GitHub Issues
   b) Azure Boards
   c) Microsoft Planner

   Si 1.1 = Azure Boards, preguntar además:
   - Proceso de Azure Boards del proyecto: **Agile** (default — Epic >
     Feature > User Story > Task, Bug con Acceptance Criteria) / Scrum
     (Product Backlog Item en vez de User Story, Effort en vez de Story
     Points) / Basic / CMMI. Los nombres de campo de cada work item type
     dependen del proceso — no asumir Agile sin preguntar si el proyecto
     puede ser Scrum.
   - Area Path y Iteration Path por default para tickets nuevos (ej.
     `MyProject\\Team1`, `MyProject\\Sprint 1`) — si no los tiene definidos
     todavía, registrar `null` y resolverlo después (no bloquea, ver Step 2).

   Si 1.1 = Microsoft Planner, preguntar además:
   - Plan ID de Microsoft Planner (se puede extraer del link del plan en
     planner.cloud.microsoft, o vía Graph Explorer).
   - Bucket por default donde `create-ticket` va a crear tareas nuevas — si
     el usuario todavía no lo definió, registrar `null` y resolverlo después
     (no bloquea el resto del setup, ver Step 2).
   - Confirmar si los permisos de Microsoft Graph delegados
     (`Tasks.ReadWrite`, `Group.Read.All`) ya están consentidos en el
     tenant de M365. Si el usuario no lo sabe o dice que no: registrar
     `tracker_planner.graph_permissions_consented: false` en `platform.yml`
     y avisar explícitamente que `tracker: planner` va a quedar configurado
     pero NO funcional hasta que un admin de M365 conceda esos permisos —
     no es algo que AgTeamOS pueda resolver por su cuenta.

2. Si aplica GitHub: org/usuario y nombre del repo (ej. "acme/invoicing-api").
   Si aplica Azure DevOps: organización y nombre del proyecto.

3. Nombres de las variables de entorno donde vivirán los tokens de acceso
   (NUNCA el valor del token — solo el nombre de la variable, ej.
   "GITHUB_TOKEN", "AZURE_DEVOPS_PAT"). El usuario configura el valor real
   por fuera de esta conversación.

4. Estrategia de branching:
   a) Personal: feature/* → main
   b) Equipo: feature/* → develop → staging → main
   c) Otra (describir)

5. CI/CD target: GitHub Actions / GitLab CI / Azure Pipelines / otro.

6. Deploy target: Vercel, Railway, Fly.io, Cloud Run, VPS, AWS, Azure,
   otro — o "todavía no definido".

7. Convención de PR:
   - Reviewers obligatorios (¿cuántos? ¿quién?)
   - Merge strategy: squash / merge commit / rebase

8. Modo de handoff entre agentes (NUEVO):
   a) Explícito (default) — cada transición entre agentes (ej.
      @product-owner → @architect → @project-manager) pide confirmación
      del usuario antes de continuar.
   b) Automático — los agentes se pasan la posta solos, sin pedir
      confirmación en cada paso.
```

No proceder a Step 2 hasta tener respuesta a las 9 preguntas (o una respuesta
explícita de "todavía no lo sé" para las que no bloquean, ver Step 2, o
aceptar el default de la pregunta 8 si el usuario no tiene preferencia).

### Step 2 — Resolver respuestas incompletas

Si el usuario no puede responder algo (ej. "todavía no elegimos deploy target"),
registrar el valor como `null` en `platform.yml`, NUNCA inventar un valor. La
skill `agteamos-setup` puede re-ejecutarse más adelante para completar campos
pendientes — no bloquea el resto del flujo salvo `repo_host`, `tracker` y
`branch_strategy`, que son obligatorios porque otras skills (`agteamos-deploy`,
`agteamos-new-project`, `agteamos-new-task`, `agteamos-task-closure`, PRs de
todos los engineers) dependen de ellos desde el primer commit.
`handoff_mode` sí tiene default (`explicit`) si el usuario no responde nada.

**Excepción dentro de `tracker: planner`**: `tracker` en sí es obligatorio,
pero `tracker_planner.plan_id`, `default_bucket_id` y
`graph_permissions_consented` pueden quedar `null`/`false` sin bloquear —
solo bloquean el *uso* de `create-ticket`/`get-ticket`/etc. contra Planner
(esas operaciones fallarán con un mensaje claro si se invocan sin
`plan_id`), no el resto del setup ni del proyecto.

**Excepción dentro de `tracker: azure_devops`**: `process_template` sí es
obligatorio (default `agile` si el usuario no tiene preferencia — decirlo
explícitamente, no asumirlo en silencio); `default_area_path` y
`default_iteration_path` pueden quedar `null` sin bloquear — cada operación
de creación de work item pide el área/iteración puntual si no hay default,
en vez de fallar.

### Step 3 — Escribir `agteamos/platform.yml`

Esquema (todas las claves presentes, `null` si no se definió):

```yaml
# agteamos/platform.yml
repo_host: github              # github | azure_devops | both
repo:
  github:
    org: acme
    name: invoicing-api
  azure_devops:
    organization: null
    project: null
tracker: github                # github | azure_devops | planner — dónde viven los tickets
tracker_planner:               # solo se completa si tracker: planner
  plan_id: null
  default_bucket_id: null
  graph_permissions_consented: false   # Tasks.ReadWrite + Group.Read.All consentidos en el tenant
tracker_azure_devops:           # solo se completa si tracker: azure_devops
  process_template: agile       # agile | scrum | basic | cmmi — determina nombres de campo y jerarquia
  default_area_path: null       # ej. "MyProject\Team1"
  default_iteration_path: null  # ej. "MyProject\Sprint 1"
env_var_names:                 # NOMBRES de variables, nunca valores
  github_token: GITHUB_TOKEN
  azure_devops_pat: null
branch_strategy: personal       # personal (feature/*→main) | team (feature/*→develop→staging→main) | custom
branch_strategy_custom: null    # descripcion si branch_strategy: custom
ci_target: github_actions       # github_actions | gitlab_ci | azure_pipelines | other
deploy_target: null             # vercel | railway | fly_io | cloud_run | vps | aws | azure | other | null
pr_convention:
  required_reviewers: 1
  reviewer_names: []
  merge_strategy: squash        # squash | merge_commit | rebase
handoff_mode: explicit          # NUEVO — explicit (pide confirmacion en cada transicion) | auto
created_at: "2026-08-09"
```

### Step 3.5 — Asegurar `.gitignore` para los artefactos generados

`agteamos/` se commitea como fuente (ver política en el README), **excepto**
los HTML derivados — `agteamos/dashboard.html` y
`agteamos/changes/**/report.html` son 100% regenerables desde `task.yml` +
`progress.md`, y versionarlos garantiza conflicto de merge en cada PR con más
de un desarrollador.

Revisar `.gitignore` en la raíz del repo (crearlo si no existe) y asegurar
que contenga, si no están ya:
```
agteamos/dashboard.html
agteamos/changes/**/report.html
agteamos/.cache/
```
`agteamos/.cache/` es el cache local y desechable de hallazgos (ledger de
`agteamos-review`, `agteamos-audit` y `agteamos-domain-review`, más el hash
del último nudge del Stop hook) — es por-checkout, nunca se comparte entre
desarrolladores.

Si el archivo ya tiene esas líneas (proyecto que corrió `setup` antes), no
duplicar. Si `.gitignore` no existe, crearlo con solo esas 3 líneas — no
inventar un `.gitignore` genérico de stack (eso es responsabilidad de
`agteamos-new-project`/`agteamos-onboard`, no de `setup`).

### Step 3.6 — Generar el tracker adapter (`agteamos/tracker/<tipo>.md`)

**Por qué existe esto**: hoy las skills tienen ~34 comandos `gh` hardcodeados
repartidos en 11 archivos. Si `repo_host`/`tracker` es `azure_devops`, esos
comandos no sirven — es una opción que `platform.yml` ofrece pero que hoy no
funciona de verdad. El fix: las skills invocan una **operación abstracta**
(`create-ticket`, `close-ticket`, `create-pr`, `merge-pr`, `comment-pr`,
`link-pr-to-ticket`) y un archivo adapter por tracker resuelve qué comando
real correr. Agregar un tracker nuevo (ej. Jira) es escribir un adapter más,
sin tocar ninguna skill.

Escribir `agteamos/tracker/<tracker>.md` con **las 16 operaciones
completas**, sin importar si `tracker` coincide o no con `repo_host` —
ninguna skill consumidora debe enterarse de esa diferencia:

- **Si `tracker == repo_host`** (caso más común: código y tickets en la
  misma plataforma): una sola tabla nativa, exactamente como hasta ahora.
- **Si `tracker != repo_host`** (ej. código en GitHub + tickets en Azure
  Boards, o cualquiera de los dos + Microsoft Planner): las **6 filas de
  ticket** (`create-ticket`, `get-ticket`, `close-ticket`, `comment-ticket`,
  `link-pr-to-ticket`, `list-milestones`) salen de la tabla nativa de
  `tracker`; las **10 filas de PR** (`create-pr`, `get-pr`, `get-pr-diff`,
  `get-pr-files`, `get-pr-checks`, `approve-pr`, `request-changes-pr`,
  `merge-pr`, `merge-pr-commit`, `comment-pr`, `merge-to-protected-branch`)
  se **copian literalmente** de la tabla de `repo_host` ya generada.
  Agregar al final del archivo generado: *"Filas de PR heredadas de
  `repo_host: <valor>` — si se reconfigura el repo host, re-ejecutar
  `agteamos-setup` para regenerar este archivo."* Esto es lo que permite que
  Microsoft Planner (que no tiene PRs) encaje en el mismo formato de 16
  filas que ya consumen las 11 skills, sin que ninguna cambie.

Las tablas nativas por plataforma (según `tracker:` de `platform.yml`,
escribir `agteamos/tracker/github.md`, `agteamos/tracker/azure_devops.md`
y/o `agteamos/tracker/planner.md` según corresponda — puede haber dos
archivos si `tracker != repo_host`, ver arriba):

```markdown
# Tracker Adapter: GitHub

| Operación abstracta | Comando |
|---|---|
| create-ticket | `gh issue create --title "<title>" --body "<body>"` |
| get-ticket | `gh issue view <id> --json title,body,labels,assignees,state` |
| close-ticket | `gh issue close <id>` |
| comment-ticket | `gh issue comment <id> --body "<body>"` |
| create-pr | `gh pr create --title "<title>" --body "<body>" --base <branch>` |
| get-pr | `gh pr view <id> --json state,mergeable,reviews` |
| get-pr-diff | `gh pr diff <id>` |
| get-pr-files | `gh pr view <id> --json files --jq '.files[].path'` |
| get-pr-checks | `gh pr view <id> --json statusCheckRollup` |
| approve-pr | `gh pr review <id> --approve --body "<body>"` |
| request-changes-pr | `gh pr review <id> --request-changes --body "<body>"` |
| merge-pr | `gh pr merge <id> --squash --delete-branch` |
| merge-pr-commit | `gh pr merge <id> --merge --delete-branch` (variante merge-commit, no squash) |
| comment-pr | `gh pr comment <id> --body "<body>"` |
| link-pr-to-ticket | Incluir `Closes #<id>` en el body del PR |
| merge-to-protected-branch | `gh pr merge <id> --base main --squash` (dispara el hook `remind-merge-approval`) |
| list-milestones | `gh api /repos/{owner}/{repo}/milestones` |
```
**Nota de mapeo `merge-pr` vs `merge-to-protected-branch`**: cuál corresponde
depende de `branch_strategy` en `platform.yml`, no es fijo por skill — si la
rama destino del merge es la de producción (`main`/`master`, o la única rama
en `branch_strategy: personal`), es `merge-to-protected-branch`; si es una
rama de integración intermedia (`develop`/`staging` en `branch_strategy: team`),
es `merge-pr`. La skill que invoca la operación resuelve esto contra
`platform.yml` en el momento, no de antemano.

Generar la tabla que corresponda a `tracker_azure_devops.process_template`
— **Agile o Scrum**, nunca las dos en el mismo archivo (si el proyecto usara
ambas, algo que Azure no soporta de todos modos, sería una contradicción).
`process_template: basic` o `cmmi` no tienen tabla propia todavía — avisar
explícitamente que AgTeamOS solo cubre Agile y Scrum hoy, y usar la tabla
Agile como fallback razonable documentando la limitación en el archivo
generado, no en silencio.

```markdown
# Tracker Adapter: Azure DevOps (Agile)

> **Jerarquía**: `Epic > Feature > User Story > Task`, con `Bug` al mismo
> nivel que `User Story` por default (configurable en el proyecto real,
> pero AgTeamOS asume el default de Azure salvo que el usuario diga lo
> contrario).

| Operación abstracta | Comando |
|---|---|
| create-ticket | Alias de `create-story` (ver abajo) — se mantiene por compatibilidad con skills que no distinguen tipo de work item. |
| create-epic | `az boards work-item create --type "Epic" --title "<title>" --description "<body>" --area "<area_path o default_area_path>" --iteration "<iteration_path o default_iteration_path>" --fields "Microsoft.VSTS.Common.AcceptanceCriteria=<criteria>"` |
| create-feature | `az boards work-item create --type "Feature" --title "<title>" --description "<body>" --area "<area_path>" --iteration "<iteration_path>" --fields "Microsoft.VSTS.Common.AcceptanceCriteria=<criteria>"` |
| create-story | `az boards work-item create --type "User Story" --title "<title>" --description "<body>" --area "<area_path>" --iteration "<iteration_path>" --fields "Microsoft.VSTS.Common.AcceptanceCriteria=<criteria>" "Microsoft.VSTS.Scheduling.StoryPoints=<points>" "Microsoft.VSTS.Common.Priority=<1-4>"` |
| create-task | `az boards work-item create --type "Task" --title "<title>" --description "<body>" --area "<area_path>" --iteration "<iteration_path>" --fields "Microsoft.VSTS.Scheduling.OriginalEstimate=<horas>" "Microsoft.VSTS.Common.Activity=<Development\|Testing\|Design\|Documentation>"` |
| create-bug | `az boards work-item create --type "Bug" --title "<title>" --area "<area_path>" --iteration "<iteration_path>" --fields "Microsoft.VSTS.TCM.ReproSteps=<pasos>" "Microsoft.VSTS.Common.Severity=<1-4>"` — Bug usa `ReproSteps`, NO `Description` ni `AcceptanceCriteria` (esos campos no existen en el form de Bug del proceso Agile). |
| link-parent-child | `az boards work-item relation add --id <child_id> --relation-type parent --target-id <parent_id>` — correr siempre sobre el hijo, target es el padre (Epic←Feature←User Story←Task). |
| link-external-url | `az boards work-item relation add --id <id> --relation-type Hyperlink --target-url "<url>"` — para referencias a sistemas externos (Odoo, helpdesk, etc.), aparece en la pestaña Links del work item, no solo como texto en la descripción. |
| get-ticket | `az boards work-item show --id <id>` |
| close-ticket | `az boards work-item update --id <id> --state Closed` |
| comment-ticket | `az boards work-item update --id <id> --discussion "<body>"` |
| create-pr | `az repos pr create --title "<title>" --description "<body>" --source-branch <branch> --target-branch <base>` |
| get-pr | `az repos pr show --id <id>` |
| get-pr-diff | `az repos pr diff show --id <id>` (o `git diff` local contra la rama base — Azure CLI no tiene diff nativo de PR) |
| get-pr-files | `az repos pr show --id <id> --query "*"` (Azure CLI no expone lista de archivos directo; alternativa: `git diff --name-only <base>...<branch>` local) |
| get-pr-checks | `az repos pr policy list --id <id>` |
| approve-pr | `az repos pr set-vote --id <id> --vote approve` |
| request-changes-pr | `az repos pr set-vote --id <id> --vote reject` + comentario con el detalle |
| merge-pr | `az repos pr update --id <id> --status completed` |
| merge-pr-commit | `az repos pr update --id <id> --status completed` (Azure CLI no distingue squash/merge-commit en `pr update`; se configura como policy del repo, no por comando) |
| comment-pr | `az repos pr comment thread create --pull-request-id <id> --content "<body>"` |
| link-pr-to-ticket | Incluir `AB#<id>` en el título o body del PR |
| merge-to-protected-branch | `az repos pr update --id <id> --status completed` con `--target-branch main` — sin hook equivalente a `remind-merge-approval` hoy (ese hook solo matchea sintaxis `gh`) |
| list-milestones | `az boards iteration project list --project <project>` |
```

```markdown
# Tracker Adapter: Azure DevOps (Scrum)

> **Jerarquía**: `Epic > Feature > Product Backlog Item > Task`, con `Bug`
> al mismo nivel que `Product Backlog Item` por default (mismo toggle
> configurable que en Agile). **Diferencias de campo respecto a Agile —
> no intercambiar**: `Product Backlog Item` reemplaza a `User Story`;
> `Microsoft.VSTS.Scheduling.Effort` reemplaza a
> `Microsoft.VSTS.Scheduling.StoryPoints`; `Microsoft.VSTS.Common.BacklogPriority`
> reemplaza a `Microsoft.VSTS.Common.StackRank` para ordenar el backlog;
> el `Task` de Scrum **solo tiene `Remaining Work`** — no existen
> `Original Estimate` ni `Completed Work` en su formulario (a diferencia de
> Agile, que tiene los tres). `Microsoft.VSTS.Common.AcceptanceCriteria` y
> `Microsoft.VSTS.TCM.ReproSteps` (Bug) son idénticos a Agile, no cambian.

| Operación abstracta | Comando |
|---|---|
| create-ticket | Alias de `create-story` (ver abajo) — se mantiene por compatibilidad con skills que no distinguen tipo de work item. |
| create-epic | `az boards work-item create --type "Epic" --title "<title>" --description "<body>" --area "<area_path o default_area_path>" --iteration "<iteration_path o default_iteration_path>" --fields "Microsoft.VSTS.Common.AcceptanceCriteria=<criteria>"` |
| create-feature | `az boards work-item create --type "Feature" --title "<title>" --description "<body>" --area "<area_path>" --iteration "<iteration_path>" --fields "Microsoft.VSTS.Common.AcceptanceCriteria=<criteria>"` |
| create-story | `az boards work-item create --type "Product Backlog Item" --title "<title>" --description "<body>" --area "<area_path>" --iteration "<iteration_path>" --fields "Microsoft.VSTS.Common.AcceptanceCriteria=<criteria>" "Microsoft.VSTS.Scheduling.Effort=<effort>" "Microsoft.VSTS.Common.BacklogPriority=<orden>"` — el nombre del tipo sigue siendo "Product Backlog Item" aunque la operación abstracta se llame `create-story`, para no romper la resolución de `[operación: create-story]` de las skills consumidoras. |
| create-task | `az boards work-item create --type "Task" --title "<title>" --description "<body>" --area "<area_path>" --iteration "<iteration_path>" --fields "Microsoft.VSTS.Scheduling.RemainingWork=<horas>" "Microsoft.VSTS.Common.Activity=<Development\|Testing\|Design\|Documentation>"` — solo `RemainingWork`, sin `OriginalEstimate` ni `CompletedWork` (no existen en el form de Task de Scrum). |
| create-bug | `az boards work-item create --type "Bug" --title "<title>" --area "<area_path>" --iteration "<iteration_path>" --fields "Microsoft.VSTS.TCM.ReproSteps=<pasos>" "Microsoft.VSTS.Common.Severity=<1-4>"` — igual que en Agile. |
| link-parent-child | `az boards work-item relation add --id <child_id> --relation-type parent --target-id <parent_id>` — correr siempre sobre el hijo, target es el padre (Epic←Feature←PBI←Task). |
| link-external-url | `az boards work-item relation add --id <id> --relation-type Hyperlink --target-url "<url>"` — para referencias a sistemas externos (Odoo, helpdesk, etc.). |
| get-ticket | `az boards work-item show --id <id>` |
| close-ticket | `az boards work-item update --id <id> --state Closed` |
| comment-ticket | `az boards work-item update --id <id> --discussion "<body>"` |
| create-pr | `az repos pr create --title "<title>" --description "<body>" --source-branch <branch> --target-branch <base>` |
| get-pr | `az repos pr show --id <id>` |
| get-pr-diff | `az repos pr diff show --id <id>` (o `git diff` local contra la rama base) |
| get-pr-files | `az repos pr show --id <id> --query "*"` (alternativa: `git diff --name-only <base>...<branch>` local) |
| get-pr-checks | `az repos pr policy list --id <id>` |
| approve-pr | `az repos pr set-vote --id <id> --vote approve` |
| request-changes-pr | `az repos pr set-vote --id <id> --vote reject` + comentario con el detalle |
| merge-pr | `az repos pr update --id <id> --status completed` |
| merge-pr-commit | `az repos pr update --id <id> --status completed` (Azure CLI no distingue squash/merge-commit; se configura como policy del repo) |
| comment-pr | `az repos pr comment thread create --pull-request-id <id> --content "<body>"` |
| link-pr-to-ticket | Incluir `AB#<id>` en el título o body del PR |
| merge-to-protected-branch | `az repos pr update --id <id> --status completed` con `--target-branch main` |
| list-milestones | `az boards iteration project list --project <project>` — en Scrum estas iteraciones sí representan sprints reales, a diferencia de Planner donde era solo analogía estructural. |
```

**Por qué `create-story` es el mismo nombre de operación en ambas tablas
aunque el tipo real (`User Story` vs `Product Backlog Item`) sea distinto**:
las skills consumidoras (`agteamos-new-task`, `agteamos-story-breakdown`)
invocan la operación abstracta sin saber qué proceso está activo — el
mapeo al tipo/campo real vive únicamente acá, en el adapter generado. Esto
es la misma disciplina que ya aplica `create-ticket` entre GitHub y Azure
desde el día 1 de este sistema.

```markdown
# Tracker Adapter: Microsoft Planner

> ⚠️ **Requisito manual, fuera del control de AgTeamOS**: estas operaciones
> requieren que un admin de M365 haya consentido los permisos delegados de
> Microsoft Graph `Tasks.ReadWrite` + `Group.Read.All` para el usuario que
> ejecuta `az login`. Si `platform.yml` tiene
> `tracker_planner.graph_permissions_consented: false`, estas operaciones
> van a fallar con un 401/403 hasta que se resuelva — no es un bug del
> adapter. Si el usuario no tiene el admin a mano en el momento, generar
> `agteamos/scripts/wizards/planner-graph-consent.sh` (ver convención de
> "Wizard script para pasos manuales" más abajo) con los pasos y el link de
> consentimiento admin, en vez de narrarlo solo en el chat.
>
> `az rest` resuelve automáticamente el token de Microsoft Graph por el host
> de la URL (`graph.microsoft.com`), usando la sesión de `az login` ya
> activa — no hace falta una variable de entorno de token separada.
>
> **Concurrencia optimista**: la API de Planner exige el header `If-Match`
> con el `@odata.etag` vigente en todo `PATCH` — hay que hacer un `GET`
> previo para obtenerlo. Los comandos abajo lo indican donde aplica.
>
> **`list-milestones` es una analogía estructural, no funcional**: los
> "buckets" de Planner son columnas Kanban, no sprints/iteraciones con
> fechas — no asumir semántica de milestone temporal.
>
> **`link-pr-to-ticket` no tiene auto-close cruzado**: a diferencia de
> `Closes #<id>` (GitHub) o `AB#<id>` (Azure Boards), no existe integración
> nativa entre un PR de GitHub/Azure Repos y una tarea de Planner — el link
> queda como referencia manual en ambos lados, la tarea de Planner NO se
> cierra sola cuando el PR mergea.

| Operación abstracta | Comando |
|---|---|
| create-ticket | `az rest --method POST --url "https://graph.microsoft.com/v1.0/planner/tasks" --body '{"planId":"<plan_id>","bucketId":"<bucket_id>","title":"<title>"}'` — luego, para la descripción: `GET .../tasks/<id>/details` (tomar `@odata.etag`), `PATCH .../tasks/<id>/details` con header `If-Match: <etag>` y body `{"description":"<body>"}` |
| get-ticket | `az rest --method GET --url "https://graph.microsoft.com/v1.0/planner/tasks/<id>"` + `az rest --method GET --url ".../planner/tasks/<id>/details"` (título/estado en el primero, descripción/notes/referencias en el segundo) |
| close-ticket | `GET .../planner/tasks/<id>` (tomar `@odata.etag`), luego `az rest --method PATCH --url ".../planner/tasks/<id>" --headers "If-Match=<etag>" --body '{"percentComplete":100}'` |
| comment-ticket | `GET .../planner/tasks/<id>/details` (tomar `@odata.etag` y el `notes` actual), luego `PATCH` con `If-Match` agregando `<body>` al final de `notes` — Planner no tiene hilo de comentarios nativo, es un solo campo de texto acumulativo |
| create-pr | *(heredado de `repo_host` — ver nota de merge más arriba)* |
| get-pr | *(heredado de `repo_host`)* |
| get-pr-diff | *(heredado de `repo_host`)* |
| get-pr-files | *(heredado de `repo_host`)* |
| get-pr-checks | *(heredado de `repo_host`)* |
| approve-pr | *(heredado de `repo_host`)* |
| request-changes-pr | *(heredado de `repo_host`)* |
| merge-pr | *(heredado de `repo_host`)* |
| merge-pr-commit | *(heredado de `repo_host`)* |
| comment-pr | *(heredado de `repo_host`)* |
| link-pr-to-ticket | `GET .../planner/tasks/<id>/details` (tomar `@odata.etag`), luego `PATCH` con `If-Match` agregando la URL del PR a `references` (clave = URL sin encodear, valor = `{"alias":"<título del PR>","type":"Other"}`); en el body del PR, mencionar el link a la tarea de Planner en texto plano — no asumir auto-close (ver advertencia arriba) |
| merge-to-protected-branch | *(heredado de `repo_host`)* |
| list-milestones | `az rest --method GET --url "https://graph.microsoft.com/v1.0/planner/plans/<plan_id>/buckets"` — ver advertencia arriba (no son sprints) |
```

Las tablas (GitHub, Azure DevOps Agile, Azure DevOps Scrum, Microsoft
Planner — 4 variantes para 3 valores posibles de `tracker`, ya que Azure
DevOps se bifurca por `process_template`) cubren el mismo set de 16
operaciones abstractas — es lo que hace posible que las 11 skills
consumidoras no necesiten saber cuál tracker ni cuál proceso está activo,
ni si `tracker` coincide con `repo_host`. **Regla de consumo**
(documentala en el archivo generado): una skill nunca hardcodea `gh`/`az` —
resuelve `[operación: <nombre>]` contra
`agteamos/tracker/<tracker de platform.yml>.md` y ejecuta el comando de esa
fila, sustituyendo los `<placeholders>`.

**Operaciones adicionales sin equivalente en GitHub** (`create-epic`,
`create-feature`, `create-story`, `create-task`, `create-bug`,
`link-parent-child`, `link-external-url`): solo existen en la tabla de Azure
DevOps — GitHub Issues no tiene una jerarquía de tipos rígida ni relaciones
de Hyperlink nativas. Una skill que las invoca contra un tracker `github`
debe degradar explícitamente (ej. `create-story`/`create-task` caen a
`create-ticket` genérico con el tipo mencionado en el título entre
corchetes, `link-parent-child` cae a mencionar `Parent: #<id>` en el body,
`link-external-url` cae a un link markdown en el body) — nunca fallar en
seco solo porque GitHub no tiene el concepto nativo.

### Step 4 — Confirmar y sugerir próximo paso

Mostrar el `platform.yml` resultante al usuario para confirmación antes de
escribirlo. Una vez escrito:

**Próximo paso sugerido**: si `agteamos-repo-context-check` determinó que el
repo está vacío, continuar con la skill `agteamos-new-project`. Si el repo ya
tiene código, continuar con la skill `agteamos-onboard` (para documentar lo que
ya existe contra esta configuración recién definida).

---

## CONVENCIÓN — hard dependency vs soft dependency en skills que leen `platform.yml`

Toda skill de AgTeamOS que lee `platform.yml` cae en una de dos categorías,
y debe decirlo explícitamente cuando el archivo falta:

- **Hard dependency** (la skill no puede funcionar sin él — ej.
  `agteamos-deploy`, `agteamos-new-project`, cualquier operación de tracker):
  rehusarse a continuar con esta frase exacta: *"`agteamos/platform.yml`
  debería haberte sido provisto; corré `agteamos-setup` si no."* No inventar
  un default silencioso para tapar el hueco.
- **Soft dependency** (la skill puede degradar con una respuesta genérica —
  ej. una skill de documentación que normalmente cita el stack pero puede
  seguir sin él): decirlo también, pero seguir adelante con la degradación
  explícita ("sin `platform.yml`, no puedo confirmar el stack — asumiendo
  [X] salvo que corrijas").

## Wizard script para pasos manuales que requieren al humano

Cuando un paso de `agteamos-setup` (o de cualquier skill que dependa de su
configuración, ej. Microsoft Graph para `tracker: planner`) requiere que el
usuario haga algo manualmente — provisionar credenciales, dar permisos en un
dashboard de terceros, rotar un secret — no narrarlo en el chat cada vez que
la tarea se retoma (se pierde entre sesiones, es propenso a error). En vez de
eso, generar un script bash reusable y ejecutable en
`agteamos/scripts/wizards/<paso>.sh` con: progreso por etapas, gates de
confirmación explícitos, apertura de URLs relevantes, entrada oculta para
secrets, y upsert idempotente a `.env`/`gh secret` según corresponda. El
usuario corre el script una vez tenga los datos a mano, en vez de seguir
instrucciones de texto que hay que releer.

## CONSUMIDORES de `platform.yml`

| Consumidor | Campo que lee | Para qué |
|---|---|---|
| `agteamos-flow-router` | (existencia del archivo) | Step 0 — decide si disparar `agteamos-setup` primero |
| `agents/frontend-engineer.md`, `agents/backend-engineer.md` | `branch_strategy` | rama destino del PR |
| `agteamos-deploy` | `deploy_target`, `ci_target` | comandos de deploy y verificación de CI |
| `agteamos-pr-standards` | `pr_convention` | reviewers requeridos, merge strategy |
| MCP `github`/`azure-devops` | `repo_host`, `repo.*`, `env_var_names` | qué servidor MCP usar y con qué variable de entorno de auth |
| `agteamos/tracker/<tracker>.md` (generado en Step 3.6) | `tracker`, `repo_host`, `tracker_planner.*` | qué adapter generar y si hay que fusionar filas de PR heredadas de `repo_host` |
| Todos los agentes (transiciones) | `handoff_mode` | si piden confirmación en cada handoff (`explicit`) o continúan solos (`auto`) |

---

## ANTI-PATTERNS

- Asumir `branch_strategy: personal` porque el repo es pequeño — preguntar siempre, un repo pequeño puede ser de equipo.
- Escribir el valor real de un token en `platform.yml` — solo el *nombre* de la variable de entorno.
- Re-generar `platform.yml` desde cero cuando ya existe — esta skill actualiza campos puntuales, no reemplaza el archivo completo salvo pedido explícito del usuario.
- Asumir `handoff_mode: auto` sin preguntarlo — el default es `explicit`, y pasar a `auto` es una decisión consciente del usuario, no un atajo silencioso.
- Asumir que `tracker: planner` ya funciona sin confirmar los permisos de Microsoft Graph — si `graph_permissions_consented` quedó `false`, decirlo explícitamente, no dejar que el usuario lo descubra con un 401 en medio de `agteamos-new-task`.
- Inventar un `plan_id` o `default_bucket_id` de Planner "para que no quede en null" — si el usuario no lo tiene a mano todavía, `null` es la respuesta correcta (ver Step 2).
