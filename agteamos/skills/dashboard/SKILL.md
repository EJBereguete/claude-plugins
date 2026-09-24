---
name: agteamos-dashboard
description: >
  Absorbe tambien a agteamos-pulse como modo `--pulse`. Dueña unica de
  los templates HTML de AgTeamOS. Genera report.html por tarea (leyendo
  task.yml, progress.md, evidence/, specs/deltas/ y verify-report.md) y
  agteamos/dashboard.html (escaneando todas las tareas activas y archivadas).
  Ambos son archivos estaticos — sin servidor, sin librerias externas, se
  abren con file://. Muestra la persona real (owner) por separado de los
  agentes de IA que intervinieron (assigned_to). Incluye tambien un modo
  --pulse de solo lectura: pantalla de salud del proyecto (artefactos
  pending/stale de onboarding.yml, campos pending de platform.yml, tendencia
  de deuda tecnica, top follow-ups abiertos, convenciones aprendidas
  recientemente, y un "proximo paso de mayor valor" sugerido) que nunca
  escribe nada.
used_by:
  - architect
  - product-manager
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - devops-engineer
---

# Skill: Dashboard (agteamos-dashboard)

## CONTRACT

- **Input (por tarea)**: `task.yml` + `progress.md` + `specs/tasks.md` (si existe, schema `full`) + `evidence/` + `specs/deltas/*.md` + `verify-report.md` (si existe) de una carpeta en `agteamos/changes/<id>-<slug>/` (o `agteamos/changes/archive/<fecha>-<id>-<slug>/`) — una tarea `schema: lite` puede no tener carpeta `specs/` en absoluto, ver regla en "TAREAS INCOMPLETAS O `lite`" más abajo
- **Input (general)**: todos los `agteamos/changes/*/task.yml` (activas) y `agteamos/changes/archive/*/task.yml` (cerradas)
- **Input (modo `--pulse`)**: ninguno explícito — lee el estado ya existente del proyecto (`onboarding.yml`, `platform.yml`, `debt-trend.yml`, cache de findings, `standards/*/README.md`), ver sección "Modo `--pulse`" más abajo
- **Output (por tarea)**: `report.html` escrito dentro de la carpeta de esa tarea — artefacto **local, regenerable, no se commitea** (ver "ARTEFACTOS LOCALES" más abajo)
- **Output (general)**: `agteamos/dashboard.html` en la raíz de `agteamos/` — artefacto **local, regenerable, no se commitea** (ver "ARTEFACTOS LOCALES" más abajo)
- **Output (modo `--pulse`)**: un resumen en texto (no un archivo — read-only, no genera ningún artefacto nuevo)
- **Trigger**: invocada desde `agteamos-implement` (cada vez que actualiza `progress.md`/`task.yml`), desde `agteamos-implement` (al archivar, badge pasa a `done`), a demanda directa del usuario, o en modo `--pulse` a demanda ("¿cómo está el proyecto?", "dame el pulso"), programable con la skill `schedule` si el usuario quiere una corrida periódica
- **Regla de diseño**: esta skill es la **única dueña** de ambos templates. Ninguna otra skill genera o embebe su propia copia del HTML — `agteamos-implement` invocan esta skill en vez de duplicar la lógica de generación.
- **Regla de oro (modo `--pulse`)**: el modo `--pulse` **nunca escribe nada** — ni `agteamos/onboarding.yml`, ni `platform.yml`, ni ningún otro archivo. Es una lectura agregada de fuentes que ya existen. **`--pulse` reutiliza el mismo cálculo** que ya usa el dashboard general para las secciones que se solapan (`onboarding.yml`, `platform.yml`) — ninguno de los dos modos depende del otro para funcionar solo, pero comparten la lógica de lectura en vez de duplicarla.

---

## ARTEFACTOS LOCALES — `dashboard.html` y `report.html` NO se commitean

Ambos son **100% derivables** de `task.yml` + `progress.md` (+ `specs/tasks.md`,
`specs/deltas/`, `evidence/`, `verify-report.md` según el caso) — no llevan
ninguna información que no viva ya en esas fuentes. Por diseño:

- **No se agregan al PR.** `agteamos/dashboard.html` y `agteamos/changes/**/report.html`
  van al `.gitignore` del proyecto consumidor (documentado en `docs/`/`README.md`
  de ese proyecto).
- **Cada desarrollador los regenera localmente** cuando los necesita, invocando
  esta skill — no rompe nada que no estén versionados, porque son 100%
  derivables de fuentes que sí están versionadas.
