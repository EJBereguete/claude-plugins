# Auditoria Integral

Leer este modulo solo para la salud global del proyecto consumidor. No
confundir con `agteamos-meta`, que audita AgTeamOS.

## Contrato

- **Input**: repositorio activo completo.
- **Output**: `agteamos/security/AUDIT-YYYY-MM-DD.md`, radar de deuda, score
  0-100 y mitigacion P0/P1/P2.
- **Owners**: `@architect`, `@security-engineer`, `@qa-engineer`,
  `@devops-engineer` y `@product-manager`.
- **Merge**: un audit no bloquea un PR; prioriza riesgo y deuda.
- **Ledger**: prefijo `AU`, cache exclusivo
  `agteamos/.cache/findings/audit.json`.

Crear/publicar el archivo o work items requiere que el pedido lo autorice. Un
audit de diagnostico puede entregarse sin mutar el repo.

## Paso 0 — Contexto y baseline

1. Ejecutar `agteamos-router`.
2. Leer `agteamos/architecture/PROJECT_CONTEXT.md` si existe. Si no existe
   contexto de proyecto, ejecutar `agteamos-knowledge` L0 antes de auditar.
3. Ejecutar `agteamos-knowledge --inject` para el scope del primer bloque.
4. Leer `agteamos/standards/index.yml` + `index.meta.yml` y resolver temas
   dinamicamente por keywords/globs. No hardcodear temas.
5. Si un tema aplicable esta `pending`, `candidate` o `stale`, ejecutar
   `ensure-artifact(standards.<tema>)` para **uno como maximo por step**.
   Reinyectar y releer el indice en el step siguiente.
6. Buscar el audit anterior mas reciente; sirve como baseline historico, no
   como evidencia de PASS actual.
7. Leer la ultima snapshot de `agteamos/quality/debt-trend.yml`, si existe.
   La genera `hooks/scripts/session-start.js`; usarla para priorizar hotspots,
   no para declarar findings actuales sin inspeccion fresca.

Si no hay audit anterior, declarar "primer audit registrado — sin baseline".

## Paso 1 — Mapear y priorizar scope

- Glob del repo para modulos, capas, tests, CI, deploy y docs.
- Excluir dependencias vendorizadas, builds y generated code, declarando las
  exclusiones.
- Calcular churn de 90 dias con git y priorizar lectura profunda en hotspots.
- Mapear bounded contexts/modulos, entry points y dependencias.

Ejemplo POSIX adaptable al shell:

```bash
git log --since="90 days ago" --name-only --pretty=format: \
  | sort | uniq -c | sort -rn
```

Si no hay historial suficiente, marcar churn `UNKNOWN`; no inventar ranking.

## Paso 2 — Arquitectura (@architect)

Inspeccionar:

- estructura de modulos/capas y dependencias circulares;
- coupling, god classes/modules y fat controllers;
- boundaries, ownership y feature logic filtrada;
- ADRs: presencia, vigencia y correspondencia con codigo;
- estado, escalabilidad horizontal y puntos unicos de fallo.

Para un modulo con señales concretas, activar bajo demanda
`DOMAIN-REVIEW.md`, uno por vez. En audit sus findings se priorizan como deuda,
no como bloqueantes de PR. Mantener su ledger DR separado; no copiar IDs DR al
ledger AU como identidad compartida.

Todo "no se encontro" es PASS solo si el scope se inspecciono en esta corrida.

## Paso 3 — Seguridad (@security-engineer)

Ejecutar herramientas disponibles y documentar comando/version/scope:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/security-scanner.mjs" \
  scan --format json --fail-on none <archivo(s)>
