---
name: agteamos-work-items
description: >
  Puerta unica para diagnosticar, inspeccionar, proponer, crear y modificar
  work items en Azure Boards, GitHub Issues y Microsoft Planner. Revisa
  primero el repositorio y el tracker reales, genera un change set exacto,
  exige aprobacion para toda mutacion y verifica cada escritura. Usar cuando
  se validen proveedores o se creen o editen tickets, jerarquias, backlog,
  sprint, asignaciones, estados, comentarios, relaciones o cierres.
used_by:
  - architect
  - product-manager
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - security-engineer
  - devops-engineer
---

# Work Items

## CONTRACT

- **Input**: solicitud del usuario + repositorio actual +
  `agteamos/platform.yml`.
- **Output de lectura**: hallazgos con evidencia y sin cambios externos.
- **Output de mutacion**: change set aprobado, IDs/URLs devueltos por el
  proveedor y verificacion posterior por lectura.
- **Proveedor**: `platform.yml.tracker` (`github`, `azure_devops`,
  `planner`) o adapter compatible.
- **Regla absoluta**: ninguna skill o agente crea o modifica un work item
  directamente. Delega en esta skill.

Esta skill gestiona el tracker. No reemplaza:

- Clarificacion, INVEST y breakdown: `agteamos-task`.
- Definition of Ready y cierre tecnico: `agteamos-implement`.
- Requirements, design, tasks y deltas: `agteamos-spec`.
- Pull requests y merge: `agteamos-pr` y el adapter de `repo_host`.

## MODOS

| Modo | Escribe | Uso |
|---|---:|---|
| `doctor` | No | Diagnosticar configuración, auth y capacidades del proveedor |
| `inspect-repo` | No | Obtener contexto real antes de redactar |
| `inspect-tracker` | No | Descubrir capacidades, campos y estado actual |
| `draft` | No | Construir y validar un change set |
| `apply` | Sí | Ejecutar exactamente un change set aprobado |
| `reconcile` | Solo con aprobación | Comparar repo/tracker y proponer correcciones |

Las lecturas no requieren aprobación. Toda creación, edición, comentario,
asignación, movimiento, cambio de estado, vínculo, desvínculo, reparent,
cierre o lote sí.

## FLUJO OBLIGATORIO

### 1. Resolver el proyecto

1. Leer `agteamos/platform.yml`.
2. Si falta `tracker`, aplicar el contrato hard dependency de
   `agteamos-setup`; no adivinar proveedor.
3. Separar siempre:
   - `repo_host`: PRs, branches, commits y builds.
   - `tracker`: issues, work items o tareas.
4. Cargar [PROVIDER-DOCTOR.md](PROVIDER-DOCTOR.md) y solo el módulo de
   operaciones del proveedor elegido:
   - Azure Boards: [AZURE-OPERATIONS.md](AZURE-OPERATIONS.md)
   - GitHub Issues: [GITHUB-OPERATIONS.md](GITHUB-OPERATIONS.md)
   - Planner: [PLANNER-OPERATIONS.md](PLANNER-OPERATIONS.md)
   Para Azure, cargar
   [AZURE-TRANSPORT.md](AZURE-TRANSPORT.md) solo si el draft necesita
   fallback, texto no-ASCII/rich text, layout o attachments.
   Cargar [CHANGE-SETS.md](CHANGE-SETS.md) únicamente para `draft`, `apply` o
   `reconcile`; cargar templates/quality gates solo al redactar o validar.
   Una inspección de lectura no precarga módulos de mutación.
5. Si existe `agteamos/tracker/<tracker>.md`, tratarlo como override
   project-owned y cargar únicamente sus diferencias antes del módulo
   default. Nunca regenerarlo.
6. Un proveedor futuro requiere ese override local y debe implementar el
   mismo contrato de doctor, preview, aprobación y verificación.

Los escenarios mínimos de validación están en
[EXAMPLES.md](EXAMPLES.md).

### 2. Diagnosticar el proveedor

Ejecutar `doctor` según
[PROVIDER-DOCTOR.md](PROVIDER-DOCTOR.md):

- A demanda cuando el usuario lo solicite.
- Obligatoriamente antes del primer `apply` por proveedor/sesión.
- De nuevo si cambia configuración, identidad, permisos, transporte,
  snapshot o cualquier precondición que vuelva `stale` el diagnóstico.

