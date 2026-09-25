# Módulo `--discover`

Leer este módulo únicamente para:

- `--discover <id> [--scope <paths>]`;
- el alias compatible `--topic <id> [--scope <paths>]`;
- un único `ensure-artifact(standards.<id>)` que haya decidido generar el
  consumidor en el step actual.

No cargar módulos de init, mantenimiento, inyección o aprendizaje.

## Contrato

- **Input**: un topic y un proyecto con código real.
- **Output**:
  `agteamos/standards/<folder>/README.md`, `examples.md` cuando aporte valor,
  `deviations.md` solo para una desviación intencional confirmada, y las
  entradas del topic en los manifests.
- **Scope de evidencia**: 5-10 archivos representativos.
- **Propiedad**: todo resultado pertenece al proyecto; el plugin no aporta un
  standard base para comparar ni copiar.

`--topic` no tiene semántica propia: normalizarlo inmediatamente a
`--discover`.

## Paso 1 — Resolver el topic

1. Leer `standards/registry.yml` del plugin como catálogo metadata-only.
2. Leer `agteamos/standards/registry.yml` si contiene custom topics locales.
3. Resolver por `id` o `aliases`.
4. Escribir siempre en el `folder` canónico.
5. Exigir `id == folder`. Un alias nunca crea otra carpeta.

Si el intent no coincide con un topic inicial, proponer un custom topic. Con
aprobación, agregar metadata local (`id`, `folder`, `description`, `keywords`,
`globs`, `first_consumers`, `aliases`) y mantener `id` y `folder` iguales.
No modificar el registry del plugin.

Los topics del registry son lentes para encontrar evidencia, no reglas.

## Paso 2 — Seleccionar evidencia

Elegir entre 5 y 10 archivos, en este orden:

1. paths pasados por `--scope`;
2. código representativo que coincide con globs o keywords;
3. tests que demuestran comportamiento;
4. configuración que demuestra herramientas o restricciones;
5. ADRs o logs de decisiones que explican intención.

Buscar variedad suficiente para evitar inferir una convención desde un único
ejemplo accidental. No escanear todo el repo. Registrar los paths y, cuando
sea útil, símbolos o secciones concretas.

Fuentes externas pueden explicar una restricción de framework, regulación o
contrato, pero no se convierten en regla del proyecto por sí solas.

## Paso 3 — Separar verdad, decisión y referencia

Cada afirmación debe tener una proveniencia:

- **Observed**: visible en código, tests, config o historia del proyecto.
- **Decided**: aprobada explícitamente por el equipo o registrada en un ADR.
- **External**: proviene de documentación, regulación o una dependencia.

No llamar “best practice” a una regla del proyecto sin aprobación. Si algo
externo parece deseable, ponerlo como propuesta o pregunta en `Team decisions`,
no en `Current conventions`.

Hacer como máximo 1-2 preguntas cuando:

- conviven patrones incompatibles;
- no se puede distinguir accidente de convención;
- hace falta saber si una desviación es intencional.

No preguntar si la evidencia ya es clara.

## Paso 4 — Clasificar el topic

`standards.yml` admite:

| Clasificación | Uso |
|---|---|
| `observed` | Las convenciones activas están respaldadas por evidencia del proyecto |
| `mixed` | Coexisten convenciones, hay una combinación de observado/decidido, o quedan decisiones abiertas |
| `intentional-deviation` | El equipo confirmó una desviación respecto de una restricción o decisión explícita |
| `pending` | La evidencia no alcanza para describir una convención utilizable |

No existe `applies`, `adapted` ni `deviates` en el esquema nuevo.
`intentional-deviation` requiere confirmación humana; nunca se infiere.

La clasificación semántica es independiente del estado operativo:

- `index.meta.yml: done`: el artefacto de discovery fue generado y puede
  leerse, incluso si documenta una situación `mixed` o `pending`;
- `pending`: aún no se ejecutó discovery;
- `stale`: cambió evidencia relevante desde la revisión.

## Paso 5 — Escribir la estructura obligatoria

`README.md` debe ser breve y contener exactamente estas secciones de primer
nivel, en este orden:

```markdown
# <Nombre del topic>

## Provenance
## Current conventions
## Evidence
## Team decisions
## Migration path
## Learned in use
```

### Provenance

Incluir fecha, confidence, scope revisado y una separación explícita de claims
`Observed`, `Decided` y `External`. No presentar inferencias como hechos.

### Current conventions

Describir solo cómo trabaja hoy el proyecto o qué decisión aprobó el equipo.
Usar nombres y paths reales. Si hay dos patrones, documentar ambos.

### Evidence

Citar los 5-10 archivos y qué demuestra cada uno. Una lista compacta o tabla
es suficiente; no duplicar fragmentos grandes.

### Team decisions

Registrar decisiones confirmadas y preguntas pendientes. Una recomendación
externa queda aquí como propuesta hasta recibir aprobación.

### Migration path

Dejar “No migration agreed” si no hay cambio aprobado. Si lo hay, describir
estado actual, destino decidido, pasos graduales y compatibilidad. Discovery
no crea una migración solo porque encontró inconsistencia.

### Learned in use

Preservar entradas de `--learn`. Si no hay, dejar una nota breve; nunca borrar
historial al redescubrir.

## Paso 6 — Archivos auxiliares

- `examples.md`: máximo tres fragmentos pequeños de código real del proyecto,
  con path y motivo. Omitirlo si repite `Evidence`.
- `deviations.md`: crear solo para `intentional-deviation`, citando la
  restricción/decisión respecto de la cual se desvía, quién lo confirmó y su
  impacto. No existe un baseline del plugin.
- Mantener cada README enfocado; dividir un custom topic si deja de ser una
  unidad coherente.

## Paso 7 — Actualizar manifests

Si es el primer discovery, crear `agteamos/standards/` al escribir el
`README.md` y materializar los tres manifests. No sembrar los otros seis
topics: permanecen exclusivamente en `onboarding.yml` y en el registry del
plugin hasta que se usen.

Actualizar solo el topic procesado:

1. `agteamos/standards/standards.yml`: clasificación, fecha, confidence y
   fuentes principales.
2. `agteamos/standards/index.yml`: keywords y aliases hacia `<folder>/`.
3. `agteamos/standards/index.meta.yml`: description y runtime `done`.
4. `agteamos/onboarding.yml`: `standards.<id>` pasa a `done` y registra fecha.
5. `agteamos/onboarding.yml.lifecycle` pasa a `active`.

No reescribir entradas de otros topics. Si la evidencia es insuficiente, el
README puede quedar operativo `done` con clasificación `pending` y límites
claros; futuras ediciones relevantes podrán marcarlo `stale`.

## Reporte

Informar topic, clasificación, archivos creados/actualizados, evidencia leída
y decisiones pendientes. Luego volver al consumidor que disparó discovery.

## Anti-patrones

- Comparar con o copiar rules/examples del plugin.
- Derivar reglas solo del nombre del framework.
- Leer menos de cinco archivos y declarar una convención fuerte.
- Exceder diez archivos para perseguir certeza total.
- Convertir `External` en `Current conventions` sin aprobación.
- Generar más de un topic por un `ensure-artifact` del step.
- Reemplazar entradas de `Learned in use`.
