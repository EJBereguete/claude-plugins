---
name: agteamos-incidents
description: >
  Reemplaza a agteamos-incident-response y agteamos-runbook-management, fusionadas en
  una sola skill operacional. Cubre el proceso de incident response
  (severidad P1-P4, roles, ciclo de cinco fases, post-mortems y plantillas de
  comunicacion) y la autoria/ejecucion de runbooks y playbooks operacionales.
used_by:
  - devops-engineer
  - qa-engineer
---

# Skill: Incidents (agteamos-incidents)

## Incident Response (severidad P1-P4, ciclo de 5 fases)

### CONTRACT

When managing an incident, you MUST:

- Classify severity within 5 minutes of detection using the P1-P4 criteria
- Assign Incident Commander, Tech Lead and Comms Lead before any remediation work starts
- Communicate status externally at the cadence defined for the severity level
- Open a post-mortem document within 24 hours of resolution for P1/P2, stored at
  `agteamos/incidents/post-mortems/<incident-id>-<slug>.md`
- Never assign blame in post-mortems — focus on system and process failures
- Close the incident only after verification, not after the fix is deployed

### CORE CONCEPTS

#### Severity Levels

| Level | Definition | Response SLA | Update cadence | Example |
|-------|-----------|-------------|----------------|---------|
| P1 | Full service outage or data loss/corruption affecting all users | Respond in 15 min, resolve < 1 h | Every 15 min | API completely down, payments failing for all users |
| P2 | Major feature broken or > 25% of users impacted | Respond in 30 min, resolve < 4 h | Every 30 min | Login works but checkout fails for mobile users |
| P3 | Minor feature degraded, workaround exists | Respond in 2 h, resolve < 24 h | Every 2 h | PDF export timing out intermittently |
| P4 | Cosmetic issue or single-user report, no service impact | Respond in 1 business day, resolve < 1 week | Daily | Wrong label on settings page |

#### Roles

**Incident Commander (IC)**
- Owns the incident process end to end
- Makes final decisions on escalation and resolution
- Does NOT do technical investigation — delegates everything
- Keeps the timeline moving and cuts unproductive discussion
- Typically: senior engineer or on-call lead

**Technical Lead (TL)**
- Owns the technical investigation and fix
- Reports findings to IC every 15-30 min
- Coordinates with other engineers doing parallel investigation
- Calls out when they need more hands

**Communications Lead (CL)**
- Writes all external and internal status updates
- Manages status page (statuspage.io or equivalent)
- Shields TL and IC from stakeholder interruptions during active incident
- Typically: product manager or designated senior engineer

**Subject Matter Expert (SME)**
- Called in by TL when the incident touches a specific system
- Provides expertise and executes specific tasks
- Reports directly to TL

#### Process Phases

```
Detection → Classification → Containment → Resolution → Post-mortem
```

**Phase 1: Detection (target: < 5 min)**
- Source: alert, user report, automated monitor
- Actions: confirm the signal is real, gather initial data
- Output: incident ticket opened, severity tentatively assigned

**Phase 2: Classification (target: < 10 min from detection)**
- Actions: assign roles, set severity, open war room (Slack channel or call)
- Output: roles confirmed, severity confirmed, update schedule set

**Phase 3: Containment (target: varies by severity)**
- Actions: stop the bleeding — rollback, feature flag off, traffic reroute
- Containment does NOT require root cause — it stops user impact
- Output: user-facing impact reduced or eliminated

**Phase 4: Resolution (follows containment)**
- Actions: identify root cause, implement permanent fix, validate
- Output: system back to normal baseline, monitoring confirms stability

**Phase 5: Post-mortem (within 24 h for P1/P2, 72 h for P3)**
- Actions: write timeline, identify root cause, define action items
- Output: signed post-mortem document with owners and due dates

### EXAMPLES

#### Communication Templates

**Initial acknowledgment (post within 5 min of detection)**

```
[INCIDENT OPENED - P<N>] <Service Name>

Status: Investigating
Impact: <What users are experiencing>
Started: <HH:MM UTC>
IC: @<name>
War room: #inc-<service>-<YYYYMMDD>

Next update in <15|30|120> min.
```

**Status update (repeat at cadence)**

```
[INCIDENT UPDATE - P<N>] <Service Name> — <HH:MM UTC>

Status: <Investigating | Identified | Fixing | Monitoring>
Impact: <Current user impact — be specific>
What we know: <1-2 sentences on findings>
What we're doing: <Current action>

Next update in <15|30|120> min.
```

