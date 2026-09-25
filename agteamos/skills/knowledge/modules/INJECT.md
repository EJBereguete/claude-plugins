# Módulo `--inject`

Leer este módulo únicamente para `--inject <intent|paths>`. Este modo es un
resolver read-only: no crea, edita ni repara archivos.

## Contrato estricto

- **Input**: intención textual, uno o más paths, o ambos.
- **Resolución**: registry metadata-only del plugin + estados de
  `agteamos/onboarding.yml`; si ya existen, los índices project-owned
  complementan y pueden agregar custom topics.
- **Output**: únicamente paths de standards relevantes que el consumidor debe
  leer, uno por línea.
- **Mutación**: ninguna.

No incluir encabezados, explicaciones, bullets, JSON, YAML, code fences,
contenido de los standards ni paths del plugin en el output.

## Paso 1 — Resolver candidatos

1. Tokenizar la intención y normalizar los paths relativos al proyecto.
2. Resolver keywords y aliases mediante `standards/registry.yml` del plugin,
   `onboarding.yml` y, cuando exista, `agteamos/standards/index.yml`.
3. Usar globs de metadata local/registry solo para desambiguar paths; nunca
   tratarlos como reglas.
4. Deduplicar por folder y ordenar por relevancia.
5. Consultar primero el runtime en `index.meta.yml`; si todavía no existe
   `standards/`, usar el estado declarado en `onboarding.yml`.

No leer todos los README para decidir relevancia: el índice existe para evitar
esa carga.

## Paso 2 — Aplicar estado runtime

### `done`

Si el path existe, incluir:

1. `agteamos/standards/<folder>/README.md`;
2. `examples.md` solo cuando el intent pide una implementación y el archivo
   existe;
3. `deviations.md` cuando existe y afecta el intent.

### `pending` o `stale`

Solicitar o indicar al consumidor
`ensure-artifact(standards.<id>)` antes de devolver el topic. `--inject` sigue
siendo read-only: el protocolo delega la escritura al generador.

Presupuesto: como máximo una generación por step del consumidor.

- Elegir el candidato más relevante para ese step.
- No encadenar otros topics pending/stale.
- Tras la generación, releer índice y existencia y devolver sus paths.
- Si no se ejecuta la generación, no devolver un path inexistente o stale.
  La señal `ensure-artifact` viaja por el protocolo del consumidor, fuera del
  payload final de `--inject`.

Así se preservan simultáneamente el output “solo paths” y la obligación de
señalar artefactos no listos.

## Paso 3 — Emitir

Formato válido:

```text
agteamos/standards/api-design/README.md
agteamos/standards/api-design/examples.md
```

Si no hay un standard project-owned listo y relevante, devolver output vacío.
El consumidor lee los paths emitidos; `--inject` nunca pega su contenido ni
carga todos los topics.

## Compatibilidad

- Si falta `index.meta.yml`, leer el estado de `onboarding.yml`; un path real
  puede tratarse como `done` solo después de verificarlo.
- Si falta `index.yml` porque todavía no ocurrió el primer discovery, resolver
  desde el registry del plugin y onboarding. No crear el índice ni recorrer
  todo el árbol.
- Si faltan tanto onboarding como índices, tratarlo como proyecto legacy:
  devolver solo paths existentes y proponer `--maintain` fuera del payload.
- Los proyectos antiguos se migran con `--maintain`, no con `--inject`.

`session-start.js` puede presentar un resumen del índice y
`post-write-checks.js` puede señalar un topic por path. `--inject` siempre
resuelve contra los archivos project-owned actuales.

## Anti-patrones

- Editar manifests o generar discovery desde este modo.
- Devolver descripciones junto con paths.
- Devolver un path del plugin.
- Cargar todos los topics para resolver uno.
- Generar más de un pending/stale en el mismo step.
- Hacer que el consumidor dependa de contenido pegado en el output.
