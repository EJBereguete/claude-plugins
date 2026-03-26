# Frontend Standard

Stack: React 18 + TypeScript + Vite + Zustand + Vitest + Testing Library + Playwright.

---

## Folder Structure

```
frontend/src/
  components/
    ui/                   ← generic, reusable (Button, Input, Modal, Badge)
    features/             ← domain-specific (InvoiceCard, UserProfileHeader)
  pages/                  ← route-level components (InvoicesPage, LoginPage)
  hooks/                  ← custom hooks (useInvoices, useAuth, usePagination)
  services/               ← API calls (invoiceService.ts, authService.ts)
  stores/                 ← Zustand stores (useInvoiceStore, useAuthStore)
  types/                  ← TypeScript interfaces and types (invoice.ts, user.ts)
  utils/                  ← pure utility functions (formatCurrency, parseDate)
  constants/              ← app-wide constants (ROUTES, STATUS_LABELS)
  lib/                    ← third-party client setup (queryClient.ts, axios.ts)
  __tests__/              ← mirrors src/ structure for co-located tests
```

Every new domain feature gets its own directory under `features/` if it has more than one component:

```
components/features/
  invoice/
    InvoiceCard.tsx
    InvoiceCard.test.tsx
    InvoiceStatusBadge.tsx
    InvoiceStatusBadge.test.tsx
    index.ts
```

---

## TypeScript — No `any`, No Shortcuts

```typescript
// ❌ BAD
const handleData = (data: any) => {
  console.log(data.user.name)  // runtime error waiting to happen
}

const user = {} as User  // type assertion bypasses type checking

function getInvoice(id) {  // implicit any parameter
  return fetch(`/invoices/${id}`)
}

// ✅ GOOD
interface UserResponse {
  id: string
  email: string
  fullName: string
  createdAt: Date
}

const handleData = (data: UserResponse): void => {
  console.log(data.fullName)
}

async function getInvoice(id: string): Promise<InvoiceResponse> {
  const response = await fetch(`/invoices/${id}`)
  if (!response.ok) throw new ApiError(response.status)
  return response.json() as Promise<InvoiceResponse>
}
```

Enable strict mode — no exceptions:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## Component Rules

1. One component per file
2. Named exports only — no default exports (better refactoring, better import autocomplete)
3. Props interface defined above the component, always
4. `data-testid` on every interactive or assertable element
5. No business logic inside components — delegate to hooks and services

```typescript
// ❌ BAD — src/components/features/InvoiceCard.tsx
export default function InvoiceCard({ invoice }: any) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' })  // API call in component
    window.location.reload()  // side effect in component
  }

  return <div onClick={handleDelete}>{invoice.number}</div>
}
```

```typescript
// ✅ GOOD — src/components/features/invoice/InvoiceCard.tsx
import type { Invoice } from '@/types/invoice'
import { useDeleteInvoice } from '@/hooks/useInvoices'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { formatCurrency } from '@/utils/formatCurrency'

interface InvoiceCardProps {
  invoice: Invoice
  onDeleted?: (id: string) => void
}

export function InvoiceCard({ invoice, onDeleted }: InvoiceCardProps) {
  const { mutate: deleteInvoice, isPending } = useDeleteInvoice()

  const handleDelete = () => {
    deleteInvoice(invoice.id, {
      onSuccess: () => onDeleted?.(invoice.id),
    })
  }

  return (
    <article
      data-testid={`invoice-card-${invoice.id}`}
      className="rounded-lg border p-4 shadow-sm"
    >
      <header className="flex items-center justify-between">
        <span data-testid="invoice-number" className="font-mono text-sm">
          {invoice.number}
        </span>
        <InvoiceStatusBadge status={invoice.status} />
      </header>

      <p data-testid="invoice-client" className="mt-2 font-medium">
        {invoice.clientName}
      </p>

      <footer className="mt-4 flex items-center justify-between">
        <span data-testid="invoice-total" className="text-lg font-bold">
          {formatCurrency(invoice.total, invoice.currency)}
        </span>
        <button
          data-testid="invoice-delete-button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Delete invoice ${invoice.number}`}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          {isPending ? 'Deleting…' : 'Delete'}
        </button>
      </footer>
    </article>
  )
}
```

---

## API Service Pattern

All API communication goes through service files — never call `fetch` directly in components or hooks.

```typescript
// src/services/invoiceService.ts
import type { CreateInvoiceDto, InvoiceResponse, PaginatedResponse } from '@/types/invoice'
import { ApiError } from '@/lib/apiError'
import { getToken } from '@/lib/auth'

