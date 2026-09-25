---
name: agteamos-task
description: >
  Dispatcher para tareas nuevas sin ticket o desgloses existentes por
  auditar. Clarifica por frontera, revisa el repositorio real, produce
  artefactos full/lite, desglosa con INVEST y persiste la jerarquia
  exclusivamente mediante agteamos-work-items.
used_by:
  - architect
  - product-manager
  - ui-ux-designer
---

# Workflow: New Task (Flow 2)

## CONTRACT

- **Input**: pedido en lenguaje natural, repositorio con código y sin referencia
  a un ticket existente.
- **Output**: cambio local trazable, ticket y relaciones verificados, y handoff
  a `agteamos-implement`.
- **Fuente de verdad local**: `agteamos/changes/<id>-<slug>/`.
- **Puerta externa única**: toda lectura o mutación del tracker pasa por
  `agteamos-work-items`; ningún agente usa APIs, CLI o MCP del proveedor
  directamente.
- **Regla de intención**: `brief.md` conserva el pedido original. Nunca se
  reescribe para acomodar una dirección posterior.

## MODOS DE ENTRADA

- **Nueva tarea**: idea/requerimiento sin desglose previo → Clarify normal.
- **Auditar desglose**: lista ya redactada de work items o petición explícita
  de validar → cargar
  [modules/AUDIT-BREAKDOWN.md](modules/AUDIT-BREAKDOWN.md) primero.

La auditoría entrega un reporte read-only y se detiene. Solo si el usuario
pide continuar entra al flujo normal, preservando el desglose original
verbatim en `brief.md`; `READY` nunca autoriza una mutación.

## PRECONDITIONS

1. `agteamos-router` confirmó código fuente real.
2. El pedido no incluye URL, ID ni referencia a ticket.
3. No hay un cambio activo con el mismo objetivo; los posibles duplicados se
   resuelven antes de persistir.
4. `agteamos/architecture/PROJECT_CONTEXT.md` existe. Si falta, detener y
   completar onboarding/ingeniería inversa.

## DISCIPLINA DE CARGA

Esta skill es un dispatcher. **Cargar exactamente un módulo por vez**, solo al
entrar en su fase; no precargar los cinco ni mantener `TEMPLATES.md` abierto
durante todo el flujo.

| Fase | Cargar | Sale cuando |
|---|---|---|
| 0. Audit (condicional) | [modules/AUDIT-BREAKDOWN.md](modules/AUDIT-BREAKDOWN.md) | Reporte entregado; o decisión explícita de continuar |
| 1. Clarify | [modules/CLARIFY.md](modules/CLARIFY.md) | La frontera está vacía y el entendimiento fue confirmado |
| 2. Shape + Spec | [modules/SHAPE-AND-SPEC.md](modules/SHAPE-AND-SPEC.md) | Schema y artefactos aprobados |
| 3. Breakdown | [modules/BREAKDOWN.md](modules/BREAKDOWN.md) | INVEST, DAG y `tasks.md` están completos |
| 4. Persist + Handoff | [modules/PERSIST-AND-HANDOFF.md](modules/PERSIST-AND-HANDOFF.md) | Read-back verificado y handoff ejecutado |
| Plantillas | [modules/TEMPLATES.md](modules/TEMPLATES.md) | Se copió solo la plantilla necesaria |

Al terminar un módulo, conservar únicamente sus decisiones y paths de salida;
después cargar el siguiente. Si se necesita una plantilla, pausar la fase,
cargar `TEMPLATES.md`, usar solo la sección indicada y volver al módulo de la
fase. No copiar walkthroughs al contexto.

## FLUJO

### 0. Audit Breakdown (condicional)

Si el input ya contiene un desglose, cargar `AUDIT-BREAKDOWN.md`.

- Auditar antes de corregir.
- Usar repo y tracker reales como evidencia read-only.
- Reportar duplicados, huecos, dependencias, jerarquía, tamaño y límites de
  repo/equipo.
- Esperar una decisión. Sin petición de continuar, el flujo termina sin crear
  artefactos ni work items.

### 1. Clarify

Cargar `CLARIFY.md`.

- Separar hechos comprobables de decisiones humanas.
- Resolver hechos leyendo repo/config; preguntar solo preferencias o decisiones.
- Preguntar por rondas de frontera, 3-5 preguntas máximo, con recomendación.
- Revisar decisiones `out-of-scope` antes de reabrir una dirección descartada.
- Vaciar la frontera y confirmar alcance/out-of-scope.
- El premortem sigue siendo **opt-in** y nunca bloquea por defecto.

**Gate C1**: problema, usuarios, comportamiento, límites, prioridad e
integraciones aplicables están claros y confirmados.

### 2. Shape + Spec

Cargar `SHAPE-AND-SPEC.md`.

