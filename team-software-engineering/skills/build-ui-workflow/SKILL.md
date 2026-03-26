---
name: build-ui-workflow
description: >
  Construccion de componentes y features de frontend. Lee el design system,
  respeta los tokens visuales, obtiene aprobacion del usuario para cambios
  de UI y escribe tests de componente.
used_by:
  - frontend-engineer
  - ui-ux-designer
---

# SKILL: Build UI Workflow

## CONTRACT

- **Input**: descripcion del componente o feature a construir + `/docs/03-design/DESIGN_SYSTEM.md`
- **Output**: componentes implementados en TypeScript + tests de componente + PR abierto
- **Who runs this**: @frontend-engineer for implementation, @ui-ux-designer for design tokens and visual consistency review

---

## PROCESS

### Step 1 — Read the design system

Read `/docs/03-design/DESIGN_SYSTEM.md` to extract:
- Color tokens (primary, secondary, semantic colors)
- Typography scale (font sizes, weights, line heights)
- Spacing system (base unit, scale values)
- Component patterns in use (card, button variants, form inputs)
- Icon library in use

If the file does not exist, read existing CSS/Tailwind config to extract tokens:
```bash
# Find theme config
find . -name "tailwind.config.*" -o -name "theme.ts" -o -name "tokens.css" | head -5
```

---

### Step 2 — Read similar existing components

Before writing any code, find and read at least 2 components that are structurally similar to what you are building:
```bash
# Find existing components
find . -name "*.tsx" -path "*/components/*" | head -20
```

Document the patterns you observe:
- Props interface naming convention
- File and folder structure
- How state is managed (local state vs store vs context)
- How API calls are made (React Query / SWR / custom hook / direct fetch)
- Test file location and naming

---

### Step 3 — Get user approval for visible UI changes (MANDATORY)

If the task modifies any visible UI element, present a wireframe before writing any code.

**ASCII wireframe example**:
```
+------------------------------------------+
|  Invoice List                    [+ New]  |
+------------------------------------------+
|  [ Search invoices... ]                   |
+------------------------------------------+
|  # | Date       | Client    | Total | St. |
|----|------------|-----------|-------|-----|
|  1 | 2026-03-25 | Acme Corp | $150  | [D] |
|  2 | 2026-03-24 | Globex    | $980  | [P] |
+------------------------------------------+
|           < 1 2 3 >                       |
+------------------------------------------+
Status: [D] Draft  [P] Paid  [O] Overdue
```

**Mermaid wireframe alternative**:
```
graph TD
  A[InvoiceListPage] --> B[SearchBar]
  A --> C[InvoiceTable]
  A --> D[Pagination]
  C --> E[InvoiceRow x N]
  E --> F[StatusBadge]
```

State clearly: "I will implement this layout. Please confirm before I proceed."

Do not write any component code until the user explicitly approves.

---

### Step 4 — Create the feature branch

```bash
git checkout -b feature/<slug>-ui
# Example: feature/invoice-list-ui
```

---

### Step 5 — Implement with TypeScript strict mode

Full component example (React + TypeScript + Tailwind):

```tsx
// components/InvoiceList/InvoiceList.tsx
import { useState } from 'react'
import { useInvoices } from '@/hooks/useInvoices'
import { InvoiceRow } from './InvoiceRow'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import type { Invoice } from '@/types/invoice'

interface InvoiceListProps {
  initialPage?: number
}

export function InvoiceList({ initialPage = 1 }: InvoiceListProps) {
  const [page, setPage] = useState(initialPage)
  const [search, setSearch] = useState('')

  const { data, isLoading, isError } = useInvoices({ page, search })

  if (isLoading) {
    return (
      <div data-testid="invoice-list-loading" className="flex justify-center p-8">
        <span className="text-gray-500">Loading invoices...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div data-testid="invoice-list-error" className="text-red-600 p-4">
        Failed to load invoices. Please try again.
      </div>
    )
  }

  return (
    <div data-testid="invoice-list" className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
        <button
          data-testid="invoice-new-button"
          className="btn-primary"
          onClick={() => {/* navigate to new invoice */}}
        >
          + New
        </button>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search invoices..."
        data-testid="invoice-search"
      />

      <table className="w-full border-collapse" data-testid="invoice-table">
        <thead>
          <tr className="text-left text-sm text-gray-600 border-b">
            <th className="pb-2">#</th>
            <th className="pb-2">Date</th>
            <th className="pb-2">Client</th>
            <th className="pb-2">Total</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {data?.invoices.map((invoice: Invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} />
          ))}
        </tbody>
      </table>

      <Pagination
        currentPage={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        data-testid="invoice-pagination"
      />
    </div>
  )
}
```

