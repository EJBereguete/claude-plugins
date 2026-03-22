# Skill: Testing Strategy (Expert Level)

## Pirámide de Calidad Total

```
         E2E & Visual Regression (Valor UI/UX)
        /                                     \
      Contract & Integration Tests (Protocolos)
     /                                         \
   Unit & Mutation Tests (Lógica y Robustez)
```

## 🧪 Mutation Testing (Confianza Real)
No basta con cobertura de líneas; usamos **Mutation Testing** (Stryker, PIT) para asegurar que los tests fallan si el código cambia.
- **Goal**: Score de mutación > 80%.
- **Action**: Si un mutante sobrevive, el test es débil.

## 👁️ Visual Regression (Pixel Perfect)
Usamos **Playwright / Applitools** para detectar cambios visuales no deseados.
```typescript
test('visual consistency', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard-master.png');
});
```

## ♿ Accessibility (A11y) Testing
La accesibilidad es obligatoria (WCAG 2.1).
- **Automated**: `axe-core` integrado en tests E2E.
- **Manual**: Navegación por teclado y lectores de pantalla en flujos críticos.

## 🤝 Contract Testing (Consumer-Driven)
Usamos **Pact** para asegurar que el Frontend (Consumer) y el Backend (Provider) están sincronizados sin necesidad de levantar todo el sistema.

## 🛠️ Tests Unitarios y de Integración

### Backend (Robustez)
- **Property-Based Testing**: Usar `hypothesis` o `fast-check` para encontrar edge cases.
- **DB Integration**: Tests contra contenedores reales (Testcontainers) no solo mocks.

### Frontend (Comportamiento)
- **Testing Library**: Siempre testear desde la perspectiva del usuario.
- **Hook Testing**: Validar lógica compleja de estado aislada.

## 📊 Cobertura y Métricas de Éxito

| Tipo | Mínimo | Expert Target | Herramienta |
|------|--------|---------------|-------------|
| Unit (Lógica) | 80% | 95% | Vitest / Pytest |
| Mutation Score | - | 80% | Stryker / Mutmut |
| A11y Score | 100% | 100% | Axe / Lighthouse |
| Critical E2E Flows | 100% | 100% | Playwright |

## 🚫 Políticas de Bloqueo (Strict Mode)
1. **Regresión Visual detectada**: Bloquear (requiere aprobación de @frontend-ui-ux-engineer).
2. **A11y Violations (Critical/Serious)**: Bloquear.
3. **Contract Break**: Bloquear inmediatamente.
4. **Mutation Score < 60% en código nuevo**: Bloquear.

## Datos de Test y Fixtures
- **Snapshot Testing**: Para estructuras de datos y respuestas de API grandes.
- **Factory Bot / MSW**: Para mocks de API consistentes y tipados.
