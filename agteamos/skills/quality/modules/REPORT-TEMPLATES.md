# Report Templates

Leer este modulo solo al redactar la salida del modo ya ejecutado. No usar una
plantilla para rellenar con supuestos: `PASS` requiere evidencia fresca;
checks no ejecutados son `NOT RUN`/`UNKNOWN`.

## Campos comunes de un finding

```markdown
**[ID] Titulo** — `path/file.ext:line` — Bloqueante | Importante | Sugerencia
- **Evidencia**: observed | computed | proposed
- **Estado del cambio**: introducido/extendido | preexistente -> follow-up | n/a
- **Prueba fresca**: [archivo:linea o comando + exit code/output]
- **Impacto**: [consecuencia concreta]
- **Contraargumento considerado**: [hipotesis revisada y resultado]
- **Remediacion minima**: [cambio verificable]
- **Ledger**: DR-/AU- NEW | SEEN xN | RESOLVED | n/a
```

`proposed` no puede ser Bloqueante, cerrar un finding ni justificar PASS.

## PR-review

```markdown
## Code Review: [PR/feature/path]

**Reviewer**: @qa-engineer
**Date**: YYYY-MM-DD
**Scope**: [base...head, N archivos, N lineas]
**Decision**: REQUEST_CHANGES | APPROVE | COMMENT
**Formal review state changed**: yes | no | unsupported

### Resumen

[Decision y principal razon primero.]

### Evidencia y checks

| Area | Estado | Evidencia fresca |
|---|---|---|
| Diff/base | PASS/UNKNOWN | [scope output] |
| Security scanner | PASS/FAIL/NOT RUN | [comando, exit] |
| Tests | PASS/FAIL/NOT RUN | [comando, exit] |
| Lint/types | PASS/FAIL/NOT RUN | [comando, exit] |
| Project standards | PASS/FAIL/UNKNOWN | [inject + topic/index] |

### Bloqueantes

[Findings introducidos/extendidos con evidencia observed/computed, o "Ninguno".]

### Importantes

[Findings o "Ninguno".]

### Follow-ups preexistentes

[No bloquean el merge; incluir aprobacion/ID verificado si existe.]

### Sugerencias

[Opcionales.]

### Lo que esta bien

[Solo positivos observados.]

### Limitaciones

[Scope excluido, checks NOT RUN, adapter gaps.]

### Proximo paso

[Fix/re-review/merge.]
```

Decision:

- `REQUEST_CHANGES`: al menos un Bloqueante fresco introducido.
- `APPROVE`: cero bloqueantes, Importantes resueltos o follow-up
  aprobado/verificado y checks relevantes PASS.
- `COMMENT`: draft o evidencia incompleta.

Nunca escribir `APPROVE` si un check relevante queda `NOT RUN`/`UNKNOWN`.

## Domain-review

```markdown
## Domain Review: [modulo/PR]

**Reviewer**: @architect
**Date**: YYYY-MM-DD
**Scope incluido**: [tocados + imports + importers]
**Scope excluido**: [cap/razon]
**Ratchet base**: [branch/commit | UNKNOWN]
**Ledger**: DR (`agteamos/.cache/findings/domain-review.json`)

### Resumen

[Conclusion y limitaciones.]

### Bloqueantes introducidos

**[DR-<hash> / Dn] [titulo]** — `path:line`
- **Evidencia**: observed | computed
- **Ratchet**: introducido/extendido
- **Ledger**: NEW | SEEN xN
- **Prueba fresca**: [...]
- **Contraargumento considerado**: [...]
- **Remediacion minima**: [...]

### Importantes y Sugerencias

[Mismo esquema.]

### Follow-ups preexistentes

[DR-* / Dn, no bloqueante.]

### Resueltos desde la ultima corrida

[DR-* confirmado por inspeccion fresca, o "Ninguno confirmado".]

### Unknown / Not run

[Areas no verificadas.]
```

No renumerar IDs DR al incluirlos en un PR-review.

## Static-analysis

```markdown
## Static Analysis: [repo/scope]

**Commit/scope**: [sha/paths]
**Stack detectado**: [...]
**Gate global**: PASS | FAIL | INCOMPLETE

### Checks

| Check | Tool/version | Comando | Scope | Exit | Estado | Artifact |
|---|---|---|---|---:|---|---|
| Lint | [...] | `...` | [...] | 0 | PASS | [...] |
| Types | [...] | `...` | [...] | — | NOT RUN | — |
| Security | [...] | `...` | [...] | 1 | FAIL | [...] |
| Dependencies | [...] | `...` | [...] | 0 | PASS | [...] |
| Tests/coverage | [...] | `...` | [...] | 0 | PASS | [...] |

### Findings

[Ordenados por Critical/Blocker, High/Major, Medium/Minor, Low/Info.]

### Suppressions/exclusions

[Regla, scope y razon verificable.]

### Limitaciones

[Tools ausentes, artifacts no producidos, checks UNKNOWN.]
```

