# Standards registry

AgTeamOS empaqueta únicamente `registry.yml` como entrada para knowledge. Es
un catálogo metadata-only de topics iniciales; no contiene reglas
prescriptivas ni un standard base contra el cual comparar un proyecto.

Las reglas nacen dentro de cada proyecto al ejecutar discovery sobre su código,
tests, configuración y ADRs reales.

## Qué contiene el registry

Cada una de sus siete lentes declara:

- `id` y `folder` canónicos, que deben coincidir;
- `description`;
- `keywords` y `globs` para encontrar evidencia;
- `first_consumers`;
- `aliases` compatibles, cuando aplica.

Esta metadata sirve para routing, indexación y selección de evidencia. No
afirma cómo “debería” verse el código.

## Flujo project-owned

1. `agteamos-knowledge --init` registra los siete topics como `pending` en
   `onboarding.yml`; no crea `agteamos/standards/`.
2. `agteamos-knowledge --discover <id> [--scope <paths>]` inspecciona 5-10
   archivos representativos del proyecto.
3. El resultado se escribe en `agteamos/standards/<id>/` y pertenece al
   proyecto.
4. `agteamos-knowledge --inject <intent|paths>` devuelve solo los paths
   relevantes para que el consumidor los lea.
5. `agteamos-knowledge --learn` incorpora convenciones confirmadas durante el
   uso.

`--topic <id>` se mantiene como alias de `--discover <id>`.

## Salida eventual en el proyecto

El primer discovery materializa esta carpeta y solo las entradas del topic
procesado:

```text
agteamos/standards/
├── registry.yml          # custom topics locales, opcional
├── standards.yml         # observed | mixed | intentional-deviation | pending
├── index.yml             # keyword/alias -> folder
├── index.meta.yml        # done | pending | stale
└── <id>/
    ├── README.md
    ├── examples.md       # opcional; código real del proyecto
    └── deviations.md     # solo con decisión intencional confirmada
```

Cada README descubierto separa:

1. Provenance (`Observed`, `Decided`, `External`)
2. Current conventions
3. Evidence
4. Team decisions
5. Migration path
6. Learned in use

Una fuente externa puede informar una decisión, pero no se declara regla del
proyecto sin aprobación del equipo.

## Custom topics

Un proyecto puede agregar topics fuera de las siete lentes iniciales mediante
metadata local en `agteamos/standards/registry.yml`. Sus ids y folders siguen
la misma regla de alineación y sus aliases solo resuelven al folder canónico.
El registry empaquetado no se modifica.

## Integración runtime

`post-write-checks.js` usa globs para señalar topics relevantes después de una
edición. `session-start.js` presenta el índice project-owned disponible. Si un
topic está `pending` o `stale`, el consumidor usa `ensure-artifact` y genera
como máximo uno por step.

Los proyectos antiguos no se regeneran. Sus referencias legacy se ignoran o
se migran de forma gradual mediante `agteamos-knowledge --maintain`.
