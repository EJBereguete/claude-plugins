---
name: agteamos-project-docs
description: >
  Fusion de 4 skills de documentacion del proyecto en 4 modos de un unico
  punto de entrada. Modo `--init` (ingenieria inversa inicial de un proyecto
  existente, con sus niveles L0 default/L1 just-in-time/L2 `--full` — la
  antigua agteamos-onboard). Modo `--maintain` (default sin argumentos:
  mantenimiento continuo del esquema agteamos/, reporta gaps/desactualizacion
  distinguiendo "pendiente por diseno (lazy)" de "falta de verdad" — la
  antigua agteamos-docs). Modo `--topic <tema>` (convention-detection contra
  los estandares base del plugin, tema por tema via ensure-artifact, o los
  7 de una con --full/pedido explicito — la antigua agteamos-standards).
  Modo `--learn` (captura de baja friccion de convenciones aprendidas en uso:
  correccion del usuario, hallazgo SEEN>=3, o patron nuevo al cerrar tarea —
  la antigua agteamos-learn). Disparadores: `--init` lo dispara
  `agteamos-router`/`agteamos-new-project` cuando detecta un repo sin
  `agteamos/`; `--maintain` (default) se ejecuta a demanda o periodicamente
  sobre un `agteamos/` que ya existe parcialmente; `--topic` lo dispara el
  protocolo `ensure-artifact` desde otras skills consumidoras, o
  `agteamos-project-docs --full`/pedido explicito para los 7 de una; `--learn` lo
  disparan el hook `detect-correction.js`, un hallazgo repetido de
  `agteamos-quality`, o `agteamos-implement` al
  cerrar una tarea.
used_by:
  - architect
  - product-manager
  - devops-engineer
  - ui-ux-designer
  - backend-engineer
  - frontend-engineer
  - qa-engineer
---

# SKILL: Project Docs (agteamos-project-docs)

## CONTRACT

Esta skill fusiona 4 responsabilidades antes separadas (`agteamos-onboard`,
`agteamos-docs`, `agteamos-standards`, `agteamos-learn`) en un unico punto de
entrada con 4 modos independientes. Cada modo preserva integramente su
contenido tecnico original — lo unico que cambia es en que archivo vive.

- **Modo default (sin argumentos): `--maintain`** — es el modo que se usa "a
  demanda" con mas frecuencia una vez que `agteamos/` ya existe (aunque sea
  parcialmente, con partes en `pending`/`candidate` via onboarding L0). Si el
  repositorio todavia no tiene `agteamos/` en absoluto, usar `--init` en su
  lugar (ver Step 0 mas abajo).
- **`--init`**: ingenieria inversa inicial de un proyecto existente sin
  `agteamos/` (o con `agteamos/` incompleto). Ver **MODO --init**.
- **`--maintain`**: mantenimiento continuo del esquema `agteamos/` ya
  sembrado. Ver **MODO --maintain**.
- **`--topic <tema>` [`--scope <paths>`]**: convention-detection tema por
  tema contra los estandares base del plugin. Ver **MODO --topic**.
- **`--learn`**: captura de convenciones aprendidas en uso. Ver **MODO
  --learn**.
- **Quien ejecuta**: `@architect` lidera `--init` (L0) y es dueno conceptual
  de `--topic`; `@architect`/`@product-manager` ejecutan `--maintain`;
  `--learn` lo disparan `@architect`/`@backend-engineer`/
  `@frontend-engineer`/`@qa-engineer` segun donde ocurra la correccion o el
  hallazgo. Cada agente de dominio genera su pieza L1 de `--init` cuando
  `ensure-artifact` la dispara, o todos en secuencia si es `--init --full`.
- **Regla de honestidad (aplica a los 4 modos, sin excepcion)**: todo
  documento generado por cualquier modo lleva su propio header de
  proveniencia (`Estado`/`Confidence`/`Fuentes revisadas`/`Ultima revision`)
  — ningun valor (version de libreria, decision arquitectonica, token de
  diseno, URL de entorno) se presenta como dato duro sin evidencia citable;
  si no se pudo confirmar, se marca inline como inferido/no confirmado.
  Ningun documento se marca `Estado: complete` sin confirmacion explicita del
  usuario.

### Step 0 — Resolver el modo de invocacion

```
¿Se invoco con --init?             → MODO --init (a su vez resuelve L0/L1/L2
                                       en su propio Step 2)
¿Se invoco con --topic <tema>?     → MODO --topic, acotado a ese tema
¿Se invoco con --learn, o lo       → MODO --learn
   disparo un hook/hallazgo repetido/task-closure?
¿No se invoco con nada de lo       → MODO --maintain (default)
   anterior?
```

Si `--maintain` detecta que `agteamos/` no existe en absoluto (ni siquiera
`onboarding.yml`), sugerir `--init` en vez de reportar "todo falta" — ver
**MODO --maintain** Step 1.

---

## MODO --init

*(contenido completo de la antigua `agteamos-onboard`, preservado integro —
incluye L0/L1/L2 tal cual quedaron del rediseno de onboarding incremental)*

### Sub-contrato de `--init`

- **Input**: repositorio existente sin `agteamos/` (o con `agteamos/` incompleto)
- **Output (L0, default)**: `agteamos/architecture/PROJECT_CONTEXT.md` lean, `agteamos/platform.yml` (detectado), `agteamos/onboarding.yml` (manifest de todo lo demás, declarado `pending`/`candidate`), `agteamos/standards/standards.yml`+`index.yml`+`index.meta.yml` con los 7 temas en `pending`, `agteamos/specs/index.yml` con dominios `candidate`, entradas de `.gitignore`
- **Output (L1, diferido)**: el resto de `agteamos/` (standards por tema, specs por dominio, API map, design system, infraestructura, roadmap, ADRs, labels del tracker) — cada uno generado la primera vez que una skill consumidora real lo necesita, vía `ensure-artifact` (ver `agteamos-context-engineering` §Lazy Artifacts)
- **Output (L2, `--init --full`, opt-in)**: todo lo de arriba generado de una sola vez — es el comportamiento histórico de esta skill
- **Who runs this**: @architect leads L0; cada agente de dominio genera su pieza L1 cuando `ensure-artifact` la dispara, o todos en secuencia si es `--full`
- **Regla de honestidad — no es una foto completa**: esto es progreso incremental con confianza declarada, no una documentación definitiva del proyecto. Cada documento generado lleva su propio header de proveniencia (`Estado`/`Confidence`/`Fuentes revisadas`/`Última revisión`) — ningún valor (versión de librería, decisión arquitectónica, token de diseño, URL de entorno) se presenta como dato duro sin evidencia citable; si no se pudo confirmar, se marca inline como inferido/no confirmado. La siembra de specs es best-effort y parcial por diseño: el objetivo es que la spec exista con honestidad sobre sus límites, no que esté completa. Nunca se crea una spec, ni se marca `Estado: complete`, sin confirmación explícita del usuario. **Esta regla no cambia entre L0/L1/L2** — lo único que cambia es *cuándo* se genera cada artefacto, nunca la honestidad con la que se genera.

### POR QUÉ L0/L1/L2 (y no todo de una vez)

Generar las ~17 carpetas de `agteamos/` y los 7 temas de `agteamos-project-docs --topic`
el día 1 de un proyecto viejo tiene un costo que no siempre se paga de vuelta:
carpetas vacías que no aportan nada, ADRs retroactivos especulativos, specs de
dominios que capaz nadie toca en meses, y sobre todo — el usuario esperando una
sesión larga de preguntas y generación antes de poder pedir la primera tarea
real. Es lo opuesto al patrón que ya aplica `agteamos-capture`
(en sus dos modos): capturar/generar lo mínimo, anunciar en una línea,
completar cuando haga falta.

