# Módulo `--human-docs`

Leer este módulo únicamente para:

```text
agteamos-knowledge --human-docs [--scope changed|all] [--outputs <lista>]
```

`changed` es el scope default. Este modo materializa documentación humana
derivada; no cambia la fuente de verdad, que continúa dentro de `agteamos/`.

## Contrato MVP

Los únicos outputs permitidos son:

1. `README.md`
2. `CHANGELOG.md`
3. `docs/architecture.md`
4. `docs/operations.md`

Usar exclusivamente los templates de `../templates/`. No crear una suite de
ocho documentos ni duplicar ADRs, specs, threat models, runbooks o PRRs.

## Fuentes por output

| Output | Fuentes canónicas permitidas |
|---|---|
| `README.md` | `agteamos/product/`, `agteamos/architecture/PROJECT_CONTEXT.md`, `agteamos/platform.yml` |
| `CHANGELOG.md` | `agteamos/changes/archive/`, con `task.yml`, `verify-report.md` y deltas archivados |
| `docs/architecture.md` | `agteamos/architecture/`, `agteamos/specs/`, threat models que cambien límites o flujos |
| `docs/operations.md` | `agteamos/platform.yml`, `agteamos/devops/`, `agteamos/incidents/runbooks/`, post-mortems con cambio operacional |

No leer código para rellenar huecos ni usar conversación como evidencia. Si la
fuente canónica no existe, está `pending` o no respalda una afirmación, omitir
la afirmación y reportar el límite. Actualizar primero `agteamos/` corresponde
a la skill dueña de ese dominio, no a este modo.

## Scope

- `--scope changed`: evaluar solo outputs cuyas fuentes canónicas cambiaron
  desde su `Last verified` o que el consumidor acaba de declarar afectadas.
  Si no hay una base verificable, tratar el output existente como candidato y
  mostrarlo en el reporte, sin asumir que cambió.
- `--scope all`: reevaluar los cuatro outputs, sin forzar cambios cuando sus
  fuentes no aportan datos nuevos.

Scope afecta selección, no honestidad ni ownership.

`--outputs` acota el conjunto antes de aplicar scope. Acepta una lista de:
`readme`, `changelog`, `architecture`, `operations`. Sin el flag se consideran
los cuatro outputs. Ejemplo de bootstrap:

```text
agteamos-knowledge --human-docs --scope changed --outputs readme
```

## Marcadores y ownership

Cada bloque administrado usa exactamente:

```markdown
<!-- agteamos:managed:<section>:start -->
...
<!-- agteamos:managed:<section>:end -->
```

Dentro del bloque deben aparecer:

```markdown
**Sources:** `<path>`, ...
**Last verified:** YYYY-MM-DD
```

Los paths son relativos a la raíz del proyecto y deben existir. `Last verified`
es la fecha en que se releyeron esas fuentes, no una fecha inferida del
contenido.

Si todavía no existe ninguna fuente canónica para una sección (por ejemplo,
no hay tareas archivadas en un bootstrap nuevo), omitir el bloque administrado
en vez de inventar un `Sources`. Se puede crear el archivo con solo su título;
la primera fuente real materializará la sección.

Todo texto fuera de marcadores es humano y no administrado. No moverlo,
normalizarlo, reordenarlo ni reformatearlo.

## Algoritmo de escritura

Para cada output seleccionado:

1. Leer el template y las fuentes canónicas aplicables.
2. Construir solo afirmaciones respaldadas y listar sus paths exactos.
   Nunca dejar placeholders `{{...}}` en el output.
3. Si el archivo no existe, crearlo desde el template.
4. Si existe y no contiene esa sección, agregar el bloque en una ubicación no
   conflictiva, preservando byte a byte el contenido humano.
5. Si la sección administrada ya existe, calcular y **mostrar el diff antes
   de reemplazarla**. Es una mutación local normal: no necesita aprobación
   adicional salvo que el usuario la haya pedido.
6. Si los marcadores están rotos, duplicados, anidados, o la inserción exige
   reemplazar contenido fuera de ellos, detener ese archivo. Mostrar preview
   exacto y pedir aprobación explícita; no escribir mientras falte.
7. No tocar outputs no seleccionados ni secciones sin cambios.

Crear `docs/` está permitido únicamente cuando `architecture` u `operations`
fue seleccionado y tiene fuentes reales. No sobrescribir un README humano
completo con el template: insertar únicamente los bloques administrados.

## Triggers mínimos

- `agteamos-bootstrap`: `--scope changed --outputs readme`; no crea
  `CHANGELOG.md` ni `docs/` en Fase 0.
- `agteamos-implement` cierre: `--scope changed` para `CHANGELOG.md` y los
  documentos afectados por `doc_impact`.
- `agteamos-deploy`: `--scope changed` después de persistir el resultado
  operacional bajo `agteamos/devops/`.
- `agteamos-incidents`: `--scope changed` tras resolución/post-mortem o cambio
  de runbook que altere operación.
- `agteamos-security`: solo cuando un threat model cambia arquitectura,
  trust boundaries, despliegue, monitoreo o respuesta operacional.
- `agteamos-knowledge --maintain`: comparar `Sources`/`Last verified` y marcar
  staleness; escribir solo tras el preview normal de mantenimiento.

## Reporte

Informar:

- scope usado;
- outputs creados, actualizados, sin cambios o bloqueados;
- fuentes leídas por output;
- diffs mostrados para secciones reemplazadas;
- gaps de fuente canónica y aprobaciones pendientes.

## Anti-patrones

- Generar ocho documentos “por completitud”.
- Copiar contenido de `agteamos/` sin resumirlo para audiencia humana.
- Citar paths inexistentes.
- Cambiar una sección administrada sin mostrar diff.
- Adoptar un heading humano preexistente como si estuviera administrado.
- Inferir arquitectura u operación directamente del código.
