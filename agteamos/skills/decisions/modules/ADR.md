# ADR — decisión arquitectónica Nygard

## Contrato

Registrar antes de implementar toda decisión arquitectónicamente significativa
que pase las tres cláusulas siguientes. El gate es `AND`, no mayoría:

1. Es difícil o costoso revertirla.
2. Resultaría sorprendente sin el contexto de la deliberación.
3. Resuelve un trade-off real entre alternativas serias.

Si falla una cláusula, no crear un ADR aunque la decisión parezca importante.
Para decisiones livianas, agregar una entrada breve con fecha, contexto y
conclusión en `agteamos/decisions/decision-log.md`.

Cada ADR cubre una sola decisión. Usa formato Nygard y, una vez `Accepted`, es
inmutable. Para cambiarla, crear otro ADR que la superseda.

## Formato Nygard

El documento contiene:

- título `ADR-NNN: <Title>`;
- `Status`, `Date`, `Deciders` y relaciones `Supersedes`/`Superseded-By`;
- `Context`: fuerzas, restricciones y alternativas, en presente y sin adornos;
- `Decision`: decisión explícita en voz activa;
- `Consequences`: `Positive`, `Negative` y `Neutral`;
- `Premortem` únicamente si fue ejecutado antes de aceptar.

`Consequences → Negative` enumera costos aceptados. `Premortem` construye el
caso de fallo contra la decisión; no duplicar una sección en la otra.

## Lifecycle

```text
Proposed → Accepted → Deprecated
                    → Superseded
```

- `Proposed`: borrador abierto; puede editarse.
- `Accepted`: aprobado y mergeado. El contenido queda inmutable.
- `Deprecated`: sigue vigente, pero se retira gradualmente. Agregar arriba una
  nota que apunte al plan de migración.
- `Superseded`: otro ADR lo reemplaza. Solo se permite cambiar el status,
  agregar `Superseded-By: ADR-NNN` y una nota de supersesión.

El nuevo ADR incluye `Supersedes: ADR-NNN`. Nunca borrar el ADR anterior ni
reescribirlo para que coincida con la nueva decisión.

## Aprobación

- Los `Deciders` deben incluir al architect, tech lead o responsables con
  autoridad sobre el alcance afectado.
- Registrar aprobación explícita antes de pasar de `Proposed` a `Accepted`.
- Al aceptar, `Date` registra la fecha efectiva de aceptación.
- No inferir aprobación de silencio, comentarios favorables o código ya
  implementado.
- Si se documenta tarde una decisión ya desplegada, usar la fecha real y
  reconocer en `Context` que el registro fue retroactivo; no falsear el
  lifecycle.

## Premortem opt-in

Para una decisión de alto impacto o difícil de revertir, ofrecer una vez el
premortem antes de `Accepted`. El usuario decide si se ejecuta. Nunca es
automático, obligatorio ni bloqueante.

Si se acepta, seguir `PREMORTEM.md` y anexar el resumen antes de aprobar. Si se
omite, no crear la sección. Al aceptar, el anexo queda inmutable con el ADR.

## Numeración e índice

- Ubicación: `agteamos/architecture/adr/ADR-NNN-short-title.md`.
- `NNN` es secuencial, permanente y zero-padded a tres dígitos.
- Empezar en `ADR-001`; nunca reutilizar un número.
- El slug es kebab-case derivado del título.
- Determinar el siguiente número leyendo archivos e índice; no adivinarlo.
- Mantener `agteamos/architecture/adr/README.md`.
- Actualizar el índice al crear un ADR y al cambiar un status.
- El índice incluye enlace, título, status y fecha.

Para un scaffold copiable, el usuario debe pedir el módulo `TEMPLATES.md`.

## Checklist

- Cumple las tres cláusulas del gate.
- Registra exactamente una decisión.
- Incluye Context, Decision y Consequences Positive/Negative/Neutral.
- Status, fecha, deciders y relaciones son consistentes.
- Existe aprobación explícita antes de `Accepted`.
- Se ofreció, sin imponerlo, premortem para decisiones de alto impacto.
- Archivo e índice coinciden.
- Si supersede: ambos ADRs y el índice contienen los vínculos y status correctos.
- El ADR existe antes de implementar, salvo retroactividad declarada.

## Anti-patrones

- Editar el contenido de un ADR aceptado.
- Crear ADRs para detalles internos, configuración fácil de cambiar o una
  decisión que será reevaluada en el mismo sprint.
- Aplicar el gate como `OR` y llenar el repositorio de ruido.
- Omitir alternativas o consecuencias.
- Agrupar decisiones no relacionadas.
- Dejar `Proposed` indefinidamente.
- Confundir costos aceptados con premortem.
- Convertir el premortem en requisito de aprobación.
