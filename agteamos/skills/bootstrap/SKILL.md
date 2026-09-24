---
name: agteamos-bootstrap
description: >
  End-to-end workflow for bootstrapping a new project starting from an empty
  or near-empty repository. Covers stack definition, architecture, design system,
  CI/CD setup, backlog creation, and an optional formal SRS (IEEE 830 style,
  opt-in, see srs-template.md) before handing off to the agteamos-task
  workflow for the first feature.
used_by:
  - architect
  - product-manager
  - ui-ux-designer
  - devops-engineer
---

# Workflow: AgTeamOS New Project

## CONTRACT

This workflow is activated when `agteamos-router` determines the
repository contains no meaningful code and the user has described what they
want to build. Its responsibility is to produce a fully scaffolded, documented,
and CI/CD-ready repository with an initial backlog, ready to receive the first
feature task via the `agteamos-task` workflow.

---

## PRECONDITIONS

- `agteamos-router` result: repository is empty (no source files, no `agteamos/`).
- User has provided at minimum a high-level description of what they want to build.
- No other workflow is currently in progress on this repository.

---

## PROCESS

### Step 1 — Leer `platform.yml` + clarification-protocol: solo lo que falta

`agteamos-router` (Step 0) garantiza que `agteamos/platform.yml` ya
existe antes de llegar a este workflow — lo llenó `agteamos-setup` con
`repo_host`, `branch_strategy`, `ci_target`, `deploy_target` (o `null`),
`pr_convention` y `handoff_mode`. **Leer ese archivo primero y no volver a
preguntar nada de lo que ya contiene** — repetir esas preguntas duplica
trabajo que el usuario ya hizo y arriesga una respuesta inconsistente con lo
ya persistido.

**Atajo opcional — detectar el "shape" del proyecto por señales léxicas**
antes de armar las preguntas, para no preguntar lo que ya se puede inferir
del pedido inicial del usuario (no reemplaza la interview, solo la acorta):

| Señales en el pedido del usuario | Shape probable | Ajusta |
|---|---|---|
| "cart", "checkout", "catálogo", "inventario" | E-commerce | Preguntar pasarela de pago en vez de "integraciones" genérico |
| "CLI", "paquete npm/pip", "MCP server", "SDK" | CLI/librería | Saltar preguntas de UI/deploy_target de servidor |
| "landing", "blog", "portafolio" | Sitio de marketing | Saltar preguntas de base de datos/auth si no se mencionan |
| "app móvil", "iOS", "Android", "React Native" | App móvil | Preguntar plataforma target antes que stack backend |
| "dashboard interno", "herramienta para el equipo" | Herramienta interna | Asumir auth simple (SSO/allowlist) salvo que se diga lo contrario |
| "agente", "bot", "automatización" | Agent app / bot | Preguntar qué dispara la ejecución (cron, webhook, manual) |

Si el pedido no matchea ninguna señal clara, no forzar un shape — seguir con
la interview genérica de abajo sin marcar ninguna casilla. Esto es
deliberadamente liviano (una tabla, no 14 archivos de shape separados) — el
objetivo es ahorrar 1-2 preguntas cuando la señal es obvia, no construir una
taxonomía completa que hay que mantener.

**Fase 0 — arranque, tope de 5 preguntas, cada una con opción recomendada**
(mismo patrón que `spec-kit` `/clarify`: cuota de preguntas + `**Recomendado:**`
para aceptar con un "sí" — ver `DECISIONS.md`
§2/§3.4). Un único mensaje, nunca una por una:

1. ¿Qué construís y para quién? (1-2 líneas)
2. MVP: 3-5 features en bullets.
3. Restricciones duras de stack (lenguaje, framework, base de datos). **Recomendado**:
   según la tabla de shape de arriba y el stack habitual del usuario (ver
   memoria/perfil si está disponible), o "sin restricción — elijo yo" si no hay señal.
