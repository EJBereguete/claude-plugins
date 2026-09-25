---
name: agteamos-context
description: >
  Gestiona el estado compartido entre agentes, define el protocolo de
  handoff y controla el presupuesto de tokens. Aplica las mejores
  practicas de Anthropic para sistemas multi-agente.
used_by:
  - architect
  - backend-engineer
  - frontend-engineer
  - product-manager
  - devops-engineer
  - security-engineer
  - ui-ux-designer
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
5. **Context budget awareness** — medir bytes y tokens estimados; no afirmar
   uso real del context window si el host no lo expone.

## CONTEXT TIERS (de spec-os — carga perezosa de contexto)

Principio 1 de arriba ("right context at the right time") se formaliza en tres
niveles de carga, para que una tarea simple no pague el costo de tokens de una
compleja. Esta es la referencia compartida que otras skills citan; quien la
**aplica en la práctica** durante la ejecución de una tarea es `agteamos-implement`
— esta skill define el concepto, `agteamos-implement` decide en qué tier arranca
cada tarea y cuándo sube de nivel.

| Tier | Contenido | Cuándo usarlo |
|------|-----------|----------------|
| **Tier 1** | Identidad (`task.yml`) y estado/next action (`progress.md`) | Retomar o cambios lite acotados |
| **Tier 2** (default full) | Tier 1 + artefactos del cambio, standards inyectados y specs de dominios declarados | Features/bugs normales |
| **Tier 3** | Tier 2 + ADRs/decisiones explícitamente relacionadas | Multi-dominio, arquitectura, seguridad o contrato cross-repo |

Subir de tier durante la tarea es válido y esperado (ej. empezar en Tier 2 y
descubrir que hace falta un ADR relacionado → subir a Tier 3 solo para esa
consulta puntual, sin recargar todo desde el inicio). Bajar de tier no aplica —
una vez cargado un nivel de contexto, se mantiene para el resto de la tarea.

### Reporte determinista de presupuesto

La metodología vive en `contracts/context-budget.json`:

- bytes reales UTF-8 de artefactos activos allowlisted;
- tokens **estimados** como `ceil(bytes / 4)`;
- agregación acumulativa por tier, módulo lógico y artefacto;
- exclusión de código fuente, binaries, evidence, cache, HTML y payloads
  externos.

Consultar sin escribir:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-status.mjs" \
  --root "<project-root>" --context-budget --json
```

Status, pulse y portal muestran el mismo snapshot. Los tokens no son
telemetría, billing ni uso real de la ventana del host. Un warning de budget
indica que conviene reducir/referenciar contexto; no prueba que el host esté
al límite.

---

## LAZY ARTIFACTS — protocolo `ensure-artifact`

Los tiers controlan lectura. `ensure-artifact` controla escritura perezosa sin
crear carpetas especulativas. `agteamos/onboarding.yml` registra `path`,
`status`, `trigger` y, cuando aplica, `generated_at`.

### Siete topics canónicos del registry

El plugin aporta únicamente metadata en `standards/registry.yml`. Estos son
los siete pares `id`/`folder`; deben coincidir exactamente:

| id | folder |
|---|---|
| `design-de-codigo` | `design-de-codigo` |
| `api-design` | `api-design` |
| `database` | `database` |
| `testing` | `testing` |
| `frontend` | `frontend` |
| `security` | `security` |
| `entrega-y-operaciones` | `entrega-y-operaciones` |

Aliases como `clean-architecture`, `git` o `devops` solo resuelven al folder
canónico; nunca crean otro topic. Custom topics se declaran como metadata en
`agteamos/standards/registry.yml`.

```yaml
layout_contract: "1"
profile: adopted_l0
mode: lazy
lifecycle: initialized
created_at: 2026-09-25
artifacts:
  project_context: { path: architecture/PROJECT_CONTEXT.md, status: done }
  standards.design-de-codigo: { path: standards/design-de-codigo/, status: pending, trigger: "intent/glob relevante" }
  standards.api-design: { path: standards/api-design/, status: pending, trigger: "routers/controllers/endpoints" }
  standards.database: { path: standards/database/, status: pending, trigger: "migraciones/modelos/sql" }
  standards.testing: { path: standards/testing/, status: pending, trigger: "tests o QA" }
  standards.frontend: { path: standards/frontend/, status: pending, trigger: "UI/componentes" }
  standards.security: { path: standards/security/, status: pending, trigger: "auth o datos sensibles" }
  standards.entrega-y-operaciones: { path: standards/entrega-y-operaciones/, status: pending, trigger: "CI/deploy/operacion" }
  spec.billing: { path: specs/billing.md, status: candidate, evidence: "src/billing/" }
  design_system: { path: design/DESIGN_SYSTEM.md, status: pending, trigger: "primer build UI" }
  infrastructure: { path: devops/INFRASTRUCTURE.md, status: pending, trigger: "deploy o cambio CI" }
  human_docs.readme: { path: ../README.md, status: pending, trigger: "bootstrap o cambio de producto" }
  human_docs.changelog: { path: ../CHANGELOG.md, status: pending, trigger: "cierre de tarea" }
  human_docs.architecture: { path: ../docs/architecture.md, status: pending, trigger: "cambio arquitectonico o threat model" }
  human_docs.operations: { path: ../docs/operations.md, status: pending, trigger: "deploy, incidente u operacion" }
