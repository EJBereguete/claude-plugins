---
name: agteamos-dashboard
description: >
  Genera vistas locales, estáticas y regenerables del estado de AgTeamOS.
  Incluye dashboard de un proyecto, portal global multi-proyecto y pulso
  read-only. Úsala para "ver proyectos", "abrir el portal", "actualizar el
  dashboard", "reporte de tarea" o "cómo está el proyecto".
used_by:
  - architect
  - product-manager
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - devops-engineer
---

# AgTeamOS Dashboard

Esta skill es un dispatcher. La lectura, agregación, escaping y generación
viven en scripts deterministas; no copies ni generes plantillas HTML desde el
prompt.

## Modos

### Proyecto actual

Genera `agteamos/dashboard.html` y un `report.html` dentro de cada cambio
activo o archivado:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-dashboard.mjs" --project --root "<project-root>"
```

Los HTML son derivados locales. No deben incluirse en commits.

### Portal multi-proyecto

Genera `~/.claude/agteamos/portal.html` usando el registro global:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-dashboard.mjs" --portal
```

Puede indicarse un registro o salida explícitos:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-dashboard.mjs" --portal --projects "<projects.yml>" --out "<portal.html>"
```

El portal solo refleja snapshots locales allowlisted. No promete sincronía
live con Azure Boards, Planner, GitHub Issues ni otros trackers.

### Pulso read-only

Resume salud local sin escribir ningún archivo:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-dashboard.mjs" --pulse --root "<project-root>"
```

El pulse incluye bytes UTF-8 y tokens estimados de contexto según
`contracts/context-budget.json`. Es `ceil(bytes/4)`, no telemetría del host.
Para desglose por tier, módulo y artefacto:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-status.mjs" \
  --root "<project-root>" --context-budget --json
```

## Contrato

- El dashboard y el portal leen únicamente fuentes aprobadas por
  `contracts/project-layout.json` y `contracts/portal.json`.
- Nunca exponen secretos, correos, credenciales, contenido de `.cache` ni
  cuerpos arbitrarios de documentos.
- Los roots se resuelven de forma canónica. Entradas inválidas se omiten y se
  reportan como diagnósticos.
- Todo texto procedente del proyecto se escapa antes de entrar al HTML.
- No usan servidor, red, CDN ni dependencias frontend.
- La generación puede sobrescribir solo sus HTML derivados. Nunca modifica
  fuentes del proyecto, tareas o trackers.
- Un fallo de regeneración automática se informa, pero no bloquea captura,
  implementación, archivo ni sincronización.

## Presentación

Después de generar:

1. Indica la ruta del archivo.
2. Resume conteos y diagnósticos relevantes.
3. Abre el HTML si el entorno ofrece una operación segura para hacerlo y el
   usuario lo pidió o resulta claramente útil.

No afirmes que un dato del portal está actualizado en la plataforma remota:
identifícalo como estado local y muestra `generated_at`.
