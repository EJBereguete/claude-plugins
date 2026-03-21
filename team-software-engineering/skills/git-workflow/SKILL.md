# Skill: Git Workflow

## Branch strategy

```
main      → producción (protected, solo PR)
staging   → pre-producción (protected, solo PR)
develop   → integración
feature/* → desarrollo
hotfix/*  → fixes urgentes en producción
```

## Naming de ramas

```
feature/42-user-authentication
hotfix/99-fix-login-redirect
chore/update-dependencies
```

## Conventional Commits

```
feat(scope): add JWT refresh token rotation
fix(invoices): correct total calculation
security(auth): patch SQL injection in login
test(users): add registration unit tests
chore: upgrade fastapi to 0.110.0
refactor(auth): extract token validation service
docs: update API README
ci: add coverage reporting to GitHub Actions
```

**Tipos:** feat | fix | refactor | test | docs | chore | ci | perf | style | security

## PR — estructura obligatoria

```markdown
## Summary
Qué hace y por qué — máximo 2 oraciones.
Closes #<issue-number>

## Changes
- Implementé X
- Modifiqué Y para Z

## Testing
- [ ] Tests unitarios pasando (OBLIGATORIO)
- [ ] Tests E2E pasando (con screenshots adjuntos)
- [ ] Probado localmente
- [ ] Sin regresiones

## Security Checklist
- [ ] Sin secrets expuestos
- [ ] Inputs validados/saneados
- [ ] Auditoría de seguridad pasada

## Evidence (Screenshots)
<!-- Adjuntar capturas de pantalla de los tests E2E y resultados -->
```

## Reglas del equipo

- Un PR = un propósito
- PRs pequeños — menos de 400 líneas preferiblemente
- Sin commits directos a main o staging
- Rebase antes de abrir PR
- Squash al mergear a main
- Borrar la rama después del merge

## Comandos frecuentes

```bash
# Iniciar feature
git checkout develop && git pull
git checkout -b feature/42-descripcion

# Antes de abrir PR
git fetch origin && git rebase origin/develop

# Crear PR
gh pr create --title "feat(scope): descripción" \
  --body "..." --label "backend,ready-for-qa"
```

## Semantic Versioning

```
PATCH → bug fixes:     1.0.0 → 1.0.1
MINOR → new features:  1.0.0 → 1.1.0
MAJOR → breaking:      1.0.0 → 2.0.0
```
