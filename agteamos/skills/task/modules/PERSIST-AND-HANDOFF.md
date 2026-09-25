# Module: Persist and Handoff

## CONTRACT

- **Input**: artefactos aprobados, decisión INVEST, jerarquía intent y DAG.
- **Output**: work items/relaciones verificados, carpeta con ID real y handoff.
- **Puerta única**: `agteamos-work-items`.
- **Gate**: validar localmente antes de escribir; read-back después de escribir.
- **No hace**: llamadas directas al proveedor ni implementación.

## 1. PRE-FLIGHT LOCAL

Congelar el snapshot usado por Shape y comprobar:

- brief/origins preservan el historial;
- `task.yml` tiene schema/context tier y metadatos requeridos;
- en full existen requirements, design, deltas y tasks;
- requirements ↔ ACs ↔ deltas ↔ tasks son trazables;
- todas las tasks tienen los nueve campos obligatorios;
- dependencias y jerarquía no tienen ciclos;
- aprobaciones S1/S2/UI están registradas;
- no hay secretos, PII ni logs sensibles en artefactos destinados al ticket.

Cuando el script esté disponible, ejecutar desde el root del proyecto
consumidor:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-validate.mjs" --root "<repo>"
```

Usar `--strict` si la política del proyecto trata warnings como bloqueo.
Corregir errores antes de continuar. Si Node o el script no están disponibles,
registrar `validator: unavailable` con la causa y ejecutar el checklist manual;
no fingir un PASS.

El validador es un piso. Aunque pase, validar manualmente los campos de
`tasks.md` y la DAG si el script instalado aún no los cubre.

## 2. CONSTRUIR EL INTENT

Entregar a `agteamos-work-items`:

- paths de requirements, design, deltas y tasks;
- snapshot del repo y evidencia relevante;
- schema, dominios, complejidad y prioridad confirmada;
- parent existente/propuesto y jerarquía completa;
- items a crear/actualizar, ACs, disciplina y dependencias;
- `change_path` canónico para persistir `tracker-result.md`;
- decisiones pendientes y degradaciones aceptables;
- validación local y aprobaciones de artefactos.

No duplicar campos nativos del proveedor dentro del body. No inventar owner,
area, iteration, milestone, labels, dates, KPIs ni estimación.

## 3. PIPELINE EXTERNO OBLIGATORIO

Ejecutar mediante `agteamos-work-items`, en este orden:

### 3.1 `inspect-repo` — lectura

- Relee contexto, specs, código, tests, cambios y decisiones.
- Busca duplicados locales/remotos por objetivo semántico.
- Clasifica cada dato como `Observed`, `Proposed` o `Pending decision`.
- Si cambió evidencia usada por el shape, invalidar y volver a la fase
  correspondiente.

### 3.2 `inspect-tracker` — lectura

- Descubre proveedor/proyecto/equipo efectivos.
- Obtiene tipos, campos, requeridos, estados, usuarios asignables y valores.
- Confirma jerarquía/relaciones/sub-issues/dependencias soportadas.
- Detecta duplicados y el estado actual de padres/targets.

### 3.3 `draft` — sin escritura

Construir un change set exacto con:

- snapshot/fingerprint;
- operaciones en orden: padres → hijos → relaciones;
- valores exactos por campo;
- mappings de requirements/ACs/tasks;
- degradaciones de jerarquía;
- pendientes, warnings y número total de mutaciones.

Aplicar los quality gates de `agteamos-work-items`, incluido INVEST,
parent único, dependencias acíclicas y ausencia de duplicado no resuelto.

### 3.4 Aprobación

Mostrar el lote completo y preguntar:

> ¿Apruebas ejecutar exactamente estas N operaciones?

La aprobación corresponde al fingerprint. Cualquier cambio de target, campo,
relación, operación o evidencia relevante invalida la aprobación y exige un
nuevo draft.

### 3.5 `apply` — escritura

Revalidar targets y snapshot. Ejecutar exactamente el lote aprobado:

1. padres;
2. Stories/Bugs;
3. Tasks;
4. campos y transiciones dependientes;
5. relaciones, links y comentarios.

No agregar una operación “obvia” fuera del change set.

### 3.6 Read-back — verificación

Después de cada escritura, releer el recurso. Verificar:

- ID/URL;
- tipo, título, body y campos;
- estado y asignación;
- parent/hijos;
- predecessor/successor u otras dependencias;
- links y degradaciones textuales aprobadas.

Con `change_path`, exigir además `tracker-result.md` sanitizado y actualizado
después de cada operación. El archivo viaja con el rename `tmp-*` → ID real y
conserva fingerprint, IDs/URLs y read-back sin payloads/tokens.

Resultado por operación: `verified`, `failed` o `not-verifiable`. Solo
`verified` cuenta como éxito. Ante fallo parcial, detener; no borrar ni
revertir automáticamente. Mostrar lo persistido y proponer otro change set.

## 4. FINALIZAR EL ESTADO LOCAL

Solo después de read-back exitoso del item principal:

1. actualizar `task.yml` con ID real, `ticket_url`, tracker, branch prevista,
   status y dependencias verificadas;
2. renombrar obligatoriamente
   `agteamos/changes/tmp-<slug>/` a
   `agteamos/changes/<id>-<slug>/`;
3. actualizar paths mutables en `progress.md`, requirements, design, deltas y
   tasks si los contienen;
4. **no editar `brief.md` ni origins** para corregir paths: esos archivos no
   deben contener referencias frágiles;
5. registrar IDs/URLs hijos y el resultado de verificación.
6. confirmar que `tracker-result.md` usa el fingerprint aprobado y no contiene
   secretos, headers ni bodies completos.

No crear branch hasta que exista el ID real; `agteamos-implement` la crea con
el naming canónico.

## 5. CAMBIOS DE DIRECCIÓN POSTERIORES

Si aparece una nueva dirección antes o después de persistir:

1. agregar `origin-<slug>.md` append-only;
2. volver a Clarify solo para la nueva frontera;
3. revisar requirements/design/deltas/tasks afectados;
4. ejecutar validador local;
5. usar `agteamos-work-items` para
   inspect → draft → aprobación → apply → read-back de la actualización.

Nunca reescribir el brief ni editar el tracker directamente para “sincronizar
rápido”.

## 6. HANDOFF

Leer `agteamos/platform.yml`:

- `handoff_mode: auto`: continuar con `agteamos-implement` usando ticket y
  carpeta definitivos.
- `handoff_mode: explicit`: presentar resumen y pedir confirmación.

El handoff incluye:

- ID/URL y jerarquía verificados;
- schema, context tier, dominios y complejidad;
- paths de artefactos;
- orden topológico y próxima task desbloqueada;
- standards paths relevantes;
- riesgos, decisiones pendientes y UI approval;
- resultado del validador.

## DONE

- [ ] Validación local PASS o limitación documentada + gate manual.
- [ ] Change set aprobado sin cambios posteriores.
- [ ] Todos los recursos y relaciones requeridos están `verified`.
- [ ] Carpeta usa el ID definitivo.
- [ ] Brief/origins permanecen inmutables.
- [ ] Handoff respeta `handoff_mode`.

## ANTI-PATTERNS

- Persistir primero y validar después.
- Usar CLI/API/MCP del tracker fuera de `agteamos-work-items`.
- Tratar `apply` exitoso como verificación.
- Continuar un lote tras fallo parcial.
- Renombrar con ID supuesto o dejar `tmp-`.
- Crear branch provisional.
