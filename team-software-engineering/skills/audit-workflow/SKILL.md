---
name: audit-workflow
description: >
  Auditoria integral de ingenieria. Analiza arquitectura, seguridad, calidad de
  codigo, deuda tecnica, observabilidad y DORA metrics. Genera un Radar de Deuda
  Tecnica con plan de mitigacion priorizado.
used_by:
  - architect
  - security-engineer
  - qa-engineer
  - devops-engineer
  - product-owner
---

# SKILL: Audit Workflow

## CONTRACT

- **Input**: repositorio del proyecto activo
- **Output**: `/docs/05-security/AUDIT-YYYY-MM-DD.md` con Radar de Deuda Tecnica, score global 0-100 y plan de mitigacion P0/P1/P2
- **Who runs this**: equipo completo — cada agente aporta su dimension de analisis

---

## PROCESS

### Step 0 — Context acquisition

Execute the `repo-context-check` skill first. Then read `/docs/01-architecture/PROJECT_CONTEXT.md` if it exists.

If neither exists, run the `onboard-workflow` skill before proceeding. An audit without project context produces unreliable results.

---

### Step 1 — Architecture analysis (@architect)

Examine the codebase structure:
- Glob the entire project to map modules, layers and dependencies
- Identify coupling: are there circular imports, god classes, or fat controllers?
- Check ADRs: are architectural decisions documented and current?
- Assess scalability: stateless services, horizontal scaling readiness
- Flag any SOLID violations in the core domain logic

Produce a list of findings with severity: Critical / High / Medium / Low.

---

### Step 2 — Security analysis (@security-engineer)

Run all of these, document the results:

```bash
# Secret scanning
grep -rE "(key|secret|password|token|api_key|private_key)\s*=\s*['\"][^'\"]{8,}" . \
  --include="*.py" --include="*.ts" --include="*.js" --include="*.env" \
  -l

# Python dependency audit
pip audit 2>/dev/null || pip-audit 2>/dev/null

# Node dependency audit
npm audit --audit-level=moderate 2>/dev/null

# Check for hardcoded IPs or localhost references in non-dev files
grep -rE "(127\.0\.0\.1|localhost)" . --include="*.py" --include="*.ts" -l
```

Apply OWASP Top 10 as a checklist:
1. A01 Broken Access Control — are all endpoints protected?
2. A02 Cryptographic Failures — are secrets managed via env vars only?
3. A03 Injection — are all inputs validated/sanitized?
4. A04 Insecure Design — does the threat model match the code?
5. A05 Security Misconfiguration — debug mode, CORS wildcard, verbose errors?
6. A06 Vulnerable Components — any CVEs from the audit commands above?
7. A07 Auth Failures — brute force protection, session expiration?
8. A08 Data Integrity — are deserialized inputs validated?
9. A09 Logging Failures — are security events logged without exposing PII?
10. A10 SSRF — are outbound requests restricted to known domains?

Execute the `threat-modeling` skill if STRIDE analysis has not been done recently.

---

### Step 3 — Quality and testing analysis (@qa-engineer)

```bash
# Python coverage
pytest --cov=. --cov-report=term-missing 2>/dev/null | tail -20

# Node/TypeScript coverage
npx vitest run --coverage 2>/dev/null | tail -20
```

Assess:
- Unit test coverage (target: >80% on domain logic)
- E2E coverage: which critical user paths have no automated test?
- Estimated mutation score: are tests verifying behaviour or just coverage numbers?
- Contract tests: are API contracts tested between consumers and providers?
- Test quality: any tests that never fail (empty assertions, always-true conditions)?

---

### Step 4 — DevOps and observability analysis (@devops-engineer)

Run the `dora-metrics` skill to get the current team performance baseline.

Check observability:
- Are logs structured JSON (not plain strings)?
- Is error tracking (Sentry or equivalent) configured and receiving events?
- Are uptime alerts configured with < 2min detection SLA?
- Are p95 latency and error rate dashboards available?
- Is there a runbook for every critical alert?

Check production readiness:
- Does the service have a health check endpoint?
- Are environment variables documented in `.env.example`?
- Is the Docker image multi-stage (build vs runtime)?
- Is rollback tested and documented?

---

### Step 5 — Business value assessment (@product-owner)

For each finding identified in Steps 1-4, assess:
- **Business impact**: what happens if this is NOT fixed? (revenue loss / user frustration / security breach / dev velocity)
- **Effort estimate**: S/M/L/XL
- **ROI**: is the fix cost justified by the impact prevented?

