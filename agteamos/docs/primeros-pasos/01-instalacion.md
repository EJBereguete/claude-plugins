# Instalación

## Prerrequisitos

- Claude Code instalado y configurado
- Git
- Node.js en el `PATH` — los 7 hooks de seguridad de AgTeamOS son scripts `.js` (exec form, sin shell), y ya es una dependencia implícita hoy vía `npx` en los MCP servers del plugin

## Instalación como plugin de Claude Code

AgTeamOS se distribuye como plugin a través de un marketplace de Claude Code. Desde cualquier proyecto:

```bash
/plugin marketplace add EJBereguete/claude-plugins
/plugin install agteamos
```

Esto instala el plugin a nivel de usuario (scope `user`, el default): queda disponible en **cualquier proyecto** que abras después, para siempre — no hace falta repetir la instalación por cada repo.

Para verificar que quedó activo:

```
@architect
```

o directamente:

```
/agteamos-setup
```

Si el plugin está instalado correctamente, Claude Code resuelve `@architect` como el agente CTO de AgTeamOS y cualquier skill responde tanto a la forma corta (`/agteamos-setup`) como a la forma completa con namespace (`/agteamos:agteamos-setup`).

## Qué pasa la primera vez que se usa en un proyecto

AgTeamOS no toca nada de tu proyecto hasta que le pides algo. La primera instrucción real que le des dispara `agteamos-repo-context-check` (Step 0, siempre corre primero), que decide entre dos caminos:

| Estado del repo | Qué pasa |
|---|---|
| Repo vacío o solo `README`/`.gitignore` | Se activa el flujo de proyecto nuevo — ver [Primer proyecto](./02-primer-proyecto.md) |
| Repo con código ya existente | Se activa `agteamos-onboard` para documentar lo que ya existe — ver [Adoptar un proyecto existente](./04-adoptar-proyecto-existente.md) |

En ambos casos, el resultado vive en una única carpeta visible `agteamos/` en la raíz de tu repo — nunca mezclado con tu propia carpeta `docs/` si ya tenías una para otra cosa.

## Siguiente paso

- ¿Repo nuevo, vacío? → [02 — Tu primer proyecto](./02-primer-proyecto.md)
- ¿Quieres que tu equipo también lo use? → [03 — Compartir con tu equipo](./03-compartir-con-tu-equipo.md)
- ¿Repo con código ya existente? → [04 — Adoptar un proyecto existente](./04-adoptar-proyecto-existente.md)