- **Motivo**: un HTML monolítico generado es un conflicto de merge garantizado
  apenas hay 2+ personas trabajando en tareas distintas al mismo tiempo — el
  archivo entero cambia en cada regeneración aunque solo una tarea haya
  cambiado.
- Esto **no cambia el resto del CONTRACT**: la skill se sigue invocando en los
  mismos triggers, solo que el archivo resultante queda fuera de git.

---

## POR QUÉ EXISTE ESTA SKILL

Sin un dueño único del template, cada skill que necesita reflejar progreso
(`agteamos-implement`) terminaría generando su
propia versión del HTML, y con el tiempo las tres versiones divergirían
(estilos distintos, campos faltantes en una y no en otra). Centralizar la
plantilla acá significa: un solo lugar para corregir un bug visual, un solo
lugar para agregar un campo nuevo, y garantía de que `report.html` y
`dashboard.html` siempre se ven como parte del mismo sistema.

---

## Reportes por tarea

### Step 1 — Generar `report.html` de una tarea

**Fuentes leídas, en este orden:**
1. `task.yml` — `id`, `title`, `status`, `schema`, `owner`, `handoffs`, `assigned_to`, `branch`, `updated`
2. `progress.md` — Progress Log (histórico de sesión) y, si `schema: lite`, el resumen de 1 párrafo (ver regla de `lite` más abajo)
3. `specs/tasks.md` (solo si `schema: full` y el archivo existe) — **esta es la única fuente real del checklist de la card "Checklist"**, ver tabla de población más abajo
4. `specs/deltas/<dominio>.md` — uno o más, según `domains` en `task.yml` (solo si `schema: full`)
5. `evidence/` — listar cada archivo de imagen/reporte encontrado
6. `verify-report.md` (si ya existe, típicamente cerca del cierre) — items `FAIL`/`WARNING`/`OK` con su severidad RFC 2119

**Antes de leer nada de `specs/`**: chequear `task.yml → schema`. Si es `lite`,
saltar los puntos 3 y 4 completamente — ver "TAREAS INCOMPLETAS O `lite`" más
abajo para el tratamiento especial de esa card.

