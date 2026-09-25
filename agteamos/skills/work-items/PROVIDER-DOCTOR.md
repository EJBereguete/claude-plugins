# Provider Doctor

`doctor` es el preflight de solo lectura del proveedor. Se ejecuta:

- A demanda, en cualquier momento.
- Obligatoriamente antes del primer `apply` de cada combinación
  proveedor/sesión.
- De nuevo cuando su snapshot quede `stale`.

No reemplaza `inspect-tracker`: doctor prueba disponibilidad y capacidades;
`inspect-tracker` obtiene los datos concretos necesarios para redactar el
change set.

## Invariantes

- Solo hace lecturas. No crea, modifica, comenta, vincula, mueve ni elimina
  recursos.
- No guarda queries ni snapshots de capacidad, no modifica capacidad y no
  persiste configuración ni resultados fuera de la sesión.
- No pide aprobación: ninguna llamada de doctor es una mutación.
- Mantiene su resultado únicamente como evidencia de la sesión actual.
- No prueba permisos de escritura mediante escrituras. Usa discovery,
  identidad, scopes/permisos declarados y endpoints de lectura.
- Registra el transporte y endpoint lógico de cada check; nunca incluye
  tokens, secretos ni payloads sensibles en la evidencia.

## Resultado

Cada check devuelve `green`, `warning` o `red`, con evidencia y remediation.
El resultado agregado usa exactamente uno de estos estados:

- `configured`: todos los checks comunes y todas las capacidades que requiere
  el change set están `green`. Una capacidad confirmada como `unsupported`
  no degrada por sí sola si la ruta alternativa declarada también está
  `green`.
- `degraded`: la identidad y la lectura base funcionan, pero una capacidad
  permanece bloqueada/desconocida o un fallback reduce la cobertura de
  evidencia. Un `apply` solo puede usar capacidades marcadas `green`.
- `unavailable`: falló configuración, autenticación, lectura base o una
  precondición obligatoria. Bloquea cualquier `apply` de ese proveedor.

Que una capacidad no exista puede ser evidencia válida y `green` para una
degradación conocida. Por ejemplo, `sub_issues: unsupported` es usable si el
change set aprobado emplea links recíprocos; nunca se transforma en
`supported` por suposición.

Formato mínimo:

```yaml
provider_doctor:
  provider: github | azure_devops | planner | custom
  session: <identificador no secreto de la conexión actual>
  status: configured | degraded | unavailable
  captured_at: <ISO-8601 con zona>
  stale: false
  snapshots:
    platform: <hash o mtime verificable>
    repository: <commit/dirty o filesystem snapshot>
    provider: <clock/revision/correlation disponible o null>
  transports:
    primary: <MCP/API/CLI>
    fallbacks_used: []
  identifiers:
    organization: <id/nombre verificado o n/a>
    project: <id verificado o n/a>
    repository: <owner/id verificado o n/a>
    team: <id verificado o n/a>
    plan: <id verificado o n/a>
  checks:
    - name: <check>
      outcome: green | warning | red
      capability: <capacidad>
      evidence: <respuesta resumida y fuente>
      remediation: <acción o null>
  green_capabilities: []
  blocked_capabilities: []
```

Un valor `unknown`, una respuesta omitida o la ausencia de evidencia nunca
equivale a `green`.

## Checks comunes

Ejecutar siempre:

1. Leer y parsear `agteamos/platform.yml`; confirmar el `tracker`
   seleccionado sin inferirlo del remote.
2. Resolver y verificar los IDs/nombres aplicables: organización, proyecto,
   repositorio, equipo o plan. Un nombre ambiguo no cuenta como ID resuelto.
3. Descubrir las tools/endpoints y capacidades reales disponibles en la
   sesión. Registrar capacidades soportadas, no soportadas y desconocidas.
4. Validar autenticación mediante una operación de identidad o lectura
   inocua y registrar scopes/permisos visibles.
5. Capturar reloj con zona, snapshot de `platform.yml`, snapshot del repo y
   reloj/revisión/correlation del proveedor cuando exista.
6. Declarar qué capacidades necesita el change set y comprobar que cada una
   aparece en `green_capabilities`.

Si doctor se ejecuta a demanda sin change set, diagnosticar la lectura base y
las capacidades solicitadas. Una operación posterior cuya capacidad no fue
comprobada exige ampliar o reejecutar doctor antes de `apply`.

## GitHub

Además de los checks comunes:

- Resolver owner y repository, obtener el repositorio y confirmar permiso de
  lectura.
- Confirmar que Issues está habilitado y que los endpoints/tools de lectura
  de issues funcionan.
- Enumerar o consultar de forma explícita labels y milestones.
- Descubrir Projects y sus campos/iteraciones solo si están disponibles;
  distinguir Projects del repositorio de Projects de organización.
- Descubrir soporte real para sub-issues e issue types.
- Registrar por separado `supported`, `unsupported` o `unknown` para labels,
  milestones, Projects, sub-issues e issue types.

No asumir una label, milestone, Project, issue type ni relación porque exista
en otro repositorio. Una ausencia confirmada se resuelve con la degradación
mostrada en el draft o bloquea la capacidad, según la operación propuesta.