4. Setup Ronda 0 (fusionado, ver `agteamos-setup` §Ronda 0): dónde vive el código
   y los tickets, y estrategia de branching. En greenfield no hay nada que
   detectar todavía, así que se ofrece directamente la recomendación: **"GitHub,
   personal (feature/* → main), tickets en GitHub Issues"** salvo que el
   usuario prefiera otra cosa.
5. ¿Este proyecto necesita un SRS formal? **Recomendado: no** (default para
   proyecto personal o ágil). Ofrecer solo si el pedido menciona un
   cliente/contrato/entrega académica/contexto regulado (señal léxica) — si
   no hay esa señal, ni siquiera hacer la pregunta, asumir que no aplica y
   seguir (ver Step 3.5, sigue siendo opt-in).

**Diferido — NO se pregunta en Fase 0, se resuelve cuando haga falta de
verdad**: integraciones con sistemas externos (se preguntan en el
`agteamos-task` de la feature que las necesite), escala
esperada (se pregunta recién antes del primer `agteamos-deploy`),
`deploy_target` (ask-and-continue en el primer `agteamos-deploy`, ver
`agteamos-setup` §Convención), `kpis.md` (a demanda o antes del primer deploy
a producción).

Si `branch_strategy: custom` sin `branch_strategy_custom` claro, confirmar la
convención exacta como parte del punto 4 — no queda para después porque
condiciona el primer commit.

**No hay default de branching en este paso.** `branch_strategy` es un campo
obligatorio que `agteamos-setup` no deja avanzar sin resolver — si de todos
modos llegara `null` acá, no asumir `feature/* → main` ni ningún otro
default: volver a disparar `agteamos-setup` para completarlo. Asumir un
default de branching contradice el principio rector de `agteamos-setup`
("nunca asumir, siempre preguntar").

Do not proceed to Step 2 until answers are received and unambiguous. See skill
`agteamos-task` for the full question protocol.

### Step 1.5 — Premortem opcional (nunca automático)

Con las respuestas de Step 1 ya en mano, ofrecer — no ejecutar por
default —: *"¿Querés que corra un pre-mortem de 8 ángulos sobre esta idea
antes de comprometernos a construirla? Es una crítica dura a propósito,
pensada para encontrar grietas ahora y no después."*

- Si el usuario acepta: invocar la skill `agteamos-decisions` con las
  respuestas de Step 1 como input (problema, usuarios, MVP, integraciones,
  escala). El veredicto se muestra completo al usuario; **no bloquea** el
  avance a Step 2 — es información para decidir con los ojos abiertos, no
  un gate que hay que "pasar".
- Si el usuario declina o no responde, continuar directo a Step 2 sin
  insistir ni volver a ofrecerlo más adelante en este mismo workflow.
- Si el veredicto del premortem señala una grieta letal y el usuario decide
  seguir de todos modos, anotarla en `agteamos/product/mission.md` (Step 3)
  bajo una sección `## Riesgos conocidos (premortem)` — no se oculta, se
  documenta y se sigue.

### Step 2 — @architect: Define stack and architecture

Using the answers from Step 1, the architect agent must:

1. Select and justify the full stack (language, framework, database, infrastructure).
2. Define the high-level architecture (monolith, modular monolith, microservices, etc.)
   with a Mermaid diagram.
3. Identify cross-cutting concerns: auth strategy, error handling, logging, observability.
4. Write `agteamos/architecture/PROJECT_CONTEXT.md` with:
   - Product summary (one paragraph)
   - Architecture diagram
   - Stack table (layer → technology → justification)
   - Key architectural decisions (brief, full ADRs come next)
   - **`## Comandos canonicos`** — la tabla de comandos reales de este
     proyecto (`test`, `typecheck`/`lint`, `migrate`, `build`, `dev`), ej.
     `pnpm test`, `pytest`, `alembic upgrade head`. Esta tabla se escribe
     **antes** de cualquier AC/verify command en tareas futuras — todo
     `requirements.md`/`verify-report.md` que cite un comando de verificación
     debe usar únicamente comandos de esta tabla, nunca inventar uno nuevo
     ad-hoc. Es lo que hace que los ACs verificables (`agteamos-spec`)
     y el gate de `agteamos-implement` (exit-code discipline) sean
     consistentes entre tareas distintas del mismo proyecto en vez de que
     cada tarea reinvente su propio comando de verificación.
5. Write `ADR-001-stack-selection.md` under `agteamos/architecture/adr/` — es
   la única ADR que se escribe en Fase 0, porque la decisión de stack ya se
   tomó en este mismo Step. `ADR-002-database-model.md` y
   `ADR-003-auth-strategy.md` (si auth está en alcance) se **difieren**: se
   generan recién cuando la primera tarea que implementa el modelo de datos
   o la estrategia de auth corre (`ensure-artifact`, ver
   `agteamos-context` §Lazy Artifacts) — declararlas en
   `agteamos/onboarding.yml` como `pending` con ese disparador, no generarlas
   especulativamente antes de que exista el código que las sustente.

Output: `agteamos/architecture/PROJECT_CONTEXT.md` y `ADR-001` committed.
Template ya existe completa en esta skill — solo cambia la ruta de destino.

### Step 3 — @product-manager: Define MVP scope

The product owner agent must:

1. Translate user answers into the product-layer documents (Agent OS style).
2. Write `agteamos/product/mission.md` with:
   - Vision statement
   - User personas (at least one)
   - Out-of-scope list (explicit exclusions prevent scope creep)
   - Definition of Done for this project
   - `## Riesgos conocidos (premortem)` — solo si Step 1.5 corrió y quedó al
     menos una grieta que el usuario decidió aceptar en vez de resolver;
     omitir la sección por completo si Step 1.5 no corrió o no encontró
     nada que valga la pena registrar
3. Write `agteamos/product/kpis.md` with:
   - KPIs to measure MVP success
4. Write `agteamos/product/roadmap.md` with:
   - Phase 0: Infrastructure and scaffolding (this workflow)
   - Phase 1: MVP features (feature list with acceptance criteria per feature,
     linked a los backlog items creados en Step 6 — ver ahí qué features
     reciben ticket ya mismo y cuáles quedan como filas de backlog)
   - Phase 2+: Post-MVP ideas (parking lot)

`kpis.md` puede quedar con solo el título y una nota `pending` si el usuario
no tiene KPIs claros todavía en Fase 0 — se completa a demanda o, a más
tardar, antes del primer `agteamos-deploy`.

Output: `agteamos/product/mission.md`, `kpis.md` (lean), y `roadmap.md` committed.
Templates ya existen completas en esta skill — solo cambia la ruta de destino.

### Step 3.5 — @product-manager: SRS formal (opcional, solo si Step 1 lo confirmó)

**Condicional**: ejecutar solo si el usuario respondió que sí a la pregunta de
Step 1 sobre necesitar un SRS formal. Si la respuesta fue no (el default),
saltar este paso por completo — no generar `SRS.md` "por si acaso".

Si aplica, el product owner debe:

1. Leer `srs-template.md` (mismo directorio que esta skill) — es la
   plantilla completa basada en IEEE 830 / ISO/IEC/IEEE 29148.
2. Llenar cada sección con la información ya recolectada en Step 1
   (problema, usuarios, restricciones, escala) y Step 2 (`PROJECT_CONTEXT.md`,
   diagrama de arquitectura → secciones 2.1 y 11).
3. La sección 5 (Requisitos Funcionales) es el **catálogo global** del
   proyecto — cada requisito recibe un `RF-XXX` único. Estos IDs son la
   fuente de verdad: cuando más adelante `agteamos-task` arranque una
   feature concreta, su `requirements.md` (ver `agteamos-spec`) debe
   **citar** el `RF-XXX` correspondiente en vez de redactar el requisito de
   nuevo. Si una feature no tiene un `RF-XXX` previo (surgió después del
   SRS inicial), agregarlo al SRS primero, no crearlo solo en `requirements.md`.
4. La sección 10.2 (matriz de trazabilidad) arranca con todas las filas en
   `Pendiente` — se actualiza a `Verificado` automáticamente en
   `agteamos-implement` (Step 5 — Verify), no a mano.
5. **Si `agteamos/platform.yml` tiene `tracker: planner`**: por cada `RF-XXX`
   de la sección 5, invocar `[operación: create-ticket]` contra
   `agteamos/tracker/planner.md` (título = enunciado corto del requisito,
   body = el requisito completo tal como quedó redactado en el SRS). Volcar
   el `id` de tarea que devuelve Graph API en la columna 5 ("Planner Task
   ID") de la fila correspondiente en la sección 10.2 (ver
   `srs-template.md`). Si `tracker` no es `planner`, la tabla 10.2 se escribe
   con las 4 columnas base, sin la columna 5 — no crear tickets en ningún
   lado todavía (eso ya lo cubre el Step 6 genérico de backlog, vía la misma
   abstracción de tracker, para el resto de las features del MVP).
6. Escribir el resultado en `agteamos/architecture/SRS.md`.

Output (solo si aplica): `agteamos/architecture/SRS.md` committed (y, si
`tracker: planner`, una tarea de Planner por cada `RF-XXX`).

> **Por qué es opt-in**: un SRS formal estilo IEEE 830 es pesado comparado
> con el flujo ágil (SDD) que ya usa AgTeamOS por default — vale la pena
> cuando hay una razón contractual/formal concreta, no como documentación
> extra para un proyecto personal chico.

### Step 4 — @ui-ux-designer: Design system baseline (diferido a la primera UI real)

Si el proyecto tiene interfaz de usuario, **este step no corre en Fase 0** —
queda declarado `pending` en `agteamos/onboarding.yml` con disparador
`build-ui-workflow (primer Step que lee tokens)`, y se genera recién ahí en
modo acotado (`ensure-artifact`, ver `agteamos-context` §Lazy
Artifacts). Generar un design system antes de que exista ni un componente
real es exactamente el tipo de trabajo especulativo que este contrato evita.
Para proyectos puramente API/backend, no aplica en ningún momento.

Cuando corre (disparado por `build-ui-workflow`), el designer agent debe
escribir `agteamos/design/DESIGN_SYSTEM.md` conteniendo:

- Color palette (primary, secondary, neutrals, semantic colors) with hex values.
- Typography scale (font families, sizes, weights, line heights).
- Spacing scale (base unit and scale steps).
- Breakpoints (if responsive).
- Base component list (Button, Input, Card, Modal, etc.) with usage rules.
- Accessibility baseline: minimum contrast ratios, focus management rules,
  ARIA usage guidelines.
- Reference to any external design tool (Figma URL, Storybook, etc.) if provided
  by the user.

Output: `agteamos/design/DESIGN_SYSTEM.md` committed.

### Step 5 — @devops-engineer: Initialize repository structure and CI mínimo

The devops agent must, en Fase 0 (esto sí corre siempre, es lo mínimo para
que el scaffold compile y tenga verificación automática):

1. Create the project directory structure appropriate for the chosen stack.
   Example for a FastAPI + React project:
   ```
   /backend/
   /frontend/
   /agteamos/
   /scripts/
   Dockerfile
   docker-compose.yml
   .env.example
   .gitignore
   ```
2. Write a working `Dockerfile` and `docker-compose.yml` for local development.
3. Write `.env.example` with all required environment variables (no real values).
4. Create el pipeline de CI **mínimo** (`.github/workflows/ci.yml` o
   equivalente): lint + test con threshold de cobertura + build. El step de
   **deploy queda diferido** (ver abajo) — no se escribe hasta el primer
   `agteamos-deploy` real, cuando `deploy_target` ya esté
   confirmado (ask-and-continue, ver `agteamos-setup`).
5. Initialize branches per the agreed branching strategy.
6. Write `agteamos/devops/INFRASTRUCTURE.md` **lean**: solo las secciones
   `Local Development` y `CI/CD` (lo que ya existe después de este Step).
   Las secciones `Environments`/`Platform` completas quedan `pending` en
   `agteamos/onboarding.yml`, disparadas por el primer `agteamos-deploy` real — recién ahí se sabe de verdad el
   entorno de producción, en vez de inventarlo en Fase 0.

Output: Full repo scaffold committed, CI mínimo committed, branches created,
`INFRASTRUCTURE.md` lean committed.

### Step 6 — @product-manager: Create initial backlog

The project manager agent must:

1. Read `agteamos/product/roadmap.md` to extract MVP features.
2. Preguntar una sola vez: *"¿Creo ya los tickets de las N features del MVP,
   o solo el de la primera y el resto queda anotado en el backlog hasta que
   las tomemos?"* — **default si el usuario no tiene preferencia: solo la
   primera**, para no interrogar al tracker con N tickets antes de escribir
   una línea de código.
   - Feature #1: create el ticket (GitHub issue / Azure work item / Planner
     task) con Title `[Feature] <feature name>` y body con acceptance
     criteria, labels, milestone.
   - Resto de las features: quedan como filas en `agteamos/product/roadmap.md#Backlog`,
     mismo formato que usa `agteamos-capture` (Origen: usuario,
     Prioridad: media, Estado: pendiente) — se convierten en tickets reales
     cuando se toman, vía esa misma skill o al arrancar `agteamos-task`
     para esa feature.
   - Si el usuario prefiere crear todos los tickets ya, hacerlo (comportamiento histórico).
3. El milestone `MVP` (o el hito equivalente del tracker) se crea recién
   cuando se crea el **segundo** ticket real — no antes, para no fijar una
   fecha sobre un alcance que todavía puede cambiar en la primera feature.
4. Write `agteamos/product/backlog.md` mirroring los tickets creados (solo
   los que efectivamente se crearon, no un placeholder de los N).
   **`agteamos/product/backlog.md` es el backlog de producto de este proyecto**
   (features priorizadas con sus IDs de ticket) — no confundir con el
   `BACKLOG.md` del propio plugin AgTeamOS, que es un archivo distinto usado
   por `agteamos-meta` para mejoras del plugin en sí, no del proyecto
   del usuario.

Output: Ticket de la feature #1 (y de las demás solo si el usuario lo pidió)
creado en el tracker, `agteamos/product/backlog.md` committed con el resto en
`roadmap.md#Backlog`.

### Step 7 — Escribir `agteamos/onboarding.yml`

Reemplaza el árbol completo con README-por-carpeta que este workflow
generaba antes de este contrato. La regla ahora es la misma que aplica
`agteamos-knowledge` L0 (ver `agteamos-context` §Lazy Artifacts,
"regla de carpetas"): **la skill que escribe un artefacto es la que crea su
carpeta**, no un Step separado que pre-crea 17 carpetas vacías.

Al cierre de Fase 0, lo que existe de verdad es: `platform.yml`,
`architecture/PROJECT_CONTEXT.md`, `ADR-001`, `product/mission.md`+`kpis.md`
(lean)+`roadmap.md`+`backlog.md`, el scaffold que compila con CI mínimo, y el
ticket de la feature #1 (Step 6). Todo lo demás se declara en
`agteamos/onboarding.yml` como `pending`, con su disparador — misma tabla que
usa `agteamos-knowledge` L1 (`agteamos-context` §Lazy Artifacts):
`design_system` → primer `build-ui`; `ADR-002`/`ADR-003` → primera tarea que
las implementa; `kpis.md` completo → antes del primer deploy a producción o
a demanda; `INFRASTRUCTURE.md` completo → primer `deploy-workflow`; los 11
temas de `standards/` → igual que en `agteamos-knowledge` L0 (pending, con
índice de keywords ya completo); `specs/` → vacío hasta la primera tarea
(no hay dominios "candidatos" que proponer todavía, a diferencia de
`agteamos-knowledge` sobre código existente).

**`dashboard.html` explícitamente NO se crea acá** (ni como placeholder ni
vacío) — es un artefacto local regenerable a demanda por `agteamos-dashboard`
que no se commitea (ver `agteamos-dashboard` skill, sección "ARTEFACTOS
LOCALES"). Generarlo la primera vez que haya al menos una tarea es
responsabilidad de esa skill, no de `agteamos-bootstrap`.

### Step 8 — Hand off to agteamos-task workflow

Notify the user that the project is scaffolded and ready. Automatically continue
with the `agteamos-task` workflow for the first MVP feature unless the user
says otherwise. Si `platform.yml` tiene `handoff_mode: explicit`, pedir
confirmación antes de continuar; si es `auto`, continuar directamente.

---

## POSTCONDITIONS

- `agteamos/onboarding.yml` existe y todo artefacto no generado en Fase 0
  está declarado `pending` con su disparador (en vez de "`agteamos/` está
  completamente poblado", que era la postcondición previa a este contrato).
- The repository contains a working code skeleton (compiles/starts with no errors).
- `docker-compose up` starts the development environment without errors.
- CI pipeline mínimo (lint + test + build) está configurado y pasa en un build vacío.
- La feature #1 del MVP tiene ticket en el tracker (el resto, solo si el usuario pidió crearlos todos en Step 6).
- Initial backlog is reflected in `agteamos/product/backlog.md` + `roadmap.md#Backlog`.
- The `main` branch (and `develop` if team project) is protected.

---

## EXAMPLE

**User input:**
"I want to build a SaaS invoice management app for freelancers. Backend in FastAPI,
frontend in React, hosted on a VPS, PostgreSQL database, users log in with email/password."

**Resulting artifacts (partial list):**
- `agteamos/architecture/PROJECT_CONTEXT.md` — stack: FastAPI + React + PostgreSQL,
  auth: JWT, deploy: Docker on VPS.
- `agteamos/architecture/adr/ADR-001-stack-selection.md`
- `agteamos/product/roadmap.md` — MVP: create invoice, list invoices, send PDF
  by email, mark as paid.
- `agteamos/design/DESIGN_SYSTEM.md` — neutral palette, Inter font, 4px base spacing.
- `docker-compose.yml` — services: `api`, `db`, `frontend`.
- `.github/workflows/ci.yml` — lint + pytest + vitest + build.
- GitHub issues #1–#4 for the four MVP features.

---

## Próximo paso sugerido

**Próximo paso sugerido**: `agteamos-task` — arrancar la primera feature del
MVP (ver `agteamos-context` §Próximo paso para la tabla completa).
