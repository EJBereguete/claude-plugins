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
  - product-manager
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

## LAZY ARTIFACTS — protocolo `ensure-artifact`

Los CONTEXT TIERS de arriba resuelven la lectura perezosa (qué contexto cargar
para una tarea). Esta sección resuelve la **escritura** perezosa: qué
documentación/estándar generar, y cuándo. Antes de este contrato,
`agteamos-project-docs` generaba las ~17 carpetas de `agteamos/` y los 11 temas de
`agteamos-project-docs` el día 1, sin importar si la tarea en curso los tocaba —
el mismo costo que Tier 3 pagaría si se cargara siempre. `agteamos-capture` ya aplican el contrato correcto para capturas
puntuales (capturar primero, refinar después); esta sección lleva el mismo
principio a la generación de contexto de proyecto.

### El manifest — `agteamos/onboarding.yml`

Registro de qué artefacto existe, cuál está pendiente y qué lo dispara. Lo
crea el onboarding L0 (`agteamos-project-docs`) o la Fase 0 de `agteamos-new-project`,
y lo actualiza cada skill generadora al escribir su artefacto.

```yaml
# agteamos/onboarding.yml
mode: lazy                 # lazy | full — full = comportamiento pre-lazy, todo ya generado
created_at: 2026-09-23
custom_standards_asked: false   # ver agteamos-project-docs Step 3 — se pregunta una sola vez por proyecto
artifacts:
  project_context:   { path: architecture/PROJECT_CONTEXT.md, status: done,    generated_at: 2026-09-23 }
  platform:          { path: platform.yml,                    status: partial }
  standards.api:     { path: standards/api/,                  status: pending, trigger: "build-api | review sobre routers | edit en globs de api" }
  standards.testing: { path: standards/testing/,              status: pending, trigger: "edit/creacion de archivo de test | qa-engineer" }
  # ... una entrada por cada uno de los 11 temas de agteamos-project-docs
  spec.billing:      { path: specs/billing.md,                status: candidate, evidence: "src/billing/ (14 archivos)" }
  api_map:           { path: api/endpoints.md,                status: pending, trigger: "build-api | tarea que toca routers" }
  design_system:     { path: design/DESIGN_SYSTEM.md,         status: pending, trigger: "build-ui" }
  infrastructure:    { path: devops/INFRASTRUCTURE.md,        status: pending, trigger: "deploy | production-readiness | edit de Dockerfile/CI" }
  product_roadmap:   { path: product/roadmap.md,              status: pending, trigger: "project-backlog | pedido explicito" }
  tracker_labels:    { status: pending, trigger: "primer create-ticket (se pregunta 1 vez)" }
```

Estados posibles: `done` | `partial` | `pending` | `candidate` (solo dominios
de specs, ver `agteamos-project-docs` L1) | `stale` | `n/a`.

### Protocolo `ensure-artifact(<clave>)`

Toda skill consumidora que necesita leer un artefacto de `agteamos/` lo invoca
antes de leerlo, en vez de asumir que ya existe o de anotar "no existe" y
seguir sin más:

1. Leer `agteamos/onboarding.yml` → entrada `<clave>`. Si el archivo no
   existe (proyecto onboardeado antes de este contrato), tratar todo como
   `mode: full` — ver "Compatibilidad hacia atrás" abajo.
2. `done` → leer el artefacto y seguir, no hay nada más que hacer.
3. `pending`, `candidate` o `stale` → anunciar en **una línea**, sin
   preguntar si el disparador ya es inequívoco, y generar **solo ese
   artefacto** en modo acotado (scope = archivos de la tarea actual + 5-10
   representativos, nunca el repo completo). Ejemplo: *"Primera vez que
   tocamos API en este proyecto: genero `agteamos/standards/api/` leyendo 8
   archivos de rutas."*
4. Aplicar siempre las reglas de honestidad ya vigentes en el resto del
   plugin (`Estado`/`Confidence`/`Fuentes revisadas` — nunca declarar más
   confianza de la que hay evidencia).
5. Actualizar `onboarding.yml` → esa entrada pasa a `status: done` +
   `generated_at: <hoy>`.
6. **Presupuesto**: máximo 1 generación JIT por Step de la skill
   consumidora. Si un mismo Step necesitaría generar más de un artefacto,
   listarlos y preguntar una vez: *"¿Genero también X e Y ahora, o sigo con
   lo mínimo?"* — nunca encadenar generaciones sin esa pregunta.
7. `mode: full` → el protocolo es un no-op (todo ya está `done`), no cambia
   nada del comportamiento actual.

### Regla de carpetas

*La skill que escribe un artefacto es la que crea su carpeta* (`mkdir -p` al
momento de escribir, no antes). Ninguna skill pre-crea carpetas vacías "por
las dudas" — eso es lo que hacía pesado el esqueleto completo de
`agteamos-project-docs` y `agteamos-new-project`.

### Compatibilidad hacia atrás

Un proyecto que ya tiene `agteamos/` pero no `onboarding.yml` (onboardeado
antes de este contrato) se trata como `mode: full`: todos los artefactos que
ya existen en disco se consideran `done` sin re-generarlos, y el protocolo
`ensure-artifact` no dispara nada nuevo salvo que el usuario pida
explícitamente completar algo que falte.

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
| @product-manager | Entrego requirements.md con ACs verificables |
| @backend-engineer | Codigo + tests pasan + PR abierto |
| @frontend-engineer | Codigo + tests pasan + PR abierto |
| @qa-engineer | Review completo + screenshots + decision (approve/reject) |
| @security-engineer | Threat model completo + ASVS check + issues creados |
| @devops-engineer | Deploy exitoso + smoke tests pasan |
| @product-manager | Tickets creados + tasks.md escrito + handoff listo |
| @ui-ux-designer | Mockup aprobado por usuario + design tokens documentados |

## ANTI-PATTERNS

- **No pasar outputs completos entre agentes** — resumir en 1-2k tokens
- **No depender de la conversacion para estado** — escribir en `agteamos/changes/<id>-<slug>/progress.md`
- **No activar mas agentes de los necesarios** — solo los de las capas impactadas
- **No hacer loops sin stopping condition** — max 3 iteraciones por paso
- **No cargar Tier 3 completo para una tarea Tier 1/2** — ver CONTEXT TIERS abajo, cargar de mas gasta presupuesto de tokens sin necesidad
