---
name: agteamos-decisions
description: >
  Gobernanza de decisiones para RFCs, ADRs Nygard, direcciones rechazadas y
  premortems opt-in. Despacha cada solicitud al único módulo necesario.
used_by:
  - architect
  - product-manager
  - security-engineer
---

# Skill: Decisions

## Contrato

Esta skill gobierna cuatro artefactos complementarios:

- **RFC**: propuesta abierta antes de implementar.
- **ADR Nygard**: decisión arquitectónica tomada y numerada.
- **Rejected / Out-of-scope**: dirección que el usuario evaluó y rechazó.
- **Premortem**: crítica opcional, de solo lectura y no bloqueante.

Un RFC aceptado suele producir uno o más ADRs. Un ADR no reemplaza un registro
out-of-scope, ni viceversa. El premortem puede informar un RFC o ADR antes de
`Accepted`, pero nunca decide por el aprobador.

## Dispatcher lazy

1. Identificar la intención principal.
2. Leer exactamente un módulo de la tabla.
3. Ejecutar únicamente ese contrato.
4. No precargar, resumir ni mezclar módulos adyacentes.

| Intención | Módulo único |
|-----------|--------------|
| Proponer, revisar o resolver un cambio cross-team, contrato público, tecnología compartida o riesgo arquitectónico | `modules/RFC.md` |
| Registrar, aceptar, deprecar o superseder una decisión arquitectónica | `modules/ADR.md` |
| Registrar o consultar una dirección explícitamente rechazada | `modules/REJECTED.md` |
| Criticar una idea, hacer red team, devil's advocate o pre-mortem | `modules/PREMORTEM.md` |
| Pedir un template, scaffold o formato copiable | `modules/TEMPLATES.md` |

Si el usuario pide varios artefactos explícitamente, procesarlos en fases:
cargar solo el módulo de la fase activa y descartar su detalle antes de abrir
el siguiente. No interpretar “crear un RFC” como permiso para cargar también
ADR, premortem o templates.

Si la intención es ambigua entre RFC y ADR, preguntar si la decisión sigue
abierta o ya fue tomada. Si falta un objeto concreto para el premortem, hacer
como máximo una pregunta.

## Invariantes globales

### Lifecycle y aprobaciones

- No comenzar implementación sujeta a RFC antes de `Accepted`.
- No marcar RFC o ADR como `Accepted` sin aprobación explícita del rol
  autorizado definido en su módulo.
- No inventar consenso, quorum, deciders, fechas ni razones.
- Congelar RFCs cerrados y ADRs aceptados según su lifecycle.
- Una decisión nueva supersede; no reescribe el historial.

### Numeración e índices

- RFC y ADR usan números secuenciales de tres dígitos que nunca se reutilizan.
- Calcular el siguiente número leyendo archivos e índice; nunca adivinarlo.
- Actualizar el índice correspondiente junto con creación o cambio de estado.
- Mantener consistentes filename, número, título, status, fecha y vínculos.

### Nygard

Un ADR usa Context, Decision y Consequences. Solo califica si es a la vez
difícil de revertir, sorprendente sin contexto y producto de un trade-off
real. El detalle vive exclusivamente en `modules/ADR.md`.

### Rechazos

Out-of-scope requiere un rechazo explícito del usuario. No convertir silencio,
backlog, aplazamiento o trabajo ya resuelto en rechazo. Ante una coincidencia
futura, exponer el antecedente y preguntar qué cambió.

### Premortem opt-in

- Solo ejecutar por petición directa o aceptación explícita de una oferta.
- Nunca automático, obligatorio, bloqueante ni condición de aprobación.
- Es de solo lectura: no modifica artefactos, código, tickets ni estados.
- No investigar externamente ni hacer fan-out de subagentes salvo que exista
  necesidad concreta y permiso explícito del usuario.
- Omitir la sección `Premortem` de RFC/ADR si no se ejecutó; no inventarla.

## Regla de templates

`modules/TEMPLATES.md` es un destino, no una dependencia automática. Cargarlo
solo si el usuario pide el scaffold o formato. Los módulos de proceso enumeran
los campos obligatorios sin depender de ejemplos repetitivos.

## Fuera de alcance

Esta skill no:

- implementa la decisión;
- audita calidad o seguridad del código;
- crea backlog a partir de ideas no elegidas;
- convierte un premortem en veto;
- cambia aprobaciones o políticas de otros flujos.

Tras completar el artefacto solicitado, volver a la tarea que invocó la skill.
