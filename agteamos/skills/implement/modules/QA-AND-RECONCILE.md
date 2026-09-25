# QA AND RECONCILE

Carga este módulo en `RECONCILE` después de **cada** unidad/tarea y en `QA`
cuando todas las unidades estén reconciliadas.

## A. Checkpoint RECONCILE

La implementación queda detenida durante este checkpoint.

### 1. Comparación obligatoria

Compara el diff y tests de la unidad con:

- `specs/requirements.md`: RFC 2119 y ACs;
- `specs/design.md`: approach, archivos, API/datos, seguridad y seams;
- `specs/deltas/*.md`: contrato observable ADDED/MODIFIED/REMOVED;
- `specs/tasks.md`: alcance, owner, orden y estado;
- en `lite`, resumen y test de regresión de `progress.md`.

Registra una fila por fuente con `ALIGNED`, `DIVERGED` o `N/A` y evidencia
(path, test o símbolo). No marques la task `[x]` antes de este resultado.

### 2. Si está alineado

1. confirma tests de la unidad en verde;
2. marca la task completada;
3. actualiza `progress.md`, `task.yml.updated`, `Next Action` y dashboard;
4. vuelve a `IMPLEMENT` o, si no quedan tasks, pasa a `QA`.

### 3. Si diverge

No adaptes silenciosamente la documentación al código ni sigas codificando:

1. describe código actual, documento esperado y razón de la divergencia;
2. decide si debe cambiar código o contrato;
3. actualiza los artefactos afectados en orden
   `requirements → design → deltas → tasks`;
4. obtiene la aprobación correspondiente;
5. sincroniza el tracker solo si cambian el alcance/ACs externos, usando
   `agteamos-work-items` con change set aprobado y read-back;
6. ejecuta:

   ```bash
   node scripts/agteamos-validate.mjs --root <repo>
   ```

7. si el validador devuelve FAIL/error o exit code no cero, permanece
   bloqueado; corrige y repite. Solo entonces vuelve a `IMPLEMENT`.

### Aprobaciones por artefacto

| Cambio | Autoridad/gate |
|---|---|
| Requirement, AC, out-of-scope | `@product-manager` propone; usuario aprueba; tracker se actualiza con `agteamos-work-items` si aplica |
| Approach, API/datos, seam o decisión arquitectónica | `@architect` valida; usuario reaprueba `design.md` |
| ADDED/MODIFIED/REMOVED | `@architect` valida contra la spec maestra vigente; aprobación del cambio de contrato |
| Orden/owner/desglose de tasks | `@product-manager`; aprobación del usuario si cambia alcance o compromiso |

Si un cambio `lite` toca contrato, la reconciliación debe promoverlo a
`full`; no existe excepción.

## B. Gate QA

Precondición: todas las unidades tienen un RECONCILE `ALIGNED`, todas las
tasks aplicables están `[x]` y no hay divergencias abiertas.

### 1. Pruebas

- Ejecuta unitarias/integración relevantes y suite afectada.
- Cubre todos los ACs; conserva exit codes y comandos reproducibles.
- Para UI/flujo ejecuta E2E con Playwright.
- Captura estado inicial, acción, éxito y cada error exigido por AC.
- Si hay UI, ejecuta accesibilidad (axe-core o equivalente) y guarda
  evidencia.
- Ante fallo, captura estado y deja la task abierta.

Guarda evidencia descriptiva en
`agteamos/changes/<id>-<slug>/evidence/` y referencia cada archivo desde
`progress.md`.

### 2. Revisión en seis dimensiones

Revisa correctitud, tests, seguridad, rendimiento, mantenibilidad y deuda.
Ejecuta STRIDE sobre superficie nueva; para auth/sesiones/datos sensibles,
aplica también `agteamos-security`.

QA rechaza si falta evidencia, un AC no tiene prueba, hay tests/lint fallando
o existe divergencia sin reconciliar.

Recalcula `risk` contra el diff final:

- auth/autorización, pagos, datos sensibles, migraciones/backfills,
  infraestructura productiva, contratos públicos/cross-repo y blast radius
  amplio elevan al menos a `high`;
- bypass/exposición posible, dinero/datos irreversibles u operación crítica
  sin rollback probado elevan a `critical`;
- ausencia sustentada de esas señales permite `standard`.

Actualiza `risk_reason`. Una elevación ajusta reviewers de cierre sin
preguntas adicionales. Una reducción requiere evidencia registrada de que la
señal desapareció, no solo un diff pequeño.

Al entrar a QA, persistir `task.yml.phase: QA` y mantener `qa_pass: false`.
Solo después de ejecutar las pruebas y releer la evidencia:

- verde: `qa_pass: true`, `phase: PRE_PR_VALIDATE`;
- fallo: `qa_pass: false`, `validator_pass: false`, `phase: IMPLEMENT`.

Actualizar también la fila `QA` de `progress.md > Workflow Gates` con comando,
exit code y evidencia. El booleano sin evidencia no es suficiente para una
revisión humana, aunque sea el marker machine-readable.

### 3. Refactor acotado

Con tests verdes, cruza archivos tocados con el ledger/hotspots de
`agteamos-quality`. Si coincide, propone como máximo 1–2 refactors de hasta
30 líneas, cada uno con test. El usuario elige:

1. aplicar ahora en commit separado;
2. capturar como tech debt mediante `agteamos-capture`;
3. descartar y marcar `KNOWN` según el ledger.

Sin coincidencia, continúa sin generar texto.

## Condición de salida

- QA con evidencia y suites verdes → `PRE_PR_VALIDATE`.
- Cualquier fallo → vuelve a `IMPLEMENT` y luego exige un nuevo
  `RECONCILE`.
