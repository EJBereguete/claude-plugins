# Módulo: Ejecución de una mejora AGF

Cargar solo para implementar una idea ya capturada. La entrada obligatoria es
un único ID `AGF-*`; texto libre o una fila de `BACKLOG.md` no son ejecutables.

## Precondiciones

- El usuario decidió explícitamente implementar ese `AGF-*`. Haber aprobado
  su captura no cuenta como aprobación de ejecución.
- El ID existe en `~/.claude/agteamos/plugin-feedback.md`.
- El cambio pertenece al propio AgTeamOS y tiene owner identificable.

## Proceso

### 1. Resolver el AGF desde la autoridad

Invocar `agteamos-capture` en modo review y leer por ID la fila exacta del
outbox durable. No resolverla desde `BACKLOG.md`, aunque exista un mirror.
Verificar por read-back:

- ID e idea;
- `status` y `priority`;
- `source_sync` y `evidence`, sin tratarlos como alcance adicional.

Si no existe, detenerse. Si está `done`, mostrar su evidencia y no reaplicar.
Si está `discarded`, exigir una reapertura explícita mediante
`agteamos-capture`; nunca crear otro ID. `idea` o `planned` pueden continuar.

### 2. Verificar scope, ownership y aprobación

Traducir la idea a un alcance mínimo: artefacto objetivo, comportamiento
actual, comportamiento esperado y pruebas que lo demuestran.

Detenerse antes de editar si:

- la idea es de un producto consumidor y no del plugin;
- hacen falta varios cambios independientes: proponer AGF separados;
- no se puede identificar el target o el owner;
- contradice una decisión o estándar vigente sin aprobación para revisarlo;
- la solicitud de ejecución es ambigua.

Para una skill, leer su `SKILL.md` completo y usar el primer `used_by` como
owner primario. El owner evalúa exactitud, alineación, valor, scope y
completitud. Puede aplicar, aplicar con ajuste, redirigir o rechazar con
razón. Respetar además cualquier gate de aprobación específico del artefacto.

### 3. Aplicar el cambio quirúrgico

Editar solo las secciones necesarias:

1. preservar frontmatter, estructura, voz y contratos no relacionados;
2. no reemplazar el archivo entero si basta una edición localizada;
3. no expandir el alcance para limpiar deuda adyacente;
4. actualizar referencias consumidoras solo cuando sean necesarias para que
   el contrato no quede contradictorio;
5. no tocar el outbox ni `BACKLOG.md` directamente.

Reportar el diff lógico: archivos, secciones y motivo de cada cambio.

### 4. Ejecutar verificación

Identificar y correr las pruebas relevantes del artefacto cambiado. Para
cambios de skills, agentes o contratos del plugin, incluir como mínimo:

```text
node scripts/verify-agent-skill-contract.mjs
node scripts/agteamos-validate.mjs --root . --strict
```

Agregar tests focalizados si el cambio afecta scripts o comportamiento
ejecutable. Un comando inexistente, una prueba omitida o cualquier exit code
no cero impide completar el AGF. Corregir dentro del scope o dejar el estado
sin `done` y reportar el bloqueo.

### 5. Construir evidencia versionada

Solo después de que todas las verificaciones pasen, obtener una evidencia:

```text
<path-verificado>@<version>
```

`version` debe ser commit, tag, versión de paquete o release observada. Si el
cambio solo existe en un working tree verificable, usar
`<path>@working-tree` y decirlo; nunca inventar una versión. El path debe
apuntar al artefacto cambiado o a evidencia verificable de la mejora.

### 6. Marcar done mediante capture y releer

Invocar `agteamos-capture` en modo review para actualizar **la misma fila**:

- `status: done`;
- `evidence: <path>@<version>`.

Releer el outbox y verificar ID, estado y evidencia antes de declarar éxito.
No mover, eliminar ni renumerar la fila. Si el update o read-back falla, el
cambio puede estar implementado, pero el AGF no se declara completado.

Si hay `source_sync`, `agteamos-capture` puede sincronizar el mirror solo tras
reconfirmar el repo fuente. Un fallo del mirror no cambia la autoridad del
outbox ni justifica editarlo directamente.

### 7. Informar resultado

Incluir:

- `AGF-*`, owner y veredicto;
- cambio quirúrgico realizado;
- comandos de prueba y resultado;
- evidencia `<path>@<version>`;
- confirmación del read-back `done`, o el bloqueo exacto si no ocurrió.

## Anti-patrones

- Ejecutar por descripción sin `AGF-*`.
- Tomar `BACKLOG.md` como autoridad o mover ideas entre secciones.
- Inferir aprobación de ejecución desde la captura.
- Editar sin leer el artefacto completo ni validar owner.
- Marcar `done` antes de pruebas exitosas.
- Usar una versión o evidencia no observada.
- Borrar, mover o duplicar la fila para representar finalización.
