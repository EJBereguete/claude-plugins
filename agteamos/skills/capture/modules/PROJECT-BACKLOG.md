# Modulo: Project Backlog

Cargar este modulo solo para anotar una feature/tarea en un proyecto concreto
del usuario. No usarlo para ideas sobre AgTeamOS, sus skills o sus agentes.
Este flujo anota para despues; no reemplaza `agteamos-task`.

## Entradas que no corresponden

- Solo cambiar de proyecto, sin pedido de producto -> `agteamos-router`.
- URL, `#42`, `AB#1234` u otro ticket existente -> `agteamos-implement`.
- El usuario quiere implementar ahora -> `agteamos-task`.
- La mejora es del plugin -> volver al dispatcher y cargar unicamente
  `PLUGIN-OUTBOX.md`.

Si no se puede distinguir "anotar" de "implementar ahora", hacer una sola
pregunta corta. No iniciar ambos flujos.

## 1. Resolver el proyecto

Usar el contrato de `agteamos-router` y leer
`~/.claude/agteamos/projects.yml`. Resolver el nombre/alias en orden:

1. exacto;
2. case-insensitive;
3. substring no ambiguo.

Resultado:

- un match -> conservar nombre canonico y path resuelto;
- varios -> pedir una eleccion mostrando nombre y path;
- ninguno -> ofrecer onboarding/registro antes de capturar; no existe un
  destino seguro para la fila.

No inferir el target por el cwd si contradice el registro.

## 2. Adquirir y verificar el target

Aplicar el contrato capability-aware de `agteamos-router`. Detectar primero si
el host ofrece una operacion nativa para cambiar root/workspace; no asumir un
MCP o nombre de herramienta concreto.

| Estado | Condicion | Comportamiento |
|---|---|---|
| `switched` | El host cambio de root y se verifico el target | Usar paths del nuevo root |
| `scoped-absolute` | No existe capacidad nativa, pero el host ya autorizo el target | Usar solo paths absolutos dentro del path resuelto |
| `unavailable` | Cambio fallido, target no verificable o path no autorizado | No escribir backlog ni iniciar ticket |

### `switched`

Verificar root/cwd y releer las instrucciones y el contexto aplicables del repo
destino antes de mutar.

### `scoped-absolute`

Solo es valido cuando **no existe** operacion nativa y el host ya otorgo acceso
al path resuelto. Verificar por ruta canonica que cada lectura/escritura cae
dentro de ese proyecto. Releer por paths absolutos sus instrucciones y
contexto. Esta excepcion sirve para captura de backlog, no para trabajo de
ingenieria general.

### `unavailable`

Si una operacion nativa existe pero falla, no degradar silenciosamente a
`scoped-absolute`. No actualizar `last_active`, no usar el proyecto anterior y
no tratar un `cd` manual como cambio de contexto. Indicar como abrir el path
resuelto como root/workspace o, en Claude, usar:

```text
claude --add-dir "<path-resuelto>"
```

## 3. Persistir en el backlog local

Continuar solo en `switched` o `scoped-absolute`. El destino primario es:

```text
<target-verificado>/agteamos/product/backlog.md
```

En `scoped-absolute` la ruta debe ser absoluta. Nunca usar una ruta relativa al
workspace anterior.

Este archivo no existe por bootstrap: la petición explícita actual es su
trigger. Si falta, crear `product/` al escribir y usar:

```markdown
# Project Backlog

| # | Fecha | Idea | Origen | Prioridad | Estado | Ticket |
|---|---|---|---|---|---|---|
```

Si existe, leerlo completo y preservar texto/columnas adicionales.
Antes de agregar, comparar la idea normalizada (minusculas, diacriticos y
puntuacion removidos, whitespace colapsado) con todas las filas del backlog.
Si ya existe, conservar su ID y estado; no crear un duplicado.

Para una fila nueva:

- `#`: siguiente entero luego del maximo historico; no reutilizar IDs;
- `Fecha`: fecha actual `YYYY-MM-DD`;
- `Idea`: pedido breve y autocontenido;
- `Origen`: `usuario`;
- `Prioridad`: `media` por default, sin preguntar;
- `Estado`: `pendiente`;
- `Ticket`: vacio hasta tener read-back verificado.

