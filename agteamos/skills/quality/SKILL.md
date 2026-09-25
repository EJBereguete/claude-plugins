---
name: agteamos-quality
description: >
  Dispatcher de calidad para PR-review, domain-review continuo,
  static-analysis y auditoria integral. Carga solo el modulo solicitado,
  aplica evidencia fresca, ratchet y ledgers independientes DR/AU.
used_by:
  - qa-engineer
  - architect
  - security-engineer
  - devops-engineer
  - product-manager
---

# SKILL: Quality (agteamos-quality)

## CONTRACT

- **Input**: PR/diff/paths, modulo modificado, pipeline/CI o repositorio,
  segun el modo.
- **Output**: review con decision, domain review, resultado de gates o audit
  integral. El contrato exacto vive en el modulo del modo.
- **Owners**: `@qa-engineer` (PR y testing), `@architect` (dominio y
  arquitectura), `@security-engineer` (seguridad y scanners),
  `@devops-engineer` (CI/observabilidad) y `@product-manager` (priorizacion).
- **Read-only por defecto**: revisar no autoriza a editar codigo, crear work
  items, publicar comentarios ni cambiar el estado formal de un PR. Ejecutar
  esas acciones solo cuando el pedido o una aprobacion explicita las cubra.

## Dispatcher

Clasificar primero; despues leer **un solo modulo de modo**:

| Disparador | Modo | Modulo bajo demanda | Resultado |
|---|---|---|---|
| PR, diff, archivo o directorio puntual | `pr-review` | `modules/PR-REVIEW.md` | Hallazgos + `APPROVE`, `REQUEST_CHANGES` o `COMMENT` |
| Modulo/archivos relacionados; subpaso de mantenibilidad | `domain-review` | `modules/DOMAIN-REVIEW.md` | Smells D1-D10 + ratchet + ledger DR |
| Configurar/correr lint, tipos, seguridad o gates | `static-analysis` | `modules/STATIC-ANALYSIS.md` | Gates reproducibles por stack |
| Salud global periodica o a demanda | `audit` | `modules/AUDIT.md` | Radar, score y mitigacion P0/P1/P2 |

No precargar los cuatro modulos. `modules/REPORT-TEMPLATES.md` se lee solo al
momento de redactar el reporte. `smells.md` se lee solo si se activa
`domain-review`. Si un PR activa domain-review, cargar ese modulo en ese
momento, no antes.

Si el pedido es ambiguo:

- hay un PR/diff concreto -> `pr-review`;
- se pide calidad estructural de un modulo -> `domain-review`;
- se habla de CI/pre-commit/analyzers -> `static-analysis`;
- se pregunta por el proyecto completo -> `audit`.

## Protocolo comun de contexto

Antes de evaluar conformidad:

1. Ejecutar `agteamos-knowledge --inject` para el scope actual.
2. Leer el indice del proyecto `agteamos/standards/index.yml` y
   `agteamos/standards/index.meta.yml` si existen.
3. Resolver temas por keywords/globs del cambio; no hardcodear nombres de
   temas. Un `README.md` del tema y su `deviations.md` son contexto del
   proyecto, no evidencia de que el codigo cumple.
4. Si el tema relevante esta `pending`, `candidate` o `stale`, invocar
   `ensure-artifact(standards.<tema>)` para **un tema como maximo en ese
   step**. Releer inyeccion e indice antes de continuar. Encolar los demas
   para steps posteriores; nunca materializar varios "ya que estamos".
5. Si no hay indice, registrar `standards: UNKNOWN (project index missing)`;
   no convertir la ausencia en PASS ni bloquear solo por esa ausencia.

La regla del proyecto prevalece sobre ejemplos genericos. Una desviacion ya
aprobada y documentada no es un hallazgo nuevo; una desviacion no documentada
se reporta con evidencia y severidad proporcional.

## Protocolo comun de evidencia

Cada finding y cada conclusion se etiqueta:

- **`observed`**: visto directamente en codigo, diff, configuracion o salida
  de herramienta de esta corrida; citar `archivo:linea` o comando + resultado.
- **`computed`**: derivado de evidencia fresca (ratchet, cobertura, score,
  complejidad, estado `NEW/SEEN/RESOLVED`); declarar formula/input.
- **`proposed`**: hipotesis, riesgo no reproducido o recomendacion. No puede
  por si sola bloquear, cerrar un finding ni sostener un PASS.

