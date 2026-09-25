# Change Sets, Approval and Verification

## Identidad inmutable

Serializar el draft en orden estable y calcular/mostrar un fingerprint
reproducible. El mecanismo puede ser SHA-256 cuando haya shell disponible;
si no, usar un ID de draft y comparar estructuralmente todos los campos.

El fingerprint incluye:

- Proveedor, organización/proyecto/equipo.
- Snapshots de cada repo relevante: role/root sanitizado, branch, commit,
  dirty, freshness y remote commit cuando se pudo comprobar.
- Operaciones y orden.
- Tipo, target, campos y valores.
- Relaciones, comentarios y links.
- Capacidades de provider requeridas y degradaciones semánticas elegidas.
- Transporte efectivo, reference names/layout evidence y reglas de
  normalización usadas para read-back.
- Para attachments: path relativo, SHA-256, tamaño, MIME, filename, comment y
  targets.
- Precondiciones.

No incluye texto decorativo, timestamps de presentación ni `captured_at` de
doctor. Reejecutar un doctor `stale` con el mismo proveedor/sesión,
capacidades verdes y degradaciones no cambia por sí solo el fingerprint. Si
cambia una capacidad usada, el target, la semántica degradada o cualquier
operación, se genera un draft nuevo y se solicita aprobación otra vez.

## Gate determinista

Además del preview humano, materializar el change set estructurado como JSON
en `agteamos/.cache/work-items/<draft-id>.json`. Debe contener como mínimo
`provider` y `operations`; el orden del array es el orden de ejecución.

Calcular el fingerprint con:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-change-set.mjs" fingerprint \
  --file "<draft.json>"
```

Solo después de una aprobación explícita, crear el receipt local:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-change-set.mjs" approve \
  --file "<draft.json>" \
  --out "<fingerprint>.approval.json" \
  --actor "<identidad que aprobó>"
```

Inmediatamente antes de la primera mutación y de cada retry:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-change-set.mjs" verify \
  --file "<draft.json>" \
  --receipt "<fingerprint>.approval.json"
```

Exit no cero bloquea `apply`. Este gate demuestra que el payload no cambió;
no reemplaza doctor, permisos, aprobación humana o read-back.

## Preview de creación

```markdown
# Work Item Change Set — Draft
Provider: {{provider}}
Project: {{project}}
Team: {{team | Not applicable}}
Provider doctor: {{status}} — snapshot {{doctor snapshot}}
Required capabilities: {{capabilities}}
Context snapshots: {{repo@commit/freshness | filesystem snapshots}}
Fingerprint: {{fingerprint}}
Mutations: {{count}}

## Context Evidence
- Observed: {{fact}} — {{source}}
- Proposed: {{recommendation}}
- Pending decision: {{missing decision}}

## Proposed hierarchy
- WI-TEMP-001 {{type}} — {{title}}
  - WI-TEMP-002 {{type}} — {{title}}

## Operations
1. Create WI-TEMP-001 as {{real type}} with {{exact fields}}
2. Create WI-TEMP-002 as {{real type}} with {{exact fields}}
3. Link WI-TEMP-002 → parent WI-TEMP-001

## Pending fields
- WI-TEMP-002: {{field}} requires a human decision.

## Preconditions and warnings
- Doctor blocked capabilities: {{blocked capabilities | none}}
- {{precondition, permission, conflict or degradation}}

## Requested approval
¿Apruebas ejecutar exactamente estas {{count}} operaciones?
```

## Preview de edición

```markdown
# Work Item Change Set — Draft
Work item: {{provider id}} — {{title}}
Reason: {{reason}}
Context snapshot: {{snapshot}}
Fingerprint: {{fingerprint}}

## Proposed changes
- {{field}}: {{before}} → {{after}}

## Effects
- {{effect on sprint, capacity, dependencies or reports}}

