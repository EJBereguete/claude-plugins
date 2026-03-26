---
name: task-closure
description: >
  Protocolo de cierre completo de una tarea. Incluye PR, merge, cierre
  de ticket, limpieza de rama, actualizacion de /docs y archivo de la
  tarea en completed/. Nada se cierra sin verificar todos los criterios.
used_by:
  - project-manager
  - qa-engineer
  - backend-engineer
  - frontend-engineer
  - devops-engineer
---

# Skill: Task Closure

## CONTRACT
- **Input**: Tarea completada con todos los tests pasando
- **Output**: PR mergeado, ticket cerrado, rama eliminada, docs actualizados, tarea archivada
- **Regla**: TODOS los pasos deben completarse. Cierre parcial = tarea abierta

## CHECKLIST DE CIERRE (en orden)

### 1. Verificar que la implementacion esta completa

```
- [ ] Todos los ACs de requirements.md estan cubiertos
- [ ] Unit tests pasan (minimo: happy path + error + edge)
- [ ] Cobertura >= 80% en codigo nuevo
- [ ] Codigo sigue los standards del proyecto (lint, format)
- [ ] Sin secrets hardcodeados
- [ ] Sin console.log / print() de debug
```

### 2. Crear Pull Request

```bash
# GitHub
gh pr create \
  --title "feat(notifications): add email notification system" \
  --body "$(cat <<'EOF'
## Summary
- Implemented NotificationService with SendGrid integration
- Added POST /api/notifications/send endpoint
- Created NotificationBadge frontend component

## Changes
- 6 files created, 2 files modified
- 4 unit tests, all passing
- Coverage: 92% on new code

## Acceptance Criteria Verification
- [x] Welcome email sent on registration
- [x] Reset password email contains valid token
- [x] Rate limit of 10 emails/min/user enforced

## Screenshots
See /docs/tasks/active/TASK-42/evidence/

Closes #42
EOF
)" \
  --label "feature,ready-for-qa"
```

**Keywords importantes:**
- GitHub: `Closes #42`, `Fixes #42`, `Resolves #42`
- Azure DevOps: `Fixes AB#1234`, `Closes AB#1234`

### 3. QA Review con evidencia

```
@qa-engineer:
- [ ] Code review en 6 dimensiones (seguridad, correctitud, perf, mantenibilidad, tests, deuda)
- [ ] Tests E2E ejecutados con Playwright
- [ ] Screenshots guardados en /docs/tasks/active/TASK-<id>/evidence/
- [ ] Accessibility audit (axe-core) ejecutado
- [ ] Aprobar PR con evidencia: "QA approved. All tests passing. Evidence in /docs/tasks/TASK-<id>/evidence/"
```

### 4. Merge PR

```bash
# Cuando QA aprueba y CI pasa:
gh pr merge <number> --squash --delete-branch
```

### 5. Verificar cierre automatico del ticket

```bash
# Si usaste "Closes #42" en el PR, el ticket se cierra automaticamente
# Verificar:
gh issue view 42 --json state
# Si no se cerro automaticamente:
gh issue close 42 --comment "Completed in PR #<pr-number>"
```

### 6. Actualizar /docs si hubo cambios arquitectonicos

```
¿Se creo un nuevo servicio o modulo?
  → Actualizar /docs/01-architecture/PROJECT_CONTEXT.md

¿Se agrego o modifico un endpoint?
  → Actualizar /docs/02-api/openapi.yml

¿Se tomo una decision arquitectonica nueva?
  → Crear ADR en /docs/01-architecture/adr/

¿Se cambio infraestructura?
  → Actualizar /docs/04-devops/INFRASTRUCTURE.md

¿Se agrego una variable de entorno nueva?
  → Documentar en /docs/04-devops/INFRASTRUCTURE.md
```

### 7. Archivar la tarea

```bash
# Mover la carpeta de la tarea a completed/
mv docs/tasks/active/TASK-42-email-notifications/ docs/tasks/completed/TASK-42-email-notifications/
```

Actualizar el status en el TASK file:
```markdown
| **Status** | COMPLETED ✅ |
| **Completed** | 2026-03-25 |
| **PR** | #123 (merged) |
```

### 8. Limpiar rama (si no se hizo en merge)

```bash
# Verificar que la rama fue eliminada
git branch -d feature/42-email-notifications 2>/dev/null
git push origin --delete feature/42-email-notifications 2>/dev/null
```

## EXAMPLE: Cierre completo en secuencia

```
1. ✅ Verificar: 4 unit tests passing, 92% coverage, lint clean
2. ✅ PR created: #123 "feat(notifications): add email notification system"
      Body includes "Closes #42"
3. ✅ QA: @qa-engineer approved with screenshots in evidence/
4. ✅ CI: All checks green (tests, lint, build, security scan)
5. ✅ Merge: squash merge to main, branch auto-deleted
6. ✅ Ticket: #42 auto-closed via "Closes #42" keyword
7. ✅ Docs: Updated PROJECT_CONTEXT.md (added NotificationService)
           Updated openapi.yml (added POST /notifications/send)
           Added .env.example entry for SENDGRID_API_KEY
8. ✅ Archive: Moved TASK-42/ to completed/
```

## ANTI-PATTERNS

- **No cerrar ticket sin verificar ACs** — cada AC debe ser verificado explicitamente
- **No dejar ramas huerfanas** — si la rama no se elimino en el merge, eliminarla manualmente
- **No olvidar actualizar /docs** — si la arquitectura cambio y /docs no se actualizo, el siguiente agente trabaja con contexto viejo
- **No cerrar sin evidencia QA** — screenshots son obligatorios como prueba de que funciona
