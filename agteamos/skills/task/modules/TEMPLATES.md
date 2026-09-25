# Module: Templates

## USO

Cargar este módulo solo cuando el módulo activo pida una plantilla. Usar una
sección por vez, adaptar con evidencia real y cerrar el módulo. Los placeholders
no son valores por defecto.

## `task.yml`

```yaml
id: "tmp-<slug>"
title: "<título>"
type: feature                 # feature | bug | hotfix | refactor | spike
schema: full                  # full | lite
context_tier: 2               # 1 | 2 | 3; solo sube
layer: fullstack              # frontend | backend | fullstack | infra
priority: medium              # solo si fue confirmada
status: pending
branch: null                  # agteamos-implement la crea con ID real
repo_host: <github|azure_devops|both>
tracker: <github|azure_devops|planner>
ticket_url: null
domains: [<dominio>]
doc_impact: true
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
owner:
  name: "<git config user.name>"
  email: "<git config user.email>"
handoffs: []
assigned_to: [<disciplina>]
depends_on: []
```

## `brief.md` — full, inmutable

```markdown
# Brief: <título>

## Input original del usuario
> <texto literal, sin parafrasear>

## Problema identificado
<problema confirmado, sin paths ni líneas>

## Solución propuesta (alto nivel)
<outcome y enfoque, sin diseño de implementación>

## Out of Scope (original)
- <límite confirmado>

## Resolution notes
<!-- Append-only. Agregar entradas fechadas; nunca editar el cuerpo anterior. -->
```

## `origin-<slug>.md` — cambio de dirección append-only

```markdown
# Origin: <nombre de la nueva dirección>

- **Created**: <ISO-8601>
- **Status at creation**: pending
- **Related ticket**: <ID o pending>

## Input literal
> <nueva petición literal>

## Cambio de dirección
<qué cambia respecto del brief/origins previos y por qué>

## Alcance afectado
- Requirements: <R... o pending>
- Design: <secciones>
- Deltas: <dominios>
- Tasks: <IDs o pending>

## Decisiones y límites
- <decisión>
- Out of scope: <límite>

## Incorporation log
<!-- Append-only. Ejemplo:
### <ISO-8601> — incorporated
- Artefactos revisados: ...
- Aprobación: ...
-->
```

No editar `Status at creation`; los cambios de estado se agregan al
`Incorporation log`.

## `progress.md`

```markdown
# Progress: <título>

## Snapshot
- Commit: <sha|null>
- Branch: <branch|null>
- Dirty: <yes|no>

## Current state
- Phase: clarify | shape | breakdown | persist | handoff
- Schema: full | lite
- Context tier: 1 | 2 | 3
- Validator: pending | pass | unavailable

## Decisions Made
| Date | Decision | Evidence / reason |
|---|---|---|
| <date> | <decisión> | <fuente> |

## Approvals
- Requirements: <pending|approved + date>
- Design/deltas: <pending|approved + date>
- UI: <pending|approved|not-applicable + date>

## Next
- <siguiente gate o task>
```

## `progress.md` — schema lite

```markdown
## Resumen (schema: lite)
<un párrafo: qué cambia, por qué es interno y por qué no altera el contrato>

## Test de regresión
- Path: <test existente o proposed:path>
- Falla antes: <resultado concreto>
- Pasa después: <resultado concreto>
```

## `specs/requirements.md`

```markdown
# Requirements: <título>

## Objetivo de negocio
<valor, usuario y outcome>

## Requisito SRS relacionado
<!-- Incluir solo si agteamos/architecture/SRS.md existe. -->
- RF-XXX: <texto exacto del SRS>

## Personas / User Stories
- Como <rol>, quiero <capacidad>, para <beneficio>.

## Requirements (RFC 2119)
- **R1**: El sistema MUST <comportamiento observable único>.
- **R2**: El sistema SHOULD <comportamiento observable único>.

## Acceptance Criteria
- [ ] **R1** · Given <estado>, When <acción>, Then <valor concreto>.
- [ ] **R1** · Given <error/borde>, When <acción>, Then <resultado concreto>.
- [ ] **R2** · Given <estado>, When <acción>, Then <resultado concreto>.

## Out of Scope
- <exclusión>

## KPIs esperados
<!-- Omitir si no existe una métrica sustentada. -->
- <métrica>: <baseline> → <objetivo>

## Definition of Done
- [ ] ACs verificados
- [ ] Tests aplicables en verde
- [ ] Evidencia UI/E2E cuando aplica
- [ ] Documentación actualizada cuando aplica
- [ ] Ticket/relaciones verificados
```

