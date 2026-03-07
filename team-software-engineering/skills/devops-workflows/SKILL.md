# Skill: DevOps Workflows

## Flujo de environments

```
feature/* → develop → staging → main (production)
```

Cada merge debe pasar CI/CD completo antes de avanzar.

## GitHub Actions — estructura base

```yaml
name: CI/CD

on:
  push:
    branches: [main, staging, develop]
  pull_request:

env:
  NODE_VERSION: '20'
  PYTHON_VERSION: '3.12'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup
        uses: actions/setup-node@v4  # o setup-python
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: # comando de deploy de la plataforma
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

## Docker — mejores prácticas

```dockerfile
# Multi-stage: build separado del runtime
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app
# Usuario no-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["node", "server.js"]
```

## Secrets — reglas absolutas

- Nunca en el código
- Nunca en variables de entorno del Dockerfile
- Siempre en GitHub Secrets → accedidos como `${{ secrets.NAME }}`
- En producción: plataforma de secrets (Secret Manager, Vault, etc.)

## Healthcheck — endpoint obligatorio

```python
# FastAPI
@app.get("/health")
async def health():
    # opcionalmente verifica DB connection
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
```

## Rollback

```bash
# Rollback rápido en GitHub Actions
gh workflow run rollback.yml -f version=<tag-anterior>

# Docker Compose en VPS
docker-compose pull app-previous-version
docker-compose up -d

# Cloud Run
gcloud run services update-traffic SERVICE \
  --to-revisions=REVISION=100
```

## Monitoreo post-deploy mínimo

- Healthcheck cada 30s
- Alertas en errores 5xx
- Logs estructurados (JSON)
- Sentry para errores de aplicación
- Notificación al canal del equipo en deploy exitoso/fallido
