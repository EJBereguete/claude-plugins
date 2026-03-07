# 🤖 team-software-engineering Plugin

Plugin de Claude Code con 5 agentes especializados que simulan un equipo
completo de ingeniería de software.

## Agentes

| Agente | Invocación | Especialidad |
|--------|-----------|--------------|
| **Architect** | `@architect` | Diseño de sistemas, ADRs, decisiones técnicas |
| **Backend Engineer** | `@backend-engineer` | FastAPI, PostgreSQL, migraciones SQL |
| **Frontend Engineer** | `@frontend-engineer` | React, TypeScript, Tailwind, Supabase Realtime |
| **QA Engineer** | `@qa-engineer` | Code review, tests, seguridad |
| **DevOps Engineer** | `@devops-engineer` | Docker, Cloud Run, GitHub Actions |

## Comandos

```bash
/team-software-engineering:design    [feature]   # Diseño de arquitectura
/team-software-engineering:build-api [tarea]     # Construir API/endpoints
/team-software-engineering:build-ui  [tarea]     # Construir componentes React
/team-software-engineering:review    [archivo]   # Code review
/team-software-engineering:deploy    [servicio]  # Preparar deployment
/team-software-engineering:sprint    [feature]   # Feature completa end-to-end
/team-software-engineering:debug     [error]     # Debugging colaborativo
/team-software-engineering:audit                 # Auditoría completa del proyecto
```

## Skills (auto-activadas)

Las skills se activan automáticamente cuando el contexto coincide:

- **code-architecture** → detecta: arquitectura, diseño, patrones, SOLID
- **api-design** → detecta: endpoint, router, schema, migración, PostgreSQL
- **frontend-patterns** → detecta: React, componente, hook, Tailwind, UI
- **testing-strategy** → detecta: test, pytest, vitest, coverage, mock
- **devops-workflows** → detecta: deploy, Docker, Cloud Run, CI/CD

## Instalación

### Opción 1: Para probar localmente (desarrollo)
```bash
claude --plugin-dir /ruta/al/plugin
```

### Opción 2: Instalación permanente en Claude Code
```bash
/plugin install /ruta/local/team-software-engineering
```

### Opción 3: Desde un repositorio Git
```bash
/plugin install https://github.com/tu-org/team-software-engineering
```

## Uso típico

```bash
# Diseñar una nueva feature
/team-software-engineering:design Sistema de notificaciones en tiempo real

# Implementar el backend de esa feature
/team-software-engineering:build-api Endpoint POST /notifications con WebSocket broadcast

# Revisar lo que se implementó
/team-software-engineering:review src/api/routes/notifications.py

# Hacer todo el ciclo completo de una feature
/team-software-engineering:sprint Módulo de facturación con PDF generation

# Hacer una auditoría del proyecto
/team-software-engineering:audit
```

## Estructura del plugin

```
team-software-engineering/
├── .claude-plugin/
│   └── plugin.json              # Manifiesto del plugin
├── agents/
│   ├── architect.md             # Agente de arquitectura
│   ├── backend-engineer.md      # Agente backend
│   ├── frontend-engineer.md     # Agente frontend
│   ├── qa-engineer.md           # Agente QA
│   └── devops-engineer.md       # Agente DevOps
├── commands/
│   ├── design.md                # /design
│   ├── build-api.md             # /build-api
│   ├── build-ui.md              # /build-ui
│   ├── review.md                # /review
│   ├── deploy.md                # /deploy
│   ├── sprint.md                # /sprint
│   ├── debug.md                 # /debug
│   └── audit.md                 # /audit
├── skills/
│   ├── code-architecture/SKILL.md
│   ├── api-design/SKILL.md
│   ├── frontend-patterns/SKILL.md
│   ├── testing-strategy/SKILL.md
│   └── devops-workflows/SKILL.md
├── hooks/
│   └── hooks.json               # Protección contra operaciones destructivas
└── README.md
```

## Customización

Para adaptar el plugin a tu proyecto específico, edita los archivos `.md` de
los agentes y actualiza la sección "Stack de referencia" con tu tecnología real.
