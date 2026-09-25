# Módulo: Auditoría del propio AgTeamOS

Cargar solo para detectar fricción del framework. No aplicar mejoras ni
cambiar evidencia del proyecto durante este modo.

## Precondiciones

- El pedido apunta al propio AgTeamOS, no a calidad del código consumidor.
- La evidencia se inspecciona en modo read-only.
- La captura de un candidato requiere confirmación explícita del usuario.

## Proceso

### 1. Reunir evidencia sin mutarla

Leer las últimas 10-20 tareas archivadas, o todo el histórico si es menor:

- `agteamos/changes/archive/*/verify-report.md`;
- `agteamos/changes/archive/*/task.yml`;
- tareas activas en `agteamos/changes/*/task.yml`;
- `agteamos/dashboard.html`, si existe.

No corregir reportes, estados, fechas ni handoffs como parte de la auditoría.
Registrar siempre los IDs de tareas que sustentan cada señal.

### 2. Detectar fricción repetida

En `verify-report.md`, agrupar `FAIL` y `WARNING` por requirement y causa de
fondo. Solo hay candidato cuando la misma causa aparece en **2 o más tareas
distintas**. Coincidencia de palabras sin causa común no alcanza.

Ejemplo válido:

```text
TASK-38, TASK-41 y TASK-45 llegan a verify por debajo del mismo umbral de
cobertura porque implement no exige un checkpoint previo de tests.
```

Un único fallo es evidencia puntual y se reporta, como máximo, como
observación no capturable.

### 3. Detectar cuellos de botella

Calcular la duración típica con tareas archivadas (`created` hasta archivo).
Marcar una tarea `in_progress` solo si supera el doble de esa duración.
Cuando hay menos de 3 tareas archivadas, usar 14 días sin cambio de estado
como fallback explícito.

También es señal una tarea con 3 o más `handoffs`, pero solo se convierte en
candidato si la evidencia muestra una causa repetida —por ejemplo, contexto
insuficiente en más de una tarea— y no solo muchos participantes.

### 4. Redactar candidatos accionables

Cada candidato incluye:

- síntoma y causa de fondo;
- al menos dos IDs de tareas;
- artefacto o paso de AgTeamOS probablemente responsable;
- cambio a evaluar, sin presentarlo como decisión tomada;
- owner probable, derivado del `used_by` o ownership del artefacto.

No asignar prioridad, solución definitiva ni estado. Eso corresponde al
outbox y a la evaluación del owner.

### 5. Mostrar el lote y pedir confirmación

Presentar todos los candidatos juntos:

```text
La auditoría read-only encontró estos candidatos:
1. <candidato con evidencia>
2. <candidato con evidencia>

¿Cuáles confirmas que capture como ideas de AgTeamOS? ("ninguno" para omitir)
```

No interpretar la pregunta de cierre de `agteamos-implement`, silencio,
aceptación de la tarea cerrada ni interés general como confirmación. El
usuario debe seleccionar explícitamente cada candidato.

### 6. Capturar únicamente los confirmados

Por cada candidato confirmado, invocar `agteamos-capture` en modo plugin con:

- idea autocontenida;
- `origin: auto-detected`;
- IDs de evidencia incorporados en el texto cuando aporten trazabilidad.

`agteamos-capture` debe persistir primero en
`~/.claude/agteamos/plugin-feedback.md`, asignar o reutilizar el `AGF-*` y
releer la fila. No declarar éxito sin read-back de ID, idea y estado.

Si el read-back falla, reportar el bloqueo y conservar el candidato en la
respuesta; no escribir directamente el outbox ni intentar `BACKLOG.md`.

Un mirror a `BACKLOG.md` solo puede hacerlo `agteamos-capture` después de
confirmar que el destino es el repo fuente y después del read-back exitoso.
El mirror sigue siendo opcional y nunca sustituye al outbox.

### 7. Terminar sin autoejecución

Devolver los `AGF-*` confirmados y volver al flujo previo. Capturar una idea
no aprueba implementarla. La ejecución exige una decisión posterior y carga
exclusivamente `modules/EXECUTE.md`.

## Anti-patrones

- Auditar arquitectura, seguridad o deuda del proyecto consumidor: usar
  `agteamos-quality`.
- Proponer como fricción sistémica un único `FAIL`, `WARNING` o handoff.
- Usar 14 días cuando ya hay histórico suficiente para calcular la base.
- Capturar antes de mostrar el candidato y recibir confirmación explícita.
- Tratar una respuesta a la pregunta de cierre como aprobación implícita.
- Leer o escribir `BACKLOG.md` como fuente de verdad.
- Ejecutar el cambio durante la auditoría.
