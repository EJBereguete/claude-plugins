---
name: agteamos-domain-review
description: >
  Revisa el contexto de dominio alrededor de un cambio (no solo el diff): lee
  el/los modulo(s) modificado(s) mas su expansion de profundidad 1 en
  imports/importers, y detecta 10 domain smells (concepto disperso, God
  Module, leaky boundary, jerarquias paralelas, etc. — ver smells.md).
  Aplica la ratchet rule: un hallazgo es bloqueante solo si este cambio lo
  introduce o lo extiende, todo lo preexistente es follow-up. Cachea
  hallazgos con IDs estables (DR-*) via findings-ledger.js para no
  re-analizar lo mismo en cada corrida. Distinto de agteamos-standards (foto
  puntual de convenciones generada por onboarding) — esta skill es el
  chequeo continuo de smells por PR/cambio.
used_by:
  - architect
  - qa-engineer
---

# SKILL: Domain Review (agteamos-domain-review)

## CONTRACT

- **Input**: archivo(s) o módulo(s) modificado(s) — normalmente invocada como
  sub-paso de la Dimensión 4 (Maintainability) de `agteamos-review` cuando el
  cambio toca más de un archivo relacionado, o standalone sobre un módulo
  específico.
- **Output**: reporte con el mismo formato de severidad que `agteamos-review`
  (Bloqueante/Importante/Sugerencia), cada hallazgo con su smell (`D1`–`D10`),
  estado de ratchet (`introducido en este cambio` / `preexistente → follow-up`)
  y estado de ledger (`NEW`/`SEEN xN`/`RESOLVED`).
- **Quién ejecuta**: `@architect` (dueño conceptual, igual que `standards` y
  `self-audit`); invocable también por `@qa-engineer` durante un review.
- **Read-only**: nunca modifica código ni abre PRs — solo reporta.

---

## POR QUÉ EXISTE ESTA SKILL

`agteamos-standards` compara el proyecto contra 11 estándares base, pero es una
foto puntual: se corre en onboarding o a demanda, y describe *convenciones*
(naming, capas, branch strategy). No mira si un cambio concreto está
introduciendo deuda de dominio nueva — duplicar un predicado en un tercer
archivo, o hacer crecer un God Module 50 líneas más, no rompe ninguna
convención "aplicable/adaptada/desviada" de `standards/`, pero sí degrada el
dominio con cada PR. Esta skill llena ese hueco: revisión continua, acotada al
cambio, con memoria entre corridas.

---

## PROCESS

### Step 1 — Calcular el scope

1. Identificar el/los archivo(s) modificado(s) (mismo input que recibe
   `agteamos-review`: archivo, directorio o PR).
2. Con Grep, expandir una capa: qué importa cada archivo modificado
   (`import`/`from`/`using`) y quién los importa a ellos (buscar el nombre del
   módulo/clase en el resto del repo). Capar la expansión a ~15 archivos —
   si se supera, priorizar los imports directos sobre los importers.
3. Archivos fuera de este scope se listan como "contexto excluido" en el
   reporte — no se leen en profundidad, evita el mismo problema que
   `agteamos-review` ya documenta (Step 1) de leer todo el repo por cada
   review.

### Step 2 — Aplicar los 10 domain smells

Leer `smells.md` (mismo directorio) y evaluar cada smell contra el scope
calculado en Step 1. No aplicar los 10 mecánicamente sobre cada línea — un
domain smell requiere ver el patrón repetido o la responsabilidad mezclada,
no una sola ocurrencia aislada (excepto D6 God Module y D9 Dead Layer, que sí
pueden detectarse en un solo archivo).

### Step 3 — Ratchet rule

Para cada smell encontrado:

1. Correr:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/lib/findings-ledger.js" scope .
   # -> {"changedLines": ["path/file.py:42", ...], "base": "main"}
   ```
   para obtener el set de líneas introducidas/modificadas por este cambio
   (diff contra la base branch detectada).
2. Si el archivo/línea del smell cae dentro de ese set → **Bloqueante o
   Importante** según severidad normal.
3. Si el smell ya existía antes de este cambio (no está en el set de líneas
   cambiadas) → **Follow-up**, nunca bloqueante, sin importar qué tan grave
   sea. Se reporta igual, bajo su propia sección "Follow-ups (preexistente)",
   para que quede trazado sin bloquear el merge.
4. Si un mismo smell tiene varias copias (ej. D1/D10) y el cambio solo tocó
   una, el bloqueante se acota a esa copia; las demás se consolidan en un
   único follow-up con la misma guía de unificación.
5. Si `scopeFromGit` no puede determinar una base branch (repo sin historial,
   o rama huérfana) → tratar **todo** como preexistente/follow-up y decirlo
   explícitamente en el reporte ("no se pudo determinar el diff base — ningún
   hallazgo se marca bloqueante por ratchet, revisar manualmente").

### Step 4 — Cache de hallazgos (ledger)

Volcar los hallazgos del Step 2/3 a un JSON temporal y correr:
```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/lib/findings-ledger.js" \
  reconcile DR findings.json agteamos/.cache/findings/domain-review.json
