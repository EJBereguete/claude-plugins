# Módulo `--init`

Leer este módulo únicamente cuando la invocación sea `--init` o cuando
`--maintain` determine que `agteamos/` no existe y el usuario acepte iniciar el
onboarding. No cargar los otros módulos por anticipado.

## Contrato

- **Input**: repositorio con código real y sin `agteamos/`, o con onboarding
  incompleto.
- **L0 (default)**: contexto mínimo y un único manifest para trabajo lazy.
- **L1**: un artefacto diferido cuando una tarea real lo necesita.
- **L2 (`--init --full`)**: generación explícita de todos los artefactos
  aplicables; no es el default.
- **Responsable**: `@architect` coordina; cada agente de dominio genera su
  artefacto L1.

Si el repositorio está vacío, detener este modo y usar `agteamos-bootstrap`.

## Paso 1 — Detectar el proyecto

Ejecutar primero `agteamos-router`. Reutilizar su detección de stack,
frameworks, base de datos, CI/CD, estructura y trabajo activo. No continuar
hasta completar su checklist.

## Paso 2 — Elegir nivel

- Usar L2 solo con `--full` o un pedido inequívoco de documentar todo ahora.
- En cualquier otro caso usar L0, sin preguntar.
- L0 debe terminar rápido, con 0-1 preguntas y sin leer código de negocio de
  forma exhaustiva.

## Paso 3 — Crear L0

### 3.1 `agteamos/architecture/PROJECT_CONTEXT.md`

Leer manifests, comandos canónicos y un árbol de dos niveles. Escribir:

1. header de honestidad;
2. stack con versión y fuente;
3. comandos de test, lint, build y desarrollo tomados de configuración real;
4. mapa breve de módulos;
5. `Gotchas`, inicialmente vacío.

No inventar URLs, deuda, ADRs ni decisiones. Un valor no confirmado se marca
como inferido.

### 3.2 `agteamos/platform.yml`

Detectar remotos, ramas, CI/CD y destino de deploy como lo hace
`agteamos-setup` Ronda 0. Marcar los campos como `detected`, no `confirmed`.
No repetir el cuestionario completo de setup.

### 3.3 `agteamos/onboarding.yml`

Crear el encabezado contractual:

```yaml
layout_contract: "1"
profile: adopted_l0
mode: lazy
lifecycle: initialized
```

Declarar cada artefacto diferible con `path`, `status`, `trigger` y owner
cuando aplique. Los dominios de specs usan `candidate`; los demás artefactos
diferidos usan `pending`. La fuente ejecutable del layout es
`contracts/project-layout.json`.

### 3.4 Registrar los siete temas sin crear `standards/`

La única fuente empaquetada es `standards/registry.yml`. Leer sus siete
entradas; no buscar frontmatter ni reglas en README del plugin.

Por cada entrada:

- conservar exactamente `id` y `folder`; deben estar alineados;
- copiar metadata de descubrimiento (`description`, `keywords`, `globs`,
  `first_consumers` y `aliases`);
- crear la entrada `standards.<id>` en `onboarding.yml` con `status: pending`,
  `path`, `trigger` y metadata mínima de resolución;
- no crear `agteamos/standards/`, sus índices ni carpetas de topics en L0.

`index.meta.yml` solo admite estado operativo `done | pending | stale`.
`standards.yml` solo admite clasificación
`observed | mixed | intentional-deviation | pending`.

Esos manifests se materializan con el primer `--discover`: se crea la carpeta,
se escribe el topic procesado y se generan índices solo con entradas reales.
El registry aporta lentes iniciales, no reglas.

### 3.5 Registrar dominios candidatos sin crear `specs/`

Proponer dominios desde carpetas o módulos reales. Guardarlos como
entradas `spec.<dominio>` de `onboarding.yml`, con `candidate` y evidencia,
sin crear `agteamos/specs/`, specs ni índices. El primer dominio confirmado
crea `specs/index.yml` y su spec en una misma operación acotada.

### 3.6 `.gitignore`

Agregar, sin duplicar:

```text
agteamos/dashboard.html
agteamos/changes/**/report.html
agteamos/.cache/
```

### 3.7 Cierre

Informar en no más de tres líneas qué se detectó, cuántos temas y dominios
quedaron pendientes y cómo pedir `--init --full`.

## Paso 4 — L1 bajo demanda

Cada consumidor usa `ensure-artifact(<clave>)` antes de leer. Se genera como
máximo un artefacto por step:

| Artefacto | Disparador | Generación acotada |
|---|---|---|
| `standards/<id>/` | keyword/glob/intent de una tarea | Crear `standards/` + manifests mínimos y ejecutar `--discover <id> --scope <paths>` |
| `specs/<dominio>.md` | tarea que toca un dominio `candidate` | Confirmar el nombre; crear `specs/index.yml` + solo ese dominio |
| `design/DESIGN_SYSTEM.md` | primer trabajo de UI que necesita tokens | Extraer tema, tokens y componentes reales |
| `devops/INFRASTRUCTURE.md` | deploy o cambio de contenedores/CI | Extraer configuración real; DORA/SLO siguen siendo explícitos |
| `product/roadmap.md` | captura o pedido explícito | Derivar de README, roadmap, changelog y tracker |
| Human docs | README en bootstrap; CHANGELOG/cambios arquitectónicos/operación en sus triggers | Cargar `HUMAN-DOCS.md` y seleccionar solo outputs con fuentes estables |
| ADR | `agteamos-decisions` | Nunca crear ADR retroactivo automáticamente |
| labels del tracker | primer change set que las necesita | Proponer dentro del change set; nunca precrear |

`post-write-checks.js` puede detectar el tema por los globs del registry y
señalar `ensure-artifact`. `session-start.js` presenta el índice del proyecto.
Ambos consumen metadata; ninguno convierte el registry en reglas del proyecto.
Las human docs no consumen registry: se derivan de artefactos canónicos ya
verificados bajo `agteamos/`.

### Siembra de una spec candidata

1. Exigir evidencia real para el dominio.
2. Confirmar el nombre antes de crear el archivo.
3. Escribir `Estado: seeded`, confidence, fuentes, cobertura y límites.
4. Crear o actualizar `specs/index.yml` únicamente con dominios
   materializados.
5. Cada requirement debe citar código observable.
6. Mantener `No cubre todavía` no vacío.
7. Pasar el dominio a `seeded` en onboarding y en el índice.

Nunca marcar una spec recién sembrada como `partial` o `complete`.

## Paso 5 — L2 explícito

Ejecutar los generadores aplicables de L1 de forma secuencial y dejar
`onboarding.yml` en `mode: full`. Para standards:

1. procesar un tema a la vez;
2. cargar `DISCOVER.md` solo al comenzar ese tema;
3. descubrir sobre 5-10 archivos reales;
4. no cargar `MAINTAIN.md`, `INJECT.md` ni `LEARN.md`;
5. no crear artefactos que no aplican al proyecto.

La generación completa no relaja el contrato de honestidad ni permite declarar
`complete` sin confirmación.

Al terminar L2, ejecutar `--human-docs --scope all`. En L0 de un proyecto
existente, sembrar en `onboarding.yml` las cuatro entradas
`human_docs.readme`, `human_docs.changelog`, `human_docs.architecture` y
`human_docs.operations` como `pending`; no generar documentación pública con
contexto todavía insuficiente.

## Compatibilidad

Un proyecto anterior no se regenera durante init. Si ya existe `agteamos/`,
preservar contenido y derivar el trabajo pendiente; las referencias legacy se
tratan en `--maintain`.

## Anti-patrones

- Crear carpetas vacías “por si acaso”.
- Sembrar temas desde README/frontmatter del plugin.
- Tratar metadata del registry como reglas aprobadas.
- Generar todos los temas durante L0.
- Crear `standards/`, `specs/` o `tracker/` durante L0.
- Escanear todo el repo para un artefacto acotado.
- Crear specs o labels sin confirmación.
