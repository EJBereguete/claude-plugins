# Skill: Code Analysis & Quality Gates

Static code analysis is the process of examining source code without executing it, to detect bugs, vulnerabilities, code smells, and style violations. When integrated into CI pipelines with enforced quality gates, it becomes a continuous mechanism that keeps technical debt from accumulating silently.

**Why it matters:**
- Bugs caught at analysis time cost ~10x less than bugs caught in production
- Type errors, security issues, and dead code are found before any reviewer has to comment
- Consistent quality gates prevent gradual degradation of a codebase across a team

---

## 1. Static Analysis per Language

### Python

Use a layered approach: fast linting on pre-commit, deeper analysis in CI.

| Tool | Role | Speed |
|------|------|-------|
| `ruff` | Linting + formatting (replaces flake8, isort, black) | Very fast (Rust) |
| `mypy` | Type checking | Medium |
| `bandit` | Security scanning (hardcoded secrets, injection risks) | Medium |
| `pylint` | Deep code smell detection | Slow |

**ruff configuration (`pyproject.toml`):**
```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes (undefined names, unused imports)
    "I",   # isort
    "B",   # flake8-bugbear (likely bugs and design problems)
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade (modern Python syntax)
    "S",   # bandit-equivalent security rules
    "N",   # pep8-naming
]
ignore = ["E501"]  # line length handled separately

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101"]  # allow assert in tests

[tool.mypy]
python_version = "3.12"
strict = true
ignore_missing_imports = true
disallow_untyped_defs = true
disallow_any_generics = true
warn_unused_ignores = true
```

**bandit configuration (`pyproject.toml`):**
```toml
[tool.bandit]
skips = ["B101"]  # skip assert warnings in test files
exclude_dirs = ["tests", ".venv"]
```

**Run commands:**
```bash
ruff check .            # lint
ruff format --check .   # format check (no auto-fix in CI)
mypy src/               # type check
bandit -r src/ -ll      # security scan, low severity and above
pylint src/ --fail-under=8.0
```

---

### TypeScript / JavaScript

| Tool | Role |
|------|------|
| `tsc --noEmit` | Type checking without emitting files |
| `eslint` with `typescript-eslint` | Linting with type-aware rules |
| `prettier` | Formatting (separate from linting) |

**`tsconfig.json` strict settings:**
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

**`eslint.config.mjs` (flat config, ESLint v9+):**
```js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  }
);
```

**Run commands:**
```bash
tsc --noEmit                   # type check
eslint . --max-warnings 0      # lint, fail on any warning
prettier --check "src/**/*.ts" # format check
```

---

### C# / .NET

| Tool | Role |
|------|------|
| Roslyn Analyzers | Built-in compiler warnings/errors (CA/IDE rules) |
| `dotnet format` | Formatting and analyzer fixes |
| Security Code Scan | Security-focused NuGet analyzer |
| SonarAnalyzer.CSharp | SonarQube rules as a local NuGet package |

**Enable analyzers in `.csproj`:**
```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
  <ImplicitUsings>enable</ImplicitUsings>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  <WarningsAsErrors />
  <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
  <EnableNETAnalyzers>true</EnableNETAnalyzers>
  <AnalysisMode>All</AnalysisMode>
</PropertyGroup>

<ItemGroup>
  <PackageReference Include="SonarAnalyzer.CSharp" Version="*" PrivateAssets="all" />
  <PackageReference Include="SecurityCodeScan.VS2019" Version="*" PrivateAssets="all" />
</ItemGroup>
```

**`.editorconfig` for rule severity:**
```ini
[*.cs]
dotnet_diagnostic.CA1062.severity = error    # validate public API arguments
dotnet_diagnostic.CA2007.severity = warning  # ConfigureAwait
dotnet_diagnostic.CA1031.severity = warning  # don't catch general exceptions
dotnet_diagnostic.S1135.severity = warning   # TODO comments as warnings
```