```
Cada hallazgo recibe:
- `NEW` — primera vez que se ve este ID (`DR-<hash>`)
- `SEEN xN` — visto en corridas anteriores, sigue presente
- (los resueltos desde la corrida anterior se listan aparte como
  "Resueltos desde el último domain-review")

No usar el ledger como fuente de verdad para bloquear/no bloquear — eso lo
decide únicamente el Step 3 (ratchet). El ledger es solo para no repetir el
mismo análisis completo en cada corrida y mostrar progreso.

### Step 5 — Generar el reporte

Mismo formato que `agteamos-review` (ver ese SKILL.md, sección "Step 3 —
Generate the review report"), reemplazando el encabezado por
`## Domain Review: [módulo/PR]` y agregando el smell (`D1`–`D10`) entre
corchetes junto al ID:

```markdown
## Domain Review: src/billing/

**Reviewer**: @architect
**Scope**: src/billing/invoice_service.py + 3 imports + 2 importers (5 excluidos por cap)

### Bloqueantes (introducidos por este cambio)

**[DR-4a1f2c9d / D6] God Module creciendo** — `src/billing/invoice_service.py`
Este cambio agrega 80 líneas más a un archivo que ya tenía 410. Responsabilidades
mezcladas: cálculo de impuestos, persistencia y envío de notificación en la
misma clase. Extraer `TaxCalculator` y `InvoiceNotifier` antes de seguir
agregando aquí.

### Follow-ups (preexistente, no bloqueante)

**[DR-9b3e01aa / D1] Concepto disperso: "is_overdue"** — reimplementado en
`invoice_service.py:34`, `report_service.py:12` y `dashboard_service.py:88`.
Preexistente, no lo introdujo este cambio — no bloquea, pero considerar
centralizar en `Invoice.is_overdue` en un PR dedicado.

### Resueltos desde el último domain-review

- `DR-2f88ab01 / D9` (Dead Layer en `InvoiceFacade`) — ya no aparece, se
  eliminó en un commit anterior.
```

---

## EXAMPLES

**Invocación standalone**:
```
Input: "domain-review src/billing/"
→ Step 1: scope = invoice_service.py + imports/importers (cap 15)
→ Step 2: evaluar D1-D10 contra el scope
→ Step 3: scopeFromGit() para separar introducido/preexistente
→ Step 4: reconcile() contra el cache de domain-review
→ Output: reporte con Bloqueantes / Follow-ups / Resueltos
```

**Invocación como sub-paso de agteamos-review**:
```
review-workflow Dimensión 4 detecta que el cambio toca 3+ archivos
relacionados en el mismo módulo → invoca agteamos-domain-review sobre ese
módulo → sus hallazgos Bloqueantes se insertan en el reporte de review bajo
la Dimensión 4, con el mismo formato [B1], [B2]...
```

---

## ANTI-PATTERNS

- Marcar un smell preexistente como bloqueante porque es grave — la severidad
  no anula la ratchet rule; grave + preexistente = follow-up, no bloqueante.
- Expandir el scope sin cap "para estar seguro" — el objetivo es contexto de
  dominio acotado, no un audit de todo el repo (para eso está `agteamos-audit`).
- Usar el ledger para decidir bloqueante/no bloqueante — el ledger es memoria
  de hallazgos, no reemplaza el cálculo de ratchet contra el diff real.
- Aplicar D2 (Missing System Metaphor) a la primera repetición de una firma —
  esperar a la 2da/3ra ocurrencia real, introducir el tipo antes es
  sobre-diseño (`YAGNI`, ver `standards/dry-kiss-yagni/`).
- Reportar un smell sin decir en qué scope se buscó — el reporte siempre
  declara qué archivos entraron y cuáles quedaron excluidos por el cap.
