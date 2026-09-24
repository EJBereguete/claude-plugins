---
topic: entrega-y-operaciones
description: Convenciones de Git (commits, branching) y DevOps (Docker, CI/CD, health checks, produccion)
keywords: [commit, branch, conventional-commits, pr, merge, rebase, docker, ci, cd, pipeline, deploy, healthcheck, compose]
globs: ["**/Dockerfile*", "**/docker-compose*.yml", "**/.github/workflows/*.yml", "**/azure-pipelines.yml"]
first_consumers: [implement, devops-engineer, deploy-readiness]
---

# Entrega y Operaciones

## Git

Conventional Commits enforced by commitlint. Branch naming enforced by branch protection rules.

---

### Conventional Commits

Format: `type(scope): description`

#### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature visible to the user |
| `fix` | Bug fix visible to the user |
| `test` | Adding or fixing tests (no production code change) |
| `refactor` | Code restructuring — no new behavior, no bug fixed |
| `docs` | Documentation changes only |
| `chore` | Maintenance: dependency updates, config, tooling |
| `ci` | CI/CD pipeline changes |
| `perf` | Performance improvement |
| `revert` | Reverting a previous commit |

#### Rules

- **Present tense, imperative mood:** "add" not "added" or "adds"
- **Lowercase** — type, scope, and description
- **No period** at the end of the description
- **Scope** is mandatory — use the module/domain name
- **Breaking change:** append `!` after the type: `feat(auth)!: replace session auth with JWT`
- **Body optional** — use it when the _why_ isn't obvious from the title
- **Max 72 chars** for the first line

#### Good vs Bad Examples

```
# ✅ GOOD
feat(auth): add Google OAuth integration
fix(invoices): correct total calculation when discount applied
test(users): add unit tests for registration endpoint
refactor(payments): extract stripe client to dedicated module
chore: upgrade fastapi to 0.115.0
ci: add coverage reporting step to pull request workflow
perf(invoices): add database index on user_id and status columns
docs(api): document authentication endpoints in openapi spec
feat(invoices)!: change invoice number format from INT to UUID

# ❌ BAD
fixed the login bug              ← no type, past tense
WIP                              ← not meaningful
feat: Updated lots of stuff      ← too vague, past tense
Fix(Auth): Fixed Login Bug.      ← capitalized, has period
feat: add new feature            ← scope missing, description too vague
hotfix                           ← not a valid type, no description
```

#### Commit Body — When to Use It

Use the body when the **why** isn't obvious from the title. Separate with a blank line.

```
fix(invoices): prevent double charge on payment retry

Stripe webhooks were being processed twice when the initial HTTP response
timed out. Added idempotency key based on invoice_id + attempt_number
to prevent duplicate PaymentIntent creation.

Closes #183
```

---

### Branch Naming

| Pattern | Use case |
|---------|----------|
| `feature/{id}-{slug}` | New feature or enhancement |
| `bugfix/{id}-{slug}` | Bug fix on a non-production branch |
| `hotfix/{id}-{slug}` | Emergency fix applied directly to main |
| `refactor/{id}-{slug}` | Code restructuring without behavior change |
| `spike/{id}-{slug}` | Research, prototyping, exploration |

`{id}` is the task or ticket identifier. `{slug}` is a short kebab-case description.

```
# ✅ GOOD
feature/TASK-42-invoice-pdf-export
bugfix/TASK-67-fix-vat-rounding
hotfix/TASK-99-patch-auth-bypass
refactor/TASK-55-extract-payment-service
spike/TASK-12-evaluate-tiptap-vs-lexical

# ❌ BAD
my-branch
fix-stuff
johns-work
TASK-42             ← missing description
feature/invoice     ← missing task id
```

---

### commitlint Configuration

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],           // scope is required
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [1, 'always', 120],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'test', 'refactor', 'docs', 'chore', 'ci', 'perf', 'revert'],
    ],
  },
}
```

Install the hook via Husky:

```bash
# package.json
{
  "scripts": {
    "prepare": "husky"
  },
  "devDependencies": {
    "@commitlint/cli": "^19.0.0",
    "@commitlint/config-conventional": "^19.0.0",
    "husky": "^9.0.0"
  }
}
```

```bash
# .husky/commit-msg
npx --no -- commitlint --edit "$1"
```

---

### Pull Request Template

```markdown
<!-- .github/pull_request_template.md -->