Cada requirement usa un solo modal. Cada AC cita requirement(s); cada
requirement tiene al menos un AC.

## `specs/design.md`

```markdown
# Design: <título>

## Resumen técnico
<1-3 líneas>

## Context Evidence
- Snapshot: <sha>; branch <branch>; dirty <yes|no>
- Observed: <hecho> — <path/símbolo/test>
- Proposed: <recomendación>
- Pending decision: <decisión o none>

## Arquitectura y flujo
- Componentes/capas: <cambios y razones>
- Flujo: <entrada → procesamiento → salida>

## Datos y migración
<modelo, compatibilidad, rollback o not-applicable>

## Integraciones y rollout
<contratos, timeouts, retry, observabilidad, despliegue>

## Seguridad y privacidad
<roles, validación, secretos, amenazas o not-applicable>

## Decisiones técnicas
| Decision | Alternativas | Razón/evidencia |
|---|---|---|
| <decisión> | <alternativas> | <razón> |

## Seams de testing
- <punto exacto de interceptación y dependencias reales/fake>

## Standards aplicados
- `<path devuelto por agteamos-knowledge --inject>`

## Riesgos y mitigaciones
- <riesgo>: <mitigación>

## UI proposal
<!-- Incluir si hay impacto visual; registrar estados y aprobación. -->
- Approval: <pending|approved + date>
```

## `specs/deltas/<dominio>.md`

```markdown
# Spec Delta: <cambio> → dominio: <dominio>

## Spec maestra afectada
agteamos/specs/<dominio>.md

## Purpose
<!-- Solo si la spec maestra no existe. -->
<responsabilidad del dominio>

## ADDED Requirements

### Requirement: <nombre nuevo y estable>
El sistema MUST <comportamiento observable>.

#### Scenario: <caso>
- GIVEN <estado>
- WHEN <acción>
- THEN <resultado>

## MODIFIED Requirements

### Requirement: <nombre exacto de la spec maestra>
El sistema MUST <versión nueva completa>.

#### Scenario: <todos los escenarios completos, incluso no modificados>
- GIVEN <estado>
- WHEN <acción>
- THEN <resultado>

## REMOVED Requirements

### Requirement: <nombre exacto de la spec maestra>
Razón: <motivo y reemplazo si existe>
```

Eliminar secciones vacías. Si no cambia la spec, usar únicamente:

```markdown
## Sin cambios en la spec maestra
<justificación>
```

## `specs/tasks.md`

```markdown
# Tasks: <título>

## Plan
- Schema: full
- Complexity: <S|M|L|XL>
- Context tier: <1|2|3>
- Topological order: T01 → T02

## Coverage
| Requirement | Tasks |
|---|---|
| R1 | T01 |
| R2 | T02 |

### T01 — <entregable>
- **id**: T01
- **requirement(s)**: [R1]
- **agent/discipline**: backend-engineer
- **depends_on**: []
- **scope_paths**:
  - `<path real>`
  - `proposed:<path nuevo>`
- **done_when**: <criterio binario y observable>
- **test_scope**:
  - `<test real o proposed:path>` — <unit|integration|e2e>
- **doc_impact**: true — `<doc afectada>` | false
- **status**: planned

### T02 — <entregable>
- **id**: T02
- **requirement(s)**: [R2]
- **agent/discipline**: frontend-engineer
- **depends_on**: [T01]
- **scope_paths**:
  - `<path real o proposed:path>`
- **done_when**: <criterio binario y observable>
- **test_scope**:
  - `<test>` — <nivel>
- **doc_impact**: false
- **status**: planned
```

No persistir `tasks.md` con placeholders, IDs inexistentes o un orden que no
sea topológico.

## HANDOFF

```markdown
## Handoff: @product-manager → @agteamos-implement

### Verificado
- Ticket: <ID + URL>
- Jerarquía/relaciones: <verified>
- Validator: <pass|unavailable + gate manual>

### Contexto
- Change: `agteamos/changes/<id>-<slug>/`
- Schema/context tier: <...>
- Domains: <...>
- Standards paths: <...>
- Next unlocked task: <T-ID>

### Restricciones y riesgos
- <item>

### Criterio de éxito
<resultado de la próxima fase>
```
