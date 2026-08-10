# Phase 0 — Setup

Run once per project. Establishes product vision, installs spec-os, connects your tracker, and extracts your coding standards.

## Step 1 — Product documentation

Run `/spec-os-product` before `/spec-os-init` so the framework has product context at setup time.

```text
You: /spec-os-product

AI:  Mode: INITIALIZE
     What is this product? Who is it for? What problem does it solve?
```

Invokes `market-researcher` (produces `docs/market-research.md`) then `product-owner` (produces `docs/mission.md` + `docs/roadmap.md`). Also scaffolds `docs/design/` with architecture, security, and design system stubs.

**Output:** `docs/mission.md`, `docs/roadmap.md`, `docs/design/`

## Step 2 — Install spec-os

```text
You: /spec-os-init
```

Detects mode automatically (INITIALIZE for new projects, ADOPT for existing codebases). See [Installation](../Getting%20Started/02-installation.md) for the full walkthrough.

**Output:** `spec-os/` structure, `CLAUDE.md`

## Step 3 — Configure tracker

```text
You: /spec-os-tracker
```

Connects to ADO or GitHub. Creates the tracker adapter in `spec-os/tracker/`.

**Output:** `spec-os/tracker/config.yaml`, `spec-os/tracker/ado.md` or `github.md`

## Step 4 — Extract standards

```text
You: /spec-os-discover

AI:  Scope: all | Stack: dotnet + nextjs
     Scanning codebase...

     Proposed: spec-os/standards/backend/architecture.md
     - Clean Architecture with Domain/Application/Infrastructure layers
     - Repository pattern for data access
     Approve? [y/n]
```

Replaces the stub files created by `/spec-os-init` with your actual conventions. Every proposal requires your approval before writing.

After extracting standards, discover also checks `docs/design/` for unfilled stubs. If evidence was found during the scan, it will propose filling them:

- `06-integrations.md` — from detected external dependencies
- `07-error-handling.md` — from observed error handling patterns
- `08-glossary.md` — from domain terms in code and specs

Stubs with no evidence found are reported but left for manual completion.

Run by category if you prefer: `/spec-os-discover backend`, `/spec-os-discover frontend`.

**Output:** `spec-os/standards/` populated, `index.yml` updated, `docs/design/` stubs filled (where evidence exists)

## Adding a New Domain Later

When the project grows into a new area:

```text
You: /spec-os-init update

AI:  Current domains: equipment, maintenance, reporting, users
     New domains to add:

You: integrations

AI:  Created: spec-os/specs/integrations/spec.md (stub)
     Updated: spec-os/specs/_index.md
```

## Next Steps

← [Back to Workflow Overview](01-workflow-overview.md)

- [Phase 1 — Design](03-design.md) — start your first feature
