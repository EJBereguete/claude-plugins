# Dry-run Fixtures

Estos fixtures validan comportamiento; no son comandos para ejecutar.

## Doctor: configured (GitHub)

Contexto:

- `platform.yml` selecciona `github` y contiene owner/repository verificables.
- La sesión puede leer el repo y sus issues.
- Discovery confirma labels y milestones; Projects está disponible.
- Sub-issues está soportado e issue types devuelve `unsupported` de forma
  explícita.
- El change set solo requiere create issue, labels existentes y sub-issues.
- Snapshot de configuración/repo y reloj fueron capturados.

Resultado esperado:

- `status: configured`.
- Los checks incluyen evidencia de repo, Issues, labels, milestones,
  Projects, sub-issues e issue types; no se infiere ninguna capacidad.
- Create issue, labels existentes y sub-issues figuran en
  `green_capabilities`.
- `issue_types: unsupported` no bloquea porque el draft no usa issue types.
- El primer `apply` de la sesión puede continuar si el doctor no está
  `stale` y la aprobación/fingerprint siguen vigentes.

## Doctor: degraded (Azure Boards)

Contexto:

- `platform.yml` selecciona `azure_devops`; organización, proyecto y equipo
  están verificados.
- El MCP oficial confirma proyecto, equipo, team settings y lectura de work
  items.
- REST de solo lectura, declarado como fallback, confirma proceso, WIT,
  campos custom/requeridos, estados, áreas, iteraciones y `bugsBehavior`.
- La enumeración de usuarios asignables no está disponible.
- El draft crea una Story sin asignación y no usa la capacidad de usuarios.

Resultado esperado:

- `status: degraded`.
- La evidencia atribuye cada check al MCP o al fallback REST.
- `assignable_users` aparece bloqueada, nunca asumida.
- Las capacidades necesarias para crear la Story figuran en verde; el draft
  muestra warning por asignaciones.
- `apply` puede continuar solo porque ninguna operación usa asignación. Un
  cambio posterior que añada `Assigned To` exige nuevo draft/approval y
  bloquea hasta que esa capacidad esté verde.

## Doctor: unavailable (Planner)

Contexto:

- `az` existe y hay una sesión iniciada.
- `platform.yml` contiene `plan_id`.
- La lectura Graph del plan funciona, pero `GET` del bucket o de task
  details devuelve `403`.
- El draft ya existe y propone un `PATCH`.

Resultado esperado:

- `status: unavailable`, aunque otras lecturas hayan funcionado.
- La evidencia identifica el `401/403` sin exponer tokens.
- Remediation indica tenant/identidad esperados, permiso Graph o
  consentimiento faltante y el flujo de login que debe realizar una persona.
- No se pide aprobación para doctor, no se guarda query/capacity y no se
  intenta descubrir el permiso durante `apply`.
- `apply` se detiene antes del primer `PATCH`; no usa ni refresca ETag como
  sustituto del doctor.

## Azure Agile con campos custom

Contexto:

- Repo en commit `abc123`, limpio.
- `src/billing/` y tests confirman invoices existentes.
- Azure devuelve WIT custom `Customer Story`, campo requerido
  `Custom.ProductLine` y estado inicial `Proposed`.

Resultado esperado:

- El draft usa `Customer Story`, no `User Story`.
- No envía `State`; Azure aplica `Proposed`.
- `Custom.ProductLine` queda pending y bloquea apply.
- No usa `Iteration Path: Backlog`; resuelve backlog iteration del equipo.

## Azure Bug como Task

Contexto:

- `bugsBehavior: asTasks`.
- Bug reproducible por un test existente.

Resultado esperado:

- El draft parenta el Bug bajo la Story correspondiente.
- Repro Steps/System Info solo se mapean si el WIT real los expone.
- El test y archivo real aparecen en Context Evidence.

## GitHub sin sub-issues

Contexto:

- Repo no expone sub-issues ni issue types.
- Existe label `bug`; no existe `priority:high`.

Resultado esperado:

- El preview muestra degradación Parent/Child a links recíprocos.
- Usa `bug`.
- No crea `priority:high` ni la asigna sin una operación aprobada.

## Planner

Contexto:

- Plan y bucket confirmados.
- Sin categoría equivalente a `Technical Debt`.

Resultado esperado:

- Crea Planner Task, no simula Feature/User Story nativas.
- Parent/dependency se degradan a references/checklist.
- No crea una categoría inexistente.
- Cualquier PATCH usa el ETag leído inmediatamente antes.

## Repo vacío

Contexto:

- No hay código.
- Misión, SRS y arquitectura fueron aprobados.

Resultado esperado:

- `implementation_evidence: unavailable`.
- Items basados solo en esos artefactos.
- Rutas/componentes futuros aparecen como proposed.

## Duplicado

Contexto:

- `agteamos/changes/42-export/` y AB#42 cubren el mismo outcome.

Resultado esperado:

- Apply bloqueado.
- Preview ofrece actualizar/vincular/duplicate/abandonar.
- No crea un tercer item.

## Snapshot obsoleto

Contexto:

- Draft aprobado contra `abc123`.
- Antes de apply cambia una spec usada como evidencia.

Resultado esperado:

- Fingerprint/context precondition inválida.
- No se escribe.
- Se genera un draft nuevo y se pide aprobación otra vez.

## Ciclo de dependencias

Contexto:

- A depende de B, B depende de C.
- Draft propone C depende de A.

Resultado esperado:

- Quality gate FAIL.
- La relación no entra al change set ejecutable.

## Fallo parcial

Contexto:

