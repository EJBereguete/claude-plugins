---
name: agteamos-implement
description: >
  Implementa un ticket existente de punta a punta: DoR, tracking, branch,
  SDD, código, reconciliación por tarea, QA, PR, sync, merge y archive. Usa
  módulos cargados uno por vez según task.yml/progress.md.
used_by:
  - architect
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - devops-engineer
  - product-manager
  - security-engineer
---

# Workflow: Implement

## CONTRATO

- **Input**: URL/ID de issue, PR o work item existente; repo actual;
  `agteamos/platform.yml`.
- **Output normal**: cambio verificado y mergeado, ticket
  reconciliado/cerrado, carpeta archivada en
  `agteamos/changes/archive/<fecha>-<id>-<slug>/` y dashboards derivados.
- **Output de abandono explícito**: trabajo parcial preservado, tracker
  reconciliado, `abandon-record.md` y carpeta
  `archive/<fecha>-<id>-<slug>-abandoned/`; nunca se presenta como entrega.
- **Estado durable**: `task.yml` + `progress.md`; la conversación no es fuente
  de verdad.
- **Alcance**: un cambio, un branch, un PR.

## PUERTAS EXTERNAS

- Issues/work items/Planner: **solo** `agteamos-work-items`. Lecturas libres;
  toda mutación requiere change set exacto, aprobación explícita y read-back.
- PR/review/merge: adapter de `repo_host` + `agteamos-pr`, nunca el tracker.
- No hardcodear `gh`, `az`, estados, ramas base ni nombres de campos.
- No autoaprobar ni mergear el propio PR. El merge siempre exige aprobación.

## PRECONDICIONES

1. El ticket existe y es accesible mediante el adapter configurado.
2. `agteamos/platform.yml` resuelve `tracker`, `repo_host` y estrategia.
3. `agteamos/architecture/PROJECT_CONTEXT.md` existe o su artefacto se
   materializa según `agteamos-context`.
4. No hay otro branch/cambio activo para el mismo ID.
5. Cambios locales ajenos se preservan y no se mezclan.

Si falta una precondición, detente en el estado más temprano que pueda
resolverla; no empieces código.

## INVARIANTES

1. La definición canónica de context tiers vive en `agteamos-context`. Este
   workflow solo la aplica y persiste `context_tier`; puede subir, nunca bajar.
2. Para standards Tier 2/3, invoca `agteamos-knowledge --inject` y consume
   **solo las rutas** devueltas. Antes de leer cada ruta, revisa
   `index.meta.yml`; si está `pending`/`stale`, ejecuta
   `ensure-artifact(standards.<id>)`. Máximo una generación por step.
3. `schema: full` exige requirements, design, delta(s) y tasks aprobados antes
   de código. `lite` exige resumen + test de regresión y nunca toca specs.
4. Después de **cada** unidad/task de implementación se entra en
   `RECONCILE`: código vs requirements, design, deltas y tasks.
5. Ante divergencia: parar código, corregir artefactos con la aprobación que
   corresponda y ejecutar
   `node scripts/agteamos-validate.mjs --root <repo>` antes de reanudar.
6. Cada Requirement ADDED/MODIFIED del delta mapea a al menos una task
   completada.
7. El validador determinista corre antes de abrir PR y otra vez antes del
   merge/cierre. `FAIL`, error o exit no cero bloquea.
8. Evidencia, QA, CI, verify y aprobaciones de `agteamos-pr` son gates.
9. Sync de delta es determinista, ocurre en la rama antes del PR y usa la
   spec maestra vigente. Archive solo después del merge confirmado.
10. `owner` no se sobrescribe; cambios de persona se agregan a `handoffs`.
    `Next Action`, checkpoints y dashboard se mantienen durante todo el flujo.
11. Una petición explícita de abandonar/cancelar interrumpe la ruta normal y
    carga `ABANDON-CHANGE.md`; nunca elimina ni sincroniza trabajo parcial.
12. `risk: standard|high|critical` se deriva de evidencia y se reevalúa con el
    diff. Review adicional solo aplica a high/critical y queda ligado al SHA
    exacto; cualquier cambio de SHA invalida ambas aprobaciones.

## CARGA PROGRESIVA

**No leas todos los módulos al inicio.** Determina el estado usando
`task.yml`, `progress.md` y el repo; carga exactamente un módulo. Al cambiar
de estado, deja de usar el anterior antes de abrir el siguiente.

`TEMPLATES.md` también cuenta como módulo: entra temporalmente en
`NEEDS_TEMPLATE`, copia un único template, reemplaza placeholders y vuelve al
estado previo.

