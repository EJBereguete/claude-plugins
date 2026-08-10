# Discover Standards

**Source:** https://buildermethods.com/agent-os/discover-standards

---

Extract tribal knowledge from your codebase

## What It Does

The `/discover-standards` command is a **v3.0 feature** that lets the agent surface, suggest, and create standards from your codebase. It walks you through identifying patterns worth documenting, then creates concise standards files.

This command helps you:

- Extract existing patterns from legacy codebases
- Document tribal knowledge that exists only in your code
- Create standards that make it easier to use AI agents going forward
- Bring pre-AI codebases into the modern era

## When to Run It

- **Setting up a new project** — As patterns emerge, capture them
- **Working on an existing codebase** — Extract existing patterns first
- **Onboarding AI agents** — Document conventions that should be known
- **Team alignment** — Create shared understanding of patterns

## How It Works

The command uses intelligent analysis to:

1. Scan your codebase for patterns
2. Identify conventions worth documenting
3. Suggest standards based on what it finds
4. Create structured markdown files in `agent-os/standards/`
5. Update the `index.yml` file for smart standard matching

## Integration with /inject-standards

Once standards are discovered and documented, you can use `/inject-standards` to deploy them into your work context automatically.

## Best Practices

- Start with your most common patterns
- Keep standards concise and actionable
- Document the "why" behind conventions, not just the "what"
- Review and refine standards as your codebase evolves

## Next Steps

- [Inject Standards](03-inject-standards.md)
- [Learn about standards](../Concepts/02-standards.md)
- [Using with other tools](../Getting%20Started/04-adaptability.md)

---

[← Back to Workflow](01-workflow-overview.md)
