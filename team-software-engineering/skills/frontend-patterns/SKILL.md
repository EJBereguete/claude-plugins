# Skill: Frontend Patterns

## Estructura de carpetas — React/TypeScript

```
src/
├── components/              # Componentes compartidos (sin logica de negocio)
│   ├── ui/                  # Primitivos: Button, Input, Modal, Badge
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts     # re-export limpio
│   │   └── Input/
│   └── shared/              # Compuestos: DataTable, SearchBar, Form
│
├── features/                # Modulos por funcionalidad
│   ├── users/
│   │   ├── components/      # Componentes especificos del modulo
│   │   │   ├── UserProfile.tsx
│   │   │   └── UserList.tsx
│   │   ├── hooks/           # Hooks del modulo
│   │   │   └── useUser.ts
│   │   ├── api/             # Llamadas al backend
│   │   │   └── userApi.ts
│   │   └── types.ts         # Tipos del modulo
│   └── orders/
│
├── hooks/                   # Hooks globales
│   ├── useAuth.ts
│   └── useDebounce.ts
│
├── lib/                     # Utilitarios y configuracion
│   ├── queryClient.ts
│   └── httpClient.ts
│
├── types/                   # Tipos globales compartidos
│   └── api.ts
│
└── pages/                   # Entry points de rutas (thin — solo orquestan)
    ├── UsersPage.tsx
    └── OrdersPage.tsx
```

## Convenciones de naming

| Elemento | Convencion | Ejemplo |
|----------|-----------|---------|
| Componentes | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase con prefijo `use` | `useUserData.ts` |
| Utilidades | camelCase | `formatDate.ts` |
| Tipos/Interfaces | PascalCase | `UserResponse`, `OrderDTO` |
| Constantes | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| CSS modules | camelCase | `styles.userCard` |

## Clasificacion de componentes

- **UI primitivos**: Button, Input, Modal, Badge — sin logica de negocio, reutilizables en cualquier contexto
- **Compuestos**: combinan primitivos — Form, DataTable, SearchBar — pueden tener estado interno
- **Feature**: tienen logica de dominio — UserProfile, InvoiceList — usan hooks del modulo

## TypeScript strict — patrones obligatorios

```typescript
// NUNCA any — siempre tipo explicito
interface UserCardProps {
  user: User
  onEdit: (userId: string) => void
  isLoading?: boolean
  className?: string
}

// Props de componente — siempre interface, no type para objetos
const UserCard: React.FC<UserCardProps> = ({ user, onEdit, isLoading = false }) => {
  return (
    <div className={styles.card}>
      {isLoading ? <Skeleton /> : <span>{user.name}</span>}
      <button onClick={() => onEdit(user.id)}>Edit</button>
    </div>
  )
}

// Utility types para transformar tipos existentes
type CreateUserInput = Omit<User, 'id' | 'createdAt'>
type PartialUser = Partial<Pick<User, 'name' | 'email'>>

// Generics en hooks y servicios
async function fetchResource<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<T>
}

// Discriminated unions para estados
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }
```

## State Management — arbol de decision

```
¿El estado es local a un componente y no lo necesita nadie mas?
  → useState / useReducer

¿El estado es compartido en un subárbol pequeño de componentes?
  → React Context (tema, auth, preferencias)
  ADVERTENCIA: Context con estado que cambia frecuentemente causa re-renders masivos

¿El estado es global de la app (carrito, usuario logueado, notificaciones)?
  → Zustand (React) / Pinia (Vue)

¿El estado viene del servidor (fetching, cache, mutaciones)?
  → TanStack Query / SWR — NUNCA en Redux/Zustand
  Razón: manejan cache, revalidación, background updates — Redux no
```

**Decision tree implementado:**
```typescript
// LOCAL — solo para este componente
const [isOpen, setIsOpen] = useState(false)

// SUBÁRBOL — auth provider, no cambia frecuentemente
const AuthContext = createContext<AuthContextValue | null>(null)

// GLOBAL — estado de app que cambia frecuentemente
import { create } from 'zustand'
const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
}))

// SERVIDOR — datos del backend
const { data: users, isLoading, error } = useQuery({
  queryKey: ['users', filters],
  queryFn: () => userApi.list(filters),
  staleTime: 5 * 60 * 1000,  // 5 minutos de cache
})
```