**Run commands:**
```bash
dotnet build /p:TreatWarningsAsErrors=true
dotnet format --verify-no-changes
```

---

## 2. Code Metrics to Track

### Cyclomatic Complexity

Counts the number of linearly independent paths through code. Based on number of branches (`if`, `for`, `while`, `case`, `&&`, `||`).

| Score | Assessment |
|-------|------------|
| 1–5 | Simple, easy to test |
| 6–10 | Moderate, acceptable |
| 11–20 | Complex, refactor when touched |
| 21+ | Untestable, must refactor |

**Threshold to enforce:** fail CI if any single function exceeds **15**.

### Cognitive Complexity

Penalizes nested structures more heavily than sequential ones. Better reflects how hard code is to read mentally. Preferred over cyclomatic for modern code review.

**Threshold to enforce:** fail CI if any single function exceeds **10** (SonarQube default).

### Code Coverage

| Level | Assessment |
|-------|------------|
| < 50% | Insufficient, risky changes |
| 50–70% | Minimum acceptable for legacy |
| 70–80% | Acceptable for maintained code |
| 80%+ | Target for new code (set as gate) |
| 100% | Usually over-engineered, not worth it |

**Quality gate rule:** New code introduced in a PR must have ≥ 80% coverage.

### Duplication

Duplicate code blocks are technical debt that will diverge when one copy is updated.

**Threshold:** Fail if duplication exceeds **3%** of total lines (SonarQube default: 3%).

### Maintainability Index (MI)

Composite metric combining cyclomatic complexity, Halstead volume, and lines of code. Used mainly by Visual Studio / .NET tooling.

| Score | Assessment |
|-------|------------|
| 0–9 | Low (unmaintainable) |
| 10–19 | Moderate |
| 20–100 | High (maintainable) |

---

## 3. Dependency Vulnerability Scanning

### Python — pip-audit

```bash
pip install pip-audit

# Scan against PyPI Advisory Database
pip-audit

# Scan a requirements file
pip-audit -r requirements.txt

# Output as JSON for CI parsing
pip-audit --format=json -o audit-report.json

# Fail only on high/critical (exit code 1 = vulnerabilities found)
pip-audit --fail-on-cvss 7.0
```

**CI integration:**
```yaml
- name: Security audit (pip-audit)
  run: |
    pip install pip-audit
    pip-audit -r requirements.txt --fail-on-cvss 7.0
```

### Node.js — npm audit

```bash
# Fail if any high or critical vulnerability is found
npm audit --audit-level=high

# Output JSON
npm audit --json > audit-report.json

# Use audit-ci for more control
npx audit-ci --high
```

**`audit-ci` config (`audit-ci.json`):**
```json
{
  "high": true,
  "critical": true,
  "allowlist": [
    "GHSA-xxxx-xxxx-xxxx"
  ]
}
```

### .NET — dotnet list package

```bash
# List vulnerable packages (requires NuGet.org as source)
dotnet list package --vulnerable

# Include transitive dependencies
dotnet list package --vulnerable --include-transitive

# Fail the build if vulnerabilities found (exit code 1)
dotnet list package --vulnerable --include-transitive 2>&1 | \
  grep -q "has the following vulnerable packages" && exit 1 || exit 0
```

**MSBuild approach (`.csproj`):**
```xml
<PropertyGroup>
  <!-- Treat NuGet audit warnings as errors in CI -->
  <NuGetAuditMode>all</NuGetAuditMode>
  <NuGetAuditLevel>high</NuGetAuditLevel>
  <WarningsAsErrors>NU1901;NU1902;NU1903;NU1904</WarningsAsErrors>
</PropertyGroup>
```

---

## 4. Interpreting Results and Prioritizing Fixes

### Severity Classification

| Severity | Action |
|----------|--------|
| Critical / Blocker | Fix before merge. No exceptions. |
| High / Major | Fix in same sprint or open tracked issue |
| Medium / Minor | Fix when touching the file |
| Low / Info | Fix in dedicated tech debt sprint |

