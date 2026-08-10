# Engineering Standards

Reference files with real code examples. These define HOW code should look in this team.
Each standard lives in its own folder, with its language-specific code examples right inside it —
no separate `examples/` tree grouped by language.

---

## Index

| Folder | Description |
|------|-------------|
| [clean-architecture/](./clean-architecture/README.md) | Folder structures, dependency rule, and Use Case examples for Python/FastAPI, TypeScript/React and C#/ASP.NET Core |
| [solid-principles/](./solid-principles/README.md) | All 5 SOLID principles with before/after code in Python, TypeScript and C# |
| [dry-kiss-yagni/](./dry-kiss-yagni/README.md) | DRY, KISS, YAGNI with real examples — including when NOT to apply DRY (AHA principle) |
| [domain-driven-design/](./domain-driven-design/README.md) | Entity, Value Object, Aggregate, Repository, Domain Events with real Python examples |
| [api-design/](./api-design/README.md) | REST naming, HTTP methods, status codes, RFC 9457 errors, versioning, pagination, rate limiting |
| [database/](./database/README.md) | PostgreSQL naming conventions, index naming, migrations (Expand-Contract), soft delete, audit columns |
| [testing/](./testing/README.md) | Test pyramid, Given/When/Then, factories, what to test vs what not to test, anti-patterns |
| [frontend/](./frontend/README.md) | React+TypeScript folder structure, component naming, strict TypeScript, state management, WCAG 2.2, CWV — plus C# UI examples (Blazor, MAUI, Razor Pages) |
| [git/](./git/README.md) | Conventional Commits, branch naming, PR template, squash vs rebase vs merge, commitlint config |
| [security/](./security/README.md) | OWASP ASVS L1 checklist, input validation, auth patterns, security headers, secrets, OWASP LLM Top 10 |
| [devops/](./devops/README.md) | Dockerfile best practices, GitHub Actions template, health check standard, PRR checklist, SLO/SLI |

---

## Code examples live inside each standard

Each topic folder that has language-specific code carries its own `examples/` subfolder, one file
per language:

```
standards/<tema>/
├── README.md              ← the standard itself (rules + rationale)
└── examples/
    ├── csharp.md
    ├── python.md
    └── typescript.md
```

Topics without language-specific code (`git/`, `security/`, `devops/`, `dry-kiss-yagni/`) only have
`README.md` — no `examples/` subfolder.

A few C#-specific pattern references that don't map 1:1 to a single language file live as extra,
descriptively-named files inside the closest topic's `examples/` folder instead of being forced into
a generic name:

| File | Topic folder | Why it lives there |
|------|--------------|---------------------|
| `examples/csharp-cqrs-mediatr.md` | `clean-architecture/` | CQRS/MediatR is an Application-layer pattern within Clean Architecture |
| `examples/csharp-design-patterns.md` | `clean-architecture/` | Result Pattern, Repository/UoW, Decorator, Strategy, Observer — architecture-layer patterns |
| `examples/csharp-conventions.md` | `clean-architecture/` | Team-wide C#/.NET conventions and standard NuGet packages |
| `examples/csharp-blazor.md`, `examples/csharp-maui.md`, `examples/csharp-razor-pages.md` | `frontend/` | C#'s UI framework equivalents to the React/TypeScript frontend standard |

## How to use these files

1. Read the relevant **standard** (`README.md`) first to understand the rules and decisions.
2. Consult `examples/<language>.md` inside that same folder for concrete, copy-pasteable implementations.
3. Adapt the examples to the project's actual framework versions (check `context7` MCP for current docs).
4. Standards are **prescriptive** — follow them unless you have a documented reason not to.
5. If a standard conflicts with a library's idiomatic style, prefer the standard and note the deviation in the PR.
6. Standards evolve — open a PR against this folder to propose changes. When the project changes stack, only the affected `examples/<language>.md` file needs updating — the rules in `README.md` stay the same.

## Non-negotiables

The following items are enforced in CI and are never optional:

1. Tests must pass before merge.
2. Secrets must never appear in code or git history.
3. All API inputs must be validated via schema (Pydantic / Zod / equivalent).
4. Commits must follow Conventional Commits format.
5. PRs must reference an issue or ticket.
