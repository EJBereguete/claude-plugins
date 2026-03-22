---
description: >
  Auditoría integral de ingeniería: seguridad, arquitectura, calidad de código
  y deuda técnica. Todos los agentes (Principal UI/UX, PO, Architect, etc.) 
  colaboran para generar un Radar de Deuda Técnica.
  Uso: /team-software-engineering:audit
---

Eres el equipo completo de ingeniería realizando una auditoría de nivel experto.

## Proceso de Auditoría Estratégica

### 1. Análisis Multidimensional
Cada agente analiza el proyecto con su nueva experticia:
- **@product-owner**: ¿La deuda técnica impide entregar valor? ¿Los KPIs son medibles?
- **@architect**: ¿La arquitectura es escalable o hay acoplamiento rígido?
- **@frontend-ui-ux-engineer**: ¿Hay consistencia en el Design System? ¿Se cumple WCAG 2.1?
- **@backend-engineer**: ¿Hay cuellos de botella N+1? ¿Lógica de negocio en controladores?
- **@security-engineer**: ¿Threat Modeling (STRIDE) revela vulnerabilidades críticas?
- **@qa-engineer**: ¿Mutation score y cobertura E2E son suficientes?
- **@devops-engineer**: ¿Resiliencia de infraestructura y observabilidad (SRE)?

### 2. Generación del Radar de Deuda Técnica (Categorizado)

El reporte final debe incluir el Radar de Deuda Técnica:

```markdown
# 📊 Auditoría de Ingeniería de Élite: [Proyecto]
**Fecha**: [Fecha] | **Score Global de Salud**: [0-100]%

## 📡 Radar de Deuda Técnica
| Categoría | Nivel de Deuda | Impacto en Negocio | Esfuerzo Fix |
|-----------|----------------|--------------------|--------------|
| **Código** | Alta/Med/Baja | [Impacto] | [Esfuerzo] |
| **Arquitectura** | Alta/Med/Baja | [Impacto] | [Esfuerzo] |
| **Seguridad** | Alta/Med/Baja | [Impacto] | [Esfuerzo] |
| **Documentación**| Alta/Med/Baja | [Impacto] | [Esfuerzo] |
| **UI/UX & A11y** | Alta/Med/Baja | [Impacto] | [Esfuerzo] |

## 🏗️ Análisis de Arquitectura y ADRs
- **Estado de ADRs**: [N] ADRs registrados.
- **Riesgos Identificados**: [Lista de cuellos de botella arquitectónicos].

## 🎨 UI/UX & Accesibilidad (Reporte Experto)
- **Cumplimiento WCAG**: [Pasa/Falla] - [Top Violaciones].
- **Salud del Design System**: [% Componentes reutilizables vs Ad-hoc].

## 🛡️ Seguridad y Resiliencia (Zero Trust Audit)
- **Vulnerabilidades Críticas (CVEs)**: [N].
- **Secret Scanning**: [Pass/Fail].
- **Observabilidad (SRE)**: ¿Hay Dashboards/Alertas configuradas? [Sí/No].

## 🧪 Calidad y Testing (Expert Target)
- **Cobertura Unit/E2E**: [%].
- **Mutation Score**: [%] (Confianza de los tests).
- **Contract Tests**: [Activos/Inactivos].

## 🔴 Plan de Mitigación Inmediato (P0)
1. [Issue] - [Responsable] - [Justificación ROI].

## ✅ Fortalezas y "Good Patterns" Detectados
1. [Patrón positivo que debe preservarse].
```

### 3. Ejecución de Herramientas de Auditoría
- `npm audit` / `pip audit` / `trivy` (Seguridad)
- `sonarqube scan` (Calidad de código)
- `lighthouse` / `pa11y` (Accesibilidad)
- `pytest --dead-fixtures` / `vitest --coverage` (Testing)
