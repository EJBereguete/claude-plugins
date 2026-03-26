---
name: deploy-workflow
description: >
  Despliegue monitoreado con PRR checklist obligatorio, smoke tests post-deploy,
  verificacion de rollback y actualizacion de DORA metrics. Nunca despliega
  sin QA approval y produccion-readiness check.
used_by:
  - devops-engineer
---

# SKILL: Deploy Workflow

## CONTRACT

- **Input**: servicio a desplegar + PR numero aprobado por @qa-engineer
- **Output**: deploy exitoso + smoke tests passing + DORA_METRICS.md actualizado
- **Who runs this**: @devops-engineer exclusively — no other agent initiates a production deploy

---

## PROCESS

### Step 0 — Verify QA approval (HARD BLOCKER)

Never deploy without a QA approval. Check the PR reviews:

```bash
gh pr view <PR_NUMBER> --json reviews --jq '.reviews[] | select(.state == "APPROVED") | .author.login'
```

If `@qa-engineer` is not in the approved reviewers list — stop. Do not proceed. Request review from `@qa-engineer` first.

Also verify CI is green:
```bash
gh pr view <PR_NUMBER> --json statusCheckRollup --jq '.statusCheckRollup[] | select(.state != "SUCCESS") | .name'
```

If any check is not SUCCESS — stop. Fix the failing check first.

---

### Step 1 — Production Readiness Review (MANDATORY)

Execute the full `production-readiness` skill checklist before any merge or deploy command.

All items must be checked. Any unchecked blocker must either be:
a) Fixed before proceeding
b) Explicitly accepted as a documented risk with an owner assigned

Create `/docs/04-project/PRR-v<semver>.md` as specified in the `production-readiness` skill.

---

### Step 2 — Merge the PR with squash

```bash
# Squash merge to keep the history clean
gh pr merge <PR_NUMBER> --squash --delete-branch
```

If the project uses trunk-based development, use merge commit instead:
```bash
gh pr merge <PR_NUMBER> --merge --delete-branch
```

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

Record this deployment in `/docs/04-project/DORA_METRICS.md`:

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

Execute the `dora-metrics` skill to recalculate the sprint metrics if this is the sprint's last deployment.

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

---

## EXAMPLES

**Successful deploy sequence**:
```
1. gh pr view 42 --json reviews → qa-engineer: APPROVED ✓
2. gh pr view 42 --json statusCheckRollup → all SUCCESS ✓
3. production-readiness checklist → all items checked ✓
4. gh pr merge 42 --squash --delete-branch ✓
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

## ANTI-PATTERNS

- Deploying without QA approval — the review process exists because the deployer is too close to the code to catch all issues
- Skipping the PRR for "small" changes — missing env vars and misconfigured CORS have both come from "small" hotfixes
- Not watching the pipeline live — silent failures are common; assumptions that CI will pass are not
- Overwriting the `latest` Docker tag without a versioned tag — makes rollback impossible
- Running smoke tests from localhost against staging instead of against the production URL — the point is to verify the production deployment
- Updating DORA metrics only when convenient — the data is only useful if it is complete and consistent
