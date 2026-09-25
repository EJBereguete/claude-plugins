# Contratos ejecutables y provider doctor

AgTeamOS usa contratos versionados:

- `contracts/project-layout.json`: perfiles de inicio, artefactos lazy,
  triggers, runtime y compatibilidad.
- `contracts/workflow.json`: schemas de tarea, fases, dependencias y gates
  durables; v3 añade riesgo/SHA y abandono, y lee tareas v2.
- `contracts/context-budget.json`: tiers, bytes y fórmula de tokens estimados.
- `contracts/portal.json`: fuentes y allowlists del snapshot local.

## Validar un proyecto

```bash
node <plugin>/scripts/agteamos-validate.mjs --root <proyecto> --strict
```

La salida JSON sirve para CI o automatización:

```bash
node <plugin>/scripts/agteamos-validate.mjs \
  --root <proyecto> --strict --json
```

El validator acepta tareas workflow v2 en lectura y genera v3 para trabajo
nuevo. En proyectos 3.1+ con `profile`:

- comprueba los archivos obligatorios del perfil;
- permite que los paths `pending` no existan;
- impide materializar carpetas especulativas mientras
  `lifecycle: initialized`;
- permite artefactos JIT cuando `lifecycle: active`;
- valida tareas, deltas e índices que ya existen.

## Consultar estado sin escribir

```bash
node <plugin>/scripts/agteamos-status.mjs --root <proyecto> --json
```

El resultado expone perfil/lifecycle de onboarding, tareas activas, fase
persistida, riesgo/SHA, gates faltantes, artefactos, bloqueos, siguiente
acción y context budget. Es read-only.

Desglose de contexto:

```bash
node <plugin>/scripts/agteamos-status.mjs \
  --root <proyecto> --context-budget --json
```

Cuenta bytes UTF-8 y calcula `ceil(bytes/4)` por tier/módulo/artefacto. Los
tokens son una estimación; AgTeamOS no afirma telemetría del host.

## Analizar una tarea full antes de código y cierre

```bash
node <plugin>/scripts/agteamos-analyze.mjs \
  --change <proyecto>/agteamos/changes/<id>-<slug> --stage preflight

node <plugin>/scripts/agteamos-analyze.mjs \
  --change <proyecto>/agteamos/changes/<id>-<slug> --stage verify
```

El preflight comprueba requirements/ACs/tasks, rutas de diseño, cobertura de
deltas y clasificación `ADDED`/`MODIFIED` contra la spec maestra. `verify`
exige además tasks de implementación completadas. Ambos son read-only y un
exit no cero bloquea la transición correspondiente.

## Diagnosticar el tracker

Antes del primer `apply`, `agteamos-work-items doctor` valida únicamente las
capacidades que requiere el change set:

- GitHub: identidad, repositorio y permisos relevantes.
- Azure Boards: organización, proyecto, proceso real, work item types,
  campos custom, estados, áreas, iteraciones, usuarios, `bugsBehavior`,
  transporte Unicode-safe, layout y attachments requeridos.
- Planner: CLI/login, permisos Graph, plan, bucket y ETags.

Estados:

```text
configured | degraded | unavailable
```

Doctor no crea carpetas, tickets ni queries y no requiere aprobación. Un
`apply` se bloquea si el diagnóstico falta, está stale o no tiene verdes las
capacidades usadas.

## Secuencia de una escritura externa

```text
doctor → inspect-repo → inspect-tracker → draft
       → fingerprint → aprobación exacta/receipt
       → verify del payload → apply → read-back
```

Si cambia cualquier campo u operación después de aprobar, se genera otro
dry-run y se invalida el receipt. `scripts/agteamos-change-set.mjs` calcula el
SHA-256 canónico y verifica que se aplique exactamente el JSON aprobado. Los
adapters por defecto viven en `skills/work-items/`; un
`agteamos/tracker/` local solo existe para overrides personalizados.

Para Azure, business text nunca se interpola en shell/PowerShell durante un
fallback REST: se serializa como UTF-8 estructurado y se relee por una fuente
JSON confiable. Una búsqueda de caracteres corruptos no reemplaza la igualdad
Unicode. Si un label de formulario puede apuntar a otro campo, doctor/layout
deben demostrar el reference name antes del draft.

Cuando el intent viene de una tarea local, el resultado queda en
`tracker-result.md`: fingerprint, estado, IDs/URLs, read-back y hashes de
attachments sin tokens, headers, emails ni payloads completos. El portal
muestra solo su estado sanitizado.

En trabajo multi-repo, el context snapshot registra SHA/branch/freshness por
repo. Un mirror `stale` o `unverified` no prueba el estado vigente y nunca se
“corrige” con `reset --hard` durante una inspección.

## Inventario de release read-only

`agteamos-knowledge --maintain --release` empieza siempre con:

```bash
node <plugin>/scripts/agteamos-release-inventory.mjs \
  --root <proyecto> --json
```

El resultado propone IDs/paths exactos para cambios finales varados,
artefactos stale, HTML derivados y cache. Aplicar exige aprobación de IDs y
revalidación; specs, decisiones, receipts y trabajo parcial se preservan.
