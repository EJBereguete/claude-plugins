---
name: production-readiness
description: >
  Checklist de preparacion para produccion. Obligatorio antes de cualquier
  deploy a produccion. Cubre infraestructura, seguridad, observabilidad,
  base de datos y procedimientos de rollback.
used_by:
  - devops-engineer
  - architect
  - security-engineer
  - qa-engineer
---

# SKILL: Production Readiness Review (PRR)

## CONTRACT

- **Input**: Feature or release branch that has passed QA on staging
- **Output**: PRR document at `/docs/04-project/PRR-<release>.md`, signed off by all required parties, and deploy approved
- **Who runs this**: @devops-engineer initiates, @architect signs off. All categories must be reviewed before any production deploy.

---

## PROCESS

### Step 1 — Complete the PRR Checklist

Go through each category below. Every unchecked item is a blocker. Do not proceed to deploy with open blockers unless you have documented a risk acceptance and an owner.

---

### Infrastructure

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

### Database

- [ ] Migration tested on staging with production-equivalent data volume
- [ ] Migration is reversible — OR — explicitly documented: "This migration is not reversible. Rollback plan: restore from backup taken at T-0."
- [ ] Indexes added for all new query patterns (no full table scans on tables > 10k rows)
- [ ] Connection pool size configured appropriately for expected load
- [ ] Backup confirmed recent (< 24 hours) before deploy window
- [ ] Long-running migration estimated: if > 30s, schedule during low-traffic window

---

### Security

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

### Observability

- [ ] Logs are structured (JSON format) — not plain text strings
- [ ] Error tracking configured (Sentry or equivalent) and sending events to the correct project/environment
- [ ] Uptime monitoring alert configured — notifies on-call within 2 minutes of downtime
- [ ] Error rate alert: trigger if 5xx rate exceeds 1% over 5 minutes
- [ ] Latency alert: trigger if p95 response time exceeds 1000ms
- [ ] Dashboard or runbook link referenced in alert message

---

### Testing

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

### Rollback

- [ ] Rollback procedure documented and has been tested at least once on staging
- [ ] Previous Docker image tagged and available in registry (do not overwrite `latest` without a versioned tag)
- [ ] Database migration can be reversed — OR — confirmed backup exists and restore procedure is documented with estimated RTO

---

### Step 2 — Create the PRR sign-off document

Create `/docs/04-project/PRR-v<semver>.md`:

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

## EXAMPLE

**Incident caused by skipping PRR**:

Team rushed a hotfix to production without completing the PRR. The fix included a new required environment variable (`STRIPE_WEBHOOK_SECRET`) that was not added to the production environment. The service started but silently dropped all webhook events. The issue was detected 2 hours later when a customer reported payments not processing. MTTR: 2.5 hours.

**What PRR would have caught**: The Infrastructure checklist item "All environment variables documented in `.env.example`" would have flagged the new variable. The smoke test plan would have included "Webhook event processed successfully" as a critical path.

---

## ANTI-PATTERNS

- Treating PRR as a formality and checking all boxes without actually verifying — the checklist is a tool, not a checkbox exercise
- Running PRR after the deploy has already started — PRR must be complete and signed off before any deploy command is run
- Skipping PRR for "small" changes — missing env vars, broken indexes, and misconfigured CORS have all come from "small" changes
- Not testing rollback until an actual incident — rollback procedures that have never been drilled fail under pressure
- Single person completing all PRR categories alone — the value is in multiple reviewers catching what one person misses
