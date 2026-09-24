# AgTeamOS

> Plugin de Claude Code que simula un equipo completo de ingeniería de élite — un
> **sistema operativo de equipo**, portable entre proyectos y compartible con tu equipo.
>
> **8 agentes** · **22 skills** (`/agteamos:<nombre>`) · **3 flujos** · **SDD + Context Engineering**

Todo lo que el sistema gestiona en tu proyecto vive en una sola carpeta
`agteamos/`, generada de forma incremental (lo mínimo primero, el resto
just-in-time cuando una tarea real lo necesita — ver
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

---

## Un flujo completo, de punta a punta (Flujo 2 — tarea sin ticket)

Antes de esta versión, este camino atravesaba ~11 archivos distintos sin que
ninguno lo mostrara completo. Ahora son 2 skills:

```
Usuario: "Agregá un endpoint para exportar facturas a PDF"
  │
  ▼
agteamos-router          → resuelve el proyecto (si lo nombraste), confirma
                            que agteamos/ existe, detecta que no hay ticket
                            → dispara Flujo 2
  │
  ▼
agteamos-task            → Step 1: clarifica lo ambiguo (rondas de preguntas,
                            nunca le pregunta al usuario lo que puede leer del
                            código) → Step 4: @product-manager (modo Estrategia)
                            escribe requirements.md con ACs Given/When/Then →
                            Step 7: si la historia es grande, la divide (INVEST)
                            → Step 8: crea el ticket y pasa a Flujo 3
  │
  ▼
agteamos-implement       → Step 2: valida Definition of Ready → Step 4: inicializa
                            agteamos/changes/<id>-<slug>/ → Step 6-7: @architect +
                            engineers implementan por capas, leyendo los standards
                            del proyecto bajo demanda (agteamos-knowledge --topic)
                            → Step 8: QA E2E con evidencia → Step 8.5: oportunidad
                            de refactor acotada → Step 9: PR, verify-report, merge,
                            archivado
```

Los otros 2 flujos (`agteamos-bootstrap` para un repo vacío,
`agteamos-implement` directo cuando ya hay un ticket) siguen el mismo patrón:
`agteamos-router` decide, la skill del flujo ejecuta de punta a punta.

---

## Las 22 skills

| Skill | Qué hace |
|---|---|
| `agteamos-router` | Step 0/1 de todo flujo: resuelve el proyecto por nombre, confirma contexto del repo, detecta Flujo 1/2/3 |
| `agteamos-bootstrap` | Flujo 1 — proyecto desde cero, por fases (mínimo primero) |
| `agteamos-task` | Flujo 2 — tarea sin ticket: clarificación + requirements + story-breakdown + ticket |
| `agteamos-implement` | Flujo 3 — tarea desde ticket: DoR + tracking + implementación + QA + cierre |
| `agteamos-quality` | Review de PR / domain-review continuo / static-analysis / auditoría integral (4 modos) |
| `agteamos-security` | ASVS checklist (L1/L2) + threat modeling (PASTA/STRIDE/LINDDUN) |
| `agteamos-decisions` | RFC (discusión abierta) / ADR (decisión tomada) / out-of-scope / premortem |
| `agteamos-deploy` | Production Readiness Review + despliegue monitoreado |
| `agteamos-incidents` | Incident response (P1-P4) + runbooks/playbooks |
| `agteamos-metrics` | DORA metrics + SLO/error budgets |
| `agteamos-knowledge` | Onboarding (`--init`) + mantenimiento (`--maintain`) + estándares por tema (`--topic`) + aprendizaje en uso (`--learn`) |
| `agteamos-capture` | Captura de baja fricción: backlog del plugin o backlog de un proyecto |
| `agteamos-meta` | Audita y mejora el propio AgTeamOS |
| `agteamos-build` | Implementación guiada backend (API) y frontend (UI) |
| `agteamos-dashboard` | `report.html` por tarea + `dashboard.html` general + modo `--pulse` (solo lectura) |
| `agteamos-setup` | Configura `platform.yml` (repo host, tracker, branching, CI/CD, handoff) |
| `agteamos-context` | Protocolo de handoff, context tiers, y el contrato `ensure-artifact` de generación perezosa |
| `agteamos-spec` | Formato canónico de specs (requirements/design/tasks/deltas) |
| `agteamos-pr` | Convenciones de creación, revisión y merge de PRs |
| `agteamos-explore` | Pensar opciones antes de comprometerse a una tarea — no genera artefactos |
| `agteamos-debug` | Debugging con causa raíz (5 Whys) |
| `agteamos-fix` | Hotfix táctico — fix mínimo + test de regresión |

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
🟢 post-write-checks.js   → lint reminder + estándar del archivo tocado + quality-pulse
                             (líneas/smells/función larga) al escribir o editar
🟢 session-start.js       → recuerda el Step 0 (agteamos-router) + índice de standards +
                             radar de deuda técnica (throttle 7 días)
🟢 detect-correction.js   → sugiere agteamos-knowledge --learn ante una corrección
🟡 nudge-review.js        → recuerda correr agteamos-quality si el turno movió ≥30 líneas
```

## Documentación completa

Ver **[docs/](docs/README.md)** para: recorrido guiado paso a paso, guías de
tareas puntuales (configurar la plataforma, cerrar una tarea, mantener
standards al día, ejecutar una auditoría), la filosofía y arquitectura del
sistema, SDD y specs maestras, y la referencia completa (catálogo de skills,
matriz agentes↔skills, estructura de carpetas).

---

> Plugin version: 2.1.0 | 8 agentes · 22 skills · 7 standards base · 6 hooks
