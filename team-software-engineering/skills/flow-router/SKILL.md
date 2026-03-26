---
name: flow-router
description: >
  Detecta automaticamente cual de los 3 flujos de trabajo activar basandose
  en el estado del repositorio y el input del usuario. Se ejecuta despues
  de repo-context-check.
used_by:
  - architect
  - project-manager
---

# Skill: Flow Router

## CONTRACT
- **Input**: Resultado de repo-context-check + mensaje del usuario
- **Output**: Decision de flujo (1, 2 o 3) + contexto inicial para el flujo
- **Trigger**: Despues de repo-context-check, antes de cualquier ejecucion

## DETECTION LOGIC

```
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
  NO → FLUJO 2: Tarea nueva sin ticket

```

## FLUJO 1 — Proyecto desde cero

**Condicion**: El repo no tiene codigo real (vacio o solo README/.gitignore)

**Agentes activados**: Todos
**Workflow skill**: `workflows/project-from-scratch`

```
@architect       → captura vision, define stack, arquitectura
@product-owner   → KPIs de MVP, backlog priorizado
@ui-ux-designer  → design system base, tokens, paleta
@devops-engineer → repo setup, ramas, CI/CD, variables
@project-manager → issues iniciales en GitHub/Azure
```

## FLUJO 2 — Tarea nueva sin ticket

**Condicion**: Repo tiene codigo + input es descripcion en lenguaje natural

**Agentes activados**: Segun impacto (FE/BE/Fullstack)
**Workflow skill**: `workflows/new-task`

```
clarification-protocol → preguntas hasta tener contexto claro
@product-owner         → define ACs y ROI
@architect             → analiza impacto tecnico (FE/BE/Full)
story-breakdown        → INVEST check, split si necesario
@project-manager       → crea ticket(s) en GitHub/Azure
                       → CONTINUA automaticamente con FLUJO 3
```

## FLUJO 3 — Tarea desde ticket existente

**Condicion**: Input contiene URL, ID o referencia a ticket

**Agentes activados**: Segun capas impactadas
**Workflow skill**: `workflows/task-from-ticket`

```
Lee ticket via MCP (github o azure-devops)
definition-of-ready check → ¿tiene lo minimo?
  NO → clarification-protocol → preguntas al usuario
  SI → continua
story-breakdown → ¿es user story grande? → split en subtareas
task-tracking INIT → crea /docs/tasks/active/TASK-<id>/
branch creation → feature/<id>-<slug> | bugfix/<id>-<slug>
implementacion con unit tests obligatorios
documentacion de la tarea (inline en TASK-<id>.md)
@qa-engineer → E2E + screenshots en evidence/
task-closure → PR, ticket cerrado, rama limpia, docs archivados
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
```
