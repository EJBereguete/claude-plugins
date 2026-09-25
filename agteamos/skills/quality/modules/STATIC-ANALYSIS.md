# Static Analysis

Leer este modulo solo para configurar o ejecutar analyzers, pre-commit o CI.
Hereda evidencia y severidades de `../SKILL.md`.

## Contrato

- **Input**: repositorio, paths tocados o pipeline de CI.
- **Output**: matriz de checks con comando, scope, exit code, evidencia y gate.
- **Owners**: `@security-engineer` para scanners; `@devops-engineer` para CI.
- **Bloqueo**: lo decide el quality gate reproducible, no una lectura del
  agente ni un resultado historico.
- **Ledger**: no usa `findings-ledger.js`.

## Paso 1 — Detectar stack y reglas

1. Inspeccionar manifests/configs existentes antes de proponer herramientas.
2. Ejecutar `agteamos-knowledge --inject` para el scope.
3. Leer `agteamos/standards/index.yml` + `index.meta.yml`; resolver temas por
   keywords/globs del pipeline.
4. Si un tema aplicable esta pendiente, usar
   `ensure-artifact(standards.<tema>)` para un tema como maximo en este step.
5. Preferir versiones y comandos ya fijados por lockfiles/config del proyecto.

No instalar, actualizar ni reconfigurar herramientas sin autorizacion. Si una
tool no esta disponible, marcar `NOT RUN`; no sustituirla silenciosamente.

## Paso 2 — Toolchain por lenguaje

### Python

| Capa | Herramienta | Comando base |
|---|---|---|
| Lint | `ruff` | `ruff check .` |
| Formato | `ruff` | `ruff format --check .` |
| Tipos | `mypy` | `mypy src/` |
| Seguridad | `bandit` | `bandit -r src/ -ll` |
| Smells profundos | `pylint` | `pylint src/ --fail-under=8.0` |
| Dependencias | `pip-audit` | `pip-audit -r requirements.txt --fail-on-cvss 7.0` |
| Tests/cobertura | `pytest-cov` | `pytest --cov=src --cov-report=xml --cov-fail-under=80` |

Baseline recomendado, adaptable al proyecto:

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "W", "F", "I", "B", "C4", "UP", "S", "N"]
ignore = ["E501"]

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101"]

[tool.mypy]
python_version = "3.12"
strict = true
ignore_missing_imports = true
disallow_untyped_defs = true
disallow_any_generics = true
warn_unused_ignores = true
```

Supresiones requieren razon local verificable:

```python
result = subprocess.run(cmd, shell=False)  # nosec B603 -- argv allowlisted above
```

### TypeScript / JavaScript

| Capa | Herramienta | Comando base |
|---|---|---|
| Tipos | `tsc` | `npx tsc --noEmit` |
| Lint type-aware | `eslint` + `typescript-eslint` | `npx eslint . --max-warnings 0` |
| Formato | `prettier` | `npx prettier --check "src/**/*.{ts,tsx,js,jsx}"` |
| Dependencias | npm/audit-ci | `npm audit --audit-level=high` |
| Tests/cobertura | Vitest/Jest | `npx vitest run --coverage` |

Strictness recomendado:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Reglas de alto valor: `no-explicit-any`, `no-floating-promises`,
`await-thenable` y `consistent-type-imports`. Una llamada fire-and-forget debe
ser explicita (`void`) y justificar manejo de errores.

### C# / .NET

| Capa | Herramienta | Comando base |
|---|---|---|
| Compilador/analyzers | Roslyn | `dotnet build /p:TreatWarningsAsErrors=true` |
| Formato | `dotnet format` | `dotnet format --verify-no-changes` |
| Seguridad | Security Code Scan | corre dentro del build |
| Calidad | SonarAnalyzer.CSharp | corre dentro del build/scan |
| Dependencias | NuGet audit | `dotnet list package --vulnerable --include-transitive` |
| Tests/cobertura | `dotnet test` + coverlet | `dotnet test --collect:"XPlat Code Coverage"` |

Baseline:

```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
  <EnableNETAnalyzers>true</EnableNETAnalyzers>
  <AnalysisMode>All</AnalysisMode>
  <NuGetAuditMode>all</NuGetAuditMode>
  <NuGetAuditLevel>high</NuGetAuditLevel>
</PropertyGroup>
```

No usar `Version="*"` al introducir analyzers: fijar version compatible con el
lock/build del proyecto.

## Paso 3 — Scanner determinista comun

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/security-scanner.mjs" \
  scan --format json --fail-on high <archivo(s)>
```

