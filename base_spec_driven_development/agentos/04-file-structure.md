# File Structure

**Source:** https://buildermethods.com/agent-os/file-structure

---

Understanding the Agent OS file organization

## Overview

Agent OS creates a specific folder structure in your project. Understanding what goes where helps you maintain and extend it.

## Base Installation (`~/agent-os/`)

Your home directory installation contains:

```
~/agent-os/
├── profiles/              # Reusable standards sets
│   ├── default/
│   │   └── standards/    # Standard markdown files
│   ├── rails/
│   │   └── standards/
│   └── nextjs/
│       └── standards/
├── scripts/              # Installation and sync scripts
│   ├── project-install.sh
│   └── sync-to-profile.sh
├── commands/             # Slash commands for Claude Code
│   ├── discover-standards.md
│   ├── inject-standards.md
│   ├── plan-product.md
│   └── shape-spec.md
└── config.yml           # Configuration and default profile
```

## Project Installation (`your-project/agent-os/`)

Each project gets its own Agent OS folder:

```
your-project/
├── agent-os/
│   ├── standards/           # Project-specific standards
│   │   ├── api/
│   │   │   ├── response-format.md
│   │   │   └── error-handling.md
│   │   ├── database/
│   │   │   └── migrations.md
│   │   ├── naming-conventions.md
│   │   └── index.yml       # Index for standard matching
│   ├── specs/              # Specifications
│   │   ├── feature-a.md
│   │   └── feature-b.md
│   └── product/            # Product documentation
│       ├── mission.md
│       ├── roadmap.md
│       └── tech-stack.md
└── .claude/
    └── commands/
        └── agent-os/       # Copied slash commands
            ├── discover-standards.md
            ├── inject-standards.md
            ├── plan-product.md
            └── shape-spec.md
```

## Key Directories Explained

### `agent-os/standards/`

Where your coding conventions live. Organized by domain:

- **Subfolders** — Group related standards (`api/`, `database/`, etc.)
- **Root files** — Cross-cutting standards (`naming-conventions.md`)
- **index.yml** — Enables smart standard matching

### `agent-os/specs/`

Persistent specifications created via `/shape-spec`:

- Created in plan mode
- Persist beyond conversations
- Reference applied standards
- Include product context

### `agent-os/product/`

Product documentation created via `/plan-product`:

- **mission.md** — Product vision and target users
- **roadmap.md** — Phased development plan
- **tech-stack.md** — Technical stack choices

### `.claude/commands/agent-os/`

Slash commands copied from base installation:

- Updated when you run `project-install.sh`
- Can be used with `--commands-only` flag to preserve standards
- Each command is a markdown file with instructions

## File Naming Conventions

- **Standards:** Use kebab-case (`response-format.md`)
- **Specs:** Use descriptive names (`user-authentication-spec.md`)
- **Product docs:** Fixed names (`mission.md`, `roadmap.md`, `tech-stack.md`)

## Version Control

**Recommended to commit:**
- `agent-os/standards/` — Share conventions with team
- `agent-os/specs/` — Share specifications
- `agent-os/product/` — Share product vision
- `.claude/commands/agent-os/` — Keep commands in sync

**Not necessary to commit:**
- `~/agent-os/` — Personal base installation

## Next Steps

- [Learn about profiles](01-profiles.md)
- [Understand standards](02-standards.md)
- [Installation guide](../Getting%20Started/02-installation.md)

---

[← Back to Concepts](00-concepts-overview.md)