const API_BASE = import.meta.env.VITE_API_URL

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(response.status, body?.detail ?? 'Unexpected error')
  }

  return response.json() as Promise<T>
}

export async function createInvoice(data: CreateInvoiceDto): Promise<InvoiceResponse> {
  return request<InvoiceResponse>('/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getInvoices(page = 1, pageSize = 20): Promise<PaginatedResponse<InvoiceResponse>> {
  return request<PaginatedResponse<InvoiceResponse>>(`/invoices?page=${page}&page_size=${pageSize}`)
}

export async function deleteInvoice(id: string): Promise<void> {
  await request<void>(`/invoices/${id}`, { method: 'DELETE' })
}
```

```typescript
// src/lib/apiError.ts
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }

  get isNotFound() {
    return this.status === 404
  }
}
```

---

## State Management — Zustand

Use Zustand for global client state. Server state (API data) goes through React Query — not Zustand.

```typescript
// src/stores/useAuthStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/user'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
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
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),  // only persist token
    },
  ),
)

// Selector — always prefer selectors over full state access
export const selectCurrentUser = (state: AuthState) => state.user
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated
```

```typescript
// Usage in a component
import { useAuthStore, selectCurrentUser } from '@/stores/useAuthStore'

export function UserMenu() {
  const user = useAuthStore(selectCurrentUser)
  const logout = useAuthStore((s) => s.logout)

  if (!user) return null

  return (
    <div data-testid="user-menu">
      <span data-testid="user-email">{user.email}</span>
      <button data-testid="logout-button" onClick={logout}>
        Sign out
      </button>
    </div>
  )
}
```

```typescript
// src/stores/useInvoiceStore.ts — UI-only state (filters, selected rows)
import { create } from 'zustand'

interface InvoiceUiState {
  selectedIds: Set<string>
  filterStatus: string | null
  toggleSelected: (id: string) => void
  clearSelection: () => void
  setFilterStatus: (status: string | null) => void
}

export const useInvoiceStore = create<InvoiceUiState>((set) => ({
  selectedIds: new Set(),
  filterStatus: null,

  toggleSelected: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds)
      next.has(id) ? next.delete(id) : next.add(id)
      return { selectedIds: next }
    }),

  clearSelection: () => set({ selectedIds: new Set() }),

  setFilterStatus: (status) => set({ filterStatus: status }),
}))
```

---

## Error Boundaries

Every route-level component must be wrapped in an Error Boundary. Use `react-error-boundary`.

```typescript
// src/components/ui/RouteErrorBoundary.tsx
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { ApiError } from '@/lib/apiError'

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const isApiError = error instanceof ApiError

  return (
    <div role="alert" data-testid="error-boundary-fallback" className="p-8 text-center">
      <h2 className="text-xl font-semibold text-red-600">Something went wrong</h2>
      <p className="mt-2 text-gray-600">
        {isApiError && error.isUnauthorized
          ? 'Your session has expired. Please sign in again.'
          : 'An unexpected error occurred. Please try again.'}
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-4 text-left text-xs text-gray-400">{error.message}</pre>
      )}
      <button
        data-testid="error-boundary-retry"
        onClick={resetErrorBoundary}
        className="mt-6 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  )
}

interface RouteErrorBoundaryProps {
  children: React.ReactNode
}

export function RouteErrorBoundary({ children }: RouteErrorBoundaryProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  )
}
```

```typescript
// src/pages/InvoicesPage.tsx
import { RouteErrorBoundary } from '@/components/ui/RouteErrorBoundary'
import { InvoiceList } from '@/components/features/invoice/InvoiceList'

export function InvoicesPage() {
  return (
    <RouteErrorBoundary>
      <InvoiceList />
    </RouteErrorBoundary>
  )
}
```

---

## Performance — Code Splitting and Core Web Vitals

### Targets

| Metric | Target | What breaks it |
|--------|--------|----------------|
| LCP | < 2.5s | Large unoptimized images, render-blocking resources |
| CLS | < 0.1 | Async content without reserved space, font swap |
| INP | < 100ms | Heavy synchronous JS on interaction |

### Route-level code splitting with React.lazy + Suspense

```typescript
// src/App.tsx
import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PageSpinner } from '@/components/ui/PageSpinner'
import { ROUTES } from '@/constants/routes'

// Eagerly load the first visible route only
import { LoginPage } from '@/pages/LoginPage'

