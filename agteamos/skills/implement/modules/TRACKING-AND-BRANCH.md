# TRACKING AND BRANCH

Carga este módulo solo en `TRACKING` o `BRANCH`. Mantén `task.yml` y
`progress.md` como fuentes de estado entre sesiones.

## 1. Inicializar o completar tracking

Ruta canónica:

```text
agteamos/changes/<id>-<slug>/
├── task.yml
├── brief.md                 # solo full si vino de agteamos-task
├── progress.md
├── tracker-result.md        # si hubo mutaciones externas verificadas
├── evidence/
├── report.html              # derivado, nunca versionado
└── specs/                   # solo schema: full
    ├── requirements.md
    ├── design.md
    ├── tasks.md
    └── deltas/<dominio>.md
```

`verify-report.md` aparece durante el cierre. `abandon-record.md` aparece
solo en la salida alternativa de abandono. Para crear los archivos, carga
`TEMPLATES.md` como estado temporal `NEEDS_TEMPLATE`; no mantengas ambos
módulos cargados.

### Schema

Aplica la decisión canónica de `agteamos-spec`:

- `full`: comportamiento observable nuevo/modificado, feature, 2+ capas o
  impacto de contrato; exige los cuatro artefactos SDD.
- `lite`: cambio interno y acotado; solo resumen en `progress.md` y test de
  regresión. No crea delta ni toca spec maestra.

Si un `lite` descubre impacto de contrato, detén la ejecución y promuévelo a
`full` antes de seguir.

### Owner y handoffs

Al crear `task.yml`, captura sin preguntar:

```bash
git config user.name
git config user.email
```

`owner` es una persona y queda inmutable; `assigned_to` contiene agentes. Si
otra persona retoma la tarea, añade `{name, email, date}` a `handoffs` sin
sobrescribir `owner`. Usa el email si el nombre es vacío/genérico; pregunta
una sola vez solo si ambos fallan.

### Campos mínimos

Conserva, además de los campos exigidos por el validador:

- `id`, `title`, `type`, `schema`, `context_tier`;
- `layer`, `priority`, `risk`, `risk_reason`, `status`, `branch`;
- `repo_host`, `tracker`, `ticket_url`, `domains`, `doc_impact`;
- `workflow_contract: "3"`, `phase`, cinco booleans de entrega, más
  `risk_review_approved: false`, `reviewed_sha: null` y
  `risk_review_sha: null`;
- `created`, `updated`, `owner`, `handoffs`, `assigned_to`, `depends_on`.

`context_tier` aplica la definición canónica de `agteamos-context`: por
defecto `lite → 1`, `full → 2`; solo puede subir. Documenta cada elevación en
`progress.md`.

### Riesgo verificable

Clasificar sin preguntar cuando la evidencia alcanza:

- `standard`: cambio acotado, reversible y sin señales elevadas;
- `high`: auth/autorización, pagos, datos sensibles, migración/backfill,
  infraestructura productiva, contrato público/cross-repo o blast radius
  amplio;
- `critical`: posible bypass/exposición, dinero o datos irreversibles,
  operación productiva crítica sin rollback probado o impacto sistémico.

`risk_reason` cita señales concretas y rollback/blast radius. Severidad,
prioridad, tamaño y schema no sustituyen riesgo. Recalcular si el diff cambia;
nunca bajar el nivel sin registrar la evidencia que dejó de aplicar.

## 2. Reglas de checkpoint

Actualiza inmediatamente, no al final:

1. al iniciar/completar una unidad;
2. al modificar archivos o escribir tests;
3. al decidir o cambiar el approach;
4. antes de una operación riesgosa;
5. al 80% del contexto;
6. después de cada `RECONCILE`.

En cada checkpoint:

- actualiza `task.yml.updated` y `progress.md` (`Last checkpoint`);
- registra archivos, tests/resultados, decisiones y evidencia;
- deja `Next Action` ejecutable por alguien sin contexto previo;
- conserva el último estado `RECONCILE`;
- invoca `agteamos-dashboard` para regenerar `report.html`.

`report.html` y `agteamos/dashboard.html` son derivados y no se commitean.

## 3. Crear o recuperar branch

Precondiciones:

1. DoR `READY`;
2. no existe branch activo para el mismo ID;
3. working tree y cambios ajenos entendidos; nunca descartarlos;
4. rama base obtenida de `agteamos/platform.yml`/estrategia real, no asumida.

Actualiza la base de forma no destructiva y crea:

| Tipo | Branch |
|---|---|
| feature | `feature/<id>-<slug>` |
| bug | `bugfix/<id>-<slug>` |
| hotfix | `hotfix/<id>-<slug>` |
| refactor | `refactor/<id>-<slug>` |
| spike | `spike/<id>-<slug>` |
| subtarea | `feature/<parent-id>/<sub-id>-<slug>` |

Usa minúsculas, guiones, ID trazable y slug de máximo 60 caracteres. Si el
branch ya existe y corresponde a la tarea, retómalo; no crees un duplicado.
Escribe el nombre definitivo en `task.yml`.

Regla de PR: **1 change = 1 branch = 1 PR**. Código, delta y spec maestra
sincronizada viajan juntos.

## Condición de salida

- `schema: full` y falta algún artefacto/aprobación → `DESIGN`.
- `schema: lite` o diseño full aprobado, con trabajo pendiente → `IMPLEMENT`.
- Inconsistencia entre tracking y repo → corrígela, registra checkpoint y
  vuelve al dispatcher; no avances con estado ambiguo.
