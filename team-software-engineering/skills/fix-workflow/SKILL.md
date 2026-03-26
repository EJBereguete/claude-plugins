---
name: fix-workflow
description: >
  Hotfix rapido y tactico para bugs o cambios menores. Omite fases estrategicas
  pero mantiene calidad: test obligatorio, PR hacia rama correcta, cierre de ticket.
used_by:
  - backend-engineer
  - frontend-engineer
  - project-manager
  - qa-engineer
---

# SKILL: Fix Workflow

## CONTRACT

- **Input**: descripcion del bug o cambio menor a realizar
- **Output**: fix implementado + test unitario + PR hacia la rama correcta + ticket cerrado si existe
- **Who runs this**: @project-manager triages, @backend-engineer or @frontend-engineer implements, @qa-engineer validates

---

## PROCESS

### Step 1 — Triage: classify the fix

@project-manager analyzes the report and answers three questions:

**1. What layer is affected?**
- Backend only → assign @backend-engineer
- Frontend only → assign @frontend-engineer
- Both → assign both, coordinate

**2. What is the urgency?**

| Level | Definition | Branch strategy |
|-------|-----------|-----------------|
| P0 — Hotfix | Production is down or data is at risk | `hotfix/<slug>` from `main` |
| P1 — Urgent | Major feature broken, no workaround | `bugfix/<slug>` from `main` |
| P2 — Standard | Feature broken with workaround | `bugfix/<slug>` from `develop` |
| P3 — Minor | Cosmetic, typo, low impact | `bugfix/<slug>` from `develop` |

**3. Is this a change at all?**

Sometimes the correct answer is NOT to change the code. Document when this applies:
- The "bug" is expected behaviour per the spec — educate the reporter
- The fix would require architectural changes that cannot be done in a hotfix — create a P1 ticket and handle via sprint planning
- The reported issue is in an environment-specific configuration — update `.env` documentation, not code

If the decision is NO CHANGE — document the reason and close the ticket with explanation.

---

### Step 2 — Create the correct branch

```bash
# P0 Hotfix (production down) — branch from main
git checkout main && git pull
git checkout -b hotfix/<slug>
# Example: hotfix/payment-webhook-500

# P1/P2/P3 Bugfix — branch from develop or main depending on project flow
git checkout develop && git pull
git checkout -b bugfix/<slug>
# Example: bugfix/invoice-total-calculation
```

---

### Step 3 — Surgical fix

The change must be the minimum that solves the problem. No refactoring, no cleanup, no "while I'm here" changes.

Read the exact file and line reported. Apply the minimum diff.

**Example — wrong tax calculation**:

Before:
```python
# services/invoice_service.py:78
def calculate_total(subtotal: Decimal, tax_rate: Decimal) -> Decimal:
    return subtotal * tax_rate  # BUG: missing the +1 multiplier
```

After:
```python
def calculate_total(subtotal: Decimal, tax_rate: Decimal) -> Decimal:
    return subtotal * (1 + tax_rate)
```

If you find other issues while reading the code — create a separate ticket. Do not fix them here.

---

### Step 4 — Write the unit test (MANDATORY)

Every fix must include a test that:
1. Fails without the fix
2. Passes with the fix
3. Has a docstring referencing the bug

```python
def test_calculate_total_applies_tax_correctly():
    """
    Regression test: calculate_total was returning subtotal * rate instead of
    subtotal * (1 + rate), causing undercharged invoices.
    Bug: #78 — Invoice total calculation incorrect for VAT
    """
    result = calculate_total(subtotal=Decimal("100.00"), tax_rate=Decimal("0.21"))
    assert result == Decimal("121.00")

def test_calculate_total_zero_tax():
    """Edge case: zero tax rate should return subtotal unchanged."""
    result = calculate_total(subtotal=Decimal("100.00"), tax_rate=Decimal("0.00"))
    assert result == Decimal("100.00")
```

---

### Step 5 — Open the PR toward the correct branch

| Fix type | Target branch |
|----------|--------------|
| P0 hotfix | `main` (then cherry-pick to `develop` after merge) |
| P1/P2/P3 bugfix | `develop` (or `testing` if that's the project's convention) |

```bash
gh pr create \
  --title "fix(<scope>): <what was broken and what was fixed>" \
  --body "## Bug
<description of what was wrong>

## Root Cause
<one sentence>

## Fix
<what changed and why>

## Test
<what regression test was added>

Closes #<ticket-number>" \
  --base <target-branch>
```

---

### Step 6 — @qa-engineer quick validation

@qa-engineer reviews the PR with focus on:
- Does the test actually verify the fix (not just pass vacuously)?
- Is the diff surgical (no unrelated changes)?
- Are there edge cases the test does not cover?

If the fix is P0 and there is no time for a full review — @qa-engineer approves conditionally with a comment: "Approved as emergency hotfix. Full review in post-mortem."

---

### Step 7 — Merge and close the ticket

```bash
# Merge (squash for bugfix, regular merge for hotfix to preserve history)
gh pr merge <PR_NUMBER> --squash

# Close ticket if it exists
gh issue close <ISSUE_NUMBER> --comment "Fixed in PR #<PR_NUMBER>"
```

For P0 hotfixes merged to `main`: cherry-pick the fix to `develop` to avoid regression in the next release:
```bash
git checkout develop
git cherry-pick <merge-commit-sha>
git push
```

---

## EXAMPLES

**Decision tree example**:

```
Report: "Users cannot log in — getting 500 error"
↓
Layer: Backend (auth endpoint)
Urgency: P0 — production login broken for all users
Decision: CHANGE → hotfix
Branch: hotfix/login-500-error from main
Fix: Read auth route → found missing null check on user.last_login
Test: test_login_returns_200_for_user_without_last_login
PR → main → MERGE
Cherry-pick → develop
Ticket #91 closed
```

**No-change decision example**:

```
Report: "Password reset emails are not being sent"
↓
Layer: Backend (email service)
Investigation: Email sending IS working — SMTP credentials are missing in staging env
Decision: NO CHANGE to code
Action: Update .env.staging.example + notify DevOps to set SMTP_* vars
Ticket #92 closed with: "Root cause was missing environment variables in staging.
Code is correct. See .env.example for required SMTP_* variables."
```

---

## ANTI-PATTERNS

- Refactoring while fixing — mixes unrelated changes, makes code review harder, increases regression risk
- Skipping the test because "it's a one-liner fix" — one-liner fixes that regress are the most embarrassing bugs
- Opening the PR to `main` for a P2 bug — bypasses the test/staging pipeline
- Fixing multiple bugs in a single PR — makes bisecting impossible and code review unfocused
- Merging a P0 hotfix without cherry-picking to `develop` — the fix disappears in the next release
- Closing the ticket without a comment explaining what was done — leaves the reporter without feedback and the team without searchable history
