---
name: agteamos-plugin-improvement
description: >
  Reemplaza a agteamos-self-audit y agteamos-improve-skill-workflow
  (fusionadas). Distinta de agteamos-quality (esa audita el codigo/proyecto del
  usuario consumidor) — esta skill cubre el ciclo completo de mejora del
  propio sistema AgTeamOS: "Auditoria del propio AgTeamOS" (detecta friccion
  en verify-report.md/dashboard.html/task.yml y propone filas en BACKLOG.md)
  y "Ejecucion de la mejora" (aplica el cambio quirurgico a la skill/agente
  afectado y reporta el diff). Flujo tipico: la auditoria detecta → propone
  en el backlog → la ejecucion aplica el cambio cuando se decide actuar.
used_by:
  - architect
  - product-manager
  - backend-engineer
  - frontend-engineer
  - qa-engineer
---

# Skill: Plugin Improvement (agteamos-plugin-improvement)

> **No confundir con `agteamos-quality`.** `agteamos-quality` audita el
> código/arquitectura del **proyecto consumidor** (el repo donde se instaló
> AgTeamOS) — deuda técnica, seguridad, cobertura de tests, etc. Esta skill,
> `agteamos-plugin-improvement`, cubre al **propio AgTeamOS como sistema**:
> primero detecta cómo se está usando el framework en la práctica
> (`agteamos/changes/`, `verify-report.md`, `dashboard.html`) para encontrar
> fricción propia del workflow, y después ejecuta la mejora quirúrgica sobre
> la skill/agente afectado. Ambas coexisten con responsabilidades
> completamente separadas; nunca se ejecutan una en lugar de la otra.

## CONTRACT

- **Input (Auditoría)**: `agteamos/changes/archive/*/verify-report.md`, `agteamos/dashboard.html`, `agteamos/changes/*/task.yml` (activas y archivadas) del proyecto donde corre AgTeamOS + la pregunta opcional de cierre de `agteamos-implement`
- **Output (Auditoría)**: filas propuestas (nunca escritas directamente) para `BACKLOG.md` del repo del plugin, vía `agteamos-capture` (Modo plugin) con `Origen: auto-detectado`
- **Input (Ejecución)**: nombre de la skill a mejorar + feedback del usuario (corrección, adición, o clarificación) — o una fila ya confirmada de `BACKLOG.md`
- **Output (Ejecución)**: `SKILL.md` actualizado con la mejora aplicada + diff del cambio reportado al usuario
- **Trigger**: la Auditoría corre a demanda directa del usuario, o automáticamente al final de `agteamos-implement` (la pregunta de una línea); la Ejecución corre a demanda directa, o cuando se decide actuar sobre una fila ya presente en `BACKLOG.md`
- **Who runs Ejecución**: the agent that owns the skill (see `used_by` in the skill's frontmatter) — acting as domain expert evaluator
- **Regla de oro**: ningún hallazgo de la Auditoría —automático o de la pregunta al usuario— se escribe en `BACKLOG.md` sin confirmación explícita. La Auditoría propone, nunca decide por su cuenta. La Ejecución nunca reemplaza el archivo entero: el edit es siempre quirúrgico.
- **Flujo típico**: Auditoría detecta un patrón de fricción → lo propone como fila en `BACKLOG.md` (vía `agteamos-capture`) → cuando el usuario decide actuar, Ejecución aplica el cambio quirúrgico y reporta el diff → la fila se mueve de "Ideas abiertas" a "Implementadas".

---

## Auditoría del propio AgTeamOS

### PROCESS

#### Step 1 — Revisar `verify-report.md` de tareas archivadas buscando patrones repetidos

Leer `verify-report.md` de cada carpeta en `agteamos/changes/archive/` (o de
las últimas N, ej. las 10-20 más recientes, si el histórico es grande).

Para cada `FAIL` o `WARNING`, extraer:
- El requirement específico (texto del `MUST`/`SHALL`/`SHOULD` incumplido)
- El dominio o paso del workflow al que pertenece (ej. "cobertura de tests",
  "spec delta sin tarea asociada", "AC sin verificar")

**Señal de fricción**: el mismo tipo de requirement falla en **2 o más tareas
distintas** con la misma razón de fondo. Un solo `FAIL` aislado no es un
patrón — puede ser un descuido puntual, no un problema del estándar o del
workflow.

```
Ejemplo de patrón detectado:
- TASK-38: WARNING — cobertura >= 80% (actual: 71%)
- TASK-41: WARNING — cobertura >= 80% (actual: 68%)
- TASK-45: WARNING — cobertura >= 80% (actual: 74%)

→ 3 tareas seguidas por debajo del umbral sugiere que el umbral de 80% es
  poco realista para este proyecto, o que falta una skill/paso que ayude a
  escribir tests antes de llegar a "verify" — candidato a BACKLOG.md.
```

#### Step 2 — Revisar `dashboard.html`/`task.yml` buscando cuellos de botella

Dos señales a buscar, leyendo `task.yml` de cada tarea activa y archivada:

**a) Tareas `in_progress` mucho más tiempo del esperado**

