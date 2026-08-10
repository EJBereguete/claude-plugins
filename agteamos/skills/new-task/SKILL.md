---
name: agteamos-new-task
description: >
  Workflow para tareas nuevas sin ticket existente. El usuario describe lo que
  quiere en lenguaje natural. El equipo clarifica, diseña, crea el ticket en
  GitHub o Azure DevOps y continua automaticamente con agteamos-implement.
used_by:
  - architect
  - product-owner
  - project-manager
  - ui-ux-designer
---

# Workflow: New Task (Flow 2)

## CONTRACT

- **Input**: Descripcion en lenguaje natural del usuario + PROJECT_CONTEXT.md existente
- **Output**: Carpeta `agteamos/changes/<id>-<slug>/` creada + Ticket creado en GitHub/Azure DevOps + hand-off automatico a `agteamos-implement`
- **Trigger**: `agteamos-flow-router` determina que el repo tiene codigo y el input NO contiene referencia a ticket
- **Regla**: `brief.md` (schema `full`, ver Step 3) es **inmutable** una vez escrito — el
  unico contenido que se le puede agregar despues es la seccion `## Resolution notes`,
  nunca se reescribe el cuerpo original (input del usuario, problema, solucion propuesta,
  out-of-scope). Es lo que evita el scope creep silencioso.

---

## PRECONDITIONS

- `agteamos-repo-context-check` result: el repositorio tiene codigo fuente real.
- `agteamos/architecture/PROJECT_CONTEXT.md` existe (generado en onboarding o por ingenieria inversa).
- El input del usuario NO contiene URL, ID ni referencia a un ticket existente.
- No existe en `agteamos/changes/` una tarea activa con el mismo objetivo.

---

## PROCESS

### Step 1 — clarification-protocol: Entender la solicitud

Antes de cualquier decision tecnica o de diseno, obtener contexto suficiente
para redactar ACs sin ambiguedad. Hacer las siguientes preguntas en un
**unico mensaje** (maximo 3-5 preguntas, nunca una por una). Ver skill
`agteamos-clarification-protocol` para el protocolo completo.

**Preguntas de scope:**
- "¿Quienes son los usuarios de esta feature y que problema resuelve para ellos?"
- "¿Hay algo que explicitamente NO debe incluir esta feature?"
- "¿Es critica para el proximo release o puede esperar?"

**Preguntas de integracion (si aplica):**
- "¿Se conecta con algun servicio externo o proveedor ya existente en el proyecto?"

**Preguntas de UI (solo si hay cambios visuales):**
- "¿Hay un diseno previo o el equipo propone una solucion visual nueva?"

**Que distingue una buena pregunta de una mala:**

```
BUENA — concreta, con opciones cuando es posible:
  "¿Que evento dispara el envio del email?
   a) Registro de cuenta
   b) Accion manual del usuario
   c) Otro: [describir]"

MALA — vaga, tecnica, o preguntar lo que puedes inferir del codigo:
  "¿Como quieres implementar el sistema de mensajeria?"
  "¿Que framework de email prefieres?"
```

No proceder al Step 2 hasta tener respuestas claras y sin ambiguedad.

### Step 2 — Determinar schema: `full` vs `lite`

Antes de crear ningun artefacto, decidir el esquema segun el tamaño del cambio
(ver skill `agteamos-sdd-protocol` para la definicion formal):

```
¿Es una feature nueva, un cambio que toca 2+ capas, o algo con impacto en
la spec maestra de algun dominio?
  SI → schema: full  (requirements.md + design.md + specs/deltas/<dominio>.md + tasks.md)

¿Es un cambio trivial (typo, ajuste de 1 archivo, sin impacto de contrato)?
  SI → schema: lite  (resumen de 1 parrafo + test de regresion)
       Evaluar si vale la pena crear la carpeta completa `agteamos/changes/<id>-<slug>/`
       para un cambio de una linea — si no aporta trazabilidad real, un
       commit directo con test de regresion y mencion en el PR puede bastar.
       Si se crea la carpeta, solo lleva `task.yml` (schema: lite) y
       `progress.md` con el resumen — no los 4 artefactos de specs/.
```

Esta decisión debe ser **coherente con `agteamos-sdd-protocol`** (que define
`full` vs `lite` formalmente): con `schema: lite` **no** se crea `brief.md`
completo (ver Step 3) ni la estructura full de `specs/` — el resumen de 1
párrafo en `progress.md` alcanza, y no hay delta ni cambio a la spec maestra.
Si a mitad de la conversación aparece que el cambio sí altera el contrato de
un dominio, se promueve a `full` ahí mismo, no se documenta "después".

