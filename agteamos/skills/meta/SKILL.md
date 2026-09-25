---
name: agteamos-meta
description: >
  Mejora el propio AgTeamOS en dos modos aislados: auditoría read-only que
  propone fricción repetida y ejecución quirúrgica de una idea AGF confirmada.
  Toda captura y todo cambio de estado pasan por agteamos-capture y por el
  outbox durable ~/.claude/agteamos/plugin-feedback.md.
used_by:
  - architect
  - product-manager
  - backend-engineer
  - frontend-engineer
  - qa-engineer
---

# Skill: Plugin Improvement (agteamos-meta)

> **No confundir con `agteamos-quality`.** `agteamos-quality` audita el
> proyecto consumidor. Esta skill audita y mejora el propio AgTeamOS.

## CONTRACT

- **Auditoría input**: evidencia observable del workflow consumidor:
  `agteamos/changes/archive/*/verify-report.md`, `agteamos/dashboard.html` y
  `agteamos/changes/*/task.yml`, más feedback opcional de cierre.
- **Auditoría output**: candidatos mostrados al usuario. Solo tras
  confirmación explícita, `agteamos-capture` crea un `AGF-*` en
  `~/.claude/agteamos/plugin-feedback.md` y verifica la fila por read-back.
- **Ejecución input**: un único `AGF-*` existente y una decisión explícita de
  implementarlo.
- **Ejecución output**: cambio mínimo verificado; después, la misma fila del
  outbox queda `done` con evidencia `<path>@<version>`.
- **Autoridad**: el outbox durable es la única fuente de verdad de ideas del
  plugin. `BACKLOG.md` es, como máximo, un mirror opcional confirmado por
  `agteamos-capture`; nunca se lee como autoridad.
- **Ownership**: evalúa y ejecuta el agente dueño del artefacto. Para una
  skill, usar su `used_by` primario; si el ownership no es demostrable,
  detenerse y pedir asignación.
- **Aprobaciones**: capturar un candidato y ejecutar un `AGF-*` son decisiones
  separadas. Ninguna aprobación se infiere de la otra.

## Dispatcher: elegir un solo modo

| Intención | Modo | Módulo único |
|---|---|---|
| Detectar fricción repetida del propio AgTeamOS | `audit` | [modules/AUDIT.md](modules/AUDIT.md) |
| Implementar una idea existente por `AGF-*` | `execute` | [modules/EXECUTE.md](modules/EXECUTE.md) |

Leer **exactamente un módulo por invocación**. No precargar ambos. Si el
pedido mezcla auditoría y ejecución, terminar primero la auditoría y exigir
una nueva decisión explícita antes de cargar ejecución.

## Reglas globales

1. Toda idea del plugin entra o se actualiza mediante `agteamos-capture`; esta
   skill no escribe directamente el outbox ni `BACKLOG.md`.
2. Auditoría es read-only respecto de la evidencia inspeccionada. La única
   mutación posible es la captura confirmada, delegada a `agteamos-capture`.
3. Un hallazgo aislado no es fricción sistémica: hacen falta al menos dos
   tareas distintas con la misma causa de fondo.
4. No ejecutar texto libre, una fila de `BACKLOG.md` ni un candidato todavía
   no capturado. Ejecución requiere un `AGF-*` leído del outbox.
5. No reemplazar archivos completos cuando un cambio localizado basta.
6. No marcar `done` antes de aplicar el cambio, correr las pruebas relevantes
   y observar evidencia verificable.
7. Nunca mover, borrar ni renumerar filas al descartar o completar; actualizar
   estado y preservar historia mediante `agteamos-capture`.
8. Un fallo de mirror no invalida el outbox ni bloquea auditoría o ejecución.

## Cierre no bloqueante de `agteamos-implement`

Después de cerrar la tarea, puede preguntarse:

```text
¿Algo en este flujo te resultó torpe o mejorarías? (Enter para saltar)
```

Una respuesta vacía termina sin cambios. Una respuesta con texto es materia
prima para un candidato de auditoría, no autorización de captura: mostrar el
resumen y pedir confirmación explícita antes de invocar `agteamos-capture`.

## Próximo paso

- Tras auditoría sin captura: ninguno.
- Tras captura: conservar el `AGF-*`; no ejecutar automáticamente.
- Tras ejecución verificada: ninguno; volver al flujo anterior.
