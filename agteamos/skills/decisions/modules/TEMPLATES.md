# Templates de decisiones

Usar este módulo solo cuando el usuario pida un template, scaffold o documento
copiable. Elegir una sola sección; no cargar ni reproducir templates ajenos al
artefacto solicitado. Las reglas de proceso viven en su módulo específico.

## RFC

```markdown
# RFC-{NNN}: {Title}

**Status:** Draft | Under Review | Accepted | Rejected | Withdrawn
**Date:** YYYY-MM-DD
**Author:** {name or role}
**Reviewers:** {names or roles}
**Review Deadline:** YYYY-MM-DD
**Related ADRs:** {ADR-NNN or None}

## Summary

{One or two sentences.}

## Motivation

{Problem, current state, evidence and why action is needed.}

## Proposal

{Design, contracts, data changes, migration and rollout as applicable.}

## Alternatives Considered

| Alternative | Reason Not Chosen |
|-------------|-------------------|
| {Option} | {Reason} |

## Premortem

<!-- Optional. Delete this section unless a premortem was actually run. -->
**Veredicto:** {one to three sentences}
**Grieta más letal:** {failure that could invalidate the proposal}
**Mitigación aceptada:** {decision by the approver, or accepted as-is}

## Impact

### Services and teams affected
{List.}

### Breaking changes
{Describe migration, or explicitly state that there are none.}

### Performance implications
{Latency, throughput, storage and cost.}

### Security implications
{Attack surface, trust boundaries and data sensitivity.}

## Acceptance Criteria

1. {Binary, verifiable condition.}

## Resolution

**Decision:** Accepted | Rejected | Withdrawn
**Date:** YYYY-MM-DD
**Decided by:** {name or role}
**Summary:** {Decision and conditions.}
**Follow-up ADRs:** {ADR-NNN or None}
```

## ADR Nygard

```markdown
# ADR-{NNN}: {Title}

**Status:** Proposed | Accepted | Deprecated | Superseded
**Date:** YYYY-MM-DD
**Deciders:** {names or roles}
**Supersedes:** {ADR-NNN; omit when not applicable}
**Superseded-By:** {ADR-NNN; only on the superseded ADR}

## Context

{Forces, constraints and alternatives. Present tense, factual language.}

## Decision

We will {decision} because {reason}.

## Premortem

<!-- Optional. Delete this section unless a premortem was actually run. -->
**Veredicto:** {one to three sentences}
**Grieta más letal:** {failure that could invalidate the decision}
**Mitigación aceptada:** {decision by the approver, or accepted as-is}

## Consequences

### Positive
- {Benefit.}

### Negative
- {Accepted cost, risk or trade-off.}

### Neutral
- {Change that is neither positive nor negative by itself.}
```

## Rejected / Out-of-scope

```markdown
# Out of Scope: {Concept}

**Fecha:** YYYY-MM-DD
**Contexto:** {Discussion in which the concept arose.}

## Qué se propuso

{Concrete description recognizable under different wording.}

## Por qué se rechazó

{The user's actual reasoning.}

## Bajo qué condición podría reconsiderarse

{Concrete condition, or "Ninguna identificada por ahora".}
```

## Informe de premortem standalone

```markdown
# VEREDICTO

{One to three direct sentences.}

## Grietas por severidad

### 1. {Grieta}

**El golpe:** {Specific failure.}

**Por qué es letal:** {What breaks.}

**Qué tendría que ser cierto:** {Survival condition or repair.}

## La que lo mata

{Most likely single cause of death.}

## Si insistes, arregla esto primero

1. {Concrete, measurable action.}
```

## Índice RFC

```markdown
| RFC | Title | Status | Date |
|-----|-------|--------|------|
| [RFC-NNN](RFC-NNN-slug.md) | {Title} | {Status} | YYYY-MM-DD |
```

## Índice ADR

```markdown
| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-NNN](ADR-NNN-slug.md) | {Title} | {Status} | YYYY-MM-DD |
```
