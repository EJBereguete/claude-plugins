# Ejecutar una auditoría (`agteamos-audit`)

Auditoría integral de ingeniería: arquitectura, seguridad, calidad de código, testing, DevOps/observabilidad y valor de negocio. El resultado es un **Radar de Deuda Técnica** con plan de mitigación priorizado.

> **No confundir con `agteamos-self-audit`**: esta skill (`agteamos-audit`) audita el código/arquitectura del **proyecto donde está instalado AgTeamOS**. `agteamos-self-audit` es una skill distinta que audita al **propio sistema AgTeamOS** (detecta fricción en su propio workflow). No son intercambiables.

## Cuándo correrla

- A demanda: `/agteamos-audit`.
- Recomendado justo después de un `agteamos-onboard` en un proyecto con deuda técnica desconocida.
- Periódicamente (ej. cada trimestre) para trackear si el Score Global mejora entre auditorías.

## Quién participa

Todo el equipo aporta su dimensión — no es una skill de un solo agente:

| Paso | Agente | Analiza |
|---|---|---|
| 0 | — | `agteamos-repo-context-check`, luego `agteamos-onboard` si no hay contexto |
| 1 | `@architect` | Estructura, acoplamiento, ADRs, SOLID en el dominio |
| 2 | `@security-engineer` | Secret scanning, dependency audit, checklist OWASP Top 10 |
| 3 | `@qa-engineer` | Cobertura de tests, E2E, calidad de las aserciones |
| 4 | `@devops-engineer` | DORA metrics, observabilidad, production readiness |
| 5 | `@product-owner` | Impacto de negocio, esfuerzo, ROI, priorización P0/P1/P2 |
| 6 | — | Genera `agteamos/security/AUDIT-YYYY-MM-DD.md` |

## Comandos que corre (Step 2 — seguridad)

```bash
# Secret scanning
grep -rE "(key|secret|password|token|api_key|private_key)\s*=\s*['\"][^'\"]{8,}" . \
  --include="*.py" --include="*.ts" --include="*.js" --include="*.env" -l

# Dependencias
pip audit 2>/dev/null || pip-audit 2>/dev/null
npm audit --audit-level=moderate 2>/dev/null
```

## Comandos que corre (Step 3 — testing)

```bash
pytest --cov=. --cov-report=term-missing 2>/dev/null | tail -20
npx vitest run --coverage 2>/dev/null | tail -20
```

## Priorización

| Prioridad | Significa |
|---|---|
| **P0** | Corregir ahora — bloquea seguridad de producción o cumplimiento legal |
| **P1** | Corregir este sprint — impacto significativo en confiabilidad o seguridad |
| **P2** | Corregir el próximo trimestre — importante pero no urgente |

## El Score Global

```
90-100  Elite     — el equipo entrega con alta confianza
75-89   Alto      — base sólida con brechas puntuales
50-74   Medio     — deuda significativa que ralentiza la entrega
< 50    Crítico   — requiere un sprint dedicado de reducción de deuda
```

Ponderación:

| Dimensión | Peso |
|---|---|
| Seguridad | 25% |
| Arquitectura | 20% |
| Tests | 20% |
| DevOps | 15% |
| Código | 15% |
| Docs | 5% |

## Estructura del reporte generado

`agteamos/security/AUDIT-YYYY-MM-DD.md` incluye: Radar de Deuda Técnica por categoría, tabla de vulnerabilidades críticas con severidad y ubicación exacta (`archivo:línea`), plan de mitigación P0/P1/P2 con responsable y estimación, análisis de arquitectura, calidad y testing, observabilidad, fortalezas detectadas, y el cálculo del Score.

## Errores comunes a evitar

- Correr la auditoría sin leer `PROJECT_CONTEXT.md` primero — los hallazgos pierden contexto arquitectónico.
- Marcar todo como P0 — genera fatiga de alertas y bloquea la acción sobre lo realmente crítico.
- Puntuar solo lo medible (% de cobertura) ignorando factores cualitativos (naming, acoplamiento).
- Generar el reporte sin crear tickets de seguimiento — una auditoría sin acción es un documento muerto.
- Hacer el análisis de seguridad sin correr el comando real de secret scanning — las suposiciones no son evidencia.