Gate global:

- PASS solo si todos los checks obligatorios tuvieron corrida fresca exitosa.
- FAIL si un gate obligatorio fallo.
- INCOMPLETE si alguno quedo `NOT RUN` o `UNKNOWN`.

## Auditoria integral

```markdown
# Engineering Audit — [Project]

**Date**: YYYY-MM-DD
**Score Global**: [0-100]
**Confianza/cobertura**: [alta/media/baja + areas NOT RUN]
**Baseline**: [audit previo | primer audit]
**Ledger**: AU (`agteamos/.cache/findings/audit.json`)

## Resumen ejecutivo

[Score, confianza y finding mas critico primero.]

## Evidencia fresca

| Dimension | Estado | Fuentes/comandos actuales |
|---|---|---|
| Seguridad | PASS/FAIL/UNKNOWN | [...] |
| Arquitectura | PASS/FAIL/UNKNOWN | [...] |
| Tests | PASS/FAIL/UNKNOWN | [...] |
| DevOps/Observabilidad | PASS/FAIL/UNKNOWN | [...] |
| Codigo | PASS/FAIL/UNKNOWN | [...] |
| Docs | PASS/FAIL/UNKNOWN | [...] |

## Radar de Deuda Tecnica

| Categoria | Nivel | Impacto | Esfuerzo | Estado AU | Evidencia |
|---|---|---|---|---|---|
| Codigo | Alta/Med/Baja | [...] | S/M/L/XL | NEW/SEEN xN | observed/computed |
| Arquitectura | Alta/Med/Baja | [...] | S/M/L/XL | NEW/SEEN xN | observed/computed |
| Seguridad | Alta/Med/Baja | [...] | S/M/L/XL | NEW/SEEN xN | observed/computed |
| Documentacion | Alta/Med/Baja | [...] | S/M/L/XL | NEW/SEEN xN | observed/computed |
| UI/UX & A11y | Alta/Med/Baja | [...] | S/M/L/XL | NEW/SEEN xN | observed/computed |
| Tests | Alta/Med/Baja | [...] | S/M/L/XL | NEW/SEEN xN | observed/computed |
| DevOps & Obs. | Alta/Med/Baja | [...] | S/M/L/XL | NEW/SEEN xN | observed/computed |

## Vulnerabilidades Criticas

| ID | Descripcion | OWASP | Severidad | Archivo:Linea | Estado AU |
|---|---|---|---|---|---|
| AU-* | [...] | A0X | Critical | `path:line` | NEW/SEEN xN |

## Cambios desde el ultimo audit

- **Resueltos confirmados**: [AU-* o ninguno]
- **Empeoraron**: [AU-* o ninguno]
- **Nuevos**: [AU-* o ninguno]

## Plan de Mitigacion

### P0 — Inmediato
1. [Finding] — Owner: @agente — Esfuerzo: S/M/L/XL — Estado: proposed/approved

### P1 — Este sprint
1. [...]

### P2 — Proximo trimestre
1. [...]

## Analisis de Arquitectura

- ADRs: [...]
- Acoplamiento/boundaries: [...]
- Escalabilidad: [...]

## Calidad y Testing

- Cobertura fresca: [...]
- Critical paths E2E: [...]
- Mutation score: [valor medido | NOT RUN]
- Contract tests: [...]

## Observabilidad y DORA

- Logs/error tracking/alertas/runbooks: [...]
- Deployment Frequency: [...]
- Lead Time: [...]
- Change Failure Rate: [...]
- MTTR: [...]

## Fortalezas observadas

1. [...]

## Score Calculation

| Dimension | Peso | Score | Deducciones vinculadas |
|---|---:|---:|---|
| Seguridad | 25 | X/25 | AU-* |
| Arquitectura | 20 | X/20 | AU-* |
| Tests | 20 | X/20 | AU-* |
| DevOps | 15 | X/15 | AU-* |
| Codigo | 15 | X/15 | AU-* |
| Docs | 5 | X/5 | AU-* |

**Total**: X/100

## Limitaciones

[UNKNOWN/NOT RUN, exclusions y confianza.]
```

Los P0/P1/P2 propuestos no son work items aprobados. Tras aprobacion, crear
mediante `agteamos-work-items` y reemplazar `proposed` por IDs/links
verificados.

## Checklist antes de enviar

- Conclusion primero.
- Cada finding tiene ID, severidad, evidencia y ubicacion.
- Bloqueantes/Importantes incluyen contraargumento.
- Ratchet visible cuando aplica.
- DR y AU no se mezclan.
- Ningun PASS depende solo de cache/historial/ausencia.
- `NOT RUN`/`UNKNOWN` estan declarados.
- Approvals formales no se confunden con comentarios.
- Acciones propuestas no aparecen como ejecutadas.