**Template exacto** (HTML+CSS inline, tema oscuro, sin librerías externas —
usar tal cual, reemplazando solo los valores entre llaves conceptuales por
los datos reales de la tarea):

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>TASK-42 — Add email notifications</title>
<style>
  :root { --bg:#0f1115; --card:#171a21; --text:#e6e6e6; --muted:#9aa0a6; --accent:#4f8cff; --ok:#3ddc84; --warn:#f5a623; }
  body { font-family: system-ui, sans-serif; background:var(--bg); color:var(--text); margin:0; padding:2rem; }
  .card { background:var(--card); border-radius:12px; padding:1.5rem; margin-bottom:1rem; }
  .badge { display:inline-block; padding:.25rem .75rem; border-radius:999px; font-size:.85rem; font-weight:600; }
  .badge.pending { background:var(--muted); color:#1a1a1a; }
  .badge.in_progress { background:var(--warn); color:#1a1a1a; }
  .badge.in_review { background:var(--accent); color:#0f1115; }
  .badge.done { background:var(--ok); color:#1a1a1a; }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:.5rem; border-bottom:1px solid #2a2e37; }
  .evidence img { max-width:320px; border-radius:8px; margin:.5rem; }
  a { color:var(--accent); }
</style>
</head>
<body>
  <h1>TASK-42 — Add email notifications</h1>
  <div class="card">
    <span class="badge in_progress">EN PROGRESO</span>
    <p><strong>Owner:</strong> Eddy Bereguete (ebereguete@phoenixcalibrationdr.com)</p>
    <p><strong>Agentes IA:</strong> @backend-engineer, @frontend-engineer, @qa-engineer</p>
    <p><strong>Branch:</strong> feature/42-email-notifications</p>
    <p><strong>Última actualización:</strong> 2026-08-05 11:30</p>
  </div>
  <div class="card">
    <h2>Checklist (specs/tasks.md) — 4/6 completado</h2>
    <table>
      <tr><td>✅</td><td>Backend implementation</td></tr>
      <tr><td>✅</td><td>Unit tests</td></tr>
      <tr><td>⏳</td><td>Frontend integration</td></tr>
      <tr><td>⏳</td><td>E2E tests + evidencia</td></tr>
    </table>
  </div>
  <div class="card evidence">
    <h2>Evidencia QA</h2>
    <img src="evidence/e2e-login-flow.png" alt="Login flow">
  </div>
  <div class="card">
    <h2>Spec deltas aplicados</h2>
    <p>Dominio: <code>notifications</code> — <a href="specs/deltas/notifications.md">ver delta</a></p>
  </div>
  <p><a href="../../dashboard.html">← Volver al dashboard</a></p>
</body>
</html>
```

**Cómo poblar los valores reales (sin inventar campos ni CSS nuevo):**

| Placeholder en el template | Valor real que reemplaza |
|---|---|
| `TASK-42 — Add email notifications` (title + h1) | `task.yml`: `id` + `title` |
| `badge in_progress` / `EN PROGRESO` | `task.yml`: `status` → mapear **directo y sin aproximaciones** a una de las 4 clases reales: `.badge.pending`, `.badge.in_progress`, `.badge.in_review`, `.badge.done` (una por cada valor posible de `status` en `task.yml`) |
| `Owner: Eddy Bereguete (...)` | `task.yml`: `owner.name` + `owner.email`. Si `handoffs` tiene entradas, agregar una línea adicional bajo el owner: `<p><strong>Handoff:</strong> Maria Gonzalez desde 2026-08-10</p>` por cada handoff, usando la misma estructura `<p><strong>...</strong> ...</p>` que ya usa el template — nunca mezclar el owner original con quien retomó la tarea en una sola línea |
| `Agentes IA: @backend-engineer, ...` | `task.yml`: `assigned_to` (lista) — esto es **siempre distinto** del owner. El owner es la persona; `assigned_to` son los roles de IA que intervinieron |
| Checklist (tabla de 4 filas) | **`specs/tasks.md`** (solo `schema: full`) — un `<tr>` por ítem del checklist: `✅` si es `- [x]`, `⏳` si es `- [ ]`. `progress.md` **no** es la fuente de esta card — alimenta únicamente el resumen de sesión que no tiene card propia en este template. Si `schema: lite`, esta card no existe: ver "TAREAS INCOMPLETAS O `lite`" |
| Evidencia QA | un `<img>` por archivo en `evidence/`; si `evidence/` está vacía, omitir la card completa en vez de dejarla con un `<img>` roto |
| Spec deltas aplicados | un `<p>` por archivo en `specs/deltas/`, uno por dominio afectado; si `specs/deltas/` no existe o está vacía, omitir la card completa (igual criterio que la card de evidencia) |
| Link "Volver al dashboard" | siempre `../../dashboard.html` — la profundidad relativa desde `agteamos/changes/<id>-<slug>/report.html`; ajustar a `../../../dashboard.html` si la tarea está en `changes/archive/<fecha>-<id>-<slug>/` |

### TAREAS INCOMPLETAS O `lite` — reglas explícitas

Estos casos no son errores del reporte, son estados válidos y esperados:

| Caso | Regla |
|---|---|
| `task.yml → schema: lite` | Omitir por completo las cards "Checklist" y "Spec deltas aplicados" (no existen `specs/tasks.md` ni `specs/deltas/` en una tarea `lite`, ver `agteamos-sdd-protocol`). En su lugar, una única card **"Resumen (lite)"** con el párrafo de `progress.md` (sección `## Resumen (schema: lite)`) y el resultado del test de regresión (`## Test de regresión` en `progress.md`, o el ítem correspondiente de `verify-report.md` si ya existe) |
| `specs/deltas/` ausente o vacía (incluso en `schema: full`) | Omitir la card "Spec deltas aplicados" — no dejarla vacía ni con un link roto |
| `specs/` inexistente (carpeta completa ausente, típico de `lite`) | Mismo tratamiento que la fila `schema: lite` de arriba — no asumir `schema: full` solo porque `task.yml` no lo aclaró; si `schema` falta en `task.yml`, tratarlo como `full` únicamente si `specs/` sí existe, si no, tratarlo como `lite` |
| `verify-report.md` ausente | Omitir la card "Verify report" — no es un error, simplemente el paso `verify` de `agteamos-implement` todavía no corrió |

**Integrar `verify-report.md`** (alimenta este mismo reporte, no es un artefacto
aparte — ver `agteamos-implement` paso "verify"): si el archivo existe, agregar
una card adicional usando el **mismo patrón visual** ya definido por el CSS
(`class="card"`, tabla `th/td`), sin inventar clases nuevas:

```html
<div class="card">
  <h2>Verify report</h2>
  <table>
    <tr><td>❌ FAIL</td><td>MUST: todos los ACs tienen test asociado — AC 3 sin cobertura</td></tr>
    <tr><td>⚠️ WARNING</td><td>SHOULD: cobertura >= 80% — actual 74%</td></tr>
    <tr><td>✅ OK</td><td>MUST: spec delta tiene al menos una tarea completada asociada</td></tr>
  </table>
</div>
```

---

## Dashboard global

### Step 2 — Generar `agteamos/dashboard.html`

**Fuentes leídas**: todos los `agteamos/changes/*/task.yml` (activas) y
`agteamos/changes/archive/*/task.yml` (cerradas) — un escaneo simple de
carpetas, sin base de datos ni índice intermedio. **La ubicación de la
carpeta (`changes/` vs `changes/archive/`) NO determina el conteo de
"activas" / "en review" / "completadas" — eso lo determina exclusivamente
el campo `status` real dentro de cada `task.yml`** (ver tabla de cómputo más
abajo). Una tarea con `status: done` que todavía vive en `changes/` porque
el archivado de `agteamos-implement` falló o está pendiente cuenta como
"completada", no como "activa" — contar por carpeta la mostraría como activa
y sería engañoso.

**Template exacto** (HTML+CSS+JS inline, filtro de búsqueda client-side,
sin servidor, se abre con doble click o `file://`):

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>AgTeamOS — Dashboard</title>
<style>
  body { font-family: system-ui, sans-serif; background:#0f1115; color:#e6e6e6; margin:0; padding:2rem; }
  .stats { display:flex; gap:1rem; margin-bottom:1.5rem; }
  .stat { background:#171a21; border-radius:12px; padding:1rem 1.5rem; text-align:center; }
  .stat .n { font-size:2rem; font-weight:700; }
  table { width:100%; border-collapse:collapse; background:#171a21; border-radius:12px; overflow:hidden; }
  th, td { text-align:left; padding:.75rem 1rem; border-bottom:1px solid #2a2e37; }
  th { background:#1e222b; }
  .badge { padding:.2rem .6rem; border-radius:999px; font-size:.8rem; font-weight:600; }
  .badge.pending { background:#9aa0a6; color:#1a1a1a; }
  .badge.in_progress { background:#f5a623; color:#1a1a1a; }
  .badge.in_review { background:#4f8cff; color:#0f1115; }
  .badge.done { background:#3ddc84; color:#1a1a1a; }
  a { color:#4f8cff; text-decoration:none; }
  input[type=search] { padding:.5rem; border-radius:8px; border:1px solid #2a2e37; background:#0f1115; color:#e6e6e6; margin-bottom:1rem; width:100%; }
</style>
</head>
<body>
  <h1>AgTeamOS — Dashboard</h1>
  <div class="stats">
    <div class="stat"><div class="n">3</div>activas</div>
    <div class="stat"><div class="n">1</div>en review</div>
    <div class="stat"><div class="n">27</div>completadas</div>
  </div>
  <input type="search" placeholder="Filtrar por owner, título o estado..." oninput="filterRows(this.value)">
  <table id="tasks">
    <thead><tr><th>ID</th><th>Título</th><th>Estado</th><th>Owner</th><th>Agentes</th><th>Actualizado</th><th></th></tr></thead>
    <tbody>
      <tr>
        <td>42</td><td>Add email notifications</td>
        <td><span class="badge in_progress">EN PROGRESO</span></td>
        <td>Eddy Bereguete</td><td>@backend, @frontend, @qa</td><td>2026-08-05</td>
        <td><a href="changes/42-email-notifications/report.html">Ver →</a></td>
      </tr>
    </tbody>
  </table>
  <script>
    function filterRows(q) {
      q = q.toLowerCase();
      document.querySelectorAll('#tasks tbody tr').forEach(function(tr) {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    }
  </script>
</body>
</html>
```

**Cómo poblar la tabla y las stats:**

Los 3 contadores escanean **ambas** carpetas (`changes/*/` y
`changes/archive/*/`) y clasifican por `status`, nunca por en cuál de las dos
carpetas vive el `task.yml`:

| Elemento | Cómo se calcula |
|---|---|
| `<div class="n">3</div>activas` | count de `task.yml` (en `changes/*/` **o** `changes/archive/*/`) con `status: pending` o `status: in_progress` |
| `<div class="n">1</div>en review` | count con `status: in_review` (en cualquiera de las dos carpetas) |
| `<div class="n">27</div>completadas` | count con `status: done` (en cualquiera de las dos carpetas — típicamente `changes/archive/*/`, pero un `done` todavía no archivado también cuenta acá) |
| Una `<tr>` por tarea | ID, título, badge de `status` (una de las 4 clases: `pending`/`in_progress`/`in_review`/`done`), `owner.name` (NUNCA `assigned_to`), lista corta de `assigned_to` (prefijo `@`, separado por comas), `updated`, link relativo a su `report.html` |
| Orden de filas | más reciente (`updated`) primero |
| Link de cada fila | `changes/<id>-<slug>/report.html` o `changes/archive/<fecha>-<id>-<slug>/report.html`, según en cuál de las dos carpetas esté físicamente el `task.yml` (esto sí depende de la carpeta — es solo la ruta del link, no el conteo) |

El `<input type="search">` ya filtra client-side por cualquier texto visible
en la fila (owner, título, estado, agentes) — no requiere lógica adicional
más allá de poblar el `<tbody>` correctamente.

### Step 3 — Actualizar el contador de standards (opcional, si `agteamos/standards/standards.yml` existe)

Si la skill `agteamos-project-docs` ya corrió al menos una vez, agregar un
`<div class="stat">` adicional en la misma fila de `.stats` (mismo patrón
visual, sin CSS nuevo) con el conteo `X/Y estándares aplicando` leyendo
`agteamos/standards/standards.yml` — opcional porque no todo proyecto habrá
corrido `agteamos-project-docs` todavía.

---

## Modo `--pulse` (solo lectura)

Pantalla de solo lectura con el pulso de salud del proyecto: artefactos
pending/stale de `onboarding.yml`, campos pending de `platform.yml`,
tendencia de deuda técnica (`debt-trend.yml`), top follow-ups abiertos,
convenciones aprendidas recientemente, y un "próximo paso de mayor valor"
sugerido. **Nunca escribe nada.** Reutiliza el mismo cálculo que ya usa el
dashboard general (Step 2 arriba) para las secciones que se solapan
(`onboarding.yml`, `platform.yml`) — este modo y el dashboard general no
dependen uno del otro para funcionar de forma independiente, pero comparten
la lógica de lectura en vez de duplicarla.

### Process — 6 fuentes, en este orden

Leer, en este orden, y componer el resumen — cada sección se omite si su
fuente no existe todavía (proyecto sin ese contrato), en vez de mostrar un
error:

#### 1 — Artefactos pendientes/obsoletos (`agteamos/onboarding.yml`)

Contar por estado: cuántos `pending`, cuántos `candidate` (dominios sin
confirmar), cuántos `stale` (ver `agteamos-project-docs` §Step 6). Listar los
`stale` explícitamente (son los que más vale la pena revisar) — el resto
solo como conteo agregado.

#### 2 — Configuración pendiente (`agteamos/platform.yml`)

Si tiene `field_status`: listar los campos en `pending`/`detected` (nunca
los `confirmed`, esos no son noticia). Si no tiene `field_status`
(proyecto pre-contrato): solo decir si `reviewed: false`.

#### 3 — Tendencia de deuda (`agteamos/quality/debt-trend.yml`)

Si existe, mostrar los top 3 hotspots de la última snapshot con su delta
contra la snapshot anterior (si hay más de una). Si no existe todavía
(proyecto sin suficiente historial git, o el hook `inject-debt-signal.js`
no corrió todavía), decirlo y seguir.

#### 4 — Top follow-ups abiertos

Leer `agteamos/.cache/findings/{review,audit,domain-review}.json` (los que
existan) y contar entradas — son los IDs `SEEN` que siguen sin resolverse.
No se puede reconstruir la severidad desde el cache (no la persiste
`findings-ledger.js`), así que reportar el conteo total por skill de origen,
no por severidad — decirlo explícitamente en vez de inventar una
distribución.

#### 5 — Convenciones aprendidas recientemente

Recorrer `agteamos/standards/*/README.md` buscando la sección
`## Aprendido en uso` y listar las filas con `Fuente` de los últimos 30 días.

#### 6 — Próximo paso de mayor valor (sugerido, no automático)

Con las 5 secciones de arriba, sugerir **una** acción concreta priorizada
por impacto/costo — ej. "el hotspot #1 sigue creciendo y tiene 3
follow-ups abiertos: buen candidato para la próxima tarea que lo toque" o
"`platform.yml.deploy_target` sigue pending y ya hay 2 features listas para
producción: vale la pena confirmarlo ahora". Es una sugerencia, nunca una
tarea que esta skill cree sola.

### Formato de salida (`--pulse`)

```markdown
## Pulso de <proyecto> — <fecha>

**Onboarding**: 3 temas de standards done, 6 pending, 2 stale (api-design,
database — no se revisan desde hace 40 commits)
**Platform**: pending → deploy_target, pr_convention
**Deuda**: src/billing/service.py sigue #1 (1040 → 1180 líneas, +140 desde el
último pulse) — 3 follow-ups abiertos ahí
**Follow-ups abiertos**: review 5, audit 2, domain-review 1
**Aprendido reciente**: 2 convenciones en los últimos 30 días
  - clean-architecture: "Result pattern en servicios" (2026-09-10)

**Próximo paso sugerido**: src/billing/service.py acumula deuda y follow-ups
— si la próxima tarea lo toca, es buen momento para el refactor acotado de
`agteamos-implement` Step 8.5.
```

---

## TRIGGERS — quién invoca esta skill y cuándo

| Quién | Cuándo | Qué regenera |
|---|---|---|
| `agteamos-implement` | cada vez que actualiza `progress.md` o `task.yml` | `report.html` de esa tarea únicamente |
| `agteamos-implement` | al archivar la tarea (después del paso "verify" y "sync") | `report.html` de esa tarea (badge → `done`) y `agteamos/dashboard.html` completo |
| Usuario / cualquier agente | a demanda ("actualizá el dashboard", "regenerá el reporte de la tarea 42") | lo que se pida explícitamente |
| Usuario / cualquier agente | a demanda, modo `--pulse` ("¿cómo está el proyecto?", "dame el pulso") | nada — solo texto en pantalla |
| `schedule` | corrida periódica opcional del modo `--pulse` | nada — solo texto en pantalla |

---

## ANTI-PATTERNS

- Duplicar el HTML del template dentro de `agteamos-implement` en vez de invocar esta skill — rompe la garantía de "un solo dueño del template" y hace que las tres copias diverjan con el tiempo.
- Mostrar `assigned_to` (agentes de IA) en el campo "Owner" — son conceptos distintos; mezclarlos oculta quién es la persona real responsable de la tarea.
- Usar `.badge.in_progress` como aproximación para `pending` o `in_review` — las 4 clases (`pending`/`in_progress`/`in_review`/`done`) ya existen, no hay motivo para aproximar.
- Dejar `<img>` rotos en la card de evidencia cuando `evidence/` está vacía — omitir la card completa en ese caso. Mismo criterio para la card de "Spec deltas aplicados" cuando `specs/deltas/` está vacía o ausente.
- Regenerar `dashboard.html` escaneando solo `agteamos/changes/*/` y olvidando `agteamos/changes/archive/*/` — el conteo de "completadas" quedaría siempre en 0.
- Contar "activas"/"completadas" por en qué carpeta vive el `task.yml` en vez de por su `status` — una tarea `done` que todavía no se archivó (ej. porque el sync o el archivado de `agteamos-implement` falló) se contaría como activa, lo cual es engañoso.
- Asumir `schema: full` para una tarea que no declara `schema` en `task.yml` sin verificar si `specs/` existe — tratarla como `lite` si `specs/` está ausente, como `full` si existe.
- Usar rutas absolutas de archivo (`C:\Users\...`) en los `href` en vez de rutas relativas — rompe el `file://` portable si la carpeta se mueve o se comparte con otra persona.
- Commitear `dashboard.html` o `report.html` al repositorio, o preocuparse por que no estén versionados — son artefactos locales regenerables por diseño, ver "ARTEFACTOS LOCALES" al inicio de esta skill.
- (Modo `--pulse`) Escribir o modificar cualquier archivo — este modo es 100% read-only.
- (Modo `--pulse`) Inventar una distribución de severidad para los follow-ups cuando el cache no la tiene — decir "conteo total, sin severidad" en vez de adivinar.
- (Modo `--pulse`) Convertir el "próximo paso sugerido" en una tarea creada automáticamente — es una sugerencia en texto, el usuario decide si la convierte en `agteamos-new-task`/`agteamos-capture`.
- (Modo `--pulse`) Bloquear o fallar por completo porque una de las 6 fuentes no existe — cada sección se omite independientemente.
</content>
