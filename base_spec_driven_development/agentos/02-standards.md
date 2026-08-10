# Standards

**Source:** https://buildermethods.com/agent-os/standards

---

Documenting your coding conventions

## What Are Standards?

Standards are declarative documentation of your coding conventions. They describe patterns and rules without prescribing step-by-step procedures.

Examples:

- "All API responses use this envelope structure"
- "Error codes follow this naming convention"
- "Database migrations must include rollback logic"

## Where They Live

Standards live in your project's codebase in the `agent-os/standards/` folder, organized by domain:

```
agent-os/standards/
├── api/
│   ├── response-format.md
│   └── error-handling.md
├── database/
│   └── migrations.md
├── naming-conventions.md    # Root-level standards
└── index.yml                # Index for matching
```

## Writing Good Standards

Standards are injected into AI context windows. Every word costs tokens. Keep them concise.

### Guidelines

- **Lead with the rule** — State what to do first, explain why second (if needed)
- **Use code examples** — Show, don't tell
- **Skip the obvious** — Don't document what the code already makes clear
- **One standard per concept** — Don't combine unrelated patterns
- **Bullet points over paragraphs** — Scannable beats readable

### Good Example

```markdown
# Error Responses

Use error codes: `AUTH_001`, `DB_001`, `VAL_001`

```json
{ "success": false, "error": { "code": "AUTH_001", "message": "..." } }
```

- Always include both code and message
- Log full error server-side, return safe message to client
```

### Bad Example

```markdown
# Error Handling Guidelines

When an error occurs in our application, we have established
a consistent pattern for how errors should be formatted and
returned to the client. This helps maintain consistency across
our API and makes it easier for frontend developers to handle
errors appropriately...

[continues for 3 more paragraphs]
```

## The Index

The `index.yml` file enables `/inject-standards` to suggest relevant standards without reading every file. This keeps context lean—the agent reads one small index instead of loading all your standards, then only injects the ones that match:

```yaml
api:
  response-format:
    description: API response envelope structure, status codes
  error-handling:
    description: Error code conventions, exception handling

root:
  naming-conventions:
    description: File, class, and variable naming conventions
```

> **Note:** `root` is a reserved keyword for standards files in the root of `agent-os/standards/` (not in subfolders).

## Creating Standards

### Via /discover-standards

The recommended way. The command extracts patterns from your codebase and guides you through documenting them.

[Learn about discovering standards →](../Workflow/02-discover-standards.md)

### Manually

Create `.md` files in `agent-os/standards/`. After creating, run `/index-standards` to update the index.

## When to Write Standards

**Write standards for:**

- Patterns that are unusual or unconventional
- Opinionated choices that could have gone differently
- Tribal knowledge a new developer wouldn't know
- Things people frequently get wrong

**Don't write standards for:**

- Standard framework patterns
- Obvious best practices
- Things the code already makes clear

## Next Steps

- [Standards vs Skills](03-standards-vs-skills.md)
- [Discover standards workflow](../Workflow/02-discover-standards.md)
- [Inject standards workflow](../Workflow/03-inject-standards.md)

---

[← Back to Concepts](00-concepts-overview.md)
