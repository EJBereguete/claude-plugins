---
name: incident-response
description: Incident management process covering severity classification (P1-P4), defined roles, five-phase lifecycle, post-mortem structure and communication templates. Ensures teams respond to production failures consistently and learn from them systematically.
used_by:
  - devops-engineer
  - qa-engineer
---

## CONTRACT

When managing an incident, you MUST:

- Classify severity within 5 minutes of detection using the P1-P4 criteria
- Assign Incident Commander, Tech Lead and Comms Lead before any remediation work starts
- Communicate status externally at the cadence defined for the severity level
- Open a post-mortem document within 24 hours of resolution for P1/P2
- Never assign blame in post-mortems — focus on system and process failures
- Close the incident only after verification, not after the fix is deployed

---

## CORE CONCEPTS

### Severity Levels

| Level | Definition | Response SLA | Update cadence | Example |
|-------|-----------|-------------|----------------|---------|
| P1 | Full service outage or data loss/corruption affecting all users | Respond in 15 min, resolve < 1 h | Every 15 min | API completely down, payments failing for all users |
| P2 | Major feature broken or > 25% of users impacted | Respond in 30 min, resolve < 4 h | Every 30 min | Login works but checkout fails for mobile users |
| P3 | Minor feature degraded, workaround exists | Respond in 2 h, resolve < 24 h | Every 2 h | PDF export timing out intermittently |
| P4 | Cosmetic issue or single-user report, no service impact | Respond in 1 business day, resolve < 1 week | Daily | Wrong label on settings page |

### Roles

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

### Process Phases

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

---

## EXAMPLES

### Communication Templates

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

---

### Post-mortem Template

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

---

### Real Example: API Service Down (P1 Incident)

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

---

## CHECKLIST

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

---

## ANTI-PATTERNS

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
