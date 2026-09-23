---
name: agteamos-close-task
description: >
  Protocolo de cierre completo de una tarea. Step 0 bifurca por `schema`
  (full/lite). En schema full, el paso `sync` aplica specs/deltas/<dominio>.md
  a la spec maestra EN LA RAMA, antes de abrir el PR, para que el PR contenga
  codigo + delta + spec maestra actualizada juntos; el archivado en
  agteamos/changes/archive/ ocurre DESPUES de confirmar el merge. En schema
  lite no hay delta ni spec maestra: el verify se limita al test de
  regresion. Incluye PR, QA con evidence/, verify-report.md (fuente:
  ## Requirements (RFC 2119) de requirements.md), merge, cierre de ticket,
  limpieza de rama, actualizacion de agteamos/ (si doc_impact) y regeneracion
  de report.html / dashboard.html (artefactos locales, no versionados).
  Nada se cierra sin verificar todos los criterios que apliquen al schema.
used_by:
  - project-manager
  - qa-engineer
  - backend-engineer
  - frontend-engineer
  - devops-engineer
---

# Skill: AgTeamOS Close Task

## CONTRACT
- **Input**: Tarea completada con todos los tests pasando; `task.yml` con el
  campo `schema: full | lite`; y, obligatorio para el Step de QA Review y
  para `agteamos-dashboard`, `agteamos/changes/<id>-<slug>/evidence/` con las
  capturas — no es un adjunto opcional, ambos lo leen como input.
- **Output** (schema `full`): PR mergeado que incluye código +
  `specs/deltas/<dominio>.md` + `agteamos/specs/<dominio>.md` sincronizada;
  `verify-report.md` sin FAIL; ticket cerrado; rama eliminada; `agteamos/`
  actualizado (si `doc_impact: true`); tarea archivada en
  `agteamos/changes/archive/<fecha>-<id>-<slug>/`; `report.html` y
  `dashboard.html` regenerados **localmente, sin commitear** (ver Step 11).
- **Output** (schema `lite`): PR mergeado con el resumen de 1 párrafo + test
  de regresión; ticket cerrado; rama eliminada; tarea archivada. Sin delta,
  sin spec maestra, sin tabla RFC 2119 en `verify-report.md`.
- **Regla**: TODOS los pasos que apliquen al schema de la tarea (ver Step 0)
  deben completarse. Cierre parcial = tarea abierta.

## DISCIPLINA PR/GIT (de OpenSpec: "OpenSpec never touches git")

Principio explícito que gobierna todo este flujo, ver también skill
`agteamos-pr-standards`:

- **1 change = 1 branch = 1 PR.** No dividir el delta de spec y el código en
  PRs separados.
- **El PR contiene código, delta y spec maestra actualizada juntos** — en
  schema `full`, el Step 2 (`sync`) corre **en la rama, antes de abrir el
  PR**, así que `specs/deltas/<dominio>.md` y la
  `agteamos/specs/<dominio>.md` ya sincronizada llegan en el mismo commit set
  que el código, nunca aparte y nunca en un PR posterior.
- **Orden de lectura recomendado para el reviewer**: `requirements.md` →
  `specs/deltas/<dominio>.md` → diff de `agteamos/specs/<dominio>.md` → diff
  de código. Leer la spec antes que el código da contexto de *qué* se
  prometió antes de revisar *cómo* se hizo, y ver el diff de la spec maestra
  ya aplicada confirma que el merge fue el esperado.
- **Archivar después de confirmar el merge, no antes.** El paso de archivado
  (Step 9 más abajo) es explícitamente el último paso, posterior a la
  confirmación de que el PR está mergeado — evita archivar algo que después
  no pasa review o se revierte.

## TRACKER ADAPTER

Los comandos de tracker se resuelven vía `agteamos/tracker/<tracker>.md`
(generado por `agteamos-setup`) — nunca hardcodear `gh`/`az`. Cada paso de
este checklist que interactúa con ticket o PR usa la sintaxis
`[operación: <nombre>]`; la fila correspondiente en el adapter (GitHub o
Azure DevOps, según `tracker:` de `agteamos/platform.yml`) resuelve el
comando real.

## CHECKLIST DE CIERRE (en orden)

### 0. Leer `schema` en `task.yml` y bifurcar

Primer paso, antes de tocar nada más. Lee `schema: full | lite` (ver skill
`agteamos-sdd-protocol`) y determina qué steps de este checklist aplican tal
cual y cuáles cambian de alcance:

| Step | Schema `full` | Schema `lite` |
|---|---|---|
| 1. Verificar implementación | Todos los ACs de `requirements.md` + tests | Solo el test de regresión pasa (no hay `requirements.md`) |
| 2. Sync (delta → spec maestra) | Obligatorio, en la rama, antes del PR | **Se salta completo** — `lite` no lleva delta ni toca la spec maestra |
| 3. Crear PR | Incluye delta + spec maestra sincronizada | Incluye el resumen de 1 párrafo + test de regresión |
| 4. QA Review | Completo (6 dimensiones + E2E + evidencia) | Igual, sin cambios |
| 5. Verify | RFC 2119 + `tasks.md` + cobertura del delta | **Se limita a comprobar que el test de regresión pasa** — no hay `tasks.md` ni `specs/deltas/` que chequear |
| 6–12 | Sin cambios | Sin cambios |

Si durante la implementación aparece que un cambio `lite` en realidad altera
comportamiento observable de un dominio, la tarea está mal clasificada:
**detener el cierre, promoverla a `full`** (escribir
`specs/deltas/<dominio>.md`, actualizar `task.yml`) y recién entonces
continuar por la columna `full`. No "cerrarla como lite y documentarlo
después".

### 1. Verificar que la implementación está completa

**Schema `full`:**
```
- [ ] Todos los ACs de requirements.md estan cubiertos
- [ ] Unit tests pasan (minimo: happy path + error + edge)
- [ ] Cobertura >= 80% en codigo nuevo
- [ ] Codigo sigue los standards del proyecto (lint, format)
- [ ] Sin secrets hardcodeados
- [ ] Sin console.log / print() de debug
```

**Schema `lite`:**
```
- [ ] El test de regresion (agteamos-sdd-protocol) falla antes del fix y pasa despues
- [ ] Codigo sigue los standards del proyecto (lint, format)
- [ ] Sin secrets hardcodeados
- [ ] Sin console.log / print() de debug
```
(No hay `requirements.md` en `lite` — no hay ACs contra los que verificar.)

### 2. Sync — aplicar `specs/deltas/<dominio>.md` a la spec maestra (EN LA RAMA, antes del PR)

*(Solo schema `full` — en `lite` este paso se salta completo, ver Step 0.)*

**Por qué acá y no después del merge**: el PR debe contener código, delta y
spec maestra juntos (disciplina PR/git de arriba). Si el sync ocurriera
después del merge, el PR ya estaría cerrado y la rama borrada — no habría
dónde commitearlo. Por eso este paso corre antes del Step 3 (Crear PR), no
después del Step 6 (Merge).

**Regla de concurrencia (dos tareas activas sobre el mismo dominio)**: releer
`agteamos/specs/<dominio>.md` **en su estado actual del filesystem**, justo
antes de aplicar el delta — nunca contra la versión que existía cuando se
escribió el delta. Si otra tarea sobre el mismo dominio cerró primero (su
sync ya corrió), este paso debe aplicarse sobre lo que esa tarea dejó, no
sobre una copia vieja. Esto es lo que evita que dos cierres sobre `billing`
se pisen sin conflicto de git.

```
1. Leer cada specs/deltas/<dominio>.md de la tarea (ver skill agteamos-sdd-protocol).
2. Releer agteamos/specs/<dominio>.md TAL COMO ESTA AHORA en el filesystem
   (obligatorio incluso si ya se habia leido antes en la sesion).
3. ¿agteamos/specs/<dominio>.md existe?
     NO → crearlo ahora. Su contenido inicial ES el ADDED del delta
          (es la primera vez que este dominio recibe una spec maestra).
     SI → aplicar el delta por nombre de requirement (ancla de merge):
          - ADDED    → append del bloque ### Requirement: completo
          - MODIFIED → reemplazar el bloque completo (el nombre debe
            coincidir CARACTER POR CARACTER con la spec maestra actual)
          - REMOVED  → eliminar el bloque con ese nombre
4. Si el nombre de un requirement MODIFIED/REMOVED no coincide caracter por
   caracter con ningun ### Requirement: de la spec maestra actual (porque
   cambio de contenido desde que se escribio el delta, o nunca existio):
   DETENER el sync de ese dominio. No adivinar ni aplicar por similitud.
   Volver a @architect para re-clasificar el delta contra la version vigente.
   Esto no es un bug del proceso: es git avisando que dos cambios discrepan
   sobre como debe comportarse el sistema (doctrina de OpenSpec) — un
   conflicto en specs/ es una feature, no un error a silenciar.
5. Si el delta dice "Sin cambios en la spec maestra" → no tocar
   agteamos/specs/<dominio>.md, pero registrar en progress.md que se verifico.
6. Actualizar en la spec maestra: "Ultima tarea aplicada" y, si el alcance
   cambio, "Cubre" / "No cubre (todavia)".
```

**Regla de orden seguro / fallo parcial (transaccionalidad)**: si la tarea
toca 2+ dominios, sincronizar dominio por dominio y **no avanzar al Step 3
(crear PR) hasta que todos sincronizaron sin error**. Si un dominio falla en
el paso 4 de arriba, el sync de la tarea queda incompleto: no crear el PR con
una sincronización parcial, no archivar, no continuar. Escribir cada
`agteamos/specs/<dominio>.md` de forma atómica (archivo temporal + rename),
nunca editar in-place a medias — un fallo a mitad de escritura no debe dejar
el archivo corrupto para la próxima tarea que lo lea.

**Sub-paso — promover decisiones a la base de conocimiento (memoria
institucional)**: antes de seguir, revisar la tabla `## Decisions Made` de
`progress.md` de la tarea. Si alguna fila es **generalizable** (aplica más
allá de esta tarea puntual — ej. "usar SendGrid para todo email
transaccional" — y no es una decisión específica de esta tarea únicamente),
proponerla al usuario para agregarla a `agteamos/specs/knowledge-base.md`.
**Nunca automático**: requiere confirmación explícita del usuario sobre el
texto final de la fila antes de escribirla. Formato del archivo (append-only,
uno solo para todo el proyecto):

```markdown
# Knowledge Base

| Fecha | Decision | Contexto | Tarea de origen |
|---|---|---|---|
| 2026-08-09 | Usar SendGrid para todo email transaccional | SES tenia peor deliverability en las pruebas | TASK-42 |
```

Commitear `agteamos/specs/<dominio>.md` (y `agteamos/specs/knowledge-base.md`
si se actualizó) junto con el código y el delta, **en el mismo commit set**
— no en un commit separado.

### 3. Crear Pull Request

*(Schema `full`)* Gracias al Step 2, el PR ya incluye código,
`specs/deltas/<dominio>.md` y `agteamos/specs/<dominio>.md` actualizada — todo
en el mismo commit set.

*(Schema `lite`)* El PR incluye el código y el resumen de 1 párrafo + test de
regresión (no hay delta ni spec maestra que incluir).

`[operación: create-pr]` (crear el PR con título, body y label; el comando
real se resuelve contra `agteamos/tracker/<tracker de platform.yml>.md`):

```
--title "feat(notifications): add email notification system"
--body "$(cat <<'EOF'
## Summary
- Implemented NotificationService with SendGrid integration
- Added POST /api/notifications/send endpoint
- Created NotificationBadge frontend component

## Changes
- 6 files created, 2 files modified
- 4 unit tests, all passing
- Coverage: 92% on new code

## Acceptance Criteria Verification
- [x] Welcome email sent on registration
- [x] Reset password email contains valid token
- [x] Rate limit of 10 emails/min/user enforced

## Spec Delta
See specs/deltas/notifications.md — ya aplicado a
agteamos/specs/notifications.md en este mismo PR (Step 2 de agteamos-close-task)

## Screenshots
See agteamos/changes/42-email-notifications/evidence/

Closes #42
EOF
)"
--label "feature,ready-for-qa"
```

**Keywords importantes:**
- GitHub: `Closes #42`, `Fixes #42`, `Resolves #42`
- Azure DevOps: `Fixes AB#1234`, `Closes AB#1234`

Al crear el PR, actualizar `task.yml`:
```yaml
status: in_review
```
El PR queda abierto esperando QA — este es el único momento del flujo donde
corresponde escribir `status: in_review`, y es lo que le permite al dashboard
(`agteamos-dashboard`) contar correctamente las tareas en revisión.

### 4. QA Review con evidencia

```
@qa-engineer:
- [ ] Code review en 6 dimensiones (seguridad, correctitud, perf, mantenibilidad, tests, deuda)
- [ ] Tests E2E ejecutados con Playwright
- [ ] Screenshots guardados en agteamos/changes/<id>-<slug>/evidence/
- [ ] Accessibility audit (axe-core) ejecutado
- [ ] Aprobar PR con evidencia: "QA approved. All tests passing. Evidence in agteamos/changes/<id>-<slug>/evidence/"
```

### 5. Verify — generar `verify-report.md` (bloquea el cierre si hay FAIL)

*(Schema `lite`)*: este paso se limita a confirmar que el test de regresión
(Step 1) pasa. No hay `tasks.md`, no hay `specs/deltas/`, no hay
`## Requirements (RFC 2119)` — no se genera tabla RFC 2119 ni cobertura de
delta, solo se registra pass/fail del test de regresión.

*(Schema `full`)*: paso explícito entre la aprobación de QA y el merge/sync,
inspirado en `/opsx:verify` de OpenSpec y `verify-report.md` de spec-os. Se
genera `agteamos/changes/<id>-<slug>/verify-report.md` verificando:

1. **Todos los items de `specs/tasks.md` están `done`** (checklist marcado).
2. **Todo lo declarado en cada `specs/deltas/<dominio>.md` tiene al menos una
   tarea completada asociada** en `tasks.md` — el delta es también un gate,
   no solo un log: si algo dice `ADDED` en el delta pero ninguna tarea del
   checklist lo implementó, es una inconsistencia real.
3. **Clasificación de severidad RFC 2119 — fuente de datos concreta, no
   introspección del LLM**: la fuente es la sección
   `## Requirements (RFC 2119)` de `requirements.md` (ver skill
   `agteamos-sdd-protocol`). Cada requirement ahí tiene un id (`R1`, `R2`…),
   un modal y sus ACs asociados por id; verify recorre esa lista, no infiere
   modales leyendo el código. La severidad heredada está definida en
   `agteamos-sdd-protocol` y no se redefine acá:
   - `MUST` / `SHALL` no cumplido → **FAIL** (bloquea el cierre).
   - `SHOULD` no cumplido → **WARNING** (no bloquea, se documenta).
   - `MAY` → no se chequea.
4. **Disciplina de exit-code en cada comando de verify citado por un AC**:
   un AC verificado por un comando ejecutable (test, script, curl) solo
   cuenta como cumplido si ese comando sale con exit code 0 exactamente
   cuando el AC es cierto — nunca por inspección visual del output. Si el AC
   cubre un camino de error esperado (ej. "debe rechazar con 400"), el
   comando de verify tiene que envolver esa expectativa explícitamente
   (`test $? -eq 0` después de un curl que espera 400, o
   `! grep -q "500" response.txt`) — un comando que "falla" en el sentido
   shell pero cuyo fallo ES el comportamiento correcto no puede marcarse
   FAIL solo por su exit code crudo.
5. **Path-closure check**: para cada comando de verify que referencia un
   archivo (fixture, config, test file), confirmar que ese archivo existe y
   fue realmente escrito por esta tarea (aparece en "Files Modified" de
   `progress.md`) o ya existía antes. Un verify que apunta a un fixture que
   nadie creó es una inconsistencia real — inconsistencia que la revisión
   humana de un checklist marcado `[x]` no atrapa, pero un chequeo de rutas
   sí. Reportarlo como **FAIL** si el archivo no existe.

**Template de `verify-report.md`:**

```markdown
# Verify Report: TASK-<id>

**Generado**: 2026-08-09 14:00
**Resultado**: PASS / PASS_WITH_WARNINGS / FAIL

## tasks.md — checklist
- [x] 14/14 items marcados done

## specs/deltas/<dominio>.md — cobertura
| Item del delta | Tarea asociada en tasks.md | Estado |
|---|---|---|
| ADDED: welcome email on registration | #2 Implementar NotificationService | ✅ |
| ADDED: password reset email | #2 Implementar NotificationService | ✅ |

## Requirements (RFC 2119)
Fuente: sección `## Requirements (RFC 2119)` de `requirements.md`.

| Id | Requirement | Severidad | Cumplido | Resultado |
|---|---|---|---|---|
| R1 | El sistema MUST enviar el email en menos de 5s | MUST | SI | ✅ |
| R3 | El sistema SHOULD reintentar en caso de fallo de SendGrid | SHOULD | NO | ⚠️ WARNING |
| R4 | El sistema MAY loguear el payload completo | MAY | — | no chequeado |

## Path-closure check
| Comando de verify | Archivo referenciado | Existe y fue escrito por esta tarea | Estado |
|---|---|---|---|
| `pytest tests/test_notifications.py::test_welcome_email` | `tests/test_notifications.py` | Sí — ver Files Modified | ✅ |

## Bloqueantes (FAIL)
Ninguno.

## Advertencias (WARNING)
- Retry de SendGrid no implementado — documentado como deuda tecnica, no bloquea.
```

**Regla de bloqueo**: si hay al menos un `FAIL`, el cierre se detiene aquí —
no se procede al merge (Step 6) hasta resolver el requirement `MUST`/`SHALL`
incumplido o, si el usuario decide conscientemente aceptar el riesgo, dejar
constancia explícita de esa decisión en `verify-report.md` antes de
continuar.

Este archivo alimenta directamente el `report.html` de la tarea (skill
`agteamos-dashboard`) — no es un artefacto aislado, es una fuente más del
mismo reporte.

**Si `agteamos/architecture/SRS.md` existe** (proyecto con SRS formal opt-in,
ver `agteamos-new-project` Step 3.5) **y** `requirements.md` tiene la sección
`## Requisito SRS relacionado` citando uno o más `RF-XXX`: cuando este
`verify-report.md` da `PASS` (sin `FAIL` sin resolver), actualizar en
`SRS.md` la fila correspondiente de la sección 10.2 (Matriz de trazabilidad)
de `Pendiente`/`En progreso` a `Verificado`. Si el resultado es
`PASS_WITH_WARNINGS`, dejarla en `En progreso` y anotar el warning. Si no
existe `SRS.md` o `requirements.md` no cita ningún `RF-XXX`, omitir este paso
— no es un gate, es solo sincronización de estado.

**Si además `agteamos/platform.yml` tiene `tracker: planner`** y la fila del
`RF-XXX` en la sección 10.2 tiene un valor en la columna "Planner Task ID"
(no vacío): sincronizar también la tarea de Planner, resuelto igual que
siempre contra `agteamos/tracker/planner.md`:
- `PASS` → `[operación: close-ticket]` con ese task ID (marca
  `percentComplete: 100`).
- `PASS_WITH_WARNINGS` → `[operación: comment-ticket]` con ese task ID,
  agregando el detalle del warning — la tarea de Planner queda abierta.
- `FAIL` → no se toca la tarea de Planner (el cierre ya se detuvo arriba,
  antes de llegar a este punto).
Si `tracker` no es `planner`, o la fila no tiene Planner Task ID (proyecto
con SRS pero sin ese tracker configurado), omitir esta sincronización —
mismo criterio de "no es un gate" que el punto anterior.

### 6. Merge PR

Solo si `verify-report.md` (Step 5) no tiene `FAIL` sin resolver:

`[operación: merge-pr]` (mergear con squash y borrar la rama; comando real
resuelto contra `agteamos/tracker/<tracker de platform.yml>.md`).

**Nota — `branch_strategy: personal`**: si `agteamos/platform.yml` declara
`branch_strategy: personal` (`feature/* → main`), este merge apunta
directamente a una rama protegida — en GitHub eso corresponde en realidad a
`[operación: merge-to-protected-branch]`, no a `merge-pr` genérico. Es la
operación que dispara el hook `remind-merge-approval`
(`hooks/scripts/remind-merge-approval.js`), cuya regex
(`gh\s+pr\s+merge...--base\s+(main|master)`) es **específica de la sintaxis
de GitHub CLI**. En un proyecto con `tracker: azure_devops`, el equivalente
(`az repos pr update --id <id> --status completed` contra una rama
protegida) **no dispara ningún hook análogo hoy** — si el equipo depende de
esa confirmación manual antes de mergear a `main`, hay que replicarla
explícitamente del lado de Azure DevOps (fuera del alcance de este archivo).

### 7. Verificar cierre automatico del ticket

Si usaste el keyword de cierre (`Closes #42` / `Fixes AB#1234`, ver Step 3),
el ticket debería cerrarse automáticamente al mergear.

`[operación: get-ticket]` (verificar el estado actual del ticket; comando
real resuelto contra `agteamos/tracker/<tracker de platform.yml>.md`).

Si no se cerró automáticamente: `[operación: close-ticket]` (cerrar el
ticket con comentario "Completed in PR #<pr-number>"; misma resolución vía
tracker adapter).

### 8. Actualizar `agteamos/` si hubo cambios arquitectonicos (condicional a `doc_impact`)

**Chequear primero el campo `doc_impact` en `task.yml`**: si es `false`,
**saltar este paso completo** — la tarea no tiene impacto de
arquitectura/API/decisiones (ej. un fix de un typo) y forzar la actualización
de docs sería trabajo innecesario. Si `doc_impact` no está declarado, tratarlo
como `true` (fail-safe: mejor revisar de más que de menos).

Si `doc_impact: true`:

```
¿Se creo un nuevo servicio o modulo?
  → Actualizar agteamos/architecture/PROJECT_CONTEXT.md

¿Se agrego o modifico un endpoint?
  → Actualizar agteamos/api/openapi.yml

¿Se tomo una decision arquitectonica nueva?
  → Crear ADR en agteamos/architecture/adr/

¿Se cambio infraestructura?
  → Actualizar agteamos/devops/INFRASTRUCTURE.md

¿Se agrego una variable de entorno nueva?
  → Documentar en agteamos/devops/INFRASTRUCTURE.md
```

### 9. Archivar la tarea (DESPUÉS de confirmar el merge)

**Precondición**: Step 6 (merge) confirmado y, si `schema: full`, Step 2
(sync) completado sin error para todos los dominios. Con el orden de este
flujo eso ya está garantizado — el PR (Step 3) no se crea hasta que el sync
termina, así que si se llegó hasta acá el sync ya pasó. Si por algún motivo
se llega a este paso sin esa garantía (ej. un cierre manual fuera de este
flujo), **no archivar**: falta la sincronización.

```bash
# Mover la carpeta de la tarea a archive/, con fecha de cierre en el nombre
mv agteamos/changes/42-email-notifications/ \
   agteamos/changes/archive/2026-08-09-42-email-notifications/
```

Actualizar el status en `progress.md` y `task.yml`:
```markdown
| **Status** | COMPLETED ✅ |
| **Completed** | 2026-08-09 |
| **PR** | #123 (merged) |
```
```yaml
status: done
updated: 2026-08-09
```

### 10. Limpiar rama (si no se hizo en merge)

```bash
# Verificar que la rama fue eliminada
git branch -d feature/42-email-notifications 2>/dev/null
git push origin --delete feature/42-email-notifications 2>/dev/null
```

### 11. Regenerar `report.html` y `dashboard.html` (artefactos locales, no se commitean)

Invocar la skill `agteamos-dashboard` para:
- Finalizar `report.html` de la tarea (badge → `done`).
- Regenerar `agteamos/dashboard.html` completo, reflejando el nuevo conteo
  de tareas activas/en review/completadas.

**Regla de commit**: `agteamos/dashboard.html` y
`agteamos/changes/**/report.html` **no se versionan**. Son 100% derivables de
`task.yml` + `progress.md`, y con varios devs trabajando en paralelo generan
conflicto de merge garantizado en cada PR. Confirmar que están en
`.gitignore` y no incluirlos en ningún commit de este flujo (ni en el Step 3,
ni acá).

### 12. Pregunta opcional de fricción (una línea, nunca bloqueante)

Al mismo tiempo que se sugiere el próximo paso, agregar una pregunta opcional:

```
"¿Algo en este flujo te resultó torpe o mejorarías? (Enter para saltar)"
```

- Si el usuario responde con Enter (o no responde nada relevante): continuar
  sin más acción, no se escribe nada.
- Si el usuario responde con una idea: proponerla como fila nueva en el
  `BACKLOG.md` del repo del propio plugin (vía skill `agteamos-self-audit`,
  que es la dueña de ese mecanismo) — **nunca se escribe sin confirmación
  explícita del usuario** sobre el texto final de la fila propuesta.

Este paso nunca bloquea el cierre — es puramente opcional y de captura de
bajísima fricción.

## EXAMPLE: Cierre completo en secuencia (schema `full`)

```
0. ✅ Schema: full (feature nueva, impacta el contrato del dominio notifications)
1. ✅ Verificar: ACs de requirements.md cubiertos, 4 unit tests passing, 92% coverage, lint clean
2. ✅ Sync (en la rama, antes del PR): specs/deltas/notifications.md releido
      contra agteamos/specs/notifications.md vigente y aplicado
      (ADDED: "welcome email on registration", "password reset email")
3. ✅ PR created: #123 "feat(notifications): add email notification system"
      Incluye codigo + specs/deltas/notifications.md + specs/notifications.md
      actualizada. task.yml → status: in_review
4. ✅ QA: @qa-engineer approved with screenshots in evidence/
5. ✅ Verify: verify-report.md generado desde ## Requirements (RFC 2119) de
      requirements.md — PASS (0 FAIL, 1 WARNING documentado)
6. ✅ Merge: squash merge to main, branch auto-deleted
7. ✅ Ticket: #42 auto-closed via "Closes #42" keyword
8. ✅ Docs (doc_impact: true): Updated PROJECT_CONTEXT.md (added NotificationService)
           Updated openapi.yml (added POST /notifications/send)
           Added .env.example entry for SENDGRID_API_KEY
9. ✅ Archive: Moved agteamos/changes/42-email-notifications/ to
           agteamos/changes/archive/2026-08-09-42-email-notifications/
10. ✅ Branch cleanup confirmado
11. ✅ report.html finalizado (badge → done), dashboard.html regenerado
           (no commiteados — .gitignore)
12. ➡️  Pregunta de fricción: usuario responde Enter (sin comentarios)
```

**Próximo paso sugerido**: continuar con `agteamos-new-task` para la siguiente
iteración del backlog, o — si corresponde una revisión periódica — ejecutar
`agteamos-audit`, `agteamos-standards` o `agteamos-docs`.

## ANTI-PATTERNS

### Orden del flujo (sync / merge / archive)
- **Ejecutar el sync después del merge** — el Step 2 (sync) corre en la
  rama, antes de abrir el PR (Step 3), precisamente porque después del merge
  ya no hay PR ni rama donde commitear la spec maestra actualizada.
- **No archivar sin ejecutar el paso de sync** — una tarea archivada sin
  aplicar `specs/deltas/<dominio>.md` deja `agteamos/specs/<dominio>.md`
  desactualizada para la próxima tarea sobre el mismo dominio.
- **No archivar antes de confirmar el merge** — el archivado (Step 9) es
  siempre el último paso operativo, después de merge y sync, nunca antes.
- **Crear el PR con un sync parcial** (algunos dominios sincronizados y otros
  no, tras un fallo de ancla) — completar o resolver todos los dominios antes
  de avanzar al Step 3.

### Schema full vs lite
- **Tratar una tarea `lite` como `full`** — exigirle ACs de un
  `requirements.md` que no existe, o un delta que no debe escribir, traba la
  skill sin necesidad. Ver Step 0.
- **Tratar una tarea `full` como `lite`** — saltarse el sync o el verify
  RFC 2119 porque "total el cambio es chico" deja la spec maestra sin
  actualizar cuando sí había impacto de contrato.
- **Cerrar una tarea `lite` que en implementación resultó cambiar contrato**
  sin promoverla a `full` primero — "documentarlo después" nunca pasa.

### Verify (exit-code y path-closure)
- **Marcar un AC cumplido por inspección visual del output** en vez de por
  el exit code del comando de verify — la inspección visual es exactamente
  lo que este chequeo existe para reemplazar.
- **Reportar FAIL en un comando cuyo exit code distinto de 0 es el
  comportamiento esperado** (ej. un test que confirma que algo se rechaza)
  sin envolver esa expectativa en el propio comando — el comando de verify
  tiene que declarar explícitamente qué exit code espera, no asumir que
  "0 siempre es éxito."
- **Saltarse el path-closure check "porque el test ya pasó"** — un test que
  pasa contra un fixture que no existe en el repo (por ejemplo, generado a
  mano fuera del control de versiones) no es reproducible por otra persona
  ni por CI.

### Sync y concurrencia
- **Aplicar un delta contra una copia vieja de la spec maestra** — releer
  `agteamos/specs/<dominio>.md` en su estado actual del filesystem
  inmediatamente antes de aplicar, nunca contra lo que existía cuando se
  escribió el delta. Sin esto, dos cierres sobre el mismo dominio se pisan
  sin conflicto de git.
- **Forzar el merge de un requirement `MODIFIED`/`REMOVED` cuyo nombre no
  coincide carácter por carácter** con la spec maestra actual — eso es una
  señal real de que el delta quedó desactualizado; detener el sync y volver
  a @architect para re-clasificar, no adivinar por similitud.
- **Tratar un conflicto de `specs/` como un bug a silenciar** — es git
  avisando que dos cambios discrepan sobre el comportamiento del sistema
  (doctrina de OpenSpec); resolverlo es trabajo de re-clasificación, no un
  error a suprimir.

### Verify
- **Marcar PASS en `verify-report.md` sin una fuente real de requirements**
  — la clasificación RFC 2119 sale de la sección
  `## Requirements (RFC 2119)` de `requirements.md`, no de que el LLM infiera
  modales leyendo el código.
- **No mergear con un FAIL sin resolver en `verify-report.md`** — un
  `MUST`/`SHALL` incumplido bloquea el cierre por diseño, no es una
  sugerencia.

### Otros
- **No cerrar ticket sin verificar ACs** — cada AC debe ser verificado
  explícitamente (schema `full`).
- **No dejar ramas huerfanas** — si la rama no se elimino en el merge,
  eliminarla manualmente.
- **No olvidar actualizar `agteamos/`** cuando `doc_impact: true` — si la
  arquitectura cambio y no se actualizo, el siguiente agente trabaja con
  contexto viejo.
- **No forzar la actualizacion de docs cuando `doc_impact: false`** — es
  trabajo innecesario para tareas sin impacto real (ej. un typo).
- **No cerrar sin evidencia QA** — screenshots en `evidence/` son
  obligatorios como prueba de que funciona.
- **Commitear `report.html` o `dashboard.html`** — son artefactos derivados
  y regenerables, y garantizan conflicto de merge con varios devs; van en
  `.gitignore`, nunca en el commit set del PR.
- **Promover una fila de `## Decisions Made` a `knowledge-base.md` sin
  confirmación del usuario** — el sub-paso del Step 2 propone, nunca escribe
  directo.
- **No escribir en `BACKLOG.md` sin confirmación** — la pregunta de fricción
  es opcional y su respuesta se propone, nunca se escribe directamente.
