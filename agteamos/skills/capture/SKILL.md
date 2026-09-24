---
name: agteamos-capture
description: >
  Reemplaza a agteamos-backlog y agteamos-project-backlog (fusionadas). Captura
  de baja friccion en dos modos: "Modo plugin" (ideas de mejora del propio
  AgTeamOS, en BACKLOG.md del repo del plugin) y "Modo proyecto" (pedidos de
  producto para un proyecto especifico del usuario, resueltos contra el
  registro global, con backlog local en agteamos/product/roadmap.md y ticket
  opcional en el tracker configurado). El usuario dice "idea: X" o similar en
  cualquier momento, sin interrumpir el trabajo en curso.
used_by:
  - architect
  - product-manager
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - devops-engineer
  - security-engineer
  - ui-ux-designer
---

# Skill: Capture (agteamos-capture)

## CONTRACT

- **Input (modo plugin — captura)**: una frase del usuario tipo "idea: X", "se me ocurrió que...", "anotá esto para AgTeamOS" — en cualquier proyecto, en cualquier momento, sin importar qué skill/agente esté activo
- **Input (modo plugin — revisión)**: pedido explícito tipo "mostrame el backlog de AgTeamOS", "revisemos las ideas pendientes"
- **Input (modo proyecto)**: una frase que combina un proyecto (nombre/alias) + una descripcion de feature/tarea, dicha desde cualquier sesion — ej. "agrega X al backlog de Y", "anota esto para el proyecto Y: X", o una sola oracion donde el proyecto y el pedido aparecen juntos (ej. "quiero agregar una pagina para ver los KAM en el proyecto de notification center en Phoenix Portal de ailab")
- **Output (modo plugin)**: una fila nueva (o actualizada) en `${CLAUDE_PLUGIN_ROOT}/BACKLOG.md`, sección "Ideas abiertas"
- **Output (modo proyecto)**: una fila nueva en `agteamos/product/roadmap.md` (seccion "Backlog") del proyecto resuelto, y — si `platform.yml.tracker` esta configurado — un ticket creado en ese tracker (GitHub Issues, Azure Boards o Microsoft Planner, via el adapter de `agteamos-setup`)
- **Regla de oro (ambos modos)**: el modo captura **nunca interrumpe el flujo** — se agrega la fila y se continúa inmediatamente con lo que se estaba haciendo. No es un formulario, es una anotación al vuelo.

### Criterio de enrutamiento — a cuál modo va cada captura

Este es el criterio de ruteo obligatorio entre los dos modos, preservado de
la advertencia cruzada que ya existía en ambas skills originales:

- **Modo plugin** — la idea es sobre **AgTeamOS como sistema**: el plugin, sus
  skills, sus agentes, su workflow, sus templates. Ej. "idea: que el dashboard
  filtre por prioridad", "se me ocurrió agregar un check de X al review".
- **Modo proyecto** — el pedido es sobre **un producto/proyecto concreto del
  usuario**: una feature, pagina, endpoint o cambio en el codigo/producto que
  se está construyendo con AgTeamOS, no en AgTeamOS mismo. Ej. "quiero agregar
  una pagina para ver los KAM en notification center".
- **Si hay ambigüedad**, una sola pregunta corta y nada más: "¿es una idea
  para AgTeamOS el plugin, o para el roadmap de este proyecto?" — solo cuando
  de verdad no se puede inferir del contexto.
- **Nunca cruzar los backlogs**: una idea sobre el producto del usuario NUNCA
  va a `BACKLOG.md` del plugin, y una idea sobre AgTeamOS mismo NUNCA va a
  `agteamos/product/roadmap.md` de un proyecto. Son dos namespaces con dueños
  distintos.

---

## Modo plugin

Captura ideas de mejora del propio AgTeamOS (el plugin, no el proyecto donde
se usa) con friccion casi cero — el usuario dice "idea: X" en cualquier
momento y se agrega una fila a BACKLOG.md del repo del plugin, sin
interrumpir el trabajo en curso. Tambien ofrece un modo revision para
priorizar, descartar o marcar ideas como planeadas.

### ADVERTENCIA DE DISEÑO — leer antes de escribir nada

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

### PROCESS — Modo plugin

#### Modo captura (default — baja fricción, no interrumpe)

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
  la propone `agteamos-plugin-improvement`, sección "Auditoría del propio
  AgTeamOS")
- `Prioridad`: `alta` \| `media` \| `baja` — si el usuario no especifica, usar
  `media` por default, nunca preguntar en modo captura (rompería la baja
  fricción — se puede ajustar después en modo revisión)
- `Estado`: siempre `idea` al crearla. Pasa a `planeada` en modo revisión, o
  se remueve de "Ideas abiertas" y se agrega a "Implementadas" vía el flujo
  H.4 (ver `agteamos-plugin-improvement`)

