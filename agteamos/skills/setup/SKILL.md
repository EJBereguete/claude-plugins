---
name: agteamos-setup
description: >
  Configuracion inicial completa de la plataforma del proyecto: repo host,
  task tracker, estrategia de branching, CI/CD, deploy target, convencion
  de PR y modo de handoff entre agentes. Persiste el resultado en
  agteamos/platform.yml. Se dispara automaticamente desde agteamos-flow-router
  (Step 0) si ese archivo no existe todavia.
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
1. ¿Dónde vive el repositorio de código y los tickets?
   a) GitHub (repo + Issues/Projects)
   b) Azure DevOps (Repos + Boards)
   c) Ambos (ej. código en GitHub, tickets en Azure DevOps)

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

No proceder a Step 2 hasta tener respuesta a las 8 preguntas (o una respuesta
explícita de "todavía no lo sé" para las que no bloquean, ver Step 2, o
aceptar el default de la pregunta 8 si el usuario no tiene preferencia).

### Step 2 — Resolver respuestas incompletas

Si el usuario no puede responder algo (ej. "todavía no elegimos deploy target"),
registrar el valor como `null` en `platform.yml`, NUNCA inventar un valor. La
skill `agteamos-setup` puede re-ejecutarse más adelante para completar campos
pendientes — no bloquea el resto del flujo salvo `repo_host` y `branch_strategy`,
que son obligatorios porque otras skills (`agteamos-deploy`, `agteamos-new-project`,
PRs de todos los engineers) dependen de ellos desde el primer commit.
`handoff_mode` sí tiene default (`explicit`) si el usuario no responde nada.

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
tracker: github                # github | azure_devops — dónde viven los tickets
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
```
Si el archivo ya tiene esas líneas (proyecto que corrió `setup` antes), no
duplicar. Si `.gitignore` no existe, crearlo con solo esas 2 líneas — no
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

Según `tracker:` de `platform.yml`, escribir `agteamos/tracker/github.md` o
`agteamos/tracker/azure_devops.md` (o ambos si `repo_host: both`):

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

```markdown
# Tracker Adapter: Azure DevOps

| Operación abstracta | Comando |
|---|---|
| create-ticket | `az boards work-item create --type "User Story" --title "<title>" --description "<body>"` |
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

Ambas tablas cubren el mismo set de operaciones abstractas — es lo que hace
posible que las 11 skills consumidoras no necesiten saber cuál tracker está
activo. **Regla de consumo** (documentala en el archivo generado): una skill
nunca hardcodea `gh`/`az` — resuelve `[operación: <nombre>]` contra
`agteamos/tracker/<tracker de platform.yml>.md` y ejecuta el comando de esa
fila, sustituyendo los `<placeholders>`.

### Step 4 — Confirmar y sugerir próximo paso

Mostrar el `platform.yml` resultante al usuario para confirmación antes de
escribirlo. Una vez escrito:

**Próximo paso sugerido**: si `agteamos-repo-context-check` determinó que el
repo está vacío, continuar con la skill `agteamos-new-project`. Si el repo ya
tiene código, continuar con la skill `agteamos-onboard` (para documentar lo que
ya existe contra esta configuración recién definida).

---

## CONSUMIDORES de `platform.yml`

| Consumidor | Campo que lee | Para qué |
|---|---|---|
| `agteamos-flow-router` | (existencia del archivo) | Step 0 — decide si disparar `agteamos-setup` primero |
| `agents/frontend-engineer.md`, `agents/backend-engineer.md` | `branch_strategy` | rama destino del PR |
| `agteamos-deploy` | `deploy_target`, `ci_target` | comandos de deploy y verificación de CI |
| `agteamos-pr-standards` | `pr_convention` | reviewers requeridos, merge strategy |
| MCP `github`/`azure-devops` | `repo_host`, `repo.*`, `env_var_names` | qué servidor MCP usar y con qué variable de entorno de auth |
| Todos los agentes (transiciones) | `handoff_mode` | si piden confirmación en cada handoff (`explicit`) o continúan solos (`auto`) |

---

## ANTI-PATTERNS

- Asumir `branch_strategy: personal` porque el repo es pequeño — preguntar siempre, un repo pequeño puede ser de equipo.
- Escribir el valor real de un token en `platform.yml` — solo el *nombre* de la variable de entorno.
- Re-generar `platform.yml` desde cero cuando ya existe — esta skill actualiza campos puntuales, no reemplaza el archivo completo salvo pedido explícito del usuario.
- Asumir `handoff_mode: auto` sin preguntarlo — el default es `explicit`, y pasar a `auto` es una decisión consciente del usuario, no un atajo silencioso.