El shape es explícito y precede a la especificación:

1. inspeccionar código, tests, manifests y configuración reales;
2. leer `PROJECT_CONTEXT.md`;
3. leer mission/roadmap si existen;
4. leer índices y specs de dominios relacionados;
5. ejecutar `agteamos-knowledge --inject` para obtener **solo paths** de
   standards relevantes y leer únicamente esos paths;
6. invocar `ensure-artifact(<clave>)` cuando el artefacto requerido esté
   pendiente/candidate/stale.

Después decidir:

- `full`: feature, 2+ capas o cambio de contrato de dominio;
- `lite`: cambio trivial e interno, sin cambio observable de contrato.

Para `full`, producir y aprobar en orden:

1. `brief.md` inmutable;
2. `specs/requirements.md`;
3. `specs/design.md`;
4. `specs/deltas/<dominio>.md`, uno por dominio.

Para `lite`, usar `task.yml` + resumen en `progress.md` + test de regresión;
sin `brief.md`, `specs/` ni delta. Promover inmediatamente a `full` si aparece
un cambio de contrato.

Si cambia la dirección de un `full`, agregar `origin-<slug>.md` append-only
junto a `brief.md`; jamás reescribir el brief original. Requirements, design,
deltas y tasks incorporan el origen nuevo mediante revisión explícita.

Si hay impacto visual, presentar propuesta consistente con el design system y
obtener aprobación explícita **antes de cualquier código UI**.

**Gates S1/S2**: requirements aprobados; design y deltas aprobados; UI aprobada
cuando corresponda.

### 3. Breakdown

Cargar `BREAKDOWN.md`.

- Evaluar INVEST y complejidad con evidencia del shape.
- Elegir no-split, split vertical, por funcionalidad, Spike→implementación o
  Expand/Migrate/Contract.
- Mantener jerarquía efectiva Epic → Feature → Story/Bug → Task, degradándola
  solo de forma explícita según capacidades reales del tracker.
- Crear una DAG sin ciclos; padres antes que hijos y prerequisitos antes que
  dependientes.
- Escribir `specs/tasks.md` para schema `full`.

Cada task registra obligatoriamente:

`id`, `requirement(s)`, `agent/discipline`, `depends_on`, `scope_paths`,
`done_when`, `test_scope`, `doc_impact` y `status`.

**Gate B1**: toda requirement tiene cobertura, toda task es ejecutable por una
disciplina, los paths son observed/proposed y no existen ciclos.

### 4. Persist + Handoff

Cargar `PERSIST-AND-HANDOFF.md`.

Antes del ticket, ejecutar el validador local sobre los artefactos cuando esté
disponible. Corregir errores; si no puede correr, registrar la limitación y
hacer el gate manual equivalente.

Luego delegar exclusivamente a `agteamos-work-items`:

1. `inspect-repo`;
2. `inspect-tracker`;
3. `draft`;
4. aprobación explícita del change set exacto;
5. `apply`;
6. read-back de campos, jerarquía y relaciones.

No considerar creado un item sin read-back `verified`. Tras recibir el ID real:

- actualizar `task.yml` y `ticket_url`;
- renombrar obligatoriamente `tmp-<slug>` a `<id>-<slug>`;
- actualizar referencias mutables, nunca `brief.md`;
- continuar con `agteamos-implement` según `handoff_mode`.

**Gate P1**: validación local aceptable, change set aprobado, escritura
verificada y carpeta con ID definitivo.

## INVARIANTES

- Clarificación por frontera, no cuestionario fijo.
- Los desgloses existentes se auditan read-only antes de normalizarlos.
- Averiguar hechos es trabajo del agente.
- Premortem únicamente opt-in.
- `brief.md` y `origin-*.md` son historia append-only.
- `full` conserva requirements → design → deltas → tasks.
- `lite` no altera el contrato ni crea specs.
- Ningún código UI precede la aprobación visual.
- INVEST y DAG acíclica preceden al draft externo.
- `agteamos-work-items` es la única puerta al tracker.
- El ticket se valida localmente antes de persistir y se relee después.
- Los módulos se cargan uno por vez.

## ANTI-PATTERNS

- Preguntar algo observable en el repo.
- Especificar desde una plantilla antes de revisar código real.
- Cargar todos los standards o todos los módulos “por si acaso”.
- Reescribir el brief cuando cambia la dirección.
- Crear tasks sin requirements, scope, prueba o criterio de término.
- Ocultar dependencias, degradaciones de jerarquía o ciclos.
- Persistir un draft no validado o modificado después de la aprobación.
- Crear/vincular tickets fuera de `agteamos-work-items`.
- Empezar implementación antes de los gates aplicables.

## PRÓXIMO PASO

Tras read-back y rename verificados: `agteamos-implement`.
