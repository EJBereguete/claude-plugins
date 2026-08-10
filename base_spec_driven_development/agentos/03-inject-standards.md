# Inject Standards

**Source:** https://buildermethods.com/agent-os/inject-standards

---

Deploy relevant standards into your current context

## What It Does

The `/inject-standards` command is a **v3.0 feature** that injects standards into any context: conversations, plans, Claude Skills, or anywhere your agent needs them.

It automatically detects which standards are relevant via the new `index.yml` file, ensuring you get the right standards at the right time.

## When to Run It

- **Before implementation work** — Load relevant standards
- **During planning** — Ensure specs align with conventions
- **Quick implementations** — Get standards without full discovery
- **Creating custom tools** — Bake standards into subagents or Skills

## How It Works

The command can:

1. **Auto-suggest** based on what you're working on
2. **Explicitly inject** specific standards you request
3. Read the `agent-os/standards/index.yml` to match context
4. Deploy standards without cluttering your workflow

## Using Without Slash Commands

For AI tools other than Claude Code, reference standards directly:

```
@agent-os/standards/api/response-format.md follow these conventions
```

Or reference multiple standards:

```
@agent-os/standards/api/response-format.md @agent-os/standards/api/error-handling.md apply these standards
```

See [Adaptability](../Getting%20Started/04-adaptability.md) for more details.

## Integration Features

- Works with **conversations** for immediate context
- Integrates with **plan mode** for spec alignment
- Can be used in **Claude Skills** for permanent embedding
- Compatible with **custom commands** and prompts

## Best Practices

- Let the command auto-suggest when possible
- Only inject standards relevant to current work
- Use explicit injection when you know exactly what you need
- Reference the index.yml to see available standards

## Next Steps

- [Discover Standards](02-discover-standards.md)
- [Product Planning](04-product-planning.md)
- [Learn about standards](../Concepts/02-standards.md)

---

[← Back to Workflow](01-workflow-overview.md)
