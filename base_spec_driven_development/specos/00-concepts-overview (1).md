# Concepts Overview

This section explains the core ideas behind spec-os and how they fit together. For practical usage, see [Getting Started](../Getting%20Started/01-overview.md) and [Workflow](../Workflow/01-workflow-overview.md).

## Key Concepts

### [Architecture](01-architecture.md)
The four-layer model that organizes everything in spec-os: Standards, Specs, Workflow, and the Tracker Adapter. Each layer has a clear owner and a specific role.

### [Standards](02-standards.md)
Coding conventions extracted from your codebase into indexed, discoverable files. Instead of hardcoding rules, spec-os loads only what each task actually needs.

### [Specs](03-specs.md)
Observable system behavior documented in two places: a living source of truth per domain, and a per-feature folder that captures the work in progress. Includes key artifacts like `brief.md`, `spec.md`, and `spec-delta.md`.

### [Workflow Phases](04-workflow-phases.md)
The skill chain organized into phases with distinct ownership. Covers Phase 1 (Design — Team Lead), Phase 2 (Implementation — Developer), approval gates, and the specialist subagents that execute tasks.

### [File Structure](05-file-structure.md)
The complete directory layout that `/spec-os-init` creates in your project, with explanations of each folder's purpose.

## Next Steps

- [Architecture](01-architecture.md) — start here for the full mental model
- [Getting Started](../Getting%20Started/01-overview.md) — practical onboarding
- [Skills Reference](../Workflow/06-skills-reference.md) — full reference for every skill
