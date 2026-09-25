---
name: agteamos-bootstrap
description: >
  Inicia un proyecto greenfield desde un repo vacío: confirma el problema
  real, ofrece research opcional, aprueba un blueprint consolidado y recién
  entonces materializa producto, arquitectura, scaffold, CI y onboarding lazy.
  No crea backlog, tickets ni artefactos futuros por anticipado.
used_by:
  - architect
  - product-manager
  - ui-ux-designer
  - devops-engineer
---

# Workflow: Greenfield bootstrap

## Contrato

- **Input**: repo vacío o casi vacío, petición inicial y
  `agteamos/platform.yml` resuelto por router/setup.
- **Output**: foundation aprobada, scaffold mínimo verificable, CI,
  onboarding lazy y README.
- **No output implícito**: backlog, tracker items, specs de dominio, design
  system, deploy o carpetas vacías.
- **Estado de verdad**: blueprint aprobado + archivos reales; la conversación
  no autoriza contenido diferente.

## Precondiciones

1. `agteamos-router` confirmó que no hay código significativo ni otro cambio
   activo.
2. `agteamos-setup` resolvió `repo_host`, `tracker` y `branch_strategy`; no
   repetir esas preguntas.
3. Cambios preexistentes están entendidos y se preservan.

## Dispatcher JIT

No cargues todos los módulos. Lee el estado real y usa exactamente uno:

| Estado | Señal | Módulo |
|---|---|---|
| `DISCOVERY` | problema/outcome o decisiones bloqueantes sin confirmar | [DISCOVERY-AND-BLUEPRINT.md](modules/DISCOVERY-AND-BLUEPRINT.md) |
| `BLUEPRINT` | contexto listo, aún sin aprobación agrupada | [DISCOVERY-AND-BLUEPRINT.md](modules/DISCOVERY-AND-BLUEPRINT.md) |
| `FOUNDATION` | blueprint aprobado, artefactos canónicos faltantes | [MATERIALIZE-FOUNDATION.md](modules/MATERIALIZE-FOUNDATION.md) |
| `SCAFFOLD` | producto/arquitectura listos, scaffold/CI/onboarding pendientes | [SCAFFOLD-AND-HANDOFF.md](modules/SCAFFOLD-AND-HANDOFF.md) |
| `DONE` | comandos y strict validation pasan; handoff entregado | ninguno |

Deja de usar el módulo anterior antes de cargar el siguiente. Si una decisión
material cambia después de aprobar, vuelve a `BLUEPRINT`, muestra el delta y
pide otra aprobación.

## State machine

```text
DISCOVERY
  ├─ stated request aligned → BLUEPRINT
  └─ material problem mismatch → confirm once → BLUEPRINT
BLUEPRINT
  ├─ research declined/not applicable → approval
  └─ research accepted → evidence → research approval → blueprint approval
approval → FOUNDATION → SCAFFOLD → DONE
```

## Invariantes

1. Comparar petición declarada y problema sustentado; no afirmar que difieren
   sin evidencia ni añadir confirmación cuando están alineados.
2. Market research es opt-in. `product/market-research.md` existe solo tras
   aprobación explícita de su contenido.
3. Mission, MVP/out-of-scope, stack, arquitectura, seguridad, métricas,
   experiencia y rutas se presentan como **un blueprint consolidado** antes
   de cualquier materialización.
4. Una aprobación local no autoriza ticket, board, comentario ni otra
   mutación externa; usar `agteamos-work-items`.
5. El backlog se crea solo cuando el usuario lo pide explícitamente, mediante
   `agteamos-capture`.
6. La skill que escribe el primer archivo crea su carpeta. No precrear
   carpetas, placeholders, dashboard o docs futuros.
7. No hacer commits/push automáticos, `git add -A`, resets destructivos ni
   descartar trabajo ajeno.
8. No inventar usuarios, KPIs, escala, integraciones, despliegue o comandos.

## Gates de salida

- Problem framing confirmado y blueprint exacto aprobado.
- Research ausente, declinado o aprobado y trazable.
- Solo se materializaron rutas aprobadas.
- Proyecto compila/inicia y lint/test/build canónicos pasan.
- Onboarding refleja `done` vs `pending` real.
- Validador strict pasa.
- No existe backlog ni mutación externa no solicitada.

## Próximo paso

Detenerse; no continuar automáticamente.

**Próximo paso sugerido**: `agteamos-capture` para backlog o `agteamos-task`
para la primera feature — el usuario elige.
