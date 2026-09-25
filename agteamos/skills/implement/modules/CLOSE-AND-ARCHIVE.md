# CLOSE AND ARCHIVE

Carga este módulo desde `PRE_PR_VALIDATE` hasta `ARCHIVE`. Ejecuta el orden
sin saltos: preparar → sync → validar → PR/review → verify → validar → merge
→ ticket/docs finales → archive/dashboard.

## 0. Precondiciones

- `task.yml`/`progress.md` consistentes, owner/handoffs preservados.
- Todas las tasks aplicables completadas y cada una con RECONCILE `ALIGNED`.
- QA, tests, seguridad y evidencia en verde.
- `schema` leído de `task.yml`; no lo infieras.
- Sin cambios ajenos mezclados en branch.

`lite` exige resumen y test de regresión; no lleva delta ni spec maestra. Si
cambió contrato, vuelve a RECONCILE y promueve a `full`.

## 1. Preparar cierre en la rama

Si `doc_impact` falta, trátalo como `true`. Cuando sea `true`, actualiza antes
del PR los artefactos canónicos afectados bajo `agteamos/`
(contexto/arquitectura, ADR, infraestructura y operación) y cualquier
OpenAPI que el propio proyecto ya mantenga. No inventes una ruta API global.
Las human docs derivadas se materializan tras el cierre. Con `false`, registra
que se omitió.

Revisa `Decisions Made`. Para promover una decisión generalizable a
`agteamos/specs/knowledge-base.md`, muestra el texto final y pide
confirmación explícita. Si el diff introdujo una convención consistente,
ofrece `agteamos-knowledge --learn`; nunca la registra automáticamente.

## 2. Gate delta ↔ tasks (`full`)

Antes del sync, construye una matriz:

| Requirement del delta | Sección | Task asociada | Estado |
|---|---|---|---|

Cada `### Requirement:` bajo **ADDED** o **MODIFIED** debe mapear a por lo
menos una task marcada como completada. Cero mappings o una task incompleta
es `FAIL`: no sincronices, no abras PR. `REMOVED` debe tener justificación y
revisión, pero no está sujeto al mínimo de una task de implementación.

## 3. Sync determinista (`full`, antes del PR)

Para cada `specs/deltas/<dominio>.md`:

1. relee `agteamos/specs/<dominio>.md` del filesystem **en ese momento**;
2. valida que ADDED no exista y que MODIFIED/REMOVED coincida carácter por
   carácter con una ancla `### Requirement:` vigente;
3. si la maestra no existe, créala a partir de Purpose + ADDED;
4. aplica ADDED como append, MODIFIED como reemplazo íntegro y REMOVED como
   eliminación íntegra;
5. “Sin cambios en la spec maestra” no modifica el archivo y se registra;
6. actualiza metadata de última tarea/cobertura;
7. escribe cada archivo atómicamente (temporal + rename).

No adivines por similitud. Ante ancla ausente o conflicto, detén todos los
pasos de cierre y vuelve a `@architect`/RECONCILE. En 2+ dominios no abras
PR hasta que todos hayan sincronizado; un resultado parcial queda bloqueado
y explícito en `progress.md`.

## 4. Validador determinista antes del PR

Ejecuta, después de docs/sync:

```bash
node scripts/agteamos-validate.mjs --root <repo>
```

Exit code no cero o cualquier `FAIL`/error bloquea el PR. Registra comando,
resultado y correcciones. No sustituyas este gate por inspección del LLM.
Con exit cero y QA ya verificada, persiste `validator_pass: true` y
`phase: PRE_PR_VALIDATE` en `task.yml`; registra comando/exit en
`progress.md > Workflow Gates`. Con fallo, deja `validator_pass: false`.

## 5. Crear PR

Usa el adapter de `repo_host` y `agteamos-pr`, nunca el tracker ni comandos
hardcodeados. El PR contiene en el mismo commit set:

- código y tests;
- artefactos de la tarea;
- para `full`, delta y spec maestra ya sincronizada;
- docs de impacto.

Aplica título convencional, tamaño/justificación, body trazable, evidencia y
keyword correcto del proveedor. Actualiza `task.yml.status: in_review`.
Después del read-back del PR, actualiza `task.yml.phase: PR_REVIEW`.

Orden de review: requirements → delta → diff de spec maestra → código.

## 6. Review y QA del PR

Exige CI verde, QA E2E/evidencia y revisión en correctitud, tests, seguridad,
rendimiento, mantenibilidad y deuda. Captura primero el SHA exacto del head del
PR y aplica `risk`/`risk_reason`:

- `standard`: revisión normal de `agteamos-pr`, sin review adicional;
- `high`: revisión normal + una aprobación independiente del especialista
  aplicable (`@architect`, `@security-engineer` o `@devops-engineer`);
- `critical`: revisión normal + dos aprobaciones independientes, incluida
  arquitectura y seguridad/operaciones según la señal.

Un cambio de schema/migración exige `@devops-engineer`; auth/seguridad exige
`@security-engineer`; contrato cross-repo exige owner/arquitectura del
consumidor. Todo PR mantiene QA verde y nadie autoaprueba su propio cambio.

Persistir aprobación normal en `review_approved` + `reviewed_sha`. Para
high/critical persistir además `risk_review_approved: true` y
`risk_review_sha` con **el mismo SHA**. Nombres/comentarios viven en
`progress.md`; el task guarda solo gates y SHA.

Cambios solicitados vuelven a `IMPLEMENT → RECONCILE → QA`; después repite
los gates deterministas afectados.
Al volver o si cambia el SHA, resetea `qa_pass`, `validator_pass`,
`review_approved` y `risk_review_approved` a `false`, y `reviewed_sha` /
`risk_review_sha` a `null`; no conserves gates de un diff anterior.

