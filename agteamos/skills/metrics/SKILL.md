---
name: agteamos-metrics
description: >
  Reemplaza a agteamos-dora-metrics y agteamos-slo-management, fusionadas en
  una sola skill de metricas de entrega y confiabilidad. Cubre las 4 metricas
  DORA (deployment frequency, lead time, change failure rate, MTTR) y la
  definicion/medicion de SLOs, SLIs y error budgets para servicios en
  produccion.
used_by:
  - devops-engineer
  - product-manager
  - architect
---

# Skill: Metrics (agteamos-metrics)

## DORA Metrics (las 4 métricas)

### CONTRACT

- **Input**: git history + CI/CD logs + incident records
- **Output**: DORA dashboard data written to `agteamos/devops/DORA_METRICS.md`
- **Who runs this**: @devops-engineer or @product-manager, once per sprint or after each incident

### PROCESS

#### Step 1 — Understand the 4 DORA metrics

##### 1. Deployment Frequency
How often deployments to production happen.

| Performance Level | Frequency |
|-------------------|-----------|
| Elite | Multiple per day |
| High | Once per week |
| Medium | Once per month |
| Low | Once every 6 months or less |

**Formula**: `Deploys in period / Days in period`

##### 2. Lead Time for Changes
Time from first commit to running in production.

| Performance Level | Lead Time |
|-------------------|-----------|
| Elite | < 1 hour |
| High | < 1 day |
| Medium | < 1 week |
| Low | > 6 months |

**Formula**: `Production deploy timestamp - First commit timestamp`

##### 3. Change Failure Rate
Percentage of deployments that cause a degradation or outage requiring a hotfix or rollback.

| Performance Level | Failure Rate |
|-------------------|--------------|
| Elite | 0–15% |
| High | 16–30% |
| Medium | 16–30% |
| Low | 16–30% |

**Formula**: `Failed deployments / Total deployments × 100`

##### 4. Mean Time to Recovery (MTTR)
Time to restore service after a production failure.

| Performance Level | MTTR |
|-------------------|------|
| Elite | < 1 hour |
| High | < 1 day |
| Medium | < 1 week |
| Low | > 6 months |

**Formula**: `Service restored timestamp - Incident detected timestamp`

#### Step 2 — Instrument CI/CD to collect data

Add this step to your GitHub Actions deploy workflow to capture the raw timestamps needed:

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    steps:
      - name: Record deployment metric
        run: |
          echo "DEPLOY_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> $GITHUB_ENV
          echo "COMMIT_TIME=${{ github.event.head_commit.timestamp }}" >> $GITHUB_ENV

      - name: Append to deploy log
        run: |
          echo "${{ env.DEPLOY_TIME }},${{ env.COMMIT_TIME }},${{ github.sha }},success" \
            >> agteamos/devops/deploy_log.csv
```

For incident tracking, record the following manually or via your alerting tool:
- `incident_start` — when the alert fired
- `incident_resolved` — when service was confirmed restored
- `triggered_by_deploy` — sha of the deploy that caused it (if applicable)

#### Step 3 — Calculate and update DORA_METRICS.md

This sprint-summary table is a **rollup derived from the canonical per-deploy
log** owned by @devops-engineer (the `Fecha | Release | Lead Time | Deploy
Freq | Change Failure | MTTR` table in `agteamos/devops/DORA_METRICS.md`). It
does not replace or compete with that log — it is a periodic aggregation
calculated from it.

Run calculations at the end of each sprint. Update the file at `agteamos/devops/DORA_METRICS.md` using this template:

```markdown
# DORA Metrics — Sprint N (YYYY-MM-DD to YYYY-MM-DD)

| Metric | Value | Target (Elite) | Performance Level |
|--------|-------|----------------|-------------------|
| Deployment Frequency | X deploys/week | Multiple/day | High |
| Lead Time for Changes | X hours avg | < 1 hour | Elite |
| Change Failure Rate | X% | 0–15% | Elite |
| MTTR | X minutes avg | < 1 hour | Elite |

## Trend vs Previous Sprint
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Deployment Frequency | X | Y | ↑/↓ |
| Lead Time | Xhr | Yhr | ↑/↓ |
| Change Failure Rate | X% | Y% | ↑/↓ |
| MTTR | Xmin | Ymin | ↑/↓ |

