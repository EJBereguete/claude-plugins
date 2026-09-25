# Domain Review Continuo

Leer este modulo solo para `domain-review`, standalone o activado desde
PR-review. Hereda evidencia, severidades y ratchet de `../SKILL.md`.

## Contrato

- **Input**: archivo(s) o modulo(s) modificados.
- **Output**: findings D1-D10 con severidad, estado de ratchet y estado de
  ledger `NEW` / `SEEN xN` / `RESOLVED`.
- **Owner**: `@architect`; `@qa-engineer` puede invocarlo durante PR-review.
- **Scope**: archivos tocados + profundidad 1 de imports/importers, cap
  aproximado de 15 archivos.
- **Read-only**: no modifica codigo, no abre PRs y no crea work items.

Este modo detecta degradacion de conceptos y boundaries entre archivos. No
reemplaza PR-review ni el audit integral.

## Paso 1 — Contexto bajo demanda

1. Ejecutar `agteamos-knowledge --inject` para los paths actuales.
2. Leer `agteamos/standards/index.yml` e `index.meta.yml`.
3. Resolver por keywords/globs el tema aplicable; no asumir su nombre.
4. Si esta `pending`, `candidate` o `stale`, ejecutar
   `ensure-artifact(standards.<tema>)` para un tema como maximo en este step.
5. Releer inyeccion/indice y cargar solo el README/deviations resuelto.
6. Leer `../smells.md` ahora, no desde el dispatcher.

El contexto del proyecto ayuda a interpretar el diseño; no demuestra PASS.

## Paso 2 — Calcular scope

1. Identificar archivos cambiados desde el input o PR.
2. Expandir una capa:
   - imports/usings de los archivos tocados;
   - importers/callers que consumen su modulo, clase o contrato.
3. Capar en ~15 archivos. Priorizar imports directos, despues importers con
   mayor acoplamiento al cambio.
4. Declarar incluidos y excluidos por el cap.
5. Leer completos los incluidos relevantes.

No ampliar al repo entero. Para eso existe `audit`.

## Paso 3 — Evaluar D1-D10

Aplicar la taxonomia exacta de `../smells.md`:

- D1 Scattered Concept
- D2 Missing System Metaphor
- D3 Parallel Hierarchies
- D4 Second Way of Doing X
- D5 Leaky Boundary
- D6 God Module/Class
- D7 Special-Case Undercut
- D8 Anaemic Hot Path
- D9 Dead Layer
- D10 Drifted Copies

No aplicar cada smell a cada linea mecanicamente. D1-D5, D7, D8 y D10 suelen
requerir patron entre archivos; D6/D9 pueden observarse en uno. Una primera
coincidencia ambigua es `proposed`, no finding bloqueante.

Por finding, registrar:

- archivos/lineas y scope donde se busco;
- clasificacion `observed` / `computed` / `proposed`;
- smell Dn y severidad;
- impacto sobre el modelo o boundary;
- contraargumento considerado;
- remediacion minima coherente.

## Paso 4 — Ratchet

Ejecutar:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/lib/findings-ledger.js" scope .
```

- Linea cambiada (+/-2) -> introducido/extendido; puede ser Bloqueante o
  Importante segun severidad.
- Fuera del cambio -> follow-up preexistente, nunca bloqueante del merge.
- Si hay copias nuevas y viejas del mismo concepto, bloquear solo la copia
  introducida y consolidar las antiguas en un follow-up.
- `base: null` -> todo follow-up; registrar limitacion y pedir revision
  manual si el riesgo lo exige.

El ratchet es `computed` a partir de diff fresco. No inferirlo del ledger.

## Paso 5 — Ledger DR

Serializar los findings actuales a `findings.json` y ejecutar:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/lib/findings-ledger.js" \
  reconcile DR findings.json agteamos/.cache/findings/domain-review.json
```

Contrato:

- IDs `DR-<hash>`;
- `NEW`: aparece por primera vez;
- `SEEN xN`: sigue presente;
- `RESOLVED`: estaba en la corrida anterior y no aparece ahora;
- cache exclusivo `agteamos/.cache/findings/domain-review.json`.

No leer/escribir el cache AU. El ledger es memoria, no PASS ni criterio de
bloqueo. Un `RESOLVED` solo se puede reportar como confirmado si la inspeccion
fresca ya no encuentra el patron en el mismo scope; de lo contrario queda
`computed/needs verification`.

Si la misma regla llega a `SEEN x3` en tareas/PRs distintos, ofrecer una sola
vez promoverla al conocimiento del proyecto. No promover ni generar artefactos
sin aprobacion.

## Paso 6 — Reporte

Leer `REPORT-TEMPLATES.md` solo ahora. El reporte incluye:

- reviewer y scope incluido/excluido;
- Bloqueantes introducidos;
- Importantes y Sugerencias;
- Follow-ups preexistentes;
- Resueltos desde la ultima corrida;
- estado DR y tipo de evidencia por finding;
- checks/areas `UNKNOWN` o `NOT RUN`.

Cuando domain-review es subpaso de PR-review, conservar IDs `DR-*` al
insertarlos en mantenibilidad. No renumerarlos como si fueran findings nuevos.

## Anti-patrones

- Usar el ledger para decidir ratchet.
- Marcar deuda preexistente como bloqueante.
- Reportar D1/D10 sin mostrar las copias.
- Declarar D2 por una unica firma parecida.
- Expandir scope sin cap.
- Omitir archivos excluidos.
- Declarar PASS porque el cache no contiene findings.
- Materializar varios temas pendientes en el mismo step.

## Proximo paso

Volver a la skill que activo el modo. Standalone, entregar el reporte y esperar
aprobacion antes de crear cualquier follow-up.
