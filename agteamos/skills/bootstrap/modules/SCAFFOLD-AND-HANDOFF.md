# Scaffold, onboarding and handoff

Carga este módulo después de materializar la foundation aprobada.

## 1. Scaffold mínimo verificable

Crear solo código/configuración necesaria para que el stack aprobado compile
o inicie:

- estructura con archivos reales, no directorios contenedores vacíos;
- manifests/lockfiles apropiados;
- `.gitignore` y `.env.example` sin secretos;
- runtime local/Docker solo si el blueprint lo incluyó;
- CI mínimo del `repo_host`: install, lint/typecheck, test y build.

No crear deploy especulativo. `deploy_target`, infraestructura y
observabilidad operativa pueden quedar diferidos hasta el primer deploy real.
No usar `git add -A`, no descartar cambios existentes y no commit/push salvo
petición explícita.

Ejecutar los comandos canónicos del `PROJECT_CONTEXT.md`. Si un comando
falla, corregir scaffold o volver al blueprint si la decisión era inviable;
no declarar listo.

## 2. Onboarding lazy

Crear `agteamos/onboarding.yml`:

```yaml
layout_contract: "1"
profile: greenfield_phase0
mode: lazy
lifecycle: initialized
```

Registrar como `done` solo artefactos que realmente existen. Declarar
`pending` con path y trigger concreto para:

- design system → primera UI real;
- ADR de datos/auth → primera tarea que tome esa decisión;
- KPI completo → demanda o primer deploy a producción;
- infrastructure → primer cambio real de CI/CD/deploy;
- market research → opt-in explícito, si no fue aprobado;
- backlog → petición explícita de guardar/importar/gestionar;
- standards → primera tarea que requiera cada topic;
- specs → primera tarea full de dominio.

No crear las carpetas pending. No crear `changes/`, `archive/`, `design/`,
`devops/`, `standards/`, `specs/`, `docs/` o dashboard por anticipado.

## 3. README humano

Ejecutar conceptualmente:

```text
agteamos-knowledge --human-docs --scope changed --outputs readme
```

Crear/integrar solo `README.md`, preservando contenido humano fuera de
marcadores. `CHANGELOG.md` y `docs/` aparecen con evidencia posterior.

## 4. Verificación final

- correr lint/typecheck, test y build canónicos;
- ejecutar `agteamos-validate --strict`;
- comprobar que no existe backlog/ticket creado por bootstrap;
- comprobar que todas las rutas escritas estaban en el blueprint aprobado;
- confirmar que artefactos deferred no fueron materializados.

## 5. Handoff

Entregar artefactos, comandos/resultados y decisiones deferred. Detenerse y
ofrecer:

- `agteamos-capture` para guardar una propuesta en backlog;
- `agteamos-task` para comenzar una feature.

Ni `handoff_mode: auto` ni una roadmap propuesta autorizan crear backlog,
tickets o la primera feature.
