---
name: context-protocol
description: >
  Define como todos los agentes leen y escriben en /docs, la fuente
  de verdad unica del proyecto. Estandariza el acceso a documentacion,
  specs, tasks y decisiones.
used_by:
  - architect
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - devops-engineer
  - product-owner
  - project-manager
  - security-engineer
  - ui-ux-designer
---

# Skill: Context Protocol

## CONTRACT
- **Input**: Cualquier operacion que requiera leer o escribir contexto del proyecto
- **Output**: Documentacion actualizada en /docs
- **Regla**: /docs es la UNICA fuente de verdad. No crear documentacion fuera de /docs

## ESTRUCTURA DE /docs

```
/docs
├── 01-architecture/
│   ├── PROJECT_CONTEXT.md          ← stack, patrones, decisiones clave
│   ├── c4-context.md               ← diagrama L1: sistema + actores
│   ├── c4-containers.md            ← diagrama L2: servicios, DBs, frontends
│   └── adr/
│       ├── index.md                ← lista de todos los ADRs
│       └── ADR-001-*.md
│
├── 02-api/
│   └── openapi.yml                 ← OpenAPI 3.1 auto-actualizado
│
├── 03-ui-ux/
│   └── DESIGN_SYSTEM.md            ← tokens, paleta, componentes base
│
├── 04-devops/
│   ├── INFRASTRUCTURE.md           ← entornos, CI/CD, variables
│   └── runbooks/
│       ├── index.md
│       └── RB-001-deploy.md
│
├── 05-security/
│   ├── threat-model.md             ← PASTA threat model
│   └── asvs-checklist.md           ← OWASP ASVS del proyecto
│
├── 06-incidents/
│   └── playbooks/
│       └── P1-service-down.md
│
├── 07-decisions/
│   └── decision-log.md             ← decisiones menores sin ADR
│
└── tasks/
    ├── active/
    │   └── TASK-<id>-<slug>/
    │       ├── TASK-<id>-<slug>.md  ← tracking + checkpoints + documentacion
    │       ├── evidence/            ← screenshots QA, reportes
    │       └── specs/               ← requirements + design + tasks (SDD)
    └── completed/
        └── TASK-<id>-<slug>/        ← historial completo
```

## REGLAS DE ACCESO

### Quien escribe que

| Carpeta | Escribe | Lee |
|---------|---------|-----|
| 01-architecture/ | @architect | Todos |
| 02-api/ | @backend-engineer | @frontend-engineer, @qa-engineer |
| 03-ui-ux/ | @ui-ux-designer | @frontend-engineer, @qa-engineer |
| 04-devops/ | @devops-engineer | Todos |
| 05-security/ | @security-engineer | @architect, @qa-engineer |
| 06-incidents/ | @devops-engineer | Todos |
| 07-decisions/ | @architect, @product-owner | Todos |
| tasks/active/ | Todos los agentes de implementacion | Todos |
| tasks/completed/ | @project-manager (mueve al completar) | Todos |

### Reglas de escritura

1. **Nunca sobrescribir sin leer primero** — siempre lee el archivo actual antes de editarlo
2. **Append, no replace** — agrega informacion nueva, no borres la existente
3. **Timestamps obligatorios** — cada actualizacion incluye fecha
4. **Sin duplicacion** — si la info ya existe en /docs, referencia con link relativo

## EXAMPLE: Como un agente lee contexto antes de trabajar

```
# Antes de implementar cualquier tarea:

1. Leer /docs/01-architecture/PROJECT_CONTEXT.md
   → Entender stack, patrones, decisiones clave

2. Leer /docs/tasks/active/ → ¿hay trabajo en progreso?
   → Si hay TASK activa relacionada, leer su estado

3. Si la tarea toca API → leer /docs/02-api/openapi.yml
4. Si la tarea toca UI  → leer /docs/03-ui-ux/DESIGN_SYSTEM.md
5. Si la tarea toca DB  → leer /docs/01-architecture/adr/ por decisiones de schema
```

## EXAMPLE: Como un agente actualiza /docs despues de trabajar

```
# Despues de implementar:

1. Si creo/modifico un endpoint:
   → Actualizar /docs/02-api/openapi.yml

2. Si tomo una decision tecnica significativa:
   → Crear ADR en /docs/01-architecture/adr/ADR-NNN-*.md
   → O agregar entrada en /docs/07-decisions/decision-log.md

3. Si cambio la infraestructura:
   → Actualizar /docs/04-devops/INFRASTRUCTURE.md

4. Siempre:
   → Actualizar /docs/tasks/active/TASK-<id>/TASK-<id>.md con progreso
```
