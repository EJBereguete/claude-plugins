---
name: agteamos-flow-router
description: >
  Detecta automaticamente cual de los 3 flujos de trabajo activar basandose
  en el estado del repositorio y el input del usuario. Se ejecuta despues
  de repo-context-check.
used_by:
  - architect
---

# Skill: Flow Router

## CONTRACT
- **Input**: Resultado de agteamos-repo-context-check + mensaje del usuario
- **Output**: Decision de flujo (1, 2 o 3) + contexto inicial para el flujo, o
  una sugerencia (no un gate obligatorio) de `agteamos-explore` cuando el
  input describe un problema sin solucion propuesta, antes de forzar el Flujo 2
- **Trigger**: Despues de agteamos-repo-context-check, antes de cualquier ejecucion

## DETECTION LOGIC

```
Step 0: ¿Existe agteamos/platform.yml Y tiene reviewed: true?
  NO EXISTE → ejecutar skill `agteamos-setup` primero (repo host, tracker,
       branching, CI/CD, deploy target, convencion de PR) — no continuar sin esto
  EXISTE con `reviewed: false` → tratarlo igual que "no existe": el archivo
       fue generado con valores asumidos por `agteamos-onboard` o
       `agteamos-repo-context-check` (branch_strategy/repo_host sin
       confirmar por el usuario) — ejecutar `agteamos-setup` para que el
       usuario los revise y confirme antes de continuar
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
     una tarea con agteamos-new-task? Si ya sabes lo que queres hacer,
     seguimos directo."
       usuario elige explorar  → agteamos-explore
       usuario elige ir directo → FLUJO 2
  NO (ya es una feature/cambio concreto) → FLUJO 2: Tarea nueva sin ticket

```

**Regla**: el Step 2.5 es una sugerencia, nunca un gate bloqueante — el
usuario puede ir directo a `agteamos-new-task` (FLUJO 2) aunque el input
suene a síntoma, si explícitamente dice que ya sabe lo que quiere hacer.

## FLUJO 1 — Proyecto desde cero

**Condicion**: El repo no tiene codigo real (vacio o solo README/.gitignore)

**Agentes activados**: Todos
**Workflow skill**: `agteamos-new-project`

```
@architect       → captura vision, define stack, arquitectura
@product-owner   → KPIs de MVP, backlog priorizado
@ui-ux-designer  → design system base, tokens, paleta
@devops-engineer → repo setup, ramas, CI/CD, variables
@project-manager → issues iniciales en GitHub/Azure
```

## MODO EXPLORACION — `agteamos-explore` (previo a comprometerse)

Todo el aparato SDD (`agteamos-sdd-protocol`, `agteamos-new-task`,
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
`agteamos-new-task` con una idea ya formada, o seguir explorando.

## FLUJO 2 — Tarea nueva sin ticket

**Condicion**: Repo tiene codigo + input es descripcion en lenguaje natural

**Agentes activados**: Segun impacto (FE/BE/Fullstack)
**Workflow skill**: `agteamos-new-task`

```
agteamos-clarification-protocol → preguntas hasta tener contexto claro
@product-owner         → define ACs y ROI
@architect             → analiza impacto tecnico (FE/BE/Full)
agteamos-story-breakdown        → INVEST check, split si necesario
@project-manager       → crea ticket(s) en GitHub/Azure
                       → CONTINUA automaticamente con FLUJO 3
```

## FLUJO 3 — Tarea desde ticket existente

**Condicion**: Input contiene URL, ID o referencia a ticket

**Agentes activados**: Segun capas impactadas
**Workflow skill**: `agteamos-implement`

```
Lee ticket via MCP (github o azure-devops)
agteamos-definition-of-ready check → ¿tiene lo minimo?
  NO → agteamos-clarification-protocol → preguntas al usuario
  SI → continua
agteamos-story-breakdown → ¿es user story grande? → split en subtareas
agteamos-task-tracking INIT → crea agteamos/changes/<id>-<slug>/
branch creation → feature/<id>-<slug> | bugfix/<id>-<slug>
implementacion con unit tests obligatorios
documentacion de la tarea (inline en progress.md)
@qa-engineer → E2E + screenshots en evidence/
agteamos-close-task → PR, ticket cerrado, rama limpia, agteamos/ archivado
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
