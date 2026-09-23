---
name: agteamos-out-of-scope
description: >
  Registra ideas, features o direcciones que el usuario evaluo y rechazo
  explicitamente (distinto de un ADR, que registra una decision tomada) en
  agteamos/decisions/out-of-scope/, un archivo por concepto rechazado con su
  razonamiento. Consultado por similitud conceptual (no keyword matching) en
  agteamos-clarification-protocol, agteamos-new-task, agteamos-story-breakdown
  y agteamos-premortem antes de proponer o preguntar algo nuevo, para no
  re-litigar lo ya descartado.
used_by:
  - product-owner
  - architect
---

# SKILL: Out of Scope

## CONTRACT

- **Input**: una idea/feature/dirección que el usuario rechazó explícitamente
  durante una conversación (no un ticket cerrado como "ya implementado" —
  eso no es un rechazo, es duplicado, y NO se registra acá, ver ANTI-PATTERNS).
- **Output**: `agteamos/decisions/out-of-scope/<slug>.md`, un archivo por
  concepto rechazado.
- **Quién ejecuta**: quien esté liderando la conversación donde ocurrió el
  rechazo — normalmente `@product-owner` (features/producto) o `@architect`
  (decisiones técnicas). Nunca bloquea el flujo: escribir el archivo es un
  paso de un segundo, no una interrupción.
- **Diferencia con `agteamos-adr`**: un ADR documenta una decisión **tomada**
  (elegimos X). Este archivo documenta un pedido **declinado** (nos pidieron
  X, dijimos que no, y esto es por qué). Son memorias complementarias, no
  intercambiables — un ADR nunca reemplaza a este archivo ni viceversa.

---

## CUÁNDO SE ESCRIBE

Cuando el usuario, en el curso de cualquier conversación, dice explícitamente
que no quiere algo que se propuso o se discutió — no cuando simplemente no
lo pidió. Ejemplos de disparadores reales:
- "No, eso no lo queremos hacer por ahora."
- "Lo evaluamos y decidimos no meter [tecnología/feature] todavía."
- Un veredicto de `agteamos-premortem` que el usuario acepta como motivo
  para no seguir con una idea.

**Cuándo NO se escribe** (ver ANTI-PATTERNS): un ticket cerrado como
"ya implementado", un bug ya resuelto, o una feature simplemente pospuesta
sin haber sido evaluada y rechazada de fondo (eso es backlog, no rechazo).

---

## PROCESS

### Step 1 — Escribir el archivo

`agteamos/decisions/out-of-scope/<slug-del-concepto>.md`:

```markdown
# Out of Scope: <nombre del concepto>

**Fecha:** YYYY-MM-DD
**Contexto:** <qué se estaba discutiendo cuando surgió>

## Qué se propuso

<descripción concreta del concepto rechazado — suficiente para reconocerlo
si alguien lo vuelve a proponer con otras palabras>

## Por qué se rechazó

<razonamiento real, no una frase genérica — "no hay presupuesto para X este
trimestre" o "el premortem mostró que Y no cierra porque Z">

## Bajo qué condición podría reconsiderarse

<opcional — si hay una condición concreta que cambiaría el veredicto
("si conseguimos el partner de pagos Y", "si el volumen supera 10k/día"),
anotarla; si no hay ninguna, decir "ninguna identificada por ahora">
```

### Step 2 — Consulta futura (por similitud conceptual, no keyword)

Cuando `agteamos-clarification-protocol`, `agteamos-new-task`,
`agteamos-story-breakdown` o `agteamos-premortem` estén por proponer o
preguntar sobre algo nuevo, revisar los archivos de
`agteamos/decisions/out-of-scope/` buscando **el mismo concepto expresado
distinto**, no una coincidencia literal de palabras — "agregar pagos con
crypto" y "aceptar Bitcoin como método de pago" son el mismo concepto aunque
no compartan ninguna palabra clave.

Si hay match: decirlo explícitamente antes de seguir — *"Esto ya se evaluó
el `<fecha>` y se descartó por `<razón>` (ver
`agteamos/decisions/out-of-scope/<slug>.md`). ¿Cambió algo que justifique
reabrirlo?"* — nunca lo trates como una idea nueva sin decir que ya existe
un veredicto anterior.

---

## ANTI-PATTERNS

- Escribir un archivo por cada ticket cerrado como "ya implementado" —
  eso es duplicado, no rechazo; contaminaría la búsqueda por similitud con
  falsos positivos.
- Escribir un archivo por una feature simplemente pospuesta sin evaluación
  real — eso es backlog (`agteamos/product/backlog.md`), no un rechazo de
  fondo.
- Buscar coincidencia literal de palabras en vez de similitud conceptual —
  el valor de este mecanismo está en atrapar la misma idea reformulada, no
  en un grep.
- Usarlo como excusa para cerrar una conversación ("ya lo dijimos que no")
  cuando el contexto real cambió — siempre preguntar si la condición que
  motivó el rechazo sigue vigente, no asumir que un rechazo es permanente.
- Confundirlo con un ADR — si la decisión fue "elegimos X en vez de Y", eso
  va en `agteamos-adr` (Alternatives Considered / Consequences), no acá.
