# Skill: Git Workflow

> Opinionated, production-tested Git workflow for solo and team projects.
> Covers branching, commits, hooks, merges, PRs, and conflict resolution.

---

## 1. Branching Strategy

### Personal projects — simple flow

```
main          ← production (protected, PR only)
feature/*     ← development branches
hotfix/*      ← urgent production fixes
```

Rules:
- No commits directly to `main`.
- `feature/*` branches off `main`, merges back to `main` via squash.
- `hotfix/*` branches off `main`, merges back to `main` via squash.
- Delete branches after merge.

### Team projects — multi-environment flow

```
main          ← production (protected, PR only, requires 2 approvals)
staging       ← pre-production (protected, PR only, requires 1 approval)
develop       ← integration (protected, PR only)
feature/*     ← feature development
fix/*         ← non-urgent bug fixes
hotfix/*      ← urgent production fixes (branch off main)
chore/*       ← tooling, deps, config
release/*     ← release preparation
```

Flow:
```
feature/42-user-auth  →  develop  →  staging  →  main
hotfix/99-crash-login →  main  (and cherry-pick to develop)
release/1.4.0         →  staging  →  main  (tagged)
```

Rules:
- `feature/*`, `fix/*`, `chore/*` branch off `develop`.
- `hotfix/*` branches off `main`, then merges to `main` AND `develop`.
- `release/*` branches off `develop`, merges to `staging` then `main`.
- Never merge `main` → `develop` directly; cherry-pick hotfixes instead.

---

## 2. Branch Naming Conventions

Pattern: `<type>/<issue-id>-<short-description-in-kebab-case>`

```bash
feature/42-user-authentication
feature/87-payment-webhook-handler
fix/101-invoice-total-rounding
hotfix/99-crash-on-login-null-pointer
chore/update-dependencies-q1-2026
release/1.4.0
docs/update-api-readme
```

Rules:
- Always kebab-case — no spaces, no underscores, no uppercase.
- Include issue/ticket ID when one exists.
- Keep it under 60 characters.
- Use the same type prefixes as Conventional Commits (`feature`, `fix`, `hotfix`, `chore`, `release`, `docs`).

---

## 3. Conventional Commits — Full Specification

Format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Commit types

| Type       | SemVer bump | Use when                                                  |
|------------|-------------|-----------------------------------------------------------|
| `feat`     | MINOR       | New feature for the user                                  |
| `fix`      | PATCH       | Bug fix for the user                                      |
| `refactor` | none        | Code change that is not a fix or feature                  |
| `perf`     | PATCH       | Code change that improves performance                     |
| `test`     | none        | Adding or correcting tests                                |
| `docs`     | none        | Documentation only changes                                |
| `style`    | none        | Formatting, whitespace — no logic change                  |
| `chore`    | none        | Dependency updates, build tooling, config                 |
| `ci`       | none        | CI/CD pipeline changes                                    |
| `build`    | none        | Changes affecting build system (webpack, gradle, etc.)    |
| `revert`   | varies      | Reverts a previous commit                                 |
| `security` | PATCH       | Security patches or vulnerability fixes                   |

### Scopes

Scopes are optional but strongly recommended for multi-module projects:

```
feat(auth): add JWT refresh token rotation
fix(invoices): correct total calculation rounding
perf(db): add index on users.email column
chore(deps): upgrade fastapi to 0.115.0
```

Scopes should match your project's domain modules (e.g., `auth`, `users`, `payments`, `api`, `ui`, `db`).

### Breaking changes

Two ways to declare a breaking change (both trigger MAJOR version bump):

```bash
# Option 1 — exclamation mark in type (preferred for brevity)
feat(api)!: remove v1 endpoint in favor of v2

# Option 2 — BREAKING CHANGE footer
feat(auth): replace session cookies with JWT

BREAKING CHANGE: All clients must send Authorization header.
Cookies are no longer accepted. Migrate using the v2 auth guide.
```

### Commit message body and footers

```
fix(payments): prevent duplicate charge on retry

Stripe's idempotency key was not being set correctly when the
network request timed out and the client retried automatically.

Closes #234
Reviewed-by: Alice <alice@example.com>
```

### Examples — all types

