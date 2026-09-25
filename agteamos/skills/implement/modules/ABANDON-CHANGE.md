# ABANDON CHANGE

Carga este módulo solo cuando el usuario pida cancelar o abandonar un cambio
activo. Abandonar conserva el trabajo y su trazabilidad: no es borrar,
descartar ni fingir que el cambio se completó.

## Precondiciones

1. Leer `task.yml`, `progress.md`, estado Git, PR y ticket actual.
2. Confirmar que no está `done`, mergeado ni ya archivado como completado. Un
   cambio entregado requiere un nuevo ticket de rollback/reversión.
3. Identificar archivos modificados, commits, branch, artefactos, operaciones
   externas y trabajo parcial que debe preservarse.
4. Inspeccionar el tracker con `agteamos-work-items`; no asumir un estado
   llamado Cancelled/Removed ni que todos los hijos admiten la misma
   transición.

Las lecturas son libres. No cambies estado local ni externo antes del
preview y la aprobación.

## Dry-run obligatorio

Presenta un único plan con:

```markdown
# Abandon Change — Draft
Change: <id/título>
Current phase/status: <phase>/<status>
Reason: <motivo explícito>

## Preserved local work
- Branch/commit: <branch>/<sha o working tree>
- Changed files and artifacts: <rutas>
- PR: <estado/url o none>

## External operations
1. <update/comment/link/close exacto por item>

## Local transition
- task.yml: phase <actual> → ABANDONING → ABANDONED
- task.yml: status <actual> → abandoned
- Create abandon-record.md
- Archive to agteamos/changes/archive/<fecha>-<id>-<slug>-abandoned/

## Explicitly not performed
- No reset, deletion or cleanup of partial work.
- No sync of partial deltas into master specs or knowledge.
- No merge and no successful-delivery gates fabricated.

Fingerprint: <SHA-256 del change set externo>
¿Apruebas ejecutar exactamente estas operaciones externas y archivar el
cambio como abandonado preservando el trabajo parcial?
```

Si cambia una operación, target, valor, fingerprint o efecto local, presenta
otro dry-run y pide aprobación nuevamente.

## Ejecución durable

1. Tras la aprobación, crea `abandon-record.md` con `Status: abandoning`,
   cambia solo `phase: ABANDONING` y añade un checkpoint a `progress.md`.
2. Para ticket, hijos, comentarios o relaciones usa exclusivamente
   `agteamos-work-items` con `change_path`: doctor, JSON canónico,
   fingerprint, receipt aprobado, apply y read-back. Cualquier cierre de PR
   usa `agteamos-pr` con su aprobación aplicable.
3. Si una mutación falla, deja `phase: ABANDONING`, conserva
   `tracker-result.md` parcial y detente. No compenses, borres ni archives
   como finalizado.
4. Tras read-back verificado, establece `ticket_reconciled: true`,
   `status: abandoned`, `phase: ABANDONED` y completa el record.
5. Ejecuta el validador. Mueve la carpeta completa a
   `changes/archive/<fecha>-<id>-<slug>-abandoned/` y regenera dashboard.

No se exigen `qa_pass`, `review_approved`, `merge_confirmed` ni un
`verify-report.md` exitoso. Conserva sus valores reales.

## abandon-record.md

```markdown
# Abandon Record: <id>

- Status: abandoned
- Reason: <motivo aprobado>
- Requested by: <actor>
- Approved at: <timestamp>
- Previous phase/status: <phase>/<status>
- Tracker change set: <fingerprint>
- Tracker read-back: PASS
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
- Reuse: <qué trabajo puede reutilizarse y qué debe revalidarse>
```

El record no incluye tokens, payloads, emails privados ni respuestas crudas.
La branch se preserva por defecto. Eliminarla o limpiar artefactos es una
acción de mantenimiento posterior, separada y explícitamente aprobada.

## Invariantes

- Nunca `git reset --hard`, checkout destructivo, borrado de branch ni
  eliminación de archivos para abandonar.
- Nunca marcar como entregado, hacer merge o sincronizar conocimiento parcial.
- Nunca modificar padres/hijos externos fuera del change set aprobado.
- Un abandonado no cuenta como `done`; portal y reportes lo muestran por
  separado.
