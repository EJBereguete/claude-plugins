# Módulo `--learn`

Leer este módulo únicamente para `--learn`, una corrección del usuario, un
hallazgo repetido confirmado o una propuesta de patrón al cerrar una tarea.
No ejecutar discovery como efecto secundario.

## Contrato

- **Input**: una convención candidata con fuente identificable.
- **Output**: una entrada project-owned en el topic relevante.
- **Fricción**: una confirmación como máximo; ninguna si el usuario ya dijo que
  es una regla del proyecto.
- **Honestidad**: registrar qué fue observado y qué fue decidido.

## Disparadores válidos

### Corrección del usuario

Ante frases como “acá usamos X”, “siempre Y” o “nunca Z”, confirmar solo si
podría tratarse de una instrucción puntual:

> ¿Lo registro como convención del proyecto o aplica solo a esta tarea?

Si el alcance de proyecto ya es explícito, no volver a preguntar.

### Hallazgo repetido

Cuando la misma regla aparece con `SEEN >= 3` en tareas o PRs distintos,
proponer promoverla. No cuentan repeticiones dentro de una misma tarea y no
se escribe sin aprobación.

### Patrón nuevo al cerrar una tarea

Si un diff introduce un patrón coherente usado tres o más veces, se puede
proponer. Su presencia no basta para declararlo convención: requiere
confirmación.

## Paso 1 — Resolver topic

1. Usar `agteamos/standards/index.yml`.
2. Resolver aliases al folder canónico.
3. Si no hay match, proponer un custom topic.
4. Al aprobarlo, escribir su metadata en
   `agteamos/standards/registry.yml` con `id == folder` y actualizar el índice.

No modificar `standards/registry.yml` del plugin.

## Paso 2 — Escribir sin discovery completo

Si el README existe, preservar sus secciones y agregar la entrada a
`Learned in use`. Cuando corresponda, reflejar la regla aprobada en
`Team decisions`.

Si no existe, crear un documento mínimo usable con la estructura obligatoria:

```markdown
# <Topic>

## Provenance
## Current conventions
## Evidence
## Team decisions
## Migration path
## Learned in use
```

En ese caso:

- `Provenance` identifica la conversación, PR, tarea o ledger;
- `Current conventions` no inventa evidencia ausente;
- `Evidence` distingue el ejemplo observado de una decisión general;
- `Team decisions` registra la aprobación humana;
- `Migration path` dice `No migration agreed` salvo decisión explícita;
- `Learned in use` contiene la regla, estado `CREATED` o `UPDATED`, fecha,
  fuente y confidence.

Crear este mínimo no autoriza leer 5-10 archivos ni completar discovery.

## Paso 3 — Actualizar metadata

- `index.meta.yml`: `done`, porque existe un documento usable.
- `standards.yml`: `mixed` cuando la regla es una decisión/aprendizaje aún no
  respaldado de forma uniforme; `observed` solo si la evidencia repetida
  demuestra la convención; `intentional-deviation` solo con confirmación
  explícita.
- `onboarding.yml`: conservar que el discovery amplio está diferido mediante
  una nota `discovery: pending` si el tema nació como documento mínimo.

El estado runtime y la completitud de discovery son conceptos distintos.

## Paso 4 — Confirmar y volver

Responder en una línea:

```text
Registrado en agteamos/standards/<folder>/README.md#Learned-in-use. Continúo con la tarea.
```

No hacer preguntas de prioridad, ACs ni diseño adicional.

## Conflictos

Si una entrada nueva contradice una convención existente:

1. no borrar la anterior;
2. registrar ambas evidencias;
3. pedir una única decisión del equipo si no fue explícita;
4. dejar clasificación `mixed` hasta resolver;
5. usar `Migration path` si se aprueba cambiar de una a otra.

## Anti-patrones

- Aprender automáticamente desde una sola ocurrencia.
- Promover `SEEN < 3`.
- Ejecutar `--discover` solo para anotar una corrección.
- Etiquetar una preferencia externa como regla.
- Perder fuente, fecha o confidence.
- Confundir una decisión puntual de tarea con convención del proyecto.
