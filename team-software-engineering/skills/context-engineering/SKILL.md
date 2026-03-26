---
name: context-engineering
description: >
  Gestiona el estado compartido entre agentes, define el protocolo de
  handoff y controla el presupuesto de tokens. Aplica las mejores
  practicas de Anthropic para sistemas multi-agente.
used_by:
  - architect
  - backend-engineer
  - frontend-engineer
  - project-manager
---

# Skill: Context Engineering

## CONTRACT
- **Input**: Estado actual del agente + tarea en curso
- **Output**: Handoff estructurado al siguiente agente, state file actualizado
- **Regla**: Ningun agente empieza sin leer el handoff del agente anterior

## PRINCIPIOS (Anthropic Multi-Agent Best Practices)

1. **Right context at the right time** — no cargues todo al inicio, carga lo que necesitas cuando lo necesitas
2. **Subagentes retornan resumenes** — 1-2k tokens max, no outputs completos
3. **Shared state via archivos** — no via conversacion (se pierde con context window)
4. **Stopping conditions explicitas** — cada agente sabe cuando parar
5. **Token budget awareness** — si se acerca al 80% del context window, hacer checkpoint

## HANDOFF PROTOCOL

Cuando un agente termina su parte y otro debe continuar:

```markdown
## Handoff: @[agente-actual] → @[siguiente-agente]

### Completado
- [item 1 con resultado concreto]
- [item 2 con resultado concreto]
- [archivos creados/modificados con paths exactos]

### Contexto critico para el siguiente agente
- Decision clave: [que se decidio y por que]
- Spec: /docs/tasks/active/TASK-<id>/specs/design.md
- Restriccion: [limitacion encontrada]

### Tu tarea
[Descripcion concreta y acotada de lo que debe hacer]

### Criterio de exito
[Como sabe el siguiente agente que termino correctamente]
```

## CHECKPOINT PROTOCOL

Cada agente actualiza el TASK file en estos momentos:

1. **Al empezar** — marca el step como "en progreso"
2. **Al completar un step** — marca como completado, lista archivos creados
3. **Al tomar una decision tecnica** — documenta el por que
4. **Antes de un paso riesgoso** — commit + checkpoint
5. **Al 80% del context window** — checkpoint completo con "Next Action"

### Formato de checkpoint en TASK file:

```markdown
## Progress Log

### Step 1: Analysis [COMPLETED]
- Read PROJECT_CONTEXT.md
- Identified: FastAPI backend, React frontend, PostgreSQL
- Decision: Use SQLAlchemy async for new queries (consistency with existing code)

### Step 2: Backend implementation [IN_PROGRESS]
- Created: src/notifications/service.py
- Created: src/notifications/schemas.py
- Modified: src/core/dependencies.py (added NotificationService DI)
- Tests pending

### Step 3: Frontend integration [PENDING]
### Step 4: E2E tests [PENDING]
### Step 5: PR + closure [PENDING]

## Next Action (if context resets)
Escribir tests unitarios para NotificationService:
- test_send_welcome_email (happy path)
- test_send_email_invalid_recipient (error case)
- test_send_email_rate_limit (edge case)
File: src/tests/test_notifications.py
Branch: feature/42-email-notifications (ya creada, ultimo commit: abc123)
```

## STOPPING CONDITIONS

Cada agente tiene condiciones explicitas de parada:

| Agente | Para cuando... |
|--------|----------------|
| @architect | Entrego design.md + ADRs + instrucciones al equipo |
| @product-owner | Entrego requirements.md con ACs verificables |
| @backend-engineer | Codigo + tests pasan + PR abierto |
| @frontend-engineer | Codigo + tests pasan + PR abierto |
| @qa-engineer | Review completo + screenshots + decision (approve/reject) |
| @security-engineer | Threat model completo + ASVS check + issues creados |
| @devops-engineer | Deploy exitoso + smoke tests pasan |
| @project-manager | Tickets creados + tasks.md escrito + handoff listo |
| @ui-ux-designer | Mockup aprobado por usuario + design tokens documentados |

## ANTI-PATTERNS

- **No pasar outputs completos entre agentes** — resumir en 1-2k tokens
- **No depender de la conversacion para estado** — escribir en /docs/tasks/
- **No activar mas agentes de los necesarios** — solo los de las capas impactadas
- **No hacer loops sin stopping condition** — max 3 iteraciones por paso
