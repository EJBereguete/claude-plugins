# Profiles

**Source:** https://buildermethods.com/agent-os/profiles

---

Manage standards across projects

## What's a Profile?

A profile is a named collection of standards in your base installation. It lets you maintain different standards sets for different project types, clients, or contexts.

Profiles live in `~/agent-os/profiles/` and contain only `.md` standards files. The index is generated fresh when you install Agent OS into a project.

## Creating a Profile

### Create Manually

Create a new profile manually:

```bash
mkdir -p ~/agent-os/profiles/my-profile/standards
```

### Create from Existing Project

Or create one from an existing project's standards. Run this from a project directory to copy its standards into a new profile:

```bash
cd /path/to/your/project
~/agent-os/scripts/sync-to-profile.sh --new-profile my-profile
```

## Using Profiles

### Install with Specific Profile

Install a project with a specific profile:

```bash
~/agent-os/scripts/project-install.sh --profile rails
```

### Set Default Profile

Set a default profile in `~/agent-os/config.yml`:

```yaml
version: 3.0.0
default_profile: rails
```

## Syncing Standards Back

After refining standards in a project, sync them back to a profile for reuse:

```bash
~/agent-os/scripts/sync-to-profile.sh
```

The script prompts you to:

1. Select a target profile
2. Choose which standards to sync
3. Handle any conflicts (overwrite with backup, skip, or cancel)

### Skip Prompts with Flags

Use flags to skip prompts:

- `--profile <name>` — Target a specific profile
- `--all` — Sync all standards
- `--overwrite` — Overwrite without prompting

## Profile Inheritance

Profile inheritance lets you build layered hierarchies where child profiles override specific standards while inheriting the rest from parent profiles.

### Setting Up Inheritance

Define inheritance relationships in `~/agent-os/config.yml`:

```yaml
version: 3.0.0
default_profile: my-rails-app

profiles:
  my-rails-app:
    inherits_from: rails-base
  rails-base:
    inherits_from: ruby-general
```

**Key points:**

- Any folder in `~/agent-os/profiles/` is a valid profile
- Profiles don't need to be listed in `config.yml` to be usable
- The `profiles:` section only defines inheritance relationships
- If a profile isn't listed, it has no inheritance (standalone base)

### How Inheritance Works

When installing with a profile that has inheritance:

1. The system builds the inheritance chain (bottom-up)
2. Files are applied in order (base first, later wins)
3. When the same file exists in multiple profiles, the child version is used

Installation output shows each file's source:

```
Installing standards...
  api/auth.md (from rails-base)
  api/controllers.md (from rails-base)
  database/migrations.md (from my-rails-app)
  global/naming.md (from my-rails-app)
✓ Installed 4 standards files (from 2 profiles)
```

## Common Profile Patterns

- **By tech stack**: `rails`, `nextjs`, `django`
- **By client**: `client-acme`, `client-xyz`
- **By context**: `work`, `personal`, `consulting`

## Sharing With Your Team

Options for team sharing:

- **Commit to repo** — Include `agent-os/standards/` in version control
- **Shared profile** — Team members sync to/from a shared profile name
- **Separate repo** — Maintain standards in a dedicated repo, copy to projects

## Next Steps

- [Understand standards](02-standards.md)
- [Learn about file structure](04-file-structure.md)
- [Back to installation](../Getting%20Started/02-installation.md)

---

[← Back to Concepts](00-concepts-overview.md)
