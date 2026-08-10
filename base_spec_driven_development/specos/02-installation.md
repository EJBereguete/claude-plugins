# Installation

spec-os installs in two steps: run a script to copy the framework files, then initialize inside Claude Code.

## Step 1 — Run the install script

**Linux / Mac** (from your project directory):

```bash
curl -sSL https://raw.githubusercontent.com/Phoenix-Calibration/spec-os/main/scripts/install.sh | bash
```

Or targeting a specific path:

```bash
curl -sSL https://raw.githubusercontent.com/Phoenix-Calibration/spec-os/main/scripts/install.sh | bash -s -- /path/to/your-project
```

**Windows** (PowerShell, from your project directory):

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

## Step 2 — Initialize in Claude Code

Open Claude Code in your project and run:

```text
You: /spec-os-init

AI:  Detecting mode...
     No spec-os/ folder found. Mode: INITIALIZE

     Project name:
     Description (one sentence):
     Stack: dotnet | python | odoo | nextjs | react | other
     Tracker type: ado | github
     Cadence format: sprint | milestone | quarter | custom

You: Equip360 | Industrial equipment management | dotnet + nextjs | ado | sprint

AI:  ADO organization URL:
     ADO project name:
     Repo name (as in git remote):

You: https://dev.azure.com/company | Equip360 | equip360-api

AI:  What are the bounded domains of this project?
     Examples: auth, billing, reporting

You: equipment, maintenance, reporting, users

AI:  Will create: [list]
     Proceed? [y/n]

You: y

AI:  spec-os v1.0.0 installed.
     Next: review config.yaml, run /spec-os-discover.
```

## Step 3 — Configure your tracker

Run `/spec-os-tracker` to connect to ADO or GitHub:

```text
You: /spec-os-tracker

AI:  Tracker type: ado | github | none

You: ado

AI:  ADO organization URL:
     ADO project name:
     Repo name:

You: https://dev.azure.com/company | Equip360 | equip360-api

AI:  Created: spec-os/tracker/config.yaml
               spec-os/tracker/ado.md
     Add ADO_PAT to your environment or .env file.
```

## Step 4 — Populate your standards

Standards start as stubs. Run `/spec-os-discover` to extract your actual conventions from the codebase:

```text
You: /spec-os-discover

AI:  Scanning codebase...
     Found patterns in 47 files.

     Proposed: spec-os/standards/backend/architecture.md
     - Clean Architecture with Domain/Application/Infrastructure layers
     - Repository pattern for data access
     Approve? [y/n]
```

Or edit the stubs manually in `spec-os/standards/`.

## Start working

```text
/spec-os-brainstorm   — new idea or requirement (Phase 1 — Design)
/spec-os-bug {id}     — bug from tracker
```

## Next Steps

- [Updating](03-updating.md) — keep spec-os current
- [Adopt existing project](04-adopt-existing.md) — if you already have code
- [Workflow Overview](../Workflow/01-workflow-overview.md) — the full feature flow