**Resolution notice**

```
[INCIDENT RESOLVED - P<N>] <Service Name>

Status: Resolved
Duration: <start> → <end> UTC (<X> h <Y> min)
Impact: <Who was affected and how>
Root cause (preliminary): <1 sentence — confirmed after post-mortem>
Fix applied: <What was done>

Post-mortem will be published within <24|72> hours.
Thank you for your patience.
```

**Customer-facing status page template**

```
Title: <Service> degradation
Body:
We are investigating reports of <symptom> affecting <scope>.
Our team is actively working to resolve this.
[Update HH:MM] We have identified the cause and are deploying a fix.
[Update HH:MM] This incident has been resolved.
Affected: <service names>
Duration: <start> – <end>
```

#### Post-mortem Template

```markdown
# Post-mortem: <Incident ID> — <Short title>

**Severity:** P<N>
**Date:** YYYY-MM-DD
**Duration:** X h Y min
**Author:** @<name>
**Reviewers:** @<name>, @<name>
**Status:** Draft | Under Review | Final

---

## Impact

- **Users affected:** <number or percentage>
- **Services affected:** <list>
- **Data integrity:** <affected / not affected / under investigation>
- **Revenue impact:** <estimated if known>

---

## Timeline

All times in UTC.

| Time | Event |
|------|-------|
| HH:MM | First alert fired / first user report |
| HH:MM | On-call acknowledged alert |
| HH:MM | Incident declared P<N>, war room opened |
| HH:MM | <Key finding or action> |
| HH:MM | Containment action applied (<what>) |
| HH:MM | User impact confirmed reduced |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed to production |
| HH:MM | Monitoring confirms normal — incident resolved |

---

## Root Cause

<Factual description of the technical cause. No blame. No "human error" as root cause —
human error is a symptom. Ask "why was the system designed to allow this?" >

**Contributing factors:**
- <Factor 1>
- <Factor 2>

---

## What Went Well

- <Thing 1 that worked as intended>
- <Thing 2>

---

## What Went Poorly

- <Thing 1 that slowed response or increased impact>
- <Thing 2>

---

## Action Items

| Item | Owner | Due date | Priority |
|------|-------|----------|----------|
| <Specific, actionable task> | @<name> | YYYY-MM-DD | P<1-3> |
| <Specific, actionable task> | @<name> | YYYY-MM-DD | P<1-3> |

Action items must be SMART: Specific, Measurable, Assignable, Relevant, Time-bound.
"Improve monitoring" is not an action item. "Add alert for DB connection pool > 80%" is.
```

#### Real Example: API Service Down (P1 Incident)

**Scenario:** The REST API returns HTTP 503 for all endpoints. Monitoring fires at 14:32 UTC.

**Phase 1: Detection — 14:32 UTC**

Alert: `API Error Rate > 50% for 2 consecutive minutes` fires in PagerDuty.
On-call (@alice) acknowledges at 14:33. Confirms via `curl https://api.example.com/health` — returns 503.

**Phase 2: Classification — 14:35 UTC**

- Severity: P1 (full outage, all users affected)
- IC: @alice (on-call)
- TL: @bob (API team)
- CL: @carol (product)
- War room opened: #inc-api-20260325

Post in #incidents:
```
[INCIDENT OPENED - P1] API Service

Status: Investigating
Impact: All API endpoints returning 503. All users affected.
Started: 14:32 UTC
IC: @alice | TL: @bob | CL: @carol
War room: #inc-api-20260325

Next update in 15 min.
```

**Phase 3: Containment — 14:38 UTC**

TL @bob checks Cloud Run dashboard — all instances in `CRASH_LOOP` state.
Checks recent deploys: v2.3.1 deployed at 14:25.
Decision: rollback to v2.3.0 without waiting for root cause.

```bash
gh workflow run deploy-production.yml \
  --ref v2.3.0 \
  --field environment=production
```

14:45 UTC: health endpoint returns 200. Error rate back to < 0.1%.

**Phase 4: Resolution — 14:45 UTC**

Monitoring 15 min window confirms stability. Incident resolved at 15:00 UTC.

Post in #incidents:
```
[INCIDENT RESOLVED - P1] API Service

Status: Resolved
Duration: 14:32 → 15:00 UTC (28 min)
Impact: All users — all API endpoints unavailable
Fix applied: Rolled back to v2.3.0. v2.3.1 blocked from production.
Root cause (preliminary): v2.3.1 introduced a missing env var that
  caused startup failure. Post-mortem in progress.

Post-mortem will be published within 24 hours.
```

