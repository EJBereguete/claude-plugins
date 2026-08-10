# React 18+ / TypeScript Patterns

---

## 1. Component Structure

Rules:
- Named exports (not default exports) for tree-shaking and refactor-ability.
- Props interface defined above the component.
- Destructure props in the signature; provide defaults inline.
- `cn()` (clsx/tailwind-merge) for conditional classes.

```typescript
// components/UserCard/UserCard.tsx
import { cn } from '@/lib/cn'

interface UserCardProps {
  user: User
  onEdit: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
  'data-testid'?: string
}

export function UserCard({
  user,
  onEdit,
  onDelete,
  className,
  'data-testid': testId,
}: UserCardProps) {
  return (
    <article
      className={cn('rounded-lg border p-4 shadow-sm', className)}
      data-testid={testId}
    >
      <h2 className="text-lg font-semibold">{user.name}</h2>
      <p className="text-sm text-muted-foreground">{user.email}</p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          aria-label={`Edit ${user.name}`}
          onClick={() => onEdit(user.id)}
        >
          Edit
        </button>

        {onDelete && (
          <button
            type="button"
            aria-label={`Delete ${user.name}`}
            onClick={() => onDelete(user.id)}
          >
            Delete
          </button>
        )}
      </div>
    </article>
  )
}
```

### `lib/cn.ts`

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

---

## 2. Custom Hooks

### Data-fetching hook with loading / error / data state

```typescript
// hooks/useUser.ts
import { useState, useEffect, useCallback } from 'react'

interface UseFetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useUser(id: string | undefined) {
  const [state, setState] = useState<UseFetchState<User>>({
    data: null,
    loading: false,
    error: null,
  })

  const fetchUser = useCallback(async (userId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch(`/api/v1/users/${userId}`)
      if (!res.ok) throw new Error(`Failed to fetch user: ${res.statusText}`)
      const user: User = await res.json()
      setState({ data: user, loading: false, error: null })
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }, [])

  useEffect(() => {
    if (id) void fetchUser(id)
  }, [id, fetchUser])

  return state
}
```

> **Prefer TanStack Query** for real apps (see section 5). Use manual hooks only for simple cases or shared libraries.

---

## 3. State Management — Zustand vs Context API

### When to use each

| Scenario | Solution |
|---|---|
| Global UI state (sidebar open, theme) | Zustand |
| Server cache / async data | TanStack Query |
| Form state | React Hook Form |
| Deeply nested prop drilling | Context API |
| Complex shared domain state | Zustand |

### Zustand store

```typescript
// stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (user: AuthUser, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'auth' },  // persisted to localStorage
  ),
)

// Usage in component
function ProfileMenu() {
  const { user, logout } = useAuthStore()
  return (
    <div>
      <span>{user?.name}</span>
      <button onClick={logout}>Log out</button>
    </div>
  )
}
```

### Context API (for scoped state)

```typescript
// context/ThemeContext.tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => setTheme(t => (t === 'light' ? 'dark' : 'light')),
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// Always expose a typed hook — never export the raw context
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}
```

---

## 4. Form Handling — React Hook Form + Zod

```typescript
// schemas/createUserSchema.ts
import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>

// components/CreateUserForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUserSchema, type CreateUserFormValues } from './schemas/createUserSchema'

interface CreateUserFormProps {
  onSuccess: (user: User) => void
}

export function CreateUserForm({ onSuccess }: CreateUserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'member' },
  })

  const onSubmit = async (values: CreateUserFormValues) => {
    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const problem = await res.json()
        if (problem.fields) {
          // Map API field errors back to the form
          for (const [field, messages] of Object.entries(problem.fields)) {
            setError(field as keyof CreateUserFormValues, {
              message: (messages as string[]).join(', '),
            })
          }
          return
        }
        throw new Error(problem.detail)
      }

      const user = await res.json()
      reset()
      onSuccess(user)
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register('email')} aria-invalid={!!errors.email} />
        {errors.email && <p role="alert">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="name">Name</label>
        <input id="name" type="text" {...register('name')} aria-invalid={!!errors.name} />
        {errors.name && <p role="alert">{errors.name.message}</p>}
      </div>

      {errors.root && <p role="alert">{errors.root.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create User'}
      </button>
    </form>
  )
}
```

---

## 5. Data Fetching — TanStack Query

```typescript
// hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const USER_KEYS = {
  all: ['users'] as const,
  list: (params: UsersListParams) => [...USER_KEYS.all, 'list', params] as const,
  detail: (id: string) => [...USER_KEYS.all, 'detail', id] as const,
}

// Fetch list
export function useUsers(params: UsersListParams) {
  return useQuery({
    queryKey: USER_KEYS.list(params),
    queryFn: () => fetchUsers(params),
    staleTime: 30_000,
  })
}

// Fetch single
export function useUser(id: string) {
  return useQuery({
    queryKey: USER_KEYS.detail(id),
    queryFn: () => fetchUserById(id),
    enabled: !!id,
  })
}

// Create
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).then(res => {
        if (!res.ok) return res.json().then(e => Promise.reject(e))
        return res.json() as Promise<User>
      }),

    onSuccess: (newUser) => {
      // Optimistic update: add to all lists
      queryClient.invalidateQueries({ queryKey: USER_KEYS.all })
      // Seed the detail cache so navigation is instant
      queryClient.setQueryData(USER_KEYS.detail(newUser.id), newUser)
    },
  })
}

// Component usage
function UserList() {
  const { data, isLoading, isError, error } = useUsers({ limit: 20 })
  const createUser = useCreateUser()

  if (isLoading) return <Spinner />
  if (isError) return <ErrorMessage error={error} />

  return (
    <ul>
      {data?.data.map(user => <UserCard key={user.id} user={user} onEdit={() => {}} />)}
    </ul>
  )
}
```

---

## 6. Accessibility

```typescript
// Semantic HTML + ARIA best practices

// ✅ Use native button (not div/span with onClick)
<button type="button" onClick={handleDelete} aria-label="Delete user Alice">
  <TrashIcon aria-hidden="true" />
</button>

// ✅ Announce live regions for async feedback
<div role="status" aria-live="polite" aria-atomic="true">
  {isSuccess && 'User created successfully'}
</div>

// ✅ Associate labels with inputs
<label htmlFor="search-input">Search users</label>
<input
  id="search-input"
  type="search"
  aria-describedby="search-hint"
  placeholder="Name or email"
/>
<p id="search-hint" className="sr-only">
  Results will update as you type
</p>

// ✅ Keyboard navigation for custom interactive elements
function DropdownMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        Actions
      </button>

      {open && (
        <ul role="menu">
          {items.map(item => (
            <li key={item.id} role="menuitem">
              <button
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setOpen(false)
                }}
                onClick={item.action}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ✅ Focus management after async action
function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { mutate: deleteUser } = useDeleteUser()

  const handleDelete = () => {
    deleteUser(userId, {
      onSuccess: () => {
        // Return focus to a logical element after deletion
        triggerRef.current?.closest('section')?.querySelector<HTMLElement>('[data-focus-after-delete]')?.focus()
      },
    })
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-label={`Delete user ${userName}`}
      onClick={handleDelete}
    >
      Delete
    </button>
  )
}
```