El patrón de referencia (detalle completo y fuentes en
`DECISIONS.md`): Agent OS descubre
estándares un área por vez; OpenSpec escribe la spec de un dominio recién
cuando una tarea lo toca, nunca por adelantado; BMAD-METHOD deja el contexto
mínimo como "lo que el código no expresa", no el inventario del repo.

### Init Step 1 — Execute agteamos-router

Run the `agteamos-router` skill first. This skill detects:
- Stack and framework (FastAPI / Django / Express / NestJS / Rails / other)
- Frontend framework (React / Vue / Angular / vanilla)
- Database engine and ORM
- Whether `agteamos/` exists and what it contains
- Active changes in progress from previous sessions
- CI/CD platform

If `agteamos-router` reports the repository is empty — stop and run the `agteamos-new-project` skill instead.

Do not proceed to Init Step 2 until `agteamos-router` has completed its full checklist.

### Init Step 2 — Resolver el modo: L0 (default) o `--full` (L2)

```
¿Se invocó con --init --full, o el usuario pidió explícitamente "documentá
todo el proyecto ahora" / "quiero el onboarding completo"?
  SI → L2: seguir el Init Step 3-11 histórico completo, en secuencia, sin
       diferir nada. Útil antes de un primer agteamos-quality o un traspaso
       formal de equipo. Termina con agteamos/onboarding.yml en mode: full
       (todo done).
  NO (default) → L0: Init Step 3 de abajo, mucho más corto. El resto queda
       declarado en agteamos/onboarding.yml para generarse L1 (Init Step 4).
```

No hay pregunta obligatoria para elegir el modo — si el usuario no dijo nada
sobre "completo"/"todo ahora", se asume L0.

### Init Step 3 — L0: onboarding mínimo (default)

Objetivo: menos de 3 minutos, 0-1 preguntas, 5 artefactos o menos.

**3.1 — `agteamos/architecture/PROJECT_CONTEXT.md` lean**

Leer manifests (`package.json`, `pyproject.toml`, `*.csproj`, etc.) y un
árbol de 2 niveles — no leer el código de negocio todavía. Solo 4 secciones:

```markdown
# PROJECT_CONTEXT.md

**Estado**: EXTRACTED
**Confidence**: N/5
**Fuentes revisadas**: [package.json, requirements.txt, ...]
**Última revisión**: YYYY-MM-DD

## Stack

| Layer | Technology | Version | Fuente |
|-------|-----------|---------|--------|
| Backend | FastAPI | 0.115.x | requirements.txt |
| Frontend | React + Vite | 18.x | package.json |

## Comandos canónicos

<!-- detectados de scripts de package.json, Makefile, pyproject.toml, dotnet, etc. -->
| Acción | Comando | Fuente |
|---|---|---|
| Test | `pytest` | pyproject.toml [tool.pytest] |
| Lint | `ruff check .` | pyproject.toml |
| Dev server | `npm run dev` | package.json scripts |

## Mapa de módulos

<!-- 1 linea por carpeta top-level, sin abrir cada archivo -->
- `src/api/` — rutas HTTP
- `src/services/` — lógica de negocio
- `src/repositories/` — acceso a datos

## Gotchas

<!-- vacía al crearse. Se llena con el uso (agteamos-project-docs --learn, o manualmente) -->
```

No se generan ADRs, env vars, ni "Known Technical Debt" todavía — eso es L1
(disparado por la primera tarea que realmente los necesite, o `--full`).

**3.2 — `agteamos/platform.yml` (detectado, no confirmado)**

Aplicar la autodetección de `agteamos-setup` Ronda 0 (`git remote -v`, ramas
existentes, CI/CD, deploy target) y escribir `platform.yml` con
`field_status` marcando cada campo `detected` — ver `agteamos-setup` §Ronda 0
para el detalle completo. Esta skill NO pregunta las 9 preguntas de setup:
solo detecta y deja para que `agteamos-setup` confirme cuando corresponda
(disparado por `agteamos-router` si los 3 campos bloqueantes no están
`confirmed` todavía).

**3.3 — `agteamos/onboarding.yml`**

Crear con `mode: lazy` y una entrada por cada artefacto diferible (ver el
esquema completo en `agteamos-context-engineering` §Lazy Artifacts). Los 7
temas de standards y los dominios detectados quedan declarados acá, no
generados.

**3.4 — `agteamos/standards/standards.yml` + `index.yml` + `index.meta.yml`**

Los 7 temas del plugin en `status: pending` — pero el índice keyword→tema
**ya completo**, tomado del frontmatter de `standards/<tema>/README.md` del
plugin (`keywords`, `description`). Esto es lo que le permite al hook
`inject-standards-index.js` y a las skills consumidoras resolver "qué tema
toca este archivo" desde el día 1, aunque ningún tema se haya generado
todavía — ver **MODO --topic** §Frontmatter.

**3.5 — `agteamos/specs/index.yml` (dominios candidatos, sin specs)**

Proponer dominios desde carpetas/módulos reales (mismo detector que L1 Init
Step 5.b más abajo), pero **sin generar ningún `.md` todavía y sin pedir
confirmación en L0** — quedan en `status: candidate` con su `evidence:`. La
confirmación y la generación del `.md` se disparan recién cuando una tarea
real toca ese dominio (Init Step 5.b).

**3.6 — `.gitignore`**

Mismas 3 líneas que agrega `agteamos-setup` Step 3.5 (`agteamos/dashboard.html`,
`agteamos/changes/**/report.html`, `agteamos/.cache/`) — si `agteamos-setup`
ya corrió antes, no duplicar.

**Cierre de L0** — un mensaje de 3 líneas, no más:

```
Listo el contexto mínimo de <proyecto>. Detecté 7 temas de estándares y
N dominios candidatos ([lista corta]); los voy generando a medida que los
toquemos. Si preferís el onboarding completo ahora: agteamos-project-docs --init --full.
```

No se crea `dashboard.html` en este step (lo crea únicamente
`agteamos-dashboard`, cuando corre). No se crea `SQUAD_HANDOVER.md` en la
raíz del repo (ver Init Step 5.g — su contenido vive en
`PROJECT_CONTEXT.md#Gotchas` y en `dashboard.html`, dentro de `agteamos/`).

### Init Step 4 — L1: generación just-in-time (diferida)

Cada fila de esta tabla es un artefacto que **no** se genera en L0 — se
genera la primera vez que su disparador ocurre, vía el protocolo
`ensure-artifact(<clave>)` (`agteamos-context-engineering` §Lazy Artifacts).
La skill consumidora que dispara la generación anuncia en una línea, genera
en modo acotado, y actualiza `onboarding.yml`.

| Artefacto diferido | Disparador | Generador (modo acotado) |
|---|---|---|
| `standards/<tema>/` | Una skill consumidora resuelve una keyword que apunta a un tema `pending`, o el hook `jit-standards.js` detecta un edit en los globs del tema | `agteamos-project-docs --topic <tema> --scope <paths>` |
| `specs/<dominio>.md` | `agteamos-new-task` o `agteamos-implement` con `domains:` que incluye un dominio `candidate` | Ver Init Step 5.b abajo — un solo dominio, con confirmación en una línea |
| `api/endpoints.md` (+ `openapi.yml`) | `build-api-workflow` Step 1, o una tarea cuyo diff toca routers/controllers | Ver Init Step 5.c — acotado al módulo de la tarea más un índice del resto (solo método + path) |
| `design/DESIGN_SYSTEM.md` | `build-ui-workflow` (primer Step que lee tokens) | Ver Init Step 5.d |
| `devops/INFRASTRUCTURE.md` | `deploy-workflow`, `production-readiness`, o un edit de `Dockerfile`/`docker-compose*`/`.github/workflows/*`/`azure-pipelines.yml` | Ver Init Step 5.e. DORA/SLO siguen a demanda explícita |
| `product/roadmap.md` | `agteamos-capture` (ya crea la sección) o pedido explícito | Ver Init Step 5.f |
| `architecture/adr/` | primer `agteamos-decisions` | Sin ADRs retroactivos automáticos — `agteamos-quality` y `agteamos-explore` pueden **proponer** ADRs de decisiones detectadas, nunca crearlos solos |
| Labels del tracker | primer `[operación: create-ticket]` sobre este proyecto | Se pregunta 1 vez: *"¿Creo las 9 labels estándar en el repo?"*, y se ejecuta vía `[operación: create-label]` del adapter del tracker (`agteamos/tracker/<tracker>.md`) — nunca `gh label create` hardcodeado, y nunca sin esa confirmación explícita |