### What to Fix First

1. **Security vulnerabilities** — any severity in auth, input handling, crypto, secrets
2. **Null reference / type errors** — these are runtime crashes waiting to happen
3. **Complexity > 20** — impossible to test correctly, source of hidden bugs
4. **Unused code** — dead code misleads future developers
5. **Duplication** — fix when you need to change one of the copies anyway

### What to Ignore (Pragmatically)

- Style warnings in generated code (add to ignore list or suppress at top of file)
- False positives in well-tested utility functions (use inline suppression with a comment)
- Coverage gaps in trivial boilerplate (DTOs, migrations)

**Suppression patterns:**

```python
# Python — inline suppression with reason required
result = eval(user_input)  # noqa: S307 -- safe: input is validated against allowlist

# Bandit
result = subprocess.run(cmd, shell=False)  # nosec B603
```

```typescript
// TypeScript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy API response shape
const data: any = legacyApiCall();
```

```csharp
// C#
#pragma warning disable CA1031 // reason: top-level catch-all for unhandled exception logging
catch (Exception ex) { logger.LogCritical(ex, "Unhandled exception"); }
#pragma warning restore CA1031
```

---

## 5. CI Integration — GitHub Actions

### Python Quality Pipeline

```yaml
# .github/workflows/quality-python.yml
name: Python Code Quality

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: pip install -r requirements-dev.txt

      - name: Lint (ruff)
        run: ruff check . --output-format=github

      - name: Format check (ruff)
        run: ruff format --check .

      - name: Type check (mypy)
        run: mypy src/ --junit-xml=mypy-report.xml

      - name: Security scan (bandit)
        run: bandit -r src/ -ll -f json -o bandit-report.json

      - name: Dependency audit (pip-audit)
        run: pip-audit -r requirements.txt --fail-on-cvss 7.0

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
      - run: pip install -r requirements-dev.txt
      - name: Run tests with coverage
        run: pytest --cov=src --cov-report=xml --cov-fail-under=80
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml
```

### TypeScript Quality Pipeline

```yaml
# .github/workflows/quality-typescript.yml
name: TypeScript Code Quality

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npx eslint . --max-warnings 0 --format=@microsoft/eslint-formatter-sarif --output-file=eslint-results.sarif
        continue-on-error: true

      - name: Upload ESLint results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: eslint-results.sarif

      - name: Dependency audit
        run: npm audit --audit-level=high

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - name: Run tests with coverage
        run: npx vitest run --coverage --coverage.thresholds.lines=80
```

### C# Quality Pipeline

```yaml
# .github/workflows/quality-dotnet.yml
name: .NET Code Quality

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  build-and-analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # required for SonarQube blame analysis

      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "9.x"

      - name: Build (treat warnings as errors)
        run: dotnet build /p:TreatWarningsAsErrors=true

      - name: Format check
        run: dotnet format --verify-no-changes

      - name: Run tests with coverage
        run: dotnet test --collect:"XPlat Code Coverage" --results-directory coverage/

      - name: Dependency vulnerability scan
        run: |
          dotnet list package --vulnerable --include-transitive 2>&1 | tee vuln-report.txt
          grep -q "has the following vulnerable packages" vuln-report.txt && exit 1 || echo "No vulnerabilities found"

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          directory: coverage/
```

### SonarQube Quality Gate (any language)

```yaml
  sonarqube:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: SonarQube Scan
        uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

      - name: SonarQube Quality Gate check
        uses: SonarSource/sonarqube-quality-gate-action@master
        timeout-minutes: 5
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

---

## 6. Quality Gate Configuration

### SonarQube Quality Gate (recommended defaults)

Configure under **Administration > Quality Gates** in the SonarQube UI or via API:

```
New Code conditions (what is introduced in this PR):
  - Coverage on new code         >= 80%
  - Duplicated lines on new code <= 3%
  - Maintainability rating       = A
  - Reliability rating           = A
  - Security rating              = A
  - Security hotspots reviewed   = 100%

