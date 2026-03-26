---
name: dora-metrics
description: >
  Measures and tracks the 4 DORA metrics to assess team delivery performance.
  Used by @devops-engineer and @project-manager to identify bottlenecks.
used_by:
  - devops-engineer
  - project-manager
  - architect
---

# SKILL: DORA Metrics

## CONTRACT

- **Input**: git history + CI/CD logs + incident records
- **Output**: DORA dashboard data written to `/docs/04-project/DORA_METRICS.md`
- **Who runs this**: @devops-engineer or @project-manager, once per sprint or after each incident

---

## PROCESS

### Step 1 — Understand the 4 DORA metrics

#### 1. Deployment Frequency
How often deployments to production happen.

| Performance Level | Frequency |
|-------------------|-----------|
| Elite | Multiple per day |
| High | Once per week |
| Medium | Once per month |
| Low | Once every 6 months or less |

**Formula**: `Deploys in period / Days in period`

#### 2. Lead Time for Changes
Time from first commit to running in production.

| Performance Level | Lead Time |
|-------------------|-----------|
| Elite | < 1 hour |
| High | < 1 day |
| Medium | < 1 week |
| Low | > 6 months |

**Formula**: `Production deploy timestamp - First commit timestamp`

#### 3. Change Failure Rate
Percentage of deployments that cause a degradation or outage requiring a hotfix or rollback.

| Performance Level | Failure Rate |
|-------------------|--------------|
| Elite | 0–15% |
| High | 16–30% |
| Medium | 16–30% |
| Low | 16–30% |

**Formula**: `Failed deployments / Total deployments × 100`

#### 4. Mean Time to Recovery (MTTR)
Time to restore service after a production failure.

| Performance Level | MTTR |
|-------------------|------|
| Elite | < 1 hour |
| High | < 1 day |
| Medium | < 1 week |
| Low | > 6 months |

**Formula**: `Service restored timestamp - Incident detected timestamp`

---

### Step 2 — Instrument CI/CD to collect data

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
            >> docs/04-project/deploy_log.csv
```

For incident tracking, record the following manually or via your alerting tool:
- `incident_start` — when the alert fired
- `incident_resolved` — when service was confirmed restored
- `triggered_by_deploy` — sha of the deploy that caused it (if applicable)

---

### Step 3 — Calculate and update DORA_METRICS.md

Run calculations at the end of each sprint. Update the file at `/docs/04-project/DORA_METRICS.md` using this template:

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

---

### Step 4 — Act on poor metrics

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
- Write and drill runbooks (see `runbook-management` skill)
- Ensure rollback procedure is tested and documented

---

## EXAMPLE

**Scenario**: Team ships 3 deploys/week, average lead time is 4 hours, failure rate is 5%, MTTR is 30 minutes.

**Classification**:
| Metric | Value | Level |
|--------|-------|-------|
| Deployment Frequency | 3/week | High |
| Lead Time | 4 hours | High |
| Change Failure Rate | 5% | Elite |
| MTTR | 30 minutes | Elite |

**Overall**: High performer. Action item: increase deploy frequency toward Elite by splitting releases into smaller units and enabling automated deploys on green CI.

---

## ANTI-PATTERNS

- Measuring DORA metrics manually from memory — always pull from CI/CD logs
- Reporting metrics without trend data — a single snapshot has no actionable value
- Optimizing Deployment Frequency without also tracking Change Failure Rate — shipping broken code faster is not improvement
- Using MTTR only for full outages — degraded service states count too
- Skipping DORA review after an incident — that is exactly when the data is most valuable
