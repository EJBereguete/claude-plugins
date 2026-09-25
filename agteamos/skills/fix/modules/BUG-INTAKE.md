# BUG INTAKE BY ID

Carga este módulo cuando la petición identifica un Bug existente por ID o
URL. Su objetivo es producir un snapshot de triage y elegir una ruta
ejecutable; no modifica el tracker ni implementa el fix.

## 1. Resolver y leer, sin modificar

1. Leer `agteamos/platform.yml` y resolver `tracker`/`repo_host`.
2. Invocar `agteamos-work-items inspect-tracker` para obtener el item, tipo
   real, estado, campos, comentarios, relaciones, attachments y parent.
3. Confirmar que el item es un Bug según la configuración efectiva. En
   GitHub puede ser un Issue con label/type observado; en Azure su nivel
   depende de la configuración real del equipo.
4. Invocar `inspect-repo` y revisar rutas, símbolos, tests, historial y
   configuración vinculados por el reporte. No confiar en paths obsoletos ni
   preguntar datos que el repo o el tracker ya contienen.
5. Si hay enlaces a logs, screenshots o PRs, leer solo mediante herramientas
   compatibles y respetar permisos. Marcar evidencia inaccesible; no inventar
   su contenido.

Las lecturas no requieren aprobación. Un comentario, asignación, cambio de
campo/estado, parent o relación sí pasa por el change set de
`agteamos-work-items`.

## 2. Snapshot durable de triage

Antes de código, materializar el tracking de `agteamos-implement` con el ID
real y añadir a `progress.md`:

```markdown
## Bug intake
- Provider/type: <provider>/<tipo real>
- ID/URL: <id/url>
- Tracker snapshot: <revision o timestamp>
- Current state: <estado real>
- Actual: <conducta observada>
- Expected: <fuente y conducta esperada>
- Impact/frequency: <evidencia o unknown>
- Environment/build: <evidencia o unknown>
- Reproduction: CONFIRMED | PARTIAL | NOT_REPRODUCED
- Reproduction command: `<comando o pending>`
- Suspected scope: <rutas/dominos/repos observados>
- Classification: simple | complex
- Route: lite-fix | lite-debug | full
- Escalation reasons: <criterios concretos o none>
```

Si faltan campos requeridos para trabajar, recopilar solo decisiones de
negocio faltantes. Si deben escribirse al Bug, mostrar un change set y pedir
aprobación; no convertir una pregunta en mutación implícita.

## 3. Clasificación determinista

Clasificar `simple` solo si **todos** son ciertos:

- el comportamiento esperado tiene fuente verificable;
- existe o puede construirse un loop rojo reproducible y acotado;
- el fix probable queda en un dominio y un repo;
- no cambia un contrato público ni requiere migración;
- no exige una decisión arquitectónica o de producto;
- el blast radius es pequeño y el rollback es directo.

Clasificar `complex` si se cumple **cualquiera**:

- cruza dominios, capas coordinadas o repositorios;
- cambia API/evento/schema/permiso u otro contrato observable;
- requiere migración/backfill o puede afectar integridad de datos;
- involucra auth, pagos, infraestructura, concurrencia sistémica o seguridad;
- la corrección exige arquitectura, rollout/rollback no trivial o decisión de
  producto;
- el blast radius no puede acotarse con la evidencia actual.

Severidad y urgencia no sustituyen complejidad: un P0 puede ser un guard
surgical `lite`, y un bug de baja severidad puede necesitar `full`. La
clasificación de riesgo se registra aparte según `agteamos-context`.

## 4. Ruta simple completa (`schema: lite`)

1. Crear `task.yml`/`progress.md` lite con `workflow_contract: "3"`,
   `type: bug`, `phase: TRACKING`, `risk`/`risk_reason` y gates falsos.
2. Si causa y fix surgical ya están sustentados, volver a
   `agteamos-fix` Step 2. Si la causa no está confirmada, delegar a
   `agteamos-debug` para loop rojo, hipótesis falsables y 5 Whys.
3. No crear `specs/`.
4. Exigir fix mínimo, test de regresión rojo→verde, RECONCILE, QA,
   validadores, PR/review/merge y cierre vía `agteamos-implement`.
5. Cualquier descubrimiento de contrato, multi-dominio o blast radius mayor
   detiene el código y promueve a la ruta `full`; registrar la razón.

## 5. Ruta compleja completa (`schema: full`)

1. Crear tracking full con el ID real; no crear otro Bug.
2. Usar `agteamos-task` en modo refinamiento del item existente para cerrar
   solo huecos de valor, expected behavior, alcance y ACs. Actualizar el
   tracker únicamente mediante change set aprobado.
3. Usar `agteamos-debug` hasta confirmar reproducción y causa; la evidencia
   alimenta requirements/design, no reemplaza su aprobación.
4. Ejecutar `agteamos-spec` para requirements, design, tasks y deltas,
   incluyendo estrategia de migración/rollout/rollback cuando aplique.
5. Continuar todo el workflow `agteamos-implement`: aprobación de diseño,
   implementación por unidades, RECONCILE, QA, análisis semántico,
   review proporcional al riesgo, PR/merge, read-back y archive.

La ruta full no se reduce a “crear documentos”: todos sus gates deben quedar
durables y pasar.

## 6. Salidas alternativas

- **No change**: si el repo/spec demuestra comportamiento esperado o causa
  solo operativa, documentar la evidencia y proponer el comentario/cierre
  exacto mediante `agteamos-work-items`; requiere aprobación.
- **Duplicate**: mostrar la evidencia del item canónico y proponer la relación
  y el cierre por change set; no cerrar automáticamente.
- **Blocked intake**: si no hay permisos, item, expected behavior o forma
  segura de obtener evidencia, dejar `Next Action` concreto y no abrir branch.

## Anti-patterns

- Empezar por editar la línea mencionada sin releer Bug y repo.
- Tratar todo Bug por ID como `lite`.
- Crear un Bug nuevo para “representar” el existente.
- Copiar cuerpos, attachments o datos sensibles completos a `progress.md`.
- Cambiar severity, owner, estado o comentario durante el triage sin preview,
  fingerprint, aprobación y read-back.
