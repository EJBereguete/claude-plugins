# Skill: Frontend Patterns

## Componentes

### Clasificación
- **UI primitivos**: Button, Input, Modal, Badge — sin lógica de negocio
- **Compuestos**: combinan primitivos — Form, DataTable, SearchBar
- **Feature**: tienen lógica de dominio — UserProfile, InvoiceList

### Reglas
- Props explícitas con TypeScript — nunca `any`
- Más de 150 líneas → dividir en sub-componentes
- Efectos secundarios fuera del render (useEffect, composables)
- Estado local cuando es posible — estado global solo si es necesario

## Estado

### Cuándo usar cada solución
```
useState/ref → estado local simple
useReducer   → múltiples estados relacionados
Context API  → estado compartido en un árbol de componentes
Zustand/Pinia → estado global de la app
React Query/SWR → estado del servidor (fetching, cache)
```

### Regla de oro
El estado vive en el componente más bajo posible que lo necesite.

## Fetching de datos — siempre 3 estados

```typescript
// Siempre manejar: loading, error, data
const { data, isLoading, error } = useQuery(...)

if (isLoading) return <Skeleton />
if (error) return <ErrorMessage error={error} />
return <DataComponent data={data} />
```

## Formularios

```typescript
// Validación en cliente + servidor
// Mostrar errores inline, no solo al submit
// Deshabilitar submit mientras carga
// Feedback visual de éxito/error
```

## Performance

- Lazy load de páginas y componentes pesados
- `useMemo`/`memo` solo cuando hay problema medido — no por defecto
- Virtualización para listas de +100 items
- Imágenes: formato webp, lazy loading, tamaños correctos

## Accesibilidad mínima

- Roles ARIA en componentes interactivos
- Labels en todos los inputs
- `alt` descriptivo en imágenes
- Navegación por teclado funcional
- Contraste mínimo 4.5:1

## Mobile-first

```css
/* Diseña primero para móvil */
.container { padding: 1rem; }

/* Luego expande para desktop */
@media (min-width: 768px) {
  .container { padding: 2rem; }
}
```
