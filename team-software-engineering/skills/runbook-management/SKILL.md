---
name: runbook-management
description: Engineering runbooks and playbooks for operational procedures. Runbook = tactical document with specific step-by-step commands. Playbook = strategic document with general approach and decision trees. Covers authoring, maintenance and execution standards.
used_by:
  - devops-engineer
---

## CONTRACT

When authoring or executing a runbook, you MUST:

- Distinguish runbook (tactical, specific commands) from playbook (strategic, general approach)
- Assign a unique ID and a named human owner to every runbook
- Include a tested rollback procedure for every mutating operation
- State the severity level the runbook targets so on-call can triage fast
- Keep commands copy-pasteable — no pseudo-code, no paraphrasing
- Version the runbook and record the last-tested date

---

## CORE CONCEPTS

### Runbook vs Playbook

| Dimension | Runbook | Playbook |
|-----------|---------|----------|
| Scope | Single specific procedure | Family of related scenarios |
| Format | Numbered steps with exact commands | Decision tree + principles |
| Audience | On-call engineer executing NOW | Team learning or planning |
| Example | "Restart the payment worker" | "How we handle data-layer incidents" |
| Frequency of use | High (operational) | Low (strategic reference) |

### Runbook anatomy

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

### Severity mapping

| Severity | Meaning | Acceptable resolution time |
|----------|---------|---------------------------|
| SEV-1 | Full service outage | < 30 min |
| SEV-2 | Partial outage or data risk | < 2 h |
| SEV-3 | Degraded performance | < 24 h |
| SEV-4 | Minor issue, no user impact | Next sprint |

---

## EXAMPLES

### Template: Runbook

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

### Example: Deploy to Production (RB-001)

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
2. Open incident: `gh issue create --label incident --title "Production deploy rollback failed v1.5.1"`
3. Follow RB-002 (Incident Response - P1)
```

---

### Example: Database Backup Verification (RB-010)

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

---

## CHECKLIST

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
- [ ] Added to the team runbook index (ops-wiki/runbooks/index.md)

Before executing a runbook in production:

- [ ] Read the entire runbook before running step 1
- [ ] Verify all prerequisites are met
- [ ] Announce in the team channel: "Starting RB-NNN: <title>"
- [ ] Have a second engineer available during SEV-1 or SEV-2 runbooks
- [ ] Screenshot or log every step output for post-incident review

---

## ANTI-PATTERNS

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
