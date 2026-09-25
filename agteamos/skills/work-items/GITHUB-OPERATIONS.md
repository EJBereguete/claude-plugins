# GitHub Issues Operations

La disponibilidad, auth y matriz de capacidades se diagnostican una sola vez
en [PROVIDER-DOCTOR.md](PROVIDER-DOCTOR.md). Este módulo define inspección y
operaciones de GitHub; no duplica el contrato de doctor.

## Preflight

Antes del draft:

- Resolver owner/repository real desde `platform.yml` y remote.
- Consultar labels, milestones, collaborators asignables e issues existentes.
- Buscar duplicados abiertos y cerrados.
- Detectar si el repositorio soporta sub-issues/issue types mediante las
  herramientas disponibles.

No asumir que existen labels, milestone, Project fields o responsables.

## Mapeo

GitHub Issues no garantiza la jerarquía rígida de Azure Boards. Degradar de
forma explícita:

- Epic/Feature/Story/Task/Bug/Issue → issue con issue type real si existe; si
  no, prefijo/label solo después de confirmar que esa convención es válida.
- Parent/Child → sub-issue nativo cuando esté disponible; si no, referencia
  `Parent: #id` y checklist/link recíproco aprobado.
- Predecessor/Successor → relación disponible en Projects o texto
  `Blocked by`/`Blocks` con enlaces recíprocos.
- Tags → labels existentes o creación de labels como mutación separada.
- Sprint/release → milestone o Project iteration real; no inventar uno.

Las plantillas de [WORK-ITEM-TEMPLATES.md](WORK-ITEM-TEMPLATES.md) se
renderizan en Markdown.

## Escrituras

Preferir MCP/API de GitHub para issue CRUD. `gh` es fallback dentro del
change set aprobado.

Toda creación, edición, comentario, label, assignee, milestone, relación o
cierre requiere preview. Las operaciones de Pull Request pertenecen a
`agteamos-pr`, no a este módulo.

## Verificación

Releer el issue después de cada escritura y comparar:

- Title/body/state.
- Labels, assignees y milestone.
- Parent/sub-issues o links degradados.
- URL y número.

Si una capacidad no existe, reportar la degradación antes de pedir
aprobación, no después de crear.
