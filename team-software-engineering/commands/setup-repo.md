---
description: >
  Configura el repositorio de GitHub con la estructura de ramas, labels,
  protecciones y GitHub Actions necesarios para el flujo del equipo.
  Ejecuta esto UNA SOLA VEZ cuando empiezas un proyecto nuevo.
  Uso: /team-software-engineering:setup-repo
---

Eres el @devops-engineer configurando el repositorio para el equipo.

Lee primero el estado actual:
```bash
gh repo view
git branch -a
gh label list
gh api repos/:owner/:repo/branches
```

Luego configura todo lo siguiente:

## 1. Estructura de ramas

```bash
# Crear ramas si no existen
git checkout -b develop 2>/dev/null || git checkout develop
git push origin develop 2>/dev/null || true

git checkout -b staging 2>/dev/null || git checkout staging  
git push origin staging 2>/dev/null || true

git checkout main
```

Flujo de ramas:
```
feature/<issue-number>-<descripcion>  →  develop  →  staging  →  main
```

## 2. Labels del equipo

```bash
# Roles
gh label create "backend"    --color "0075ca" --description "Backend task" --force
gh label create "frontend"   --color "e4e669" --description "Frontend task" --force
gh label create "qa"         --color "d93f0b" --description "QA / Testing" --force
gh label create "devops"     --color "5319e7" --description "Infrastructure" --force

# Estado
gh label create "in-progress" --color "fbca04" --description "Being worked on" --force
gh label create "blocked"      --color "b60205" --description "Blocked" --force
gh label create "ready-for-qa" --color "0e8a16" --description "Ready for QA review" --force
gh label create "approved"     --color "0e8a16" --description "QA approved" --force

# Prioridad
gh label create "priority:high"   --color "e11d48" --force
gh label create "priority:medium" --color "f97316" --force
gh label create "priority:low"    --color "84cc16" --force
```

## 3. GitHub Actions — CI en PRs

Crea `.github/workflows/ci.yml` en el repositorio:

```yaml
name: CI
on:
  pull_request:
    branches: [develop, staging, main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          # Ajustar según el stack del proyecto
          # Python:
          # pip install -r requirements.txt && pytest --cov=src -v
          # Node:
          # npm ci && npm test -- --coverage
          echo "Configure test command for your stack"
```

## 4. GitHub Actions — Deploy a Staging

Crea `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging
on:
  push:
    branches: [staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests before deploy
        run: echo "Add test command here"
      - name: Deploy to staging
        run: echo "Add deploy command here (gcloud run deploy...)"
```

## 5. GitHub Actions — Deploy a Production

Crea `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: echo "Add test command here"
      - name: Deploy to production
        run: echo "Add deploy command here"
```

## 6. Reporte final

Al terminar reporta:
- Ramas creadas
- Labels configurados
- Archivos de GitHub Actions creados
- Próximo paso: ejecutar `/team-software-engineering:sprint <idea>`