Doctor nunca muta, no pide aprobación y no guarda queries ni capacidad.
Devuelve `configured`, `degraded` o `unavailable`, con checks, evidencia,
snapshot, capacidades verdes, capacidades bloqueadas y remediation.

Un draft puede existir con warnings sin doctor verde. `apply` se bloquea
antes de la primera escritura si falta doctor, está `stale`, devuelve
`unavailable` o alguna capacidad usada por el change set no está en verde.
No descubrir auth, permisos ni capacidades faltantes durante `apply`.

### 3. Inspeccionar el repositorio

Antes de redactar Epic, Feature, User Story, Task, Bug o Issue, ejecutar
`inspect-repo` según [REPOSITORY-CONTEXT.md](REPOSITORY-CONTEXT.md).

El resultado debe separar:

- **Observed**: confirmado por archivos, código, tests, Git o tracker.
- **Proposed**: recomendación todavía no escrita.
- **Pending decision**: dato que solo una persona puede decidir.

No presentar una inferencia como hecho. No inventar owner, sponsor, fechas,
KPI, prioridad, estimación, release, área o sprint.

### 4. Inspeccionar el tracker

Ejecutar `inspect-tracker` antes de usar nombres de tipo, campo, estado,
usuario, área, iteración, label, milestone, bucket o relación.

La inspección debe obtener, según las capacidades del proveedor:

- Proyecto, equipo y configuración efectiva.
- Tipos y campos aplicables, incluidos custom.
- Campos requeridos, valores permitidos y estado inicial.
- Usuarios asignables.
- Backlog/sprint/bucket, jerarquía, relaciones y duplicados actuales.

Si un dato no puede descubrirse, marcarlo como limitación o decisión
pendiente. Nunca rellenarlo con un supuesto.

### 5. Construir el intent

Normalizar el pedido sin perder semántica:

```yaml
provider: azure_devops | github | planner | custom
operation: create | update | comment | link | unlink | move | close
provider_doctor:
  snapshot: <id o null>
  status: configured | degraded | unavailable | not_run
  required_capabilities: []
context_snapshot:
  repositories:
    - role: primary | dependency | mirror
      commit: <sha o null>
      branch: <branch o null>
      dirty: true | false
      freshness: verified | stale | unverified | not_applicable
  evidence: [<archivo/simbolo/hallazgo>]
change_path: <agteamos/changes/... o null>
target:
  project: <real>
  team: <real o no aplicable>
  id: <existente o null>
work_item:
  type: <tipo real>
  title: <titulo>
  body: <contenido>
  fields: {}
relations: []
pending_decisions: []
```

Elegir plantilla desde
[WORK-ITEM-TEMPLATES.md](WORK-ITEM-TEMPLATES.md), pero incluir solo
secciones sustentadas por contexto o decisiones explícitas.

### 6. Quality gates

Aplicar [QUALITY-GATES.md](QUALITY-GATES.md):

- Objetivo y valor trazables.
- INVEST/DoR/DoD desde sus fuentes canónicas.
- Criterios verificables.
- Jerarquía válida para el proveedor.
- Dependencias sin ciclos.
- Sin duplicado no resuelto.
- Sin valores inventados.

Un campo opcional pendiente no bloquea el draft. Un campo requerido por el
proveedor sí bloquea `apply`.

### 7. Presentar el change set

Seguir [CHANGE-SETS.md](CHANGE-SETS.md). La vista previa debe mostrar:

- Context snapshot y evidencia relevante.
- Snapshot/status de doctor y capacidades requeridas/bloqueadas.
- Proveedor/proyecto/equipo.
- Jerarquía y operaciones en orden.
- Valores exactos por campo y relación.
- Decisiones pendientes, advertencias y efectos.
- Número total de mutaciones.
- Fingerprint del change set.

Materializar el payload JSON y calcular ese fingerprint mediante
`scripts/agteamos-change-set.mjs`; no calcularlo mentalmente ni desde el
Markdown presentado.

Pedir: **“¿Apruebas ejecutar exactamente estas N operaciones?”**

La aprobación cubre el lote completo, no cada llamada individual. Si cambia
cualquier operación, campo, relación, target, contexto relevante o
fingerprint, volver a mostrar el draft y pedir aprobación.

### 8. Aplicar

Antes de la primera escritura:

1. Confirmar doctor del mismo proveedor/sesión, no `stale`, y todas las
   capacidades usadas en verde.
