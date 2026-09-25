# Portal multi-proyecto

AgTeamOS genera un portal estático con el estado local de todos los proyectos
registrados. No necesita servidor, npm, React ni conexión de red.

## Abrir o regenerar

Desde Claude Code:

```text
/agteamos-dashboard --portal
```

La salida por defecto es:

```text
~/.claude/agteamos/portal.html
```

También puede ejecutarse el renderer con rutas explícitas:

```bash
node <plugin>/scripts/agteamos-dashboard.mjs --portal \
  --projects <projects.yml> \
  --out <portal.html>
```

El registro `~/.claude/agteamos/projects.yml` se mantiene durante setup. Cada
entrada válida apunta al root canónico de un proyecto.

## Qué muestra

- conteos globales de proyectos, cambios, bloqueos, review, archive, backlog
  y proyectos sobre presupuesto estimado de contexto;
- vista por proyecto con configuración pública, onboarding y diagnósticos;
- backlog local y referencias ya persistidas a tickets externos;
- cambios activos/archivados (incluido `abandoned`), riesgo, estado
  sanitizado de `tracker-result.md` y enlaces a dashboard/reportes locales;
- bytes y tokens estimados de contexto para el tier seleccionado;
- knowledge, specs, quality, deuda, DORA/SLO, incidentes y seguridad cuando
  sus artefactos existen.

Las secciones sin datos se omiten o muestran un estado vacío explícito.

## Alcance de los datos

El portal es un snapshot local identificado por `generated_at`. No consulta
Azure Boards, Planner o GitHub Issues en vivo. Un ticket aparece solo si su ID
o URL ya fue verificado y persistido en una fuente local de AgTeamOS.

Fuentes y campos públicos están definidos en
[`contracts/portal.json`](../../contracts/portal.json). La agregación comparte
el collector read-only de `agteamos-status`.

## Seguridad

- valida `realpath` de cada root registrado;
- solo lee rutas allowlisted dentro de ese root;
- escapa texto y atributos antes de renderizar;
- no usa `fetch`, CDN, `eval` ni contenido remoto;
- excluye secretos, valores de entorno, emails, payloads/responses del tracker
  y contenido crudo de `.cache`;
- nunca modifica fuentes, tareas ni trackers.

Un proyecto ausente, duplicado o mal formado produce un diagnóstico y se
omite sin detener los demás.

## Otras vistas

```text
/agteamos-dashboard --project
/agteamos-dashboard --pulse
```

`--project` regenera `agteamos/dashboard.html` y los `report.html` derivados.
`--pulse` imprime un resumen, incluido `ceil(bytes/4)` como estimación de
tokens, y no escribe nada. No es telemetría del host. Setup, captura de backlog y
cierre intentan refrescar el portal en modo best-effort; un fallo visual no
revierte una operación ya verificada.

## Artefactos y control de versiones

`portal.html`, `dashboard.html` y `report.html` son derivados regenerables.
El portal vive fuera de los repositorios; las vistas de proyecto permanecen
en `.gitignore` y no se commitean.