## Action Items
- [Any identified bottleneck and assigned owner]
```

#### Step 4 — Act on poor metrics

When metrics fall below target, apply the following remediation strategies:

**Low Deployment Frequency**
- Automate more of the release pipeline
- Reduce batch size — smaller PRs, more frequent merges
- Remove manual approval gates that can be automated

**High Lead Time**
- Reduce PR size (target < 400 lines changed)
- Fix slow CI steps — parallelize test suites, cache dependencies
- Address code review bottlenecks — enforce 24hr SLA

**High Change Failure Rate**
- Add more automated tests before merge (pre-merge integration tests)
- Introduce feature flags to decouple deploy from release
- Improve staging environment parity with production

**High MTTR**
- Improve alerting — reduce time-to-detect
- Write and drill runbooks (see `agteamos-incidents` skill)
- Ensure rollback procedure is tested and documented

### EXAMPLE

**Scenario**: Team ships 3 deploys/week, average lead time is 4 hours, failure rate is 5%, MTTR is 30 minutes.

**Classification**:
| Metric | Value | Level |
|--------|-------|-------|
| Deployment Frequency | 3/week | High |
| Lead Time | 4 hours | High |
| Change Failure Rate | 5% | Elite |
| MTTR | 30 minutes | Elite |

**Overall**: High performer. Action item: increase deploy frequency toward Elite by splitting releases into smaller units and enabling automated deploys on green CI.

### ANTI-PATTERNS

- Measuring DORA metrics manually from memory — always pull from CI/CD logs
- Reporting metrics without trend data — a single snapshot has no actionable value
- Optimizing Deployment Frequency without also tracking Change Failure Rate — shipping broken code faster is not improvement
- Using MTTR only for full outages — degraded service states count too
- Skipping DORA review after an incident — that is exactly when the data is most valuable

---

## SLO/SLI y Error Budgets

### CONTRACT

- **Input**: Service running in production with observable metrics (logs, APM, uptime tool)
- **Output**: `agteamos/devops/SLO.md` with defined SLOs, current SLI measurements, error budget status, and alert thresholds
- **Who runs this**: @devops-engineer defines and monitors. @architect approves targets. @product-manager reviews budget consumption weekly.

### PROCESS

#### Step 1 — Understand SLA, SLO, and SLI

**SLI (Service Level Indicator)** is a quantitative measure of a specific aspect of service behavior. It is a number you can actually measure. Example: the percentage of HTTP requests that return a 2xx status code over the last 30 days.

**SLO (Service Level Objective)** is a target value or range for an SLI. It is the internal commitment the team makes to itself and to stakeholders. Example: "99.9% of requests must return 2xx over any rolling 30-day window." SLOs are stricter than SLAs because breaching an SLO is an early warning before an SLA breach.

**SLA (Service Level Agreement)** is an external contract with customers or partners that defines the minimum acceptable service level and the consequences of breach (credits, refunds, termination clauses). Example: "The API will be available 99.5% of the time per calendar month or customers receive a 10% credit." SLAs are typically less strict than SLOs to leave a safety margin.

#### Step 2 — Define SLIs for the service

Standard SLIs for web services and APIs:

**Availability**
```
Availability = (requests with 2xx or 3xx response) / (total requests) × 100
```

**Latency**
```
Latency SLI = (requests completing within threshold) / (total requests) × 100
Threshold examples: 300ms for critical, 500ms for standard, 2000ms for non-critical
```

**Error Rate**
```
Error Rate = (requests with 5xx response) / (total requests) × 100
```

#### Step 3 — Set SLO targets by service tier

Classify each service into a tier before setting targets:

| Tier | Examples | Availability | p95 Latency | Error Rate |
|------|----------|-------------|-------------|------------|
| Critical | Auth, payments, checkout | 99.9% | < 300ms | < 0.1% |
| Standard | Main features, dashboards | 99.5% | < 500ms | < 0.5% |
| Non-critical | Reports, exports, admin | 99% | < 2000ms | < 1% |

Do not set Elite targets for non-critical services — the operational cost is not justified.

#### Step 4 — Calculate error budgets

The error budget is the allowed downtime or failure margin derived from the SLO.

**Availability error budget formulas** (per 30-day month = 43,800 minutes):

| SLO | Allowed downtime/month |
|-----|----------------------|
| 99.9% | 43.8 minutes |
| 99.5% | 219 minutes (3.6 hours) |
| 99% | 438 minutes (7.3 hours) |

**Error budget policy**:
- If budget consumed > 50%: review DORA metrics, identify top failure cause
- If budget consumed > 80%: freeze non-critical feature work, focus on reliability
- If budget exhausted: incident review mandatory, no new deploys until root cause fixed

#### Step 5 — Create and maintain SLO.md

Create or update `agteamos/devops/SLO.md`:

```markdown
# SLO Document — MyApp API
Last updated: 2026-03-25

