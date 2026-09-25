---
name: agteamos-deploy
description: >
  Reemplaza a agteamos-production-readiness y agteamos-deploy-workflow
  (fusionadas). Checklist de preparacion para produccion (infraestructura,
  seguridad, observabilidad, base de datos y procedimientos de rollback)
  obligatorio como Step 0 interno antes de cualquier deploy, seguido del
  despliegue monitoreado con PRR checklist obligatorio, smoke tests
  post-deploy, verificacion de rollback y actualizacion de DORA metrics.
  Nunca despliega sin QA approval y sin haber completado el PRR.
used_by:
  - devops-engineer
  - architect
  - security-engineer
  - qa-engineer
---

# Skill: Deploy Readiness (agteamos-deploy)

## CONTRACT

- **Input**: servicio a desplegar + PR numero aprobado por @qa-engineer, o feature/release branch que ya paso QA en staging
- **Output**: PRR document en `agteamos/devops/prr/PRR-<release>.md`, firmado por todas las partes requeridas + deploy exitoso + smoke tests passing + `DORA_METRICS.md` actualizado
- **Who runs this**: @devops-engineer inicia y ejecuta el deploy exclusivamente — ningun otro agente inicia un deploy a produccion. @architect firma el sign-off del PRR. Todas las categorias del PRR deben revisarse antes de cualquier deploy a produccion.
- **PR/repository commands**: se resuelven contra el adapter de `repo_host`;
  work items se delegan a `agteamos-work-items`. Nunca hardcodear `gh`/`az`.
- **Regla de orden — Step 0 obligatorio**: la **Production Readiness Review (PRR)** es el gate que corre **ANTES** de cualquier despliegue real. Ningun merge a la rama protegida ni comando de deploy puede ejecutarse mientras el PRR tenga items sin marcar sin una excepcion de riesgo documentada con owner asignado. El "Despliegue monitoreado" (segunda mitad de esta skill) asume que el PRR ya esta completo y firmado.

---

## Production Readiness Review (PRR)

### Step 1 — Complete the PRR Checklist

Go through each category below. Every unchecked item is a blocker. Do not proceed to deploy with open blockers unless you have documented a risk acceptance and an owner.

---

#### Infrastructure

- [ ] Health check endpoint returns 200 with correct payload (not just a TCP open port)
- [ ] `docker-compose.yml` tested locally end-to-end; Docker image builds without error on a clean machine
- [ ] All environment variables documented in `.env.example` with descriptions and example values
- [ ] No secrets in codebase — run the following and confirm zero results:
  ```bash
  git log --all -p | grep -iE "password|secret|token|api_key|private_key" | grep -v ".env.example"
  ```
- [ ] Resource limits (CPU, memory) configured in container spec or Cloud Run service definition
- [ ] Service can restart cleanly after crash without manual intervention

---

#### Database

- [ ] Migration tested on staging with production-equivalent data volume
- [ ] Migration is reversible — OR — explicitly documented: "This migration is not reversible. Rollback plan: restore from backup taken at T-0."
- [ ] Indexes added for all new query patterns (no full table scans on tables > 10k rows)
- [ ] Connection pool size configured appropriately for expected load
- [ ] Backup confirmed recent (< 24 hours) before deploy window
- [ ] Long-running migration estimated: if > 30s, schedule during low-traffic window

---

#### Security

