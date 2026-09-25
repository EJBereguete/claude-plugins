# AgTeamOS

> Plugin de Claude Code que simula un equipo completo de ingeniería de élite — un
> **sistema operativo de equipo**, portable entre proyectos y compartible con tu equipo.
>
> **8 agentes** · **23 skills** (`/agteamos:<nombre>`) · **3 flujos** · **SDD + Context Engineering**

El estado canónico que el sistema gestiona vive en `agteamos/`, generado de
forma incremental. README/CHANGELOG/docs humanos son vistas derivadas
opcionales. El inicio crea lo mínimo y el resto aparece just-in-time — ver
[Adoptar un proyecto existente](docs/primeros-pasos/04-adoptar-proyecto-existente.md)).
El detalle completo de todo lo que este README solo resume vive en
**[docs/](docs/README.md)** — esta página es el punto de entrada rápido, no
la referencia completa.

---

## Quick Start

```bash
/plugin marketplace add EJBereguete/claude-plugins
/plugin install agteamos
```

En cualquier proyecto:

```bash
@architect "Quiero crear una app de gestión de inventarios en FastAPI + React"
```

O invocá cualquier skill directo, sin pasar por un agente:

```bash
/agteamos-setup
```

## Inicio lazy

En un repo existente, el estado inicial es:

```text
agteamos/
├── platform.yml
├── onboarding.yml
└── architecture/PROJECT_CONTEXT.md
```

En greenfield, primero se confirma petición vs. problema y se aprueba un
blueprint consolidado; luego se agregan únicamente
`architecture/adr/ADR-001-*` y `product/{mission,kpis,roadmap}.md`. Market
research es opt-in y solo crea `product/market-research.md` tras una segunda
aprobación explícita. No se crean de entrada `standards/`,
`specs/`, `tracker/`, `devops/`, `design/`, `changes/`, `docs/` ni backlog.

Cada carpeta adicional nace al escribir su primer artefacto real. En
particular, `agteamos/product/backlog.md` aparece solo cuando dices “guarda
esto en el backlog del proyecto”. Los adapters de GitHub, Azure Boards y
Planner viven en el plugin; un proyecto crea `tracker/` únicamente para un
override personalizado.

## Portal multi-proyecto

AgTeamOS puede consolidar los proyectos registrados en un único HTML local:

```text
/agteamos-dashboard --portal
```

La salida por defecto es `~/.claude/agteamos/portal.html`. Incluye resumen
global, backlog, cambios/abandonos, riesgo, presupuesto estimado de contexto,
archive, onboarding, knowledge, calidad, operaciones e incidentes, incluido
el estado sanitizado de receipts del tracker. Es un
snapshot local read-only: no consulta trackers en vivo, no
modifica repositorios y no usa servidor, React, CDN ni dependencias frontend.
Ver [Portal multi-proyecto](docs/guias/portal-multiproyecto.md).

---

## Un flujo completo, de punta a punta (Flujo 2 — tarea sin ticket)

El flujo visible usa dispatchers pequeños; cada uno carga solo el módulo de su
fase actual:

```
Usuario: "Agregá un endpoint para exportar facturas a PDF"
  │
  ▼
agteamos-router          → resuelve el proyecto (si lo nombraste), confirma
                            que agteamos/ existe, detecta que no hay ticket
                            → dispara Flujo 2
  │
  ▼
agteamos-task            → clarifica por frontera → inspecciona repo/contexto
                            real → shape + requirements/design/deltas →
                            breakdown INVEST con DAG → prepara el intent
  │
  ▼
agteamos-work-items      → ejecuta doctor read-only → inspecciona repo +
                            tracker reales → detecta duplicados/capacidades →
                            presenta change set exacto → pide aprobación →
                            crea y verifica el ticket
                            → pasa a Flujo 3
  │
  ▼
agteamos-implement       → valida DoR → inicializa estado durable → implementa
                            unidades con RECONCILE → carga standards del proyecto
                            por paths (`agteamos-knowledge --inject`) → preflight
                            semántico + QA proporcional → gates durables →
                            review ligado al SHA según riesgo → verify
                            goal-backward → PR, merge y archive
```

Los otros 2 flujos (`agteamos-bootstrap` para un repo vacío,
`agteamos-implement` directo cuando ya hay un ticket) siguen el mismo patrón:
`agteamos-router` decide, la skill del flujo ejecuta de punta a punta.

Si el input ya es un desglose de Stories/Bugs/Tasks, `agteamos-task` entra
primero en auditoría read-only: detecta duplicados, huecos, dependencias,
jerarquía y límites multi-repo sin corregir ni crear nada. Solo una decisión
explícita lo incorpora al flujo normal.

---

## Las 23 skills

