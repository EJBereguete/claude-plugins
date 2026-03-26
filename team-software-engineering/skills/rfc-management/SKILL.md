---
name: RFC Management
description: >
  Request for Comments process for changes that are architecturally significant
  or affect multiple teams. Covers the RFC template, lifecycle, review process,
  and clear criteria for when an RFC is required vs. when a PR description is
  enough.
used_by:
  - architect
  - project-manager
---

# Skill: RFC Management

## CONTRACT

An RFC is required before any work begins when a change is cross-team,
introduces a new shared abstraction, modifies a public API contract, or carries
significant architectural risk. The RFC is the written record of the proposal,
the discussion, and the final decision. Implementation cannot begin until the
RFC reaches `Accepted` status.

---

## CORE CONCEPTS

### When an RFC is required

**RFC required:**
- Introducing or replacing a shared service, library, or platform component
- Changing a public API contract (adding mandatory fields, removing endpoints,
  changing auth scheme)
- Changing data models that multiple services depend on
- Introducing a new technology into the stack (new language, database, queue)
- Changing a process that affects how multiple teams ship (deploy pipeline,
  branching strategy, testing policy)
- Any decision with a blast radius that crosses one team boundary

**RFC NOT required — a PR with a detailed description is enough:**
- Bug fixes, even complex ones, that stay within one service
- Adding a new endpoint that follows an established pattern
- Refactors that do not change public contracts
- New features entirely contained within one team's scope
- Dependency upgrades without breaking changes

**Borderline cases:** if in doubt, write a short RFC. A one-page RFC that
turns out to be unnecessary costs less than a contentious implementation that
needs to be rolled back.

### RFC vs. ADR

| Artifact | Purpose | When created | Who writes |
|----------|---------|--------------|------------|
| RFC | Propose and discuss a change before it happens | Before implementation | Any engineer |
| ADR | Record a decision that was made | At decision time | Architect or lead |

An accepted RFC often produces one or more ADRs. The RFC captures the
deliberation; the ADR captures the final decision concisely.

### Lifecycle

```
Draft → Under Review → Accepted
                     → Rejected
                     → Withdrawn  (author decides not to proceed)
```

- **Draft**: author is still writing; not open for formal review yet.
- **Under Review**: RFC is published, review period is open (minimum 5
  business days for cross-team RFCs, 2 days for single-team).
- **Accepted**: consensus reached, implementation can begin.
- **Rejected**: proposal declined; rejection reason recorded in the RFC.
- **Withdrawn**: author abandons the proposal; no implementation.

Once `Accepted` or `Rejected`, the RFC content is frozen. Append a
resolution summary at the top rather than editing body sections.

### Review process

1. Author opens a PR with the RFC file in `docs/rfcs/RFC-NNN-slug.md`.
2. Author announces in the team channel with a link and the review deadline.
3. Reviewers leave comments directly on the PR.
4. Author updates the RFC to address feedback (edits are allowed during
   `Under Review`).
5. Architect (or tech lead) posts the final decision as a PR comment:
   `Decision: Accepted` or `Decision: Rejected — reason`.
6. PR is merged with status updated to `Accepted` or `Rejected`.
7. If the RFC produces ADRs, they are linked from the RFC resolution section.

Quorum: at least two engineers outside the author's immediate team must
review a cross-team RFC before it can be accepted.

### Numbering and file location

```
docs/rfcs/RFC-001-unified-auth-service.md
docs/rfcs/RFC-002-event-driven-notifications.md
docs/rfcs/README.md   ← index
```

Numbers are sequential, zero-padded to 3 digits, and never reused.

---

## EXAMPLES

### RFC Template

```markdown
# RFC-{NNN}: {Title}

**Status:** Draft | Under Review | Accepted | Rejected | Withdrawn
**Date:** YYYY-MM-DD
**Author:** {name or role}
**Reviewers:** {names or roles}
**Review Deadline:** YYYY-MM-DD
**Related ADRs:** ADR-NNN (if any)

---

## Summary

One or two sentences describing what this RFC proposes.

## Motivation

Why is this change needed? What problem does it solve?
Describe the current situation and its shortcomings. Be specific —
reference tickets, metrics, or incidents if relevant.

## Proposal

Describe the proposed solution in enough detail that a reviewer can
evaluate it without asking clarifying questions.

Include:
- Technical design (diagrams, schemas, pseudocode if helpful)
- API changes (new endpoints, modified contracts)
- Data model changes
- Migration strategy for existing data or clients
- Rollout plan (feature flags, phased rollout, etc.)

## Alternatives Considered

List the alternatives that were evaluated and explain why they were
not chosen. This section is mandatory — an RFC with no alternatives
suggests the proposal was not thoroughly evaluated.

| Alternative | Reason Not Chosen |
|-------------|-------------------|
| Option A    | ...               |
| Option B    | ...               |

## Impact

### Services affected
List every service, team, or external consumer that will need to change.

### Breaking changes
Explicitly state: "This RFC introduces no breaking changes" or describe
what breaks, for whom, and the migration path.

### Performance implications
Estimated impact on latency, throughput, storage, or cost.

### Security implications
New attack surface, changed trust boundaries, or data sensitivity changes.

## Acceptance Criteria

A numbered list of verifiable conditions that must be true for this RFC
to be considered fully implemented.

1. All existing API consumers pass their contract tests against the new
   implementation.
2. Migration script runs in under 10 minutes on staging dataset.
3. P99 latency on /auth/token endpoint stays below 150ms under load test.

---

## Resolution (filled in when status changes from Under Review)

**Decision:** Accepted / Rejected / Withdrawn
**Date:** YYYY-MM-DD
**Decided by:** {name or role}
**Summary:** One paragraph explaining the final decision and any conditions.
**Follow-up ADRs:** ADR-NNN, ADR-NNN
```