Calcular la duración típica de tareas ya completadas (`archive/*/task.yml`:
diferencia entre `created` y la fecha de archivado) para tener una referencia
del proyecto. Marcar como señal cualquier tarea con `status: in_progress`
cuya duración (`hoy - created`) sea:
- Más del doble de la duración típica calculada arriba, o
- Si no hay suficiente histórico para calcular una típica confiable (menos de
  3 tareas archivadas), usar un umbral fijo de 14 días sin cambio de `status`.

**b) Tareas con muchos `handoffs`**

`task.yml` con 3 o más entradas en `handoffs` es señal de que la tarea pasó
por demasiadas personas — puede indicar documentación de contexto insuficiente
(el "Next Action" de `progress.md` no le alcanza a quien retoma) o una tarea
mal dimensionada que debió dividirse (`agteamos-new-task`).

#### Step 3 — Redactar cada hallazgo como candidato de backlog

Por cada patrón detectado en Step 1 o Step 2, redactar una descripción
concreta y accionable (no vaga):

```
MAL:  "Los tests fallan a veces"
BIEN: "3 de las últimas 5 tareas (TASK-38, 41, 45) no alcanzan 80% de
       cobertura al llegar a verify — evaluar si el umbral debería ser 70%
       para este proyecto, o agregar un checkpoint intermedio en `implement`
       antes de verify"
```

#### Step 4 — Presentar candidatos y pedir confirmación

Mostrar todos los candidatos juntos, nunca escribirlos directamente:

```
Self-audit de AgTeamOS encontró 2 posibles puntos de fricción:

1. [patrón verify-report] ...
2. [patrón cuello de botella] ...

¿Agrego alguno de estos al backlog de AgTeamOS? (indicá cuáles, o "ninguno")
```

Solo los ítems que el usuario confirma explícitamente pasan al Step 5.

#### Step 5 — Escribir los confirmados vía `agteamos-capture`

Invocar `agteamos-capture` (Modo plugin, sub-modo captura) por cada hallazgo
confirmado, con `Origen: auto-detectado` (para distinguirlos de las ideas que
el usuario anota directamente con `Origen: usuario`).

#### Step 6 — Pregunta de cierre en `agteamos-implement`

Al final de `agteamos-implement`, justo donde ya se sugiere el próximo paso,
se agrega esta pregunta de una línea:

```
¿Algo en este flujo te resultó torpe o mejorarías? (Enter para saltar)
```

Reglas de implementación:
- Es **opcional** — un "Enter" (respuesta vacía) **no debe romper el cierre**
  de la tarea bajo ninguna circunstancia. El cierre ya está completo antes de
  llegar a esta pregunta; esto es estrictamente posterior y no bloqueante.
- Si el usuario responde con texto, tratarlo igual que un hallazgo del Step 3:
  redactarlo como candidato claro y **volver a confirmar** antes de escribirlo
  en `BACKLOG.md` (responder la pregunta no es, por sí solo, la confirmación
  final — es la materia prima del candidato):
  ```
  Anoto esto en el backlog de AgTeamOS: "<resumen de la respuesta>" — ¿confirmás? (Enter = sí)
  ```
  Dado que ya es una pregunta de seguimiento de una sola línea con default
  "sí", esto no reintroduce fricción significativa.
- Si el usuario no responde nada (Enter), no se genera ninguna fila y el
  cierre continúa normalmente sin mencionar el tema de nuevo.

#### Step 7 — De backlog a ejecución

Cuando se decide actuar sobre una idea ya presente en `BACKLOG.md` (capturada
por esta skill o por el usuario directamente vía `agteamos-capture`):

1. Ejecutar la sección "Ejecución de la mejora" (abajo) apuntando al
   archivo/skill/agente afectado por la idea.
