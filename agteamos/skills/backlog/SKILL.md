---
name: agteamos-backlog
description: >
  Captura ideas de mejora del propio AgTeamOS (el plugin, no el proyecto
  donde se usa) con friccion casi cero — el usuario dice "idea: X" en
  cualquier momento y se agrega una fila a BACKLOG.md del repo del plugin,
  sin interrumpir el trabajo en curso. Tambien ofrece un modo revision para
  priorizar, descartar o marcar ideas como planeadas.
used_by:
  - architect
  - product-owner
  - project-manager
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - devops-engineer
  - security-engineer
  - ui-ux-designer
---

# Skill: Backlog (agteamos-backlog)

## CONTRACT

- **Input (modo captura)**: una frase del usuario tipo "idea: X", "se me ocurrió que...", "anotá esto para AgTeamOS" — en cualquier proyecto, en cualquier momento, sin importar qué skill/agente esté activo
- **Input (modo revisión)**: pedido explícito tipo "mostrame el backlog de AgTeamOS", "revisemos las ideas pendientes"
- **Output**: una fila nueva (o actualizada) en `${CLAUDE_PLUGIN_ROOT}/BACKLOG.md`, sección "Ideas abiertas"
- **Regla de oro**: el modo captura **nunca interrumpe el flujo** — se agrega la fila y se continúa inmediatamente con lo que se estaba haciendo. No es un formulario, es una anotación al vuelo.

---

## ADVERTENCIA DE DISEÑO — leer antes de escribir nada

`${CLAUDE_PLUGIN_ROOT}` es la variable que expone Claude Code con la ruta real
del plugin **tal como está instalado en esta máquina**. Hay dos escenarios muy
distintos:

1. **El plugin corre desde el repo fuente editado a mano** (ej. un desarrollador
   trabajando directo sobre `claude-plugins/agteamos/` con git). En este caso
   `${CLAUDE_PLUGIN_ROOT}` apunta al repo real — escribir en `BACKLOG.md` ahí
   queda versionado normalmente en el próximo commit.

2. **El plugin corre desde una copia instalada vía marketplace** (`/plugin
   marketplace add` + `/plugin install`, el camino normal para la mayoría de
   los usuarios). En este caso `${CLAUDE_PLUGIN_ROOT}` apunta a una **copia
   cacheada** del plugin, no al repo git real — escribir ahí **no queda
   versionado en ningún lado** y se puede perder en la próxima actualización
   del plugin.

**Antes de escribir, intentar detectar en cuál de los dos escenarios se está:**

```bash
# ¿Hay un repositorio git real en o sobre esta ruta?
git -C "$CLAUDE_PLUGIN_ROOT" rev-parse --is-inside-work-tree 2>&1
```

- Si falla ("not a git repository") → es casi seguro una copia cacheada de
  marketplace. **Avisar al usuario explícitamente** después de escribir la fila:
  > "Guardé la idea en `BACKLOG.md`, pero esta instalación de AgTeamOS corre
  > desde una copia instalada (no desde el repo fuente) — este archivo **no
  > está versionado**. Copiá manualmente la fila nueva al `BACKLOG.md` del
  > repo fuente del plugin para no perderla en la próxima actualización."
