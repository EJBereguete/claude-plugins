# Changelog

All notable plugin changes are recorded here.

## 3.5.0 — 2026-09-25

### Added

- Added workflow v3 with durable `ABANDONING`/`ABANDONED`, preserved
  `abandon-record.md` and tracker cancellation through approved/read-back
  change sets; workflow-v2 tasks remain readable.
- Added Bug-by-ID intake that reads the real tracker/repo and routes simple
  defects to a complete lite path and complex defects to the full SDD path.
- Added evidence-based stated-request/problem framing, a single consolidated
  greenfield blueprint, and source/date/confidence market research opt-in.
- Added `standard|high|critical` risk, proportional independent review bound
  to the exact reviewed SHA, and validator/status enforcement.
- Added deterministic UTF-8 byte/context-token estimates by tier, logical
  module and artifact, integrated into status, pulse, dashboard and portal.
- Added read-only release-maintenance inventory and exact-ID dry-runs for
  stranded final changes, stale artifacts, derived HTML and cache.

### Changed

- Split bootstrap into three JIT modules and kept backlog, design, specs,
  operations and research lazy.
- Extended portal/archive views with abandoned state, risk and context budget.
- Added workflow, risk, context, release-clean and product-discovery fixtures
  while preserving exactly 23 skills and 8 agents.

### Safety

- Release maintenance preserves specs, decisions, receipts and partial work.
- Abandonment never resets/deletes work or syncs partial deltas/knowledge.
- Estimated tokens are clearly labeled and never presented as host telemetry
  or billing data.

## 3.4.0 — 2026-09-25

### Added

- Added a read-only audit mode for prewritten work-item breakdowns, covering
  duplicate scope, gaps, dependencies, sizing, hierarchy and multi-repo/team
  boundaries before any normalization or mutation.
- Added Azure transport guidance for structured UTF-8 fallbacks, exact Unicode
  read-back, effective WIT layout discovery and approved attachments.
- Added durable, sanitized `tracker-result.md` receipts with fingerprint,
  provider IDs/URLs, read-back outcomes and attachment hashes.
- Added per-repository context snapshots with explicit
  `verified`/`stale`/`unverified` freshness.

### Changed

- Extended provider doctor and change sets with transport, layout and
  attachment capabilities while preserving MCP-first execution.
- Exposed only tracker receipt status in project/portal snapshots; raw
  payloads, responses, tokens and identities remain excluded.
- Hardened validator and fixtures for tracker receipts, attachment traversal,
  Windows Unicode fallbacks and custom Bug layouts.

### Not migrated

- Phoenix/Calsystem/Odoo identities, Value Areas, periods, teams, paths,
  timezone corrections, estimations and domain tooling remain project-owned.

## 3.3.0 — 2026-09-25

### Added

- Added executable workflow-v2 gates for QA, deterministic validation, review,
  merge confirmation and tracker reconciliation.
- Added canonical SHA-256 change-set fingerprints and approval receipts that
  prevent applying a tracker payload changed after approval.
- Added a read-only semantic analyzer for full-schema preflight and closure,
  including requirement/task coverage, delta anchors and design paths.
- Added goal-backward verification from observable outcome through artifact,
  wiring and non-tautological evidence.

### Changed

- Split the router into three on-demand modules and assigned its compact
  preflight to every agent.
- Made `fix` and `debug` persist minimum `task.yml`/`progress.md` state even
  under `schema: lite`.
- Corrected Azure PAT configuration, Planner degraded-mode disclosure and
  backlog capture consistency.
- Made late workflow phases reject missing or incompatible durable gates.

## 3.2.0 — 2026-09-25

### Added

- Added a zero-dependency multi-project portal generated at
  `~/.claude/agteamos/portal.html`.
- Added a versioned portal data contract and a shared read-only project-state
  collector for status, dashboards and portal snapshots.
- Added deterministic project dashboard/report rendering with project,
  portal and pulse modes.

### Changed

- Reduced `agteamos-dashboard` to a compact dispatcher over deterministic
  scripts instead of prompt-owned HTML templates.
- Added best-effort portal refresh after setup, backlog capture and task
  closure.
- Extended local snapshots with backlog, archive, onboarding, knowledge,
  quality, operations, security and incident summaries.

### Security

- Canonicalized registered roots, allowlisted readable paths, escaped all
  project text and excluded secrets, emails and raw cache content.
- Kept the portal offline with a restrictive CSP and no server, CDN, fetch or
  external frontend dependencies.

## 3.1.0 — 2026-09-25

### Changed

- Added the executable `project-layout.json` contract with adopted and
  greenfield startup profiles.
- Reduced adopted L0 to `platform.yml`, `onboarding.yml` and
  `architecture/PROJECT_CONTEXT.md`.
- Kept only product lean and ADR-001 in greenfield Phase 0; every other domain
  directory is trigger-driven.
- Made project backlog creation explicitly user-triggered; bootstrap no longer
  creates backlog rows or external tickets.
- Moved generic provider adapters fully into `agteamos-work-items`; local
  tracker files are custom/legacy overrides only.
- Made standards/spec indexes materialize on first discovery/domain use.
- Limited bootstrap human docs to README; CHANGELOG and `docs/` remain lazy.
- Updated README and user documentation around layout, doctor, validation and
  status.

## 3.0.0 — 2026-09-25

### Changed

- Replaced bundled prescriptive standards with a metadata-only topic registry
  and project-owned discovery.
- Split the largest skills and every agent definition into just-in-time
  dispatchers and modules.
- Added deterministic project validation, a machine-readable workflow
  contract, read-only status output and Windows/Linux CI.
- Added provider `doctor` checks for GitHub, Azure Boards and Planner before
  mutation.
- Added a four-document human documentation MVP derived from `agteamos/`.
- Made multi-project switching capability-aware and verifiable.
- Moved plugin feedback to a durable user outbox.
- Reduced the default MCP surface and pinned its package versions.

### Security

- Removed shell execution of lint commands read from project Markdown.
- Fixed destructive-command and merge guardrails to inspect the actual command
  with case-insensitive coverage for GitHub, Azure, POSIX and PowerShell.

### Removed

- Removed the seven generic standard bodies and their language examples. Each
  project now discovers and owns its real conventions.
