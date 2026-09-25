---
name: agteamos-knowledge
description: >
  Dispatcher de conocimiento project-owned. Usa --init para onboarding,
  --maintain (default) para mantenimiento, --maintain --release para higiene
  manual de release, --discover <id> para descubrir
  convenciones desde evidencia real, --inject <intent|paths> para devolver
  solo paths relevantes, --human-docs para derivar los cuatro documentos
  humanos MVP y --learn para capturar convenciones confirmadas. --topic <id>
  se conserva como alias de --discover <id>.
used_by:
  - architect
  - product-manager
  - devops-engineer
  - ui-ux-designer
---

# SKILL: Project Knowledge

## Contrato

Esta skill administra conocimiento que pertenece al proyecto. El plugin
empaqueta `standards/registry.yml` como catálogo metadata-only; no existe un
standard base prescriptivo para comparar o copiar.

El registry aporta siete lentes iniciales (`id`, `folder`, descripción,
keywords, globs, consumidores y aliases). El proyecto puede agregar custom
topics con metadata local. En todos los casos `id` y `folder` deben coincidir;
los aliases solo resuelven al id canónico.

### Honestidad, en todos los modos

- Separar `Observed`, `Decided` y `External`.
- Citar archivos, tests, configuración o ADRs para afirmaciones observadas.
- Marcar inferencias y límites; no elevar confidence por intuición.
- No presentar una “best practice” externa como regla del proyecto sin
  aprobación.
- No declarar un documento `complete` sin confirmación explícita.
- No inventar datos para completar documentación humana.
- Nunca reemplazar contenido humano no administrado sin preview y aprobación.

## Progressive disclosure obligatorio

Al iniciar, leer solo este dispatcher. Resolver el modo y cargar exactamente
un módulo:

| Invocación | Módulo que se lee |
|---|---|
| `--init [--full]` | `modules/INIT.md` |
| `--maintain [--release]` o sin argumentos | `modules/MAINTAIN.md` |
| `--discover <id> [--scope <paths>]` | `modules/DISCOVER.md` |
| `--topic <id> [--scope <paths>]` | `modules/DISCOVER.md`; normalizar al comando anterior |
| `--inject <intent|paths>` | `modules/INJECT.md` |
| `--human-docs [--scope changed|all] [--outputs <lista>]` | `modules/HUMAN-DOCS.md` |
| `--learn` o disparador de aprendizaje | `modules/LEARN.md` |

Nunca cargar todos los módulos “por contexto”. No leer un módulo para explicar
otro.

Excepciones acotadas:

- `INIT.md` puede pedir `DISCOVER.md` al generar un topic concreto en L1/L2;
  cargarlo recién entonces y descartarlo antes del siguiente topic.
- `MAINTAIN.md` puede pedir `DISCOVER.md` después de que el usuario apruebe
  redescubrir un topic stale; máximo uno por step.
- `INJECT.md` puede señalar `ensure-artifact(standards.<id>)`; el generador,
  no inject, carga `DISCOVER.md` para ese único topic.
- `HUMAN-DOCS.md` solo lee artefactos de `agteamos/` y sus cuatro templates;
  nunca carga discovery para completar datos faltantes.
- `LEARN.md` nunca carga discovery solo para registrar una corrección.

Si aparecen varios flags de modo, detenerse y pedir uno. `--scope`,
`--outputs`, `--full` y `--release` son modificadores, no modos; `--release`
solo es válido junto a `--maintain`. Para `--human-docs`, `--scope` solo acepta
`changed` (default) o `all`; `--outputs` acepta
`readme,changelog,architecture,operations`. Para `--discover`, `--scope`
sigue aceptando paths.

## Routing

```text
--init?                  -> INIT
--discover/--topic?      -> DISCOVER
--inject?                -> INJECT
--human-docs?            -> HUMAN-DOCS
--learn o aprendizaje?   -> LEARN
--maintain [--release] o sin flags? -> MAINTAIN
```

Si el default `--maintain` encuentra que no existe `agteamos/`, propone
`--init`; no cambia de modo silenciosamente.

## Artefactos eventuales de standards

```text
Plugin:
  standards/registry.yml                 # metadata inicial, no reglas

Proyecto:
  agteamos/standards/registry.yml        # metadata de custom topics (opcional)
  agteamos/standards/standards.yml       # clasificación semántica
  agteamos/standards/index.yml           # keyword/alias -> folder
  agteamos/standards/index.meta.yml      # estado runtime
  agteamos/standards/<id>/README.md      # convenciones project-owned
  agteamos/standards/<id>/examples.md    # ejemplos reales, opcional
  agteamos/standards/<id>/deviations.md  # solo desviación intencional
```