| Estado | Señal durable | Único módulo a cargar |
|---|---|---|
| `INTAKE` | no existe tracking o falta snapshot del ticket | `modules/INTAKE-AND-DOR.md` |
| `DOR` | DoR no registrado como READY | `modules/INTAKE-AND-DOR.md` |
| `TRACKING` | READY; falta/incompleto `task.yml` o `progress.md` | `modules/TRACKING-AND-BRANCH.md` |
| `BRANCH` | tracking listo; branch falta/no coincide | `modules/TRACKING-AND-BRANCH.md` |
| `DESIGN` | full sin artefactos/aprobaciones; lite sin resumen/test | `modules/DESIGN-AND-IMPLEMENT.md` |
| `IMPLEMENT` | próxima task/unidad pendiente | `modules/DESIGN-AND-IMPLEMENT.md` |
| `RECONCILE` | una unidad cambió código o tests | `modules/QA-AND-RECONCILE.md` |
| `QA` | todas las unidades reconciliadas | `modules/QA-AND-RECONCILE.md` |
| `PRE_PR_VALIDATE` | QA verde; PR aún no abierto | `modules/CLOSE-AND-ARCHIVE.md` |
| `PR_REVIEW` | `status: in_review` / PR abierto | `modules/CLOSE-AND-ARCHIVE.md` |
| `PRE_CLOSE_VALIDATE` | review/verify listos, merge pendiente | `modules/CLOSE-AND-ARCHIVE.md` |
| `MERGE` | aprobación pendiente o merge no confirmado | `modules/CLOSE-AND-ARCHIVE.md` |
| `ARCHIVE` | merge confirmado; tracking aún activo | `modules/CLOSE-AND-ARCHIVE.md` |
| `ABANDONING` | abandono aprobado pero reconciliación externa incompleta | `modules/ABANDON-CHANGE.md` |
| `NEEDS_TEMPLATE` | el módulo activo requiere crear un artefacto | `modules/TEMPLATES.md` |
| `DONE` | `status: done`, carpeta archivada, dashboard regenerado | ninguno |
| `ABANDONED` | `status: abandoned`, record y carpeta preservados en archive | ninguno |

Si `task.yml` y `progress.md` discrepan, elige el estado seguro más temprano,
registra la inconsistencia y reconcíliala antes de avanzar.

## STATE MACHINE

```text
INTAKE → DOR
DOR --NOT_READY--> DOR
DOR --READY--> TRACKING → BRANCH → DESIGN
DESIGN --approved--> IMPLEMENT
IMPLEMENT --cada unidad--> RECONCILE
RECONCILE --diverge--> DESIGN/IMPLEMENT
RECONCILE --aligned, quedan tasks--> IMPLEMENT
RECONCILE --aligned, fin--> QA
QA --fail--> IMPLEMENT
QA --pass--> PRE_PR_VALIDATE → PR_REVIEW
PR_REVIEW --changes--> IMPLEMENT
PR_REVIEW --approved+verify--> PRE_CLOSE_VALIDATE
PRE_CLOSE_VALIDATE --pass+merge approval--> MERGE
MERGE --confirmed--> ARCHIVE → DONE
INTAKE|DOR|TRACKING|BRANCH|DESIGN|IMPLEMENT|RECONCILE|QA|PR_REVIEW
  --explicit abandon request + exact approval--> ABANDONING → ABANDONED
```

`status` no reemplaza la fase:

- `in_progress`: tracking, design, implement, reconcile o QA;
- `in_review`: únicamente desde PR abierto hasta merge;
- `abandoned`: únicamente tras read-back externo, record durable y archive;
- `done`: únicamente después de merge, cierre reconciliado y archive.

## APROBACIONES QUE NO SE PUEDEN INFERIR

| Acción/cambio | Aprobación |
|---|---|
| Mutar ticket, comentario, estado o relación | change set de `agteamos-work-items` |
| Requirements/ACs/out-of-scope | usuario; luego read-back externo si aplica |
| Design/approach/seam | `@architect` + usuario |
| Contrato ADDED/MODIFIED/REMOVED | `@architect` + aprobación del cambio |
| Tasks que cambian scope/compromiso | `@product-manager` + usuario |
| Promover decisión/convención a knowledge | usuario sobre texto final |
| Merge | requisitos de `agteamos-pr` + aprobación explícita |
| Escribir idea de fricción en backlog | usuario sobre texto final |

Una aprobación cubre solo el contenido mostrado. Si cambia target, operación,
scope, fingerprint o efecto, vuelve a pedirla.

## GATES DE SALIDA

No declares completado hasta que:

- DoR y SDD/schema sean válidos;
- preflight semántico y análisis semántico de cierre tengan exit cero (`full`);
- todas las unidades tengan RECONCILE alineado;
- QA/evidencia/CI estén verdes;
- matriz delta↔tasks y `verify-report.md` no tengan FAIL;
- ambos validadores deterministas pasen;
- sync completo esté incluido en el PR (`full`);
- review y merge estén aprobados/confirmados;
- para high/critical, review adicional independiente corresponde al mismo SHA;
- ticket haya sido releído, carpeta archivada y dashboard regenerado.

La salida alternativa `ABANDONED` usa los gates de
`modules/ABANDON-CHANGE.md` y no necesita fingir QA, review, merge ni sync.
