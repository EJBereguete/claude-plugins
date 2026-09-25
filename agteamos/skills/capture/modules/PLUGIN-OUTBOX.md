# Modulo: Plugin Outbox

Cargar este modulo solo para capturar o revisar ideas sobre AgTeamOS como
plugin. No usarlo para features del producto de un proyecto consumidor.

## Fuente de verdad durable

La autoridad primaria es siempre:

```text
~/.claude/agteamos/plugin-feedback.md
```

Expandir `~` al home real del usuario. Crear el directorio y el archivo si
faltan. Esta escritura ocurre antes de cualquier mirror y no depende de
`${CLAUDE_PLUGIN_ROOT}`. Una copia cacheada del plugin nunca puede ser el
destino unico ni un destino de escritura.

Si el archivo no existe, crearlo con este contenido, sin filas de ejemplo:

```markdown
# AgTeamOS plugin feedback

Outbox durable de ideas sobre AgTeamOS. No borrar filas; cambiar `status`.

| ID | fecha | idea | origin | priority | status | semantic_hash | source_sync | evidence |
|---|---|---|---|---|---|---|---|---|
```

### Schema

- `ID`: `AGF-0001`, cuatro digitos como minimo. Calcular `max(ID)+1` sobre
  **todas** las filas; nunca reutilizar IDs discarded o done.
- `fecha`: fecha de captura `YYYY-MM-DD`; no cambiarla durante review.
- `idea`: texto breve y legible, escapando `|` y convirtiendo saltos de linea
  a espacios sin perder significado.
- `origin`: `user` para captura manual o `auto-detected` para una propuesta
  de AgTeamOS.
- `priority`: `high`, `medium` o `low`; default `medium`, sin preguntar.
- `status`: `idea`, `planned`, `discarded` o `done`; comienza en `idea`.
- `semantic_hash`: `sha256:<16-hex>` calculado por el proceso siguiente.
- `source_sync`: opcional. Queda vacio salvo mirror verificado a un repo
  fuente confirmado.
- `evidence`: vacio salvo `done`; entonces contiene path y version verificable.

Preservar columnas desconocidas y texto circundante. Si el archivo ya existe
con schema anterior, migrarlo de forma aditiva: no eliminar filas, IDs,
comentarios ni metadata. Escribir de forma atomica cuando el host lo permita y
releer la fila afectada antes de confirmar.

## Captura de baja friccion

### 1. Redactar sin interrogar

Extraer una idea autocontenida de la frase del usuario. No pedir prioridad,
ACs, owner, estimacion ni detalle de implementacion. Solo el dispatcher puede
hacer la pregunta de desambiguacion plugin/proyecto.

### 2. Normalizar y deduplicar

Antes de asignar un ID, leer todo el outbox, incluidos `discarded` y `done`.
Para la idea nueva y para cada fila existente:

1. aplicar Unicode NFKD, quitar diacriticos y pasar a minusculas;
2. quitar prefijos de captura (`idea`, `anota`, `se me ocurrio`) y puntuacion;
3. reemplazar whitespace repetido por un espacio y hacer trim;
4. tokenizar; quitar articulos/conectores comunes en espanol e ingles y las
   palabras de contexto `agteamos` y `plugin`;
5. deduplicar y ordenar los tokens; si no queda ninguno, usar el texto
   normalizado completo;
6. unirlos con un espacio y calcular SHA-256; guardar los primeros 16
   hexadecimales como `sha256:<hash>`.

Hay duplicado si coincide el texto normalizado o la clave semantica anterior.
El hash acelera la comparacion, pero no es prueba unica: ante una colision,
recalcular y comparar las claves. Recalcular desde `idea` cuando una fila
legacy no tenga hash.

Si hay duplicado:

- no agregar fila ni cambiar silenciosamente la existente;
- devolver una sola linea con ID y status existentes;
- si el usuario quiere reabrir un `discarded`, hacerlo como accion explicita
  de review sobre el mismo ID, nunca creando otro.

### 3. Persistir y verificar

Releer justo antes de escribir para evitar reutilizar un ID. Agregar una unica
fila con la fecha actual, `priority=medium`, `status=idea`, `source_sync` y
`evidence` vacios. Releer y verificar ID, idea y hash.

Si la escritura o el read-back falla, no declarar captura exitosa y no intentar
el mirror: conservar el texto en la respuesta y reportar el bloqueo de forma
directa.

## Mirror opcional a `BACKLOG.md`

