---
name: new-task
description: >
  Workflow para tareas nuevas sin ticket existente. El usuario describe lo que
  quiere en lenguaje natural. El equipo clarifica, diseña, crea el ticket en
  GitHub o Azure DevOps y continua automaticamente con task-from-ticket.
used_by:
  - architect
  - product-owner
  - project-manager
  - ui-ux-designer
---

# Workflow: New Task (Flow 2)

## CONTRACT

- **Input**: Descripcion en lenguaje natural del usuario + PROJECT_CONTEXT.md existente
- **Output**: Ticket creado en GitHub/Azure DevOps + hand-off automatico a `task-from-ticket`
- **Trigger**: `flow-router` determina que el repo tiene codigo y el input NO contiene referencia a ticket

---

## PRECONDITIONS

- `repo-context-check` result: el repositorio tiene codigo fuente real.
- `/docs/01-architecture/PROJECT_CONTEXT.md` existe (generado en onboarding o por ingenieria inversa).
- El input del usuario NO contiene URL, ID ni referencia a un ticket existente.
- No existe en `/docs/tasks/active/` una tarea activa con el mismo objetivo.

---

## PROCESS

### Step 1 — clarification-protocol: Entender la solicitud

Antes de cualquier decision tecnica o de diseno, obtener contexto suficiente
para redactar ACs sin ambiguedad. Hacer las siguientes preguntas en un
**unico mensaje** (maximo 3-5 preguntas, nunca una por una):

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

### Step 2 — @product-owner: Escribir requirements.md

Con las respuestas del Step 1, el agente de producto crea el documento de
requisitos en `/docs/tasks/active/TASK-<slug>/requirements.md`:

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

Output: `/docs/tasks/active/TASK-<slug>/requirements.md` escrito.

> **SDD Checkpoint 1**: requirements.md debe estar aprobado por el usuario
> antes de continuar. Esto es la base del contrato de la tarea.

### Step 3 — @architect: Analisis de impacto tecnico

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

**Riesgos identificados**: Dependencias, posibles conflictos con codigo
existente, consideraciones de seguridad.

> **SDD Checkpoint 2**: design.md debe estar escrito y aprobado antes de
> asignar trabajo a los engineers. El diseño tecnico es inmutable durante
> la implementacion — si cambia, se actualiza design.md primero.

### Step 4 — @ui-ux-designer: Mockup (condicional — solo si FE esta impactado)

Si la capa Frontend esta afectada, este paso es **obligatorio** y debe
completarse **antes de cualquier implementacion**.

El diseñador presenta una propuesta visual en formato Mermaid o wireframe
ASCII que sea 100% consistente con el design system del proyecto.

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

→ SI aprueba: continuar con Step 5
→ NO aprueba: ajustar y re-presentar (max 2 rondas antes de escalar a @architect)
```

**REGLA ABSOLUTA**: No escribir ningun codigo de UI hasta tener aprobacion
explicita del usuario.

### Step 5 — story-breakdown: Verificar INVEST

El skill `story-breakdown` evalua si la tarea pasa el criterio INVEST:

```
¿La tarea toca 3+ capas? → SI: dividir por capa
¿Tiene mas de 5 ACs? → SI: evaluar agrupacion en subtareas
¿Estimado es XL? → SI: dividir por funcionalidad o crear spike primero
¿Tiene dependencias no resueltas? → SI: crear ticket de prerequisito
```

Si se divide, cada subtarea recibe su propio branch y ticket. Ver
`story-breakdown` skill para los patrones de split disponibles.

### Step 6 — @project-manager: Crear ticket y continuar

El project manager crea el ticket en la plataforma del proyecto:

**GitHub Issues:**
```bash
gh issue create \
  --title "[Feature] <titulo de la feature>" \
  --body "$(cat <<'EOF'
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
EOF
)" \
  --label "feature" \
  --milestone "MVP"
```

**Azure DevOps (via MCP azure-devops):**
Crear work item de tipo "User Story" con los mismos campos, vinculado al
milestone o sprint correspondiente.

Una vez creado el ticket, el project manager:
1. Actualiza el `task.yml` con el `ticket_url` y el `id` real asignado.
2. **Continua automaticamente** con el workflow `task-from-ticket` usando el ticket recien creado.
   No esperar input adicional del usuario — el hand-off es automatico.

> **SDD Checkpoint 3**: tasks.md esta completo con checklist de implementacion.
> El hand-off al task-from-ticket workflow incluye los 3 artefactos en specs/.

---

## YAML TASK SPEC

Junto con `requirements.md`, se crea un archivo `task.yml` con los metadatos
estructurados de la tarea. Este archivo es la fuente de verdad para rastreo
entre sesiones y para que los agentes conozcan el contexto sin leer todo el TASK file.

```yaml
# docs/tasks/active/TASK-42-email-notifications/task.yml
id: "42"
title: "Add email notifications"
type: feature          # feature | bug | hotfix | refactor | spike
layer: fullstack        # frontend | backend | fullstack | infra
priority: medium        # critical | high | medium | low
branch: feature/42-email-notifications
platform: github        # github | azure
ticket_url: https://github.com/user/repo/issues/42
created: 2026-03-25
status: in_progress     # pending | in_progress | in_review | completed
assigned_to:
  - backend-engineer
  - frontend-engineer
depends_on: []          # IDs de tickets que deben completarse antes
```

El `task.yml` se actualiza en cada transicion de estado. Es lo primero que
lee cualquier agente al retomar una tarea tras un reset de contexto.

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

**Step 2 — requirements.md creado:**
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

**Step 3 — Analisis tecnico:**
```
Capas afectadas:
- Backend: SI — nuevo endpoint /auth/google, callback handler, user creation
- Frontend: SI — boton "Registrarse con Google", redirect handling
- Database: SI — columna google_id en tabla users
- Infrastructure: SI — GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env

Complejidad: L (2 capas + DB + env vars)
Agentes: @backend-engineer, @frontend-engineer, @security-engineer
```

**Step 4 — Mockup (FE impactado):**
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

**Step 5 — story-breakdown:**
```
INVEST check:
- S: NO (es L — 2 capas + DB) → evaluar split

Split decision:
├── TASK-42a: [BE+DB] OAuth endpoint + user creation + migration
└── TASK-42b: [FE] Google sign-in button + redirect handling

Cada subtarea tendra su propio branch y sub-issue.
```

**Step 6 — ticket creado:**
```bash
gh issue create \
  --title "[Feature] Google OAuth registration" \
  --body "..." \
  --label "feature,auth,fullstack"
# → Issue #42 created: https://github.com/user/repo/issues/42
```

```yaml
# task.yml generado:
id: "42"
title: "Google OAuth registration"
type: feature
layer: fullstack
priority: high
branch: feature/42-google-oauth-registration
platform: github
ticket_url: https://github.com/user/repo/issues/42
created: 2026-03-25
status: in_progress
assigned_to:
  - backend-engineer
  - frontend-engineer
  - security-engineer
depends_on: []
```

```
→ Continuando automaticamente con task-from-ticket usando issue #42...
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