| Skill | Qué hace |
|---|---|
| `agteamos-router` | Step 0/1 de todo flujo: resuelve el proyecto por nombre, confirma contexto del repo, detecta Flujo 1/2/3 |
| `agteamos-bootstrap` | Flujo 1 — problem framing + research opt-in + blueprint agrupado + foundation/scaffold JIT |
| `agteamos-task` | Flujo 2 — tarea sin ticket: auditoría opcional de breakdown, clarificación, requirements y desglose INVEST |
| `agteamos-work-items` | Puerta multi-tracker: contexto multi-repo + dry-run + aprobación + ejecución verificada; Azure añade transporte Unicode-safe, layout y attachments |
| `agteamos-implement` | Flujo 3 — DoR + tracking + implementación + review por riesgo + cierre o abandono preservado |
| `agteamos-quality` | Review de PR / domain-review continuo / static-analysis / auditoría integral (4 modos) |
| `agteamos-security` | ASVS checklist (L1/L2) + threat modeling (PASTA/STRIDE/LINDDUN) |
| `agteamos-decisions` | RFC (discusión abierta) / ADR (decisión tomada) / out-of-scope / premortem |
| `agteamos-deploy` | Production Readiness Review + despliegue monitoreado |
| `agteamos-incidents` | Incident response (P1-P4) + runbooks/playbooks |
| `agteamos-metrics` | DORA metrics + SLO/error budgets |
| `agteamos-knowledge` | Registry/discovery project-owned: `--init`, `--maintain` (`--release` manual), `--discover`/`--topic`, `--inject`, `--learn` y human docs |
| `agteamos-capture` | Captura de baja fricción: outbox durable `AGF-*` del plugin o backlog de un proyecto |
| `agteamos-meta` | Audita y mejora el propio AgTeamOS |
| `agteamos-build` | Implementación guiada backend (API) y frontend (UI) |
| `agteamos-dashboard` | Renderer determinista: dashboard/reportes por proyecto, portal global `--portal` y pulso `--pulse` read-only |
| `agteamos-setup` | Configura solo `platform.yml`; providers plugin-owned y overrides locales opcionales |
| `agteamos-context` | Handoffs, context tiers, `ensure-artifact` y presupuesto determinista por bytes/tokens estimados |
| `agteamos-spec` | Formato canónico de specs (requirements/design/tasks/deltas) |
| `agteamos-pr` | Convenciones de creación, revisión y merge de PRs |
| `agteamos-explore` | Pensar opciones antes de una tarea; research externo opt-in es la única persistencia posible |
| `agteamos-debug` | Debugging con causa raíz (5 Whys) |
| `agteamos-fix` | Bug por ID con triage simple-lite/complejo-full, o hotfix táctico |

Cada skill es invocable como `/agteamos-<nombre>` o `/agteamos:agteamos-<nombre>`.

## Los 8 agentes

| Agente | Rol |
|---|---|
| `@architect` | Punto de entrada, arquitectura, ADRs, aprobación final |
| `@product-manager` | Estrategia (visión, KPIs, ROI) + Ejecución (tickets, sprint, seguimiento) — fusiona los antiguos PO/PM |
| `@backend-engineer` | Implementación backend |
| `@frontend-engineer` | Implementación frontend |
| `@qa-engineer` | Tests, E2E, evidencia, aprobación de calidad |
| `@security-engineer` | Seguridad, ASVS, threat modeling |
| `@devops-engineer` | Infraestructura, CI/CD, deploy, incidentes |
| `@ui-ux-designer` | Design system, UX, accesibilidad |

## Hooks automáticos

```
🔴 guardrails.js          → bloquea SQL destructivo; pide confirmación en borrados,
                             push a main/force, y merges a main/master
🟡 warn-hardcoded-secret  → detecta API keys/tokens/passwords en el código
🟢 post-write-checks.js   → lint reminder + topic relevante + quality pulse
                             consolidado al escribir o editar
🟢 session-start.js       → recuerda Step 0 + índice project-owned + señal
                             consolidada de deuda técnica
🟢 detect-correction.js   → sugiere agteamos-knowledge --learn ante una corrección
🟡 nudge-review.js        → recuerda correr agteamos-quality si el turno movió ≥30 líneas
```

## Documentación completa

Ver **[docs/](docs/README.md)** para: recorrido guiado paso a paso, guías de
tareas puntuales (configurar la plataforma, cerrar una tarea, mantener
standards al día, ejecutar una auditoría), la filosofía y arquitectura del
sistema, SDD y specs maestras, y la referencia completa (catálogo de skills,
matriz agentes↔skills, estructura de carpetas).

## Contratos ejecutables

```bash
# Valida estructura, tasks, deltas, standards e integridad del plugin
node scripts/agteamos-validate.mjs --root <proyecto> --strict

# Estado resumible y machine-readable, sin escribir
node scripts/agteamos-status.mjs --root <proyecto> --json

# Presupuesto por tier/módulo/artefacto (bytes + tokens estimados)
node scripts/agteamos-status.mjs \
  --root <proyecto> --context-budget --json

# Preflight/cierre semántico de una tarea full, sin escribir
node scripts/agteamos-analyze.mjs \
  --change <proyecto>/agteamos/changes/<id>-<slug> --stage preflight

# Portal global estático desde ~/.claude/agteamos/projects.yml
node scripts/agteamos-dashboard.mjs --portal

# Inventario read-only previo a mantenimiento manual de release
node scripts/agteamos-release-inventory.mjs --root <proyecto> --json
```

El grafo de fases y artefactos vive en
[`contracts/workflow.json`](contracts/workflow.json). La CI del marketplace
ejecuta hooks, contratos, fixtures y validación en Windows y Linux.

Los dos perfiles de inicio, triggers JIT y compatibilidad legacy viven en
[`contracts/project-layout.json`](contracts/project-layout.json).
La metodología de presupuesto (estimación, no telemetría del host) vive en
[`contracts/context-budget.json`](contracts/context-budget.json).

El perfil MCP por defecto es mínimo y versionado. Browser, bases de datos,
Docker, Sentry y Sonar se habilitan por proyecto solo cuando hacen falta; ver
[`mcp/README.md`](mcp/README.md).

---

> Plugin version: 3.5.0 | 8 agentes · 23 skills JIT · 7 registry topics · 6 hooks