## 7. Verify

Genera `verify-report.md` usando `TEMPLATES.md`.

### Full

Verifica:

1. el cierre semántico determinista:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/agteamos-analyze.mjs" \
     --change "agteamos/changes/<id>-<slug>" --stage verify
   ```
   Exit no cero bloquea el reporte y el cierre;
2. todos los ítems de implementación de `tasks.md` completados;
3. gate ADDED/MODIFIED ↔ task completada;
4. cada requirement RFC 2119 y sus ACs:
   - MUST/SHALL incumplido → `FAIL`;
   - SHOULD incumplido → `WARNING`;
   - MAY → no bloqueante;
5. cada comando verificable usa exit code; los errores esperados se envuelven
   para que éxito semántico produzca exit 0;
6. path closure: cada fixture/config/test existe y fue creado por la tarea o
   preexistía de forma comprobable.
7. goal-backward verification: partir del objetivo y enumerar verdades
   observables, artefactos que las implementan, wiring crítico que las hace
   alcanzables y calidad/no-tautología de las pruebas. Toda verdad sin cadena
   objetivo → artefacto → wiring → evidencia es `FAIL`.

### Lite

Verifica únicamente que el test de regresión reproducible pasa y que no hubo
cambio de contrato.

Cualquier `FAIL` bloquea merge/cierre. Un warning se documenta. Si hay SRS
formal y requirements referencia `RF-XXX`, actualiza trazabilidad solo tras
PASS. Si el tracker es Planner y existe Planner Task ID, cualquier cambio de
porcentaje/notas pasa por `agteamos-work-items` con aprobación y read-back.

Solo con review aprobado y `verify-report.md` PASS, persiste
`review_approved: true`, `reviewed_sha: <head SHA>` y
`phase: PRE_CLOSE_VALIDATE`. Para high/critical exige y persiste además el
review proporcional del mismo SHA. Una aprobación revocada o cambios nuevos
restablecen todos esos campos.

## 8. Validador determinista antes del cierre

Con review/verify finalizados y justo antes de solicitar merge, ejecuta otra
vez:

```bash
node scripts/agteamos-validate.mjs --root <repo>
```

`FAIL`, error o exit code no cero bloquea merge, cierre externo y archive.
Con exit cero, conserva `validator_pass: true` y registra que corresponde al
SHA revisado. Si el SHA cambia, restablece `validator_pass: false`.

## 9. Aprobación y merge

Presenta target/base, estrategia, checks, aprobaciones, resultado de verify y
efecto (squash/merge commit y borrado de branch). Pide aprobación explícita
de merge. Ejecuta mediante `agteamos-pr`/adapter:

- squash para feature PR;
- merge commit solo para release;
- target protegido usa la operación específica del proveedor;
- borra branch solo después de merge confirmado.

No archives si el merge no está confirmado.
Tras read-back del merge, persiste `merge_confirmed: true` y
`task.yml.phase: MERGE`. Nunca marques el booleano a partir de la solicitud o
de un exit sin releer el PR.

## 10. Ticket y read-back

Lee el ticket mediante `agteamos-work-items`. Si el keyword lo cerró,
verifica el estado real. Si no:

1. prepara estado final/comentario/link exactos;
2. muestra change set antes/después;
3. pide aprobación;
4. aplica y relee con ETag/version cuando exista;
5. pasa el `change_path` activo y actualiza `tracker-result.md` con el
   fingerprint, operación y read-back sanitizados.

No asumas que el estado final se llama `Closed`.
Después del read-back final, persiste `ticket_reconciled: true` y
`task.yml.phase: ARCHIVE`. Si no se verificó o el receipt durable no pudo
actualizarse, permanece en `MERGE`.

## 11. Archive y dashboard

Solo con merge confirmado, sync completo (`full`) y ticket reconciliado:

1. marca `task.yml.status: done`, fechas y PR;
   establece `task.yml.phase: DONE` conservando los cinco gates de entrega en
   `true` y el review de riesgo real cuando aplicó;
2. actualiza `progress.md` a `COMPLETED`;
3. mueve la carpeta a
   `agteamos/changes/archive/<fecha>-<id>-<slug>/`;
4. confirma limpieza local/remota de branch;
5. ejecuta `agteamos-dashboard --project` para finalizar `report.html` y
   regenerar `agteamos/dashboard.html`;
6. ejecuta `agteamos-dashboard --portal` para refrescar el portal global.

Los HTML son derivados, deben estar ignorados y nunca se commitean. El
archive ocurre después del merge, nunca antes.
Ambas regeneraciones son best-effort: una advertencia del renderer no revierte
ni bloquea un cierre ya verificado.

### 11.1 Human docs después del cierre

Con el archive ya persistido, ejecutar:

```text
agteamos-knowledge --human-docs --scope changed
```

`CHANGELOG.md` se evalúa siempre contra la tarea archivada. Evaluar
`docs/architecture.md`, `docs/operations.md` y `README.md` solo cuando
`doc_impact: true` y sus fuentes canónicas cambiaron. Mostrar el diff antes
de reemplazar una sección administrada existente; contenido humano fuera de
marcadores requiere preview y aprobación. Estas son mutaciones locales
normales y siguen el flujo de commit/PR del repositorio; nunca escribir
directamente una rama protegida.

## 12. Cierre opcional

Pregunta en una línea si hubo fricción. Si hay una idea, `agteamos-meta`
puede proponer una fila de backlog; escribirla requiere aprobación explícita.
La pregunta nunca bloquea una tarea ya cerrada.