## Azure Boards

Preferir el MCP oficial de Azure DevOps. Para cada hueco de lectura usar REST
o `az` y registrar `fallbacks_used`, endpoint y motivo. No ocultar el
fallback bajo una evidencia atribuida al MCP.

Comprobar:

- Organización y autenticación de lectura.
- Proyecto e ID; equipo e ID.
- Proceso efectivo.
- WITs disponibles y detalle de los WITs que usaría el change set.
- Campos estándar y custom, campos requeridos, tipos/valores permitidos y
  reglas visibles.
- Estados permitidos y estado inicial por WIT.
- Árbol/rutas de áreas y team default area.
- Árbol/rutas de iteraciones, backlog iteration e iteración actual.
- Identidades/usuarios resolubles y asignables por lectura.
- `bugsBehavior` del equipo.
- Permisos de lectura para Core, Work y Work Items requeridos.
- Transporte estructurado para payloads/read-back con rich text o no-ASCII;
  registrar si MCP/REST conserva valores sin pasar por argumentos shell.
- Layout efectivo del WIT cuando el draft depende de una etiqueta/control
  visible cuyo backing field no está demostrado.
- Endpoint/límite/scopes declarados para attachments y capacidad de releer
  relations expandidas cuando el draft adjunta evidencia.

Si MCP, REST y `az` no pueden demostrar un dato, marcar la capacidad
correspondiente `warning` o `red`; no completar el dato durante `apply`. Un
equipo ambiguo, WIT desconocido, campo requerido desconocido o permiso de
lectura ausente impide poner en verde la operación que depende de ello.

Doctor sigue siendo read-only: no sube un archivo ni escribe texto de prueba.
`unicode_roundtrip`, `wit_layout`, `attachment_upload` y
`attachment_relation_readback` quedan verdes solo cuando existen una ruta
estructurada y permisos/capacidades observables suficientes. La igualdad real
de campos y relations se demuestra después de cada escritura. Una ruta CLI que
renderiza o recibe business text mediante argumentos no pone
`unicode_roundtrip` en verde.

## Microsoft Planner

Planner usa Microsoft Graph. Aunque exista otra integración Graph, doctor
debe comprobar `az` y su sesión porque es el fallback operativo declarado.
Comprobar antes de `apply`:

- Disponibilidad de `az`.
- Sesión iniciada e identidad/tenant esperados.
- Permisos/scopes Graph visibles y suficientes para las capacidades
  requeridas.
- `plan_id` configurado y lectura del plan.
- Lectura del bucket objetivo y pertenencia al plan.
- `GET` de task y `GET` de task details para targets existentes.
- Presencia y captura de `@odata.etag`, y semántica declarada de `If-Match`
  para cada `PATCH` propuesto.

Si no existe un target al que aplicar los GET, declararlo `not_applicable`
con evidencia. Eso no pone en verde una futura operación de update/details;
una creación puede usar únicamente las capacidades de creación demostradas
por discovery y permisos declarados.

Cualquier `401` o `403` en un check de Planner produce
`status: unavailable`, aunque otras lecturas funcionen. La remediation debe
indicar, sin ejecutar cambios: identidad/tenant esperado, permiso Graph que
falta o requiere consentimiento, y el comando/flujo de login que debe
realizar una persona. No repetir ese descubrimiento dentro de `apply`.

## Freshness y bloqueo de apply

El resultado queda `stale` si ocurre cualquiera de estos eventos:

- Cambia `platform.yml`, el proveedor seleccionado o un ID comprobado.
- Cambia la sesión, identidad, tenant, organización, scopes o transporte.
- Cambia el snapshot de repo usado por el change set.
- Una precondición, target o evidencia de capacidad devuelve una revisión,
  ETag o estado distinto al diagnosticado.
- Se supera una vigencia explícita informada por el proveedor/adaptador.
- No se puede comparar el reloj/snapshot actual con el capturado.

No inventar un TTL universal. Si el adaptador declara vigencia, registrarla;
si no, el diagnóstico vale para la sesión actual hasta un evento de
invalidación.

Antes de escribir, `apply` debe:

1. Comprobar que existe doctor del mismo proveedor/sesión y `stale: false`.
2. Mapear cada operación a sus capacidades requeridas.
3. Exigir que todas aparezcan en `green_capabilities`.
4. Releer targets y precondiciones según el flujo normal.

Si falta doctor, está `stale`, el estado es `unavailable` o una capacidad
usada no está en verde, `apply` se detiene antes de la primera mutación y
devuelve los checks fallidos y remediation. No consume la aprobación ni
altera el fingerprint: se reejecuta doctor y, si el change set no cambió,
la aprobación sigue su regla normal de vigencia.

`draft` puede existir con doctor `degraded`, `unavailable` o todavía no
ejecutado, pero debe mostrar warnings, capacidades bloqueadas y el gate que
impedirá `apply`. `inspect-repo`, `inspect-tracker` y `reconcile` conservan
su semántica; cualquier corrección mutante propuesta por `reconcile` sigue
requiriendo change set y aprobación.
