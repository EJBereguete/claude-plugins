---
name: slo-management
description: >
  Define, mide y gestiona SLOs (Service Level Objectives) y SLIs (Service Level
  Indicators) para los servicios en produccion. Incluye error budgets y alertas.
used_by:
  - devops-engineer
  - architect
  - project-manager
---

# SKILL: SLO Management

## CONTRACT

- **Input**: Service running in production with observable metrics (logs, APM, uptime tool)
- **Output**: `/docs/04-project/SLO.md` with defined SLOs, current SLI measurements, error budget status, and alert thresholds
- **Who runs this**: @devops-engineer defines and monitors. @architect approves targets. @project-manager reviews budget consumption weekly.

---

## PROCESS

### Step 1 — Understand SLA, SLO, and SLI

**SLI (Service Level Indicator)** is a quantitative measure of a specific aspect of service behavior. It is a number you can actually measure. Example: the percentage of HTTP requests that return a 2xx status code over the last 30 days.

**SLO (Service Level Objective)** is a target value or range for an SLI. It is the internal commitment the team makes to itself and to stakeholders. Example: "99.9% of requests must return 2xx over any rolling 30-day window." SLOs are stricter than SLAs because breaching an SLO is an early warning before an SLA breach.

**SLA (Service Level Agreement)** is an external contract with customers or partners that defines the minimum acceptable service level and the consequences of breach (credits, refunds, termination clauses). Example: "The API will be available 99.5% of the time per calendar month or customers receive a 10% credit." SLAs are typically less strict than SLOs to leave a safety margin.

---

### Step 2 — Define SLIs for the service

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

---

### Step 3 — Set SLO targets by service tier

Classify each service into a tier before setting targets:

| Tier | Examples | Availability | p95 Latency | Error Rate |
|------|----------|-------------|-------------|------------|
| Critical | Auth, payments, checkout | 99.9% | < 300ms | < 0.1% |
| Standard | Main features, dashboards | 99.5% | < 500ms | < 0.5% |
| Non-critical | Reports, exports, admin | 99% | < 2000ms | < 1% |

Do not set Elite targets for non-critical services — the operational cost is not justified.

---

### Step 4 — Calculate error budgets

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

---

### Step 5 — Create and maintain SLO.md

Create or update `/docs/04-project/SLO.md`:

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

---

### Step 6 — Configure alerts

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

---

## EXAMPLE

**SLO breach scenario**:

Reports Export API has a 99% availability SLO. At 14:00, a background job floods the database with slow queries. Error rate spikes to 2% for 1 hour.

- Error budget impact: 60 minutes consumed (budget was 438 min/month, now 378 min remaining)
- Alert fired at 14:05 (5-minute window exceeded)
- On-call responded at 14:12
- Root cause identified (slow query from batch job) at 14:35
- Fix deployed at 14:45
- MTTR: 45 minutes

Actions taken:
1. Incident documented (see `incident-response` skill)
2. Postmortem written with root cause and corrective actions
3. SLO.md updated with budget consumption
4. Query added an index — latency p95 dropped from 3100ms to 890ms
5. Batch job now runs outside business hours

---

## ANTI-PATTERNS

- Setting SLO targets at exactly the SLA commitment — you need a safety margin between the two
- Defining SLOs without measuring actual baseline first — set targets based on current performance, then tighten over time
- Tracking SLOs only in an external tool with no document — SLO.md must exist and be committed to the repo
- Ignoring error budget consumption until it is exhausted — 80% burn should trigger action, not 100%
- Same SLO for all services — critical and non-critical services have different reliability requirements and operational costs
- Measuring availability as "is the server up?" instead of "are requests succeeding?" — uptime ≠ availability from the user's perspective
