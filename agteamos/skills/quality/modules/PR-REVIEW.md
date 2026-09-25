# PR Review

Leer este modulo solo para `pr-review`. Hereda evidencia, severidades,
ratchet, approvals y contexto de `../SKILL.md`.

## Contrato

- **Input**: PR number, diff, archivo(s) o directorio.
- **Output**: Bloqueantes, Importantes, Sugerencias, positivos y decision
  `APPROVE` / `REQUEST_CHANGES` / `COMMENT`.
- **Owner**: `@qa-engineer`; consultar a `@architect` para decisiones
  arquitectonicas y a `@security-engineer` para cambios security-critical.
- **Scope**: diff mas contenido completo de archivos tocados, tests y vecinos
  necesarios para trazar el flujo. No es un audit del repo.
- **Acciones externas**: adapter `repo_host`; follow-ups mediante
  `agteamos-work-items`, sujetos a autorizacion.

## Paso 1 — Adquirir scope fresco

Para un PR:

1. Usar `get-pr` para metadata, estado, mergeability y reviews.
2. Obtener diff y lista de archivos con las operaciones soportadas por el
   adapter. Si `get-pr` no entrega diff/files, declarar el gap; no fingirlos.
3. Leer completos los archivos cambiados, no solo hunks.
4. Leer tests, callers, callees, contratos, schemas y configuracion que
   condicionan las lineas cambiadas.

Para paths locales, usar Read/Grep/Glob, comenzar por entry points y seguir el
call graph. Registrar:

- base/head o limitacion para determinarlos;
- archivos y lineas cambiadas;
- archivos de contexto leidos;
- checks ejecutados y no ejecutados;
- tamano `lite/S/M/L/XL` si la tarea lo declara.

Ejecutar el ratchet:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/lib/findings-ledger.js" scope .
```

PR-review no reconcilia un cache propio. Si `base: null`, todos los findings
quedan `preexistente -> follow-up`.

## Paso 2 — Inyectar contexto del proyecto

Aplicar el protocolo comun: `agteamos-knowledge --inject`, despues
`agteamos/standards/index.yml` + `index.meta.yml`. Resolver solo temas
relevantes por keywords/globs. Si un tema esta pendiente, ejecutar
`ensure-artifact(standards.<tema>)` para un solo tema en este step; los demas
esperan al siguiente.

Leer `README.md` y `deviations.md` del tema resuelto. Una regla documentada
orienta la revision; solo la inspeccion o check fresco demuestra cumplimiento.

## Paso 3 — Scanner determinista

Antes del analisis manual de seguridad:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/security-scanner.mjs" \
  scan --format json <archivo(s)>
```

Cubre patrones de SQLi, XSS, secrets, `eval`, path traversal y command
injection. La salida es evidencia `observed`; sigue siendo obligatorio revisar
autorizacion, IDOR, mass assignment, crypto y flujos que regex no ve.

## Paso 4 — Ocho dimensiones

Revisar todas. `PASS` exige evidencia fresca por dimension; si no se pudo
evaluar, marcar `UNKNOWN` o `NOT RUN`.

### 1. Seguridad

- Validacion de inputs externos y encoding de outputs.
- SQL/command injection, XSS, path traversal y SSRF.
- Secrets/credenciales en codigo o fixtures.
- Autenticacion, autorizacion por recurso, tenancy e IDOR.
- Mass assignment y allowlists.
- Comparaciones sensibles a timing y uso correcto de crypto.

Todo finding cita `archivo:linea`, camino de datos y frontera de confianza.

### 2. Correccion

- Operadores/condiciones invertidas, off-by-one y estados imposibles.
- Null/None, vacio, cero, negativos, Unicode, fechas y limites.
- Tipos, narrowing y opcionales.
- Race conditions y estado mutable compartido.
- Errores tragados, retries incorrectos e idempotencia.
- Compatibilidad de contratos, persistencia y migraciones.

### 3. Rendimiento

- N+1, indexes ausentes y queries dentro de loops.
- I/O bloqueante en async, serializacion accidental y fan-out.
- Recomputacion, renders por referencias inestables y payloads excesivos.
- Complejidad que crece con input no acotado.

No inventar cifras. Sin benchmark o query plan fresco, el impacto numerico es
`proposed`; el patron visible puede ser `observed`.

### 4. Mantenibilidad

- Responsabilidades mezcladas, funciones largas, nesting y nombres ambiguos.
- Duplicacion, magic numbers, comentarios que repiten el codigo.
- `any`/`unknown`/casts que esconden invariantes.
- Branching ad-hoc, flags temporales y casos borde incrustados.
- Wrappers sin valor, feature logic filtrada a modulos genericos y helpers
  bespoke que duplican mecanismos canonicos.