**Phase 5: Post-mortem excerpt**

Root cause: v2.3.1 added a required environment variable `STRIPE_WEBHOOK_SECRET`
that was not provisioned in the production Cloud Run service. The application
failed at startup when this variable was absent. The deploy pipeline had no
health check gate — it considered the deploy successful when the new revision
was created, not when traffic was serving successfully.

Action items:

| Item | Owner | Due date |
|------|-------|----------|
| Add post-deploy health check to deploy pipeline (fail if /health not 200 within 60s) | @bob | 2026-04-01 |
| Add env var validation on startup with clear error message | @bob | 2026-04-01 |
| Add canary step (10% traffic, 5 min) before full rollout | @alice | 2026-04-08 |
| Document required env vars in service README | @dave | 2026-04-01 |

### CHECKLIST

**During incident (P1/P2)**

- [ ] Alert acknowledged within SLA
- [ ] Real vs false positive confirmed before declaring incident
- [ ] Severity assigned and justified
- [ ] IC, TL, CL assigned by name
- [ ] War room channel opened (#inc-<service>-<date>)
- [ ] Initial communication posted within 5 min of declaration
- [ ] Status updates posted at defined cadence
- [ ] Containment prioritized over root cause investigation
- [ ] Resolution confirmed via monitoring, not just "fix deployed"
- [ ] Resolution communication posted
- [ ] Incident ticket closed with accurate duration and impact

**Post-mortem (within 24 h for P1/P2)**

- [ ] Timeline reconstructed from logs, not memory
- [ ] Root cause is a system/process failure, not a person
- [ ] Action items are SMART with named owners and due dates
- [ ] Post-mortem reviewed by at least IC and one other
- [ ] Action items tracked in project management tool
- [ ] Post-mortem shared with full team (learning culture)

### ANTI-PATTERNS

**Skipping roles and letting everyone talk at once.**
An incident without an IC is a group panic. The IC's only job is to keep the
process moving. Assign roles in the first 5 minutes or the incident takes 3x longer.

**Investigating root cause before containment.**
User impact accumulates every minute. Rollback first, investigate later.
"We need to understand what happened before we revert" is a P1 mistake.

**Blame-oriented post-mortems.**
"Alice pushed the bad code" is not a root cause. Why did the pipeline allow
untested code to reach production? That is the actionable question.

**Action items without owners or dates.**
"Improve alerting" added to a post-mortem with no owner never gets done.
Every item needs a name and a calendar date.

**Declaring resolution before monitoring confirms stability.**
A fix deployed is not an incident resolved. Monitor for at least one full
alerting window (typically 5-15 minutes) before closing.

**Not communicating externally during long incidents.**
30 minutes of silence during a P1 generates more support tickets and trust damage
than the outage itself. Regular updates, even "still investigating," prevent this.

---

## Runbooks y Playbooks

### CONTRACT

When authoring or executing a runbook, you MUST:

- Distinguish runbook (tactical, specific commands) from playbook (strategic, general approach)
- Assign a unique ID and a named human owner to every runbook
- Include a tested rollback procedure for every mutating operation
- State the severity level the runbook targets so on-call can triage fast
- Keep commands copy-pasteable — no pseudo-code, no paraphrasing
- Version the runbook and record the last-tested date
- Store runbooks at `agteamos/incidents/runbooks/` and playbooks at
  `agteamos/incidents/playbooks/` — never mix the two in the same folder

### CORE CONCEPTS

#### Runbook vs Playbook

| Dimension | Runbook | Playbook |
|-----------|---------|----------|
| Scope | Single specific procedure | Family of related scenarios |
| Format | Numbered steps with exact commands | Decision tree + principles |
| Audience | On-call engineer executing NOW | Team learning or planning |
| Example | "Restart the payment worker" | "How we handle data-layer incidents" |
| Frequency of use | High (operational) | Low (strategic reference) |

#### Runbook anatomy

Every runbook has five mandatory sections and three optional ones.

**Mandatory**
1. Header metadata (ID, owner, severity, last tested)
2. When to use — trigger conditions that warrant running this
3. Prerequisites — access, tools, environment state required before starting
4. Steps — numbered, each step has one command, one expected output
5. Rollback — how to undo every mutating step

**Optional**
- Escalation path — who to page if steps fail
- Verification — how to confirm success end-to-end
- Related runbooks — links to upstream/downstream procedures

#### Severity mapping

| Severity | Meaning | Acceptable resolution time |
|----------|---------|---------------------------|
| SEV-1 | Full service outage | < 30 min |
| SEV-2 | Partial outage or data risk | < 2 h |
| SEV-3 | Degraded performance | < 24 h |
| SEV-4 | Minor issue, no user impact | Next sprint |

### EXAMPLES

#### Template: Runbook

```markdown
# RB-<ID>: <Title>

**Owner:** @<github-handle>
**Severity:** SEV-<1|2|3|4>
**Last tested:** YYYY-MM-DD
**Version:** 1.0.0

## When to use

- <Condition A that triggers this runbook>
- <Condition B that triggers this runbook>
- NOT for: <explicitly excluded cases>

## Prerequisites

- [ ] Access to <system/tool> with role <role>
- [ ] VPN connected to <environment>
- [ ] <CLI tool> >= <version> installed locally
- [ ] Read-only DB access confirmed (for diagnostic steps)

## Steps

### Step 1: <Action name>

```bash
<exact command>
```

Expected output:
```
<expected stdout/stderr>
```

If output differs: <what to check / who to call>

---

### Step 2: <Action name>

```bash
<exact command>
```

Expected output:
```
<expected stdout/stderr>
```

---

### Step N: Verify success

```bash
<verification command>
```

Expected output:
```
<expected stdout/stderr>
```

## Rollback

> Execute rollback in reverse order if any step fails after step 3.

### Rollback Step 1: Undo <action from step N>

```bash
<rollback command>
```

## Escalation

If rollback fails or takes > 15 min:
1. Page @<oncall-lead> via PagerDuty
2. Open incident channel #inc-<service>
3. Share this runbook link and the step where it failed
```

---

#### Example: Deploy to Production (RB-001)

```markdown
# RB-001: Deploy to Production

**Owner:** @platform-team
**Severity:** SEV-2 (if issues arise during deploy)
**Last tested:** 2026-03-10
**Version:** 2.1.0

## When to use

- Deploying a tagged release to the production environment
- Triggered after staging approval and QA sign-off
- NOT for: hotfixes (use RB-003), database migrations (use RB-005)

## Prerequisites

- [ ] GitHub Actions CI green on the release tag
- [ ] QA sign-off comment on the PR
- [ ] You have `deploy:production` role in GitHub (check: Settings > Teams)
- [ ] Monitoring dashboard open in a separate tab: https://grafana.internal/d/prod-overview
- [ ] Slack #deployments channel open for status updates

## Steps

### Step 1: Confirm the release tag exists

```bash
git fetch --tags
git tag --list | grep "^v" | sort -V | tail -5
```

Expected output:
```
v1.4.0
v1.4.1
v1.4.2
v1.5.0
v1.5.1
```

---

### Step 2: Trigger the production deployment

```bash
gh workflow run deploy-production.yml \
  --ref v1.5.1 \
  --field environment=production \
  --field notify_slack=true
```

Expected output:
```
Created workflow_run for deploy-production.yml
```

---

### Step 3: Monitor deployment progress

```bash
gh run watch --exit-status
```

Expected output: all steps green, final line `✓ Completed in Xm Xs`

---

### Step 4: Verify health endpoint

```bash
curl -sf https://api.example.com/health | jq .
```

Expected output:
```json
{
  "status": "ok",
  "version": "1.5.1",
  "db": "connected"
}
```

---

### Step 5: Confirm error rate is normal

Check Grafana panel "5xx rate (5m)" — must be < 0.1% for 5 consecutive minutes.

Post in #deployments:
```
Deploy v1.5.1 to production complete. Health: OK. Error rate: nominal.
```

## Rollback

### Rollback Step 1: Trigger rollback to previous version

```bash
gh workflow run deploy-production.yml \
  --ref v1.5.0 \
  --field environment=production \
  --field notify_slack=true
```

### Rollback Step 2: Verify health endpoint (same as Step 4)

```bash
curl -sf https://api.example.com/health | jq .
```

Expected: version shows `1.5.0`.

## Escalation

If rollback fails:
1. Page #oncall-platform in PagerDuty
2. Open incident: `[operación: create-ticket]` (label `incident`, title "Production deploy rollback failed v1.5.1"; se resuelve contra `agteamos/tracker/<tracker de platform.yml>.md`)
3. Follow the Incident Response section above (severity P1)
```

---

#### Example: Database Backup Verification (RB-010)

```markdown
# RB-010: Database Backup Verification

**Owner:** @data-reliability-team
**Severity:** SEV-3 (verification failure escalates to SEV-1)
**Last tested:** 2026-03-01
**Version:** 1.3.0

## When to use

- Daily automated check (triggered by cron at 02:00 UTC)
- Manually after any backup configuration change
- After a restore operation to confirm integrity

## Prerequisites

- [ ] Access to `backup-verifier` service account (GCP IAM)
- [ ] `gcloud` CLI authenticated: `gcloud auth list`
- [ ] Restoration target DB `postgres-restore-test` is running and empty

## Steps

### Step 1: List last 3 backups

```bash
gcloud sql backups list \
  --instance=postgres-prod \
  --limit=3 \
  --format="table(id, status, endTime, sizeBytes)"
```

Expected output:
```
ID          STATUS     END_TIME              SIZE_BYTES
1234567890  SUCCESSFUL 2026-03-25T02:05:00Z  8589934592
1234567889  SUCCESSFUL 2026-03-24T02:04:58Z  8573157376
1234567888  SUCCESSFUL 2026-03-23T02:05:12Z  8540119040
```

If latest status is not `SUCCESSFUL`: escalate immediately (see Escalation).

---

### Step 2: Restore latest backup to test instance

```bash
gcloud sql backups restore 1234567890 \
  --restore-instance=postgres-restore-test \
  --backup-instance=postgres-prod
```

Expected: operation completes with `status: DONE` within 10 minutes.

---

### Step 3: Run integrity check query

```bash
psql "host=postgres-restore-test.internal user=verifier dbname=app" \
  -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM orders; SELECT MAX(created_at) FROM orders;"
```

Expected output — counts must be within 0.1% of production values recorded in Datadog.

---

### Step 4: Record result

```bash
curl -X POST https://ops-dashboard.internal/api/backup-checks \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -d '{"date": "2026-03-25", "status": "ok", "backup_id": "1234567890"}'
```

## Rollback

This runbook is read-only except for the restore to test instance.
To clean the test instance after verification:

```bash
gcloud sql databases delete app --instance=postgres-restore-test
gcloud sql databases create app --instance=postgres-restore-test --charset=UTF8
```

## Escalation

If backup status is not SUCCESSFUL or count mismatch > 0.1%:
1. Page @data-reliability-team immediately (PagerDuty: "Backup Verification Failure")
2. Do NOT use the backup for any restore until investigated
3. Open SEV-1 incident and attach this runbook output
```

### CHECKLIST

Before publishing a new runbook:

- [ ] Unique ID assigned (format: RB-NNN) and registered in runbook index
- [ ] Owner is a named individual or team, not a generic label
- [ ] Severity level set and justified
- [ ] All commands tested in a non-production environment
- [ ] Expected outputs documented for every step
- [ ] Rollback procedure covers every mutating step
- [ ] Escalation path points to real people/channels
- [ ] Last-tested date set to today
- [ ] Peer review by at least one other engineer
- [ ] Added to the team runbook index (agteamos/incidents/runbooks/index.md)

Before executing a runbook in production:

- [ ] Read the entire runbook before running step 1
- [ ] Verify all prerequisites are met
- [ ] Announce in the team channel: "Starting RB-NNN: <title>"
- [ ] Have a second engineer available during SEV-1 or SEV-2 runbooks
- [ ] Screenshot or log every step output for post-incident review

### ANTI-PATTERNS

**Pseudo-commands that cannot be copy-pasted.**
"Run the deploy script with the right parameters" is not a runbook step.
Write the exact command with real flags and real values.

**No rollback section.**
If a step modifies state and there is no rollback, the runbook is incomplete.
Every mutating operation needs a documented undo.

**Ownership by committee.**
`Owner: Platform Team` is unactionable at 3 AM. Owner must be a named individual
or a PagerDuty rotation with a defined primary.

**Stale runbooks with no last-tested date.**
A runbook that has never been tested or was last tested 18 months ago is
potentially more dangerous than no runbook — it creates false confidence.
Enforce a quarterly review cadence for SEV-1 runbooks.

**Commands that assume context never stated.**
If a command requires a specific directory, environment variable, or VPN state,
that is a prerequisite and must appear in the Prerequisites section explicitly.

**Conflating runbook and playbook.**
Playbooks answer "how do we think about this class of problem."
Runbooks answer "do exactly this right now."
Mixing them produces documents that are neither useful for learning nor safe
to execute under pressure.

---

## Próximo paso sugerido

**Próximo paso sugerido**: `agteamos-decisions` (post-mortem como ADR) o
`agteamos-fix` (si el incidente requiere un fix táctico) — ver
`agteamos-context` §Próximo paso.