## Summary

- <!-- What does this PR do? One bullet per logical change -->
-
-

## Type of Change

- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] refactor — no behavior change
- [ ] test — tests only
- [ ] chore — maintenance
- [ ] docs — documentation

## Acceptance Criteria Verification

<!-- Copy the ACs from the task and check them off -->

- [ ] AC1:
- [ ] AC2:
- [ ] AC3:

## Test Plan

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated (if applicable)
- [ ] Manual testing performed on local environment
- [ ] Edge cases covered: <!-- list them -->

## Screenshots

<!-- Required for UI changes. Before/After if fixing a visual bug. -->

| Before | After |
|--------|-------|
| | |

## Checklist

- [ ] Code follows the style guide (linter passes)
- [ ] Tests pass locally (`pytest` / `npm test`)
- [ ] Coverage does not decrease
- [ ] No secrets or credentials in code
- [ ] `.env.example` updated if new env vars added
- [ ] Migrations tested (if DB changes)

Closes #<!-- issue number -->
```

---

### Merge Strategy

| Scenario | Strategy |
|----------|----------|
| Feature branch into `develop` or `main` | **Squash merge** — one clean commit per PR |
| `develop` into `staging` | **Merge commit** — preserve traceability |
| `staging` into `main` | **Merge commit** — preserve traceability |
| WIP commits before opening PR | **Interactive rebase** — clean up locally before pushing |

**Rationale for squash merge on feature branches:** a feature branch accumulates "wip", "fix typo", and "address review" commits. The squash produces one atomic, correctly-named commit in the main history.

```bash
# Before opening a PR: clean up your local commits
git rebase -i origin/develop

# In the editor: squash or fixup intermediate commits
# Leave only meaningful commits with proper Conventional Commit messages
```

**Never:**
- Merge without all CI checks passing
- Force push to protected branches (`main`, `develop`, `staging`)
- Merge your own PR without at least one reviewer approval

---

### Branch Protection Rules (GitHub)

Required settings for `main` and `develop`:

```
Require a pull request before merging
  ✅ Required approvals: 1
  ✅ Dismiss stale pull request approvals when new commits are pushed
  ✅ Require review from Code Owners (if CODEOWNERS file exists)

Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  ✅ Required checks:
      - ci/test
      - ci/lint
      - ci/coverage