## Fetching de datos — siempre 3 estados

```typescript
// Siempre manejar: loading, error, data
function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.list,
  })

  if (isLoading) return <UserListSkeleton />
  if (error) return <ErrorMessage message="Failed to load users" retry={refetch} />
  if (!data?.length) return <EmptyState message="No users found" />

  return (
    <ul>
      {data.map(user => <UserCard key={user.id} user={user} />)}
    </ul>
  )
}
```

## Performance — checklist con Core Web Vitals

**Targets 2024-2025:**
- LCP (Largest Contentful Paint): < 2.5s
- INP (Interaction to Next Paint, reemplazó FID en 2024): < 200ms
- CLS (Cumulative Layout Shift): < 0.1

**Implementacion:**
```typescript
// Code splitting — lazy load por ruta
const UsersPage = lazy(() => import('@/pages/UsersPage'))
const OrdersPage = lazy(() => import('@/pages/OrdersPage'))

// Virtualización para listas largas (>100 items)
import { useVirtualizer } from '@tanstack/react-virtual'

// Memoización — SOLO cuando hay problema medido
// NO usar memo/useMemo por defecto — premature optimization
const ExpensiveList = memo(({ items }: { items: Item[] }) => {
  // Solo meter memo si profiler confirma re-renders innecesarios
  return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>
})

// Imágenes — siempre con width/height para evitar CLS
<img
  src="/hero.webp"
  alt="Hero image"
  width={800}
  height={400}
  loading="lazy"  // lazy para imagenes below the fold
/>
```

## Accesibilidad — WCAG 2.2 AA (estandar legal desde 2025)

```typescript
// Labels en todos los inputs — nunca solo placeholder
<label htmlFor="email">Email address</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-describedby="email-error"
/>
{error && <span id="email-error" role="alert">{error}</span>}

// Botones con texto descriptivo
<button aria-label="Delete order #1234">
  <TrashIcon aria-hidden="true" />  {/* ocultar icono decorativo */}
</button>

// Dialogs/Modals con focus trap
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
>
  <h2 id="dialog-title">Confirm deletion</h2>
  ...
</dialog>

// Skip navigation
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

**Checklist WCAG 2.2 AA obligatorio:**
- [ ] Todos los inputs tienen `<label>` asociado (no solo placeholder)
- [ ] Contraste minimo 4.5:1 para texto normal, 3:1 para texto grande
- [ ] Todos los elementos interactivos son accesibles por teclado (Tab, Enter, Esc)
- [ ] Targets de click minimo 24x24px (WCAG 2.2)
- [ ] Imágenes tienen `alt` descriptivo (vacío `alt=""` para decorativas)
- [ ] Errores de formulario identifican el campo y sugieren corrección
- [ ] No depender únicamente del color para transmitir información
- [ ] Modals/Dialogs atrapan el foco y lo devuelven al cerrarse
- [ ] Páginas tienen `<title>` descriptivo y único
- [ ] Headings en orden jerárquico (h1 → h2 → h3)

## Formularios

```typescript
// React Hook Form + Zod para validación tipada
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
})

type FormData = z.infer<typeof schema>

function CreateUserForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await userApi.create(data)
    } catch (error) {
      handleApiError(error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <label htmlFor="name">Name</label>
      <input id="name" {...register('name')} aria-invalid={!!errors.name} />
      {errors.name && <span role="alert">{errors.name.message}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create User'}
      </button>
    </form>
  )
}
```

## Reglas absolutas

- Props siempre tipadas con interface — nunca `any`
- Mas de 150 lineas en un componente → dividir en sub-componentes
- Efectos secundarios solo en useEffect, custom hooks o event handlers
- Estado del servidor: TanStack Query / SWR — nunca en Redux/Zustand
- `useMemo` y `memo` solo cuando el profiler muestra problema real
- Virtualizacion para listas de +100 items

## Mobile-first

```css
/* Base: diseño para movil */
.container { padding: 1rem; font-size: 16px; }

/* Expandir para tablet */
@media (min-width: 768px) {
  .container { padding: 1.5rem; }
}

/* Expandir para desktop */
@media (min-width: 1024px) {
  .container { padding: 2rem; }
}
```
