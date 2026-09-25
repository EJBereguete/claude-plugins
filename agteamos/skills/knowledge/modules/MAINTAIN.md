# Módulo `--maintain`

Leer este módulo únicamente para `--maintain` o para la invocación sin
argumentos. No cargar módulos de otros modos hasta que un paso concreto lo
requiera.

## Contrato

- **Input**: un proyecto con `agteamos/` ya creado, aunque esté incompleto.
- **Output**: reporte de gaps y staleness; cambios solo después de aprobación.
- **Default**: sin argumentos, `agteamos-knowledge` ejecuta este modo.
- **No onboarding**: si no existe `agteamos/`, sugerir `--init`; no reportar
  cada archivo del esquema como faltante.

## Paso 1 — Inventariar sin regenerar

Leer primero `onboarding.yml` y su `profile`/`lifecycle`. El inventario
siguiente es eventual: una carpeta ausente con estado lazy no es un gap.
Revisar solo lo materializado o activado:

```text
agteamos/
├── platform.yml
├── architecture/
├── design/
├── devops/
├── security/
├── incidents/
├── decisions/
├── product/
├── standards/
│   ├── registry.yml          # metadata local opcional para custom topics
│   ├── standards.yml
│   ├── index.yml
│   ├── index.meta.yml
│   └── <id>/
├── specs/
└── changes/
```

Comparar cada documento solo con fuentes
reales relevantes: código, tests, configuración, ADRs y tracker cuando esté
disponible. Una fecha antigua por sí sola no prueba staleness.

Para standards:

- usar `standards/registry.yml` del plugin solo como catálogo metadata-only;
- si `agteamos/standards/` todavía no existe, resolver pendientes desde
  `onboarding.yml` sin materializar índices;
- unir los custom topics declarados en
  `agteamos/standards/registry.yml`, si existe;
- exigir que cada `id` coincida con su `folder`;
- usar `index.meta.yml` para estado operativo;
- usar `standards.yml` para clasificación semántica.

Para human docs, revisar únicamente:

```text
README.md
CHANGELOG.md
docs/architecture.md
docs/operations.md
```

Leer sus marcadores `agteamos:managed:*`, `Sources` y `Last verified`.
Contrastar cada sección con los paths declarados bajo `agteamos/`. Un source
que cambió después de `Last verified`, desapareció o quedó `stale` vuelve
stale esa sección. Contenido fuera de marcadores no participa del diagnóstico.

## Paso 2 — Clasificar

| Resultado | Criterio |
|---|---|
| `FALTA` | No existe y tampoco está declarado lazy |
| `PENDIENTE (lazy)` | `onboarding.yml` o `index.meta.yml` lo marca `pending` |
| `STALE` | Existe y evidencia relevante cambió desde las fuentes registradas, o `index.meta.yml` dice `stale` |
| `OK` | Existe y sigue respaldado por las fuentes citadas |
| `N/A` | No aplica al proyecto |

`PENDIENTE (lazy)` es información, no una falla. Reportarlo agrupado y no
ofrecer generar cada entrada automáticamente.

Los únicos estados de runtime para topics en `index.meta.yml` son:

```text
done | pending | stale
```

Las únicas clasificaciones de `standards.yml` son:

```text
observed | mixed | intentional-deviation | pending
```

No reflejar automáticamente una clasificación en el runtime: un documento
puede estar `done` y clasificado `mixed`.

## Paso 3 — Migrar referencias legacy

La compatibilidad es conservadora: proyectos antiguos no se regeneran.

1. Detectar rutas, nombres o campos históricos; no seguir enlaces a
   presuntos standards prescriptivos del plugin.
2. Si el artefacto actual es legible, conservarlo y tratarlo como contenido
   project-owned.
3. Eliminar o ignorar campos de “referencia del plugin” al tocar el documento.
   Reemplazarlos por fuentes reales en `Provenance` y `Evidence`.
4. Canonicalizar aliases al `id`/`folder` del registry sin duplicar carpetas.
5. Preservar custom topics y registrar su metadata local.
6. Normalizar estados históricos:
   - `applies` solo puede migrar a `observed` si hay evidencia del proyecto;
     de lo contrario queda `pending`;
   - `adapted` migra a `mixed` únicamente si el documento separa lo observado
     de la decisión del equipo; si no, queda `pending`;
   - `deviates` migra a `intentional-deviation` solo con decisión humana
     explícita; si falta, queda `mixed` o `pending`.
7. Completar la estructura nueva solo cuando ese tema sea aprobado para
   mantenimiento. No reescribir todos los temas.
8. Tratar `agteamos/tracker/*.md` como override legacy/custom. Los adapters
   genéricos viven en `agteamos-work-items`; no regenerar copias locales.

Las referencias legacy que no afectan lectura o resolución pueden simplemente
ignorarse hasta que el tema se toque.

Los directorios vacíos legacy pueden incluirse en una propuesta de limpieza,
pero solo mediante dry-run con paths exactos y aprobación. Nunca borrarlos
automáticamente ni confundir una carpeta no vacía con residuo.

