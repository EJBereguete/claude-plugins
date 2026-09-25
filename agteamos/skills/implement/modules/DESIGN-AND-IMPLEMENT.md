# DESIGN AND IMPLEMENT

Carga este módulo solo en `DESIGN` o `IMPLEMENT`. Después de cada unidad de
`tasks.md`, transiciona obligatoriamente a `RECONCILE`; no ejecutes dos
unidades seguidas sin ese checkpoint.

## 1. Aplicar contexto por tiers

La definición canónica de tiers vive exclusivamente en `agteamos-context`.
Aquí solo se aplica:

1. Lee `task.yml` y `Next Action` (`Tier 1`).
2. Respeta `context_tier` persistido; puede subir, nunca bajar.
3. Para Tier 2/3, carga specs/arquitectura/ADRs únicamente según las rutas y
   alcance definidos por `agteamos-context`.
4. Si subes el tier, actualiza `task.yml` y registra motivo en
   `progress.md`.

### Resolver standards Tier 2/3

No leas ni recorras `agteamos/standards/` para descubrir temas:

1. Reúne keywords de `layer`, `type`, `domains`, título y `design.md`.
2. Invoca `agteamos-knowledge --inject` con esas keywords. Este modo se usa
   **solo para obtener rutas**; no debe inyectar contenido de standards.
3. Por cada ruta devuelta, consulta su entrada en
   `agteamos/standards/index.meta.yml`.
4. Si el topic está `pending` o `stale`, ejecuta primero
   `ensure-artifact(standards.<id>)` según `agteamos-context`.
5. Genera como máximo **un** artefacto por step. Si quedan más pendientes,
   enuméralos y pide una sola decisión para continuar o diferirlos.
6. Lee únicamente los archivos devueltos cuyo artefacto está listo.

Si `--inject` no resuelve rutas, registra keywords y resultado vacío en
`progress.md`; no cargues todos los standards como fallback.

## 2. Gate SDD

### Schema full

Antes del primer cambio de código deben existir:

1. `requirements.md`: RFC 2119 y ACs trazables; aprobado por el usuario.
2. `design.md`: approach, archivos, datos/API, seguridad y seams de testing;
   aprobado por el usuario con validación de `@architect`.
3. `specs/deltas/<dominio>.md`: uno por dominio, con bloques canónicos
   ADDED/MODIFIED/REMOVED o “Sin cambios”. Para MODIFIED/REMOVED, relee la
   spec maestra vigente y usa el nombre exacto.
4. `tasks.md`: checklist por unidad/capa, responsable y orden; validado por
   `@product-manager`.

Antes del primer cambio de código, ejecutar el preflight read-only:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-analyze.mjs" \
  --change "agteamos/changes/<id>-<slug>" --stage preflight
```

Exit no cero bloquea `IMPLEMENT`. Corregir requisitos, ACs, cobertura de
tasks, rutas de diseño o clasificación/anclas de deltas; no silenciar el
diagnóstico ni sustituirlo por revisión manual.

Usa los formatos canónicos de `agteamos-spec`. Las plantillas completas
están en `TEMPLATES.md` y se cargan solo mediante `NEEDS_TEMPLATE`.

No edites la spec maestra durante diseño o implementación. Solo el sync
determinista de cierre la modifica.

### Schema lite

Exige un resumen de un párrafo y un test de regresión que falle antes y pase
después. Si aparece un cambio observable, detén código, cambia a `full`,
produce/aprueba los cuatro artefactos y valida antes de reanudar.

## 3. Implementar una unidad

Selecciona exactamente la próxima unidad incompleta de `tasks.md` o, en
`lite`, el cambio descrito por el resumen:

1. marca la unidad `IN_PROGRESS` en `progress.md`;
2. relee requirements y sección relevante de design;
3. implementa solo el alcance de esa unidad siguiendo los standards
   inyectados y convenciones reales del repo;
4. escribe tests de comportamiento antes de marcarla completa;
5. actualiza archivos, tests, decisiones y `Next Action`;
6. transiciona a `RECONCILE`.

Para cada pieza funcional cubre como mínimo happy path, error y borde, salvo
que la naturaleza del cambio haga alguno imposible; documenta la razón.
Tests y lint relevantes deben pasar. TDD es obligatorio cuando el usuario lo
pide y recomendado para cálculos, montos, permisos y lógica crítica.

### Disciplina técnica

- Controllers/routers delegan lógica de negocio.
- Manejo de errores explícito; sin secrets ni debug residual.
- Frontend tipado sin `any`, async/await y estados de error.
- Dependencias externas usan el seam aprobado en `design.md`.
- Cambios de auth, permisos o datos sensibles reciben revisión de
  `@security-engineer`; toda superficie nueva pasa STRIDE.
- No cambies approach, requirement, delta o orden comprometido “sobre la
  marcha”: eso es divergencia y pertenece a `RECONCILE`.

## 4. Handoff

Cuando cambia el agente, escribe en `progress.md`:

- completado y paths exactos;
- decisión/restricción crítica;
- próxima unidad concreta;
- criterio de éxito.

El receptor lee el handoff antes de actuar y actualiza `handoffs` si cambió
la persona.

## Condición de salida

- Unidad modificada o finalizada → `RECONCILE`.
- Todas las unidades reconciliadas → `QA`.
- Hallazgo que altera scope/contrato → `RECONCILE` con implementación
  detenida.
