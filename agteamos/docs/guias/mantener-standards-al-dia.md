# Mantener los standards al día (`agteamos-knowledge`)

`agteamos/standards/` documenta convenciones descubiertas en el proyecto y no
existe todavía después de L0. El
plugin solo aporta siete lentes metadata-only en `standards/registry.yml`; no
hay reglas base que copiar o contra las que calificar el código. Ver
[Capa de standards](../conceptos/filosofia-y-arquitectura.md#capa-de-standards).

## Cuándo correrla

- `--init`: registra los siete topics como `pending` en `onboarding.yml`, sin
  crear `standards/`.
- `--discover <id> [--scope <paths>]`: descubre un topic cuando una tarea lo
  necesita (`--topic` es alias compatible).
- `--maintain`: revisa evidencia, referencias legacy y staleness.
- `--maintain --release`: inventario/dry-run manual de cierres varados,
  derivados, cache y huérfanos; nunca limpieza automática.
- `--learn`: registra una convención confirmada durante el trabajo.
- `--human-docs`: revisa staleness de los cuatro outputs humanos derivados.

## Qué hace

1. Resuelve un `id`/folder canónico desde el registry y custom topics locales.
2. Lee 5-10 archivos representativos de código, tests, config y ADRs.
3. Separa claims `Observed`, `Decided` y `External`.
4. Escribe `README.md`, `examples.md` opcional y `deviations.md` solo para una
   desviación intencional confirmada.
5. En el primer discovery crea `standards/` y los manifests mínimos; después
   actualiza solo el topic procesado.

## Clasificación y estado runtime

| Clasificación (`standards.yml`) | Significa |
|---|---|---|
| `observed` | Convenciones activas respaldadas por evidencia del proyecto |
| `mixed` | Coexisten patrones o quedan decisiones abiertas |
| `intentional-deviation` | Desviación confirmada respecto de una decisión o restricción explícita |
| `pending` | Evidencia insuficiente |

`index.meta.yml` usa otro eje: `done | pending | stale`. Un topic puede estar
`done` y ser semánticamente `mixed` o `pending`.

## Provenance y confidence

Cada README descubierto contiene:

```markdown
# API Design

## Provenance
- Date: 2026-09-25
- Confidence: high
- Observed: ...
- Decided: ...
- External: ...

## Current conventions
## Evidence
## Team decisions
## Migration path
## Learned in use
```

Confidence nunca convierte una fuente externa en regla. Con evidencia
insuficiente, documentar límites y clasificar `pending`.

## `standards.yml` — el manifest

```yaml
standards:
  - id: api-design
    folder: api-design
    classification: observed
    confidence: high
    last_checked: 2026-09-25
  - id: security
    folder: security
    classification: mixed
    confidence: medium
```

`agteamos-dashboard` combina este archivo con `index.meta.yml` y muestra
discovery/staleness, por ejemplo `3/7 topics discovered · 1 stale`.

## `index.yml` — encontrar el estándar relevante sin escanear todo

```yaml
api: api-design/
rest: api-design/
auth: security/
jwt: security/
migrations: database/
postgres: database/
react: frontend/
component: frontend/
git: entrega-y-operaciones/
devops: entrega-y-operaciones/
```

Cuando ya existe, `agteamos-knowledge --inject <intent|paths>` consume este índice y devuelve
solo paths project-owned relevantes.
Antes del primer discovery resuelve candidatos desde el registry del plugin y
`onboarding.yml`; nunca devuelve un path inexistente.

## Higiene manual de release

`--maintain --release` comienza con
`scripts/agteamos-release-inventory.mjs --json`. El inventario es read-only y
asigna IDs a paths/targets exactos. Solo se ejecutan IDs aprobados; si cambia
una precondición se repite el dry-run. Specs, ADRs/decisions, receipts y
trabajo parcial se preservan siempre. Temporales y carpetas vacías quedan
`review_only` hasta que una persona los clasifica.

## Errores comunes a evitar

- Leer subdirectorios prescriptivos del plugin como baseline.
- Marcar `intentional-deviation` sin confirmación humana.
- Convertir documentación externa en convención del proyecto.
- Escribir `standards.yml` fuera de `agteamos/standards/` (en la raíz de `agteamos/`, por ejemplo).
- Correr esta skill en un repo vacío — para eso está `agteamos-bootstrap`/`agteamos-setup`, no `agteamos-knowledge`.