- Si el comando funciona (es un repo git) → probablemente es el repo fuente.
  Aun así, si el `remote origin` no coincide con el repo del plugin esperado,
  o si no hay señales del repo fuente (ej. no existe
  `AGTEAMOS_REDESIGN_PLAN.md` ni `.claude-plugin/marketplace.json` en algún
  ancestro), tratar como incertidumbre y avisar de todos modos con el mismo
  mensaje, en tono de advertencia en vez de certeza ("no pude confirmar si
  esto es el repo fuente — verificá antes de asumir que quedó versionado").
- Esta detección es best-effort, no bloqueante: si falla o no es concluyente,
  **igual se escribe la fila** (mejor una idea guardada con advertencia que
  una idea perdida por no escribirla).

---

## PROCESS

### Modo captura (default — baja fricción, no interrumpe)

**Step 1 — Detectar el trigger**

Frases que activan el modo captura, en cualquier punto de la conversación,
sin importar qué skill esté corriendo:
- "idea: <texto>"
- "se me ocurrió que <texto>"
- "anotá esto para el backlog de AgTeamOS: <texto>"
- Cualquier variante equivalente donde quede claro que es una idea sobre
  **AgTeamOS como sistema**, no sobre el proyecto/código actual (si hay
  ambigüedad, una sola pregunta corta: "¿es una idea para AgTeamOS el plugin,
  o para el roadmap de este proyecto?" — y solo si de verdad no se puede
  inferir del contexto)

**Step 2 — Localizar `BACKLOG.md` y chequear el escenario de instalación**

Aplicar la detección de la sección "ADVERTENCIA DE DISEÑO" arriba.

**Step 3 — Agregar la fila**

Leer la tabla "Ideas abiertas" existente, tomar el próximo número consecutivo,
y agregar una fila con este formato exacto (igual al de la plantilla de
`BACKLOG.md`):

```markdown
| # | Fecha | Idea | Origen | Prioridad | Estado |
|---|---|---|---|---|---|
| 5 | 2026-08-09 | Agregar filtro por prioridad en dashboard.html | usuario | media | idea |
```

- `Origen`: `usuario` (modo captura manual) o `auto-detectado` (cuando la fila
  la propone `agteamos-self-audit`)
- `Prioridad`: `alta` \| `media` \| `baja` — si el usuario no especifica, usar
  `media` por default, nunca preguntar en modo captura (rompería la baja
  fricción — se puede ajustar después en modo revisión)
- `Estado`: siempre `idea` al crearla. Pasa a `planeada` en modo revisión, o
  se remueve de "Ideas abiertas" y se agrega a "Implementadas" vía el flujo
  H.4 (ver `agteamos-self-audit` y `agteamos-improve-skill`)

**Step 4 — Confirmar en una línea y continuar**

```
Anotado en el backlog de AgTeamOS (#5). Segui con lo que estabas haciendo.
```

No agregar preguntas de seguimiento, no pedir más detalle salvo que la idea
sea tan ambigua que ni siquiera se pueda redactar una fila legible (caso raro
— preferir capturar algo imperfecto a no capturar nada).

---

### Modo revisión (a demanda explícita)

**Step 1 — Listar ideas abiertas**

Mostrar la tabla completa de "Ideas abiertas" de `BACKLOG.md`, ordenada por
prioridad (`alta` → `media` → `baja`) y luego por fecha (más antigua primero
dentro de cada prioridad).

**Step 2 — Ofrecer acciones por fila**

Para cada idea, el usuario puede pedir:
- **Priorizar**: cambiar la columna `Prioridad`
- **Descartar**: eliminar la fila de "Ideas abiertas" (no se mueve a
  "Implementadas" — descartar no es lo mismo que resolver)
- **Marcar planeada**: cambiar `Estado` a `planeada` (señal de que se va a
  actuar pronto, sin todavía ejecutar `agteamos-improve-skill`)

**Step 3 — Si se decide actuar ahora sobre una idea**

Ver Fase H.4: ejecutar `agteamos-improve-skill` apuntando al
archivo/skill/agente afectado. Al terminar, mover la fila de "Ideas abiertas"
a "Implementadas" con la fecha de resolución y un resumen breve de qué
cambió — este paso final lo cubre `agteamos-improve-skill`/`agteamos-self-audit`,
no requiere volver a `agteamos-backlog` salvo para hacer el movimiento de fila
si ninguna otra skill lo hizo.

---

## ANTI-PATTERNS

- Interrumpir el flujo actual con preguntas antes de capturar la idea — el modo captura existe exactamente para evitar esa fricción; capturar primero, refinar después en modo revisión.
- Escribir en `${CLAUDE_PLUGIN_ROOT}/BACKLOG.md` sin intentar la detección de "copia cacheada vs repo fuente" — el usuario puede perder la idea sin enterarse.
- Preguntar prioridad en modo captura — usar `media` por default y dejar que el usuario la ajuste en modo revisión si le importa.
- Confundir el backlog de AgTeamOS (este) con `agteamos/product/roadmap.md` del proyecto consumidor — son dos backlogs distintos con dueños distintos; una idea sobre el producto del usuario NO va acá.
- Mover una fila a "Implementadas" sin que `agteamos-improve-skill` realmente haya aplicado el cambio — "Implementadas" es un registro de qué se ejecutó, no de qué se planeó.
- Agregar filas de ejemplo a la tabla "Ideas abiertas" para "mostrar el formato" — el backlog real empieza vacío; cualquier fila ahí debe ser una idea real capturada.
