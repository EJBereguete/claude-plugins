# Microsoft Planner Operations

La disponibilidad, auth y matriz de capacidades se diagnostican una sola vez
en [PROVIDER-DOCTOR.md](PROVIDER-DOCTOR.md). Este módulo define inspección y
operaciones de Planner; no duplica el contrato de doctor.

## Alcance

Planner gestiona tareas, buckets y planes; no tiene la jerarquía Agile ni la
semántica de sprint de Azure Boards.

Antes del draft:

- Resolver `plan_id` y bucket reales.
- Confirmar permisos Graph.
- Consultar tareas existentes para duplicados.
- Consultar miembros asignables y categorías configuradas.
- Obtener ETag vigente de cualquier recurso que se vaya a modificar.

## Mapeo

- Todos los tipos semánticos se degradan a Planner Task.
- El título indica el resultado, no el nombre interno del tipo.
- La descripción contiene la plantilla aplicable.
- Parent/child y dependency se representan mediante checklist/references o
  links textuales; mostrar esta pérdida de semántica en el preview.
- Labels se mapean solo a categorías existentes.
- Buckets son columnas Kanban, no sprints ni milestones.
- `percentComplete` representa progreso/cierre; no inventar porcentajes
  intermedios.

## Transporte

Usar Microsoft Graph mediante la integración disponible. `az rest` es
fallback. Para cualquier PATCH:

1. GET inmediato.
2. Capturar `@odata.etag`.
3. Incluir `If-Match`.
4. PATCH exacto aprobado.
5. GET de verificación.

Un conflicto de ETag invalida la operación. No reintentar con el nuevo ETag
sin regenerar el preview si el recurso cambió materialmente.

## Detalles y comentarios

Planner no ofrece un thread de comentarios equivalente al de Boards/Issues.
Una operación `comment` degrada a append en notes/details y debe mostrar ese
efecto antes de aprobación.

## Links a PR

Agregar URL como reference y texto en el PR. No prometer autocierre cruzado:
el merge de GitHub/Azure Repos no completa una tarea de Planner.

## Verificación

Confirmar por GET:

- Task ID, plan y bucket.
- Título, asignaciones, categorías y percentComplete.
- Description/notes/references desde task details.
- ETag/revisión posterior.
