---
name: agteamos-self-audit
description: >
  Distinta de agteamos-audit (esa audita el codigo/proyecto del usuario
  consumidor) — esta skill audita al propio sistema AgTeamOS. Revisa
  verify-report.md de tareas archivadas y dashboard.html/task.yml buscando
  patrones de friccion (fallas repetidas, cuellos de botella), y agrega la
  pregunta opcional de cierre en agteamos-close-task. Todo hallazgo se
  propone como fila en BACKLOG.md — nunca se escribe sin confirmacion.
used_by:
  - architect
  - project-manager
---

# Skill: Self-Audit (agteamos-self-audit)

> **No confundir con `agteamos-audit`.** `agteamos-audit` audita el
> código/arquitectura del **proyecto consumidor** (el repo donde se instaló
> AgTeamOS) — deuda técnica, seguridad, cobertura de tests, etc. Esta skill,
> `agteamos-self-audit`, audita al **propio AgTeamOS como sistema**: revisa
> cómo se está usando el framework en la práctica (`agteamos/changes/`,
> `verify-report.md`, `dashboard.html`) para detectar fricción propia del
> workflow — no del código del usuario. Ambas coexisten con responsabilidades
> completamente separadas; nunca se ejecutan una en lugar de la otra.

## CONTRACT

- **Input**: `agteamos/changes/archive/*/verify-report.md`, `agteamos/dashboard.html`, `agteamos/changes/*/task.yml` (activas y archivadas) del proyecto donde corre AgTeamOS + la pregunta opcional de cierre de `agteamos-close-task`
- **Output**: filas propuestas (nunca escritas directamente) para `BACKLOG.md` del repo del plugin, vía `agteamos-backlog` en modo captura con `Origen: auto-detectado`
- **Trigger**: a demanda directa del usuario, o automáticamente al final de `agteamos-close-task` (la pregunta de una línea)
- **Regla de oro**: ningún hallazgo —automático o de la pregunta al usuario— se escribe en `BACKLOG.md` sin confirmación explícita. Esta skill propone, nunca decide por su cuenta.

---

## PROCESS

### Step 1 — Revisar `verify-report.md` de tareas archivadas buscando patrones repetidos

Leer `verify-report.md` de cada carpeta en `agteamos/changes/archive/` (o de
las últimas N, ej. las 10-20 más recientes, si el histórico es grande).

Para cada `FAIL` o `WARNING`, extraer:
- El requirement específico (texto del `MUST`/`SHALL`/`SHOULD` incumplido)
- El dominio o paso del workflow al que pertenece (ej. "cobertura de tests",
  "spec delta sin tarea asociada", "AC sin verificar")

**Señal de fricción**: el mismo tipo de requirement falla en **2 o más tareas
distintas** con la misma razón de fondo. Un solo `FAIL` aislado no es un
patrón — puede ser un descuido puntual, no un problema del estándar o del
workflow.

```
Ejemplo de patrón detectado:
- TASK-38: WARNING — cobertura >= 80% (actual: 71%)
- TASK-41: WARNING — cobertura >= 80% (actual: 68%)
- TASK-45: WARNING — cobertura >= 80% (actual: 74%)

→ 3 tareas seguidas por debajo del umbral sugiere que el umbral de 80% es
  poco realista para este proyecto, o que falta una skill/paso que ayude a
  escribir tests antes de llegar a "verify" — candidato a BACKLOG.md.
```

### Step 2 — Revisar `dashboard.html`/`task.yml` buscando cuellos de botella

Dos señales a buscar, leyendo `task.yml` de cada tarea activa y archivada:

**a) Tareas `in_progress` mucho más tiempo del esperado**

Calcular la duración típica de tareas ya completadas (`archive/*/task.yml`:
diferencia entre `created` y la fecha de archivado) para tener una referencia
del proyecto. Marcar como señal cualquier tarea con `status: in_progress`
cuya duración (`hoy - created`) sea:
- Más del doble de la duración típica calculada arriba, o
- Si no hay suficiente histórico para calcular una típica confiable (menos de
  3 tareas archivadas), usar un umbral fijo de 14 días sin cambio de `status`.

**b) Tareas con muchos `handoffs`**

`task.yml` con 3 o más entradas en `handoffs` es señal de que la tarea pasó
por demasiadas personas — puede indicar documentación de contexto insuficiente
(el "Next Action" de `progress.md` no le alcanza a quien retoma) o una tarea
mal dimensionada que debió dividirse (`agteamos-story-breakdown`).

