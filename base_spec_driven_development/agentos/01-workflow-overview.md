# Workflow Overview

**Source:** https://buildermethods.com/agent-os/workflow

---

How Agent OS fits into your development process

## The Core Loop

Agent OS centers on a simple loop:

1. **Discover** — Extract patterns from your codebase into documented standards
2. **Inject** — Deploy relevant standards when you need them
3. **Build** — Work with your AI tools using those standards
4. **Refine** — Update standards as patterns evolve

## Commands

Agent OS provides slash commands for Claude Code:

### /discover-standards

Extract tribal knowledge from your codebase. The command walks you through identifying patterns worth documenting, then creates concise standards files.

[Learn about discovering standards →](02-discover-standards.md)

### /inject-standards

Deploy relevant standards into your current context. Can auto-suggest based on what you're working on, or explicitly inject specific standards.

[Learn about injecting standards →](03-inject-standards.md)

### /plan-product

Establish foundational product documentation through an interactive conversation. Creates mission, roadmap, and tech stack files.

[Learn about product planning →](04-product-planning.md)

### /shape-spec

Shape specs in plan mode. This command enhances the planning process by walking you through structured questions and saving everything to files that persist beyond the conversation.

[Learn about shaping specs →](05-shape-spec.md)

## When to Use What

### Setting Up a New Project

1. Run `/plan-product` to document your product vision
2. As patterns emerge, run `/discover-standards` to capture them

### Working on an Existing Codebase

1. Run `/discover-standards` to extract existing patterns
2. Run `/inject-standards` before implementation work

### Planning a Feature

1. Enter plan mode
2. Run `/shape-spec` to gather context and create a persistent spec
3. Approve and execute the plan

### Quick Implementation

1. Run `/inject-standards` to load relevant standards
2. Proceed with your work

## Next Steps

- [Discover Standards](02-discover-standards.md)
- [Inject Standards](03-inject-standards.md)
- [Product Planning](04-product-planning.md)
- [Shape Spec](05-shape-spec.md)

---

[← Back to Getting Started](../Getting%20Started/01-overview.md)