Rules:
- `data-testid` on every element that will be asserted in tests
- Always render loading AND error states — never just the success state
- Never use `any` — define explicit interfaces for all props and API responses
- Use design tokens from the design system — never hardcode hex colors or px values
- Axios client must be the shared instance from `src/lib/api/client.ts`

---

### Step 6 — Write component tests (MANDATORY)

```tsx
// components/InvoiceList/InvoiceList.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { InvoiceList } from './InvoiceList'
import { useInvoices } from '@/hooks/useInvoices'

vi.mock('@/hooks/useInvoices')

const mockUseInvoices = vi.mocked(useInvoices)

describe('InvoiceList', () => {
  it('renders invoices when data loads successfully', async () => {
    mockUseInvoices.mockReturnValue({
      data: {
        invoices: [
          { id: '1', date: '2026-03-25', client: 'Acme Corp', total: 150, status: 'draft' },
        ],
        totalPages: 1,
      },
      isLoading: false,
      isError: false,
    })

    render(<InvoiceList />)

    expect(screen.getByTestId('invoice-table')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('shows loading state while fetching', () => {
    mockUseInvoices.mockReturnValue({ data: undefined, isLoading: true, isError: false })

    render(<InvoiceList />)

    expect(screen.getByTestId('invoice-list-loading')).toBeInTheDocument()
  })

  it('shows error state when fetch fails', () => {
    mockUseInvoices.mockReturnValue({ data: undefined, isLoading: false, isError: true })

    render(<InvoiceList />)

    expect(screen.getByTestId('invoice-list-error')).toBeInTheDocument()
  })

  it('calls search when user types in the search bar', async () => {
    const user = userEvent.setup()
    mockUseInvoices.mockReturnValue({ data: { invoices: [], totalPages: 1 }, isLoading: false, isError: false })

    render(<InvoiceList />)

    await user.type(screen.getByTestId('invoice-search'), 'Acme')

    await waitFor(() => {
      expect(mockUseInvoices).toHaveBeenCalledWith(expect.objectContaining({ search: 'Acme' }))
    })
  })
})
```

---

### Step 7 — Verify accessibility

Check against WCAG 2.2 AA:
- Color contrast: text must have minimum 4.5:1 ratio against background
- All interactive elements must be reachable via keyboard (Tab, Enter, Space, Esc)
- Images need `alt` text; decorative images get `alt=""`
- Form inputs must have associated `<label>` elements
- Error messages must be announced to screen readers (`role="alert"` or `aria-live`)
- Modals must trap focus and restore it on close

Run axe or similar in the test suite:
```tsx
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

it('has no accessibility violations', async () => {
  const { container } = render(<InvoiceList />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

### Step 8 — Open PR with visual evidence

Execute the `pr-standards` skill to format the PR.

If the change modifies visible UI, include screenshots in the PR description:
```markdown
## Visual Changes

### Before
[screenshot or "N/A — new component"]

### After
[screenshot]
```

---

## ANTI-PATTERNS

- Writing code before getting user approval on visual changes — the CEO/stakeholder may reject the entire layout, wasting implementation effort
- Missing `data-testid` attributes — tests become fragile and tied to CSS classes or text content that changes
- Rendering only the success state — real users hit loading and error states constantly
- Using hardcoded colors (`#3B82F6`) instead of design tokens (`text-primary-600`) — breaks the design system and makes theme changes impossible
- Skipping the error state test — the most common user complaint is "the app shows nothing when something goes wrong"
- Importing Axios directly in the component instead of using the shared client — breaks auth interceptors and base URL configuration
