# Workflow v3: discovery, riesgo, abandono y mantenimiento

AgTeamOS 3.5 mantiene 23 skills y 8 agentes, pero amplía el lifecycle durable
sin cargar más contexto por defecto.

## Bootstrap greenfield

`agteamos-bootstrap` usa tres módulos JIT:

1. compara la petición declarada con el problema sustentado;
2. ofrece market research solo cuando evidencia externa puede cambiar una
   decisión;
3. presenta mission, MVP/out-of-scope, stack, arquitectura, seguridad,
   métricas, experiencia y rutas como un blueprint consolidado;
4. materializa foundation/scaffold solo tras aprobación agrupada.

Research se presenta con fuente, fecha, confidence y clasificación
`External|Observed|Proposed|Pending`. Solo una aprobación específica crea
`agteamos/product/market-research.md`. Bootstrap nunca crea backlog/tickets.

## Bugs existentes por ID

Flow 3 lee primero el item real. Si es Bug, `BUG-INTAKE.md` inspecciona
tracker y repo:

- `simple`: un dominio/repo, loop rojo acotado, sin contrato/migración ni
  decisión arquitectónica → `schema: lite`;
- `complex`: multi-dominio/repo, contrato, datos/migración, auth, pagos,
  infraestructura o blast radius no acotado → workflow `full` completo.

Ambas rutas crean estado durable antes del código. El intake no modifica
severity, owner, estado ni comentarios sin change set aprobado.

## Riesgo y review ligado al SHA

Toda tarea workflow v3 persiste:

```yaml
risk: standard # standard | high | critical
risk_reason: "<evidencia, blast radius y reversibilidad>"
reviewed_sha: null
risk_review_approved: false
risk_review_sha: null
```

`standard` usa review normal. `high` requiere un especialista adicional;
`critical`, dos revisores independientes apropiados. El review adicional
debe apuntar exactamente al mismo SHA que `reviewed_sha`. Cambiar el SHA
invalida QA/validator/reviews afectados.

## Abandono preservativo

Una petición explícita genera un dry-run único para tracker + transición
local. Tras aprobación:

```text
<fase activa> → ABANDONING → ABANDONED
```

`abandon-record.md` conserva razón, trabajo completo/incompleto, branch/PR,
artefactos no sincronizados y receipt externo. No se fabrican QA, review,
merge o sync. Un fallo externo deja `ABANDONING` y receipt parcial; nunca
borra/reset/compensa trabajo.

## Presupuesto de contexto

```bash
node <plugin>/scripts/agteamos-status.mjs \
  --root <proyecto> --context-budget --json
```

El reporte suma bytes UTF-8 allowlisted por tier, módulo y artefacto, y estima
tokens como `ceil(bytes/4)`. Es determinista para el mismo filesystem, pero
no es telemetría del host ni billing. Pulse y portal exponen el mismo resumen.

## Mantenimiento manual de release

```text
agteamos-knowledge --maintain --release
```

Primero genera un inventario read-only:

```bash
node <plugin>/scripts/agteamos-release-inventory.mjs \
  --root <proyecto> --json
```

El dry-run enumera IDs, paths, targets y razones. Solo se aplican IDs
aprobados. Specs, decisiones, receipts y trabajo parcial están protegidos;
temporales/huérfanos quedan `review_only`. Cambios del inventario invalidan la
aprobación. Este mantenimiento nunca corre automáticamente al cerrar.
