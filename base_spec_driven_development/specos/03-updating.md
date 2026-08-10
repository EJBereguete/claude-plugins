# Updating

Keep spec-os current by running the update script. Your project config and standards are never overwritten — only the framework skill and agent files are updated.

## Run the update script

**Linux / Mac** (from anywhere in your project):

```bash
curl -sSL https://raw.githubusercontent.com/Phoenix-Calibration/spec-os/main/scripts/update.sh | bash
```

**Windows** (PowerShell):

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Phoenix-Calibration/spec-os/main/scripts/update.ps1" -OutFile update.ps1
.\update.ps1
Remove-Item update.ps1
```

Both scripts fetch the latest version and prompt for confirmation before overwriting any files in `.claude/skills/` and `.claude/agents/`.

## Before updating

If you have customized any skill files in `.claude/skills/spec-os-*/SKILL.md`, rename them before running the update — the script will overwrite framework files.

## After updating

Run `/spec-os-init update` in Claude Code to apply any schema changes to `spec-os/config.yaml`:

```text
You: /spec-os-init update

AI:  Installed version: 1.0.0
     Latest version: 1.1.0
     Schema changes: added `audit-mode` field to config.yaml
     Apply? [y/n]
```

## Next Steps

← [Back to Installation](02-installation.md)

- [Workflow Overview](../Workflow/01-workflow-overview.md) — start building features
