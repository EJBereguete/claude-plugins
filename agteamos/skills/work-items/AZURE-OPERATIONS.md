# Azure Boards Operations

La disponibilidad, auth y matriz de capacidades se diagnostican una sola vez
en [PROVIDER-DOCTOR.md](PROVIDER-DOCTOR.md). Este módulo define inspección y
operaciones de Azure Boards; no duplica el contrato de doctor.

## Alcance

Azure Boards avanzado está limitado al proceso Agile:

`Epic → Feature → User Story → Task`

La ubicación de Bug se descubre desde team settings. Issue se usa para
bloqueos, riesgos, dependencias o decisiones.

Si el proceso efectivo no es Agile:

- No aplicar la jerarquía ni campos Agile por memoria.
- Informar que la planificación avanzada no está soportada.
- Permitir CRUD común únicamente con tipos/campos descubiertos.
- Conservar compatibilidad de los adapters legacy para Scrum/Basic/CMMI.

## Transporte

1. Preferir el MCP oficial `@azure-devops/mcp`.
2. Detectar capacidades disponibles; no asumir nombres de tools estables.
3. Para lectura que el MCP no exponga, usar Azure DevOps REST o `az` como
   fallback y registrar la fuente.
4. Para escritura no expuesta por MCP, REST/CLI solo puede ejecutarse como
   una operación exacta de un change set aprobado.
5. Cargar [AZURE-TRANSPORT.md](AZURE-TRANSPORT.md) únicamente cuando haya
   fallback REST/CLI, rich text/no-ASCII, layout ambiguo o attachments.

El payload efectivo se deriva del JSON aprobado; no se reconstruye desde
Markdown. En fallback REST, el texto viaja como archivo UTF-8 estructurado y
el read-back se compara por valor, no por salida renderizada del CLI.

Capacidades MCP esperables, sin hacerlas requisito rígido:

- Core: proyectos, equipos e identidades.
- Work: iteraciones, team settings y capacidades.
- Work items: get/create/update, batch, comments, links, WIT, backlog y WIQL.

## Preflight de solo lectura

### Organización, proyecto y equipo

- Organización configurada/autenticada.
- Proyecto real e ID.
- Equipo real e ID.
- Team settings: default area, backlog iteration, current iteration y bug
  behavior.

Si `team` falta y hay más de uno, preguntar cuál; no elegir el primero.
Persistir la respuesta mediante `agteamos-setup` como campo confirmado.

### Proceso, tipos y campos

1. Determinar el proceso efectivo del proyecto.
2. Enumerar WITs cuando la API disponible lo permita.
3. Consultar el detalle de cada tipo que se vaya a usar.
4. Obtener:
   - Reference name y display name.
   - Campos requeridos.
   - Tipo de dato y valores permitidos.
   - Estados y estado inicial.
   - Campos custom y reglas visibles.
   - Formato rich text.
   - Layout efectivo cuando una etiqueta visible pueda mapear a un campo
     distinto del reference name estándar.

El MCP oficial puede obtener un WIT conocido, pero no todas sus versiones
enumeran el proceso heredado, todos los WITs custom o el árbol completo de
áreas. Usar REST de solo lectura para cubrir esos huecos. Si tampoco está
disponible, bloquear `apply` del dato desconocido.

Una etiqueta de formulario no es evidencia suficiente del campo subyacente.
Para Bugs/custom WITs con layout ambiguo, registrar el control y reference
name descubierto antes del draft.

### Áreas, iteraciones e identidades

- Resolver Area Path contra el árbol real.
- Resolver Iteration Path contra team settings/iterations reales.
- “Backlog” no es un valor universal de Iteration Path: usar backlog
  iteration real o dejar el campo sin enviar.
- Resolver Assigned To a una identidad única y asignable.
- No convertir un nombre ambiguo en email/descriptor.

### Estado actual

Consultar backlog, jerarquía y relaciones relevantes. Para creación masiva:

- Buscar duplicados por objetivo/título semántico.
- Detectar children existentes.
- Detectar parents múltiples o inválidos.
- Construir grafo de dependency links y rechazar ciclos.
- Validar links externos/artifacts.

## Mapeo Agile

Usar nombres de campos descubiertos. Estos reference names son candidatos
del proceso estándar, no autorización para escribirlos sin inspección:

| Semántica | Reference name estándar |
|---|---|
| Title | `System.Title` |
| Description | `System.Description` |
| State | `System.State` |
| Assigned To | `System.AssignedTo` |
| Area Path | `System.AreaPath` |
| Iteration Path | `System.IterationPath` |
| Tags | `System.Tags` |
| Acceptance Criteria | `Microsoft.VSTS.Common.AcceptanceCriteria` |
| Story Points | `Microsoft.VSTS.Scheduling.StoryPoints` |
| Priority | `Microsoft.VSTS.Common.Priority` |
| Risk | `Microsoft.VSTS.Common.Risk` |
| Value Area | `Microsoft.VSTS.Common.ValueArea` |
| Activity | `Microsoft.VSTS.Common.Activity` |
| Original Estimate | `Microsoft.VSTS.Scheduling.OriginalEstimate` |
| Remaining Work | `Microsoft.VSTS.Scheduling.RemainingWork` |
| Completed Work | `Microsoft.VSTS.Scheduling.CompletedWork` |
| Severity | `Microsoft.VSTS.Common.Severity` |
| Repro Steps | `Microsoft.VSTS.TCM.ReproSteps` |
| System Info | `Microsoft.VSTS.TCM.SystemInfo` |

No enviar un campo solo porque aparece en esta tabla. Confirmar que pertenece
al WIT real y que el valor cumple sus reglas.

## Rich text

Los campos HTML de Azure no reciben Markdown crudo:

- Convertir headings, listas, checkboxes, code y Given/When/Then a HTML
  seguro cuando el tool no haga conversión.
- Escapar contenido.
- No incluir scripts, estilos ni HTML activo.
- Releer mediante una fuente estructurada confiable y aplicar la comparación
  value-aware de `AZURE-TRANSPORT.md`. No buscar únicamente firmas conocidas
  de corrupción.

## Attachments y evidencia técnica

- Preferir permalink de repositorio cuando sea suficiente.
- Un attachment requiere capacidad verde, path dentro del proyecto, revisión
  de secretos/PII, hash/tamaño/MIME y targets incluidos en el change set.
- Upload y relación `AttachedFile` son operaciones separadas del journal.
- Releer relations expandidas de cada target y conservar hash/URL sanitizados
  en `tracker-result.md`.
- No adjuntar automáticamente design, logs o reportes solo porque existen.

## Relaciones

Preferir relaciones nativas descubiertas:

- Parent/Child: jerarquía.
- Predecessor/Successor: dependencia.
- Related: asociación no direccional.
- Duplicate/Duplicate of: duplicidad.
- Hyperlink: especificación/diseño externos.
- Artifact links: branch, commit, PR o build.

Parent/Child y Dependency son acíclicas. Prevalidar; no depender únicamente
del error del servidor.

Para Repository/PR usar artifact link o la operación MCP específica cuando
esté disponible. Hyperlink es fallback, no primera opción.

## Creación jerárquica

Orden:

1. Crear Epic y verificar ID/campos.
2. Crear Feature y verificar.
3. Vincular Feature como child de Epic y verificar.
4. Crear User Story y verificar.
5. Vincular Story como child de Feature y verificar.
6. Crear Tasks/Bugs según configuración y verificar.
7. Añadir dependencias, related y links externos.

El estado inicial se omite salvo que el usuario haya aprobado uno que la
transición real permita. Nunca fijar `New` por defecto.

## Backlog y sprint

Lecturas sin aprobación:

- Listar backlog/team backlog.
- Consultar iteraciones y work items.
- Consultar capacidad y team settings.
- Generar WIQL y forecast.
- Proponer sprint goal, compromiso, asignaciones y movimiento.

Mutaciones con change set:

- Cambiar Iteration/Area.
- Editar prioridad/stack rank.
- Asignar personas.
- Editar capacidad.
- Guardar queries.
- Cambiar estados o comentarios.

Una propuesta de sprint debe advertir sobre capacidad faltante, items no
READY, dependencias abiertas y trabajo sin estimar. No autoasignar ni
autoestimar.

## Bugs

Leer `bugsBehavior` del equipo:

- `asRequirements`: Bug al nivel de User Story.
- `asTasks`: Bug bajo requirement en sprint/taskboard.
- `off`: Bug se gestiona separado de backlog.

Si el valor no puede descubrirse, no parentar el Bug automáticamente.

## Verificación

Después de escribir:

1. Get del work item con campos escritos y relations expandidas.
2. Confirmar revisión/ID/URL.
3. Comparar campos por tipo; plain text conserva code points Unicode y rich
   text solo admite normalización HTML documentada.
4. Para batch, verificar cada ID por separado.
5. Para relaciones, verificar ambos extremos cuando sea posible.
6. Para attachments, verificar cada relation y el hash de la fuente aprobada.

No considerar éxito solo porque create/update devolvió HTTP 200.

## Fuera de alcance automático

- Personalización administrativa del proceso.
- Crear/eliminar WITs o campos.
- Eliminar definitivamente work items.
- Saltar reglas, permisos o branch policies.
- Decidir prioridades, estimaciones, fechas u owners.

Se puede explicar la limitación o proponer una operación compatible en un
change set separado.
