# Decisiones de diseño del plugin AgTeamOS

Historial breve de decisiones estructurales grandes tomadas sobre el propio
plugin (no del proyecto consumidor — para eso está `agteamos-decisions` y
`agteamos/decisions/` en cada proyecto que usa AgTeamOS). Cada entrada es un
resumen de 3-4 líneas — el detalle completo, si hace falta, está en el
historial de commits/PRs de esa fecha.

---

## 2026-09-23 — Onboarding incremental (L0/L1/L2) y contrato `ensure-artifact`

**Qué cambió**: `agteamos-onboard` (ahora `agteamos-project-docs --init`) y
`agteamos-new-project` dejaron de generar todo `agteamos/` de una sola vez.
Se introdujo un manifest (`agteamos/onboarding.yml`) y un protocolo
compartido (`ensure-artifact`, en `agteamos-context-engineering`) para que
cada artefacto se genere la primera vez que una tarea real lo necesita, no
por adelantado.

**Por qué**: el onboarding completo de un proyecto viejo (17 carpetas, 11
temas de standards) constaba de una sesión larga de preguntas y generación
antes de poder pedir la primera tarea real — el mismo costo que ya evitaban
`agteamos-backlog`/`agteamos-capture` para capturas puntuales.

**Fuentes**: investigación de Agent OS, OpenSpec, spec-kit, BMAD-METHOD,
Cursor rules, Continue.dev y Aider sobre patrones de carga perezosa de
contexto y descubrimiento incremental de convenciones.

---

## 2026-09-23 — Consolidación 46→22 skills, 9→8 agentes, 11→7 standards, 13→6 hooks

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