```

Estados generales: `done | partial | pending | candidate | stale | n/a`.
`candidate` se reserva para specs. Durante L0 este es el único manifest:
`standards/`, `specs/` y sus índices todavía no existen. Tras el primer
discovery, el runtime de `agteamos/standards/index.meta.yml` usa solo
`done | pending | stale`.

### Protocolo

1. Leer la entrada en `agteamos/onboarding.yml`. Si no existe manifest,
   conservar artefactos existentes como project-owned y usar
   `agteamos-knowledge --maintain` para migración gradual.
2. `done` → leer y seguir.
3. `pending`, `candidate` o `stale` → anunciar una línea y generar solo ese
   artefacto con scope acotado.
4. Para standards, resolver relevancia con
   `agteamos-knowledge --inject <intent|paths>`. Su payload final contiene
   solo paths. Si señala un topic no listo por el protocolo, ejecutar
   `--discover <id> --scope <paths>` para como máximo un topic en ese step.
5. Aplicar honestidad (`Observed`, `Decided`, `External`, fuentes y
   confidence), cambiar `lifecycle` a `active` y actualizar solo la entrada
   generada.
6. Presupuesto: máximo una generación JIT por step. Si hacen falta más,
   listarlas y pedir una decisión una vez.

### Human docs lazy

README raíz, CHANGELOG, `docs/architecture.md` y `docs/operations.md` son
vistas derivadas de `agteamos/`, no contexto canónico. Las genera
`agteamos-knowledge --human-docs [--scope changed|all]` con marcadores,
`Sources` y `Last verified`. No forman parte de los context tiers ni se usan
para completar una fuente canónica faltante.

Bootstrap materializa solo el README raíz mediante `--outputs readme`.
CHANGELOG aparece tras el primer cierre verificable; `docs/architecture.md` y
`docs/operations.md` aparecen cuando sus fuentes estables disparan esos
outputs. Fase 0 no crea `docs/`.

### Regla de carpetas y compatibilidad

La skill que escribe crea su carpeta en ese momento. No se precrean carpetas
vacías. Los perfiles y triggers canónicos viven en
`contracts/project-layout.json`. En proyectos anteriores, preservar contenido
existente y migrar al tocar mediante `agteamos-knowledge --maintain`; nunca
regenerar todo.

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
4. **Antes de un paso riesgoso** — checkpoint durable; commit solo si fue
   solicitado por el flujo.
5. **Al 80% del budget estimado del tier**, o cuando el host reporte
   explícitamente 80% de su ventana — checkpoint completo con "Next Action".

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

## PRÓXIMO PASO — convención obligatoria

Toda skill de AgTeamOS, al llegar a su último Step (o al final de cada
modo, si la skill tiene varios modos como `agteamos-quality` o
`agteamos-knowledge`), termina con una línea en este formato exacto:

```
**Próximo paso sugerido**: <skill o comando> — <razón en menos de 10 palabras>
```

Reglas:
- Si el resultado admite más de un camino razonable (ej. un
  `agteamos-quality` con Bloqueantes vs. sin Bloqueantes), listar las 2-3
  opciones más probables, no solo una.
- Si no hay un siguiente paso obvio (ej. un modo de solo lectura), la línea
  dice explícitamente *"ninguno — este modo es de solo lectura"* en vez de
  inventar uno forzado.
- **Nunca ejecutar el siguiente paso automáticamente solo por sugerirlo** —
  sigue siendo el usuario (o el agente orquestador, según `handoff_mode` en
  `platform.yml`) quien decide si sigue.
- Cada skill cita esta sección en vez de mantener su propia copia de la
  tabla — si la tabla de abajo cambia, no hace falta tocar 22 archivos.

### Tabla de referencia

| Skill que termina | Próximo paso típico |
|---|---|
| `agteamos-bootstrap` | `agteamos-task` (primera feature del MVP) |
| `agteamos-task` | `agteamos-implement` (ticket ya creado) |
| `agteamos-implement` | `agteamos-task` (siguiente iteración) o, periódicamente, `agteamos-quality --mode auditoria-integral` / `agteamos-knowledge --maintain` |
| `agteamos-quality` (PR-review, con Bloqueantes) | volver a `agteamos-implement`/`agteamos-build` para resolverlos |
| `agteamos-quality` (PR-review, sin Bloqueantes) | `agteamos-implement` (merge) |
| `agteamos-quality` (auditoría integral) | `agteamos-decisions` (ADR de hallazgos grandes) o `agteamos-task` (atacar P0 del radar) |
| `agteamos-quality` (domain-review / static-analysis) | vuelve a la skill que lo disparó |
| `agteamos-security` | mismo criterio que `agteamos-quality` |
| `agteamos-decisions` | continuar la tarea que la disparó (`agteamos-task`/`agteamos-implement`) |
| `agteamos-deploy` | `agteamos-metrics` (registrar DORA) — o `agteamos-incidents` si algo falló |
| `agteamos-incidents` | `agteamos-decisions` (post-mortem como ADR) o `agteamos-fix` |
| `agteamos-knowledge --init` | `agteamos-task`/`agteamos-implement` (primera feature real) |
| `agteamos-knowledge --maintain` / `--topic` / `--learn` | ninguno — vuelve a la skill que lo disparó |
| `agteamos-capture` | ninguno — sigue el flujo que estaba en curso |
| `agteamos-meta` (auditoría) | `agteamos-meta` (ejecución de la mejora), si se decide actuar |
| `agteamos-build` | `agteamos-quality` (review) |
| `agteamos-dashboard` | ninguno — es informativo (`--pulse` incluido, es de solo lectura) |
| `agteamos-setup` | `agteamos-bootstrap` o `agteamos-knowledge --init` según haya o no código |
| `agteamos-spec` | depende de quién la invoque — no tiene un "después" propio |
| `agteamos-pr` | vuelve al Step de cierre de `agteamos-implement` |
| `agteamos-debug` | `agteamos-implement` (cierre, ya documentado en su Step 8) |
| `agteamos-fix` | `agteamos-implement` (mismo criterio) |
| `agteamos-explore` | `agteamos-task` (si ya se decidió qué hacer) o seguir explorando |
| `agteamos-router` | no aplica — el router ES el que decide el próximo paso, no lo sugiere |
| `agteamos-context` | no aplica — es la skill que define esta convención, no la consume |

---

## ANTI-PATTERNS

- **No pasar outputs completos entre agentes** — resumir en 1-2k tokens
- **No depender de la conversacion para estado** — escribir en `agteamos/changes/<id>-<slug>/progress.md`
- **No activar mas agentes de los necesarios** — solo los de las capas impactadas
- **No hacer loops sin stopping condition** — max 3 iteraciones por paso
- **No cargar Tier 3 completo para una tarea Tier 1/2** — ver CONTEXT TIERS abajo, cargar de mas gasta presupuesto de tokens sin necesidad
- **Terminar una skill sin la línea "Próximo paso sugerido"** — ver §PRÓXIMO PASO arriba, aplica a las 23 skills sin excepción
- **Ejecutar el próximo paso sugerido automáticamente** — sugerir no es decidir; el usuario/orquestador confirma
