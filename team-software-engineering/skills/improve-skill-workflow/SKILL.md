---
name: improve-skill-workflow
description: >
  Meta-aprendizaje: mejora una skill del equipo con feedback del usuario.
  Lee la skill actual, evalua el feedback, aplica la mejora quirurgicamente
  y reporta el diff del cambio.
used_by:
  - architect
  - backend-engineer
  - frontend-engineer
  - qa-engineer
---

# SKILL: Improve Skill Workflow

## CONTRACT

- **Input**: nombre de la skill a mejorar + feedback del usuario (corrección, adición, o clarificación)
- **Output**: `SKILL.md` actualizado con la mejora aplicada + diff del cambio reportado al usuario
- **Who runs this**: the agent that owns the skill (see `used_by` in the skill's frontmatter) — acting as domain expert evaluator

---

## PROCESS

### Step 1 — Identify the skill and its owner

Parse the input. The first word is the skill name; the rest is the feedback.

```
Input: "git-workflow El proceso de squash merge no cubre el caso de repos sin 'develop' branch"
Skill name: git-workflow
Feedback: "El proceso de squash merge no cubre el caso de repos sin 'develop' branch"
```

Locate the skill file:
```bash
find /path/to/plugin/skills/<skill-name>/ -name "SKILL.md"
```

Read the YAML frontmatter to identify `used_by`. The agent listed first is the primary owner and will evaluate the feedback.

If the skill name does not match any existing skill directory, report the error and list available skills:
```bash
ls skills/
```

---

### Step 2 — Read the current SKILL.md in full

Read the complete skill file before evaluating anything. Understanding the full context is required to make a surgical edit rather than a replacement.

Note:
- The current PROCESS structure and step numbering
- The current EXAMPLES section content
- The current ANTI-PATTERNS list
- Any existing coverage of the topic mentioned in the feedback

---

### Step 3 — Evaluate the feedback as the domain expert

Adopt the role of the primary owner agent (e.g., act as @backend-engineer if the skill is `api-design`).

Evaluate the feedback against these criteria:

| Criterion | Question |
|-----------|---------|
| Correctness | Is the feedback technically accurate? |
| Alignment | Does it align with the team's established standards? |
| Value | Does it improve the skill meaningfully or just add noise? |
| Scope | Does it belong in this skill or in a different one? |
| Completeness | Is the feedback specific enough to act on? |

**Decision matrix**:

| Verdict | Condition | Action |
|---------|-----------|--------|
| APPLY | Valid, valuable, in-scope | Edit the SKILL.md surgically |
| APPLY WITH MODIFICATION | Valid but needs clarification or rewording | Edit with improved wording, explain the adjustment |
| REDIRECT | Valid but belongs in a different skill | Point to the correct skill, no edit |
| REJECT | Inaccurate, conflicts with standards, or harmful | Explain why with a counter-example |

---

### Step 4 — Apply the improvement (if APPLY verdict)

The edit must be surgical — minimum change to achieve maximum clarity. Rules:

1. **Do not replace the entire file** — use the Edit tool to change only the relevant section
2. **Preserve existing structure** — if adding a new step, fit it into the existing numbered sequence
3. **Match the existing voice** — the skill uses direct, imperative language without emoji
4. **If adding to EXAMPLES** — follow the existing example format (scenario + code block or table)
5. **If adding to ANTI-PATTERNS** — one line per pattern, starting with the anti-pattern, ending with the consequence

**Types of improvements and where they go**:

| Feedback type | Target section |
|--------------|---------------|
| Missing edge case in a step | Expand the relevant PROCESS step |
| Missing example | Add to EXAMPLES section |
| Incorrect instruction | Edit the specific line in PROCESS |
| Missing anti-pattern | Add to ANTI-PATTERNS list |
| Incomplete CONTRACT | Edit the CONTRACT section |
| Frontmatter `used_by` incomplete | Edit the YAML frontmatter |

---

### Step 5 — Report the diff

After applying the edit, report the change clearly:

```
## Skill improved: git-workflow

**Feedback applied**: "El proceso de squash merge no cubre el caso de repos sin 'develop' branch"
**Type**: Addition — edge case coverage
**Verdict**: APPLY

### Change made

**Section modified**: PROCESS → Step 5 — Merge and cleanup

**Added text** (after the squash merge block):
---
If the project uses a single-branch flow (no `develop` — only `main`):
```bash
# Single-branch flow: merge feature directly to main
gh pr merge <PR_NUMBER> --squash --delete-branch
```
---

**Reason**: The previous instruction assumed a two-branch model. Projects using trunk-based
development or a personal project flow (feature/* → main) had no guidance.
```

If the verdict is REJECT or REDIRECT, report that with clear reasoning:
```
## No change applied: api-design

**Feedback**: "Agregar ejemplo de GraphQL"
**Verdict**: REDIRECT

**Reason**: The `api-design` skill is scoped to REST API patterns (per the existing CONTRACT section).
GraphQL design belongs in a dedicated `graphql-design` skill which does not exist yet.

**Recommendation**: If your project uses GraphQL, create `skills/graphql-design/SKILL.md` using
the existing skill format. The `api-design` skill is a good reference for structure.
```

---

## EXAMPLES

**Scenario — Adding a missing edge case**:

```
Input: "pr-standards El formato del PR no menciona qué hacer cuando el PR toca más de una capa (BE + FE)"

Skill: pr-standards
Owner: @qa-engineer

Step 3 evaluation:
  Correctness: Yes — the current PROCESS only covers single-layer PRs
  Value: High — multi-layer PRs are common and this gap causes inconsistent PR descriptions
  Verdict: APPLY

Step 4 edit: Added to PROCESS → Step 2 — Fill the PR template:
  "If the PR touches multiple layers (backend + frontend), list each layer's changes
   in separate subsections under '## Changes'. Do not mix backend and frontend
   file lists in a single bullet."

Step 5 report: Shows the exact added text and the reason.
```

**Scenario — Incorrect feedback**:

```
Input: "testing-strategy Nunca usar mocks — siempre integration tests"

Skill: testing-strategy
Owner: @qa-engineer

Step 3 evaluation:
  Correctness: No — mocks are appropriate for unit tests of business logic in isolation.
  The statement "never use mocks" would make unit tests impractically slow and
  fragile (dependent on external services).
  Verdict: REJECT

Step 5 report:
  "This feedback conflicts with the established testing pyramid where mocks are
   appropriate for unit tests. Integration tests that hit the real DB are reserved
   for repository and integration-level tests. See Step 2 of the current skill
   which explains when each type applies."
```

---

## ANTI-PATTERNS

- Replacing the entire SKILL.md instead of editing surgically — destroys accumulated improvements from previous sessions
- Applying feedback without evaluating it — not all feedback is correct; the agent's domain expertise is the filter
- Accepting feedback that contradicts the team's established standards — consistency across skills matters more than any individual suggestion
- Making the edit without reporting the diff — the user cannot verify what changed
- Silently redirecting feedback without explaining why — the user may not know which skill covers their use case
- Editing ANTI-PATTERNS to remove valid warnings because a user disagrees with them — anti-patterns exist because the mistake has been made; the disagreement is itself a signal to explain the reasoning more clearly