Preservar columnas adicionales si el proyecto ya tiene otro schema. Escribir y
releer la fila. Tras verificarla, si existe `onboarding.yml`, cambiar
`product_backlog.status` a `done`, registrar `generated_at` y cambiar
`lifecycle` a `active`. La captura local no depende de que luego exista un
ticket.

## 4. Tracker opcional mediante `agteamos-work-items`

Leer `<target-verificado>/agteamos/platform.yml` usando ruta absoluta cuando
corresponda.

### Sin tracker

Si `tracker` es null, inexistente o no esta configurado, conservar la fila
`pendiente`. Confirmar en una linea que se guardo localmente y que no hay
tracker; no bloquear ni inventar proveedor.

### Con tracker

Toda lectura y mutacion externa pasa por `agteamos-work-items`; no usar
directamente `gh`, `az`, APIs o MCPs del proveedor.

Secuencia obligatoria:

1. `inspect-repo`;
2. `inspect-tracker`;
3. buscar duplicados reales;
4. preparar `draft` del tipo minimo de backlog soportado;
5. mostrar el change set exacto;
6. pedir aprobacion explicita;
7. `apply` sin cambiar el draft aprobado;
8. releer item, campos y link mediante `verify`.

La aprobacion del change set es la unica pregunta adicional permitida. Estar en
`scoped-absolute` no la reemplaza.

No promover una nota breve a User Story READY: dejar ACs, owner, estimacion y
sprint pendientes si no fueron definidos. No crear Epics/Features ni relaciones
parent-child desde este modo.

Solo despues de read-back `verified`:

- escribir ID/link en `Ticket`;
- cambiar `Estado` a `en-ticket`;
- releer la fila local.

Si el usuario no aprueba, `apply` falla o el read-back no verifica, mantener
`pendiente` y la nota local intacta. No guardar un ID supuesto.

## 5. Confirmar y continuar

Después de verificar la captura local, regenerar las vistas derivadas en modo
best-effort:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-dashboard.mjs" --project --root "<target-verificado>"
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-dashboard.mjs" --portal
```

Un fallo de generación se informa, pero nunca revierte ni bloquea la fila del
backlog o la sincronización ya verificada.

Terminar con una sola linea, sin preguntas de refinamiento:

```text
Anotado en el backlog de notification-center (#12); no hay tracker configurado.
Anotado en el backlog de notification-center (#12) y verificado como PBI #4531 en Azure Boards.
Ya existia #12 en el backlog de notification-center; no agregue un duplicado.
```

Despues volver al flujo que estaba activo. Si mas adelante se toma el item,
usar `agteamos-task` sobre el ticket o la fila existente.

## Checklist

- [ ] Proyecto resuelto contra el registro.
- [ ] Estado `switched`, `scoped-absolute` o `unavailable` determinado.
- [ ] Target y pertenencia de paths verificados antes de escribir.
- [ ] Backlog local actualizado y releido antes del tracker.
- [ ] `product/` se creo solo al escribir el primer backlog si no existia.
- [ ] Onboarding actualizado despues del read-back local, si existe.
- [ ] Sin preguntas de prioridad, ACs ni estimacion.
- [ ] `platform.yml.tracker` leido desde el target correcto.
- [ ] Change set externo aprobado antes de `apply`.
- [ ] ID/link externo persistido solo tras read-back.
- [ ] En `unavailable` no hubo mutaciones.
- [ ] Ningun dato de proyecto entro al outbox del plugin.

## Anti-patrones

- Escribir en el proyecto actual cuando el proyecto resuelto es otro.
- Degradar a `scoped-absolute` despues de fallar una capacidad nativa.
- Usar `cd` como prueba de que cambio el root/contexto del agente.
- Crear el ticket antes que la captura local o hacerla depender del tracker.
- Marcar `en-ticket` con un draft, una respuesta parcial o un ID no releido.
- Disparar `agteamos-task` para una simple anotacion.
- Enviar una idea del proyecto a `plugin-feedback.md` o `BACKLOG.md`.