- [ ] HTTPS only — no HTTP endpoints exposed in production
- [ ] Security headers middleware active: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`
- [ ] CORS restricted to explicitly allowed origins — no wildcard `*` in production
- [ ] Rate limiting configured on all public endpoints
- [ ] Auth endpoints protected against brute force (lockout or exponential backoff)
- [ ] No debug mode, verbose stack traces, or dev tooling enabled in production config
- [ ] Dependency audit clean:
  ```bash
  # Python
  pip-audit

  # Node
  npm audit --audit-level=high
  ```

---

#### Observability

- [ ] Logs are structured (JSON format) — not plain text strings
- [ ] Error tracking configured (Sentry or equivalent) and sending events to the correct project/environment
- [ ] Uptime monitoring alert configured — notifies on-call within 2 minutes of downtime
- [ ] Error rate alert: trigger if 5xx rate exceeds 1% over 5 minutes
- [ ] Latency alert: trigger if p95 response time exceeds 1000ms
- [ ] Dashboard or runbook link referenced in alert message

---

#### Testing

- [ ] All unit tests passing (CI green on the release branch)
- [ ] E2E tests passing on staging against the exact image to be deployed
- [ ] Smoke test plan documented — minimum 5 critical paths to verify immediately post-deploy:
  ```markdown
  ## Smoke Test Plan — Release v1.2.3
  1. User can log in with valid credentials
  2. User can complete primary action (e.g., create invoice)
  3. API health endpoint returns 200
  4. No errors in Sentry in first 5 minutes post-deploy
  5. [Feature-specific critical path]
  ```

---

#### Rollback

- [ ] Rollback procedure documented and has been tested at least once on staging
- [ ] Previous Docker image tagged and available in registry (do not overwrite `latest` without a versioned tag)
- [ ] Database migration can be reversed — OR — confirmed backup exists and restore procedure is documented with estimated RTO

---

### Step 2 — Create the PRR sign-off document

Create `agteamos/devops/prr/PRR-v<semver>.md`:

```markdown
# PRR Sign-off — Release v1.2.3

**Date**: 2026-03-25
**Release manager**: @devops-engineer
**Deploy window**: 2026-03-25 18:00 UTC (low traffic)

## Checklist Status
- [ ] Infrastructure ✅
- [ ] Database ✅
- [ ] Security ✅
- [ ] Observability ✅
- [ ] Testing ✅
- [ ] Rollback ✅

## Open Items
(List any known issues with risk acceptance and owner, or write "None")

## Approved by
- @architect — 2026-03-25
- @devops-engineer — 2026-03-25

## Rollback trigger criteria
If any of the following occur within 30 minutes of deploy, initiate rollback:
- Error rate > 5%
- Any P0 functionality unavailable
- Sentry showing > 10 new error types