Solo evidencia **fresca de esta corrida** permite `PASS`: inspeccion actual o
comando relevante ejecutado con exito sobre el scope declarado. Un audit
anterior, cache, ledger, comentario, ausencia de error visible o comando no
ejecutado produce `UNKNOWN`/`NOT RUN`, nunca PASS. El ledger prueba historia,
no correccion actual.

Antes de publicar un Bloqueante o Importante, registrar
`Contraargumento considerado`: buscar sanitizacion upstream, gates,
supresiones justificadas, decisiones o desviaciones documentadas. Si no se
puede refutar ni confirmar, degradar a `proposed` y pedir verificacion.

## Severidad y ratchet

- **Bloqueante / Critical**: riesgo demostrable de seguridad, correccion,
  datos, contrato o gate obligatorio; debe corregirse antes del merge.
- **Importante / High-Major**: impacto real de mantenibilidad, rendimiento,
  tests o DevEx; corregir en el PR/sprint o aprobar un follow-up verificable.
- **Sugerencia / Medium-Low**: mejora opcional sin riesgo inmediato.
- **Positivo**: practica observada que conviene preservar.

En reviews de cambio, un hallazgo solo bloquea si el diff lo introduce o
extiende. Lo preexistente se conserva como follow-up, aunque su severidad
intrinseca sea alta. Calcular el scope con:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/lib/findings-ledger.js" scope .
```

Usar margen de +/-2 lineas. Si `base` es `null`, todo queda preexistente y se
declara la limitacion; no inventar bloqueantes.

## Ledgers: aislamiento obligatorio

| Modo | `scope` | `reconcile` | Prefijo | Cache |
|---|---|---|---|---|
| PR-review | Si | No | — | — |
| domain-review | Si | Si | `DR` | `agteamos/.cache/findings/domain-review.json` |
| static-analysis | No | No | — | — |
| audit | No | Si | `AU` | `agteamos/.cache/findings/audit.json` |

Nunca compartir ni fusionar DR y AU. `NEW`, `SEEN xN` y `RESOLVED` describen
persistencia; no sustituyen ratchet ni evidencia fresca.

## Decisiones y approvals

- `REQUEST_CHANGES`: existe al menos un Bloqueante `observed`/`computed`
  introducido o extendido por el cambio.
- `APPROVE`: cero bloqueantes introducidos, Importantes corregidos o con
  follow-up aprobado y verificado mediante `agteamos-work-items`, y checks
  relevantes frescos en PASS. Si checks necesarios no corrieron, usar
  `COMMENT`, no aprobar por inferencia.
- `COMMENT`: draft, revision informativa, evidencia incompleta o sin decision.

`comment-pr` agrega un comentario; no equivale a approval formal ni a request
changes formal. Usar operaciones `approve-pr`/`request-changes-pr` del adapter
de `repo_host` si existen. Si no existen, publicar el comentario autorizado y
dejar explicito que el estado formal no cambio. Los work items y excepciones
requieren aprobacion verificable; no autoaprobar deuda.

## Escala y revision independiente

Un review usa un revisor por defecto. Para cambios `L`/`XL` (por metadata de
tarea o, como señal, >400 lineas o >8 archivos), puede **recomendar** un
revisor independiente, especialmente para auth, datos, pagos o arquitectura.
La recomendacion no lo lanza ni duplica findings automaticamente.

Para cambios `schema: lite` o diffs pequenos, no multiplicar agentes ni
tracks: review secuencial unico. El costo de coordinacion reduce la señal y
no reemplaza una inspeccion completa.

## Herramientas y limites

- Scope/contexto: Read, Grep, Glob, diff y call graph; nunca revisar solo el
  diff sin leer archivos completos relevantes.
- PR: adapter `repo_host` (`get-pr`, diff/files si estan soportados,
  `comment-pr`, approvals formales si existen).
- Seguridad: `${CLAUDE_PLUGIN_ROOT}/scripts/security-scanner.mjs` mas scanners
  del stack; regex es piso, no techo.
- Estado: `findings-ledger.js`; DR/AU permanecen separados.
- Seguimiento: `agteamos-work-items`; no crear items sin autorizacion.
- Auditoria: `agteamos-router`, `agteamos-security`, `agteamos-metrics` cuando
  el modulo lo indique.

Si una operacion no esta cubierta por el adapter, declararlo; no simular que
se ejecuto. El proximo paso sale del modulo activo.