`new-task` normalmente termina en `schema: full` porque nace de una conversación
con el usuario sobre una necesidad nueva; los cambios triviales normalmente
entran por `agteamos-fix` o `agteamos-debug`, no por este flujo — pero la
decisión se re-evalúa igual si la conversación revela que el pedido es más
pequeño de lo que parecía.

### Step 3 — Crear la carpeta de la tarea

**Id provisional**: `tmp-<slug>` (no numérico, libre de colisión). Dos
personas arrancando el mismo día con la heurística obvia "el siguiente al
mayor en `changes/`" van a chocar en el dashboard aunque no choquen en disco;
`tmp-<slug>` no tiene ese problema porque el `slug` ya es específico de la
tarea. Crear `agteamos/changes/tmp-<slug>/` (el `id` se reemplaza por el real
una vez creado el ticket en el Step 8 — el renombrado de carpeta es
**obligatorio, no condicional**: el id inicial siempre es provisional, así
que siempre cambia) con:

```
agteamos/changes/tmp-<slug>/
├── task.yml
├── brief.md                     (solo si schema: full — ver template abajo)
├── progress.md
└── specs/                       (solo si schema: full)
    ├── requirements.md
    ├── design.md
    ├── tasks.md
    └── deltas/
```

Este es el mismo árbol que documentan `agteamos-task-tracking` y
`agteamos-implement` para la carpeta ya con id definitivo — acá aparece
incompleto porque varios archivos (`report.html`, `verify-report.md`,
`evidence/`) todavía no existen a esta altura del flujo.

**No crear la rama en este paso.** El id todavía es provisional; crear una
rama con un nombre que después hay que renombrar dos veces es exactamente el
tipo de rama huérfana que sobrevive por accidente. La rama se crea recién en
`agteamos-implement` Step 5, con el id real ya asignado.

La creación de `task.yml`/`progress.md` (incluida la captura automática de
`owner` vía `git config`) sigue el procedimiento de la skill
`agteamos-task-tracking` — esta skill la referencia, no la duplica.
`context_tier` se fija acá con un valor por defecto según `schema` (`lite` →
`1`, `full` → `2`) y se reevalúa en el Step 5 una vez conocida la
complejidad y los dominios afectados — ver ese paso.

**`brief.md`** (solo `schema: full`) se escribe en este mismo paso, **antes**
de `specs/requirements.md` (Step 4) — es el registro inmutable del pedido tal
como llegó, antes de que nadie lo reinterprete:

```markdown
# Brief: <titulo de la tarea>

## Input original del usuario
> [el pedido tal cual lo escribio el usuario en el Step 1, sin parafrasear]

## Problema identificado
[el problema real detras del pedido, segun quedo entendido al cierre de
clarification-protocol]

## Solucion propuesta (alto nivel)
[1 parrafo — el enfoque, sin detalle de implementacion; eso vive en design.md]

## Out of Scope (original)
- [item 1 acordado en clarification-protocol]
- [item 2]

## Resolution notes
[Seccion append-only. El cuerpo de arriba NUNCA se reescribe — toda
aclaracion posterior se agrega aqui, con fecha, sin tocar lo anterior.]
```

Con `schema: lite` no se crea `brief.md` — el resumen de 1 párrafo que exige
`agteamos-sdd-protocol` para `lite` alcanza y vive directo en `progress.md`.

### Step 4 — @product-owner: Escribir requirements.md

Con las respuestas del Step 1, el agente de producto crea el documento de
requisitos en `agteamos/changes/<id>-<slug>/specs/requirements.md`
(schema `full`) o el resumen de 1 párrafo en `progress.md` (schema `lite`):

```markdown
# Requirements: <titulo de la feature>

## Vision
[Una oracion: que hace, para quien, y que valor genera]

## User Personas
- **[Persona]**: [descripcion breve del usuario objetivo]

## Acceptance Criteria
- [ ] Given <contexto>, When <accion>, Then <resultado esperado>
- [ ] Given <contexto>, When <accion>, Then <resultado esperado>
- [ ] Given <contexto>, When <accion>, Then <resultado esperado>

## Out of Scope (explícito)
- [Lo que NO se implementa en este ticket para prevenir scope creep]

## KPIs de exito
- [Metrica medible que indica que la feature funciona correctamente]

## Definition of Done
- [ ] Todos los ACs verificados
- [ ] Unit tests escritos y pasando
- [ ] E2E con screenshots capturados
- [ ] Codigo revisado y mergeado
- [ ] Ticket cerrado
```