**L2 (`--init --full`)** corre todos los generadores de esta tabla en
secuencia (más Init Step 3), en el mismo orden en que corrían antes de este
contrato, y deja `agteamos/onboarding.yml` con `mode: full`.

### Init Step 5 — Generadores en modo acotado (usados por L1 y por L2)

Estos son los mismos procedimientos que antes vivían como "Step 3-11"; ahora
se invocan por artefacto individual (L1, vía `ensure-artifact`) o en
secuencia completa (L2, `--full`). El contenido y el nivel de detalle de
cada uno no cambia — lo que cambia es cuándo se disparan.

#### 5.a — Architecture (@architect) — ADRs retroactivos

Además de `PROJECT_CONTEXT.md` (ya generado en L0 Init Step 3.1), crear ADRs
para decisiones arquitectónicas claramente deliberadas pero no documentadas,
**solo en modo `--full` o cuando el usuario lo pide explícitamente** — en L1
esto no tiene disparador automático propio (ver tabla del Init Step 4:
`agteamos-quality`/`agteamos-explore` proponen, no generan solos). Usar la
skill `agteamos-decisions`.

#### 5.b — Domain & Master Spec Seeding (@architect)

Sin este step, `agteamos/specs/<dominio>.md` (la master spec de
`agteamos-sdd-protocol`) es inalcanzable en un proyecto existente — el único
otro escritor es el `sync` de `agteamos-implement`, que solo escribe el
delta de la primera tarea que cierra, mal etiquetado como "comportamiento
actual" de un dominio que apenas tocó. Este step lo siembra honestamente.

En L1, se ejecuta **para un solo dominio** (el que disparó `ensure-artifact`),
nunca para todos los candidatos de una — el resto sigue en `candidate` hasta
que le toque su turno:

1. El dominio ya estaba propuesto como `candidate` en `agteamos/specs/index.yml`
   (L0 Init Step 3.5) con su `evidence:` (carpeta/módulo real que lo respalda). Si
   apareciera un dominio nuevo sin candidatura previa, proponerlo ahora con el
   mismo criterio: nunca inventar un dominio sin al menos un archivo/carpeta
   real que lo respalde.
2. **Confirmar con el usuario antes de escribir el `.md`** — mismo principio
   que el resto del plugin, nunca sembrar sin confirmación explícita:

   ```
   "Vamos a tocar el dominio 'billing' (src/billing/, 14 archivos) — ¿confirmo
   este nombre, lo corrijo, o preferís otro? No genero specs/billing.md sin tu
   confirmación."
   ```

3. Generar `agteamos/specs/<dominio>.md` en el formato canónico exacto de
   `agteamos-sdd-protocol`:

   ```markdown
   # Spec: <dominio>

   ## Coverage
   - **Estado**: seeded
   - **Confidence**: N/5   <!-- misma regla dura que agteamos-project-docs --topic -->
   - **Cubre**: [comportamientos inferidos con evidencia real de codigo]
   - **No cubre (todavia)**: [explicitamente NO vacio — es legacy, siempre falta algo]
   - **Ultima tarea aplicada**: ninguna (sembrado inicial)
   - **Origen**: onboarding (ingenieria inversa) — sembrado just-in-time

   ## Purpose
   [1-2 lineas inferidas del codigo real, citando la carpeta/modulo]

   ## Requirements

   ### Requirement: <Nombre unico y estable>
   El sistema MUST/SHOULD <comportamiento observable inferido del codigo>.
   <!-- Fuente: src/billing/service.py:charge_invoice -->

   #### Scenario: <caso observado en el codigo>
   - GIVEN <estado inicial>
   - WHEN <accion>
   - THEN <resultado observable>
   ```

   `Estado` es **siempre** `seeded` en esta siembra — nunca `partial` ni
   `complete`, sin importar cuánto código se pudo leer. Solo deltas
   posteriores de `agteamos-implement` lo hacen avanzar. Cada
   `### Requirement:` cita el archivo/función real de donde se infirió.
   `No cubre (todavia)` nunca queda vacío en una siembra inicial.

4. Actualizar `agteamos/specs/index.yml`: ese dominio pasa de `candidate` a
   `status: seeded`, con `spec_file:`.

5. Esta siembra es best-effort y parcial por diseño (ver Sub-contrato de
   `--init`).

#### 5.c — API documentation (@backend-engineer)

Leer los archivos de rutas y extraer la superficie de API. En L1, acotado al
módulo que toca la tarea que disparó `ensure-artifact`, más un índice del
resto del proyecto (solo método + path, sin detalle de auth/params todavía):

```bash
grep -r "APIRouter\|@router\|@app" . --include="*.py" -l
grep -r "Router\|@Controller\|app\.get\|app\.post" . --include="*.ts" -l
```

Crear/actualizar `agteamos/api/endpoints.md` con el header de proveniencia
habitual (`Base URL` no visto en config real es inferido, no un hecho):

```markdown
# API Endpoints Map

**Estado**: EXTRACTED
**Confidence**: N/5
**Fuentes revisadas**: [archivos de rutas leidos]
**Última revisión**: YYYY-MM-DD
**Base URL**: https://api.yourapp.com <!-- (inferido, no confirmado) si no esta en config real -->
**Auth**: Bearer JWT in Authorization header

## Invoices

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/invoices | Required | List invoices (paginated) |
```

Si el proyecto expone OpenAPI/Swagger, exportarlo también a
`agteamos/api/openapi.yml` cuando el módulo tocado lo tenga disponible.

#### 5.d — Design system extraction (@ui-ux-designer)

Si el proyecto tiene frontend, leer tema y configuración de componentes:

```bash
cat tailwind.config.ts 2>/dev/null || cat tailwind.config.js 2>/dev/null
find . -name "tokens.css" -o -name "variables.css" -o -name "theme.ts" | head -5
find . -name "*.tsx" -path "*/components/ui/*" | head -20
```

Crear `agteamos/design/DESIGN_SYSTEM.md` con header de proveniencia — un
valor de color o regla de spacing no encontrado literalmente en un archivo
de tokens/config es una inferencia de diseño, no un hecho extraído, y debe
decirlo así (`Estado: DESIGN-DERIVED`).

#### 5.e — Infrastructure documentation (@devops-engineer)

Leer configuración de despliegue:

```bash
cat Dockerfile 2>/dev/null
cat docker-compose.yml 2>/dev/null
ls .github/workflows/ 2>/dev/null
cat cloudbuild.yaml 2>/dev/null
cat fly.toml 2>/dev/null
```

Crear `agteamos/devops/INFRASTRUCTURE.md` con header de proveniencia — una
URL de entorno no encontrada en ningún config real es una suposición, no un
hecho detectado.

Si el proyecto tiene métricas de producción observables, correr
`agteamos-metrics` para sembrar
`DORA_METRICS.md`/`SLO.md` — esto siempre es a demanda explícita, ni L0 ni L1
lo disparan solos.