```bash
feat(users): add email verification on registration
fix(auth): prevent token refresh on revoked sessions
fix(api)!: remove deprecated /v1/users endpoint
perf(search): cache elasticsearch results for 5 minutes
refactor(orders): extract pricing logic into PricingService
test(payments): add unit tests for retry idempotency
docs: add ADR-007 for JWT storage decision
style: run prettier on all TypeScript files
chore(deps): upgrade react to 19.1.0
ci: add SAST scanning step to PR workflow
security(auth): patch timing attack in password comparison
revert: feat(auth): add biometric login
```

---

## 4. Atomic Commits — Best Practices

**One commit = one logical change.** Not one file, not one day's work.

```bash
# Bad — too many unrelated changes in one commit
git commit -m "fix login bug, update deps, add user model"

# Good — split into atomic commits
git commit -m "fix(auth): prevent redirect loop on expired session"
git commit -m "chore(deps): upgrade pydantic to 2.7.0"
git commit -m "feat(users): add UserProfile model with avatar field"
```

**When to squash locally before pushing:**
- WIP commits ("fix typo", "oops", "try this") before opening a PR.
- Exploratory commits that collectively implement one feature.

```bash
# Squash last N commits interactively before pushing
git rebase -i HEAD~4
```

**When NOT to squash:**
- When each commit represents a genuinely separate concern.
- When commit history will be used for `git bisect` debugging.

---

## 5. Merge Strategies — When to Use Each

### Merge commit (`git merge`)

Creates a merge commit that preserves full branch history.

```bash
git checkout develop
git merge feature/42-user-auth
```

**Use when:**
- Merging long-lived branches (e.g., `release/*` → `main`).
- Preserving the exact history of a team branch matters.
- Branch was shared with other developers.

**Avoid when:** The branch has noisy WIP commits that clutter history.

### Squash merge (`git merge --squash`)

Collapses all branch commits into one commit on the target branch.

```bash
git checkout develop
git merge --squash feature/42-user-auth
git commit -m "feat(auth): add user authentication with JWT"
```

**Use when:**
- Merging short-lived feature branches to `develop` or `main`.
- The branch has messy WIP commits not worth preserving.
- You want one clean entry per feature in `main`'s history.

**Avoid when:** The feature is large and the individual commits carry important context.

### Rebase (`git rebase`)

Replays commits on top of another branch — linear history, no merge commit.

```bash
# Update feature branch with latest develop before opening PR
git checkout feature/42-user-auth
git fetch origin
git rebase origin/develop
```

**Use when:**
- Updating a local feature branch with changes from `develop` before opening a PR.
- Cleaning up local commit history before sharing.

**Never rebase:**
- Commits already pushed to a shared remote branch.
- `main`, `develop`, or `staging` branches.

### Decision matrix