¿Apruebas aplicar exactamente estos cambios?
```

## Reglas de aprobación

- Aceptar confirmaciones inequívocas: “sí”, “apruebo”, “ejecuta ese change
  set”, siempre que no haya intervenido una modificación desde el preview.
- Una aprobación puede cubrir N operaciones del mismo fingerprint.
- Una aprobación parcial genera un change set nuevo con solo las operaciones
  aceptadas.
- Nunca interpretar “se ve bien” durante la discusión como aprobación para
  escribir.
- Expirada o cambiada una precondición relevante, pedir aprobación otra vez.

## Ejecución segura

Antes de abrir el journal mutante, aplicar el gate de
[PROVIDER-DOCTOR.md](PROVIDER-DOCTOR.md). Un resultado ausente, `stale`,
`unavailable` o sin todas las capacidades usadas en verde detiene `apply`
sin consumir operaciones. La ejecución no intenta completar discovery ni
auth.

También ejecutar el gate determinista anterior. Ningún adapter debe ejecutar
un objeto construido nuevamente desde prosa: usa exactamente el JSON cuyo
fingerprint está aprobado.

Si un adapter materializa payloads de transporte bajo `.cache`, debe
reparsearlos y comprobar que sus valores/attachments corresponden a la
operación aprobada inmediatamente antes de enviar. Shell interpolation o
generación libre desde el preview Markdown invalida el gate.

Mantener un journal:

```yaml
change_set: <fingerprint>
operations:
  - key: WI-TEMP-001
    kind: create | update | link | attach | comment
    status: pending | applied | verified | failed | skipped
    payload_sha256: null
    provider_id: null
    provider_url: null
    readback: null
    error: null
```

Tras cada mutación:

1. Capturar ID/URL/revisión devuelta.
2. Releer el recurso.
3. Comparar valores por tipo y registrar el resultado; una normalización no
   puede ocultar diferencias Unicode visibles.
4. Marcar `verified` antes de ejecutar una operación dependiente.

Uploads y relations de attachments tienen entradas separadas. Un upload sin
relation verificada no convierte el target en `verified`.

## Fallo parcial

Al primer fallo:

- Detener operaciones todavía no iniciadas.
- No borrar recursos ya creados.
- No intentar “compensar” sin aprobación.
- Mostrar journal, error y estado real leído nuevamente.
- Proponer un change set nuevo para retry, reparación o rollback.

## Resultado final

```markdown
# Work Item Change Set — Result
Fingerprint: {{fingerprint}}
Status: verified | partial | failed

- {{provider id}} — {{url}} — verified
- {{provider id}} — {{url}} — failed: {{reason}}

Unexecuted:
- {{operation}}
```

## Evidencia durable asociada a una tarea

Cuando el caller aporta un `change_path` verificado bajo
`agteamos/changes/<id-o-tmp>-<slug>/`, mantener
`tracker-result.md` después de cada operación aplicada/verificada. No se crea
para lecturas ni para operaciones standalone sin una tarea local.

El archivo es sanitizado y commiteable; no copia payloads/responses crudos,
tokens, headers, emails ni bodies completos. Formato:

```markdown
# Tracker Result

## Change set
- Provider: <provider>
- Fingerprint: <sha256>
- Status: pending | partial | verified | failed
- Context snapshots: <repo@sha/freshness, sin paths sensibles>
- Doctor: <status/snapshot/transport>
- Approval: <actor display seguro, timestamp>

## Operations
| Key | Kind | Target | Status | Provider ID/URL | Read-back |
|---|---|---|---|---|---|
| <key> | create/update/link/attach/comment | <target> | verified | <id/url> | <campos/relations comparados> |

## Attachments
| File | SHA-256 | Size | Targets | Relation read-back |
|---|---|---:|---|---|
| <safe filename> | <hash> | <bytes> | <ids> | PASS/FAIL |

## Failures and unexecuted
- <error sanitizado u operaciones pendientes>
```

Reglas:

1. escribir `pending` al iniciar apply y checkpoint después de cada operación;
2. el fingerprint debe coincidir con el receipt verificado;
3. IDs/URLs proceden de respuesta + read-back, nunca del draft;
4. registrar nombres de campos comparados y PASS/FAIL, no duplicar contenido
   sensible;
5. un fallo parcial queda durable antes de detener el lote;
6. al renombrar `tmp-*` por el ID real, mover el archivo con la carpeta;
7. el archive conserva este receipt como historia de sincronización externa.