#### 5.f — Product status (@product-manager)

Leer README.md, ROADMAP/CHANGELOG, issues y milestones. Documentar en
`agteamos/product/roadmap.md` (o `mission.md`/`kpis.md` si el contenido
encaja mejor ahí): versión actual y resumen de release notes, KPIs activos
si son medibles, y gaps conocidos entre estado actual y deseado.

#### 5.g — Labels del tracker (@product-manager, opt-in)

**Nunca automático.** La primera vez que este proyecto ejecuta
`[operación: create-ticket]` (desde `agteamos-new-task`, `agteamos-implement`
o `agteamos-capture`), si todavía no se preguntó, preguntar una sola
vez:

```
"¿Creo las 9 labels estándar en el repo (type: bug/feature/tech-debt,
priority: P0/P1/P2, layer: backend/frontend/infra)?"
```

Si el usuario confirma, ejecutar vía `[operación: create-label]` del adapter
correspondiente (`agteamos/tracker/<tracker>.md`, ver `agteamos-setup` Step
3.6) — nunca `gh label create` hardcodeado, para no romper con
`tracker: azure_devops` (que no tiene labels, ver la nota `N/A` del adapter)
o `tracker: planner`. Si el usuario dice que no, no insistir — queda
`tracker_labels: { status: n/a }` en `onboarding.yml`.

### EXAMPLES (modo --init)

**PROJECT_CONTEXT.md lean generado en L0 (FastAPI + React monorepo)**:

```
## Stack
| Backend | FastAPI | 0.115.0 | requirements.txt |
| Frontend | React + Vite | 18.3 | package.json |

## Comandos canónicos
| Test | pytest | pyproject.toml |
| Lint | ruff check . | pyproject.toml |

## Mapa de módulos
- src/api/ — rutas HTTP
- src/services/ — lógica de negocio
- frontend/src/ — componentes React

## Gotchas
(vacía)
```

**Disparo L1 dos semanas después**: alguien pide "agregá el endpoint de
reembolsos" → `build-api-workflow` Step 1 invoca
`ensure-artifact(standards.api)` y `ensure-artifact(api_map)` →
`agteamos-project-docs --topic api-design --scope src/api/` genera solo ese
tema, y `agteamos/api/endpoints.md` se genera acotado al módulo de
reembolsos + índice del resto. El resto de `agteamos/` sigue como en L0.

### ANTI-PATTERNS (modo --init)

- Skipping `agteamos-router` and jumping straight to documentation — generates docs based on assumptions rather than what the code actually does
- Creating `agteamos/` without reading any actual code — produces generic templates that do not reflect the project
- Documenting "what should be" instead of "what is" — PROJECT_CONTEXT.md must reflect reality; it is a map, not a wish list
- Running `agteamos-project-docs --init` on an empty repo — use `agteamos-new-project` for that case
- Generar un artefacto L1 (standards de un tema, spec de un dominio, API map completo) que ninguna tarea real disparó — en modo lazy (default), cada generación tiene un disparador concreto en la tabla del Init Step 4, nunca "ya que estamos" o "para completar el esquema"
- Seeding `agteamos/specs/<dominio>.md` for a domain the user did not explicitly confirm — a domain candidate is a proposal until the user approves it, never an autonomous decision
- Declaring `Estado: complete` (or even `partial`) on a spec seed — a freshly seeded master spec is always `Estado: seeded`
- Presenting an unverified value as fact without a confidence marker — every generated document carries its `Estado`/`Confidence`/`Fuentes revisadas` header
- Crear `agteamos/dashboard.html` desde esta skill — ese archivo lo genera únicamente `agteamos-dashboard`
- Crear `SQUAD_HANDOVER.md` en la raíz del repo — contradice la regla del README de que todo lo que el sistema toca vive en `agteamos/`; su contenido va en `PROJECT_CONTEXT.md#Gotchas` y en `dashboard.html`
- Crear labels del tracker (`gh label create` u operación equivalente) sin la confirmación explícita del Init Step 5.g, o hardcodeando el comando en vez de resolver `[operación: create-label]` contra el adapter — rompe con `tracker: azure_devops`/`planner`
- Pre-crear carpetas vacías "por las dudas" en L0 — la carpeta la crea la skill que efectivamente escribe el primer artefacto de esa sección (ver `agteamos-context-engineering` §Lazy Artifacts, "regla de carpetas")

---

## MODO --maintain

*(contenido completo de la antigua `agteamos-docs`, preservado íntegro —
incluye la distinción "pendiente por diseño (lazy)" vs "falta de verdad"
agregada en el rediseño de onboarding incremental)*

### Sub-contrato de `--maintain`

- **Input**: ninguno explícito — se ejecuta a demanda ("¿está `agteamos/` al día?") o periódicamente
- **Output**: reporte de gaps/desactualización + regeneración de lo obsoleto (con confirmación del usuario antes de sobreescribir)
- **Trigger**: `@architect` o `@product-manager` lo ejecutan a demanda; distinto de **MODO --init** (que se ejecuta una sola vez, al inicio, sobre un repo con código pero sin `agteamos/`)
- **Diferencia con `--init`**: `--init` genera `agteamos/` completo desde cero vía ingeniería inversa. `--maintain` asume que `agteamos/` ya existe parcialmente y hace mantenimiento incremental — detecta qué se desactualizó desde la última pasada. Si `agteamos/` no existe en absoluto (ni `onboarding.yml`), sugerir `--init` en vez de correr este modo.

### Maintain Step 1 — Recorrer el esquema canónico completo

```
agteamos/
├── platform.yml                      configuración de la plataforma (skill `agteamos-setup`)
├── dashboard.html                     reporte general (skill `agteamos-dashboard`)
├── product/                           mission.md, roadmap.md, kpis.md
├── architecture/                      PROJECT_CONTEXT.md, ARCHITECTURE.md, adr/
├── api/                               openapi.yml, endpoints.md
├── design/                            DESIGN_SYSTEM.md, mockup-v<n>.png
├── devops/                            INFRASTRUCTURE.md, DORA_METRICS.md, SLO.md, prr/
├── security/                          AUDIT-YYYY-MM-DD.md, threat-models/
├── incidents/                         post-mortems/, runbooks/, playbooks/
├── decisions/                         decision-log.md, rfcs/
├── standards/                         standards.yml, index.yml, <tema>/README.md (salida de `agteamos-project-docs --topic`)
├── specs/<dominio>.md                 capa de specs maestras — ver `agteamos-sdd-protocol`
└── changes/                           activas y changes/archive/ (cerradas)
```

Para cada carpeta: ¿existe? ¿tiene al menos el archivo mínimo esperado? ¿la fecha
de última modificación del archivo es anterior al último cambio relevante en el
código (ej. `openapi.yml` más viejo que el router más reciente)? Además, leer
`agteamos/onboarding.yml` si existe — es la fuente de verdad de qué está
diferido a propósito (ver `agteamos-context-engineering` §Lazy Artifacts).

### Maintain Step 2 — Clasificar cada gap

```
FALTA POR COMPLETO   → la carpeta/archivo no existe en absoluto, y tampoco
                         está declarada en onboarding.yml como pending/candidate
PENDIENTE (lazy)      → no existe todavía, pero SÍ está declarada en
                         onboarding.yml con status: pending/candidate y su
                         disparador — es diferido a propósito (onboarding L0,
                         o Fase 0 de agteamos-new-project), no un gap real.
                         No se reporta como falla ni se ofrece regenerar en
                         Maintain Step 3 — solo se lista informativamente
                         ("N artefactos pendientes, se generan bajo demanda")
DESACTUALIZADO        → existe pero el código real ya no coincide
                         (ej. PROJECT_CONTEXT.md menciona un stack que ya no se usa),
                         o su entrada en onboarding.yml quedó `stale` (ver
                         MODO --topic §Topic Step 6 para el caso de standards/<tema>/)
OK                    → existe y está sincronizado
N/A                   → no aplica a este proyecto (ej. design/ en una API pura)
```