## Rollback command
```bash
# Cloud Run
gcloud run services update-traffic my-service --to-revisions=PREVIOUS_REVISION=100

# Docker / VPS
docker pull myapp:v1.2.2
docker-compose up -d
```
```

---

### Step 3 — Post-deploy verification

Within 15 minutes of deploy:
1. Run the smoke test plan
2. Check Sentry for new errors
3. Verify alert thresholds are not firing
4. Confirm health check endpoint is green
5. Update PRR document: add "Deploy completed at HH:MM UTC. All smoke tests passed."

---

### EXAMPLE (PRR)

**Incident caused by skipping PRR**:

Team rushed a hotfix to production without completing the PRR. The fix included a new required environment variable (`STRIPE_WEBHOOK_SECRET`) that was not added to the production environment. The service started but silently dropped all webhook events. The issue was detected 2 hours later when a customer reported payments not processing. MTTR: 2.5 hours.

**What PRR would have caught**: The Infrastructure checklist item "All environment variables documented in `.env.example`" would have flagged the new variable. The smoke test plan would have included "Webhook event processed successfully" as a critical path.

---

### ANTI-PATTERNS (PRR)

- Treating PRR as a formality and checking all boxes without actually verifying — the checklist is a tool, not a checkbox exercise
- Running PRR after the deploy has already started — PRR must be complete and signed off before any deploy command is run
- Skipping PRR for "small" changes — missing env vars, broken indexes, and misconfigured CORS have all come from "small" changes
- Not testing rollback until an actual incident — rollback procedures that have never been drilled fail under pressure
- Single person completing all PRR categories alone — the value is in multiple reviewers catching what one person misses

---

## Despliegue monitoreado

### Step 0 — Verify QA approval (HARD BLOCKER)

Never deploy without a QA approval. Check the PR reviews:

```bash
[operación: get-pr] (obtener las reviews del PR y verificar que @qa-engineer aprobó)
```

If `@qa-engineer` is not in the approved reviewers list — stop. Do not proceed. Request review from `@qa-engineer` first.

Also verify CI is green:
```bash
[operación: get-pr] (obtener el estado de los checks de CI del PR)
```

> **Nota**: la fila `get-pr` del adapter de `repo_host` no especifica
> hoy un campo de status checks — puede requerir extender esa fila o agregar
> `get-pr-status` al adapter.

If any check is not SUCCESS — stop. Fix the failing check first.

---

### Step 1 — Production Readiness Review (MANDATORY)

Execute the full "Production Readiness Review (PRR)" section de esta misma skill (arriba) antes de cualquier merge o comando de deploy.

All items must be checked. Any unchecked blocker must either be:
a) Fixed before proceeding
b) Explicitly accepted as a documented risk with an owner assigned

Create `agteamos/devops/prr/PRR-v<semver>.md` as specified above.

---

### Step 2 — Merge the PR with squash

```bash
# Squash merge to keep the history clean
[operación: merge-to-protected-branch] (mergear con squash y borrar la rama)
```

If the project uses trunk-based development, use merge commit instead:
```bash
[operación: merge-to-protected-branch] (mergear con merge commit y borrar la rama)
```

> **Nota**: la fila `merge-to-protected-branch` del adapter de `repo_host`
> define por defecto la variante squash — la variante merge-commit puede
> requerir parametrizar esa fila o documentar la variante en el adapter.

---

### Step 3 — Monitor the deploy pipeline

Watch the deployment run live:
```bash
gh run watch
```

If the deploy is triggered by the merge (via GitHub Actions), the run will appear within ~30 seconds. Watch it to completion — do not assume it will pass.

If the pipeline fails:
1. Read the full error output: `gh run view <run-id> --log-failed`
2. Determine if the failure is transient (retry) or requires a fix
3. If a fix is required — do NOT force-push or bypass the pipeline — fix and create a new PR

---

### Step 4 — Run smoke tests post-deploy

Execute these immediately after the pipeline shows green:

```bash
#!/bin/bash
# smoke-test.sh — run this after every production deploy

BASE_URL="${1:-https://api.yourapp.com}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" == "$expected_status" ]; then
    echo "PASS: $name ($status)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name — expected $expected_status, got $status"
    FAIL=$((FAIL + 1))
  fi
}

# 1. Health check
check "Health endpoint" "$BASE_URL/health"

# 2. Auth — expect 401 without token (proves auth is active)
check "Auth guard active" "$BASE_URL/api/v1/invoices" 401

# 3. Public endpoint (if applicable)
check "Public endpoint" "$BASE_URL/api/v1/status"

# 4. Feature-specific critical path (customize per service)
# check "Invoice creation available" "$BASE_URL/api/v1/invoices" 401

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
```

Run with: `bash smoke-test.sh https://api.yourapp.com`

If any smoke test fails — initiate rollback immediately (Step 7).

---

### Step 5 — Verify security headers

```bash
curl -I https://api.yourapp.com/health 2>/dev/null | grep -iE \
  "(strict-transport|x-content-type|x-frame-options|content-security|referrer-policy)"
```

Expected output (all must be present):
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

If any header is missing — raise a P1 ticket and notify @security-engineer.

---

### Step 6 — Update DORA metrics

Record this deployment in `agteamos/devops/DORA_METRICS.md`:

```markdown
## Deploy log — YYYY-MM-DD

| Field | Value |
|-------|-------|
| Deploy time | YYYY-MM-DDTHH:MM:SSZ |
| First commit (this feature) | YYYY-MM-DDTHH:MM:SSZ |
| Lead time | X hours |
| PR number | #N |
| Release | v1.2.3 |
| Outcome | Success |
```

