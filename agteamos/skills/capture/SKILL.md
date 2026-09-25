---
name: agteamos-capture
description: >
  Dispatcher de captura de baja friccion. Separa ideas sobre AgTeamOS en un
  outbox durable del usuario y pedidos de producto en el backlog local del
  proyecto resuelto, con ticket externo opcional y aprobado.
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

## Contrato

- **Modo plugin, captura**: recibe una idea sobre AgTeamOS, sus skills,
  agentes, templates o workflow. Persiste primero en
  `~/.claude/agteamos/plugin-feedback.md`.
- **Modo plugin, review**: revisa ese mismo outbox durable; permite cambiar
  prioridad o estado sin eliminar historia.
- **Modo proyecto**: recibe un pedido para un producto/proyecto concreto,
  resuelve el target y persiste en `agteamos/product/backlog.md`. Un ticket
  externo es opcional y pasa por `agteamos-work-items`.
- **Baja friccion**: capturar primero, confirmar en una linea y continuar. No
  pedir prioridad, ACs, estimacion ni refinamiento durante la captura.

## Dispatcher: elegir un solo modo

Clasificar la intencion antes de leer instrucciones operativas:

| Intencion | Modo | Modulo unico |
|---|---|---|
| Mejorar AgTeamOS como plugin/sistema | `plugin` | [modules/PLUGIN-OUTBOX.md](modules/PLUGIN-OUTBOX.md) |
| Revisar "ideas de AgTeamOS", incluso si el usuario dice "BACKLOG.md" | `plugin-review` | [modules/PLUGIN-OUTBOX.md](modules/PLUGIN-OUTBOX.md) |
| Agregar una feature, pagina, endpoint o tarea a un proyecto del usuario | `project` | [modules/PROJECT-BACKLOG.md](modules/PROJECT-BACKLOG.md) |

Leer **exactamente un modulo por modo**. No precargar ambos ni usar uno para
explicar el otro. Si un pedido contiene trabajo de ambos modos, procesarlo en
fases y descartar el detalle del primer modulo antes de cargar el segundo.

## Regla de desambiguacion

- "Idea: agregar un check a review" dentro de una conversacion sobre
  AgTeamOS -> `plugin`.
- "Agregar una pagina de KAM al proyecto notification-center" -> `project`.
- Mencionar una skill, agente o workflow de AgTeamOS pesa a favor de plugin;
  mencionar un nombre/alias de proyecto y comportamiento de su producto pesa
  a favor de proyecto.
- Si el contexto no alcanza, hacer una sola pregunta:
  "¿Es una idea para AgTeamOS, o para el roadmap del proyecto?"

Nunca cruzar namespaces:

- una idea del plugin no entra en `agteamos/product/backlog.md`;
- una idea de producto no entra en el outbox del plugin ni en `BACKLOG.md`;
- `${CLAUDE_PLUGIN_ROOT}/BACKLOG.md` nunca es la unica persistencia de una
  idea del plugin.

## Limites de enrutamiento

En modo proyecto:

- solo cambiar de proyecto, sin pedido adjunto -> `agteamos-router`;
- URL o ID de ticket existente -> `agteamos-implement`;
- implementacion inmediata -> `agteamos-task`;
- si "anotar" versus "implementar ahora" no se puede inferir, preguntar una
  sola vez cual de las dos intenciones corresponde.

En modo plugin:

- captura manual o auto-detectada -> outbox durable;
- priorizar, descartar, planear o cerrar una idea -> review del outbox;
- implementar la mejora puede delegarse a `agteamos-meta`, pero solo evidencia
  observada permite marcarla `done`.

## Invariantes globales

1. No perder una nota porque el plugin corre desde cache, cambia de version o
   falla una sincronizacion secundaria.
2. No crear duplicados sin revisar primero la fuente de verdad del modo.
3. No borrar filas para representar descarte o implementacion; cambiar estado.
4. Preservar IDs y calcular el siguiente desde todo el historial, no solo
   items abiertos.
5. Escribir el destino primario y releerlo antes de declarar exito.
6. No afirmar que un ticket, mirror o implementacion existe sin read-back o
   evidencia verificable.
7. La unica pregunta normal de captura es una desambiguacion imprescindible;
   la aprobacion de un change set externo sigue siendo obligatoria.

## Confirmacion

La captura termina con una sola linea que incluye modo, ID local y destino
primario. Puede incluir ID/link externo o indicar que una cache no se toco,
pero no agrega preguntas de seguimiento.

## Proximo paso

Ninguno: volver inmediatamente al flujo que estaba activo.
