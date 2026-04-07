# Inicio Rápido

## Instalación

### Prerrequisitos
- Claude Code instalado y configurado
- Git

### Pasos

1. Clona el repositorio del plugin en tu directorio de plugins de Claude Code:

```bash
git clone https://github.com/EJBereguete/team-software-engineering ~/.claude/plugins/team-software-engineering
```

2. El plugin se registra automáticamente si está ubicado en la carpeta de plugins de Claude Code. Para verificar que está activo, ejecuta desde cualquier proyecto:

```
/team-software-engineering:onboard
```

3. Si es la primera vez en un proyecto existente, el comando `onboard` leerá el código, detectará el stack y generará la documentación base en `/docs`.

## Primer uso — proyecto existente

Desde el directorio raíz de tu proyecto:

```bash
/team-software-engineering:onboard
```

El Architect leerá la estructura del proyecto, detectará el stack tecnológico (lenguajes, frameworks, ORM, CI/CD) y generará `docs/01-architecture/PROJECT_CONTEXT.md` como punto de partida. Este archivo es la fuente de verdad que todos los agentes consultan.

## Primer uso — proyecto nuevo

```
@architect Quiero crear una API de facturación con FastAPI y PostgreSQL
```

El Architect detectará que el repo está vacío y activará el flujo `project-from-scratch` automáticamente. Hará 7 preguntas en un solo mensaje para entender la visión, y luego orquestará al equipo completo para: definir arquitectura, crear el design system, estructurar el repo y configurar CI/CD.

## Comandos disponibles

| Comando | Cuándo usarlo |
|---------|---------------|
| `/team-software-engineering:sprint <idea>` | Feature nueva o tarea sin ticket |
| `/team-software-engineering:build-api <descripción>` | Solo necesitas endpoints de backend |
| `/team-software-engineering:build-ui <descripción>` | Solo necesitas componentes de UI |
| `/team-software-engineering:fix <error>` | Bug rápido, sin planning ni SDD |
| `/team-software-engineering:debug <error>` | Sesión de debugging colaborativa |
| `/team-software-engineering:review <archivo>` | Code review de archivos o PRs |
| `/team-software-engineering:audit` | Auditoría completa del proyecto |
| `/team-software-engineering:deploy <servicio>` | Preparar o ejecutar deploy |
| `/team-software-engineering:onboard` | Primera vez en un proyecto existente |
| `/team-software-engineering:improve-skill <nombre> "<feedback>"` | Mejorar una skill con feedback |

## Invocar agentes directamente

```bash
@architect          # CTO — decisiones de diseño, arquitectura, ADRs
@product-owner      # Definir requisitos, ACs, ROI, visión estratégica
@project-manager    # Planificación táctica, tickets, seguimiento
@backend-engineer   # Endpoints, DB, servicios, migraciones
@frontend-engineer  # Componentes, páginas, hooks, estado
@qa-engineer        # Tests E2E, code review, screenshots de evidencia
@security-engineer  # Auditoría de seguridad, OWASP, threat modeling
@devops-engineer    # Docker, CI/CD, deploys, smoke tests
@ui-ux-designer     # Wireframes, design system, accesibilidad
```

## Ejemplo de sesión típica

```
Usuario: @architect Quiero agregar autenticación con JWT a mi API FastAPI

Architect: [Ejecuta repo-context-check]
           [Lee PROJECT_CONTEXT.md]
           [Activa new-task flow]
           [Hace preguntas de clarificación en un único mensaje]

Usuario: [Responde las preguntas]

Product Owner: [Crea requirements.md con ACs verificables]
               → "¿Apruebas requirements.md?"

Usuario: Aprobado

Architect: [Crea design.md con arquitectura, endpoints, schema DB]
           → "¿Apruebas design.md?"

Usuario: Aprobado

Project Manager: [Crea tasks.md con orden de implementación]
                 [Crea ticket en GitHub]
                 → "¿Apruebas el plan?"

Usuario: Aprobado

Backend Engineer: [Crea branch feature/jwt-auth]
                  [Implementa en capas: router → service → repository]
                  [Escribe unit tests (happy path + error + edge)]
                  [Actualiza TASK-001.md con progreso]

QA Engineer: [Ejecuta E2E tests con Playwright]
             [Guarda screenshots en /docs/tasks/active/TASK-001/evidence/]
             [Aprueba PR]

DevOps Engineer: [Merge PR, smoke tests, deploy]
```

## Flujo automático: de lenguaje natural a PR

El plugin está diseñado para que cualquier instrucción sea suficiente para activar el flujo correcto:

| Lo que escribes | Lo que pasa |
|-----------------|-------------|
| `"Agrega notificaciones por email"` | new-task → SDD → implementación |
| `"#42"` o URL de GitHub issue | task-from-ticket → implementación |
| `"Quiero crear una app de inventarios"` (repo vacío) | project-from-scratch |
| `@architect "Necesito revisar la arquitectura"` | Análisis + ADRs |
| `/team-software-engineering:fix "el login no funciona"` | fix-workflow → implementación directa |
