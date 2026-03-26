# Skill: DevOps Workflows

## Flujo de environments

```
Empresa: feature/* → develop → staging → main (production)
Personal: feature/* → main
```

Cada merge debe pasar CI/CD completo antes de avanzar.

---

## Dockerfile — mejores practicas

```dockerfile
# Python/FastAPI — multi-stage build
FROM python:3.12-slim AS builder
WORKDIR /app

# Copiar requirements primero (aprovecha layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.12-slim AS runtime
WORKDIR /app

# Usuario no-root — seguridad obligatoria
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

# Copiar solo el venv del builder, no las dev tools
COPY --from=builder /root/.local /home/appuser/.local
COPY --chown=appuser:appgroup . .

# Metadata
LABEL maintainer="team@example.com"
LABEL version="1.0.0"

USER appuser

EXPOSE 8000

# Healthcheck integrado en imagen
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# Node.js/TypeScript — multi-stage build
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# ci en lugar de install: reproducible, respeta package-lock.json
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copiar solo lo necesario del builder (no node_modules de dev)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json .

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "dist/server.js"]
```

**Reglas del Dockerfile:**
- Siempre multi-stage: build separado de runtime
- Usuario no-root: siempre crear y usar usuario sin privilegios
- COPY de requirements ANTES del COPY del codigo (cache de layers)
- HEALTHCHECK integrado en la imagen
- Imagen base: preferir `-slim` o `-alpine` sobre la imagen completa
- No instalar herramientas de build en la imagen final
- No hardcodear secrets — usar variables de entorno o secrets de runtime

---

## GitHub Actions — workflow completo

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, staging, develop]
  pull_request:
    branches: [main, staging, develop]

# Permisos minimos necesarios (principio de menor privilegio)
permissions:
  contents: read
  packages: write

env:
  PYTHON_VERSION: "3.12"
  NODE_VERSION: "20"
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ─── 1. TEST ───────────────────────────────────────────
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4  # Pinear actions a SHA en repos criticos

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: "pip"

      - name: Install dependencies
        run: pip install -r requirements-dev.txt

      - name: Lint
        run: |
          ruff check src/
          mypy src/

      - name: Test with coverage
        run: pytest --cov=src --cov-report=xml --cov-fail-under=80

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # ─── 2. BUILD ──────────────────────────────────────────
  build:
    name: Build Docker Image
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image-digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ─── 3. DEPLOY (staging) ───────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    needs: build
    runs-on: ubuntu-latest
    environment: staging          # Requiere aprobacion manual si configurado
    if: github.ref == 'refs/heads/staging'
    steps:
      - name: Deploy to Cloud Run (staging)
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: myapp-staging
          region: us-central1
          image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          env_vars: |
            DATABASE_URL=${{ secrets.STAGING_DATABASE_URL }}
          secrets: |
            API_KEY=myapp-api-key:latest

  # ─── 4. DEPLOY (production) ────────────────────────────
  deploy-production:
    name: Deploy to Production
    needs: build
    runs-on: ubuntu-latest
    environment: production        # Requiere aprobacion manual
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Cloud Run (production)
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: myapp-prod
          region: us-central1
          image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

**Seguridad en GitHub Actions:**
- Pinear actions a commit SHA completo en workflows criticos: `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`
- Permisos minimos: definir `permissions` explicitamente, no dejar defaults
- OIDC para cloud providers: evitar secretos de larga duracion con AWS/GCP/Azure
- No interpolar inputs no confiables (PR title, branch name) directamente en shell
- Usar `environment` con required reviewers para deployments a produccion

```yaml
# OIDC — autenticacion sin secretos de larga duracion (GCP)
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: "projects/123/locations/global/workloadIdentityPools/..."
    service_account: "deployer@my-project.iam.gserviceaccount.com"
```

---

## Secrets — reglas absolutas

| Donde | Como |
|-------|------|
| Codigo fuente | NUNCA — ni encriptado |
| Dockerfile (ENV) | NUNCA |
| docker-compose.yml | NUNCA en el repo |
| CI/CD | GitHub Secrets (`${{ secrets.NAME }}`) |
| Produccion (Cloud) | Secret Manager (GCP) / AWS Secrets Manager / Vault |
| Local desarrollo | `.env` local (nunca commiteado) |

```bash
# .gitignore — siempre incluir
.env
.env.local
.env.*.local
*.pem
*.key
secrets/
```

---

## Environment management

```
dev     → .env.development — datos de prueba, DB local
staging → GitHub Secrets (staging) — espejo de prod con datos anonimizados
prod    → GitHub Secrets (production) + Secret Manager — datos reales
```

```yaml
# docker-compose.yml — desarrollo local (secrets solo localmente)
services:
  app:
    build: .
    env_file: .env.development  # .env.development en .gitignore
    ports:
      - "8000:8000"

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp_dev
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpassword  # Solo para dev local, no prod
```

---

## Health check — endpoint obligatorio

```python
# FastAPI — health check completo
from datetime import datetime, timezone
from fastapi import APIRouter, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check(session: AsyncSession = Depends(get_session)):
    checks = {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

    # Verificar conectividad a DB (opcional pero recomendado)
    try:
        await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
        checks["status"] = "degraded"

    return checks

# Response:
# { "status": "ok", "timestamp": "2024-01-15T10:30:00Z", "database": "ok" }
```

```typescript
// Express/NestJS
@Get('/health')
health(): HealthResponse {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version,
  }
}
```

---

## Rollback

```bash
# Cloud Run — rollback a revision anterior
gcloud run services update-traffic myapp \
  --to-revisions=myapp-00042-abc=100 \
  --region=us-central1

# Docker Compose (VPS) — imagen con tag de git SHA
docker-compose pull
IMAGE_TAG=abc1234 docker-compose up -d

# GitHub Actions — disparar workflow de rollback manualmente
gh workflow run rollback.yml -f version=v1.2.3
```

---

## Monitoreo post-deploy minimo

- Healthcheck cada 30s con alerta si falla 3 veces consecutivas
- Alerta en error rate > 1% durante 5 minutos
- Logs estructurados en JSON con campos: `level`, `message`, `timestamp`, `request_id`
- Sentry o equivalente para errores de aplicacion con contexto
- Notificacion al canal del equipo en deploy exitoso/fallido

```python
# Logs estructurados — Python
import structlog

log = structlog.get_logger()
log.info("user_created", user_id=str(user.id), email=user.email)
# Output: {"event": "user_created", "user_id": "...", "email": "...", "timestamp": "..."}
```

## Checklist de enforcement

- [ ] Dockerfile usa multi-stage build
- [ ] Dockerfile ejecuta con usuario no-root
- [ ] HEALTHCHECK definido en el Dockerfile
- [ ] Ningun secret en el codigo ni en el Dockerfile
- [ ] GitHub Actions usa `environment` con reviewers para prod
- [ ] Actions de terceros pineadas a version o SHA especifico
- [ ] `permissions` minimas definidas en el workflow
- [ ] Health endpoint responde en menos de 200ms
- [ ] Logs en formato JSON estructurado
- [ ] Rollback documentado y probado