- Epic y Feature se crean/verifican.
- Crear Story falla por campo custom requerido.

Resultado esperado:

- Se detiene el lote.
- No elimina Epic/Feature.
- Reporta IDs reales y operaciones no ejecutadas.
- Propone un change set de reparación separado.

## Azure Unicode en Windows

Contexto:

- El draft Azure contiene título, rich text y comentario con caracteres
  no-ASCII.
- MCP no expone la escritura requerida; REST está disponible.
- El entorno es Windows y el CLI altera business text pasado como argumento.

Resultado esperado:

- Doctor marca verde REST estructurado y bloquea CLI text como ruta de
  `unicode_roundtrip`.
- El adapter materializa JSON Patch UTF-8 desde la operación aprobada bajo
  `.cache`, sin interpolar texto en shell/PowerShell.
- El read-back usa JSON estructurado directo y compara todos los code points;
  no considera suficiente buscar `�` o mojibake conocido.
- Una diferencia invalida la operación aunque HTTP haya sido exitoso.

## Azure Bug con layout custom

Contexto:

- El WIT Bug expone `System.Description`, pero el control visible
  “Description” está enlazado a un campo custom.
- El draft necesita que la evidencia aparezca en ese control.

Resultado esperado:

- `inspect-tracker` consulta el layout efectivo y registra control,
  process/WIT y reference name.
- El draft usa el backing field descubierto, no el nombre visible ni la tabla
  estándar por memoria.
- Si layout no puede comprobarse, `wit_layout` bloquea apply.
- Read-back verifica el reference name realmente aprobado.

## Azure attachment verificado

Contexto:

- El usuario aprueba adjuntar `agteamos/changes/42-x/specs/design.md` a Story y
  Feature.
- El archivo está dentro del root, sin secretos, con hash/tamaño/MIME
  capturados.

Resultado esperado:

- Path, SHA-256, tamaño, filename, comentario y dos targets forman parte del
  fingerprint.
- El archivo se vuelve a hashear antes de upload.
- Upload y cada relation `AttachedFile` tienen journal independiente.
- Cada target se relee con relations expandidas.
- `tracker-result.md` conserva hash/URL/estado sanitizados, no response/token.

## Multi-repo mirror stale

Contexto:

- El desglose cita repos primario y secundario.
- El primario está en el SHA aprobado; el HEAD del mirror secundario difiere
  del hash remoto.

Resultado esperado:

- Snapshot registra ambos repos y marca el mirror `stale`.
- Hallazgos del mirror no se presentan como estado vigente `Observed`.
- No se ejecuta `reset --hard`, pull ni fetch destructivo desde
  `inspect-repo`.
- Continuar con la limitación o refrescar produce un snapshot/draft nuevo.

## Auditoría de desglose existente

Contexto:

- El usuario entrega tres Stories ya redactadas y pide validarlas.
- Dos duplican un AC; una depende de la otra sin relación; no se entregó el
  objetivo original.

Resultado esperado:

- `agteamos-task` entra en `AUDIT-BREAKDOWN` y no crea carpeta ni tracker.
- Reporta duplicado y dependencia con evidencia; la falta de objetivo limita
  la detección de huecos.
- No corrige el texto hasta que el usuario elija continuar.
- `READY` o `READY_WITH_CHANGES` no cuentan como aprobación de mutación.

## Bug ID simple a lite

Contexto:

- El usuario pide trabajar AB#91 y Azure confirma que es un Bug.
- El body, un test rojo y el código demuestran un null guard ausente en un
  único dominio.
- No cambia contrato, schema, permisos ni arquitectura.

Resultado esperado:

- `BUG-INTAKE` lee primero tracker y repo y registra actual/expected/repro.
- Clasifica `simple`, crea tracking `schema: lite` con ID 91 y no crea specs.
- La causa confirmada continúa por fix; test rojo→verde, QA y cierre quedan en
  `agteamos-implement`.
- Ningún comentario, owner, severity o estado cambia durante intake.

## Bug ID complejo a full

Contexto:

- El usuario pide trabajar #204 y GitHub confirma label/type Bug.
- La reproducción cruza API y worker, requiere migrar datos y cambia un evento
  consumido por otro repo.

Resultado esperado:

- `BUG-INTAKE` clasifica `complex` por contrato, datos y multi-repo aunque la
  severidad sea Medium.
- Reutiliza #204, crea tracking full y refina solo huecos del item.
- Debug confirma causa; spec produce requirements/design/tasks/deltas y
  rollout/rollback aprobados antes de código.
- Cualquier edición de #204 usa un change set separado aprobado y verificado.

## Abandono antes de implementar

Contexto:

- Una tarea está en DESIGN sin código ni PR.
- El usuario pide abandonarla.
- El tracker expone una transición real de cancelación.

Resultado esperado:

- Se muestra un dry-run conjunto y se pide aprobación exacta.
- `ABANDONING` precede la mutación; read-back verde permite `ABANDONED`.
- `abandon-record.md` conserva razón/branch/artefactos y la carpeta se
  archiva con sufijo `-abandoned`.
- No se fabrican QA, review, merge ni sync.

## Abandono con cancelación parcial

Contexto:

- Hay código parcial, PR abierto y tres items externos.
- El primer item se actualiza/verifica; el segundo falla; el tercero no inicia.

Resultado esperado:

- El lote se detiene y `tracker-result.md` queda `partial`.
- La tarea permanece `ABANDONING`.
- Branch, commits, PR y artefactos se preservan.
- No hay compensación/borrado ni archive final.
- Retry/reparación requiere un change set nuevo y otra aprobación.
