# Project resolution (Fase A)

Load this module only when the user names a project/alias, asks to switch
projects, asks which projects exist, or wants to create/register a project.

## Registry

Source: `~/.claude/agteamos/projects.yml`.

```yaml
projects:
  - name: invoicing-api
    aliases: [invoicing, facturacion]
    path: "C:\\code\\invoicing-api"
    has_agteamos: true
    repo_host: github
    tracker: github
    reviewed: true
    last_active: "2026-09-20"
```

Required fields are `name`, `path`, `has_agteamos`, `reviewed`, and
`last_active`. Missing registry means `projects: []`; it is not an error.
`agteamos-setup` owns `repo_host`, `tracker`, `reviewed`, and full registration.
This phase may only update `last_active` after a verified switch or create the
confirmed placeholder described below.

## Resolution

1. For a listing request, sort entries by `last_active` descending and show
   `name`, `path`, `last_active`, and `reviewed`. Stop.
2. Resolve against `name` and `aliases`: exact, case-insensitive, then
   substring.
3. One match continues. Multiple plausible matches require disambiguation
   including each path. Never choose silently.
4. Confirm the registered path still exists. If it does not, offer to
   re-register or remove it; never guess a replacement.

## Capability-aware positioning

Resolving a path is not proof that the agent is scoped to it.

1. Detect a native host capability for changing the agent root/workspace.
2. Invoke the capability with the absolute target.
3. Verify from host state that effective root/cwd equals the normalized target.
4. Re-read target-repository instructions and context.

| State | Evidence | Allowed behavior |
|---|---|---|
| `switched` | Native switch succeeded and target root/cwd was verified | Update `last_active`; continue to Fase B |
| `scoped-absolute` | No root switch, but host authorized absolute access | Capture-only reads/writes after verifying every path |
| `unavailable` | Capability absent/failed or target cannot be verified | No mutation and no engineering work |

`scoped-absolute` never enables Fase B/C. It exists only for
`agteamos-capture`. For engineering, tell the user to open the resolved path
as the workspace/root (or use the host's equivalent) and retry. Do not ask for
`cd`: it changes a shell, not the agent root.

If a native switch fails, do not fall back to the prior repo or silently use
absolute paths.

## New project

When no entry matches:

1. Ask whether the user wants to create/register that project.
2. If approved, ask for an explicit path (or offer a visible parent default).
3. Create the directory and perform the verified native root switch.
4. Only in `switched`, add:

```yaml
- name: <confirmed-slug>
  path: <absolute-path>
  has_agteamos: false
  reviewed: false
  last_active: <today>
```

5. Continue to Fase B. Setup will later complete provider fields.

In `scoped-absolute` or `unavailable`, do not register or onboard it. If the
user declines creation, make no change.

## Exit checks

- Target path exists and effective root/cwd is verified.
- Instructions for the destination repo were re-read.
- `last_active` changed only after `switched`.
- No provider/setup fields were overwritten.
- Ambiguous names and new directories received explicit confirmation.