Overall Code conditions:
  - Blocker issues               = 0
  - Critical issues              = 0
```

### `sonar-project.properties`

```properties
sonar.projectKey=my-project
sonar.sources=src
sonar.tests=tests
sonar.python.coverage.reportPaths=coverage.xml
sonar.python.version=3.12

# Exclusions
sonar.exclusions=**/migrations/**,**/__pycache__/**,**/node_modules/**
sonar.coverage.exclusions=tests/**,**/conftest.py,**/migrations/**
```

### Pre-commit hooks (fast gates, local)

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.9.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.14.0
    hooks:
      - id: mypy
        additional_dependencies: [types-requests]

  - repo: local
    hooks:
      - id: eslint
        name: ESLint
        language: node
        entry: npx eslint --fix
        types: [ts, tsx]
        pass_filenames: true
```

---

## 7. Anti-Patterns and Common Issues

### Anti-patterns to detect and reject

**God function / God class** — one function doing 5+ distinct things. Detected by: cyclomatic complexity > 15, function length > 50 lines.

**Magic numbers** — numeric literals without named constants. Pylint `W0108`, ESLint `no-magic-numbers`.

**Mutable default arguments (Python)**
```python
# Wrong — default list is shared across all calls
def add_item(item, items=[]):
    items.append(item)
    return items

# Correct
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```
Detected by: ruff rule `B006`.

**Floating promises (TypeScript)** — async calls not awaited, errors silently dropped.
```typescript
// Wrong
saveUser(data);  // fire and forget without intent

// Correct
await saveUser(data);
// or explicit: void saveUser(data);  // intentional fire-and-forget
```
Detected by: `@typescript-eslint/no-floating-promises`.

**Catching and swallowing exceptions**
```python
# Wrong — hides real errors
try:
    process()
except Exception:
    pass

# Correct — log at minimum, re-raise if unrecoverable
try:
    process()
except ValueError as e:
    logger.warning("Invalid input: %s", e)
    raise
```
Detected by: pylint `W0703`, ruff `BLE001`.

**Hardcoded credentials** — any string literal matching patterns like `password=`, `api_key=`, `token=`.
Detected by: bandit `B106`, `B107`; gitleaks in CI; trufflehog as pre-commit.

**Deeply nested conditionals** — cognitive complexity spike, symptom of missing early returns or extracted functions.
```python
# Wrong — 4 levels of nesting
def process(data):
    if data:
        if data.is_valid():
            if data.type == "A":
                if not data.is_expired():
                    return data.value

# Correct — guard clauses
def process(data):
    if not data:
        return None
    if not data.is_valid():
        return None
    if data.type != "A":
        return None
    if data.is_expired():
        return None
    return data.value
```

**Unused imports and dead code** — increases cognitive load and slows down linters. Detected by: ruff `F401`, `F841`; TypeScript `noUnusedLocals`, `noUnusedParameters`.

---

## 8. Recommended Toolchain Summary

| Stack | Linter | Type checker | Security | Dependency audit | Coverage |
|-------|--------|-------------|---------|-----------------|----------|
| Python | ruff + pylint | mypy | bandit | pip-audit | pytest-cov |
| TypeScript | eslint + typescript-eslint | tsc | eslint security plugin | npm audit / audit-ci | vitest / jest |
| C# | Roslyn analyzers | compiler | SecurityCodeScan | dotnet list --vulnerable | coverlet |
| All | SonarQube (CI) | — | SonarQube | — | SonarQube |

**Key principle:** fast tools (ruff, tsc, eslint) run on every commit via pre-commit hooks. Slow, deep tools (pylint, SonarQube, bandit full scan) run in CI on every PR. Quality gates block the merge, not the developer's local loop.