2. Al terminar, mover la fila correspondiente de "Ideas abiertas" a
   "Implementadas" en `BACKLOG.md`, con la fecha de resolución y un resumen
   de qué cambió concretamente (ej. "Umbral de cobertura bajado a 70% en
   `agteamos-implement` paso verify").

El backlog nunca se autoimplementa: la detección y la propuesta son
automáticas, pero decidir qué y cuándo ejecutar sigue siendo del usuario.

### ANTI-PATTERNS — Auditoría

- Confundir esta sección con `agteamos-quality` — si el pedido es "auditá la seguridad/arquitectura de este proyecto", esa es `agteamos-quality`, no esta.
- Tratar un único `FAIL`/`WARNING` aislado como un patrón — se requieren al menos 2 ocurrencias con la misma causa de fondo antes de proponerlo como hallazgo.
- Escribir un hallazgo en `BACKLOG.md` sin mostrarlo antes al usuario para confirmación — ni los automáticos ni los que vienen de la pregunta de cierre.
- Dejar que la pregunta de fricción de `agteamos-implement` bloquee o rompa el cierre si el usuario solo aprieta Enter — el cierre ya debe estar completo antes de llegar a esta pregunta.
- Usar umbrales de duración/handoffs sin ajustarlos al histórico real del proyecto cuando hay suficientes tareas archivadas para calcularlo — el umbral fijo de 14 días es un fallback, no la regla por default cuando ya hay datos propios.
- Ejecutar la sección "Ejecución de la mejora" automáticamente al detectar un patrón — esta sección solo detecta y propone; la ejecución la decide el usuario (ver Step 7).

---

## Ejecución de la mejora

Meta-aprendizaje: mejora una skill del equipo con feedback del usuario. Lee
la skill actual, evalua el feedback, aplica la mejora quirurgicamente y
reporta el diff del cambio. También es el mecanismo de ejecución de ideas del
`BACKLOG.md` del propio AgTeamOS (ver Step 6 de esta sección).

### PROCESS

#### Step 1 — Identify the skill and its owner

Parse the input. The first word is the skill name; the rest is the feedback.

```
Input: "pr-standards El proceso de squash merge no cubre el caso de repos sin 'develop' branch"
Skill name: pr-standards
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

#### Step 2 — Read the current SKILL.md in full

Read the complete skill file before evaluating anything. Understanding the full context is required to make a surgical edit rather than a replacement.

Note:
- The current PROCESS structure and step numbering
- The current EXAMPLES section content
- The current ANTI-PATTERNS list
- Any existing coverage of the topic mentioned in the feedback

#### Step 3 — Evaluate the feedback as the domain expert

Adopt the role of the primary owner agent (e.g., act as @backend-engineer if the skill is `build` → sección Backend).

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

#### Step 4 — Apply the improvement (if APPLY verdict)

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

#### Step 5 — Report the diff

After applying the edit, report the change clearly:

```
## Skill improved: pr-standards

**Feedback applied**: "El proceso de squash merge no cubre el caso de repos sin 'develop' branch"
**Type**: Addition — edge case coverage
**Verdict**: APPLY

### Change made

**Section modified**: PROCESS → Step 5 — Merge and cleanup

**Added text** (after the squash merge block):
---
If the project uses a single-branch flow (no `develop` — only `main`):
```
# Single-branch flow: merge feature directly to main
[operación: merge-pr] (squash + delete branch; se resuelve contra
  agteamos/tracker/<tracker de platform.yml>.md)
```
---

**Reason**: The previous instruction assumed a two-branch model. Projects using trunk-based
development or a personal project flow (feature/* → main) had no guidance.
```

If the verdict is REJECT or REDIRECT, report that with clear reasoning:
```
## No change applied: build (sección Backend)

**Feedback**: "Agregar ejemplo de GraphQL"
**Verdict**: REDIRECT

**Reason**: La sección Backend de `agteamos-build` está scoped a patrones REST (per the
existing CONTRACT section). GraphQL design belongs in a dedicated `graphql-design` skill
which does not exist yet (REST vs GraphQL guidance itself lives in
`standards/api-design-standard.md`).

**Recommendation**: If your project uses GraphQL, create `skills/graphql-design/SKILL.md` using
the existing skill format. The `build` skill (sección Backend) is a good reference for structure.
```

#### Step 6 — Usage from the AgTeamOS backlog (`BACKLOG.md`)

This section is also the execution mechanism for `BACKLOG.md` — the backlog of the
AgTeamOS plugin itself (captured via `agteamos-capture` Modo plugin, distinct from any
project's own `agteamos/product/roadmap.md`). When the user decides to act on a row from
"Ideas abiertas":

1. Run this section pointing at the affected file/skill/agent (e.g. "mejorá
   `deploy-workflow` con: <summary of the backlog idea>"), following Steps 1–5 exactly as above.
2. After the edit is applied and the diff reported, move the corresponding row from
   "Ideas abiertas" to "Implementadas" in `BACKLOG.md`, adding a one-line summary of
   what changed and the date resolved.
3. The backlog never self-executes — this step only runs after the user has explicitly
   decided to act on that idea, same as any other invocation of this section.

### EXAMPLES — Ejecución

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
Input: "review Nunca usar mocks — siempre integration tests"

Skill: review
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

### ANTI-PATTERNS — Ejecución

- Replacing the entire SKILL.md instead of editing surgically — destroys accumulated improvements from previous sessions
- Applying feedback without evaluating it — not all feedback is correct; the agent's domain expertise is the filter
- Accepting feedback that contradicts the team's established standards — consistency across skills matters more than any individual suggestion
- Making the edit without reporting the diff — the user cannot verify what changed
- Silently redirecting feedback without explaining why — the user may not know which skill covers their use case
- Editing ANTI-PATTERNS to remove valid warnings because a user disagrees with them — anti-patterns exist because the mistake has been made; the disagreement is itself a signal to explain the reasoning more clearly