El mirror es secundario y se intenta **solo despues** del read-back exitoso del
outbox. Clasificar `${CLAUDE_PLUGIN_ROOT}` sin escribir:

### Repo fuente confirmado

Debe cumplir todas estas condiciones:

1. la ruta canonica existe y no esta dentro de un directorio conocido de
   cache/marketplace de plugins;
2. `git -C "$CLAUDE_PLUGIN_ROOT" rev-parse --show-toplevel` tiene exito;
3. `.claude-plugin/plugin.json` bajo esa raiz identifica `name: agteamos`;
4. `BACKLOG.md` pertenece al worktree y esta tracked por ese repositorio.

Solo entonces puede agregarse o actualizarse el mismo `AGF-*` en
`${CLAUDE_PLUGIN_ROOT}/BACKLOG.md`.

Antes de escribir el mirror, buscar el ID en todas sus secciones y repetir la
normalizacion semantica sobre las ideas existentes. No duplicar por ID, texto
ni hash. Preservar el ID `AGF-*`; nunca renumerarlo al formato local del
archivo. No borrar historia durante una sincronizacion.

Tras releer y verificar el mirror, actualizar `source_sync` en el outbox con:

```text
BACKLOG.md#AGF-0001@<git-short-sha>
```

Si el working tree no corresponde limpiamente a una version, usar
`BACKLOG.md#AGF-0001@working-tree` en vez de inventar un commit. El outbox se
vuelve a releer despues de esa actualizacion.

### Cache o fuente no confirmada

Si una condicion falla, el root es cache/no confirmado:

- no escribir, crear ni modificar `BACKLOG.md` alli;
- dejar `source_sync` vacio;
- conservar la captura durable como resultado exitoso.

No pedir al usuario que copie manualmente la fila: el outbox ya evita la
perdida. Una confirmacion puede aclarar, en la misma linea, que la cache no se
toco.

Un fallo de mirror nunca revierte ni invalida la captura primaria. Reportarlo
brevemente sin repetir la idea ni generar una segunda fila.

## Review: siempre sobre el outbox

Para "revisar el backlog/ideas de AgTeamOS", leer
`~/.claude/agteamos/plugin-feedback.md`, no `BACKLOG.md`. Mostrar primero
`idea` y `planned`, ordenados por prioridad (`high`, `medium`, `low`) y luego
por fecha ascendente. Incluir cerrados solo si el usuario pide historial.

Acciones permitidas sobre la fila existente:

- **priorizar**: cambiar `priority`;
- **planear**: cambiar `status` a `planned`;
- **descartar**: cambiar `status` a `discarded`, nunca borrar o mover la fila;
- **reabrir**: cambiar `discarded` a `idea` o `planned` por pedido explicito;
- **completar**: cambiar `status` a `done` solo con evidencia observada.

Para `done`, `evidence` es obligatorio y usa:

```text
<path-verificado>@<version>
```

La version debe ser un commit, tag, version de paquete o identificador de
release comprobado. Si solo existe un working tree verificable, registrar
`<path>@working-tree` y decirlo; no inventar una version. Si no hay path o
version verificable, mantener `planned`/`idea`.

Cada accion modifica primero el outbox y se relee. Si existe `source_sync`,
puede propagarse al repo fuente solo si vuelve a pasar la confirmacion de
fuente y el mirror contiene el mismo ID; un fallo deja el outbox como autoridad
y no borra metadata previa.

## Confirmaciones de una linea

Usar una sola linea y volver al flujo previo:

```text
Anotado AGF-0007 en ~/.claude/agteamos/plugin-feedback.md; segui con lo que estabas haciendo.
Ya existia AGF-0007 (planned) en el outbox de AgTeamOS; no agregue un duplicado.
AGF-0007 quedo discarded en el outbox de AgTeamOS; se conservo el historial.
AGF-0007 quedo done con evidencia skills/capture/SKILL.md@v2.4.0.
```

No hacer preguntas de refinamiento despues de capturar.

## Anti-patrones

- Escribir primero o unicamente en `${CLAUDE_PLUGIN_ROOT}/BACKLOG.md`.
- Escribir cualquier archivo dentro de una cache instalada.
- Deduplicar solo contra items abiertos.
- Considerar igualdad de hash sin comparar la clave normalizada.
- Eliminar una fila al descartar o completar.
- Marcar `done` porque alguien lo planeo o porque existe un draft.
- Confirmar un mirror o una version sin read-back.
