# TEMPLATES

Carga este módulo únicamente en el subestado `NEEDS_TEMPLATE`, copia el
template necesario, sustituye todos los placeholders y vuelve al estado
anterior. No lo mantengas cargado junto con otro módulo.

## DoR

```markdown
| Criterio | Obligatorio | Evidencia | Estado |
|---|---:|---|---|
| Descripción clara | Sí | <texto/ruta> | PASS/FAIL |
| 2+ ACs verificables | Sí | <ACs> | PASS/FAIL |
| Tipo definido | Sí | <tipo/label> | PASS/FAIL |
| Prioridad | No | <valor/ausente> | PASS/FAIL |
| Estimable | No | <talla/ausente> | PASS/FAIL |
| Sin bloqueo abierto | Sí | <relaciones> | PASS/FAIL |
| Testeable | Sí | <método> | PASS/FAIL |

**Resultado**: READY / NOT_READY
**Razón**: <todos los obligatorios + al menos 5/7, o faltantes>
```

## task.yml

Captura `owner` antes de escribir; no dejes placeholders/null en el archivo
final.

```yaml
id: "<id>"
title: "<titulo>"
workflow_contract: "3"
type: feature # feature | bug | hotfix | refactor | spike
schema: full # full | lite
context_tier: 2 # 1 | 2 | 3; solo sube
layer: fullstack # frontend | backend | fullstack | infra
priority: medium # critical | high | medium | low
risk: standard # standard | high | critical
risk_reason: "<señales observadas, blast radius y reversibilidad>"
status: in_progress # pending | in_progress | in_review | abandoned | done
phase: TRACKING
branch: "<prefijo>/<id>-<slug>"
repo_host: github # github | azure_devops | both
tracker: github # github | azure_devops | planner
ticket_url: "<url>"
domains: [<dominio>]
doc_impact: true
created: YYYY-MM-DD
updated: YYYY-MM-DD
owner:
  name: "<git config user.name o email>"
  email: "<git config user.email>"
handoffs: []
assigned_to:
  - <agente>
depends_on: []
qa_pass: false
validator_pass: false
review_approved: false
risk_review_approved: false
reviewed_sha: null
risk_review_sha: null
merge_confirmed: false
ticket_reconciled: false
```

## abandon-record.md

Usar solo desde `ABANDON-CHANGE.md`, después de la aprobación exacta. No
marcar `abandoned` hasta que el tracker tenga read-back verificado.

```markdown
# Abandon Record: <id>

- Status: abandoning | abandoned
- Reason: <motivo aprobado>
- Requested by: <actor>
- Approved at: <timestamp>
- Previous phase/status: <phase>/<status>
- Tracker change set: <fingerprint>
- Tracker read-back: PENDING | PASS
- PR disposition: <none/closed/preserved>
- Branch disposition: preserved at <branch>/<sha>

## Preserved work
- <commit, working tree, archivo o artefacto y estado>

## Completed before abandonment
- <resultado comprobado o none>

## Incomplete work
- <unidad y siguiente paso seguro>

## Unsynced artifacts
- <delta/spec/knowledge parcial que no se promovió o none>

## External results
- <ID/URL, operación y read-back>

## Recovery
- Resume: <cómo reabrir mediante un nuevo cambio>
- Reuse: <qué reutilizar y qué revalidar>
```

## progress.md — full

```markdown
# TASK-<id>: <titulo>

| Campo | Valor |
|---|---|
| Status | IN_PROGRESS (0%) |
| Owner | <owner.name> |
| Branch | <branch> |
| Type / Schema | <type> / full |
| Platform | <tracker> <id> |
| Created | YYYY-MM-DD |
| Last checkpoint | YYYY-MM-DD HH:MM |

## Workflow Gates
| Gate | Estado | Evidencia |
|---|---|---|
| QA | PENDING | — |
| Validator | PENDING | — |
| Review | PENDING | — |
| Merge | PENDING | — |
| Ticket reconciled | PENDING | — |

## Acceptance Criteria
- [ ] **R1** · Given ..., When ..., Then ...

## Progress Log
### Unit 1: <nombre> [PENDING]
- Scope: <task de specs/tasks.md>
- Resultado: <pendiente>
- RECONCILE: PENDING
- Time: <timestamp>

## Reconcile Log
| Unidad | Requirements | Design | Deltas | Tasks | Resultado | Evidencia |
|---|---|---|---|---|---|---|
| <unidad> | ALIGNED/DIVERGED | ALIGNED/DIVERGED | ALIGNED/DIVERGED | ALIGNED/DIVERGED | <estado> | <paths/tests> |

## Files Modified
| File | Action | Description |
|---|---|---|
| <path> | Created/Modified/Deleted | <qué y por qué> |

## Tests Written
| Test | File | Tipo | Status | Cobertura |
|---|---|---|---|---|
| <nombre> | <path> | happy/error/edge | PASS/FAIL | <comportamiento> |

## Evidence
| Archivo | AC/flujo | Estado |
|---|---|---|
| evidence/<nombre>.png | <estado observable> | Pending/PASS/FAIL |

## Decisions Made
| Decision | Alternatives | Reason | Approval |
|---|---|---|---|
| <decisión> | <alternativas> | <razón> | <quién/fecha> |

## Handoffs
### @<actual> → @<siguiente>
- Completado: <resultado y paths>
- Contexto crítico: <decisión/restricción>
- Tu tarea: <acción acotada>
- Criterio de éxito: <verificación>

## Next Action
> Estado: <state machine state>.
> Branch/commit: <branch> / <sha>.
> Ejecutar: `<comando>`.
> Después: <acción precisa>.
```

