# Decisiones de diseño del plugin AgTeamOS

Historial breve de decisiones estructurales grandes tomadas sobre el propio
plugin (no del proyecto consumidor — para eso está `agteamos-decisions` y
`agteamos/decisions/` en cada proyecto que usa AgTeamOS). Cada entrada es un
resumen de 3-4 líneas — el detalle completo, si hace falta, está en el
historial de commits/PRs de esa fecha.

---

## 2026-09-23 — Onboarding incremental (L0/L1/L2) y contrato `ensure-artifact`

**Qué cambió**: `agteamos-onboard` (ahora `agteamos-knowledge --init`) y
`agteamos-new-project` dejaron de generar todo `agteamos/` de una sola vez.
Se introdujo un manifest (`agteamos/onboarding.yml`) y un protocolo
compartido (`ensure-artifact`, en `agteamos-context`) para que
cada artefacto se genere la primera vez que una tarea real lo necesita, no
por adelantado.

**Por qué**: el onboarding completo legado (muchas carpetas y topics
prescriptivos) constaba de una sesión larga de preguntas y generación
antes de poder pedir la primera tarea real — el mismo costo que ya evitaban
`agteamos-backlog`/`agteamos-capture` para capturas puntuales.

**Fuentes**: investigación de Agent OS, OpenSpec, spec-kit, BMAD-METHOD,
Cursor rules, Continue.dev y Aider sobre patrones de carga perezosa de
contexto y descubrimiento incremental de convenciones.

---

## 2026-09-23 — Consolidación 46→23 skills, 9→8 agentes, topics 11→7, 13→6 hooks

**Qué cambió**: fusión de skills/agentes/standards/hooks redundantes en
mega-skills por flujo (Flujo 1/2/3) y por dominio (calidad, seguridad,
decisiones, operaciones, documentación), sin perder capacidad funcional —
cada fusión reorganiza contenido existente en modos/secciones de un solo
archivo.

**Por qué**: el plugin había crecido de forma incremental hasta sentirse
sobrecargado y difícil de navegar — múltiples skills necesitaban una frase
de "distinto de X" en su propia descripción para no confundirse con otra, el
flujo más común atravesaba ~11 archivos, y el propio `README.md` tenía un
conteo de skills desactualizado en 3 lugares distintos.

---

## 2026-09-24 — Nombres de skill de una sola palabra

**Qué cambió**: las 8 skills que todavía tenían un nombre compuesto con
guión pasaron a una sola palabra: `agteamos-new-project` →
`agteamos-bootstrap`, `agteamos-new-task` → `agteamos-task`,
`agteamos-deploy-readiness` → `agteamos-deploy`, `agteamos-project-docs` →
`agteamos-knowledge`, `agteamos-plugin-improvement` → `agteamos-meta`,
`agteamos-context-engineering` → `agteamos-context`, `agteamos-sdd-protocol`
→ `agteamos-spec`, `agteamos-pr-standards` → `agteamos-pr`. Además, 2
carpetas se renombraron por consistencia sin cambiar su `name:`
(`debug-workflow` → `debug/`, `fix-workflow` → `fix/`).

**Por qué**: criterio explícito del dueño — nombres cortos, una palabra
después de `agteamos-`, sin importar si el compuesto anterior "comunicaba
bien" o no. De paso, `agteamos-deploy` deja de sonar solo a "checklist de
preparación" cuando en realidad cubre todo el lifecycle de despliegue.

---

## 2026-09-24 — Puerta única multi-tracker con contexto real

**Qué cambió**: `agteamos-work-items` pasó a ser la única puerta para crear o
modificar tickets en Azure Boards, GitHub Issues y Planner. Antes de
redactar inspecciona repo y tracker reales; luego exige un change set exacto,
aprobación explícita y read-back verification. Los adapters quedan como
fallback/compatibilidad, no como API directa para las skills.

**Por qué**: `task`, `bootstrap`, `capture`, agentes e incidentes podían
escribir por rutas distintas, con campos estáticos y sin una política uniforme
de aprobación. Centralizar elimina supuestos como `State: New`,
`Iteration Path: Backlog` o labels universales, evita duplicados y mantiene
la misma seguridad al agregar proveedores futuros.

---

## 2026-09-25 — Knowledge v3: registry, discovery y human docs

**Qué cambió**: se eliminó del contrato cualquier standard prescriptivo
empaquetado. `standards/registry.yml` conserva solo metadata para siete topics
canónicos; las convenciones se descubren desde evidencia del proyecto y
`--inject` devuelve únicamente paths. Knowledge, implement, task, quality y
decisions funcionan como dispatchers JIT con módulos acotados.

**Validación**: `scripts/agteamos-validate.mjs --strict`, los verificadores
versionados y CI son gates deterministas; el LLM no sustituye esos checks. Los
hooks runtime se consolidan en `session-start.js` y `post-write-checks.js`.

**Human docs MVP**: `agteamos-knowledge --human-docs` deriva solo README,
CHANGELOG, `docs/architecture.md` y `docs/operations.md`. Cada sección declara
`Sources`/`Last verified`, preserva contenido humano fuera de marcadores y
mantiene `agteamos/` como única fuente de verdad.

---

