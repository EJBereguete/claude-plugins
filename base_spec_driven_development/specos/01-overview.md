# Overview

spec-os is an AI-assisted development framework for Claude Code. It adds a structured layer between your tracker (ADO, GitHub) and your code so that you and your AI agree on what to build before any code is written.

```
→ tracker-agnostic     — ADO, GitHub, or any supported tracker
→ standards-first      — coding conventions extracted from your codebase, not hardcoded
→ spec-driven          — observable behavior documented before implementation begins
→ developer-controlled — explicit approval gates at every handoff
→ brownfield-ready     — adopt in existing projects, not just greenfield
```

## Key Benefits

**Standards management** — coding conventions live in indexed files and are loaded on demand, not dumped into every prompt. The AI follows your actual patterns, not generic ones.

**Spec before code** — observable behavior is documented before implementation starts. Everyone agrees on what "done" looks like before anyone writes a line.

**Workflow structure** — a skill chain keeps you in control at every step. Nothing runs silently. You invoke each skill explicitly and approve each handoff.

**Tracker integration** — works with your existing ADO or GitHub tracker without changing how you manage work. Features, User Stories, and Tasks are created and updated automatically.

## How It Works

spec-os organizes the development workflow into four phases:

**Phase 0 — Setup** *(once per project)*
Install spec-os, configure your tracker, and extract your coding standards from the existing codebase.

**Phase 1 — Design** *(Team Lead / Product Owner, per feature)*
Analyze the idea, write the spec, and decompose into tasks. Output is `brief.md`, `spec.md`, and `tasks.md` — everything the developer needs to start.

**Phase 2 — Implementation** *(Developer, per feature)*
Execute tasks one by one, each in one session with one atomic commit. Quality gate per User Story, then PR.

**Phase 3 — Framework quality** *(post-session)*
Capture what worked and what didn't to improve the framework over time.

## Next Steps

- [Installation](02-installation.md) — install spec-os in your project
- [Concepts](../Concepts/00-concepts-overview.md) — understand the architecture
- [Workflow Overview](../Workflow/01-workflow-overview.md) — see the full flow
