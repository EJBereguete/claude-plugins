# Engineering Standards

Reference files with real code examples. These define HOW code should look in this team.
Each file is heavy on examples and light on theory.

---

## Index

| File | Description |
|------|-------------|
| [clean-architecture.md](./clean-architecture.md) | Folder structures, dependency rule, and Use Case examples for Python/FastAPI and TypeScript/React |
| [solid-principles.md](./solid-principles.md) | All 5 SOLID principles with before/after code in Python and TypeScript |
| [dry-kiss-yagni.md](./dry-kiss-yagni.md) | DRY, KISS, YAGNI with real examples — including when NOT to apply DRY (AHA principle) |
| [domain-driven-design.md](./domain-driven-design.md) | Entity, Value Object, Aggregate, Repository, Domain Events with real Python examples |
| [api-design-standard.md](./api-design-standard.md) | REST naming, HTTP methods, status codes, RFC 9457 errors, versioning, pagination, rate limiting |
| [database-standard.md](./database-standard.md) | PostgreSQL naming conventions, index naming, migrations (Expand-Contract), soft delete, audit columns |
| [testing-standard.md](./testing-standard.md) | Test pyramid, Given/When/Then, factories, what to test vs what not to test, anti-patterns |
| [frontend-standard.md](./frontend-standard.md) | React+TypeScript folder structure, component naming, strict TypeScript, state management, WCAG 2.2, CWV |
| [git-standard.md](./git-standard.md) | Conventional Commits, branch naming, PR template, squash vs rebase vs merge, commitlint config |
| [security-standard.md](./security-standard.md) | OWASP ASVS L1 checklist, input validation, auth patterns, security headers, secrets, OWASP LLM Top 10 |
| [devops-standard.md](./devops-standard.md) | Dockerfile best practices, GitHub Actions template, health check standard, PRR checklist, SLO/SLI |

---

## How to use these files

- Read the relevant standard before starting a task in that domain.
- Standards are **prescriptive** — follow them unless you have a documented reason not to.
- If a standard conflicts with a library's idiomatic style, prefer the standard and note the deviation in the PR.
- Standards evolve — open a PR against this folder to propose changes.

## Non-negotiables

The following items are enforced in CI and are never optional:

1. Tests must pass before merge.
2. Secrets must never appear in code or git history.
3. All API inputs must be validated via schema (Pydantic / Zod / equivalent).
4. Commits must follow Conventional Commits format.
5. PRs must reference an issue or ticket.
