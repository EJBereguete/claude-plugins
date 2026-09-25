# Repository state (Fase B)

Load this module after project resolution, or immediately when the user did
not name another project. It requires a verified current workspace/root;
never enter from `scoped-absolute`.

## 1. Detect real code

Use repository-aware search (`Glob`/equivalent), not assumptions. Evidence
includes source files and manifests for the actual stack, such as:

- Python: `*.py`, `pyproject.toml`, `requirements.txt`
- JavaScript/TypeScript: `*.js`, `*.ts`, `*.tsx`, `package.json`
- .NET: `*.cs`, `*.csproj`, `*.sln`
- Go/Rust/Java: `*.go`, `go.mod`, `*.rs`, `Cargo.toml`, `*.java`,
  `pom.xml`, `build.gradle`
- source roots such as `src/`, `app/`, `lib/`, `cmd/`, `internal/`,
  `pages/`, `components/`

An empty repo or one containing only setup files/README has
`REPO_HAS_CODE=false` and routes to bootstrap.

## 2. Inspect AgTeamOS state

If code exists:

1. Check whether `agteamos/` has real content.
2. If it does, read `agteamos/architecture/PROJECT_CONTEXT.md` when present,
   plus `platform.yml` and `onboarding.yml`.
3. If it does not, invoke `agteamos-knowledge --init` with profile
   `adopted_l0`. The router must not maintain another onboarding tree.

Lazy onboarding initially materializes only:

```text
agteamos/
├── platform.yml
├── onboarding.yml
└── architecture/
    └── PROJECT_CONTEXT.md
```

Other artifacts remain `pending`/`candidate` in `onboarding.yml` and are
created only when `ensure-artifact` has verified content to write. Do not
create empty `dashboard.html`, `api/`, `standards/`, `specs/`, `changes/`, or
`archive/`.

Detected but unconfirmed platform values remain marked in
`field_status`/`reviewed: false`; do not invent missing values.

For an already registered and verified current root, update `last_active`.
Never create a registry entry from this phase.

## 3. Find the current user's active work

Inspect `agteamos/changes/<id>-<slug>/task.yml` outside archives. A change is
the current user's when either:

- `owner.email` equals `git config user.email`, or
- its recorded branch equals the current Git branch.

For matching changes, read the latest `progress.md` and ask whether to resume
or start something new. Do not ask the current user to decide what to do with
other contributors' changes. A non-blocking count is allowed.

## Output for Fase C

Return only the compact facts needed for routing:

```yaml
repo_has_code: true|false
agteamos_initialized: true|false
platform_ready: true|false
active_user_changes:
  - id: <id>
    title: <title>
    branch: <branch>
```

`platform_ready` means all three blockers are confirmed:
`repo_host`, `tracker`, and `branch_strategy`. With `field_status`, each must
be `confirmed`. For legacy files without it, use `reviewed`; missing
`reviewed` is treated as legacy-confirmed, while `reviewed: false` is not.

## Exit checks

- Code presence came from observed files.
- Existing context was read or lazy onboarding was delegated.
- No empty future-facing directories were created.
- Active changes were filtered by owner/branch.
- Unconfirmed platform assumptions remain visibly unconfirmed.
