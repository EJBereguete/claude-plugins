# Standards vs Skills

**Source:** https://buildermethods.com/agent-os/standards-vs-skills

---

Knowing when to use each

## The Difference

**Standards are declarative**—they describe conventions and patterns.

> "Our API responses use this format."

**Skills are procedural**—they describe how to do tasks.

> "When creating an API endpoint, follow these steps."

## Comparison

### Standards

- **Type:** Conventions, patterns
- **Invocation:** Explicit (`/inject-standards`)
- **Location:** `agent-os/standards/`

### Skills

- **Type:** Procedures, workflows
- **Invocation:** Auto-detected by Claude
- **Location:** `.claude/skills/`

## When to Use /inject-standards

- You want explicit control over which conventions apply
- You're doing something that spans multiple domains
- You're building a skill and want to bake in conventions
- You want to see what standards exist for a task

## When to Rely on Skills

- You have a repeatable procedure you want automated
- You want Claude to auto-detect when to apply something
- The task is self-contained

For creating skills, see [Claude's official skills documentation](https://code.claude.com/docs/en/skills).

## Converting Between Them

### Convert to Skill If:

- The standard describes how to do something (procedure)
- You want it invoked automatically without thinking about it
- It's a complete, self-contained workflow

### Keep as Standard If:

- It describes conventions only (no procedure)
- You want explicit control over when it's applied
- It's meant to be combined with other standards
- It applies across many different task types

## Skills Can Reference Standards

This is often the best approach. A Skill can include:

```markdown
Before implementing, read:
- agent-os/standards/api/response-format.md
- agent-os/standards/api/error-handling.md
```

This gives you procedural automation (Skill) with declarative conventions (Standards).

## /inject-standards Surfaces Skills

When you run `/inject-standards`, it will:

1. Identify and inject relevant standards
2. Mention any relevant Skills that exist

It won't auto-invoke Skills, but surfaces them so you can decide.

## Next Steps

- [Learn about standards](02-standards.md)
- [Inject standards workflow](../Workflow/03-inject-standards.md)
- [File structure reference](04-file-structure.md)

---

[← Back to Concepts](00-concepts-overview.md)