pip-audit -r requirements.txt
npm audit --audit-level=moderate
dotnet list package --vulnerable --include-transitive
```

Usar solo comandos del stack detectado. Complementar con secret scanner del
proyecto y revisar manualmente OWASP:

1. A01 Broken Access Control
2. A02 Cryptographic Failures
3. A03 Injection
4. A04 Insecure Design
5. A05 Security Misconfiguration
6. A06 Vulnerable Components
7. A07 Identification and Authentication Failures
8. A08 Software and Data Integrity Failures
9. A09 Security Logging and Monitoring Failures
10. A10 SSRF

Ejecutar `agteamos-security` si no hay STRIDE reciente aplicable. Un STRIDE
historico da contexto; no PASS actual. Si una tool falta o falla por entorno,
marcar `NOT RUN`/`UNKNOWN`, no limpio.

## Paso 4 — Calidad y testing (@qa-engineer)

Ejecutar el runner/config real del proyecto. Ejemplos:

```bash
pytest --cov=. --cov-report=term-missing
npx vitest run --coverage
dotnet test --collect:"XPlat Code Coverage"
```

Evaluar:

- cobertura fresca, en especial logica de dominio;
- critical user paths sin E2E;
- assertions vacuas/tautologicas y tests que nunca fallan;
- mutation testing real si existe; si no, no inventar mutation score;
- contract tests entre consumidores/proveedores;
- flakiness y aislamiento.

Cobertura historica o badge no habilita PASS. Distinguir metrica observada de
estimacion proposed.

## Paso 5 — DevOps y observabilidad (@devops-engineer)

Ejecutar `agteamos-metrics` para baseline DORA actual si esta disponible.
Inspeccionar:

- logs estructurados y redaccion de PII/secrets;
- error tracking con evidencia de eventos;
- alertas, SLOs, p95/error rate y runbooks;
- health/readiness checks;
- env vars documentadas;
- builds reproducibles y containers multi-stage cuando apliquen;
- rollback probado/documentado.

Config presente no demuestra servicio operativo. Sin evidencia de ejecucion,
usar `UNKNOWN`.

### Flags/config obsoletos

Solo en audit:

1. Buscar patrones reales de flags del proyecto.
2. Usar `git log -p --follow -- <archivo>` para fechar definicion/lecturas.
3. Si lleva 3+ meses fijo y no existe camino contrario, Sugerencia; Importante
   si deja >50 lineas muertas.
4. Sin historial o si el estado vive fuera del repo, etiquetar `proposed`; no
   adivinar fecha.

## Paso 6 — Valor de negocio (@product-manager)

Para cada finding confirmado:

- impacto de no corregir;
- esfuerzo S/M/L/XL;
- ROI y dependencias;
- prioridad:
  - P0: seguridad de produccion/compliance inmediata;
  - P1: este sprint, impacto significativo;
  - P2: proximo trimestre.

No degradar severidad tecnica para ajustar capacidad. Separar severidad,
prioridad y esfuerzo.

## Paso 7 — Reconciliar ledger AU

Serializar findings actuales a `findings.json`:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/lib/findings-ledger.js" \
  reconcile AU findings.json agteamos/.cache/findings/audit.json
```

Contrato:

- IDs `AU-<hash>`;
- `NEW`, `SEEN xN`, `RESOLVED`;
- cache AU no se comparte con DR;
- el audit anterior y cache explican tendencia, no PASS;
- `RESOLVED` requiere inspeccion/check fresco sobre el mismo riesgo.

Consolidar una causa raiz vista por varias dimensiones en una fila del radar,
con multiples fuentes, no duplicarla.

## Paso 8 — Score y reporte

Score ponderado:

| Dimension | Peso |
|---|---:|
| Seguridad | 25 |
| Arquitectura | 20 |
| Tests | 20 |
| DevOps | 15 |
| Codigo | 15 |
| Docs | 5 |

Cada resta debe vincularse a findings `observed`/`computed`. Incertidumbre no
se premia como PASS: declarar cobertura del audit y confianza junto al score.

Bandas:

- 90-100: Elite
- 75-89: High
- 50-74: Medium
- <50: Critical

Leer `REPORT-TEMPLATES.md` solo ahora. Poner conclusion, score, confianza y
hallazgo mas critico primero. Incluir radar, vulnerabilidades, cambios desde
baseline, mitigacion, arquitectura, testing, observabilidad, DORA, fortalezas
y calculo.

Antes de publicar, aplicar el checklist pre-envio de `agteamos-pr`. Proponer
work items mediante `agteamos-work-items`; crearlos solo tras aprobacion y
verificar IDs/links. Un audit sin acciones propuestas es incompleto; acciones
no aprobadas siguen `proposed`.

## Ejecucion

Secuencial por defecto. En repos grandes, el usuario puede autorizar owners
read-only por dimension; el orquestador conserva contexto comun, consolida y
es el unico que escribe/publica. No multiplicar agentes por costumbre ni usar
resultados parciales como PASS global.

## Anti-patrones

- Auditar sin contexto de proyecto.
- Listar toda observacion menor como P0.
- Puntuar solo cobertura y omitir riesgos cualitativos.
- Ejecutar comandos genericos ajenos al stack.
- Declarar seguridad limpia sin scanner fresco.
- Omitir baseline disponible o fusionar DR/AU.
- Tratar `debt-trend.yml` como finding fresco.
- Publicar work items sin aprobacion.
- Materializar varios temas pendientes en un mismo step.

## Proximo paso

`agteamos-decisions` para decisiones arquitectonicas grandes o
`agteamos-task` para P0/P1 aprobados.
