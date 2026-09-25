# Rejected / Out-of-scope — dirección declinada

## Contrato

Este registro conserva una idea, feature o dirección que el usuario evaluó y
rechazó explícitamente. No documenta una decisión tomada —eso corresponde a
un ADR— sino un pedido declinado y su razonamiento.

- Entrada: rechazo explícito del usuario durante una conversación.
- Salida: `agteamos/decisions/out-of-scope/<slug>.md`.
- Responsable: quien lidera la conversación, normalmente product-manager o
  architect.
- Efecto: memoria no bloqueante; no cierra futuras conversaciones por sí sola.

Un ADR y un registro out-of-scope son complementarios y no se sustituyen.

## Cuándo registrar

Registrar cuando el usuario diga de forma inequívoca que no quiere seguir con
la propuesta, incluido un veredicto de premortem que el usuario adopte como
motivo para abandonarla.

No registrar:

- algo que el usuario simplemente no pidió;
- un ticket cerrado porque ya fue implementado;
- un bug ya resuelto;
- una feature pospuesta sin evaluación ni rechazo de fondo; eso va al backlog;
- una alternativa descartada dentro de una decisión positiva, si el ADR/RFC ya
  conserva suficiente contexto.

Si no está claro si hubo rechazo o aplazamiento, preguntar una sola vez. No
fabricar el veredicto.

## Proceso

1. Confirmar el concepto rechazado y el razonamiento real expresado.
2. Crear un slug estable, conceptual y en kebab-case.
3. Escribir un archivo por concepto con:
   - fecha;
   - contexto de la conversación;
   - qué se propuso;
   - por qué se rechazó;
   - condición concreta de reconsideración, o
     `Ninguna identificada por ahora`.
4. No añadir razones que el usuario no dio ni endurecer un aplazamiento hasta
   convertirlo en rechazo permanente.

Para un scaffold copiable, el usuario debe pedir el módulo `TEMPLATES.md`.

## Consulta futura

Antes de volver a proponer una dirección relevante, revisar
`agteamos/decisions/out-of-scope/` por similitud conceptual, no solo por
keywords. Dos formulaciones distintas pueden ser la misma propuesta.

Si hay coincidencia:

1. citar archivo, fecha y razón anterior;
2. preguntar si cambió la condición que justificó el rechazo;
3. reabrir el análisis solo si el usuario confirma contexto nuevo.

El registro no es un veto permanente. Si el contexto cambió, conservar el
historial anterior y documentar la nueva decisión en el artefacto apropiado.

## Checklist

- Hubo rechazo explícito, no silencio ni simple prioridad baja.
- El archivo describe el concepto con suficiente precisión para reconocerlo.
- La razón refleja al usuario y no una inferencia del agente.
- La condición de reconsideración es concreta o declara que no se conoce.
- No duplica backlog, ticket resuelto, RFC ni ADR.

## Anti-patrones

- Registrar cada idea no elegida y contaminar la memoria con falsos positivos.
- Buscar solo coincidencia literal.
- Usar el archivo para cortar una discusión aunque el contexto haya cambiado.
- Confundir `elegimos X sobre Y` con `el usuario declinó Y`.
- Convertir un veredicto de premortem en rechazo sin aceptación del usuario.