Exit codes: `0` limpio/bajo umbral, `1` findings al umbral, `2` error de uso.
Soporta `// agteamos-scanner-allow: <razon>` para falsos positivos
documentados. Complementa, no reemplaza, analyzers del lenguaje.

## Paso 4 — Metricas y gates

Defaults recomendados cuando el proyecto no define otros:

| Metrica | Gate sobre codigo nuevo |
|---|---|
| Complejidad ciclomatica | fallo si una funcion >15 |
| Complejidad cognitiva | fallo si una funcion >10 |
| Cobertura | >=80% |
| Duplicacion | <=3% |
| Reliability/Security/Maintainability | rating A |
| Security hotspots | 100% revisados |
| Issues Blocker/Critical globales | 0 |

Interpretacion:

- 1-5 ciclomatica: simple; 6-10 moderada; 11-20 compleja; 21+ critica.
- Cobertura <50% insuficiente; 50-70% minimo legacy; 70-80% aceptable;
  80%+ objetivo de codigo nuevo.
- No perseguir 100% por defecto ni bloquear DTOs/generated/migrations si la
  exclusion esta documentada.

Un numero solo es `computed` cuando viene de output fresco. Configurar un
threshold no prueba que se cumple.

## Paso 5 — Pipeline

Principio: checks rapidos locales; checks profundos en PR CI. Nunca aplicar
auto-fix en CI.

### Python CI

```yaml
- run: pip install -r requirements-dev.txt
- run: ruff check . --output-format=github
- run: ruff format --check .
- run: mypy src/ --junit-xml=mypy-report.xml
- run: bandit -r src/ -ll -f json -o bandit-report.json
- run: pip-audit -r requirements.txt --fail-on-cvss 7.0
- run: pytest --cov=src --cov-report=xml --cov-fail-under=80
```

### TypeScript CI

```yaml
- run: npm ci
- run: npx tsc --noEmit
- run: npx eslint . --max-warnings 0
- run: npx prettier --check "src/**/*.{ts,tsx}"
- run: npm audit --audit-level=high
- run: npx vitest run --coverage
```

No usar `continue-on-error: true` en un check que se declara gate. Puede
usarse para producir SARIF solo si un paso posterior interpreta el resultado
y falla el job.

### .NET CI

```yaml
- run: dotnet restore --locked-mode
- run: dotnet build --no-restore /p:TreatWarningsAsErrors=true
- run: dotnet format --verify-no-changes --no-restore
- run: dotnet test --no-build --collect:"XPlat Code Coverage"
- run: dotnet list package --vulnerable --include-transitive
```

Verificar el exit code real del comando de vulnerabilidades; no depender de
texto localizado sin testear el parser.

### SonarQube

Usar checkout con historial completo cuando blame/new-code lo requiere,
ejecutar scan y despues quality-gate check. Fijar versiones/tags de actions
segun la politica del proyecto; no usar ramas flotantes en ejemplos aplicados.

## Paso 6 — Resultado

Por cada gate registrar:

- tool/version y config;
- comando exacto;
- scope/commit;
- exit code;
- artifact (JSON, SARIF, XML) si existe;
- `PASS`, `FAIL`, `NOT RUN` o `UNKNOWN`;
- evidencia `observed` y derivaciones `computed`.

Solo el comando fresco exitoso produce PASS. Resultados cacheados, dashboard
historico o config presente no lo hacen. Un gate `FAIL` clasifica findings por
severidad; `NOT RUN` no equivale a fallo tecnico, pero impide afirmar PASS.

Leer `REPORT-TEMPLATES.md` solo para redactar el resumen.

## Priorizacion

1. Vulnerabilidades en auth, inputs, crypto y secrets.
2. Null/type errors y fallos de compilacion.
3. Complejidad >20 y errores de concurrencia.
4. Codigo muerto.
5. Duplicacion cuando se toca una copia.

Generated code, boilerplate y falsos positivos pueden excluirse solo con
scope/razon documentados. Una suppression sin razon es finding.

## Anti-patrones

- Agregar una tool sin mirar stack/config existente.
- Reportar PASS porque el YAML contiene el step.
- Auto-fix en CI.
- Ignorar exit codes.
- Doble linter con reglas contradictorias.
- Excluir directorios completos para silenciar un finding.
- Tratar scanner regex como cobertura completa de seguridad.

## Proximo paso

Este modo termina en la configuracion o evidencia del gate. Si hay FAIL,
volver al flujo de implementacion; no crea un flujo conversacional propio.