## progress.md — lite

```markdown
# TASK-<id>: <titulo>

## Resumen (schema: lite)
<Un párrafo: problema, ajuste y por qué no cambia contrato observable.>

## Test de regresión
- Test: `<path>::<nombre>`
- Antes: FAIL (<razón esperada>)
- Después: PASS

## Progress Log
- [ ] Implementación
- [ ] RECONCILE contra resumen/test
- [ ] QA

## Workflow Gates
| Gate | Estado | Evidencia |
|---|---|---|
| QA | PENDING | — |
| Validator | PENDING | — |
| Review | PENDING | — |
| Merge | PENDING | — |
| Ticket reconciled | PENDING | — |

## Next Action
> <acción ejecutable y estado>
```

## tracker-result.md

Este archivo no se crea desde `agteamos-implement`: lo mantiene
`agteamos-work-items` cuando recibe un `change_path`. Usar exclusivamente el
formato canónico de `skills/work-items/CHANGE-SETS.md`; no copiar payloads,
responses, tokens, headers, emails ni bodies completos. Implement solo
comprueba que el fingerprint/IDs/read-back estén presentes antes de archive.

## requirements.md

```markdown
# Feature: <nombre>

## Objetivo de negocio
<valor y problema>

## Requisito SRS relacionado
<!-- Omitir sección completa si no existe SRS formal. -->
- RF-XXX: <enunciado exacto>

## User Stories
- Como <rol>, quiero <acción>, para <beneficio>.

## Requirements (RFC 2119)
- **R1**: El sistema MUST <comportamiento observable único>.
- **R2**: El sistema SHOULD <comportamiento observable único>.

## Acceptance Criteria
- [ ] **R1** · Given <valor concreto>, When <acción>, Then <resultado concreto>.
- [ ] **R1** · Given <error/borde>, When <acción>, Then <resultado concreto>.
- [ ] **R2** · Given <contexto>, When <acción>, Then <resultado concreto>.

## Out of Scope
- <exclusión>

## KPIs esperados
- <métrica>: <baseline> → <objetivo>

## Definition of Done
- [ ] ACs y tests pasan.
- [ ] RECONCILE por unidad completo.
- [ ] E2E/evidencia y accesibilidad si aplica.
- [ ] PR/CI/aprobaciones en verde.
- [ ] Verify y validador determinista PASS.
- [ ] Ticket cerrado y tarea archivada.
```

## design.md

```markdown
# Design: <nombre>

## Resumen técnico
<solución y razón>

## Arquitectura
### Componentes afectados
- `<path/símbolo>`: <cambio>

### Flujo
<Diagrama Mermaid o secuencia breve>

## Archivos
### Crear
- `<path>`: <responsabilidad>
### Modificar
- `<path>`: <cambio>

## Modelo de datos
<migración/índices/rollback o N/A>

## API y compatibilidad
<endpoints/eventos/versionado o N/A>

## Variables e infraestructura
<env/CI/deploy o N/A>

## Decisiones técnicas
| Decisión | Alternativas | Razón |
|---|---|---|
| <elección> | <opciones> | <evidencia> |

## Seguridad
- STRIDE: <hallazgos/controles>

## Seams de testing
| Dependencia | Categoría | Seam/fake | Razón |
|---|---|---|---|
| <dependencia> | in-process/local/remota/externa | <punto exacto> | <razón> |

## ADRs
- <ADR o N/A>
```

## specs/deltas/<dominio>.md

