# Repository Context Gate

Este gate es obligatorio antes de redactar cualquier work item externo.
Su objetivo es que títulos, alcance, criterios y dependencias describan el
proyecto real, no una plantilla genérica.

## Snapshot

Registrar al iniciar:

```yaml
repositories:
  - role: primary | dependency | mirror
    root: <ruta canónica>
    remote: <URL sanitizada o null>
    branch: <rama o null>
    commit: <git rev-parse HEAD o null>
    dirty: <true|false>
    freshness: verified | stale | unverified | not_applicable
    remote_commit: <ls-remote de la rama o null>
    captured_at: <ISO-8601 con zona>
```

Si no es un repositorio Git, usar `commit: null`, registrar esa limitación y
continuar con evidencia del filesystem.

El repo primario es obligatorio. Añadir repos secundarios solo cuando el
pedido, manifests, código o una decisión real los cite; no escanear carpetas
vecinas para inventar alcance multi-repo.

### Freshness de repos externos/mirrors

Para un repo secundario o mirror:

1. canonizar root/remote y capturar branch/HEAD/dirty;
2. si existe upstream verificable, comparar HEAD con el hash remoto mediante
   una lectura que no cambie refs locales;
3. coincidencia → `verified`; diferencia → `stale`; fallo de red/auth o branch
   sin upstream → `unverified`;
4. mostrar hash/fecha local y limitación.

`stale`/`unverified` puede aportar contexto histórico, pero no sustenta
`Observed` sobre el estado vigente. Pedir si se continúa con esa limitación o
si la persona quiere refrescarlo y volver a inspeccionar.

`inspect-repo` no ejecuta `reset --hard`, checkout, pull ni fetch destructivo.
Nunca descarta cambios locales para “actualizar” un mirror.

## Orden de lectura

1. `agteamos/platform.yml` y `agteamos/onboarding.yml`.
2. `agteamos/architecture/PROJECT_CONTEXT.md` y `ARCHITECTURE.md`.
3. `agteamos/product/mission.md`, `roadmap.md`, `kpis.md` y `backlog.md`.
4. `agteamos/specs/index.yml` y las specs de los dominios relacionados.
5. `agteamos/changes/` activos y los archivados relevantes.
6. ADRs, decision log y out-of-scope relacionados.
7. Manifests del stack, estructura del código y archivos de configuración.
8. Código, APIs, componentes y tests relacionados.
9. Historial Git enfocado en esos archivos cuando ayude a explicar estado o
   regresiones.

No cargar todo el repositorio por defecto. Empezar con índices/manifests y
ampliar por palabras de dominio, símbolos, rutas y dependencias encontradas.

## Evidencia por tipo

### Epic

- Misión, roadmap, KPI y outcomes ya documentados.
- Capacidades existentes y límites arquitectónicos.
- Iniciativas activas que podrían solaparse.
- Stakeholders/owners solo si están documentados o el usuario los dio.

El código puede confirmar capacidades actuales, pero no inventa estrategia,
sponsor, meta ni fecha objetivo.

### Feature

- Epic/outcome al que contribuye.
- Módulos, servicios, integraciones y contratos actuales.
- Requisitos no funcionales ya establecidos.
- Specs, ADRs y decisiones out-of-scope aplicables.
- Features o cambios activos que se solapen.

### User Story

- Persona y flujo existentes cuando estén documentados.
- Comportamiento actual confirmado en UI/API/tests.
- Reglas de negocio, permisos y datos reales.
- Puntos de extensión y casos límite observados.

### Task

- Parent Story/Bug.
- Archivos, símbolos o componentes concretos.
- Tests y comandos canónicos del proyecto.
- Dependencias técnicas verificables.
- Entregable observable, no una actividad vaga.

### Bug

- Comportamiento actual y esperado sustentados por reporte, test, log o
  reproducción.
- Versión/entorno solo si existen datos.
- Archivos/componentes probables marcados como hipótesis, no hechos.
- Duplicados y regresiones relacionadas.

### Issue

- Work items y objetivos afectados.
- Evidencia del bloqueo, riesgo, dependencia o decisión.
- Owner y deadline solo si fueron definidos explícitamente.

## Formato de hallazgos

```markdown
## Context Evidence
- Snapshot: `<role/repo>`; commit `<commit>`; branch `<branch>`; dirty
  `<yes/no>`; freshness `<estado>`; remote commit `<sha/null>`
- Observed: `<hecho>` — `<archivo, símbolo, test o work item>`
- Observed: `<hecho>` — `<fuente>`
- Proposed: `<recomendación y razón>`
- Pending decision: `<dato no comprobable>`
```

La sección es parte del draft y de la auditoría del change set. En el ticket
externo solo incluir evidencia útil para ejecutar o validar el trabajo; no
copiar rutas internas irrelevantes ni secretos.

## Duplicados y conflictos

Antes del draft:

1. Buscar por objetivo semántico, no solo por palabras exactas, en:
   - `agteamos/changes/`
   - `agteamos/product/roadmap.md`
   - `agteamos/product/backlog.md`
   - tracker configurado
2. Comparar alcance, ACs, parent y estado.
3. Si hay coincidencia razonable:
   - No crear automáticamente.
   - Mostrar el item existente y las diferencias.
   - Proponer actualizar, vincular, marcar duplicate o abandonar el nuevo
     item.
   - Cualquier opción mutante requiere aprobación.

## Datos sensibles

- No copiar secrets, tokens, PII, payloads completos ni logs sensibles al
  ticket.
- Resumir evidencia y enlazar al sistema autorizado cuando corresponda.
- Si un path o output contiene datos sensibles, citar solo su existencia y
  el hallazgo necesario.

## Revalidación antes de aplicar

Comparar el snapshot aprobado con el estado actual:

- Cambios solo no relacionados: registrar y continuar.
- Cambios en specs, código, configuración, tests o work items usados como
  evidencia: invalidar el draft.
- Cambió HEAD/branch/freshness de cualquier repo usado como evidencia:
  invalidar el draft.
- Un repo secundario pasó a `stale`/`unverified`: no promover sus inferencias a
  `Observed`; regenerar o aceptar explícitamente la limitación en un draft
  nuevo.
- Target o parent cambió de estado/relación: invalidar el draft.
- Apareció un posible duplicado: invalidar el draft.

Cuando se invalida, generar un nuevo change set y pedir nueva aprobación.

## Repos vacíos

Si no hay código:

- Declarar `implementation_evidence: unavailable`.
- Usar solo artefactos de bootstrap ya aprobados: misión, SRS, roadmap,
  arquitectura y decisiones.
- No incluir rutas de archivos futuros como si ya existieran.
- Las Tasks pueden describir entregables previstos, marcados como
  `proposed`, nunca como componentes existentes.