| Scenario                                  | Strategy         |
|-------------------------------------------|------------------|
| feature/* → develop (solo)                | Squash merge     |
| feature/* → develop (team PR)             | Squash merge     |
| develop → staging                         | Merge commit     |
| staging → main                            | Merge commit     |
| hotfix/* → main                           | Squash merge     |
| Updating feature branch before PR         | Rebase (local)   |
| release/* → main                          | Merge commit + tag |

---

## 6. Git Hooks Setup

### Directory structure

```
.husky/
  pre-commit
  commit-msg
  pre-push
.commitlintrc.yml
package.json  ← lint-staged config
```

### Install Husky + lint-staged (Node projects)

```bash
npm install --save-dev husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init
```

### `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged: lint + format only staged files
npx lint-staged

# For Python projects, run ruff on staged .py files
# git diff --cached --name-only --diff-filter=ACM | grep '\.py$' | xargs ruff check --fix
# git diff --cached --name-only --diff-filter=ACM | grep '\.py$' | xargs git add
```

Timing target: under 10 seconds. Lint staged files only — never the entire project.

### `.husky/commit-msg`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate commit message against Conventional Commits spec
npx --no -- commitlint --edit "$1"
```

### `.husky/pre-push`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Block direct push to protected branches
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "staging" ] || [ "$BRANCH" = "develop" ]; then
  echo "ERROR: Direct push to '$BRANCH' is not allowed. Open a PR."
  exit 1
fi

# Run full test suite before push
npm test -- --passWithNoTests
# For Python: python -m pytest --tb=short -q
```

Timing target: under 60 seconds. Run full tests, but skip slow E2E here.

### `.commitlintrc.yml`

```yaml
extends:
  - '@commitlint/config-conventional'

rules:
  type-enum:
    - 2
    - always
    - [feat, fix, refactor, perf, test, docs, style, chore, ci, build, revert, security]
  scope-case:
    - 2
    - always
    - lower-case
  subject-case:
    - 2
    - always
    - lower-case
  subject-max-length:
    - 2
    - always
    - 100
  subject-empty:
    - 2
    - never
  type-empty:
    - 2
    - never
  header-max-length:
    - 2
    - always
    - 120
```

### `package.json` — lint-staged config

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss,json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### Python projects — pre-commit framework alternative

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.10.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]

  - repo: https://github.com/alessandrojcm/commitlint-pre-commit-hook
    rev: v9.14.0
    hooks:
      - id: commitlint
        stages: [commit-msg]
        additional_dependencies: ['@commitlint/config-conventional']
```

Install: `pip install pre-commit && pre-commit install --hook-type commit-msg`

---

## 7. GitHub Actions — PR Validation Workflow

```yaml
# .github/workflows/pr-validation.yml
name: PR Validation

on:
  pull_request:
    branches: [main, develop, staging]
  pull_request_target:
    types: [opened, synchronize, reopened]

jobs:
  lint-and-test:
    name: Lint & Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4

  commitlint:
    name: Validate Commit Messages
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: wagoid/commitlint-github-action@v6
        with:
          configFile: .commitlintrc.yml

  pr-title:
    name: Validate PR Title
    runs-on: ubuntu-latest
    steps:
      - uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          types: |
            feat
            fix
            refactor
            perf
            test
            docs
            style
            chore
            ci
            build
            revert
            security
          requireScope: false
```

### Branch protection rules (configure in GitHub settings)

For `main` and `staging`:
- Require pull request before merging: ON
- Require approvals: 2 (main), 1 (staging)
- Dismiss stale reviews when new commits are pushed: ON
- Require status checks to pass: `lint-and-test`, `commitlint`, `pr-title`
- Require branches to be up to date before merging: ON
- Restrict who can push: repo admins only
- Do not allow bypassing: ON

---

## 8. PR Workflow — Draft → Ready → Review → Merge

### Lifecycle

```
1. Create branch from develop (or main for personal)
2. Develop + commit (atomic, conventional)
3. Push and open as DRAFT PR immediately
4. Rebase/update on target branch before requesting review
5. Self-review your own diff — read it line by line
6. Mark as Ready for Review
7. Address all review comments
8. Get required approvals
9. Squash merge
10. Delete branch
```

### PR template

```markdown
## Summary
What this PR does and why — max 2 sentences.
Closes #<issue-number>

## Changes
- Added X
- Modified Y to fix Z
- Removed deprecated W

## Testing
- [ ] Unit tests pass (`npm test` / `pytest`)
- [ ] Integration tests pass
- [ ] Tested locally against dev environment
- [ ] No regressions in affected areas

## Security Checklist
- [ ] No secrets or credentials in code
- [ ] All inputs validated/sanitized
- [ ] No new permissions granted without review

## Evidence
<!-- Attach screenshots, logs, or test output -->
```

### PR size guidelines

| Size       | Lines changed | Review time |
|------------|---------------|-------------|
| Ideal      | < 200         | < 30 min    |
| Acceptable | 200–400       | 30–60 min   |
| Large      | 400–800       | Schedule a walkthrough |
| Reject     | > 800         | Split the PR          |

### Reviewer responsibilities

- Review within 24 business hours.
- Distinguish blocking comments (`BLOCKER:`) from suggestions (`NIT:`).
- Approve only when all blockers are resolved.
- Don't approve and immediately merge — give the author a chance to see it.

---

## 9. Conflict Resolution Strategy

### Prevention (best approach)

- Keep feature branches short-lived (< 3 days when possible).
- Rebase on `develop` at least once a day during active development.
- Communicate when touching shared files (migrations, config, constants).

### Resolution process

```bash
# 1. Fetch latest
git fetch origin

# 2. Rebase feature branch on develop
git checkout feature/42-user-auth
git rebase origin/develop

# 3. For each conflict — in your editor or with a merge tool
git mergetool   # or open IDE conflict UI

# 4. After resolving each file
git add <resolved-file>
git rebase --continue

# 5. Force push (only your feature branch — never shared branches)
git push --force-with-lease origin feature/42-user-auth
```

### Conflict decision rules

- **When in doubt, talk to the other author.** Do not guess intent.
- Their change + your change → keep both if logically independent.
- Their change replaces yours → accept theirs, apply your change on top.
- Lock files (`package-lock.json`, `poetry.lock`): regenerate, don't merge manually.
- Migration conflicts: coordinate with the team, never auto-resolve.

### Abort an in-progress rebase

```bash
git rebase --abort
```

---

## 10. Common Git Commands Reference

```bash
# --- Branch management ---
git checkout -b feature/42-description   # Create and switch to new branch
git branch -d feature/42-description     # Delete local branch (safe)
git push origin --delete feature/42-description  # Delete remote branch
git branch -a                            # List all branches (local + remote)

# --- Keeping in sync ---
git fetch origin                         # Download remote changes (no merge)
git rebase origin/develop               # Replay local commits on top of develop
git pull --rebase origin develop        # Fetch + rebase in one step

# --- Staging and commits ---
git add -p                              # Stage hunks interactively (preferred)
git commit --amend --no-edit           # Add staged changes to last commit (local only)
git stash push -m "wip: description"   # Stash with a label
git stash pop                           # Apply most recent stash

# --- History inspection ---
git log --oneline --graph --decorate --all  # Visual branch history
git log --oneline -20                       # Last 20 commits
git diff origin/develop...HEAD             # Changes since branching from develop
git show <commit-hash>                     # Show a specific commit
git blame <file>                           # Who changed each line

# --- Undoing changes ---
git restore <file>                         # Discard unstaged changes (safe)
git restore --staged <file>                # Unstage a file
git revert <commit-hash>                   # Revert a commit (safe, creates new commit)
git reset --soft HEAD~1                    # Undo last commit, keep changes staged
# git reset --hard HEAD~1                 # DANGER: destroys the last commit permanently

# --- Cleanup ---
git remote prune origin                   # Remove stale remote-tracking branches
git gc --prune=now                        # Garbage collect loose objects

# --- PR via CLI ---
gh pr create --title "feat(auth): add JWT refresh" \
  --body "$(cat .github/PR_TEMPLATE.md)" \
  --draft --label "backend"

gh pr ready                              # Mark PR as ready for review
gh pr merge --squash --delete-branch    # Squash merge and delete branch
```

---

## 11. Anti-Patterns to Avoid

| Anti-pattern                          | Problem                                              | Fix                                          |
|---------------------------------------|------------------------------------------------------|----------------------------------------------|
| Committing directly to `main`         | Bypasses review, breaks CI gate                      | Always use a branch + PR                     |
| Giant PRs (1000+ lines)               | Impossible to review properly                        | Split by logical layer or concern            |
| `git push --force` on shared branches | Rewrites history, breaks team's local copies         | Use `--force-with-lease` only on your branch |
| Merge commits from develop → feature  | Pollutes feature branch history                      | Use `git rebase` to update instead           |
| Vague commit messages (`fix`, `wip`)  | Useless history for debugging and releases           | Follow Conventional Commits                  |
| Long-lived feature branches (weeks)   | Massive merge conflicts, integration risk            | Keep branches < 1 week, use feature flags    |
| Skipping hooks with `--no-verify`     | Lets broken/non-compliant code into the repo         | Fix the underlying issue instead             |
| Hardcoded secrets in commits          | Permanent exposure even after deletion               | Use env vars; rotate the credential          |
| Squashing hotfixes                    | Loses audit trail for security and compliance        | Use merge commit for hotfixes                |
| Rebasing `develop` or `main`          | Rewrites shared history, breaks everyone             | Only rebase your own feature branches        |
| Auto-resolving lock file conflicts    | Introduces inconsistent dependency trees             | Regenerate with package manager              |
| Merge without up-to-date check        | "Works on my branch" syndrome                        | Enforce "require up-to-date" in branch rules |

---

## 12. Semantic Versioning Reference

Conventional Commits map directly to SemVer bumps:

```
fix:, perf:, security:     →  PATCH   1.0.0 → 1.0.1
feat:                      →  MINOR   1.0.0 → 1.1.0
feat!:, BREAKING CHANGE:   →  MAJOR   1.0.0 → 2.0.0
```

Automate version bumps with `semantic-release` or `release-please` based on commit history.

```bash
# release-please (Google) — works with GitHub Actions
# semantic-release — works with any CI
```
