# Estructura lazy del proyecto

AgTeamOS no instala un árbol completo. La fuente ejecutable es
[`contracts/project-layout.json`](../../contracts/project-layout.json): define
dos perfiles iniciales y los triggers que materializan el resto.

Regla única:

> La skill que escribe el primer archivo crea su directorio padre. No existen
> carpetas vacías ni placeholders “por si acaso”.

## Proyecto existente: `adopted_l0`

`agteamos-knowledge --init` crea:

```text
agteamos/
├── platform.yml
├── onboarding.yml
└── architecture/
    └── PROJECT_CONTEXT.md
```

`onboarding.yml` usa:

```yaml
layout_contract: "1"
profile: adopted_l0
mode: lazy
lifecycle: initialized
```

Topics y dominios candidatos se registran ahí. No se crean `standards/`,
`specs/` ni sus índices.

## Proyecto nuevo: `greenfield_phase0`

Bootstrap crea únicamente este baseline (y `product/market-research.md` solo
si el research opt-in fue aprobado):

```text
agteamos/
├── platform.yml
├── onboarding.yml
├── architecture/
│   ├── PROJECT_CONTEXT.md
│   └── adr/
│       └── ADR-001-<slug>.md
└── product/
    ├── mission.md
    ├── kpis.md
    └── roadmap.md
```

El scaffold de código y CI vive en las rutas naturales del stack. Bootstrap
no crea backlog, tickets, `devops/`, design system ni documentación pública
operacional.

El README raíz es la única vista humana evaluada durante bootstrap. No es
estado canónico.

## Cuándo aparece cada carpeta

| Path | Trigger |
|---|---|
| `product/backlog.md` | El usuario pide guardar/importar/gestionar el primer item |
| `product/market-research.md` | Research opt-in y aprobación posterior del contenido con fuentes |
| `standards/` | Primer intent/path que requiere discovery de un topic |
| `specs/` | Primera tarea full que confirma una spec de dominio |
| `changes/<id>-<slug>/` | Inicio de la primera tarea trazable |
| `changes/archive/` | Cierre de la primera tarea |
| `design/` | Primer trabajo UI que necesita design system |
| `devops/` | Primer cambio real de CI/CD, infraestructura o deploy |
| `security/` | Primera auditoría, threat model o tarea sensible |
| `incidents/` | Primer incidente/runbook/playbook real |
| `decisions/` | Primer RFC, premortem o decisión formal fuera de ADR |
| `quality/` | Primer reporte persistente o señal real de deuda |
| `tracker/` | Override de provider personalizado y aprobado |
| `.cache/` | Estado runtime de hooks; nunca se commitea |

Al materializar el primer artefacto, `onboarding.yml.lifecycle` pasa de
`initialized` a `active` y la entrada concreta cambia a `done`.

## Árbol eventual

Un proyecto puede llegar a tener este árbol, pero solo después de usar cada
capacidad:

```text
agteamos/
├── platform.yml
├── onboarding.yml
├── dashboard.html                     # generado, no commiteado
├── product/
│   ├── mission.md
│   ├── kpis.md
│   ├── market-research.md              # solo research opt-in aprobado
│   ├── roadmap.md
│   └── backlog.md
├── architecture/
│   ├── PROJECT_CONTEXT.md
│   ├── SRS.md                         # solo opt-in
│   └── adr/
├── design/
│   └── DESIGN_SYSTEM.md
├── devops/
│   ├── INFRASTRUCTURE.md
│   ├── SLO.md
│   └── prr/
├── security/
│   └── threat-models/
├── incidents/
│   ├── post-mortems/
│   ├── runbooks/
│   └── playbooks/
├── decisions/
│   ├── decision-log.md
│   └── rfcs/
├── standards/
│   ├── registry.yml                   # custom topics, opcional
│   ├── standards.yml
│   ├── index.yml
│   ├── index.meta.yml
│   └── <topic>/
│       ├── README.md
│       ├── examples.md                # opcional
│       └── deviations.md              # opcional
├── specs/
│   ├── index.yml
│   └── <dominio>.md
├── quality/
│   └── debt-trend.yml
├── tracker/
│   └── <custom-provider>.md            # override, no default
└── changes/
    ├── <id>-<slug>/
    │   ├── task.yml
    │   ├── progress.md
    │   ├── tracker-result.md           # si hubo mutación externa; sanitizado
    │   ├── abandon-record.md           # solo salida ABANDONED
    │   ├── verify-report.md
    │   ├── knowledge-base.md
    │   ├── evidence/
    │   └── specs/                      # solo schema full
    └── archive/
```

La especificación OpenAPI permanece donde el proyecto la define. AgTeamOS no
crea una carpeta `api/` paralela.

## Human docs derivadas

Fuera de `agteamos/` pueden existir:

```text
README.md
CHANGELOG.md
docs/
├── architecture.md
└── operations.md
```

Bootstrap solo selecciona `README.md`. CHANGELOG aparece tras un cierre
verificado; `docs/` aparece cuando arquitectura u operaciones tienen fuentes
estables. Los marcadores administrados citan `Sources` y `Last verified`.

## Providers

GitHub, Azure Boards y Planner se ejecutan desde módulos versionados en
`skills/work-items/`. `platform.yml` guarda configuración del proyecto.
`agteamos/tracker/` no aparece salvo que exista un override custom; los
adapters v3 copiados se preservan como legacy.

## Control de versiones

Se commitea el estado canónico materializado. Se ignoran:

```text
agteamos/dashboard.html
agteamos/changes/**/report.html
agteamos/.cache/
```

No se commitean carpetas vacías.

## Estado global del usuario

Fuera de cualquier repositorio, AgTeamOS mantiene:

```text
~/.claude/agteamos/
├── projects.yml                 # registro canónico de proyectos
├── portal.html                  # vista global derivada y regenerable
└── plugin-feedback.md           # outbox durable del plugin, si existe
```

`portal.html` se crea al pedir `agteamos-dashboard --portal` y se refresca
best-effort tras setup, captura de backlog y cierre. Su generación solo lee
fuentes allowlisted de cada root; nunca crea carpetas dentro de los proyectos.

## Compatibilidad v3

Un proyecto anterior con `standards/`, `specs/` o `tracker/` sigue siendo
válido. `agteamos-knowledge --maintain` puede proponer:

- migrar metadata al contrato nuevo al tocarla;
- tratar adapters locales como overrides;
- eliminar directorios realmente vacíos mediante dry-run.

Nunca elimina ni reestructura contenido automáticamente.

## Verificación

```bash
node <plugin>/scripts/agteamos-validate.mjs --root <proyecto> --strict
node <plugin>/scripts/agteamos-status.mjs --root <proyecto> --json
```

Ver [Contratos ejecutables y provider doctor](../guias/contratos-y-doctor.md).
