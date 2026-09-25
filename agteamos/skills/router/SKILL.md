---
name: agteamos-router
description: >
  Preflight ligero y punto de entrada de AgTeamOS. Resuelve el proyecto cuando
  se nombra, comprueba estado real del repo y selecciona bootstrap, exploración,
  creación de tarea, implementación o gestión del tracker. Carga únicamente el
  módulo de detalle necesario.
used_by:
  - architect
  - product-manager
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - security-engineer
  - devops-engineer
  - ui-ux-designer
---

# Skill: Router

## Contract

- **Input**: petición actual y root/workspace efectivo.
- **Output**: target verificado, resumen mínimo del repo y un único handoff.
- **Safety**: resolver un path no autoriza escribir en él. Para ingeniería,
  el host debe verificar ese path como root/workspace efectivo.
- **Scope**: coordina; no duplica setup, conocimiento, work items ni
  implementación.

## Preflight en tres fases

### A — Proyecto, solo cuando aplica

Si el usuario nombra/cambia/crea/lista proyectos, cargar
`modules/PROJECT-RESOLUTION.md`. Si no nombra otro proyecto, conservar el root
actual y no cargar ese módulo.

Resultado requerido para continuar: `switched` o root actual ya verificado.
`scoped-absolute` sirve exclusivamente para `agteamos-capture`; nunca habilita
trabajo de ingeniería.

### B — Estado del repositorio, siempre

Cargar `modules/REPO-STATE.md`. Observar código, contexto lazy, plataforma y
cambios activos del usuario. No crear directorios futuros ni completar datos
por suposición.

### C — Ruta de trabajo, siempre

Cargar `modules/FLOW-ROUTING.md` y seleccionar exactamente uno:

- Flow 1: `agteamos-bootstrap` para repo sin código.
- Explore: `agteamos-explore` para investigar antes de comprometerse.
- Flow 2: `agteamos-task` para trabajo nuevo sin ticket.
- Flow 3: `agteamos-implement` para ticket existente.
- Board-only: `agteamos-work-items` para backlog/tracker sin implementación.

## Reglas invariantes

1. `platform.yml` debe tener `repo_host`, `tracker` y `branch_strategy`
   confirmados antes de mutaciones; si faltan, delegar solo esos campos a
   `agteamos-setup`.
2. Leer estado remoto no requiere aprobación. Toda mutación de ticket/board
   requiere draft estructurado, fingerprint, aprobación exacta, apply y
   read-back verification mediante `agteamos-work-items`.
3. Antes de redactar Epic, Feature, Story, Task, Bug o Issue, inspeccionar el
   repositorio y distinguir `Observed`, `Proposed` y `Pending decision`.
4. No pedir `cd` como sustituto de cambiar/verificar el root del agente.
5. No preguntar por cambios activos de otros contribuidores; filtrar por
   owner/branch.
6. Cargar solo el módulo de fase que haga falta y liberar sus detalles tras
   producir el resumen/handoff.

## Exit checklist

- [ ] Root/workspace objetivo verificado.
- [ ] Instrucciones y contexto del repo destino leídos.
- [ ] Estado del repo derivado de evidencia real.
- [ ] Configuración bloqueante confirmada o delegada a setup.
- [ ] Flujo único seleccionado y entregado a su skill propietaria.
