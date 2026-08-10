---
name: agteamos-context-engineering
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

## CONTEXT TIERS (de spec-os — carga perezosa de contexto)

Principio 1 de arriba ("right context at the right time") se formaliza en tres
niveles de carga, para que una tarea simple no pague el costo de tokens de una
compleja. Esta es la referencia compartida que otras skills citan; quien la
**aplica en la práctica** durante la ejecución de una tarea es `agteamos-implement`
— esta skill define el concepto, `agteamos-implement` decide en qué tier arranca
cada tarea y cuándo sube de nivel.

| Tier | Tamaño aprox. | Contenido | Cuándo usarlo |
|------|---------------|-----------|----------------|
| **Tier 1** | ~1KB | Solo identidad de la tarea (`task.yml`) + qué hay que hacer (resumen de `progress.md`) | Retomar una sesión rápido, o tareas `schema: lite` (fix/debug de un archivo) |
| **Tier 2** (default) | + standards relevantes | Tier 1 + los estándares de `agteamos/standards/<tema>/` que aplican al dominio tocado + la spec del dominio afectado (`agteamos/specs/<dominio>.md`) | La mayoría de las tareas `schema: full` — features y bugs de complejidad normal |
| **Tier 3** | completo | Tier 2 + spec maestra completa de todos los dominios relacionados + ADRs relevantes (`agteamos/architecture/adr/`) + `agteamos/decisions/decision-log.md` | Tareas que cruzan varios dominios, o donde una decisión arquitectónica pasada condiciona la implementación |

Subir de tier durante la tarea es válido y esperado (ej. empezar en Tier 2 y
descubrir que hace falta un ADR relacionado → subir a Tier 3 solo para esa
consulta puntual, sin recargar todo desde el inicio). Bajar de tier no aplica —
una vez cargado un nivel de contexto, se mantiene para el resto de la tarea.

---

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
- Spec: agteamos/changes/<id>-<slug>/specs/design.md
- Restriccion: [limitacion encontrada]

### Tu tarea
[Descripcion concreta y acotada de lo que debe hacer]

### Criterio de exito
[Como sabe el siguiente agente que termino correctamente]
```

## CHECKPOINT PROTOCOL

Cada agente actualiza `progress.md` (dentro de `agteamos/changes/<id>-<slug>/`) en estos momentos:

1. **Al empezar** — marca el step como "en progreso"
2. **Al completar un step** — marca como completado, lista archivos creados
3. **Al tomar una decision tecnica** — documenta el por que
4. **Antes de un paso riesgoso** — commit + checkpoint
5. **Al 80% del context window** — checkpoint completo con "Next Action"

### Formato de checkpoint en `progress.md`:

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
- **No depender de la conversacion para estado** — escribir en `agteamos/changes/<id>-<slug>/progress.md`
- **No activar mas agentes de los necesarios** — solo los de las capas impactadas
- **No hacer loops sin stopping condition** — max 3 iteraciones por paso
- **No cargar Tier 3 completo para una tarea Tier 1/2** — ver CONTEXT TIERS abajo, cargar de mas gasta presupuesto de tokens sin necesidad