## 2026-09-25 — Layout lazy ejecutable y providers plugin-owned

**Qué cambió**: `contracts/project-layout.json` define los perfiles
`adopted_l0` y `greenfield_phase0`. L0 ya no crea `standards/`, `specs/` ni
`tracker/`; el primer uso materializa cada carpeta. Bootstrap conserva solo
producto lean y ADR-001, no crea backlog/tickets y genera únicamente el README
humano inicial.

**Providers**: GitHub, Azure Boards y Planner viven versionados en
`agteamos-work-items`. Un proyecto solo crea `tracker/` para un override
custom aprobado; adapters v3 existentes se preservan como legacy.

**Por qué**: la estructura documentada y el router todavía podían inducir un
árbol casi completo aunque el contrato pretendía ser lazy. Hacer el layout
machine-readable permite que validator, status y fixtures detecten regresiones
y reduce carpetas, duplicación y contexto desde la primera sesión.

---

## 2026-09-25 — Portal global estático y collector compartido

**Qué cambió**: `agteamos-dashboard` pasó a delegar en renderers
deterministas. Un collector read-only común alimenta status, dashboard de
proyecto y `~/.claude/agteamos/portal.html`, que agrega los roots registrados
en `projects.yml`.

**Por qué estático**: un HTML autocontenido funciona en Windows/Linux, no
requiere runtime persistente, build frontend, puertos, CDN ni dependencias
adicionales. Mantiene bajo el costo operativo y el consumo de contexto de la
skill.

**Límite deliberado**: el portal es un snapshot de fuentes locales
allowlisted, no una UI live de Azure Boards, Planner o GitHub. Canonicaliza
roots, escapa contenido y excluye secretos, emails y cache crudo; cualquier
mutación continúa pasando por la skill dueña y sus aprobaciones.

---

## 2026-09-25 — Workflow v2 durable y verificación semántica

**Qué cambió**: las fases tardías ya no dependen de afirmaciones narrativas.
`task.yml` persiste gates de QA, validator, review, merge y reconciliación; el
contrato y los scripts rechazan fases incompatibles. Los flujos `lite`
conservan el mismo estado mínimo, aunque no creen specs.

**Preflight y cierre**: `agteamos-analyze.mjs` comprueba de forma read-only
requirements, ACs, tasks, rutas de diseño y deltas antes del código, y exige
cobertura completa en cierre. `verify-report.md` parte del objetivo y prueba
la cadena verdad observable → artefacto → wiring → evidencia no tautológica.

**Aprobaciones externas**: un change set se materializa como JSON canónico,
recibe fingerprint SHA-256 y solo puede aplicarse con un receipt del mismo
payload. Esto no reemplaza doctor ni read-back; evita que una aprobación
procedural cubra accidentalmente una mutación diferente.

**Contexto**: el router se dividió en resolución, estado del repo y ruteo. Su
dispatcher compacto se comparte entre agentes y solo carga el módulo de la
fase necesaria, manteniendo el preflight sin reintroducir el costo del router
monolítico.

---

## 2026-09-25 — Patrones Dev-OS sin acoplamiento Phoenix

**Qué se adoptó**: auditoría read-only de desgloses existentes, transporte
Azure UTF-8 estructurado con read-back por valor, discovery del layout real,
attachments aprobados, snapshots multi-repo con freshness y receipt durable
`tracker-result.md`.

**Cómo encaja**: no se creó otra skill ni un pipeline Azure paralelo.
`agteamos-task` audita y vuelve al flujo SDD; `agteamos-work-items` conserva
doctor → inspect → fingerprint → approval → apply → read-back. Los receipts
durables viven con la tarea y el portal solo expone su estado sanitizado.

**Qué se rechazó**: organización/proyecto Phoenix, equipos Calsystem/Odoo,
Value Areas, periodos, estimaciones, rutas locales, DGII, `odoo-cli`, parent
Feature obligatorio y la corrección fija de +1 día. Son políticas o incidentes
de un tenant, no invariantes del plugin.

**Seguridad**: business text no atraviesa argumentos shell en fallback REST;
attachments incluyen hash/path relativo y revisión de secretos; mirrors stale
no prueban estado vigente y una inspección nunca ejecuta `reset --hard`.

---

## 2026-09-25 — Workflow v3 selectivo inspirado por Spec OS

**Qué se adoptó**: abandono durable preservativo, Bug por ID con bifurcación
lite/full, problem framing, blueprint greenfield agrupado, research opt-in,
review proporcional al riesgo ligado al SHA, métricas deterministas de
contexto y mantenimiento manual de release.

**Por qué selectivo**: eran gaps reales de lifecycle/producto/operación, pero
no justificaban más skills/agentes ni cuestionarios/gates universales.
Bootstrap se modularizó JIT y workflow v3 mantiene lectura compatible con v2.

**Qué se rechazó**: research obligatorio, Feature temprana, gates por archivo,
adapters locales por proyecto, commits automáticos, sync parcial,
`git add -A`, resets destructivos y coordinación cross-project sin diseño de
portfolio verificable.

**Medición honesta**: context budget usa bytes UTF-8 y `ceil(bytes/4)`;
portal/pulse lo etiquetan como estimación, nunca como telemetría real del host.