**Step 4 — Confirmar en una línea y continuar**

```
Anotado en el backlog de AgTeamOS (#5). Segui con lo que estabas haciendo.
```

No agregar preguntas de seguimiento, no pedir más detalle salvo que la idea
sea tan ambigua que ni siquiera se pueda redactar una fila legible (caso raro
— preferir capturar algo imperfecto a no capturar nada).

#### Modo revisión (a demanda explícita)

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
  actuar pronto, sin todavía ejecutar `agteamos-plugin-improvement`)

**Step 3 — Si se decide actuar ahora sobre una idea**

Ejecutar `agteamos-plugin-improvement` (sección "Ejecución de la mejora")
apuntando al archivo/skill/agente afectado. Al terminar, mover la fila de
"Ideas abiertas" a "Implementadas" con la fecha de resolución y un resumen
breve de qué cambió — este paso final lo cubre `agteamos-plugin-improvement`,
no requiere volver a este modo salvo para hacer el movimiento de fila si
ninguna otra skill lo hizo.

### ANTI-PATTERNS — Modo plugin

- Interrumpir el flujo actual con preguntas antes de capturar la idea — el modo captura existe exactamente para evitar esa fricción; capturar primero, refinar después en modo revisión.
- Escribir en `${CLAUDE_PLUGIN_ROOT}/BACKLOG.md` sin intentar la detección de "copia cacheada vs repo fuente" — el usuario puede perder la idea sin enterarse.
- Preguntar prioridad en modo captura — usar `media` por default y dejar que el usuario la ajuste en modo revisión si le importa.
- Confundir el backlog de AgTeamOS (este) con `agteamos/product/roadmap.md` del proyecto consumidor — son dos backlogs distintos con dueños distintos; una idea sobre el producto del usuario NO va acá.
- Mover una fila a "Implementadas" sin que `agteamos-plugin-improvement` realmente haya aplicado el cambio — "Implementadas" es un registro de qué se ejecutó, no de qué se planeó.
- Agregar filas de ejemplo a la tabla "Ideas abiertas" para "mostrar el formato" — el backlog real empieza vacío; cualquier fila ahí debe ser una idea real capturada.

---

## Modo proyecto