## Paso 4 — Reportar antes de escribir

Mostrar:

1. `FALTA` y `STALE`, con la evidencia que justificó el diagnóstico;
2. un resumen de `PENDIENTE (lazy)`;
3. migraciones legacy propuestas;
4. secciones human docs stale, con sus sources;
5. archivos exactos que cambiarían.

Pedir confirmación antes de sobreescribir o reestructurar. ADRs, RFCs y logs
de decisiones son append-only.

## Paso 5 — Actualizar solo lo aprobado

- Mantener el scope mínimo.
- Si se aprueba redescubrir un topic, cargar `DISCOVER.md` entonces y procesar
  uno solo en ese step.
- No cargar `DISCOVER.md` para topics `OK` ni para pendientes que nadie
  necesita.
- Actualizar fuentes, fecha y confidence sin borrar historia útil.
- Para human docs aprobadas, cargar `HUMAN-DOCS.md` y ejecutar
  `--human-docs --scope changed`; mostrar el diff antes de reemplazar cada
  sección administrada existente.
- Ejecutar los checks aplicables al archivo cambiado.

## Modo adicional: `--maintain --release`

Este modo es manual y separado del cierre normal. Nunca se dispara
automáticamente al archivar una tarea.

### R1 — Inventario read-only

Ejecutar primero:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-release-inventory.mjs" \
  --root "<project-root>" --json
```

El inventario puede proponer:

- cambios `done`/`abandoned` varados fuera de archive, solo con gates/record
  válidos;
- documentos/onboarding y standards marcados `stale`;
- regeneración de `dashboard.html`/`report.html`;
- archivos exactos de `.cache`;
- temporales o carpetas vacías únicamente como `review_only`.

Es una lectura. No mueve, borra, refresca ni regenera nada. Un cambio parcial,
un final sin gates o una ruta protegida queda `blocked`/`preserved`.

### R2 — Dry-run exacto

Mostrar cada acción con su ID estable:

```markdown
# Release Maintenance — Dry Run
- RC-001 archive-stranded-change
  - From: <path>
  - To: <path>
  - Reason: <gate observado>
- RC-002 remove-cache-file
  - Path: <archivo exacto>
  - Reason: cache regenerable

## Preserved
- specs, decisions, tracker-result/abandon-record/verify-report
- cambios activos/parciales

¿Qué IDs apruebas ejecutar exactamente?
```

No convertir `review_only` en borrado ejecutable sin investigar y mostrar un
nuevo dry-run. No usar globs, “todo cache” ni aprobación implícita.

### R3 — Aplicar solo IDs aprobados

Inmediatamente antes de cada acción, releer path y precondiciones:

- `archive-stranded-change`: revalidar status, phase, merge/ticket o
  abandon-record; mover la carpeta completa al target aprobado sin eliminar
  branch/artefactos;
- `refresh-stale-artifact`: cargar el módulo propietario; un standard usa
  `DISCOVER.md` y se procesa máximo uno por step, human docs usan
  `HUMAN-DOCS.md`;
- `rediscover-stale-standard`: redescubrir solo ese topic;
- `regenerate-derived-html`: usar `agteamos-dashboard`, nunca editar HTML;
- `remove-cache-file`: borrar únicamente el archivo exacto aprobado dentro de
  `agteamos/.cache/`.

Si target, contenido relevante, gate o action ID cambió, detenerse, regenerar
el inventario y pedir aprobación otra vez. Al primer fallo, detener acciones
restantes; no compensar ni ampliar scope.

### R4 — Preservación no negociable

- Nunca borrar/modificar specs maestras, ADRs/RFCs/decision logs,
  `tracker-result.md`, `verify-report.md` o `abandon-record.md`.
- Nunca limpiar cambios `pending|in_progress|in_review|ABANDONING`.
- Nunca hacer reset, checkout destructivo, borrado de branch o sync de
  deltas/knowledge parcial.
- Un cambio abandonado se archiva como abandonado; no se reclasifica `done`.

### R5 — Verificación

Releer cada path, reportar `applied|verified|failed|unexecuted` por ID y
ejecutar validator/status. Regenerar el inventario para mostrar residuos,
pero no ejecutar las acciones nuevas sin otra aprobación.

## Documentación mantenida

- El código explica el qué; comentarios y docs explican decisiones, límites y
  edge cases.
- Usar Mermaid cuando una relación no trivial se entienda materialmente mejor
  como flujo, secuencia, arquitectura, estados o modelo de datos.
- El README raíz resume solo lo verificable y mantiene `agteamos/` como fuente.
- Una decisión técnica significativa se documenta mediante
  `agteamos-decisions`.

## Anti-patrones

- Declarar “todo OK” sin contrastar fuentes reales.
- Regenerar `agteamos/` entero por un gap.
- Confundir lazy con roto.
- Cambiar todos los topics durante una migración.
- Convertir recomendaciones externas en reglas del proyecto.
- Sobreescribir historia de decisiones.
- Tratar human docs derivadas como una segunda fuente de verdad.