Prioritize into:
- **P0**: fix now, blocks production safety or legal compliance
- **P1**: fix this sprint, significant impact on reliability or security
- **P2**: fix next quarter, important but not urgent

---

### Step 6 — Generate the audit report

Create `/docs/05-security/AUDIT-YYYY-MM-DD.md` (use today's date):

```markdown
# Engineering Audit — [Project Name]

**Date**: YYYY-MM-DD
**Score Global de Salud**: [0-100]%
**Auditores**: @architect, @security-engineer, @qa-engineer, @devops-engineer, @product-owner

---

## Radar de Deuda Tecnica

| Categoria | Nivel de Deuda | Impacto en Negocio | Esfuerzo Fix |
|-----------|----------------|--------------------|--------------|
| Codigo | Alta/Med/Baja | [descripcion] | S/M/L/XL |
| Arquitectura | Alta/Med/Baja | [descripcion] | S/M/L/XL |
| Seguridad | Alta/Med/Baja | [descripcion] | S/M/L/XL |
| Documentacion | Alta/Med/Baja | [descripcion] | S/M/L/XL |
| UI/UX & A11y | Alta/Med/Baja | [descripcion] | S/M/L/XL |
| Tests | Alta/Med/Baja | [descripcion] | S/M/L/XL |
| DevOps & Obs. | Alta/Med/Baja | [descripcion] | S/M/L/XL |

---

## Vulnerabilidades Criticas

| ID | Descripcion | OWASP | Severidad | Archivo:Linea |
|----|-------------|-------|-----------|---------------|
| V1 | [descripcion] | A0X | Critical | path/file.py:42 |

---

## Plan de Mitigacion

### P0 — Inmediato (esta semana)
1. [Issue] — Responsable: @agente — Justificacion: [ROI]

### P1 — Este sprint
1. [Issue] — Responsable: @agente — Estimacion: M

### P2 — Proximo trimestre
1. [Issue] — Responsable: @agente — Estimacion: L

---

## Analisis de Arquitectura

- **ADRs registrados**: [N] — [estado: al dia / desactualizados]
- **Acoplamiento detectado**: [descripcion o "ninguno critico"]
- **Riesgos de escalabilidad**: [lista]

---

## Calidad y Testing

- **Cobertura unit**: X%
- **Cobertura E2E**: [paths cubiertos / paths totales]
- **Mutation score estimado**: X% (confianza en los tests)
- **Contract tests**: Activos / Inactivos

---

## Observabilidad (SRE)

- **Logs estructurados**: Si / No
- **Error tracking**: Si (Sentry) / No
- **Alertas configuradas**: Si / No
- **DORA metrics**: Deployment Frequency: X | Lead Time: Y | CFR: Z% | MTTR: W

---

## Fortalezas Detectadas

1. [Patron positivo que debe preservarse]
2. [Otro punto fuerte del proyecto]

---

## Score Calculation

| Dimension | Peso | Score |
|-----------|------|-------|
| Seguridad | 25% | X/25 |
| Arquitectura | 20% | X/20 |
| Tests | 20% | X/20 |
| DevOps | 15% | X/15 |
| Codigo | 15% | X/15 |
| Docs | 5% | X/5 |

**Score Total**: [suma]/100
```

---

## EXAMPLES

**Scoring guide**:
- 90-100: Elite — the team is shipping at high confidence
- 75-89: High — solid foundation with specific gaps to address
- 50-74: Medium — significant debt that is slowing delivery
- < 50: Critical — requires a dedicated debt reduction sprint before new features

**Secret scanning example output** (findings that would be P0):
```
src/config.py:14: DB_PASSWORD = "mypassword123"
.env.staging:3: STRIPE_SECRET_KEY = "sk_live_abc..."
```

**DORA context**:
If Lead Time for Changes > 1 week, the team is accumulating release debt. Flag as P1 and recommend smaller PR size + automated merge queue.

---

## ANTI-PATTERNS

- Running the audit without reading PROJECT_CONTEXT.md first — the findings lack architectural context
- Listing every minor issue as P0 — creates alert fatigue and blocks action on real critical items
- Scoring only what is measurable (coverage %) and ignoring qualitative factors (naming, coupling) — the score becomes misleading
- Generating the audit report but not creating follow-up tickets — an audit without action items is a document graveyard
- Doing a security analysis without running the actual secret scanning command — assumptions are not evidence