Reglas:

- Si el cambio hace cruzar 1000 lineas a un archivo no generado sin
  justificacion estructural, es Bloqueante presuntivo; confirmar el delta.
- Una simplificacion que elimina una rama/helper completo es Importante, no
  cosmetica, si preserva comportamiento y reduce el diff.
- Spaghetti nuevo es Importante como minimo.
- Cast que oculta un invariante de seguridad/datos puede ser Bloqueante.
- Si hay 3+ archivos relacionados del mismo modulo, activar bajo demanda
  `DOMAIN-REVIEW.md`; sus findings conservan ID `DR-*`.

### 5. Tests

- Codigo nuevo sin test proporcional al riesgo.
- Happy path sin bordes, errores, autorizacion o mutacion.
- Assertions vacuas o siempre verdaderas.
- Tests de implementacion fragiles en vez de comportamiento.
- Expected calculado con la misma formula que production (tautologico).
- Aislamiento, determinismo y fixtures representativos.

Un test existente no prueba el cambio hasta correr el check relevante en esta
corrida. Si no se ejecuto, el estado es `NOT RUN`.

### 6. Deuda tecnica

- TODO/FIXME sin item rastreable.
- Codigo/imports muertos o bloques comentados.
- Dependencias obsoletas con CVE confirmado por audit fresco.
- Cuarta copia de un antipatron que ya se propaga.
- Valores de entorno hardcodeados.

No crear follow-ups automaticamente. Proponerlos y usar
`agteamos-work-items` solo tras aprobacion.

### 7. Conformidad del proyecto

Comparar contra los temas resueltos dinamicamente por la inyeccion e indice.
Una desviacion no documentada es Importante, o Bloqueante si contradice una
regla obligatoria y el cambio la introduce. Una desviacion aprobada en
`deviations.md` no es finding nuevo.

Sin indice o tema materializado: `UNKNOWN`, nunca PASS silencioso.

### 8. DevEx y feature gates

- Env vars nuevas/renombradas sin `.env.example` o setup docs.
- Cambio de proveedor/fuente de secrets sin migracion.
- Puertos/networking que rompen desarrollo local.
- Scripts manuales, seeds, builds o migraciones no documentados.
- Branch de ejecucion que saltea un gate/flag existente.

Feature leak confirmado puede bloquear; otros quiebres de workflow son
Importantes como minimo.

## Paso 5 — Validar findings

Para cada Bloqueante o Importante:

1. Etiquetar `observed`, `computed` o `proposed`.
2. Citar evidencia fresca y estado de ratchet.
3. Escribir `Contraargumento considerado`.
4. Verificar si una desviacion/decision ya lo autoriza.
5. Explicar impacto y remediacion minima, sin reescribir todo el feature.

Un `proposed` no puede ser Bloqueante hasta verificarse. Consolidar duplicados
por causa raiz, no por dimension.

## Paso 6 — Decision y publicacion

- `REQUEST_CHANGES`: Bloqueante introducido/extendido con evidencia
  `observed` o `computed`.
- `APPROVE`: ninguno de esos bloqueantes, Importantes resueltos o con
  follow-up aprobado/verificado, y checks relevantes frescos en PASS.
- `COMMENT`: draft, informacion, checks necesarios ausentes o incertidumbre.

Para `schema: lite` y cambios pequenos, un solo review secuencial: no agentes
ni tracks extra. Para `L`/`XL`, se puede recomendar un reviewer independiente
si el riesgo lo justifica; no lanzarlo automaticamente.

Leer `REPORT-TEMPLATES.md` recien ahora. Seguir tono/convenciones de
`agteamos-pr`.

Si se autorizo publicar:

- `comment-pr` deja texto, pero no cambia el estado formal.
- usar `approve-pr` o `request-changes-pr` si el adapter los expone;
- si no, declarar que el comentario se publico y el approval formal no cambio.

## Anti-patrones

- Revisar solo hunks o solo tests.
- Omitir seguridad por ser una herramienta interna.
- Feedback vago sin `archivo:linea`.
- Convertir toda observacion en Sugerencia para evitar conflicto.
- Bloquear por deuda preexistente.
- Aprobar con checks relevantes `NOT RUN`.
- Tratar salida cacheada o de otro commit como PASS fresco.
- Multiplicar revisores en cambios lite.

## Proximo paso

Con bloqueantes: volver a `agteamos-implement`/`agteamos-build`. Sin
bloqueantes y con approval real: continuar al merge mediante el flujo
autorizado.
