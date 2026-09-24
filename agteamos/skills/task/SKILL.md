---
name: agteamos-task
description: >
  Workflow para tareas nuevas sin ticket existente. El usuario describe lo que
  quiere en lenguaje natural. El equipo clarifica, diseña, crea el ticket en
  GitHub o Azure DevOps y continua automaticamente con agteamos-implement.
  Incluye inline, como parte integral del flujo, el protocolo completo de
  clarification-protocol (Step 1) y de story-breakdown/INVEST (Step 7) — ya
  no son skills separadas, son sub-secciones de este workflow.
used_by:
  - architect
  - product-manager
  - ui-ux-designer
---

# Workflow: New Task (Flow 2)

## CONTRACT

- **Input**: Descripcion en lenguaje natural del usuario + PROJECT_CONTEXT.md existente
- **Output**: Carpeta `agteamos/changes/<id>-<slug>/` creada + Ticket creado en GitHub/Azure DevOps + hand-off automatico a `agteamos-implement`
- **Trigger**: `agteamos-router` determina que el repo tiene codigo y el input NO contiene referencia a ticket
- **Regla**: `brief.md` (schema `full`, ver Step 3) es **inmutable** una vez escrito — el
  unico contenido que se le puede agregar despues es la seccion `## Resolution notes`,
  nunca se reescribe el cuerpo original (input del usuario, problema, solucion propuesta,
  out-of-scope). Es lo que evita el scope creep silencioso.

---

## PRECONDITIONS

- `agteamos-router` result: el repositorio tiene codigo fuente real.
- `agteamos/architecture/PROJECT_CONTEXT.md` existe (generado en onboarding o por ingenieria inversa).
- El input del usuario NO contiene URL, ID ni referencia a un ticket existente.
- No existe en `agteamos/changes/` una tarea activa con el mismo objetivo.

---

## PROCESS

### Step 1 — Entender la solicitud (protocolo de clarificacion completo)

Antes de cualquier decision tecnica o de diseno, obtener contexto suficiente
para redactar ACs sin ambiguedad. Hacer las siguientes preguntas en un
**unico mensaje** (maximo 3-5 preguntas, nunca una por una).

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

#### Protocolo de clarificacion (contenido completo)

**CONTRACT del protocolo:**
- **Input**: Request del usuario (vago o completo)
- **Output**: Contexto suficiente para escribir requirements.md con ACs verificables
- **Regla**: No empezar implementacion con contexto ambiguo

**Cuando se activa** (referencia general del protocolo, mas alla de este Step 1):

1. **Flujo 2** (tarea nueva sin ticket) — siempre, es este mismo Step 1
2. **Flujo 3** (ticket existente) — solo si el ticket no pasa Definition of Ready
3. **Flujo 1** (proyecto desde cero) — para capturar vision completa

**Proceso del protocolo:**

##### Paso A: Analizar lo que el usuario dijo

Lee el request del usuario e identifica:
- Lo que esta claro (no preguntar sobre esto)
- Lo que falta o es ambiguo (preguntar sobre esto)
- Lo que puedes inferir del contexto del proyecto (confirmar, no preguntar)

##### Paso B: Hacer preguntas FOCALIZADAS — mecanismo de frontera (grilling)

En vez de una tanda fija de preguntas pensada de una sola vez, modelar las
preguntas como un **árbol de dependencias** y trabajarlo por **rondas**:

1. Listar todas las preguntas posibles (lo ambiguo/faltante del Paso A).
2. Marcar cuáles dependen de la respuesta a otra pregunta todavía sin
   contestar (ej. "¿qué proveedor de email?" depende de "¿necesitamos
   templates HTML?" si la respuesta cambia las opciones disponibles).
3. **La frontera de esta ronda** = las preguntas cuyos prerequisitos ya
   están resueltos. Las que dependen de algo aún abierto se difieren a la
   ronda siguiente — nunca se preguntan antes de tiempo, aunque ya se te
   hayan ocurrido.
4. Repetir rondas hasta que la frontera quede vacía (no hay más preguntas
   pendientes cuyos prerequisitos ya estén resueltos).

**Regla separada, no negociable: averiguar hechos es tu trabajo, nunca del
usuario.** Antes de poner una pregunta en la frontera, preguntarse: "¿esto
es una decisión/preferencia que solo el usuario puede dar, o es un hecho que
puedo comprobar leyendo el código/config del proyecto?" Si es lo segundo,
usar `Read`/`Grep`/`Glob` (o un subagente de exploración si la búsqueda es
amplia) para resolverlo — nunca preguntarlo. Esto no bloquea el resto de la
ronda: solo las preguntas que dependían de ese hecho esperan, las demás
preguntas de la ronda se hacen igual.

**Formato de cada ronda**: preguntas numeradas, cada una con **una
recomendación propia del agente ya incluida** (ver el ejemplo de
`agteamos-bootstrap` Step 1: "¿Cuál es el entorno de despliegue objetivo?
Si no tenés preferencia, recomiendo VPS por [razón]") — así el usuario puede
aprobar en bloque en vez de responder todo desde cero.

**Reglas generales (siguen aplicando dentro de cada ronda):**
- Maximo 3-5 preguntas por ronda (no bombardear)
- Preguntas concretas con opciones cuando sea posible
- No preguntar lo que puedes inferir del codigo existente
- Si algo es una decision tecnica que no afecta al usuario, decidir tu

**Antes de abrir una pregunta o proponer una feature/dirección nueva**:
revisar `agteamos/decisions/out-of-scope/` (si existe) por similitud
conceptual — no keyword matching — con lo que se está por preguntar. Si algo
ya fue rechazado explícitamente antes, decirlo ("esto ya se descartó el
<fecha> por <razón> — ¿seguís queriendo revisitarlo?") en vez de volver a
preguntarlo como si fuera nuevo. Ver skill `agteamos-decisions`.

##### Paso C: Confirmar entendimiento

Resumir en 2-3 bullets lo que vas a hacer y pedir confirmacion.

##### Preguntas por tipo de tarea

**Feature nueva (Flujo 2):**

```
Preguntas de SCOPE:
- "¿Quienes son los usuarios de esta feature?"
- "¿Que debe pasar exactamente cuando [accion]?"
- "¿Hay algo que explicitamente NO debe incluir?"

Preguntas de DISENO (si afecta UI):
- "¿Hay un diseno previo o creo una propuesta?"
- "¿Debe seguir el patron visual de [seccion existente]?"

Preguntas de INTEGRACION:
- "¿Esto se conecta con algun servicio externo? ¿Cual?"
- "¿Hay un proveedor preferido o lo elijo yo?"

Preguntas de PRIORIDAD:
- "¿Es critico para el proximo release o puede esperar?"
```

**Bug fix (Flujo 2/3):**

```
- "¿Puedes reproducir el error? ¿En que condiciones?"
- "¿Desde cuando ocurre? ¿Funcionaba antes?"
- "¿Afecta a todos los usuarios o solo a algunos?"
- "¿Hay algun workaround conocido?"
```

**Ticket incompleto (Flujo 3):**

```
El ticket dice: "Mejorar el login"

Preguntas:
- "El ticket #42 dice 'Mejorar el login'. ¿Que aspecto especifico?
   a) Performance (carga lenta)
   b) UX (flujo confuso)
   c) Seguridad (agregar MFA)
   d) Otro: [describir]"
```

#### Ejemplos de clarification-protocol

**EXAMPLE: Flujo completo de clarificacion**

```
Usuario: "Quiero agregar notificaciones por email"

Agente: "Para disenar bien esta feature, necesito algunos detalles:

1. ¿Que eventos deben disparar un email?
   a) Registro de cuenta
   b) Reset de contraseña
   c) Actividad en la cuenta
   d) Todos los anteriores
   e) Otros: [describir]

2. ¿Hay un proveedor de email preferido? (SendGrid, AWS SES, SMTP propio)

3. ¿Los emails necesitan template HTML personalizado o texto plano es suficiente?"

Usuario: "a y b, usa SendGrid, y si necesito templates bonitos"

Agente: "Entendido. Voy a implementar:
- Email de bienvenida al registrar cuenta
- Email de reset de contraseña
- Usando SendGrid como proveedor
- Con templates HTML personalizados
- NO incluye: notificaciones push, SMS, ni emails de marketing

¿Correcto?"

Usuario: "Si, correcto"
→ Procede a escribir requirements.md con ACs claros
```

#### Anti-patterns de clarification-protocol

- **No preguntar todo de golpe** — maximo 5 preguntas por ronda
- **No preguntar decisiones tecnicas al usuario** — esas las toma el equipo
- **No asumir sin confirmar** — si hay duda, pregunta
- **No bloquear indefinidamente** — si despues de 2 rondas no hay claridad, proponer la solucion mas razonable y pedir aprobacion
- **Preguntar algo que se puede comprobar leyendo el código** — si la respuesta está en el repo, léela; no le pases al usuario el trabajo de mirar su propio código
- **Preguntar una pregunta de una ronda posterior antes de tiempo** — si depende de una respuesta que todavía no llegó, esperar a la ronda que corresponde
- **Terminar sin haber vaciado la frontera** — parar en una ronda arbitraria (ej. "ya hice 2 rondas") en vez de seguir hasta que no queden preguntas con prerequisitos resueltos

### Step 1.5 — Premortem opcional (nunca automatico)

Si la feature descrita es grande, riesgosa, o toca una decision de negocio
no trivial (no todo ticket lo amerita — una feature chica y clara no
necesita esto), ofrecer: *"¿Queres que corra una critica dura de esta
feature antes de crear el ticket? Puede ahorrar construir algo que no vale
la pena."*

- Si el usuario acepta: invocar la skill `agteamos-decisions` con la
  descripcion de la feature y las respuestas de Step 1 como input, aplicada
  a escala de feature (ver la nota de reinterpretacion de angulos en
  `agteamos-decisions`, seccion "LOS OCHO ANGULOS DE ATAQUE").
- Si el usuario declina, o la feature es claramente chica/de bajo riesgo, no
  ofrecerlo — no interrumpir el flujo por defecto.
- El veredicto **no bloquea** el avance a Step 2 — es informacion para
  decidir, nunca un gate. Si el usuario sigue adelante pese a una grieta
  senalada, anotarla en `brief.md`/`requirements.md` (segun el schema del
  Step 2) para que quede trazada, no oculta.

### Step 2 — Determinar schema: `full` vs `lite`

Antes de crear ningun artefacto, decidir el esquema segun el tamaño del cambio
(ver skill `agteamos-spec` para la definicion formal):

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

Esta decisión debe ser **coherente con `agteamos-spec`** (que define
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

Este es el mismo árbol que documentan `agteamos-implement` para la carpeta ya con id definitivo — acá aparece
incompleto porque varios archivos (`report.html`, `verify-report.md`,
`evidence/`) todavía no existen a esta altura del flujo.

**No crear la rama en este paso.** El id todavía es provisional; crear una
rama con un nombre que después hay que renombrar dos veces es exactamente el
tipo de rama huérfana que sobrevive por accidente. La rama se crea recién en
`agteamos-implement` Step 5, con el id real ya asignado.

La creación de `task.yml`/`progress.md` (incluida la captura automática de
`owner` vía `git config`) sigue el procedimiento de la skill
`agteamos-implement` — esta skill la referencia, no la duplica.
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
[el problema real detras del pedido, segun quedo entendido al cierre del
protocolo de clarificacion]

## Solucion propuesta (alto nivel)
[1 parrafo — el enfoque, sin detalle de implementacion; eso vive en design.md]

## Out of Scope (original)
- [item 1 acordado en el protocolo de clarificacion]
- [item 2]

## Resolution notes
[Seccion append-only. El cuerpo de arriba NUNCA se reescribe — toda
aclaracion posterior se agrega aqui, con fecha, sin tocar lo anterior.]
```

**Regla de durabilidad**: `brief.md` puede quedar sin tocarse días o semanas
si la tarea se pausa (está en `agteamos/changes/` activo, no archivado). No
referenciar rutas de archivo ni números de línea ahí — el código se mueve,
esas referencias quedan rotas y nadie las corrige porque el archivo es
inmutable. Describir interfaces, comportamientos y contratos ("el endpoint
que crea invoices", "el servicio que envía notificaciones") en vez de
`src/services/invoice_service.py:42` — eso vale para `progress.md` (que sí
se actualiza en cada checkpoint), no para `brief.md`.

Con `schema: lite` no se crea `brief.md` — el resumen de 1 párrafo que exige
`agteamos-spec` para `lite` alcanza y vive directo en `progress.md`.

### Step 4 — @product-manager: Escribir requirements.md

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
`agteamos-knowledge` al sembrar specs, o `agteamos-implement` la primera vez
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
> Ver skill `agteamos-spec`.

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

### Step 7 — Verificar INVEST y decidir si dividir en subtareas

Evaluar si la tarea pasa el criterio INVEST:

```
¿La tarea toca 3+ capas? → SI: dividir por capa
¿Tiene mas de 5 ACs? → SI: evaluar agrupacion en subtareas
¿Estimado es XL? → SI: dividir por funcionalidad o crear spike primero
¿Tiene dependencias no resueltas? → SI: crear ticket de prerequisito
```

Si se divide, cada subtarea recibe su propio branch y ticket. Ver el detalle
completo de criterios, patrones de split y creacion de sub-issues a continuacion.

#### Story breakdown con INVEST (contenido completo)

**CONTRACT:**
- **Input**: Ticket o requirements.md validado por DoR
- **Output**: Decision de split + sub-issues creados si aplica
- **Trigger**: Despues de agteamos-implement, antes de implementacion (en este
  flujo, es este mismo Step 7)

> **Nota**: si una story dispara "SI dividir" por ser grande o incierta (ver
> "Cuando dividir" abajo), es tambien candidata al gate opcional de
> `agteamos-decisions` (Step 1.5 de este mismo workflow) — ese paso ya pasó
> si la story viene de acá; si esta evaluación se hace sobre un ticket que no
> pasó por Step 1.5 (ej. importado de un tracker externo) y el tamaño/
> incertidumbre lo amerita, se puede ofrecer el premortem antes de dividir,
> no después — dividir una mala idea solo la vuelve varias tareas malas.

##### INVEST criteria

Cada user story debe cumplir INVEST:

| Letra | Criterio | Pregunta clave |
|-------|----------|----------------|
| **I** | Independent | ¿Se puede desarrollar sin bloquear o ser bloqueada por otras? |
| **N** | Negotiable | ¿Los detalles de implementacion se pueden discutir? |
| **V** | Valuable | ¿Entrega valor al usuario por si sola? |
| **E** | Estimable | ¿El equipo puede estimar el esfuerzo? |
| **S** | Small | ¿Cabe en un sprint? ¿Es < 5 story points? |
| **T** | Testable | ¿Tiene ACs verificables? |

##### Cuando dividir

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

##### Patrones de split

**1. Por capa arquitectonica (mas comun)**

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

**2. Por CRUD operations**

```
Story: "CRUD de productos"

Split:
├── TASK-50a: [BE+FE] Crear producto (POST + form)
├── TASK-50b: [BE+FE] Listar productos (GET + table con paginacion)
├── TASK-50c: [BE+FE] Editar producto (PUT + form pre-filled)
└── TASK-50d: [BE+FE] Eliminar producto (DELETE + confirmacion)
```

**3. Por complejidad (happy path primero)**

```
Story: "Implementar checkout con pagos"

Split:
├── TASK-60a: Happy path — checkout con tarjeta exitoso
├── TASK-60b: Error handling — pago rechazado, timeout, duplicado
├── TASK-60c: Edge cases — currency conversion, tax calculation
└── TASK-60d: Security hardening — PCI compliance, tokenization
```

**4.5. Expand / Migrate / Contract (refactor mecanico de blast-radius grande)**

Los 3 patrones anteriores asumen que la tarea se puede partir por capa,
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

**5. Spike + implementacion**

```
Story: "Migrar auth de sessions a JWT"

Split:
├── TASK-70a: [Spike] Evaluar JWT libraries, comparar jose vs jsonwebtoken vs pyjwt
└── TASK-70b: [Impl] Implementar JWT auth (depende de TASK-70a)
```

##### Branch naming por tipo

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

##### Creacion de sub-issues

Cuando se divide, el @product-manager crea sub-issues en GitHub/Azure:

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

#### Ejemplos de story-breakdown

**EXAMPLE: Decision de NO dividir**

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

**EXAMPLE: Decision de SI dividir**

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

### Step 8 — @product-manager: Escribir tasks.md, crear ticket y continuar

**8.1 — `specs/tasks.md`** (solo `schema: full`; con `lite` se omite este
sub-paso): el project manager escribe
`agteamos/changes/tmp-<slug>/specs/tasks.md` con el checklist de
implementación desglosado por capa y agente responsable — ver el formato
completo ("4. tasks.md — CUANDO") en la skill `agteamos-spec`. Este
archivo tiene que existir **antes** del Checkpoint 3 de abajo; nada más en
este workflow lo escribe.

**8.2 — Crear el ticket**: el project manager crea el ticket con:

**Si `tracker: azure_devops` y `process_template: agile`**: usar
`create-story` (User Story nativa, no `create-ticket` genérico) para que
Acceptance Criteria, Story Points y Priority queden en sus **campos propios**
de Azure Boards, no solo como texto en la descripción — eso es lo que
habilita reportes, queries y el sprint board nativos:
```
[operación: create-story] (
  título "<titulo de la feature>",
  description = "<una oracion del vision del requirements.md>" + Technical
    Notes + Out of Scope (lo que no tiene campo propio va en el body),
  Microsoft.VSTS.Common.AcceptanceCriteria = los ACs del requirements.md,
    uno por línea, en su propio campo — NO repetidos en el body,
  campo de estimación = <estimado del Technical Notes> — el nombre exacto
    del campo (`Microsoft.VSTS.Scheduling.StoryPoints` en Agile,
    `Microsoft.VSTS.Scheduling.Effort` en Scrum) lo resuelve la fila
    `create-story` de `agteamos/tracker/azure_devops.md` según
    `tracker_azure_devops.process_template` — no hardcodear uno u otro acá,
  area_path / iteration_path = default de platform.yml salvo que la tarea
    especifique otro;
  se resuelve contra agteamos/tracker/azure_devops.md)
```
Si `platform.yml.tracker_azure_devops.default_area_path` (o
`default_iteration_path`) está `null` — ask-and-continue (ver
`agteamos-setup` §Convención): preguntar solo ese campo puntual, persistir la
respuesta en `platform.yml` con `field_status: confirmed`, y seguir con la
creación del ticket en el mismo turno. Nunca mandar a correr
`agteamos-setup` completo por esto.
Si la tarea es hija de un Epic/Feature ya existente en Azure Boards, agregar:
```
[operación: link-parent-child] (id del Story recién creado, target-id =
  id del Epic/Feature padre)
```
Si el pedido original vino de un sistema externo (Odoo, un helpdesk, un CRM)
y el usuario compartió ese link, agregarlo como relación nativa, no solo
como texto:
```
[operación: link-external-url] (id del Story, url = link del sistema externo)
```

**Cualquier otro tracker (GitHub, Planner, o Azure sin proceso Agile)**:
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
`git config` — ver skill `agteamos-implement` para el mecanismo exacto.

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
doc_impact: true             # si es false, agteamos-implement se salta el
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

**Step 1 — Clarificacion:**
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

**Step 7 — INVEST / story-breakdown:**
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
por @product-manager con el checklist por capa (ver formato en
`agteamos-spec`).

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

## EXAMPLE: Ticket grande retrospectivo (refactor/migracion ya completada)

No toda tarea entra por clarificacion antes de empezar — a veces
el trabajo ya se hizo en una rama y hace falta documentarlo como ticket al
cerrar (ej. un refactor grande de arquitectura). Para ese caso, el `body`
del `create-story`/`create-ticket` sigue un formato narrativo distinto al
template estándar de arriba, pero las mismas reglas de campos aplican
(Acceptance Criteria en su propio campo si es Azure, no repetido en el body):

```markdown
Título: [Refactor] Separacion Web/API y eliminacion de UI legacy en Portal

## Descripcion
Como equipo de desarrollo, necesitamos que el Portal opere sobre una unica
arquitectura de UI, con el API completamente separado, para eliminar la
duplicacion de stacks de presentacion conviviendo en el mismo proyecto y
reducir la deuda tecnica que esto genera.

[1-2 parrafos de contexto: que problema tenia la arquitectura anterior,
por que se resolvio ahora, en que rama se hizo el trabajo]

Repos afectados: <lista>

## Alcance
- [Cambio 1 realizado, con numeros concretos si aplica — ej. "N archivos removidos"]
- [Cambio 2 — nueva estructura/proyecto creado]
- [Cambio 3 — proyectos/archivos eliminados]
- [Cambio 4 — tests agregados, con cobertura si se midio]
- [Infraestructura/CI si cambio]

## Pendientes a fase posterior
- [Lo que queda fuera de este ticket a proposito — ej. "Merge a main y deploy a produccion"]

## Related Links (sistemas externos, si aplica)
- <link a Odoo/Jira/helpdesk/CRM externo relacionado, agregado vía link-external-url si tracker: azure_devops>
```

**Acceptance Criteria** (campo separado, no en el body):
```
- El modulo X funciona completamente en [stack nuevo] sin depender de [lo eliminado]
- El proyecto [legacy] fue eliminado completamente de la solucion y no existen referencias activas
- [Componente nuevo] es el unico [rol] y consume [dependencia] correctamente
- Los proyectos no utilizados [lista] fueron eliminados
- Existe [suite de tests] con cobertura de [alcance]
- La solucion compila y la suite de tests corre en verde sobre la rama <nombre>
```

Notar que cada AC es una condición binaria verificable (compila / no
compila, existe / no existe, corre en verde / falla) — no una descripción
de proceso. Si `tracker: azure_devops`, estos van en
`Microsoft.VSTS.Common.AcceptanceCriteria`, uno por línea; el body de arriba
(Descripción/Alcance/Pendientes) va en `System.Description`.

---

## ANTI-PATTERNS

- **No empezar a codificar antes de la aprobacion del mockup** — si FE esta
  impactado, el diseno debe aprobarse explicitamente antes de escribir una
  sola linea de componente.

- **No saltar la clarificacion del Step 1** — incluso si la solicitud parece
  clara, confirmar el scope y los out-of-scope previene rework.

- **No crear el ticket sin ACs verificables** — un ticket sin ACs en formato
  Given/When/Then no pasara el Definition of Ready del Flujo 3 y causara
  retraso.

- **No activar todos los agentes por defecto** — activar solo los agentes
  que corresponden a las capas identificadas en el analisis tecnico.

- **No saltar la verificacion INVEST del Step 7 para tareas L o XL** — si la
  tarea toca 3+ capas, dividir es obligatorio antes de crear el ticket.

- **No usar schema `full` para un cambio de una linea** — crea carpetas
  vacías de specs/ sin contenido real. Evaluar `lite` primero.

---

## Próximo paso sugerido

**Próximo paso sugerido**: `agteamos-implement` — el ticket ya está creado,
sigue el Flujo 3 (ver `agteamos-context` §Próximo paso).
</content>