// Lazy-load everything else
const InvoicesPage = lazy(() =>
  import('@/pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage }))
)
const InvoiceDetailPage = lazy(() =>
  import('@/pages/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage }))
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.INVOICES} element={<InvoicesPage />} />
          <Route path={ROUTES.INVOICE_DETAIL} element={<InvoiceDetailPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

### Avoid CLS — reserve space for async content

```typescript
// ❌ BAD — content jumps when data loads
export function InvoiceList() {
  const { data } = useInvoices()
  if (!data) return null  // causes layout shift when data arrives
  return <ul>{data.map(...)}</ul>
}

// ✅ GOOD — skeleton maintains layout
export function InvoiceList() {
  const { data, isLoading } = useInvoices()

  if (isLoading) {
    return (
      <ul aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-20 animate-pulse rounded bg-gray-100" />
        ))}
      </ul>
    )
  }

  return (
    <ul>
      {data?.map((invoice) => (
        <li key={invoice.id}>
          <InvoiceCard invoice={invoice} />
        </li>
      ))}
    </ul>
  )
}
```

---

## Accessibility — WCAG 2.2

Requirements for every component:

- All interactive elements are keyboard navigable (tab order, Enter/Space activation)
- Focus is always visible — never `outline: none` without a custom focus ring
- `alt` text on all `<img>` elements (empty string `alt=""` for decorative images)
- ARIA labels on icon-only buttons
- Minimum contrast ratio 4.5:1 for normal text, 3:1 for large text
- `data-testid` on all testable elements (also aids accessibility testing)

```typescript
// ❌ BAD
<button onClick={onDelete}>
  <TrashIcon />  {/* screen reader reads nothing */}
</button>

<img src={logo} />  {/* missing alt */}

<div onClick={openModal}>Open</div>  {/* not keyboard accessible */}

// ✅ GOOD
<button
  onClick={onDelete}
  aria-label={`Delete invoice ${invoice.number}`}
  data-testid="invoice-delete-button"
>
  <TrashIcon aria-hidden="true" />
</button>

<img src={logo} alt="Acme Corp logo" />
<img src={decorativeBanner} alt="" role="presentation" />

<button
  onClick={openModal}
  data-testid="open-modal-button"
  type="button"
>
  Open
</button>
```

Run accessibility audits in CI with `axe-core`:

```typescript
// src/__tests__/a11y/InvoiceCard.a11y.test.tsx
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { InvoiceCard } from '@/components/features/invoice/InvoiceCard'

expect.extend(toHaveNoViolations)

it('InvoiceCard has no accessibility violations', async () => {
  const { container } = render(<InvoiceCard invoice={buildInvoice()} />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

## Component Tests — Testing Library + Vitest

Test behavior, not implementation. Query by role and label, not by class names.

```typescript
// src/components/features/invoice/InvoiceForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { InvoiceForm } from './InvoiceForm'
import * as invoiceService from '@/services/invoiceService'

vi.mock('@/services/invoiceService')

describe('InvoiceForm', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows error when amount is negative', async () => {
    // Given
    render(<InvoiceForm onSubmit={vi.fn()} />)

    // When
    await user.type(screen.getByTestId('invoice-amount'), '-100')
    await user.click(screen.getByTestId('submit-invoice'))

    // Then
    expect(await screen.findByText('Amount must be positive')).toBeInTheDocument()
    expect(invoiceService.createInvoice).not.toHaveBeenCalled()
  })

  it('calls onSubmit with correct payload when form is valid', async () => {
    // Given
    const mockOnSubmit = vi.fn()
    vi.mocked(invoiceService.createInvoice).mockResolvedValue(buildInvoice())
    render(<InvoiceForm onSubmit={mockOnSubmit} />)

    // When
    await user.type(screen.getByTestId('invoice-client'), 'Acme Corp')
    await user.type(screen.getByTestId('invoice-amount'), '1500.00')
    await user.click(screen.getByTestId('submit-invoice'))

    // Then
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ clientName: 'Acme Corp', subtotal: 1500 })
      )
    })
  })

  it('disables submit button while request is in flight', async () => {
    // Given
    vi.mocked(invoiceService.createInvoice).mockImplementation(
      () => new Promise(() => {})  // never resolves
    )
    render(<InvoiceForm onSubmit={vi.fn()} />)

    // When
    await user.type(screen.getByTestId('invoice-client'), 'Acme Corp')
    await user.type(screen.getByTestId('invoice-amount'), '500')
    await user.click(screen.getByTestId('submit-invoice'))

    // Then
    expect(screen.getByTestId('submit-invoice')).toBeDisabled()
  })
})
```
