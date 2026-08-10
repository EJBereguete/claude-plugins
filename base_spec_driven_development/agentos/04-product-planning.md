# Product Planning

**Source:** https://buildermethods.com/agent-os/product-planning

---

Establish product context for better specs

## What It Does

The `/plan-product` command creates foundational product documentation through an interactive conversation. It generates three files in `agent-os/product/`:

- **mission.md** — Product vision, target users, core problems solved
- **roadmap.md** — Phased development plan with prioritized features
- **tech-stack.md** — Technical stack choices for this project

## When to Run It

- **Setting up a new project** — Establish product foundation
- **When you want `/shape-spec` to have product context** — Enhance spec alignment
- **Onboarding team members** — Help them understand product vision
- **When the project lacks documented product goals** — Create clarity

## The Process

### 1. Check Existing Docs

If product files already exist, the command asks whether to replace all, update specific files, or cancel.

### 2. Gather Product Vision

For `mission.md`:

- What problem does this product solve?
- Who is this product for?
- What makes your solution unique?

### 3. Gather Roadmap

For `roadmap.md`:

- What are the must-have features for launch (MVP)?
- What features are planned for after launch?

### 4. Establish Tech Stack

For `tech-stack.md`:

- If a tech-stack standard exists in your standards, asks if this project uses the same stack
- Otherwise asks you to describe frontend, backend, database, and other technologies

### 5. Generate Files

Creates the three markdown files based on your answers.

## Integration with /shape-spec

When you run `/shape-spec`, it reads `agent-os/product/` and uses that context when planning features:

- **mission.md** helps align features with product goals
- **roadmap.md** helps prioritize and sequence work
- **tech-stack.md** ensures technical decisions match the project

## Updating Product Docs

Two ways to update:

- **Edit directly** — The files are just markdown
- **Run /plan-product again** — Choose "Update specific files" to regenerate only certain files

## Tips

- Brief answers are fine—docs can be expanded later
- Skip sections if not applicable; placeholders will be created
- If you have product docs elsewhere, you can create summaries here that reference them

## Next Steps

- [Shape Spec](05-shape-spec.md)
- [Inject Standards](03-inject-standards.md)
- [Learn about file structure](../Concepts/04-file-structure.md)

---

[← Back to Workflow](01-workflow-overview.md)