```markdown
# Spec Delta: <feature> → dominio: <dominio>

## Spec maestra afectada
agteamos/specs/<dominio>.md

## Purpose
<!-- Solo si la spec maestra no existe. -->
<propósito del dominio>

## ADDED Requirements
### Requirement: <nombre nuevo>
El sistema MUST <comportamiento nuevo observable>.

#### Scenario: <happy path>
- GIVEN <estado>
- WHEN <acción>
- THEN <resultado>

#### Scenario: <error/borde>
- GIVEN <estado>
- WHEN <acción>
- THEN <resultado>

## MODIFIED Requirements
### Requirement: <nombre exacto vigente>
El sistema MUST <versión nueva completa>.

#### Scenario: <todos los escenarios, incluidos los no modificados>
- GIVEN <estado>
- WHEN <acción>
- THEN <resultado>

## REMOVED Requirements
### Requirement: <nombre exacto vigente>
Razon: <por qué y reemplazo si aplica>

## Sin cambios en la spec maestra
<!-- Usar solo esta sección y omitir ADDED/MODIFIED/REMOVED cuando aplique. -->
<justificación>
```

## tasks.md

Cada ADDED/MODIFIED debe citarse en al menos una task.

```markdown
# Tasks: <nombre>

## Branch: <branch>
## Estimated effort: <S/M/L/XL>
## Assigned engineers: @<agentes>

## Orden de implementación
### <Capa> (@<agente>)
1. [ ] **[R1 / ADDED: <Requirement>]** <unidad verificable>
   - Files: `<paths>`
   - Tests: happy, error, edge
   - Exit: <resultado comprobable>
2. [ ] **[R2 / MODIFIED: <Requirement>]** <unidad verificable>
   - Files: `<paths>`
   - Tests: <tests>
   - Exit: <resultado>

### QA (@qa-engineer)
3. [ ] Ejecutar ACs/E2E y guardar evidencia.
4. [ ] Ejecutar accesibilidad si hay UI.

### Closure (@product-manager)
5. [ ] Verificar matriz delta ↔ tasks.
6. [ ] Verify, validadores, PR/merge y archive.
```

## verify-report.md

```markdown
# Verify Report: TASK-<id>

**Generado**: YYYY-MM-DD HH:MM
**Schema**: full/lite
**Resultado**: PASS / PASS_WITH_WARNINGS / FAIL

## tasks.md
- [x] <completadas>/<total> items.

## Delta ↔ tasks
| Requirement | Sección | Task completada | Evidencia | Estado |
|---|---|---|---|---|
| <nombre> | ADDED/MODIFIED | #<n> | <test/path> | PASS/FAIL |

## Requirements (RFC 2119)
| Id | Requirement | Modal | AC/comando | Exit | Resultado |
|---|---|---|---|---:|---|
| R1 | <texto> | MUST | `<comando>` | 0 | PASS/FAIL |

## Goal-backward verification
| Verdad observable derivada del objetivo | Artefacto implementado | Wiring/enlace crítico | Prueba no tautológica | Estado |
|---|---|---|---|---|
| <qué debe ser cierto para usuario/sistema> | `<archivo:símbolo>` | <ruta real desde entrypoint hasta resultado> | `<test>` con input/output conocido | PASS/FAIL |

### Calidad de evidencia
- Falsabilidad: <cómo fallaría la prueba si el comportamiento no existiera>.
- Independencia: <por qué el expected no recalcula la misma lógica productiva>.
- Negativos/bordes: <casos que impiden un falso positivo>.
- Wiring ejercitado: <integración real o límite explícito del seam aprobado>.

## Path closure
| Comando | Archivo | Origen comprobado | Estado |
|---|---|---|---|
| `<comando>` | `<path>` | tarea/preexistente | PASS/FAIL |

## Validador determinista
- Comando: `node scripts/agteamos-validate.mjs --root <repo>`
- Exit: <code>
- Resultado: PASS/FAIL

## Bloqueantes
- <ninguno o FAIL concreto>

## Advertencias
- <ninguna o WARNING concreto>
```

## PR body

```markdown
## Summary
- <qué cambió y por qué, máximo 3 bullets>

## Type of change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation

## Acceptance Criteria Verified
- [x] **R1** · <AC> — <test/evidencia>

## Tests
- Unit/integration: <comando y resultado>
- E2E/evidence: `agteamos/changes/<id>-<slug>/evidence/`
- Deterministic validator: PASS

## Spec Delta
- `<delta>` aplicado a `<spec maestra>` en este PR.

## Notes for reviewer
<riesgos, límites, orden requirements → delta → spec → código>

Closes <referencia del proveedor>
```
