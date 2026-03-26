---
name: pr-standards
description: >
  Standards for creating, reviewing, and merging Pull Requests. Ensures every PR
  has proper context, references a ticket, includes tests, and gets reviewed before merge.
used_by:
  - backend-engineer
  - frontend-engineer
  - qa-engineer
  - architect
  - project-manager
---

# SKILL: PR Standards

## CONTRACT

- **Input**: Completed implementation on a feature branch
- **Output**: Merged PR with full traceability — ticket reference, passing CI, review approval, test evidence
- **Who runs this**: Any engineer opening or reviewing a PR

---

## PROCESS

### Step 1 — PR Title

Follow the same Conventional Commits format used for commit messages:

```
type(scope): short description
```

Examples:
- `feat(auth): add JWT refresh token rotation`
- `fix(invoices): correct VAT calculation for EU customers`
- `refactor(users): extract email validation to service layer`
- `test(payments): add edge cases for currency conversion`

**Rules**:
- Max 72 characters
- Lowercase after the colon
- No period at the end
- Must accurately describe what changed, not how

---

### Step 2 — PR Size

Prefer **< 400 lines changed** per PR. If the PR is larger, include an explicit justification in the body.

If a feature requires > 400 lines: split into multiple stacked PRs or use a feature flag to merge incrementally.

---

### Step 3 — PR Body

Use this template for every PR:

```markdown
## Summary
- What changed and why (3 bullet points max)

## Type of change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation

## Acceptance Criteria Verified
- [x] AC1: Given..., When..., Then... ✅
- [x] AC2: ... ✅

## Tests
- Unit tests: X added, all passing
- E2E: see /docs/tasks/active/TASK-<id>/evidence/

## Screenshots
(if UI change — required, attach inline)

## Notes for reviewer
(anything unusual, shortcuts taken, known limitations, open questions)

Closes #<issue-number>
```

Every PR **must** reference a ticket via `Closes #N` or `Related to #N`.

---

### Step 4 — OpenAPI update (if applicable)

If the PR adds or modifies API endpoints, update `/docs/02-api/openapi.yml`.

For FastAPI, export the spec with:

```bash
python -c "
import json
from src.main import app
print(json.dumps(app.openapi(), indent=2))
" > docs/02-api/openapi.yml
```

Commit the updated spec as part of the same PR.

---

### Step 5 — Code Review checklist (for reviewers)

Review every PR across these 6 dimensions before approving:

1. **Correctness** — Does the implementation match what the ticket describes? Are edge cases handled?
2. **Tests** — Are tests present? Do they test behavior, not implementation? Do they cover error and boundary cases?
3. **Security** — Any OWASP Top 10 concerns? (injection, auth bypass, insecure direct object reference, exposed secrets)
4. **Performance** — Any N+1 queries? Synchronous calls in hot paths? Unindexed queries on large tables?
5. **Maintainability** — Is the code readable? Functions < 40 lines? Does it follow project conventions?
6. **Technical Debt** — Is any new debt being introduced? If so, is it tracked in a follow-up ticket?

Leave comments as:
- `nit:` — optional, stylistic
- `suggestion:` — recommended but not blocking
- `must:` — blocking, must be resolved before approval

---

### Step 6 — Review SLA

| PR Type | Response Time |
|---------|---------------|
| Regular feature PR | 24 hours |
| Hotfix / incident fix | 4 hours |

If the reviewer cannot meet the SLA, they must re-assign or notify the author.

---

### Step 7 — Approval requirements

| Change Type | Approvals Required |
|-------------|-------------------|
| Standard feature | 1 approval (any engineer) |
| Auth, payments, or core infrastructure | 2 approvals (including @architect) |
| Database schema change | 1 approval + @devops-engineer sign-off |
| Any PR | QA must confirm E2E green before merge |

**Never merge your own PR**, regardless of approval count.

---

### Step 8 — Merge

- Merge only when CI is green (all checks passing)
- Use **Squash and Merge** for feature PRs to keep history clean
- Use **Merge Commit** only for release PRs (develop → staging, staging → main)
- Delete the feature branch after merge

---

## EXAMPLE

### Bad PR

```
Title: fix stuff

Body: (empty)

No ticket reference.
No tests mentioned.
CI is failing but "it works on my machine".
```

### Good PR

```
Title: fix(invoices): correct VAT calculation for EU customers

## Summary
- VAT was being applied to non-taxable line items for EU customers
- Added country-code check before applying VAT multiplier
- Fixes regression introduced in #412

## Type of change
- [x] Bug fix

## Acceptance Criteria Verified
- [x] AC1: Given EU customer, When invoice generated, Then VAT applied only to taxable items ✅
- [x] AC2: Given non-EU customer, When invoice generated, Then behavior unchanged ✅

## Tests
- Unit tests: 4 added (happy path, non-EU bypass, zero-tax item, mixed cart)
- E2E: see /docs/tasks/active/TASK-089/evidence/

## Screenshots
N/A — backend change

## Notes for reviewer
The `is_eu_customer` helper already existed in `src/utils/geo.py`, just wasn't being called in the invoice service. Kept the fix minimal.

Closes #501
```

---

## ANTI-PATTERNS

- Merging your own PR — always required at least one other reviewer
- Merging with red CI — no exceptions, even for "small" fixes
- Giant PRs (> 800 lines) — impossible to review meaningfully, always split
- No ticket reference — every PR must trace back to a user story or bug report
- Approval without reading the code — "LGTM" with no comments on a 500-line PR is not a review
- Fixing review comments but not re-requesting review — always ping the reviewer when ready
- Force-pushing to a PR branch after review has started — use new commits so reviewers can see what changed