Execute the `agteamos-metrics` skill to recalculate the sprint metrics if this is the sprint's last deployment.

### Step 6.1 — Actualizar documentación operacional derivada

Después de persistir el resultado real del deploy en
`agteamos/devops/` (`PRR`, infraestructura y métricas aplicables), ejecutar:

```text
agteamos-knowledge --human-docs --scope changed
```

El target es `docs/operations.md`; también `docs/architecture.md` solo si las
fuentes canónicas registran un cambio arquitectónico. No derivar datos del
output efímero del pipeline ni inventar valores. Mostrar diff antes de
reemplazar una sección administrada.

---

### Step 7 — Rollback procedure (if smoke tests fail)

**Decision criteria**: If any of the following occur within 30 minutes of deploy:
- Error rate > 5% (check Sentry or equivalent)
- Any P0 functionality unavailable (smoke test failure)
- Sentry showing > 10 new error types not present before deploy

**Rollback by platform**:

#### Google Cloud Run
```bash
# List recent revisions
gcloud run revisions list --service my-service --region us-central1

# Route 100% traffic to the previous revision
gcloud run services update-traffic my-service \
  --region us-central1 \
  --to-revisions=PREVIOUS_REVISION_NAME=100
```

#### Fly.io
```bash
# List recent deploys
fly releases list -a my-app

# Rollback to previous version
fly deploy --image registry.fly.io/my-app:<previous-version>
```

#### VPS / Docker Compose
```bash
# Pull the previously tagged image (never overwrite 'latest' without a versioned tag)
docker pull myapp:v1.2.2

# Update the compose file to pin the previous version, then redeploy
docker-compose up -d
```

After rollback:
1. Confirm smoke tests pass with the previous version
2. Create a post-mortem ticket with the rollback reason
3. Update DORA_METRICS.md: mark the deployment as `Failed + Rollback`, record MTTR
4. Persist the changed operational source under `agteamos/devops/` and rerun
   `agteamos-knowledge --human-docs --scope changed`

---

### EXAMPLES (Despliegue monitoreado)

**Successful deploy sequence**:
```
1. [operación: get-pr] (reviews) → qa-engineer: APPROVED ✓
2. [operación: get-pr] (status checks) → all SUCCESS ✓
3. production-readiness checklist → all items checked ✓
4. [operación: merge-to-protected-branch] (squash + delete branch) ✓
5. gh run watch → deploy pipeline GREEN ✓
6. bash smoke-test.sh https://api.myapp.com → 3/3 passed ✓
7. Security headers → all 5 present ✓
8. DORA_METRICS.md updated ✓
```

**Failed deploy — rollback triggered**:
```
Smoke test FAIL: Auth guard active — expected 401, got 500
→ Error rate spike detected in Sentry (15 new error types)
→ Rollback initiated: gcloud run services update-traffic ...
→ Smoke tests re-run: 3/3 passed ✓
→ MTTR: 8 minutes
→ Post-mortem ticket created: #43
```

---

### ANTI-PATTERNS (Despliegue monitoreado)

- Deploying without QA approval — the review process exists because the deployer is too close to the code to catch all issues
- Skipping the PRR for "small" changes — missing env vars and misconfigured CORS have both come from "small" hotfixes
- Not watching the pipeline live — silent failures are common; assumptions that CI will pass are not
- Overwriting the `latest` Docker tag without a versioned tag — makes rollback impossible
- Running smoke tests from localhost against staging instead of against the production URL — the point is to verify the production deployment
- Updating DORA metrics only when convenient — the data is only useful if it is complete and consistent

---

## Próximo paso sugerido

**Próximo paso sugerido**: `agteamos-metrics` (registrar DORA) — o
`agteamos-incidents` si algo falló en el despliegue (ver `agteamos-context`
§Próximo paso).
</content>