✅ Require conversation resolution before merging
✅ Do not allow bypassing the above settings (apply to admins too)
✅ Restrict who can push to matching branches (only CI/CD service accounts)
```

---

### Git Workflow Reference

#### Personal projects (`feature/* → main`)

```
main
 └── feature/TASK-42-invoice-pdf-export
      ↓ (squash merge via PR)
main
```

#### Company projects (`feature/* → develop → staging → main`)

```
main
 └── develop
      └── feature/TASK-42-invoice-pdf-export
           ↓ (squash merge via PR)
      develop
           ↓ (merge commit, scheduled release)
      staging
           ↓ (merge commit, after QA sign-off)
      main
```

#### Emergency hotfix

```bash
git checkout main
git checkout -b hotfix/TASK-99-patch-auth-bypass
# make fix
git push origin hotfix/TASK-99-patch-auth-bypass
# open PR → squash merge to main → cherry-pick or merge to develop
```

---

### Git Hooks Setup (Husky + lint-staged)

```
.husky/
  pre-commit
  commit-msg
  pre-push
.commitlintrc.yml
package.json  ← lint-staged config
```

```bash
npm install --save-dev husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init
```

`.husky/pre-commit` (target: under 10s — lint staged files only, never the whole project):
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx lint-staged
# Python: git diff --cached --name-only --diff-filter=ACM | grep '\.py$' | xargs ruff check --fix
```

`.husky/pre-push` (target: under 60s — block direct pushes to protected branches, run full tests):
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "staging" ] || [ "$BRANCH" = "develop" ]; then
  echo "ERROR: Direct push to '$BRANCH' is not allowed. Open a PR."
  exit 1
fi
npm test -- --passWithNoTests
```

Python alternative — `pre-commit` framework instead of Husky:
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4
    hooks: [{id: ruff, args: [--fix]}, {id: ruff-format}]
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.10.0
    hooks: [{id: mypy}]
```
Install: `pip install pre-commit && pre-commit install --hook-type commit-msg`

---

### GitHub Actions — PR Validation Workflow

```yaml
# .github/workflows/pr-validation.yml
name: PR Validation
on:
  pull_request:
    branches: [main, develop, staging]
jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: wagoid/commitlint-github-action@v6
        with: { configFile: .commitlintrc.yml }
  pr-title:
    runs-on: ubuntu-latest
    steps:
      - uses: amannn/action-semantic-pull-request@v5
        env: { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" }
```

Branch protection required checks: `lint-and-test`, `commitlint`, `pr-title`.

---

### Conflict Resolution Strategy

**Prevention:** keep feature branches short-lived (< 3 days), rebase on `develop` daily, communicate when touching shared files (migrations, config, constants).

```bash
git fetch origin
git checkout feature/42-user-auth
git rebase origin/develop
# resolve each conflict, then:
git add <resolved-file>
git rebase --continue
git push --force-with-lease origin feature/42-user-auth   # only your own branch
```

Decision rules: when in doubt, talk to the other author — don't guess intent. Lock files (`package-lock.json`, `poetry.lock`) — regenerate, never merge manually. Migration conflicts — coordinate with the team, never auto-resolve. Abort with `git rebase --abort`.

---

### Common Git Commands Reference

```bash
git branch -a                                # List all branches (local + remote)
git push origin --delete feature/42-x        # Delete remote branch
git fetch origin && git rebase origin/develop  # Sync without merge commit
git add -p                                   # Stage hunks interactively
git log --oneline --graph --decorate --all   # Visual branch history
git diff origin/develop...HEAD               # Changes since branching
git restore <file>                           # Discard unstaged changes (safe)
git revert <commit-hash>                     # Revert a commit (safe, new commit)
# git reset --hard HEAD~1                    # DANGER: destroys last commit permanently
git remote prune origin                      # Remove stale remote-tracking branches
gh pr merge --squash --delete-branch         # Squash merge and delete branch
```

---

### Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Committing directly to `main` | Bypasses review, breaks CI gate | Always use a branch + PR |
| Giant PRs (1000+ lines) | Impossible to review properly | Split by logical layer/concern |
| `git push --force` on shared branches | Rewrites history, breaks team's local copies | Use `--force-with-lease` only on your own branch |
| Vague commit messages (`fix`, `wip`) | Useless history for debugging/releases | Follow Conventional Commits |
| Long-lived feature branches (weeks) | Massive merge conflicts | Keep < 1 week, use feature flags |
| Skipping hooks with `--no-verify` | Lets non-compliant code into the repo | Fix the underlying issue instead |
| Squashing hotfixes | Loses audit trail for security/compliance | Use merge commit for hotfixes |
| Auto-resolving lock file conflicts | Inconsistent dependency trees | Regenerate with the package manager |

---

### Semantic Versioning Reference

Conventional Commits map directly to SemVer bumps:

```
fix:, perf:                →  PATCH   1.0.0 → 1.0.1
feat:                      →  MINOR   1.0.0 → 1.1.0
feat!:, BREAKING CHANGE:   →  MAJOR   1.0.0 → 2.0.0
```

Automate version bumps with `semantic-release` or `release-please` based on commit history.

---

## DevOps

Applies to all services. Covers Docker, local development, CI/CD, health checks, SLOs, and production readiness.

---

### Dockerfile Best Practices

#### Python — Multi-stage build

```dockerfile
# Dockerfile
# Stage 1: build dependencies in isolation
FROM python:3.12-slim AS builder

WORKDIR /app

# Copy and install dependencies before copying source code
# This layer is cached as long as requirements.txt doesn't change
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Stage 2: lean runtime image
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy only the installed packages, not the build tools
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application source
COPY src/ ./src/

# Run as non-root — never run production containers as root
RUN useradd --no-create-home --shell /bin/false appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Health check so orchestrators know when the container is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

#### Node/TypeScript frontend — Multi-stage build

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

COPY . .
RUN npm run build

# Stage 2: serve static files with nginx
FROM nginx:1.27-alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Non-root nginx
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid
USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:80/index.html || exit 1
```

#### Rules

- Always pin to a specific version tag — **never use `latest`**
  - `python:3.12-slim` not `python:latest`
  - `postgres:16` not `postgres:latest`
- Multi-stage builds: keep the runtime image as small as possible
- Non-root user always — use `useradd` or `adduser`
- `HEALTHCHECK` always defined — required for Kubernetes/Cloud Run liveness probes
- `.dockerignore` always present

```dockerignore
# .dockerignore
.git
.github
.env
.env.*
__pycache__/
*.pyc
*.pyo
.pytest_cache/
.coverage
htmlcov/
node_modules/
dist/
.vite/
*.md
Dockerfile*
docker-compose*.yml
```

---

### docker-compose.yml — Local Development

Full stack local environment. Services communicate over the internal Docker network.

```yaml
# docker-compose.yml
name: myapp

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:localpass@db:5432/appdb
      JWT_SECRET: local-dev-secret-not-for-production
      ENVIRONMENT: development
      CORS_ALLOWED_ORIGINS: "http://localhost:5173"
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./src:/app/src  # hot reload in development
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      start_period: 20s
      retries: 3
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: builder  # use builder stage for hot reload
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:8000
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
    command: npm run dev -- --host
    depends_on:
      - api

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: localpass
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped

  # Optional: DB admin UI for local development only
  adminer:
    image: adminer:4
    ports:
      - "8080:8080"
    depends_on:
      - db
    profiles:
      - tools  # only starts with: docker compose --profile tools up

volumes:
  postgres_data:
  redis_data:
```

Start local stack:

```bash
# Start all services
docker compose up --build

# With optional tools (adminer)
docker compose --profile tools up

# Background mode
docker compose up -d

# View logs for a specific service
docker compose logs -f api

# Run a one-off command (e.g., database migrations)
docker compose exec api alembic upgrade head
```

---

### GitHub Actions CI Template

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true  # cancel redundant runs on new push

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - run: pip install ruff mypy

      - name: Ruff lint
        run: ruff check src/

      - name: Type check
        run: mypy src/ --strict

  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: lint

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql+asyncpg://postgres:testpass@localhost:5432/testdb
      JWT_SECRET: test-secret-key
      ENVIRONMENT: test

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - name: Install dependencies
        run: pip install -r requirements.txt -r requirements-dev.txt

      - name: Run migrations
        run: alembic upgrade head

      - name: Run tests
        run: pytest --cov=src --cov-report=xml --cov-fail-under=80 -v

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage.xml
          fail_ci_if_error: true

  test-frontend:
    name: Frontend Tests
    runs-on: ubuntu-latest
    needs: lint
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: frontend/coverage/lcov.info
          flags: frontend

  security-scan:
    name: Secret Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

### Health Check Standard

Every service exposes `GET /health`. This endpoint must:
- Return `200 OK` when the service and all dependencies are operational
- Return `503 Service Unavailable` when any critical dependency is degraded
- Never require authentication
- Respond within 5 seconds

```python
# src/routers/health.py
from fastapi import APIRouter, status
from sqlalchemy import text
from datetime import datetime, timezone

from src.database import AsyncSessionLocal
from src.config import settings

router = APIRouter(tags=["health"])

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    dependencies: dict[str, str] = {}
    all_healthy = True

    # Check database
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        dependencies["database"] = "healthy"
    except Exception:
        dependencies["database"] = "unhealthy"
        all_healthy = False

    # Check Redis (if used)
    try:
        await redis_client.ping()
        dependencies["redis"] = "healthy"
    except Exception:
        dependencies["redis"] = "unhealthy"
        all_healthy = False

    response_status = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=response_status,
        content={
            "status": "healthy" if all_healthy else "degraded",
            "version": settings.app_version,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "dependencies": dependencies,
        },
    )
```

Expected response format:

```json
{
  "status": "healthy",
  "version": "1.2.3",
  "timestamp": "2026-03-25T10:00:00Z",
  "dependencies": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

Degraded response (returns HTTP 503):

```json
{
  "status": "degraded",
  "version": "1.2.3",
  "timestamp": "2026-03-25T10:00:00Z",
  "dependencies": {
    "database": "healthy",
    "redis": "unhealthy"
  }
}
```

---

### Production Readiness Checklist (PRR)

Complete this checklist before any production deployment. All items must be checked.

#### Infrastructure

- [ ] Health check endpoint returns `200` and all dependencies show `healthy`
- [ ] HTTPS enforced — no HTTP traffic reaches the application
- [ ] Rate limiting configured on all public endpoints
- [ ] CORS allowlist contains only production domains (no `*`, no localhost)
- [ ] Security headers middleware active and verified with securityheaders.com

#### Configuration

- [ ] All environment variables documented in `.env.example`
- [ ] No secrets hardcoded in source code (confirmed by gitleaks scan)
- [ ] All secrets rotated from development values (JWT secret, DB password, API keys)
- [ ] `ENVIRONMENT=production` set — debug mode off, verbose logging off

#### Database

- [ ] All migrations applied and tested on a staging environment with production data volume
- [ ] Rollback migration exists and tested (`alembic downgrade -1`)
- [ ] Database connection pool configured appropriately for expected load
- [ ] Backup strategy confirmed — automated backups enabled, retention policy defined

#### Observability

- [ ] Structured JSON logging in production (not plaintext)
- [ ] Error rate alert configured (trigger: > 1% 5xx over 5 minutes)
- [ ] Latency alert configured (trigger: p95 > 1s for 5 minutes)
- [ ] Availability alert configured (trigger: health check failing for 2+ minutes)
- [ ] Deployment tracked in monitoring tool (annotation/event)

#### Rollback

- [ ] Previous Docker image tag identified and accessible
- [ ] Rollback command documented and tested:
  ```bash
  # Cloud Run rollback
  gcloud run services update-traffic SERVICE_NAME \
    --to-revisions=PREVIOUS_REVISION=100 \
    --region=REGION
  ```
- [ ] Database rollback procedure documented if migrations are included

#### Security

- [ ] Container running as non-root user
- [ ] No sensitive data logged (passwords, tokens, PII)
- [ ] API responses do not expose internal fields (hashed_password, internal IDs)
- [ ] Input validation active on all endpoints

---

### SLO / SLI Definitions

#### Availability

| Metric | Target | Measurement |
|--------|--------|-------------|
| SLO: Uptime | 99.9% per month | Health check endpoint from external monitor |
| Error budget | 43 minutes downtime/month | Calculated from SLO |
| Alert threshold | Health check fails for 2+ consecutive minutes | Page on-call immediately |

#### Latency

| Metric | Target | Measurement |
|--------|--------|-------------|
| SLI: p50 API latency | < 100ms | `response_time_seconds` histogram |
| SLI: p95 API latency | < 500ms | `response_time_seconds` histogram |
| SLI: p99 API latency | < 2s | `response_time_seconds` histogram |
| Alert threshold | p95 > 1s for 5 minutes | Page on-call |

#### Error Rate

| Metric | Target | Measurement |
|--------|--------|-------------|
| SLO: 5xx error rate | < 0.1% of requests | `http_requests_total{status=~"5.."}` / total |
| Alert threshold | > 1% 5xx over 5 minutes | Page on-call immediately |
| 4xx monitoring | Track but do not alert | High 4xx can indicate abuse or client bugs |

#### Measuring in GitHub Actions (smoke test after deploy)

```yaml
# .github/workflows/post-deploy-check.yml
name: Post-Deploy Health Check

on:
  workflow_run:
    workflows: ["Deploy to Production"]
    types: [completed]

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - name: Wait for service to stabilize
        run: sleep 30

      - name: Health check
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://api.yourdomain.com/health)
          if [ "$response" != "200" ]; then
            echo "Health check failed with status $response"
            exit 1
          fi
          echo "Service healthy"

      - name: Verify API version
        run: |
          version=$(curl -s https://api.yourdomain.com/health | jq -r '.version')
          echo "Deployed version: $version"

      - name: Notify on failure
        if: failure()
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d '{"text": "⚠️ Post-deploy health check failed on production. Review deployment immediately."}'
```

#### Structured logging format (for log aggregation)

```python
# src/config/logging.py
import logging
import json
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": "api",
            "version": settings.app_version,
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        if hasattr(record, "user_id"):
            log_entry["user_id"] = record.user_id
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        return json.dumps(log_entry)

# Configure in main.py
if settings.environment == "production":
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logging.root.addHandler(handler)
    logging.root.setLevel(logging.INFO)
```
