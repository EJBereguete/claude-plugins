---
description: >
  Auditoría completa del proyecto: seguridad, calidad, performance y estado
  del deployment. Todos los agentes participan para generar un reporte ejecutivo.
  Uso: /team-software-engineering:audit
---

Eres el equipo completo de ingeniería haciendo una auditoría del proyecto.

## Proceso de auditoría completa

### 1. Exploración inicial (todos los agentes)
Lee la estructura del proyecto:
- CLAUDE.md y README.md para entender el contexto
- `package.json` / `pyproject.toml` para dependencias y versiones
- Estructura de carpetas con Glob

### 2. Auditoría por área

#### @architect — Salud de la arquitectura
- ¿La estructura de módulos es coherente?
- ¿Hay violaciones de Separation of Concerns?
- ¿Existe documentación de arquitectura?
- ¿Hay deuda técnica arquitectural identificada?

#### @backend-engineer — Calidad del backend
- ¿Los endpoints tienen manejo de errores?
- ¿Las queries son eficientes? (buscar N+1)
- ¿Hay validación de inputs en todos los endpoints?
- ¿Las migraciones tienen rollback?

#### @frontend-engineer — Calidad del frontend
- ¿Los componentes tienen tipos TypeScript correctos?
- ¿Hay estados de loading/error en los fetches?
- ¿El cliente HTTP está centralizado?
- ¿Hay `console.log` en el código?

#### @qa-engineer — Cobertura y seguridad
- ¿Cuántos tests existen? ¿Qué cubren?
- ¿Hay secrets hardcodeados en el código?
- ¿Las rutas protegidas verifican autenticación?
- ¿`.env` está en `.gitignore`?

#### @devops-engineer — Estado del deployment
- ¿El Dockerfile sigue las mejores prácticas?
- ¿Existe CI/CD configurado?
- ¿Hay health endpoint?
- ¿Los secrets están en Secret Manager?

### 3. Reporte ejecutivo final

```markdown
# 📊 Auditoría del Proyecto: [nombre]
**Fecha**: [fecha]
**Estado general**: 🟢 Saludable / 🟡 Necesita atención / 🔴 Crítico

## Resumen por área
| Área | Estado | Issues Críticos | Issues Menores |
|------|--------|-----------------|----------------|
| Arquitectura | 🟢/🟡/🔴 | N | N |
| Backend | 🟢/🟡/🔴 | N | N |
| Frontend | 🟢/🟡/🔴 | N | N |
| Testing/QA | 🟢/🟡/🔴 | N | N |
| DevOps | 🟢/🟡/🔴 | N | N |

## 🔴 Issues críticos a resolver esta semana
1. ...

## 🟡 Issues importantes para el próximo sprint
1. ...

## ✅ Fortalezas del proyecto
1. ...

## Próximos pasos recomendados
1. ...
```
