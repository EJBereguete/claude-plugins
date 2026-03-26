# Git Standard

Conventional Commits enforced by commitlint. Branch naming enforced by branch protection rules.

---

## Conventional Commits

Format: `type(scope): description`

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature visible to the user |
| `fix` | Bug fix visible to the user |
| `test` | Adding or fixing tests (no production code change) |
| `refactor` | Code restructuring — no new behavior, no bug fixed |
| `docs` | Documentation changes only |
| `chore` | Maintenance: dependency updates, config, tooling |
| `ci` | CI/CD pipeline changes |
| `perf` | Performance improvement |
| `revert` | Reverting a previous commit |

### Rules

- **Present tense, imperative mood:** "add" not "added" or "adds"
- **Lowercase** — type, scope, and description
- **No period** at the end of the description
- **Scope** is mandatory — use the module/domain name
- **Breaking change:** append `!` after the type: `feat(auth)!: replace session auth with JWT`
- **Body optional** — use it when the _why_ isn't obvious from the title
- **Max 72 chars** for the first line

### Good vs Bad Examples

```
# ✅ GOOD
feat(auth): add Google OAuth integration
fix(invoices): correct total calculation when discount applied
test(users): add unit tests for registration endpoint
refactor(payments): extract stripe client to dedicated module
chore: upgrade fastapi to 0.115.0
ci: add coverage reporting step to pull request workflow
perf(invoices): add database index on user_id and status columns
docs(api): document authentication endpoints in openapi spec
feat(invoices)!: change invoice number format from INT to UUID

# ❌ BAD
fixed the login bug              ← no type, past tense
WIP                              ← not meaningful
feat: Updated lots of stuff      ← too vague, past tense
Fix(Auth): Fixed Login Bug.      ← capitalized, has period
feat: add new feature            ← scope missing, description too vague
hotfix                           ← not a valid type, no description
```

### Commit Body — When to Use It

Use the body when the **why** isn't obvious from the title. Separate with a blank line.

```
fix(invoices): prevent double charge on payment retry

Stripe webhooks were being processed twice when the initial HTTP response
timed out. Added idempotency key based on invoice_id + attempt_number
to prevent duplicate PaymentIntent creation.

Closes #183
```

---

## Branch Naming

| Pattern | Use case |
|---------|----------|
| `feature/{id}-{slug}` | New feature or enhancement |
| `bugfix/{id}-{slug}` | Bug fix on a non-production branch |
| `hotfix/{id}-{slug}` | Emergency fix applied directly to main |
| `refactor/{id}-{slug}` | Code restructuring without behavior change |
| `spike/{id}-{slug}` | Research, prototyping, exploration |

`{id}` is the task or ticket identifier. `{slug}` is a short kebab-case description.

```
# ✅ GOOD
feature/TASK-42-invoice-pdf-export
bugfix/TASK-67-fix-vat-rounding
hotfix/TASK-99-patch-auth-bypass
refactor/TASK-55-extract-payment-service
spike/TASK-12-evaluate-tiptap-vs-lexical

# ❌ BAD
my-branch
fix-stuff
johns-work
TASK-42             ← missing description
feature/invoice     ← missing task id
```

---

## commitlint Configuration

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],           // scope is required
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [1, 'always', 120],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'test', 'refactor', 'docs', 'chore', 'ci', 'perf', 'revert'],
    ],
  },
}
```

Install the hook via Husky:

```bash
# package.json
{
  "scripts": {
    "prepare": "husky"
  },
  "devDependencies": {
    "@commitlint/cli": "^19.0.0",
    "@commitlint/config-conventional": "^19.0.0",
    "husky": "^9.0.0"
  }
}
```

```bash
# .husky/commit-msg
npx --no -- commitlint --edit "$1"
```

---

## Pull Request Template

```markdown
<!-- .github/pull_request_template.md -->

## Summary

- <!-- What does this PR do? One bullet per logical change -->
-
-

## Type of Change

- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] refactor — no behavior change
- [ ] test — tests only
- [ ] chore — maintenance
- [ ] docs — documentation

## Acceptance Criteria Verification

<!-- Copy the ACs from the task and check them off -->

- [ ] AC1:
- [ ] AC2:
- [ ] AC3:

## Test Plan

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated (if applicable)
- [ ] Manual testing performed on local environment
- [ ] Edge cases covered: <!-- list them -->

## Screenshots

<!-- Required for UI changes. Before/After if fixing a visual bug. -->

| Before | After |
|--------|-------|
| | |

## Checklist

- [ ] Code follows the style guide (linter passes)
- [ ] Tests pass locally (`pytest` / `npm test`)
- [ ] Coverage does not decrease
- [ ] No secrets or credentials in code
- [ ] `.env.example` updated if new env vars added
- [ ] Migrations tested (if DB changes)

Closes #<!-- issue number -->
```

---

## Merge Strategy

| Scenario | Strategy |
|----------|----------|
| Feature branch into `develop` or `main` | **Squash merge** — one clean commit per PR |
| `develop` into `staging` | **Merge commit** — preserve traceability |
| `staging` into `main` | **Merge commit** — preserve traceability |
| WIP commits before opening PR | **Interactive rebase** — clean up locally before pushing |

**Rationale for squash merge on feature branches:** a feature branch accumulates "wip", "fix typo", and "address review" commits. The squash produces one atomic, correctly-named commit in the main history.

```bash
# Before opening a PR: clean up your local commits
git rebase -i origin/develop

# In the editor: squash or fixup intermediate commits
# Leave only meaningful commits with proper Conventional Commit messages
```

**Never:**
- Merge without all CI checks passing
- Force push to protected branches (`main`, `develop`, `staging`)
- Merge your own PR without at least one reviewer approval

---

## Branch Protection Rules (GitHub)

Required settings for `main` and `develop`:

```
Require a pull request before merging
  ✅ Required approvals: 1
  ✅ Dismiss stale pull request approvals when new commits are pushed
  ✅ Require review from Code Owners (if CODEOWNERS file exists)

Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  ✅ Required checks:
      - ci/test
      - ci/lint
      - ci/coverage

✅ Require conversation resolution before merging
✅ Do not allow bypassing the above settings (apply to admins too)
✅ Restrict who can push to matching branches (only CI/CD service accounts)
```

---

## Git Workflow Reference

### Personal projects (`feature/* → main`)

```
main
 └── feature/TASK-42-invoice-pdf-export
      ↓ (squash merge via PR)
main
```

### Company projects (`feature/* → develop → staging → main`)

```
main
 └── develop
      └── feature/TASK-42-invoice-pdf-export
           ↓ (squash merge via PR)
      develop
           ↓ (merge commit, scheduled release)
      staging
           ↓ (merge commit, after QA sign-off)
      main
```

### Emergency hotfix

```bash
git checkout main
git checkout -b hotfix/TASK-99-patch-auth-bypass
# make fix
git push origin hotfix/TASK-99-patch-auth-bypass
# open PR → squash merge to main → cherry-pick or merge to develop
```