## Service: Authentication API
**Tier**: Critical
**SLA commitment**: 99.5% availability per calendar month

| SLI | Target | Current (30d) | Status |
|-----|--------|---------------|--------|
| Availability | 99.9% | 99.95% | ✅ |
| p95 Latency | < 300ms | 187ms | ✅ |
| Error Rate | < 0.1% | 0.03% | ✅ |

**Error Budget (30d)**
- Budget: 43.8 min/month
- Used: 21.9 min
- Remaining: 21.9 min (50% remaining)
- Status: Healthy

---

## Service: Reports Export API
**Tier**: Non-critical

| SLI | Target | Current (30d) | Status |
|-----|--------|---------------|--------|
| Availability | 99% | 98.7% | ⚠️ Below target |
| p95 Latency | < 2000ms | 3100ms | ❌ Breached |
| Error Rate | < 1% | 0.8% | ✅ |

**Error Budget (30d)**
- Budget: 438 min/month
- Used: 390 min
- Remaining: 48 min (11% remaining)
- Status: Critical — reliability sprint required
```

#### Step 6 — Configure alerts

Alert thresholds must reflect the error budget, not just the SLO target. Alert early enough to act before the budget is exhausted.

**Alert configuration pattern** (works with Sentry, Datadog, Grafana, or similar):

```yaml
# Error rate alert
alert: high_error_rate
condition: error_rate > SLO_threshold
window: 5 consecutive minutes
severity:
  warning: budget_consumed > 50%
  critical: budget_consumed > 80%
notify: on-call channel

# Latency alert
alert: high_latency
condition: p95_latency > threshold_ms
window: 5 consecutive minutes
severity:
  warning: p95 > 80% of threshold
  critical: p95 > threshold

# Availability alert
alert: low_availability
condition: availability < SLO_target
window: 10 consecutive minutes
severity:
  critical: immediate page to on-call
```

**Budget burn rate alert** (more sophisticated):
Trigger when the service is consuming error budget faster than sustainable. If 30-day budget would be exhausted in < 5 days at current burn rate, fire a critical alert.

### EXAMPLE

**SLO breach scenario**:

Reports Export API has a 99% availability SLO. At 14:00, a background job floods the database with slow queries. Error rate spikes to 2% for 1 hour.

- Error budget impact: 60 minutes consumed (budget was 438 min/month, now 378 min remaining)
- Alert fired at 14:05 (5-minute window exceeded)
- On-call responded at 14:12
- Root cause identified (slow query from batch job) at 14:35
- Fix deployed at 14:45
- MTTR: 45 minutes

Actions taken:
1. Incident documented (see `agteamos-incidents` skill)
2. Postmortem written with root cause and corrective actions
3. SLO.md updated with budget consumption
4. Query added an index — latency p95 dropped from 3100ms to 890ms
5. Batch job now runs outside business hours

### ANTI-PATTERNS

- Setting SLO targets at exactly the SLA commitment — you need a safety margin between the two
- Defining SLOs without measuring actual baseline first — set targets based on current performance, then tighten over time
- Tracking SLOs only in an external tool with no document — SLO.md must exist and be committed to the repo
- Ignoring error budget consumption until it is exhausted — 80% burn should trigger action, not 100%
- Same SLO for all services — critical and non-critical services have different reliability requirements and operational costs
- Measuring availability as "is the server up?" instead of "are requests succeeding?" — uptime ≠ availability from the user's perspective