### Maintain Step 3 — Reportar antes de regenerar

Mostrar la tabla completa de gaps al usuario, agrupando `PENDIENTE (lazy)`
aparte (una línea resumen, ej. "8 temas de standards pendientes de generación
bajo demanda") — no ofrecerlos individualmente para regenerar ahora salvo que
el usuario lo pida explícitamente ("generá todo lo pendiente"), porque están
diferidos a propósito, no rotos. Para `FALTA POR COMPLETO`/`DESACTUALIZADO`,
NUNCA regenerar sin confirmación explícita — algunos archivos
(`ARCHITECTURE.md`, `decision-log.md`) pueden tener contexto histórico valioso
que una regeneración automática destruiría.

### Maintain Step 4 — Regenerar solo lo confirmado

Regenerar únicamente los archivos que el usuario aprobó. Para archivos con
historial (ADRs, decision-log, RFCs) — nunca sobreescribir, solo agregar
entradas nuevas (ver `agteamos-decisions`).

**Próximo paso sugerido**: si el reporte encontró que `agteamos/standards/` está
vacío o muy desactualizado, sugerir ejecutar `agteamos-project-docs --topic
<tema>` (o sin tema, si el usuario pide todos). Si todo está al día, no hay
próximo paso — el ciclo de mantenimiento termina aquí hasta la siguiente
pasada.

### ESTILO Y PLANTILLAS DE DOCUMENTACIÓN

*(heredado de la antigua skill `documentation-skill`, fusionada en
`agteamos-project-docs` y ahora en `--maintain`)*

#### Diagramas Mermaid — obligatorios para lo no-trivial

Todo cambio arquitectónico, flujo de usuario o lógica de negocio compleja debe
incluir un diagrama Mermaid — no se aceptan descripciones puramente textuales
para procesos que pueden visualizarse:

| Tipo de contenido | Diagrama Mermaid |
|---|---|
| Flujo de usuario / lógica de navegación | `graph TD` |
| Interacción entre componentes (API FE↔BE) | `sequenceDiagram` |
| Arquitectura de sistema / infraestructura | `graph LR` o `C4Component` |
| Modelado de datos / esquema de BD | `erDiagram` |
| Estados de un componente de UI complejo | `stateDiagram-v2` |

#### ADRs — estructura mínima

Ver la skill `agteamos-decisions` para el protocolo completo (numeración, índice,
inmutabilidad). Resumen rápido de la estructura: Título, Contexto, Decisión,
Alternativas consideradas, Consecuencias.

#### Documentación centrada en el código

- El código debe ser autoexplicativo — los nombres de variables/funciones explican el *qué*.
- Los docstrings/comentarios explican el *por qué* y los edge cases no evidentes — no repiten lo que el código ya dice.
- El `README.md` raíz del proyecto es la puerta de entrada, con links a `agteamos/`, no un duplicado de su contenido.

#### Definition of Done — documentación

- [ ] ¿El PR incluye o actualiza la documentación necesaria (no solo código)?
- [ ] ¿Se incluyó un diagrama Mermaid para flujos/arquitectura compleja?
- [ ] ¿Si hubo una decisión técnica significativa, se creó un ADR (`agteamos-decisions`)?
- [ ] ¿Los docstrings/comentarios son precisos y explican el *por qué*, no el *qué*?

### ANTI-PATTERNS (modo --maintain)

- Regenerar `agteamos/` completo cuando solo un archivo está desactualizado — usar `--maintain` para mantenimiento incremental, no como un `--init` disfrazado.
- Sobreescribir ADRs, RFCs o decision-log en vez de agregar entradas nuevas — estos son append-only por diseño.
- Reportar "todo OK" sin haber comparado contra el código real (ej. sin abrir `openapi.yml` y compararlo contra los routers reales).

---

## MODO --topic

*(contenido completo de la antigua `agteamos-standards`, preservado íntegro
— incluye el modo `--topic` por defecto vs. modo completo del rediseño de
onboarding incremental)*

### Sub-contrato de `--topic`

- **Input**: código del proyecto ya existente (repo no vacío) + los 7 estándares base del plugin, reorganizados por tema en `standards/` (`standards/api-design/README.md`, `standards/clean-architecture/README.md`, `standards/solid-principles/README.md`, `standards/dry-kiss-yagni/README.md`, `standards/domain-driven-design/README.md`, `standards/database/README.md`, `standards/testing/README.md`, `standards/frontend/README.md`, `standards/git/README.md`, `standards/security/README.md`, `standards/devops/README.md`), cada carpeta con sus ejemplos por stack adentro (`examples/{csharp,python,typescript}.md`) y un frontmatter `topic`/`description`/`keywords`/`globs`/`first_consumers` (ver §Frontmatter)
- **Output (modo `--topic`, default)**: `agteamos/standards/<tema>/README.md` + `examples.md` (+ `deviations.md` si aplica), y solo la entrada de ese tema en `agteamos/standards/standards.yml` + `agteamos/standards/index.yml`/`index.meta.yml`
- **Output (modo sin argumentos, los 7 de una)**: los 7 temas de una vez — mismo output que antes de este contrato
- **Trigger**: el protocolo `ensure-artifact` (ver `agteamos-context-engineering`) desde una skill consumidora que necesita un tema puntual; `agteamos-project-docs --init --full`; o un pedido explícito del usuario ("generá todos los estándares")
- **Quién ejecuta**: `@architect` (dueño conceptual de las reglas de arquitectura en `standards/` y de `agteamos-decisions`)

> **Nota — no confundir con `agteamos-quality`**: este modo es una
> foto puntual de convenciones (naming, capas, branch strategy, etc.),
> generada bajo demanda tema por tema — no se re-ejecuta en cada PR.
> `agteamos-quality` es el chequeo continuo de smells de dominio
> (concepto disperso, God Module, leaky boundary...) acotado al módulo que
> cambia un PR concreto, con ratchet rule y cache entre corridas. Ambas
> coexisten: `standards/domain-driven-design/README.md` define qué patrones
> DDD aplican al proyecto; `domain-review` detecta cuándo un cambio concreto
> se aleja de ellos.

### POR QUÉ EXISTE ESTE MODO

`standards/` es un árbol de 7 carpetas por tema (reglas + ejemplos de código real
por stack) que viene empaquetado con el plugin. Este modo es el puente: lee las
reglas generales del plugin y determina cuáles aplican literalmente, cuáles
necesitan adaptación, y cuáles el proyecto ya contradice por una razón válida
(framework legacy, decisión de equipo documentada, etc.) — y deja constancia de
qué tan segura está esa determinación (`Confidence`).

**Por qué tema por tema y no los 7 de una vez**: generar los 7 el día 1 de un
proyecto viejo significa leer mucho código que la tarea actual no necesita, y el
resultado típico es mucho `adapted` con Confidence 2-3 (ruido que igual hay que
leer más adelante). El patrón que sigue este modo es el de Agent OS
`/discover-standards` (un área por vez, 5-10 archivos representativos) y el de
Cursor rules (`globs`/`description` deciden cuándo carga una regla) — ver
`DECISIONS.md` §2 para el detalle completo.

### FRONTMATTER de `standards/<tema>/README.md` (plugin)

Cada uno de los 7 temas del plugin declara, arriba del todo:

```yaml
---
topic: testing
description: Piramide de tests, Given/When/Then, factories, E2E con Playwright
keywords: [pytest, vitest, xunit, test, e2e, fixture]
globs: ["**/test_*.py", "**/*_test.py", "**/*.spec.ts", "**/*.test.ts", "**/*Tests.cs", "e2e/**"]
first_consumers: [qa-engineer, build-api-workflow, build-ui-workflow]
---
```

Este frontmatter alimenta `agteamos/standards/index.yml`/`index.meta.yml`
(Topic Step 6) y las tablas de disparadores que usan `hooks/scripts/jit-standards.js`
y las skills consumidoras — no hay listas de keywords/globs hardcodeadas en
ninguna otra skill, todas resuelven contra este frontmatter.

Este frontmatter documenta el formato de los archivos de standards del
**plugin** (`standards/<tema>/README.md`, empaquetados con AgTeamOS) — no
confundir con el frontmatter de esta propia skill `agteamos-project-docs`.

### Topic Step 0 — Resolver el modo de invocación

```
¿Se invocó con --topic <tema> [--scope <paths>]?
  SI → modo acotado (Topic Steps 1-7 aplicados a un solo tema). Este es el
       modo que usa ensure-artifact, y el default quando no se especifica
       nada explícito en un pedido de "generá todos".
  NO, pero el pedido es explícito ("generá todos los estándares",
      "agteamos-project-docs --init --full") → modo completo, los 7 temas
      en secuencia (comportamiento histórico de esta skill, sin cambios)
```

En modo `--topic`, todos los Steps de abajo se acotan a ESE tema únicamente —
nunca se toca ni se relee otro tema por estar "ya ahí".

### Topic Step 1 — Detectar el stack real del proyecto

**Modo `--topic`**: leer `agteamos/architecture/PROJECT_CONTEXT.md` si existe
(ya trae el stack detectado por **MODO --init** L0) y no recalcular desde
cero. Si no existe todavía, leer `package.json`/`requirements.txt`/`*.csproj`
igual que en modo completo, pero solo lo mínimo para identificar lenguaje y
framework principal — no re-analizar todo el árbol de carpetas.

**Modo completo**: leer `package.json`/`requirements.txt`/`*.csproj` (o
equivalente), el árbol de carpetas real, y `PROJECT_CONTEXT.md` si existe.
Determinar: lenguaje(s), framework(s) principal(es), ORM/query builder,
framework de testing. Este resultado alimenta `stack_detected` en
`standards.yml` (Topic Step 6).

### Topic Step 2 — Comparar contra el/los tema(s) de `standards/` del plugin

Para cada tema en alcance (uno solo en modo `--topic`, los 7 en modo
completo), evaluar tres categorías:

```
APLICA (status: applies)    → el proyecto ya sigue esta regla, o no la sigue pero
                                debería (sin razón documentada para desviarse), Y
                                se leyó código real suficiente para confirmarlo
                                con Confidence 4 o 5
APLICA ADAPTADO (status: adapted) → la regla general aplica pero necesita ajuste
                                al stack real (ej. `git/README.md` define branch
                                naming — adaptar al branch_strategy real definido
                                en platform.yml)
SE DESVIA (status: deviates)  → el proyecto contradice la regla por una razón
                                real — preguntar al usuario si la desviación es
                                intencional y documentarla como tal, no como
                                "pendiente de corregir"
```

**Alcance de lectura en modo `--topic`**: 5-10 archivos representativos del
tema, priorizando los que pasó `--scope` (los archivos de la tarea que
disparó la generación) y, si hace falta más evidencia, los `globs` del
frontmatter del tema. Nunca escanear el repo completo para un solo tema — si
la evidencia de esos 5-10 archivos no alcanza para Confidence 4, el tema
queda `adapted` con Confidence más bajo y una nota de qué falta revisar, no
se sigue leyendo indefinidamente.

**Preguntas de "por qué" — solo si hace falta**: en modo `--topic`, hacer
como máximo 1-2 preguntas, y solo si aparece una desviación real o dos
estilos conviviendo en el código (mismo criterio que Agent OS
`/discover-standards`). Si el tema es claro con la evidencia leída, no
preguntar nada.

**Regla dura (sin excepción, en ambos modos)**: NO se marca `status: applies`
en `standards.yml` con `Confidence` menor a 4/5. Si no se pudo leer
suficiente código real para llegar a esa confianza, el tema queda como
`adapted` con `Confidence` más bajo y una nota de qué falta revisar — nunca
se declara "vigente" por default o por similitud de nombre de framework. No
asumir cuál categoría aplica sin evidencia.

### Topic Step 3 — Preguntar por estándares propios del equipo (una sola vez por proyecto)

Antes de escribir el resultado, verificar `agteamos/onboarding.yml` →
`custom_standards_asked`. Si ya es `true`, **saltear esta pregunta** — ya se
hizo la primera vez que se generó cualquier tema en este proyecto.

Si es la primera vez (`false` o el campo no existe):

```
"¿Tu equipo tiene convenciones propias que no están en los 7 estándares
del plugin (ej. una guía de estilo interna, un documento de arquitectura
previo, reglas de un tech lead anterior)? Si las tienes, compárteme la
fuente (archivo, URL, o pégalas aquí) y las incorporo a
agteamos/standards/ junto con las del plugin, como custom_standards."
```

Después de preguntar (la responda el usuario que la responda), setear
`agteamos/onboarding.yml` → `custom_standards_asked: true`. Si el usuario
aporta estándares propios, estos tienen prioridad sobre los del plugin en
caso de conflicto — documentar el conflicto y la resolución, y agregarlos a
`custom_standards` en `standards.yml` (Topic Step 6).

### Topic Step 4 — Escribir `agteamos/standards/<tema>/`

La carpeta la crea este modo al escribir (regla general de
`agteamos-context-engineering` §Lazy Artifacts — "la skill que escribe crea
su carpeta"), no un Step previo de otra skill:

```
agteamos/standards/
├── standards.yml          ← manifest (Topic Step 6, DENTRO de standards/, no en la raíz de agteamos/)
├── index.yml               ← keyword→carpeta (Topic Step 7)
├── index.meta.yml          ← description + status por tema (Topic Step 7)
├── api/                     ← solo si ya se generó (status: done en onboarding.yml)
│   ├── README.md            ← reglas adaptadas de standards/api-design/README.md del plugin, a ESTE proyecto
│   ├── examples.md           ← ejemplos reales tomados del código del proyecto (no genéricos)
│   └── deviations.md         ← solo si hay desviaciones (opcional)
├── git/README.md            ← el resto de los temas aparece a medida que se generan
└── ...
```

**Plantilla de `agteamos/standards/<tema>/README.md`** (header de proveniencia
obligatorio arriba del todo, antes de cualquier regla concreta):

```markdown
# Estándar: API Design

**Estado**: EXTRACTED           <!-- STUB | EXTRACTED | DESIGN-DERIVED | CREATED | UPDATED -->
**Confidence**: 5/5              <!-- 1-5, minimo 4 para status: applies en standards.yml -->
**Aplicación**: ADAPTADO — aplica con ajuste al stack real del proyecto (FastAPI + React)
**Fuentes revisadas**: src/api/routers/*.py (8 archivos)
**Última revisión**: 2026-08-05
**Referencia del plugin**: standards/api-design/README.md

## Cómo aplica en este proyecto
[reglas concretas, con el nombre real de archivos/carpetas del proyecto, no genérico]

## Desviaciones (si las hay)
Ver deviations.md

## Aprendido en uso
<!-- MODO --learn agrega filas acá cuando el usuario corrige una convención en
     el día a día, o cuando un hallazgo repetido se promueve a regla — ver
     MODO --learn más abajo. Vacía hasta que eso pase. -->
```

Significado de `Estado`:
- **STUB**: carpeta creada pero sin evidencia suficiente todavía (Confidence bajo), o creada solo con la sección "Aprendido en uso" por **MODO --learn** antes de que este tema se generara completo.
- **EXTRACTED**: la regla se extrajo leyendo código real del proyecto.
- **DESIGN-DERIVED**: no hay código real que la contradiga o confirme aún, se derivó de decisiones de diseño ya tomadas (ej. ADRs).
- **CREATED**: estándar propio del equipo, no existía en el plugin.
- **UPDATED**: revisión posterior que actualizó una versión anterior de este README.

`examples.md` contiene fragmentos de código real del proyecto (no del plugin) que
ilustran la regla en la práctica — máximo 3 fragmentos. `deviations.md` solo se
crea si `Topic Step 2` determinó `status: deviates` para ese tema, con la razón
documentada por el usuario.

**Tope de tamaño**: `README.md` de un tema no debería superar ~150 líneas (Cursor
recomienda <500 por regla, Windsurf limita a 12k caracteres) — si un tema
necesita más, es señal de que conviene dividirlo, no de agrandar el archivo
indefinidamente.

### Topic Step 5 — Reportar desviaciones no resueltas

Si algo quedó en `status: deviates` sin una razón clara del usuario, listarlo
explícitamente en el reporte final como deuda técnica candidata para `agteamos-quality`.

### Topic Step 6 — Generar/actualizar `agteamos/standards/standards.yml`

En modo `--topic`, **actualizar solo la entrada de ese tema** — nunca
reescribir el archivo completo ni tocar otros temas:

```yaml
generated_at: 2026-08-05
stack_detected: [python-fastapi, typescript-react]
standards:
  - topic: api
    status: adapted          # applies | adapted | deviates | pending
    folder: api/
    last_checked: 2026-08-05
  - topic: security
    status: deviates
    folder: security/
    last_checked: 2026-08-05
    deviation_reason: "MFA pendiente, trackeado como deuda tecnica"
  - topic: testing
    status: pending           # generado por onboarding L0 como placeholder, aun no se genero
custom_standards: []          # estandares propios del equipo, agregados por el usuario
```

**Estado `pending`**: lo escribe **MODO --init** L0 para los 7 temas antes
de que este modo genere ninguno — es lo que le permite a `agteamos-dashboard`
mostrar "3/7 generados, 8 pendientes" desde el día 1 sin haber leído código
todavía.

**Estado `stale`**: un tema `done`/`applies`/`adapted` cuyos archivos (según
sus `globs`) cambiaron en más de un umbral (ej. 20 commits o 30% de los
archivos del glob) desde `last_checked`. Lo detecta **MODO --maintain** al
recorrer el esquema, no este modo — este modo solo deja `last_checked`
actualizado cada vez que corre sobre un tema.

### Topic Step 7 — Generar/actualizar `agteamos/standards/index.yml` + `index.meta.yml`

`index.yml` mantiene el formato plano `keyword: carpeta/`, **compatible hacia
atrás con el parser actual de `hooks/scripts/inject-standards-index.js`**:

```yaml
# agteamos/standards/index.yml
api: api/
rest: api/
endpoints: api/
auth: security/
jwt: security/
migrations: database/
postgres: database/
react: frontend/
branch: git/
commit: git/
pytest: testing/
vitest: testing/
solid: solid-principles/
ddd: domain-driven-design/
docker: devops/
ci: devops/
```

En modo `--topic`, las keywords de `index.yml` se toman del campo `keywords`
del frontmatter del tema (§Frontmatter) — no se inventan a mano.

`index.meta.yml` es nuevo, y trae lo que `index.yml` no puede expresar en su
formato plano:

```yaml
# agteamos/standards/index.meta.yml
api:
  description: REST API design rules — recursos, verbos, versionado, paginacion
  status: done
testing:
  description: Piramide de tests, Given/When/Then, factories, E2E con Playwright
  status: pending
security:
  description: OWASP Top 10 y ASVS L1 — auth, input validation, secrets
  status: done
```

`status` en `index.meta.yml` refleja `standards.yml`. `description` se copia
del frontmatter del tema en `standards/` (plugin). En modo `--topic`, solo se
actualiza la entrada de ese tema; el resto queda como estaba.

Se regenera junto con `standards.yml` en el mismo Topic Step 6/7, siempre que
corre este modo sobre uno o más temas — nunca se reescribe a mano por fuera
de este modo.

**Próximo paso sugerido**: ejecutar `agteamos-project-docs --maintain` para
verificar que el resto del esquema `agteamos/` está completo y sincronizado
con lo que este modo acaba de generar.

### TABLA DE DISPARADORES (modo `--topic` vía `ensure-artifact`)

Esta tabla vive acá y se alimenta del frontmatter de cada tema (§Frontmatter)
— ninguna skill consumidora hardcodea esta lista, todas invocan
`ensure-artifact(standards.<tema>)` y este mapeo resuelve qué generar:

| Tema | Disparador típico |
|---|---|
| api-design | `build-api-workflow` Step 1.5; review de routers o controllers |
| testing | primer archivo de test creado o editado (glob); `qa-engineer` |
| database | edit de migraciones o modelos ORM; keywords `migrations`, `sql` |
| frontend | `build-ui-workflow` Step 2.5; edit de `*.tsx`, `*.vue`, `*.razor` |
| git | primer `task-closure` (commits y PR) |
| security | `audit-workflow`; edit de archivos de auth; keywords `jwt`, `auth` |
| devops | edit de `Dockerfile` o CI; `deploy-workflow` |
| clean-architecture / solid-principles / dry-kiss-yagni | primer `review-workflow` Dimensión 4 (Maintainability) |
| domain-driven-design | primer `domain-review` |

### EJEMPLO (modo --topic)

```
Proyecto: FastAPI + SQLAlchemy + React, sin capas explícitas (todo en un
único módulo `app/main.py` de 2000 líneas). `agteamos-project-docs --init`
L0 ya corrió y dejó los 7 temas en `status: pending`.

`build-api-workflow` arranca la primera tarea de API → invoca
ensure-artifact(standards.api) → agteamos-project-docs --topic api-design
--scope src/api/:

- Lee 6 archivos de rutas reales.
- clean-architecture NO se toca (otro tema, fuera de alcance de esta corrida).
- api-design/ → status: deviates, Confidence 5/5. No hay versionado de rutas
  (`/api/v1/...` vs `/api/...` inconsistente). Pregunta al usuario: "¿es
  intencional o deuda?" → Usuario responde "deuda, hay un plan de
  versionado pendiente" → se documenta en deviations.md como deuda técnica.
- Se actualiza SOLO la entrada `api` en standards.yml/index.yml/index.meta.yml.
  Los otros 10 temas siguen en `pending`.

Dos semanas después, alguien edita el primer archivo de test → el hook
jit-standards.js detecta el glob de `testing` en `pending` → sugiere
ensure-artifact(standards.testing) → se genera SOLO ese tema.
```

### ANTI-PATTERNS (modo --topic)

- Copiar `standards/<tema>/README.md` del plugin literal a `agteamos/standards/<tema>/README.md` sin adaptar al proyecto real — esto no aporta valor sobre simplemente leer el árbol del plugin directamente.
- Marcar algo como `status: deviates` (intencional) sin haber preguntado al usuario — solo el usuario puede confirmar que una desviación es intencional.
- Marcar `status: applies` con `Confidence` menor a 4/5 — viola la regla dura de este modo; si la evidencia es insuficiente, el tema se queda en `adapted` con Confidence bajo hasta revisar más código.
- Escribir `standards.yml` en la raíz de `agteamos/` en vez de dentro de `agteamos/standards/`.
- Regenerar `index.yml`/`index.meta.yml` a mano sin que coincida con las carpetas reales de `standards.yml` — los tres se regeneran juntos, en el mismo paso.
- Ejecutar este modo en un repo vacío — para eso existe `agteamos-new-project`/`agteamos-setup`, no `agteamos-project-docs --topic`.
- **Generar en modo `--topic` un tema que ninguna tarea pidió** — en modo lazy, cada tema se genera porque algo real lo disparó (`ensure-artifact`, un pedido explícito, o `--init --full`), nunca "ya que estamos" o "por completar el índice".
- Preguntar por estándares propios (Topic Step 3) más de una vez por proyecto — verificar `custom_standards_asked` antes de preguntar.
- Leer el repo completo para generar un solo tema — el alcance en modo `--topic` es 5-10 archivos representativos, no un escaneo exhaustivo.

---

## MODO --learn

*(contenido completo de la antigua `agteamos-learn`, preservado íntegro)*

### Sub-contrato de `--learn`

- **Input**: una corrección del usuario detectada por el hook
  `detect-correction.js`, un hallazgo con `SEEN >= 3` de `agteamos-quality`, o un patrón nuevo consistente detectado por
  `agteamos-implement` al cerrar una tarea
- **Output**: una fila nueva (o `STUB` inicial) en
  `agteamos/standards/<tema>/README.md#Aprendido en uso`
- **Regla de oro**: igual que `agteamos-capture` — nunca interrumpe con
  preguntas de más, confirma en una línea y sigue con lo que se estaba
  haciendo. La única pregunta válida es la confirmación de si la corrección
  es de verdad una convención a registrar (ver Learn Step 1)

### POR QUÉ EXISTE ESTE MODO

Hoy, cuando el usuario corrige a un agente ("acá usamos Result pattern, no
excepciones"), esa corrección no se captura en ningún lado — se aplica en la
tarea actual y se pierde para la próxima sesión. `knowledge-base.md` (de
`agteamos-implement`) solo captura *decisiones* al cerrar una tarea, no
*convenciones* que emergen en cualquier momento de cualquier conversación.
Este modo cierra ese hueco, siguiendo el mismo patrón que Devin Knowledge y
CodeRabbit Learnings: la corrección del humano se convierte en una regla
propuesta, que se aprueba con un "sí" (ver
`DECISIONS.md` §2 y §4.4).

### Disparador 1 — Corrección del usuario (el más común)

El hook `hooks/scripts/detect-correction.js` (`UserPromptSubmit`) detecta
frases como "no, acá usamos X", "siempre usá Y", "nunca hagas Z", "en este
proyecto...", "we always...", "don't use..." e inyecta una sugerencia. Cuando
eso pasa (o el usuario lo pide directo, sin que el hook medie):

1. Confirmar en una sola pregunta si de verdad es una convención a registrar
   (no una instrucción puntual para esta tarea únicamente): *"¿Registro esto
   como convención del proyecto (queda en agteamos/standards/) o era solo
   para esta tarea?"* — si el usuario ya lo dejó claro en su mensaje
   original, no volver a preguntar.
2. Si es una convención: continuar a Learn Step 2 (resolver tema y escribir).

### Disparador 2 — Hallazgo repetido (SEEN ≥ 3)

`agteamos-quality` usan
`findings-ledger.js#reconcile` para marcar hallazgos como `NEW`/`SEEN
xN`/`RESOLVED`. Cuando un hallazgo sobre la **misma regla** llega a `SEEN x3`
o más, en PRs/tareas distintas (no la misma tarea repetida), proponer:

```
"El hallazgo '<regla>' ya apareció 3 veces en PRs distintos. ¿Lo promuevo a
estándar del proyecto (agteamos-project-docs --learn) para que quede
documentado y dejen de repetirlo, o preferís dejarlo como está?"
```

Si el usuario confirma, continuar a Learn Step 2. Esto es el equivalente
automatizado del *"Add rules only when you notice Agent making the same
mistake repeatedly"* de Cursor.

### Disparador 3 — Patrón nuevo consistente al cerrar una tarea

`agteamos-implement`, junto con la promoción de decisiones a
`knowledge-base.md`, evalúa si el diff introdujo un patrón nuevo y
consistente (un helper reutilizado 3+ veces, un naming nuevo aplicado de
forma pareja). Si lo detecta, ofrece registrarlo — mismo contrato, una
pregunta, nunca automático.

### Learn Step 2 — Resolver el tema y escribir

1. Resolver contra `agteamos/standards/index.yml` qué tema corresponde
   (misma resolución de keywords que usan las demás skills consumidoras). Si
   no matchea ninguno, usar `custom/` como tema genérico.
2. Si `agteamos/standards/<tema>/README.md` **no existe todavía** (tema
   `pending` en `onboarding.yml`): crearlo con `Estado: STUB` y solo la
   sección `## Aprendido en uso` — **no** disparar la generación completa
   del tema (`ensure-artifact` completo) solo por esto; eso queda para
   cuando algo más lo dispare de verdad (ver **MODO --topic** §Tabla de
   disparadores).
3. Si ya existe, agregar una fila bajo `## Aprendido en uso` (crear la
   sección si el README es de antes de este contrato):

   ```markdown
   ## Aprendido en uso

   - **Estado**: CREATED   <!-- CREATED (nueva) | UPDATED (ajusta una fila existente) -->
     **Fuente**: conversación 2026-09-23 | PR #128 | tarea 42-billing-refund
     **Confidence**: 4/5   <!-- misma regla que el resto del plugin: nunca mas alto que la evidencia -->

     Usar Result pattern (`Result[T, E]`) en servicios en vez de lanzar
     excepciones para errores esperables (ej. `InsufficientFundsError`).
     Excepciones solo para errores no recuperables/de programación.
   ```

4. Actualizar `agteamos/standards/standards.yml` → esa entrada pasa a
   `status: done` si estaba `pending` (con `Estado: STUB` en el README, ver
   arriba), sin tocar el resto del manifest.

### Learn Step 3 — Confirmar y continuar

Una sola línea, sin preguntas de seguimiento:

```
"Registrado en agteamos/standards/clean-architecture/README.md#Aprendido en
uso. Seguí con lo que estabas haciendo."
```

### EXAMPLE (modo --learn)

```
Usuario: "no, aca las validaciones de negocio van en el service, no en el
router — ya nos paso un bug por eso"

→ detect-correction.js sugiere agteamos-project-docs --learn
→ Learn Step 1: "¿Registro esto como convención del proyecto?" → usuario: "sí"
→ Learn Step 2: resuelve tema "api" (keyword "router") o "clean-architecture"
  (keyword "service layer") — si hay ambigüedad, preguntar cuál de los dos
  una sola vez, no asumir
→ Escribe en clean-architecture/README.md#Aprendido en uso, Estado: CREATED,
  Fuente: conversación 2026-09-23, cita el bug como motivo
→ "Registrado. Seguí con lo que estabas haciendo."
```

### ANTI-PATTERNS (modo --learn)

- Escribir una convención sin que el usuario la haya confirmado como tal —
  el hook solo sugiere, nunca escribe.
- Disparar la generación completa de un tema (`ensure-artifact` completo,
  los 5-10 archivos representativos de **MODO --topic**) solo porque
  **MODO --learn** necesitaba anotar una fila — el STUB con una sola sección
  alcanza hasta que algo más dispare la generación real.
- Preguntar ACs, prioridad o detalle adicional más allá de la confirmación
  del Learn Step 1 — mismo contrato de baja fricción que `agteamos-capture`.
- Promover un hallazgo a convención con menos de `SEEN x3` — un hallazgo
  visto una o dos veces todavía puede ser ruido, no un patrón.
- Confundir esto con `agteamos-implement`/`knowledge-base.md` — ese
  archivo registra decisiones de UNA tarea puntual; **MODO --learn** registra
  convenciones que aplican a TODO el proyecto de ahí en adelante.