Ninguno de los paths de `agteamos/standards/` se crea durante L0. Antes del
primer discovery, el registry del plugin más `onboarding.yml` resuelven
relevancia y estado. El primer topic real materializa la carpeta y los
manifests mínimos; los demás siguen pendientes sin placeholders.

### Dos ejes de estado

`index.meta.yml` expresa únicamente disponibilidad operativa:

```text
done | pending | stale
```

`standards.yml` expresa únicamente qué contiene el topic:

```text
observed | mixed | intentional-deviation | pending
```

No mezclar ambos ejes. Un topic puede estar runtime `done` y clasificación
`mixed` o `pending`.

## Semántica de cada modo

### `--init`

Siembra contexto y un único manifest, `onboarding.yml`. Los siete topics se
toman exclusivamente de `standards/registry.yml` y comienzan `pending`; no se
crean `standards/`, `specs/`, índices ni README hasta que una tarea real los
necesite. `--full` es opt-in.

### `--maintain` (default)

Compara documentos con fuentes reales, distingue lazy de faltante/stale y
propone cambios antes de escribir. Los proyectos antiguos no se regeneran:
las referencias legacy se ignoran o migran gradualmente al tocar el topic.

Con `--release`, añade un inventario read-only de cierres varados, derivados,
cache y artefactos huérfanos, seguido de dry-run y aprobación exacta. Nunca se
ejecuta automáticamente al cerrar una tarea.

### `--discover <id> [--scope <paths>]`

Lee 5-10 archivos representativos de código, tests, config y ADRs. Produce
README/examples/deviations propiedad del proyecto con estas secciones
obligatorias:

1. `Provenance (Observed/Decided/External)`
2. `Current conventions`
3. `Evidence`
4. `Team decisions`
5. `Migration path`
6. `Learned in use`

`--topic` es solo un alias compatible de este modo.

### `--inject <intent|paths>`

Es read-only. Resuelve relevancia mediante el índice y devuelve **solo paths**
que el consumidor debe leer. Para un topic pending/stale señala
`ensure-artifact`; como máximo se genera uno por step.

### `--human-docs [--scope changed|all] [--outputs <lista>]`

Genera o actualiza únicamente estos outputs derivados en el proyecto
consumidor:

1. `README.md`
2. `CHANGELOG.md`
3. `docs/architecture.md`
4. `docs/operations.md`

La fuente de verdad sigue bajo `agteamos/`. Cada sección administrada incluye
`Sources` y `Last verified`, usa marcadores explícitos y preserva todo lo que
quede fuera de ellos. Crear un archivo o agregar una sección no conflictiva es
una mutación local normal; reemplazar una sección administrada existente exige
mostrar su diff. Un conflicto con contenido humano no administrado exige
preview y aprobación antes de escribir.

### `--learn`

Registra una corrección o patrón confirmado con fuente y confidence, sin
disparar discovery completo. Mantiene baja fricción y vuelve a la tarea.

## Integración

- `post-write-checks.js` usa globs del registry para señalar el topic de un
  archivo modificado.
- `session-start.js` presenta el índice project-owned disponible.
- Los consumidores llaman `ensure-artifact(standards.<id>)` antes de leer un
  topic pending/stale.
- Presupuesto JIT: máximo un artefacto generado por step del consumidor.
- Si una fuente del tracker requiere una mutación, delegarla a
  `agteamos-work-items`; knowledge no escribe work items directamente.
- Bootstrap genera solo el bloque administrado de `README.md`. Cierre, deploy,
  incidentes y cambios materiales de seguridad disparan los otros outputs
  mediante `--human-docs --scope changed`; mantenimiento revisa su staleness.

## Compatibilidad

- No regenerar proyectos antiguos automáticamente.
- Preservar contenido útil y migrarlo solo durante `--maintain`.
- Resolver aliases hacia ids/folders canónicos sin duplicar topics.
- Los custom topics viven en metadata del proyecto, nunca en el registry
  empaquetado.

## Anti-patrones globales

- Cargar todos los módulos al comenzar.
- Buscar reglas prescriptivas dentro del plugin.
- Copiar ejemplos genéricos como convenciones del proyecto.
- Escanear todo el repositorio para un topic.
- Generar varios topics lazy en un mismo step.
- Hacer que `--inject` devuelva contenido o explicaciones.
- Crear más de los cuatro documentos humanos MVP.
- Usar código o conversación como fuente directa de human docs en lugar de
  actualizar primero el artefacto canónico correspondiente en `agteamos/`.