### Real RFC example — Unified Auth Service

```markdown
# RFC-001: Introduce a Unified Authentication Service

**Status:** Accepted
**Date:** 2024-05-10
**Author:** backend-engineer
**Reviewers:** architect, security-engineer, frontend-engineer
**Review Deadline:** 2024-05-17
**Related ADRs:** ADR-005

---

## Summary

Replace the per-service JWT validation logic with a single internal
AuthService that all backend services call to validate tokens.

## Motivation

We currently have token validation logic duplicated in four services
(api-gateway, billing-service, notification-service, admin-api). When
we discovered a timing attack in our JWT comparison in March 2024
(incident INC-042), we had to patch four codebases. A shared service
eliminates that duplication and centralizes the security surface.

## Proposal

Deploy `auth-service` as an internal gRPC service. Each backend service
calls `auth-service.ValidateToken(token)` on every authenticated request
instead of validating locally.

gRPC interface:
```protobuf
service AuthService {
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
}

message ValidateTokenRequest {
  string token = 1;
}

message ValidateTokenResponse {
  bool valid = 1;
  string user_id = 2;
  repeated string roles = 3;
  google.protobuf.Timestamp expires_at = 4;
}
```

Migration: services migrate one at a time behind a feature flag. Both
local and remote validation run in parallel for two sprints; local
validation is removed once remote is stable.

## Alternatives Considered

| Alternative | Reason Not Chosen |
|-------------|-------------------|
| API Gateway handles all auth | Couples gateway to business auth rules; hard to test services in isolation |
| Shared library (pip package) | Still duplicates the logic across processes; patching requires redeploying all services |

## Impact

### Services affected
api-gateway, billing-service, notification-service, admin-api

### Breaking changes
None for external API consumers. Internal service-to-service contracts
change, but migration is phased.

### Performance implications
Adds one internal gRPC call per authenticated request. Expected P99
latency increase: 2-4ms. Acceptable given current SLA of 200ms.

### Security implications
Token validation is now a network call. The internal network must
enforce mTLS between services to prevent token interception.

## Acceptance Criteria

1. All four services validate tokens via auth-service in production.
2. Local validation code is removed from all four services.
3. auth-service has 99.9% uptime over a 30-day observation period.
4. P99 latency increase on /api/v1/* endpoints is below 10ms.

---

## Resolution

**Decision:** Accepted
**Date:** 2024-05-18
**Decided by:** architect
**Summary:** Proposal accepted with one condition: mTLS must be
enforced at the network layer before auth-service reaches production.
The phased rollout plan is approved.
**Follow-up ADRs:** ADR-005
```

---

## CHECKLIST

- [ ] Change meets the RFC threshold (cross-team, public contract, new tech)
- [ ] All mandatory sections are present: Summary, Motivation, Proposal,
      Alternatives Considered, Impact, Acceptance Criteria
- [ ] At least two alternatives are documented
- [ ] Breaking changes are explicitly stated (or explicitly absent)
- [ ] Review deadline is set (minimum 5 business days for cross-team)
- [ ] At least two reviewers outside the author's team are named
- [ ] RFC is announced in the team channel before review period starts
- [ ] Resolution section is filled in before the RFC PR is merged as Accepted
      or Rejected
- [ ] ADRs that follow from this RFC are linked in the Resolution section
- [ ] RFC index (`docs/rfcs/README.md`) is updated

---

## ANTI-PATTERNS

**Starting implementation before the RFC is accepted.**
Work done before consensus creates sunk-cost pressure to accept a flawed
proposal. If exploration is needed to write the RFC, timebox it as a spike
and do not merge the spike code.

**RFC as a rubber stamp for an already-decided plan.**
The review period must be genuine. If the author is not willing to change
the proposal based on feedback, the RFC process is theater. Reviewers should
feel empowered to reject or request substantial changes.

**Skipping the Alternatives section.**
"We only considered one option" is almost never true. Omitting alternatives
signals that the evaluation was shallow. Reviewers will (correctly) push back.

**Writing an RFC for every PR.**
RFCs add process overhead. Applying them to single-service changes or
routine features slows delivery without proportional benefit. Use the
criteria table in the Core Concepts section to decide.

**Acceptance Criteria that cannot be verified.**
"The system will be more maintainable" is not a criterion. Every acceptance
criterion must be binary: pass or fail. If it cannot be tested or measured,
rewrite it.

**Letting RFCs expire in Under Review.**
An RFC that nobody merges or rejects is noise. The architect or tech lead
is responsible for driving to a decision within one week of the review
deadline. If the RFC needs more work, move it back to Draft explicitly.
