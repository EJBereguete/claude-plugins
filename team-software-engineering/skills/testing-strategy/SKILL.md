# Skill: Testing Strategy

## Pirámide de tests

```
         E2E Tests (pocos, lentos, alto valor)
        /                                    \
      Integration Tests (medios)
     /                                        \
   Unit Tests (muchos, rápidos, bajo costo)
```

## Tests unitarios

### Backend (Python / Node)
```python
# pytest — estructura por feature
class TestFeatureName:
    def test_happy_path(self): ...
    def test_invalid_input(self): ...
    def test_unauthorized(self): ...
    def test_not_found(self): ...
    def test_edge_case(self): ...
```

### Frontend (Vitest / Jest)
```typescript
// Testing Library — comportamiento, no implementación
describe('ComponentName', () => {
  it('renders with expected content')
  it('handles user interaction')
  it('shows loading state')
  it('shows error state')
  it('calls callbacks correctly')
})
```

## Tests E2E (Playwright)

**REQUISITO OBLIGATORIO:** Se deben realizar pruebas E2E para cada feature y guardar SIEMPRE capturas de pantalla (screenshots) como evidencia.

```typescript
// Un test = un flujo completo de usuario
test('user can complete checkout', async ({ page }) => {
  // 1. Setup
  await page.goto('/shop')

  // 2. Acción
  await page.click('[data-testid="add-to-cart"]')
  await page.click('[data-testid="checkout"]')
  await page.fill('[name="email"]', 'test@test.com')
  
  // Captura de pantalla intermedia si es necesario
  await page.screenshot({ path: 'checkout-step.png' });
  
  await page.click('[type="submit"]')

  // 3. Assert
  await expect(page.locator('.order-confirmation')).toBeVisible()
  
  // Captura de pantalla final (EVIDENCIA)
  await page.screenshot({ path: 'checkout-success.png', fullPage: true });
})
```

### Selectores — prioridad
1. `getByRole` — mejor para accesibilidad
2. `getByLabel` — inputs y formularios
3. `data-testid` — cuando no hay semántica
4. `text` — para contenido estático

## Cobertura mínima por tipo

| Tipo | Mínimo | Ideal |
|------|--------|-------|
| Servicios/lógica de negocio | 80% | 90% |
| Controllers/handlers | 70% | 85% |
| Utilidades y helpers | 90% | 100% |
| Componentes UI | 60% | 80% |

## Datos de test

- Factories o fixtures para datos de prueba — no hardcodear
- Mocks para servicios externos (email, pagos, APIs de terceros)
- Base de datos de test separada — nunca en la de desarrollo
- Limpiar estado entre tests

## Cuándo bloquear un PR

- Tests unitarios fallan → siempre bloquear
- Cobertura baja en código crítico → bloquear
- E2E falla en flujo principal → bloquear
- E2E falla en flujo secundario → issue + warning, no bloquear
