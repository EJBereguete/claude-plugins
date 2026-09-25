# Quality Gates

Este archivo orquesta criterios existentes; no redefine sus fuentes.

## Fuentes canónicas

- Clarificación e INVEST: `agteamos-task`, Steps 1 y 7.
- Definition of Ready: `agteamos-implement`, Step 2.
- Definition of Done y verify: `agteamos-spec` +
  `agteamos-implement`, Step 9.

Si un criterio cambia, se cambia en su fuente y esta skill lo consume. No
mantener una segunda lista divergente.

## Gate de provider doctor

Antes de `apply`, evaluar
[PROVIDER-DOCTOR.md](PROVIDER-DOCTOR.md):

- [ ] Existe un resultado para el mismo proveedor y sesión.
- [ ] El diagnóstico no está `stale`.
- [ ] El estado no es `unavailable`.
- [ ] Cada operación declara sus capacidades requeridas.
- [ ] Todas las capacidades usadas están en `green_capabilities`.
- [ ] No se difirió discovery, auth o remediation para la fase de escritura.

Este gate no bloquea la creación de un `draft`: los resultados
`degraded`, `unavailable` o `not_run` se muestran como warnings y
precondiciones. Sí bloquea toda mutación hasta quedar verde para las
capacidades efectivamente usadas.

## Gate común

Antes de presentar un change set:

- [ ] Existe snapshot del repositorio y evidencia proporcional al tipo.
- [ ] Cada afirmación está clasificada como observed, proposed o pending.
- [ ] El objetivo y valor son trazables a contexto o decisión explícita.
- [ ] El tipo real existe en el proveedor.
- [ ] Los campos requeridos tienen valor válido.
- [ ] Los campos opcionales desconocidos quedan vacíos.
- [ ] No se inventaron owner, fecha, estimación, prioridad, KPI o sprint.
- [ ] Los criterios son observables y verificables.
- [ ] Parent/child respeta la jerarquía efectiva.
- [ ] No hay parent múltiple ni ciclos.
- [ ] Predecessor/successor no crea un ciclo conocido.
- [ ] Los posibles duplicados fueron resueltos.
- [ ] Las relaciones y enlaces existen en el proveedor o tienen una
      degradación explícita.
- [ ] El orden de operaciones permite verificar cada ID antes de usarlo.

## Gate por tipo

### Epic

- Resultado estratégico, no colección de tareas.
- Outcome/KPI reales o pendientes explícitos.
- Alcance y fuera de alcance distinguibles.
- Features previstas justificadas por el outcome.

### Feature

- Capacidad demostrable y vínculo con Epic.
- Requisitos funcionales/no funcionales aplicables.
- Reglas y dependencias inequívocas.
- Criterios de aceptación medibles.

### User Story

- Cumple INVEST según `agteamos-task`.
- Persona, capacidad y beneficio identificables.
- ACs cubren happy path, validación y permisos cuando aplican.
- Datos sensibles y roles tratados explícitamente.

### Task

- Parent Story/Bug existente o temporal en el mismo change set.
- Ejecutable por una persona.
- Entregable concreto.
- Archivos/componentes reales o marcados como propuestos.
- Validación ejecutable y resultado esperado.

### Bug

- Actual vs expected claramente separados.
- Reproducción o evidencia; si no existe, crear primero una Task/Spike de
  investigación, no fingir reproducibilidad.
- Impacto y frecuencia basados en datos o marcados unknown.
- AC de corrección y no regresión.

### Issue

- Es bloqueo, riesgo, dependencia o decisión; no trabajo funcional.
- Explica impacto, acción requerida y criterio de cierre.
- Owner/deadline pueden quedar pendientes si no están definidos.

## Resultado

- `PASS`: listo para preview.
- `PASS_WITH_PENDING`: preview permitido; `apply` solo si ningún pendiente
  corresponde a campo requerido.
- `FAIL`: no mostrar como listo para ejecutar; listar correcciones
  necesarias.