Captura de baja friccion de un pedido de producto para un proyecto
especifico, dicha desde cualquier sesion (ej. "quiero agregar una pagina para
ver los KAM en el proyecto de notification center"). Resuelve el proyecto
contra el registro global (reutiliza agteamos-router), agrega una
fila al backlog local de ESE proyecto (agteamos/product/roadmap.md) y, si
tiene tracker configurado en platform.yml, crea el ticket ahi tambien
(GitHub, Azure Boards o Planner). Distinto del Modo plugin de arriba, que es
el backlog del propio plugin AgTeamOS, no el del proyecto del usuario.
Distinto de agteamos-new-task, que interroga con ACs/ROI/story points — esto
es solo anotar para despues.

### CUANDO NO ES ESTE MODO

- Solo "vamos a trabajar en X" sin ningun pedido de producto adjunto →
  `agteamos-router` puro, no este modo.
- El mensaje referencia un ticket/issue existente (URL, `#42`, `AB#1234`) →
  Flujo 3 (`agteamos-implement`), no este modo.
- El usuario quiere arrancar a implementar YA (no solo anotar para despues)
  → Flujo 2 completo (`agteamos-new-task`), que si interroga ACs/ROI/story
  points. Si hay duda sobre cual de las dos quiere el usuario, preguntar en
  una sola frase: "¿lo anoto en el backlog para despues, o arrancamos ahora
  con el flujo completo?" — y proceder segun la respuesta.
- Es una idea sobre AgTeamOS (el plugin) mismo, no sobre el producto de un
  proyecto → Modo plugin (arriba), nunca este modo.

### PROCESS — Modo proyecto

#### Step 1 — Resolver el proyecto

Reutiliza el Step 1 y Step 3 de `agteamos-router`: leer
`~/.claude/agteamos/projects.yml`, matchear el nombre/alias mencionado
(exacto → case-insensitive → substring).

```
Un match unico     → Step 2
Varios matches     → preguntar cual (mostrar path de cada uno)
Ningun match       → aplicar el Step 5 de agteamos-router (ofrecer
                      crear el proyecto) antes de continuar — no tiene
                      sentido un backlog item sin proyecto destino
```

#### Step 2 — Posicionar la sesion ahi

Si la sesion no esta ya en ese `path`: `mcp__ccd_directory__change_directory`
al path resuelto (mismo mecanismo que `agteamos-router`).

#### Step 3 — Agregar la fila al backlog local

Leer `agteamos/product/roadmap.md`. Si no tiene una seccion "## Backlog",
crearla (puede pasar en un proyecto recien onboardeado). Tomar el proximo
numero consecutivo y agregar una fila:

```markdown
| # | Fecha | Idea | Origen | Prioridad | Estado |
|---|---|---|---|---|---|
| 7 | 2026-09-23 | Pagina para ver los KAM | usuario | media | pendiente |
```

- `Origen`: siempre `usuario` en modo captura
- `Prioridad`: `media` por default — **nunca preguntar** en modo captura
- `Estado`: `pendiente` al crearla. Pasa a `en-ticket` si el Step 4 crea un
  ticket exitosamente, o a `implementada`/`descartada` mas adelante por
  fuera de esta skill

#### Step 4 — Persistir en el tracker, si el proyecto tiene uno configurado

Leer `agteamos/platform.yml` → campo `tracker`.

```
tracker == null →
  Avisar en una linea: "Guardado en el backlog local de <proyecto>
  (agteamos/product/roadmap.md). Este proyecto no tiene tracker
  configurado todavia — corre agteamos-setup ahi si tambien queres que se
  cree como ticket."
  No bloquear, no insistir mas.

tracker != null →
  Resolver la operacion abstracta [operacion: create-ticket] contra
  agteamos/tracker/<tracker>.md (generado por agteamos-setup Step 3.6).
  - Titulo: resumen corto del pedido (la misma frase usada en la fila del
    backlog)
  - Cuerpo: la descripcion completa tal cual la dio el usuario
  - Para Azure DevOps, create-ticket ya es alias de create-story (Product
    Backlog Item o User Story segun tracker_azure_devops.process_template)
    — no hay que elegir tipo de work item aca, el adapter ya lo resuelve
  - Sin pedir Acceptance Criteria, story points/effort ni estimacion —
    esos campos quedan null/vacios en el ticket creado; se completan
    despues si el item se convierte en tarea real via agteamos-new-task
  - Actualizar la fila del backlog local con el ID/link del ticket creado
    y Estado=en-ticket
```

#### Step 5 — Confirmar y continuar

Una sola linea de confirmacion (con el link/ID del ticket si se creo uno) y
seguir con lo que se estaba haciendo — no agregar preguntas de seguimiento.

```
"Anotado en el backlog de <proyecto> (#7) y creado como issue #128 en
GitHub. Segui con lo que estabas haciendo."
```

### EXAMPLE — Modo proyecto

```
Usuario (desde cualquier sesion): "quiero agregar una pagina para ver los
KAM en el proyecto de notification center en Phoenix Portal de ailab"

→ Step 1: resuelve "notification center" contra el registro → match en
  Phoenix Portal / ailab, path conocido
→ Step 2: change_directory ahi
→ Step 3: agrega fila #12 "Pagina para ver los KAM" a
  agteamos/product/roadmap.md, Prioridad=media, Estado=pendiente
→ Step 4: platform.yml.tracker == azure_devops → crea Product Backlog Item
  "Pagina para ver los KAM" via az boards work-item create, sin pedir
  Acceptance Criteria ni Effort
→ Step 5: "Anotado en el backlog de notification-center (#12) y creado
  como PBI #4531 en Azure Boards. Segui con lo que estabas haciendo."
```

### CHECKLIST — Modo proyecto

- [ ] Se resolvio el proyecto contra el registro antes de escribir nada
- [ ] Se agrego la fila al backlog LOCAL del proyecto resuelto, nunca al `BACKLOG.md` del plugin AgTeamOS
- [ ] No se pregunto prioridad, ACs ni estimacion en modo captura
- [ ] Se leyo `platform.yml.tracker` antes de intentar crear un ticket
- [ ] Si `tracker` es null, se aviso explicitamente sin bloquear ni inventar un tracker
- [ ] Si se creo un ticket, se uso la operacion abstracta `create-ticket` contra el adapter — nunca un comando `gh`/`az` hardcodeado en esta skill
- [ ] No se disparo `agteamos-new-task` ni `agteamos-new-task`
- [ ] Se confirmo en una sola linea y se continuo, sin preguntas de seguimiento

### ANTI-PATTERNS — Modo proyecto

- Preguntar prioridad, ACs o estimacion en modo captura — rompe la baja friccion que es la razon de ser de esta skill.
- Confundir esto con el backlog del propio plugin AgTeamOS (Modo plugin arriba / `BACKLOG.md`) — son namespaces distintos, un pedido de producto del usuario nunca va ahi.
- Disparar `agteamos-new-task` desde este modo — son de `agteamos-new-task`, un flujo mas pesado que el usuario no pidio en modo captura.
- Hardcodear comandos `gh`/`az` en vez de resolver `create-ticket` contra `agteamos/tracker/<tracker>.md` — rompe la abstraccion que ya mantienen las otras skills consumidoras.
- Crear Epics/Features o hacer `link-parent-child` — este modo solo crea el ticket de nivel backlog; jerarquia completa es trabajo de `agteamos-new-task` sobre el ticket ya creado.