### Step 3 — Redactar cada hallazgo como candidato de backlog

Por cada patrón detectado en Step 1 o Step 2, redactar una descripción
concreta y accionable (no vaga):

```
MAL:  "Los tests fallan a veces"
BIEN: "3 de las últimas 5 tareas (TASK-38, 41, 45) no alcanzan 80% de
       cobertura al llegar a verify — evaluar si el umbral debería ser 70%
       para este proyecto, o agregar un checkpoint intermedio en `implement`
       antes de verify"
```

### Step 4 — Presentar candidatos y pedir confirmación

Mostrar todos los candidatos juntos, nunca escribirlos directamente:

```
Self-audit de AgTeamOS encontró 2 posibles puntos de fricción:

1. [patrón verify-report] ...
2. [patrón cuello de botella] ...

¿Agrego alguno de estos al backlog de AgTeamOS? (indicá cuáles, o "ninguno")
```

Solo los ítems que el usuario confirma explícitamente pasan al Step 5.

### Step 5 — Escribir los confirmados vía `agteamos-backlog`

Invocar `agteamos-backlog` en modo captura por cada hallazgo confirmado, con
`Origen: auto-detectado` (para distinguirlos de las ideas que el usuario
anota directamente con `Origen: usuario`).

### Step 6 — Pregunta de cierre en `agteamos-close-task`

Al final de `agteamos-close-task`, justo donde ya se sugiere el próximo paso,
se agrega esta pregunta de una línea:

```
¿Algo en este flujo te resultó torpe o mejorarías? (Enter para saltar)
```

Reglas de implementación:
- Es **opcional** — un "Enter" (respuesta vacía) **no debe romper el cierre**
  de la tarea bajo ninguna circunstancia. El cierre ya está completo antes de
  llegar a esta pregunta; esto es estrictamente posterior y no bloqueante.
- Si el usuario responde con texto, tratarlo igual que un hallazgo del Step 3:
  redactarlo como candidato claro y **volver a confirmar** antes de escribirlo
  en `BACKLOG.md` (responder la pregunta no es, por sí solo, la confirmación
  final — es la materia prima del candidato):
  ```
  Anoto esto en el backlog de AgTeamOS: "<resumen de la respuesta>" — ¿confirmás? (Enter = sí)
  ```
  Dado que ya es una pregunta de seguimiento de una sola línea con default
  "sí", esto no reintroduce fricción significativa.
- Si el usuario no responde nada (Enter), no se genera ninguna fila y el
  cierre continúa normalmente sin mencionar el tema de nuevo.

### Step 7 — De backlog a ejecución (referencia a H.4)

Cuando se decide actuar sobre una idea ya presente en `BACKLOG.md` (capturada
por esta skill o por el usuario directamente vía `agteamos-backlog`):

1. Ejecutar `agteamos-improve-skill` apuntando al archivo/skill/agente
   afectado por la idea.
2. Al terminar, mover la fila correspondiente de "Ideas abiertas" a
   "Implementadas" en `BACKLOG.md`, con la fecha de resolución y un resumen
   de qué cambió concretamente (ej. "Umbral de cobertura bajado a 70% en
   `agteamos-close-task` paso verify").

El backlog nunca se autoimplementa: la detección y la propuesta son
automáticas, pero decidir qué y cuándo ejecutar sigue siendo del usuario.

---

## ANTI-PATTERNS

- Confundir esta skill con `agteamos-audit` — si el pedido es "auditá la seguridad/arquitectura de este proyecto", esa es `agteamos-audit`, no esta.
- Tratar un único `FAIL`/`WARNING` aislado como un patrón — se requieren al menos 2 ocurrencias con la misma causa de fondo antes de proponerlo como hallazgo.
- Escribir un hallazgo en `BACKLOG.md` sin mostrarlo antes al usuario para confirmación — ni los automáticos ni los que vienen de la pregunta de cierre.
- Dejar que la pregunta de fricción de `agteamos-close-task` bloquee o rompa el cierre si el usuario solo aprieta Enter — el cierre ya debe estar completo antes de llegar a esta pregunta.
- Usar umbrales de duración/handoffs sin ajustarlos al histórico real del proyecto cuando hay suficientes tareas archivadas para calcularlo — el umbral fijo de 14 días es un fallback, no la regla por default cuando ya hay datos propios.
- Ejecutar `agteamos-improve-skill` automáticamente al detectar un patrón — esta skill solo detecta y propone; la ejecución la decide el usuario (ver Fase H.4).