Output: `agteamos/changes/<id>-<slug>/specs/requirements.md` escrito.

> **SDD Checkpoint 1**: requirements.md debe estar aprobado por el usuario
> antes de continuar. Esto es la base del contrato de la tarea.

### Step 5 — @architect: Analisis de impacto tecnico

El arquitecto lee `PROJECT_CONTEXT.md` y el `requirements.md` recien creado
para determinar:

**Capas afectadas:**

| Capa | Afectada | Justificacion |
|------|----------|---------------|
| Frontend | SI / NO | [razon] |
| Backend | SI / NO | [razon] |
| Database | SI / NO | [nuevas tablas, migraciones, indices] |
| Infrastructure | SI / NO | [variables de entorno, secrets, servicios externos] |

**Complejidad estimada:**

| Talla | Criterio |
|-------|----------|
| S | 1 capa, 1-2 ACs, completable en horas |
| M | 1-2 capas, 3-5 ACs, completable en un dia |
| L | 2-3 capas, 5+ ACs, puede requerir split |
| XL | 3+ capas o spike necesario, requiere split obligatorio |

**Agentes necesarios**: Lista solo los que deben activarse segun las capas
identificadas (no activar agentes innecesarios para ahorrar tokens).

**Dominios afectados** (`domains:` en task.yml): uno o mas dominios de spec
(ej. `notifications`, `billing`) — determina cuantos archivos
`specs/deltas/<dominio>.md` se van a escribir.

**Validar contra `agteamos/specs/index.yml`** (si existe — lo crea
`agteamos-onboard` al sembrar specs, o `agteamos-close-task` la primera vez
que un dominio recibe un delta): cada entrada de `domains:` debe coincidir
EXACTO con un nombre ya registrado ahi. Si no existe el archivo todavia
(primer dominio del proyecto), no hay nada contra que validar — se crea en el
primer sync. Si existe y el nombre no matchea ningun dominio conocido,
preguntar al usuario si es un dominio nuevo (se agrega) o un typo de uno
existente (ej. `notification` vs `notifications`) — nunca crear un dominio
nuevo en silencio. Esto evita que el mismo dominio de negocio termine
repartido en 2-3 archivos de spec maestra por variaciones de tipeo.

**Riesgos identificados**: Dependencias, posibles conflictos con codigo
existente, consideraciones de seguridad.