2. Releer el estado de los targets.
3. Revalidar el snapshot del repo y precondiciones.
4. Crear el approval receipt después de la respuesta explícita.
5. Ejecutar `agteamos-change-set.mjs verify` y exigir exit cero.
6. Si el intent incluye un `change_path` válido, inicializar
   `tracker-result.md` con fingerprint/doctor/approval sanitizados.

Si falla el primer punto, detenerse sin mutar y devolver checks, evidencia y
remediation de doctor. No intentar completar discovery dentro de `apply`.
Si falla el gate de fingerprint, invalidar el receipt, mostrar el draft nuevo
y pedir otra aprobación.

Ejecutar en orden seguro:

1. Padres antes que hijos.
2. Items antes que relaciones que usan sus IDs.
3. Campos antes que transiciones dependientes.
4. Comentarios y enlaces después del item principal.

No ejecutar operaciones fuera del change set, aunque parezcan obvias.

### 9. Verificar

Después de cada escritura, volver a leer el recurso y comprobar campos,
estado y relaciones. Al terminar, entregar:

- ID y URL por operación.
- Resultado `verified`, `failed` o `not-verifiable`.
- Diferencias entre valor solicitado y valor persistido.
- Operaciones no ejecutadas.

Si existe `change_path`, hacer checkpoint de cada operación en
`tracker-result.md` según `CHANGE-SETS.md`, incluido cualquier fallo parcial.
El cache conserva payloads crudos solo temporalmente; el archivo durable
conserva IDs/URLs, hashes y resultados sanitizados.

Si hay fallo parcial, detener el lote. No borrar ni revertir
automáticamente. Mostrar lo creado/modificado, el error y un nuevo change
set de reparación o continuación para aprobación.

### Abandono de un cambio activo

Cuando `agteamos-implement` aporta un `change_path` en `ABANDONING`:

1. releer item, hijos y relaciones;
2. descubrir los estados/transiciones reales de cancelación o remoción;
3. redactar operaciones exactas para hijos y padre, sin asumir `Cancelled`;
4. incluir comentario solo si forma parte del change set aprobado;
5. aplicar y releer cada target;
6. dejar `tracker-result.md` `verified` antes de que implement establezca
   `ticket_reconciled: true`.

Un fallo deja la tarea en `ABANDONING` y el receipt en `partial`/`failed`.
Nunca eliminar recursos, compensar automáticamente ni cerrar elementos que no
aparezcan en el fingerprint aprobado.

## REGLAS DE CONTEXTO REAL

- Revisar primero, preguntar después. Los hechos comprobables en el repo o
  tracker no se preguntan al usuario.
- Una ruta o símbolo citado como evidencia debe existir en el snapshot.
- Los detalles de implementación van en Task; el valor de usuario en Story;
  la capacidad demostrable en Feature; el resultado estratégico en Epic.
- En repos vacíos, usar solo visión, arquitectura, SRS y roadmap aprobados.
  Declarar explícitamente que no existe evidencia de implementación.
- `agteamos-capture` puede guardar una nota local sin inspección profunda.
  Antes de convertirla en ticket externo, este flujo completo es obligatorio.

## OPERACIONES DE LECTURA CONTINUA

Sin aprobación se puede:

- Consultar backlog, sprint, jerarquía, relaciones y salud.
- Detectar items sin parent, criterios, estimación o responsable.
- Detectar bloqueos, estancamiento, posibles duplicados y ciclos.
- Generar WIQL/queries/reportes sin guardarlos en el proveedor.
- Proponer priorización, sprint goal, compromiso o forecast.

Guardar una query, editar capacidad o aplicar cualquier propuesta vuelve a
ser una mutación y requiere change set.

## ANTI-PATTERNS

- Crear un ticket desde `task`, `bootstrap`, `capture`, `incidents` o un
  agente sin pasar por esta skill.
- Copiar comandos `gh`, `az boards` o `az rest` dentro de skills
  consumidoras.
- Usar `New`, `Closed`, `Backlog`, `main`, un username o un nombre de campo
  como si fueran universales.
- Duplicar INVEST/DoR/DoD dentro de esta skill.
- Mezclar operaciones de PR con operaciones de work item.
- Continuar después de un fallo parcial como si el lote fuera atómico.
- Considerar aprobado un change set después de modificarlo.

## Próximo paso sugerido

- Tras crear/verificar una tarea lista para implementar:
  `agteamos-implement`.
- Tras una lectura de salud/priorización: revisar el draft o seguir con
  `agteamos-task` para refinar el item elegido.
