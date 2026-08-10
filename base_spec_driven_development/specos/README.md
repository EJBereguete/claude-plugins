# spec-os

AI-assisted development framework for Claude Code. Combines standards management, spec tracking, and a structured skill chain so you and your AI agree on what to build before any code is written.

```
→ tracker-agnostic   — ADO, GitHub, or any supported tracker
→ standards-first    — coding conventions extracted from your codebase, not hardcoded
→ spec-driven        — observable behavior documented before implementation begins
→ developer-controlled — explicit approval gates at every handoff (v1)
→ brownfield-ready   — adopt in existing projects, not just greenfield
```

## See it in action

```text
You: /spec-os-brainstorm
AI:  What idea would you like to analyze?

You: Equipment status email notifications
AI:  Real problem: operators discover status changes reactively, after delays.
     Proposed solution: event-driven notifications, configurable per role.
     Classification: Feature | Complexity: medium

     Searching ADO for related Feature... not found.
     Create Feature "Equipment status notifications"? [y/n]

You: y
AI:  Created Feature F042 in ADO.
     Created: spec-os/changes/F042-S24-equipment-notifications/brief.md
     Ready for /spec-os-create

You: /spec-os-create
AI:  Reading brief.md and Feature F042...
     Created: spec.md, spec-delta.md, session-log.md, verify-report.md
     Ready for /spec-os-plan

You: /spec-os-plan
AI:  Defined US-142 (SP: 5) and US-143 (SP: 3). Created in ADO.
     Generated tasks.md — T01 through T05.
     Ready for /spec-os-implement T01

You: /spec-os-implement T01
AI:  Loading context (Tier 2)... injecting standards (dotnet, domain-events)...
     Specialist: backend-dev. Confirm? [y/n]

You: y
AI:  [implements NotificationDispatcher service]
     Committed: feat(equipos): add NotificationDispatcher [F042-T01]
     Next: T02
```

## Installation

**Step 1 — Run the install script in your project**

Linux / Mac (desde el directorio del proyecto):
```bash
curl -sSL https://raw.githubusercontent.com/Phoenix-Calibration/spec-os/main/scripts/install.sh | bash
```

Or targeting a specific path:
```bash
curl -sSL https://raw.githubusercontent.com/Phoenix-Calibration/spec-os/main/scripts/install.sh | bash -s -- /path/to/your-project
```

Windows (PowerShell — desde el directorio del proyecto):
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Phoenix-Calibration/spec-os/main/scripts/install.ps1" -OutFile install.ps1
.\install.ps1
Remove-Item install.ps1
```

Or targeting a specific path:
```powershell
.\install.ps1 -TargetDir C:\path\to\your-project
```

The script clones spec-os, copies all skills and agents into your project's `.claude/` folder, and cleans up automatically. Git must be installed and authenticated with GitHub.

**Step 2 — Initialize in Claude Code**

Open Claude Code in your project and run:
```text
/spec-os-init
```

spec-os detects whether you're starting from scratch or adopting into an existing project and creates the full structure.

**Step 3 — Configure your tracker**

Edit `spec-os/tracker/config.yaml` with your ADO or GitHub details.

**Updating spec-os**

Run the update script from your project directory. It shows your installed version vs the latest, and updates `spec-os/version` automatically.

Linux / Mac:
```bash
curl -sSL https://raw.githubusercontent.com/Phoenix-Calibration/spec-os/main/scripts/update.sh | bash
```

Windows (PowerShell):
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Phoenix-Calibration/spec-os/main/scripts/update.ps1" -OutFile update.ps1
.\update.ps1
Remove-Item update.ps1
```

The script overwrites all framework files (skills and agents) — rename any customized files before updating.

**Start working**

```text
/spec-os-brainstorm   — new idea or requirement
/spec-os-bug {id}     — bug from tracker
```

## Docs

→ **[Getting Started](docs/Getting%20Started/01-overview.md)**: what spec-os is and how to install it
→ **[Concepts](docs/Concepts/00-concepts-overview.md)**: the 4-layer architecture and key ideas
→ **[Workflow](docs/Workflow/01-workflow-overview.md)**: the full flow — setup, design, implementation, maintenance
→ **[Skills Reference](docs/Workflow/06-skills-reference.md)**: reference for all `/spec-os-*` skills

## Why spec-os?

AI coding assistants are powerful but lose context across sessions, duplicate tribal knowledge, and have no memory of why things were built a certain way. spec-os adds a lightweight layer that survives sessions:

- **Standards layer** — coding conventions live in indexed files, injected on demand (not dumped into every prompt)
- **Spec layer** — observable behavior is documented before implementation, not reconstructed after
- **Workflow layer** — a structured skill chain keeps the developer in control at every decision point
- **Tracker adapter** — works with your existing tracker (ADO, GitHub) without changing how you manage work

## Skills

**Phase 0 — Project setup** *(run once)*

| Skill | Purpose |
|-------|---------|
| `/spec-os-product` | Create product documentation (mission, roadmap, design) |
| `/spec-os-init` | Install or adopt spec-os in a project |
| `/spec-os-tracker` | Set up and manage ADO or GitHub tracker integration |
| `/spec-os-discover` | Extract coding standards from your codebase |

**Phase 1 — Design** *(Team Lead / Product Owner, per feature)*

| Skill | Purpose |
|-------|---------|
| `/spec-os-brainstorm` | Analyze an idea → create `brief.md` |
| `/spec-os-design` | Write technical spec from `brief.md` |
| `/spec-os-plan` | Decompose spec into User Stories and tasks |

**Phase 2 — Implementation** *(Developer, per feature)*

| Skill | Purpose |
|-------|---------|
| `/spec-os-implement` | Execute one task (one session, one commit) |
| `/spec-os-verify` | Quality gate per User Story → PR |
| `/spec-os-doc` | Update user documentation after verification |
| `/spec-os-sync` | Sync lessons to knowledge base after PR |

**Phase 3 — Framework quality** *(post-session)*

| Skill | Purpose |
|-------|---------|
| `/spec-os-audit` | Capture framework quality signals for improvement |

**Maintenance** *(as needed)*

| Skill | Purpose |
|-------|---------|
| `/spec-os-bug` | Analyze a bug → simple or complex fix path |
| `/spec-os-standard` | Update or create a standard |
| `/spec-os-inject` | Load relevant standards for the current task |
| `/spec-os-abandon` | Close a feature without completing it |
| `/spec-os-clean` | Archive completed features, prune knowledge base |
