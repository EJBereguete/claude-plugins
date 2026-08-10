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

---

## Git Hooks Setup (Husky + lint-staged)

```
.husky/
  pre-commit
  commit-msg
  pre-push
.commitlintrc.yml
package.json  ← lint-staged config
```

```bash
npm install --save-dev husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init
```

`.husky/pre-commit` (target: under 10s — lint staged files only, never the whole project):
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx lint-staged
# Python: git diff --cached --name-only --diff-filter=ACM | grep '\.py$' | xargs ruff check --fix
```

`.husky/pre-push` (target: under 60s — block direct pushes to protected branches, run full tests):
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "staging" ] || [ "$BRANCH" = "develop" ]; then
  echo "ERROR: Direct push to '$BRANCH' is not allowed. Open a PR."
  exit 1
fi
npm test -- --passWithNoTests
```

Python alternative — `pre-commit` framework instead of Husky:
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4
    hooks: [{id: ruff, args: [--fix]}, {id: ruff-format}]
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.10.0
    hooks: [{id: mypy}]
```
Install: `pip install pre-commit && pre-commit install --hook-type commit-msg`

---

## GitHub Actions — PR Validation Workflow

```yaml
# .github/workflows/pr-validation.yml
name: PR Validation
on:
  pull_request:
    branches: [main, develop, staging]
jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: wagoid/commitlint-github-action@v6
        with: { configFile: .commitlintrc.yml }
  pr-title:
    runs-on: ubuntu-latest
    steps:
      - uses: amannn/action-semantic-pull-request@v5
        env: { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" }
```

Branch protection required checks: `lint-and-test`, `commitlint`, `pr-title`.

---

## Conflict Resolution Strategy

**Prevention:** keep feature branches short-lived (< 3 days), rebase on `develop` daily, communicate when touching shared files (migrations, config, constants).

```bash
git fetch origin
git checkout feature/42-user-auth
git rebase origin/develop
# resolve each conflict, then:
git add <resolved-file>
git rebase --continue
git push --force-with-lease origin feature/42-user-auth   # only your own branch
```

Decision rules: when in doubt, talk to the other author — don't guess intent. Lock files (`package-lock.json`, `poetry.lock`) — regenerate, never merge manually. Migration conflicts — coordinate with the team, never auto-resolve. Abort with `git rebase --abort`.

---

## Common Git Commands Reference

```bash
git branch -a                                # List all branches (local + remote)
git push origin --delete feature/42-x        # Delete remote branch
git fetch origin && git rebase origin/develop  # Sync without merge commit
git add -p                                   # Stage hunks interactively
git log --oneline --graph --decorate --all   # Visual branch history
git diff origin/develop...HEAD               # Changes since branching
git restore <file>                           # Discard unstaged changes (safe)
git revert <commit-hash>                     # Revert a commit (safe, new commit)
# git reset --hard HEAD~1                    # DANGER: destroys last commit permanently
git remote prune origin                      # Remove stale remote-tracking branches
gh pr merge --squash --delete-branch         # Squash merge and delete branch
```

---

## Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Committing directly to `main` | Bypasses review, breaks CI gate | Always use a branch + PR |
| Giant PRs (1000+ lines) | Impossible to review properly | Split by logical layer/concern |
| `git push --force` on shared branches | Rewrites history, breaks team's local copies | Use `--force-with-lease` only on your own branch |
| Vague commit messages (`fix`, `wip`) | Useless history for debugging/releases | Follow Conventional Commits |
| Long-lived feature branches (weeks) | Massive merge conflicts | Keep < 1 week, use feature flags |
| Skipping hooks with `--no-verify` | Lets non-compliant code into the repo | Fix the underlying issue instead |
| Squashing hotfixes | Loses audit trail for security/compliance | Use merge commit for hotfixes |
| Auto-resolving lock file conflicts | Inconsistent dependency trees | Regenerate with the package manager |

---

## Semantic Versioning Reference

Conventional Commits map directly to SemVer bumps:

```
fix:, perf:                →  PATCH   1.0.0 → 1.0.1
feat:                      →  MINOR   1.0.0 → 1.1.0
feat!:, BREAKING CHANGE:   →  MAJOR   1.0.0 → 2.0.0
```

Automate version bumps with `semantic-release` or `release-please` based on commit history.
