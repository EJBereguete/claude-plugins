---
name: agteamos-story-breakdown
description: >
  Evalua si una user story debe dividirse en subtareas usando INVEST
  criteria. Si es demasiado grande o toca multiples capas, la divide
  en sub-issues con branches independientes.
used_by:
  - project-manager
  - architect
---

# Skill: Story Breakdown (INVEST)

## CONTRACT
- **Input**: Ticket o requirements.md validado por DoR
- **Output**: Decision de split + sub-issues creados si aplica
- **Trigger**: Despues de agteamos-definition-of-ready, antes de implementacion

> **Nota**: si una story dispara "SI dividir" por ser grande o incierta (ver
> "CUANDO DIVIDIR" abajo), es tambien candidata al gate opcional de
> `agteamos-premortem` en `agteamos-new-task` (Step 1.5) — ese paso ya pasó
> si la story viene de ese flujo; si esta skill se invoca sobre un ticket
> que no pasó por ahí (ej. importado de un tracker externo) y el tamaño/
> incertidumbre lo amerita, se puede ofrecer el premortem antes de dividir,
> no después — dividir una mala idea solo la vuelve varias tareas malas.

## INVEST CRITERIA

Cada user story debe cumplir INVEST:

| Letra | Criterio | Pregunta clave |
|-------|----------|----------------|
| **I** | Independent | ¿Se puede desarrollar sin bloquear o ser bloqueada por otras? |
| **N** | Negotiable | ¿Los detalles de implementacion se pueden discutir? |
| **V** | Valuable | ¿Entrega valor al usuario por si sola? |
| **E** | Estimable | ¿El equipo puede estimar el esfuerzo? |
| **S** | Small | ¿Cabe en un sprint? ¿Es < 5 story points? |
| **T** | Testable | ¿Tiene ACs verificables? |

## CUANDO DIVIDIR

```
¿La tarea toca mas de 2 capas? (BE + FE + DB + Auth + Infra)
  SI → Dividir por capa

¿Tiene mas de 5 ACs?
  SI → Evaluar si se pueden agrupar en subtareas logicas

¿El estimado es > XL (> 5 story points)?
  SI → Dividir por funcionalidad

¿Hay un spike de investigacion necesario antes de implementar?
  SI → Crear ticket separado para spike, luego ticket de implementacion

¿Es un cambio mecanico repetido en muchos call sites (renombrar, cambiar tipo compartido)?
  SI → Usar el patron Expand/Migrate/Contract (ver mas abajo), NO dividir por capa/feature
```

## PATRONES DE SPLIT

### 1. Por capa arquitectonica (mas comun)

```
Story: "Agregar sistema de notificaciones por email"

Split:
├── TASK-42a: [BE] NotificationService + SendGrid integration + tests
├── TASK-42b: [BE] Endpoints POST /notifications + tests
├── TASK-42c: [FE] NotificationBadge component + integration
└── TASK-42d: [QA] E2E tests + accessibility audit

Cada subtarea tiene su propia branch:
├── feature/42a-notification-service
├── feature/42b-notification-endpoints
├── feature/42c-notification-ui
└── feature/42d-notification-e2e
```

### 2. Por CRUD operations

```
Story: "CRUD de productos"

Split:
├── TASK-50a: [BE+FE] Crear producto (POST + form)
├── TASK-50b: [BE+FE] Listar productos (GET + table con paginacion)
├── TASK-50c: [BE+FE] Editar producto (PUT + form pre-filled)
└── TASK-50d: [BE+FE] Eliminar producto (DELETE + confirmacion)
```

### 3. Por complejidad (happy path primero)

```
Story: "Implementar checkout con pagos"

Split:
├── TASK-60a: Happy path — checkout con tarjeta exitoso
├── TASK-60b: Error handling — pago rechazado, timeout, duplicado
├── TASK-60c: Edge cases — currency conversion, tax calculation
└── TASK-60d: Security hardening — PCI compliance, tokenization
```

### 4.5. Expand / Migrate / Contract (refactor mecanico de blast-radius grande)

Los 4 patrones anteriores asumen que la tarea se puede partir por capa,
feature o complejidad. Un refactor **mecánico** (renombrar un símbolo
compartido, cambiar la forma de un tipo usado en 400 archivos) no encaja en
ninguno — forzarlo en una "vertical slice" fragmenta un cambio que en
realidad es uno solo, repetido muchas veces. Para este caso:

```
Story: "Renombrar UserId (string) a UserId (branded type) en todo el backend"

Split (NO por capa/feature — por fase del refactor):
├── TASK-90a: [Expand] Introducir el tipo nuevo en paralelo al viejo,
│             sin romper nada — ambos coexisten, todo el código viejo sigue
│             compilando sin cambios.
├── TASK-90b: [Migrate] Migrar los call sites en lotes (por módulo o por
│             PR de tamaño manejable), cada lote usando el tipo nuevo,
│             verificado independientemente antes de seguir con el siguiente.
├── TASK-90c: [Migrate] ...lotes siguientes hasta cubrir el 100% de call sites.
└── TASK-90d: [Contract] Eliminar el tipo viejo y cualquier shim de
              compatibilidad — solo cuando TASK-90b/90c confirmaron que no
              queda ningún call site sin migrar.
```

**Cuándo usar este patrón en vez de los de arriba**: el cambio es
esencialmente el mismo diff mecánico repetido N veces (no lógica de negocio
nueva), y N es grande (decenas o cientos de call sites). Si el cambio es
chico (menos de ~10 call sites), no vale la pena partirlo — es una sola
tarea.

### 5. Spike + implementacion

```
Story: "Migrar auth de sessions a JWT"

Split:
├── TASK-70a: [Spike] Evaluar JWT libraries, comparar jose vs jsonwebtoken vs pyjwt
└── TASK-70b: [Impl] Implementar JWT auth (depende de TASK-70a)
```

## BRANCH NAMING POR TIPO

```
User Story / Feature:  feature/<id>-<description>
Bug fix:               bugfix/<id>-<description>
Hotfix urgente:        hotfix/<id>-<description>
Refactor:              refactor/<id>-<description>
Spike / Research:      spike/<id>-<description>
Subtarea:              feature/<parent-id>/<sub-id>-<description>
```

Reglas:
- Minusculas siempre
- Separar palabras con guiones
- Incluir ID de ticket para trazabilidad
- Max 60 caracteres en la descripcion

## EXAMPLE: Decision de NO dividir

```
Story: "Agregar boton de exportar CSV en la tabla de usuarios"

Evaluacion INVEST:
- I: Independiente ✓ (no bloquea nada)
- N: Negotiable ✓
- V: Valuable ✓ (usuario puede exportar datos)
- E: Estimable ✓ (S — small)
- S: Small ✓ (1 endpoint BE + 1 boton FE)
- T: Testable ✓ (1 AC: click → descarga CSV correcto)

Decision: NO dividir. Es una tarea S que se hace en un solo PR.
Branch: feature/55-export-users-csv
```

## EXAMPLE: Decision de SI dividir

```
Story: "Implementar dashboard de analytics con graficos en tiempo real"

Evaluacion INVEST:
- I: Independiente ✓
- N: Negotiable ✓
- V: Valuable ✓
- E: Estimable ✗ (demasiadas incognitas: que graficos, que datos, real-time como?)
- S: Small ✗ (toca BE: endpoints de agregacion + FE: componentes de grafico + Infra: WebSocket o SSE)
- T: Testable ✗ (los ACs son vagos)

Decision: DIVIDIR.
├── TASK-80a: [BE] Endpoints de agregacion de datos (/api/analytics/*)
├── TASK-80b: [BE+Infra] WebSocket para actualizaciones en tiempo real
├── TASK-80c: [FE] Componentes de grafico (Chart.js o Recharts)
├── TASK-80d: [FE] Dashboard page con layout + integracion WS
└── TASK-80e: [QA] E2E del dashboard completo
```

## CREACION DE SUB-ISSUES

Cuando se divide, el @project-manager crea sub-issues en GitHub/Azure:

**Si `tracker: azure_devops` y `process_template: agile`**: cada subtarea es
un **Task** nativo, hijo del User Story original vía relación de jerarquía
real (no una mención en texto):
```
[operación: create-task] (título "[BE] NotificationService + SendGrid
  integration", body con Scope y ACs propios, Activity: Development;
  se resuelve contra agteamos/tracker/azure_devops.md)
[operación: link-parent-child] (id del Task recién creado como hijo,
  target-id = #42 el User Story original)
```
Esto hace que el Task aparezca en el Task Board de Azure Boards bajo el
User Story real, no solo referenciado en texto — habilita el burndown y las
vistas de sprint nativas de Azure.

**Cualquier otro tracker (GitHub, Planner, o Azure sin proceso Agile)**:
```
[operación: create-ticket] (título "[BE] NotificationService + SendGrid
  integration", body con "Parent: #42", Scope y ACs, label backend/sub-task;
  se resuelve contra agteamos/tracker/<tracker de platform.yml>.md — esa
  tabla ya cubre tanto GitHub sub-issues como Azure DevOps child work items)
```

Cada sub-issue/Task tiene:
- Referencia al parent ticket (relación nativa en Azure Agile, texto en el resto)
- ACs propios (subset del parent)
- Label de capa (backend, frontend, infra) — o `Microsoft.VSTS.Common.Activity` en Azure
- Asignado al agente correcto
