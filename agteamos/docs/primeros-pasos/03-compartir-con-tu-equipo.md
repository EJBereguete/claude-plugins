# Compartir AgTeamOS con tu equipo

AgTeamOS es un plugin real de Claude Code, así que hay dos mecanismos oficiales para que otras personas lo tengan disponible — son distintos, y cuál conviene depende de si quieres cubrir a una persona o un proyecto entero.

## Opción 1 — Instalación personal (recomendada para "quiero usarlo en todos mis proyectos")

Cada persona corre estos dos comandos, una sola vez, en su propia máquina:

```bash
/plugin marketplace add EJBereguete/claude-plugins
/plugin install agteamos
```

Con el scope default (`user`), el plugin queda instalado a nivel de esa persona: disponible en **cualquier proyecto** que abra después, para siempre. No se commitea nada a ningún repositorio.

**Cuándo usar esta opción**: es la forma correcta de pasarle AgTeamOS a un compañero — que corra esos mismos dos comandos una vez. También es la que usas vos mismo si trabajas en varios proyectos personales.

## Opción 2 — Instalación forzada por proyecto

Si quieres que **cualquiera que clone un repo específico** reciba automáticamente el prompt de instalación (sin depender de que se acuerde de correr los comandos de la Opción 1), se commitea la configuración en `.claude/settings.json` de ese repo:

```json
{
  "extraKnownMarketplaces": {
    "team-plugins": {
      "source": {
        "source": "github",
        "repo": "EJBereguete/claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "agteamos@team-plugins": true
  }
}
```

Con esto commiteado, cualquiera que clone el repo y abra Claude Code recibe el prompt para instalar AgTeamOS automáticamente.

**Cuándo usar esta opción**: cubre solo ese proyecto específico — no le da a esa persona acceso a AgTeamOS en el resto de sus proyectos, a menos que además use la Opción 1. Es la opción correcta cuando el equipo entero de un repo debe tener el plugin sí o sí, sin depender de la memoria de cada quien.

## Comparación rápida

| | Opción 1 — Personal | Opción 2 — Por proyecto |
|---|---|---|
| **Alcance** | Todos los proyectos de esa persona | Solo ese repo |
| **Se commitea algo** | No | Sí, `.claude/settings.json` |
| **Depende de que la persona se acuerde** | Sí | No — se activa solo al clonar |
| **Mejor para** | Uso personal, freelance, varios proyectos | Equipos que comparten un repo fijo |

Las dos opciones no son excluyentes: puedes tener la Opción 2 en el repo del equipo Y la Opción 1 en tu máquina para tus proyectos personales.

## ¿Y la carpeta `agteamos/` del proyecto? ¿Se commitea?

Esto es un mecanismo distinto de las dos opciones de arriba — esas instalan el *plugin*; esto es sobre el *contenido* que el plugin genera dentro de tu repo. **Sí — commiteá `agteamos/` como cualquier código fuente**, la misma decisión que toma OpenSpec con su carpeta `openspec/`: la spec y el estado de las tareas son parte del proyecto que describen, no un artefacto aparte que vive solo en tu máquina. Es lo que le permite a un compañero clonar el repo y encontrar exactamente el mismo contexto (`PROJECT_CONTEXT.md`, specs maestras, tareas activas) que vos tenés.

**Excepción — 2 archivos que nunca se commitean**, porque son 100% derivables de `task.yml` + `progress.md` + `verify-report.md`, y versionarlos garantiza un conflicto de merge en cada PR en cuanto hay más de un desarrollador con una tarea propia en curso:

```
agteamos/dashboard.html
agteamos/changes/**/report.html
```

Agregá esas dos líneas a tu `.gitignore`. Ambos se regeneran on-demand con `/agteamos-dashboard` (o automáticamente al cerrar una tarea con `/agteamos-implement`) — no hace falta que existan en el repo para que el sistema funcione, cada persona los abre localmente con `file://`. Ver el árbol completo, con estos dos archivos marcados, en [Estructura de carpetas](../referencia/estructura-de-carpetas.md).
