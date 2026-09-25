# INTAKE AND DEFINITION OF READY

Carga este módulo solo cuando el dispatcher está en `INTAKE` o `DOR`.
Al terminar, vuelve a `SKILL.md`; no cargues el módulo siguiente por
anticipado.

## Entrada y salida

- Entrada: URL/ID de issue, PR o work item; `agteamos/platform.yml`; contexto
  local mínimo.
- Salida: snapshot del ticket, resultado `READY`/`NOT_READY`, decisión de
  breakdown y siguiente estado.
- Toda lectura o mutación del tracker pasa por `agteamos-work-items`. Las
  lecturas son libres. Cada escritura exige change set exacto, aprobación y
  read-back.

## 1. Leer o retomar

Si existe una carpeta de cambio, lee primero `task.yml` y únicamente `Next
Action` de `progress.md`; aplica Tier 1 según `agteamos-context`. Luego:

1. Compara `git config user.name`/`user.email` con `owner`.
2. Si cambió la persona, conserva `owner` y añade un `handoffs` con nombre,
   email y fecha. Si nombre y email faltan o son genéricos, pregunta una sola
   vez en la sesión.
3. Lee el ticket completo mediante `agteamos-work-items inspect-tracker`.
4. Si la entrada es un PR, lee también descripción y diff para determinar
   qué falta; el tracker y el `repo_host` siguen siendo puertos distintos.

Registra: título, descripción, ACs, tipo/labels, prioridad, responsables,
milestone/sprint, dependencias y bloqueos. Separa hechos observados de
inferencias.

## 2. Gate DoR

Un ticket queda `READY` solo si cumple **todos los criterios obligatorios** y
al menos 5 de 7 en total:

| # | Criterio | Gate |
|---|---|---|
| 1 | Descripción clara y no ambigua | obligatorio |
| 2 | Al menos 2 ACs verificables, preferentemente Given/When/Then | obligatorio |
| 3 | Tipo: feature, bug, hotfix, refactor, spike o tech debt | obligatorio |
| 4 | Prioridad asignada | deseable |
| 5 | Estimable como S/M/L/XL o equivalente | deseable |
| 6 | Sin dependencia bloqueante abierta | obligatorio |
| 7 | Forma concreta de verificar el resultado | obligatorio |

Muestra antes de continuar una tabla breve con criterio, evidencia y
`PASS`/`FAIL`. No infieras ACs como si ya estuvieran aprobados.

### NOT_READY

Detén el flujo. Activa `agteamos-task` para aclarar alcance, tipo, ACs o
verificación. Puedes proponer texto, pero cualquier edición del ticket:

1. se redacta como change set de `agteamos-work-items`;
2. muestra antes/después, target, efectos y fingerprint;
3. pregunta si se aprueba exactamente el lote;
4. aplica solo lo aprobado y relee el recurso.

No crees branch ni empieces diseño/código hasta que el ticket vuelva a pasar
DoR.

### READY

Registra el resultado y continúa con breakdown.

## 3. Breakdown INVEST

Evalúa independencia, negociabilidad, valor, estimabilidad, tamaño y
testabilidad. Divide o crea un spike cuando ocurra cualquiera:

- 3 o más capas arquitectónicas con entregables separables;
- más de 5 ACs que forman capacidades independientes;
- estimación XL;
- investigación técnica imprescindible antes de comprometer solución;
- migración masiva que puede partirse en lotes verificables.

Cada subtarea debe tener ACs propios, scope no solapado, dependencias, owner
de agente y branch `feature/<parent-id>/<sub-id>-<slug>` (o prefijo acorde al
tipo). Crear/vincular subtareas es una mutación externa: usa un único change
set aprobado y verifica hijos y relaciones por lectura.

Si no se divide, documenta la razón INVEST. No partas una tarea pequeña solo
por tocar frontend y backend.

## Condición de salida

- `NOT_READY` → permanece en `DOR`, con preguntas concretas.
- `READY` sin tracking/branch → `TRACKING`.
- `READY` con tracking y branch existentes → deriva el estado desde
  `task.yml`/`progress.md` y vuelve al dispatcher.