**Actualizar `context_tier` en `task.yml`** (ver "CONTEXT TIERS" en
`agteamos-implement` para la definicion completa de cada nivel): el valor por
defecto puesto en el Step 3 solo consideraba `schema`; ahora que se conoce la
complejidad y los dominios, subirlo a `3` si la complejidad estimada es L/XL
o `domains:` tiene 2+ entradas — **nunca bajarlo**. Si se sube, dejar una fila
en la tabla "Decisions Made" de `progress.md` con el motivo (ej. "context_tier
1→3: la tarea cruza 2 dominios, notifications y billing").

> **SDD Checkpoint 2**: design.md debe estar escrito y aprobado antes de
> asignar trabajo a los engineers. El diseño tecnico es inmutable durante
> la implementacion — si cambia, se actualiza design.md primero.

> **SDD Checkpoint 2.5**: junto con design.md, @architect escribe un archivo
> `specs/deltas/<dominio>.md` por cada dominio afectado (ADDED/MODIFIED/REMOVED
> contra `agteamos/specs/<dominio>.md`, o "Sin cambios en la spec maestra" si
> no aplica). Si la tarea toca 2+ dominios, se escribe un delta por dominio.
> Ver skill `agteamos-sdd-protocol`.

### Step 6 — @ui-ux-designer: Mockup (condicional — solo si FE esta impactado)

Si la capa Frontend esta afectada, este paso es **obligatorio** y debe
completarse **antes de cualquier implementacion**.

El diseñador presenta una propuesta visual en formato Mermaid o wireframe
ASCII que sea 100% consistente con el design system del proyecto
(`agteamos/design/DESIGN_SYSTEM.md`).

**Formato de wireframe ASCII:**
```
+--------------------------------------------------+
|  Header existente (sin cambios)                  |
+--------------------------------------------------+
|  [Sidebar]  |  [NUEVA SECCION: Nombre feature]   |
|             |                                     |
|  Navegacion |  [ Campo A    ] [ Campo B    ]      |
|  existente  |  [ Accion primaria          ]       |
|             |  [ Accion secundaria        ]       |
+--------------------------------------------------+
|  Footer existente (sin cambios)                  |
+--------------------------------------------------+
```

**Protocolo de aprobacion del usuario:**

```
@ui-ux-designer presenta el mockup al usuario:
"Aqui esta la propuesta de diseno para [feature]. He seguido el patron
visual de [seccion referenciada] para mantener consistencia.

¿Apruebas este diseno o quieres ajustes antes de continuar?"

→ SI aprueba: continuar con Step 7
→ NO aprueba: ajustar y re-presentar (max 2 rondas antes de escalar a @architect)
```

**REGLA ABSOLUTA**: No escribir ningun codigo de UI hasta tener aprobacion
explicita del usuario.

### Step 7 — story-breakdown: Verificar INVEST

El skill `agteamos-story-breakdown` evalua si la tarea pasa el criterio INVEST:

```
¿La tarea toca 3+ capas? → SI: dividir por capa
¿Tiene mas de 5 ACs? → SI: evaluar agrupacion en subtareas
¿Estimado es XL? → SI: dividir por funcionalidad o crear spike primero
¿Tiene dependencias no resueltas? → SI: crear ticket de prerequisito
```

Si se divide, cada subtarea recibe su propio branch y ticket. Ver
`agteamos-story-breakdown` skill para los patrones de split disponibles.

### Step 8 — @project-manager: Escribir tasks.md, crear ticket y continuar

**8.1 — `specs/tasks.md`** (solo `schema: full`; con `lite` se omite este
sub-paso): el project manager escribe
`agteamos/changes/tmp-<slug>/specs/tasks.md` con el checklist de
implementación desglosado por capa y agente responsable — ver el formato
completo ("4. tasks.md — CUANDO") en la skill `agteamos-sdd-protocol`. Este
archivo tiene que existir **antes** del Checkpoint 3 de abajo; nada más en
este workflow lo escribe.

**8.2 — Crear el ticket**: el project manager crea el ticket con:

```
[operación: create-ticket] (título "[Feature] <titulo de la feature>", body con
  Description / Acceptance Criteria / Technical Notes / Out of Scope según
  abajo; se resuelve contra agteamos/tracker/<tracker de platform.yml>.md —
  esa tabla ya cubre tanto GitHub Issues como Azure DevOps work items)

## Description
<una oracion del vision del requirements.md>

## Acceptance Criteria
- [ ] Given..., When..., Then...
- [ ] Given..., When..., Then...

## Technical Notes
- Layers: <FE / BE / Fullstack>
- Complexity: <S / M / L / XL>
- Agents needed: <lista>

## Out of Scope
- <items del requirements.md>
```

Una vez creado el ticket, el project manager:
1. Actualiza el `task.yml` con el `ticket_url` y el `id` real asignado, y
   renombra la carpeta `agteamos/changes/tmp-<slug>/` a
   `agteamos/changes/<id>-<slug>/`. Este renombrado es **obligatorio, no
   condicional** — el id de Step 3 siempre fue provisional (`tmp-<slug>`),
   así que siempre hay algo que renombrar. Ídem con el nombre de la carpeta
   dentro de cualquier referencia ya escrita en `brief.md`/`progress.md` si
   la hubiera.
2. **Continua automaticamente** con el workflow `agteamos-implement` usando el
   ticket recien creado. Si `platform.yml` tiene `handoff_mode: explicit`,
   confirmar con el usuario antes de continuar; si es `auto`, no esperar
   input adicional.

> **SDD Checkpoint 3**: `tasks.md` está completo con checklist de
> implementación (escrito en 8.1, no antes) y el ticket real fue creado
> (8.2), reemplazando el id provisional del Step 3. El hand-off al workflow
> `agteamos-implement` incluye los 4 artefactos en specs/ (requirements.md,
> design.md, deltas/<dominio>.md, tasks.md) si el schema es `full`.

---

## YAML TASK SPEC

Junto con `requirements.md`, se crea (o completa) el archivo `task.yml` con
los metadatos estructurados de la tarea. Este archivo es la fuente de verdad
para rastreo entre sesiones y para que los agentes conozcan el contexto sin
leer todo `progress.md`. La captura de `owner`/`handoffs` es automática vía
`git config` — ver skill `agteamos-task-tracking` para el mecanismo exacto.

```yaml
# agteamos/changes/42-email-notifications/task.yml
id: "42"
title: "Add email notifications"
type: feature              # feature | bug | hotfix | refactor | spike
schema: full                # full | lite — ver Step 2 de esta skill
context_tier: 2              # 1 | 2 | 3 — valor por defecto segun schema (Step 3),
                             # reevaluado segun complejidad/dominios en Step 5.
                             # Ver "CONTEXT TIERS" en agteamos-implement. Solo sube.
layer: fullstack            # frontend | backend | fullstack | infra
priority: medium            # critical | high | medium | low
status: in_progress         # pending | in_progress | in_review | done
branch: feature/42-email-notifications
platform: github            # github | azure
ticket_url: https://github.com/user/repo/issues/42
domains: [notifications]    # dominios de spec afectados (uno o mas)
doc_impact: true             # si es false, agteamos-close-task se salta el
                             # paso de actualizar agteamos/. Default true.
created: 2026-08-09
updated: 2026-08-09
owner:                      # capturado automaticamente via git config, no preguntado
  name: "Eddy Bereguete"
  email: "ebereguete@phoenixcalibrationdr.com"
handoffs: []                # se llena si otra persona retoma la tarea
assigned_to:                 # agentes de IA que intervienen (distinto de owner)
  - backend-engineer
  - frontend-engineer
depends_on: []          # IDs de tickets que deben completarse antes
```

El `task.yml` se actualiza en cada transicion de estado. Es lo primero que
lee cualquier agente al retomar una tarea tras un reset de contexto (ver
"context tiers" en la skill `agteamos-implement`).

---

## EXAMPLE: Walkthrough completo

**Input del usuario:**
```
"Quiero agregar autenticacion con Google OAuth"
```

**Step 1 — clarification-protocol:**
```
Agente: "Para disenar bien esta feature, necesito algunos detalles:

1. ¿Quien debe poder usar Google OAuth?
   a) Solo usuarios nuevos (registro)
   b) Usuarios nuevos y existentes (vincular cuenta)
   c) Ambos flujos

2. ¿El proyecto ya tiene auth de algun tipo? (Lo puedo inferir del codigo,
   pero confirma si hay algo que deba preservarse)

3. ¿Debe haber opcion de 'Continuar sin Google' o es el unico metodo de login?"

Usuario: "Solo para registro de usuarios nuevos, no hay auth todavia, y si,
debe coexistir con email/password."

Agente: "Entendido. Voy a implementar:
- Registro via Google OAuth (solo para cuentas nuevas)
- Coexistencia con flujo email/password existente (o nuevo, segun el codigo)
- NO incluye: login de cuentas existentes via Google, vinculacion de cuentas

¿Correcto?"

Usuario: "Si, correcto."
```

**Step 2 — schema determinado:** `full` (feature nueva, toca 2+ capas).

**Step 3 — carpeta creada:** `agteamos/changes/tmp-google-oauth-registration/`
(id provisional — no se crea rama todavia), con `task.yml` (`context_tier: 2`
por defecto) y `brief.md`:
```markdown
# Brief: Google OAuth registration

## Input original del usuario
> "Quiero agregar autenticacion con Google OAuth"

## Problema identificado
El onboarding actual (email/password) tiene friccion; los usuarios nuevos
abandonan el registro con mas frecuencia que si pudieran usar una cuenta
existente de Google.

## Solucion propuesta (alto nivel)
Agregar un boton "Registrarse con Google" que coexiste con el registro
email/password existente, solo para cuentas nuevas.

## Out of Scope (original)
- Login de cuentas existentes via Google
- Vinculacion de cuenta Google a cuenta email/password existente
- Otros proveedores OAuth (GitHub, Microsoft)

## Resolution notes
(vacio por ahora)
```

**Step 4 — requirements.md creado:**
```markdown
# Requirements: Google OAuth Registration

## Vision
Permitir que usuarios nuevos se registren usando su cuenta de Google,
reduciendo la friccion del onboarding.

## Acceptance Criteria
- [ ] Given un usuario nuevo, When hace click en "Registrarse con Google",
      Then es redirigido a Google OAuth y al volver tiene cuenta creada
- [ ] Given un usuario que ya existe con ese email,
      When intenta registrarse con Google,
      Then ve un mensaje "Ya tienes cuenta, inicia sesion"
- [ ] Given un fallo en Google OAuth (timeout, cancel),
      When el usuario vuelve al sitio,
      Then ve un mensaje de error claro y puede intentar de nuevo

## Out of Scope
- Login de cuentas existentes via Google
- Vinculacion de cuenta Google a cuenta email/password existente
- Otros proveedores OAuth (GitHub, Microsoft)
```

**Step 5 — Analisis tecnico:**
```
Capas afectadas:
- Backend: SI — nuevo endpoint /auth/google, callback handler, user creation
- Frontend: SI — boton "Registrarse con Google", redirect handling
- Database: SI — columna google_id en tabla users
- Infrastructure: SI — GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env

Complejidad: L (2 capas + DB + env vars)
Dominios: [auth]
Agentes: @backend-engineer, @frontend-engineer, @security-engineer

context_tier: 2→3 (complejidad L) — fila agregada a "Decisions Made" en progress.md:
  "context_tier 2→3: complejidad estimada L (2 capas + DB + env vars)"
```

**Step 6 — Mockup (FE impactado):**
```
+------------------------------------------+
|  Crea tu cuenta                          |
|                                          |
|  [  Correo electrónico  ]               |
|  [  Contraseña          ]               |
|  [ Crear cuenta ]                        |
|                                          |
|  ─────────────  o  ──────────────        |
|                                          |
|  [ G  Registrarse con Google ]           |
+------------------------------------------+

¿Apruebas este diseno?
```

Usuario: "Si, aprovado."

**Step 7 — story-breakdown:**
```
INVEST check:
- S: NO (es L — 2 capas + DB) → evaluar split

Split decision:
├── TASK-42a: [BE+DB] OAuth endpoint + user creation + migration
└── TASK-42b: [FE] Google sign-in button + redirect handling

Cada subtarea tendra su propio branch y sub-issue.
```

**Step 8 — tasks.md + ticket creado:**

8.1 — `agteamos/changes/tmp-google-oauth-registration/specs/tasks.md` escrito
por @project-manager con el checklist por capa (ver formato en
`agteamos-sdd-protocol`).

8.2:
```
[operación: create-ticket] (título "[Feature] Google OAuth registration",
  labels feature/auth/fullstack; se resuelve contra
  agteamos/tracker/<tracker de platform.yml>.md)
# → Issue #42 created: https://github.com/user/repo/issues/42
```

Carpeta renombrada (obligatorio): `agteamos/changes/tmp-google-oauth-registration/`
→ `agteamos/changes/42-google-oauth-registration/`.

```yaml
# task.yml actualizado tras el rename:
id: "42"
title: "Google OAuth registration"
type: feature
schema: full
context_tier: 3
layer: fullstack
priority: high
domains: [auth]
doc_impact: true
branch: feature/42-google-oauth-registration
platform: github
ticket_url: https://github.com/user/repo/issues/42
created: 2026-08-09
updated: 2026-08-09
status: in_progress
owner:
  name: "Eddy Bereguete"
  email: "ebereguete@phoenixcalibrationdr.com"
handoffs: []
assigned_to:
  - backend-engineer
  - frontend-engineer
  - security-engineer
depends_on: []
```

```
→ Continuando automaticamente con agteamos-implement usando issue #42...
```

---

## ANTI-PATTERNS

- **No empezar a codificar antes de la aprobacion del mockup** — si FE esta
  impactado, el diseno debe aprobarse explicitamente antes de escribir una
  sola linea de componente.

- **No saltar la clarification-protocol** — incluso si la solicitud parece
  clara, confirmar el scope y los out-of-scope previene rework.

- **No crear el ticket sin ACs verificables** — un ticket sin ACs en formato
  Given/When/Then no pasara el Definition of Ready del Flujo 3 y causara
  retraso.

- **No activar todos los agentes por defecto** — activar solo los agentes
  que corresponden a las capas identificadas en el analisis tecnico.

- **No saltar story-breakdown para tareas L o XL** — si la tarea toca 3+
  capas, dividir es obligatorio antes de crear el ticket.

- **No usar schema `full` para un cambio de una linea** — crea carpetas
  vacías de specs/ sin contenido real. Evaluar `lite` primero.
