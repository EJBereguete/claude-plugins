# Shape Spec

**Source:** https://buildermethods.com/agent-os/shape-spec

---

Enhanced shaping in plan mode for better specs

## What It Does

The `/shape-spec` command is a **v3.0 feature** that enhances the planning process by walking you through structured questions and saving everything to files that persist beyond the conversation.

Instead of Agent OS handling spec writing (v2 approach), v3 defers to **Plan Mode** in Claude Code (or Cursor, or any agent with plan mode). This is the industry-standard approach to spec-driven development in 2026+.

## How It Enhances Plan Mode

Agent OS enhances plan mode with targeted questions that consider:

- Your **standards** — Ensures alignment with documented conventions
- Your **product mission** — Keeps features aligned with product goals
- Your **tech stack** — Makes technical decisions consistent
- Your **roadmap** — Helps prioritize and sequence work

This results in better, more aligned specs that get written via Plan mode and saved to your Agent OS spec folder automatically.

## When to Run It

- **Planning a feature** — Get enhanced shaping questions
- **Starting a spec** — Ensure alignment from the start
- **Complex implementations** — Benefit from structured planning
- **Team collaboration** — Create specs everyone understands

## The Process

1. **Enter plan mode** in your AI coding tool
2. **Run `/shape-spec`** to start the shaping process
3. **Answer targeted questions** about the feature
4. **Review the shaped spec** with standards and product context applied
5. **Approve and execute** the plan

## Integration with Product Planning

When you've run `/plan-product`, Shape Spec uses that context:

- Aligns features with your product mission
- Considers your roadmap for prioritization
- Ensures tech choices match your stack

## Files Created

Specs are saved to `agent-os/specs/` with:

- The complete spec document
- References to applied standards
- Product context considerations
- Persistent format for future reference

## Benefits

- **Stronger specs** — Better alignment with your existing work
- **Less re-teaching** — Standards are already in context
- **Persistent storage** — Specs survive beyond conversations
- **Team alignment** — Everyone works from the same spec

## Next Steps

- [Product Planning](04-product-planning.md)
- [Inject Standards](03-inject-standards.md)
- [Learn about standards](../Concepts/02-standards.md)

---

[← Back to Workflow](01-workflow-overview.md)
