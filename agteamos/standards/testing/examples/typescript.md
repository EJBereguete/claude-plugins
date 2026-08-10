# Testing Patterns — Vitest / Testing Library / Playwright

---

## 1. Test Naming Convention

```typescript
describe('ComponentOrModule', () => {
  describe('methodOrBehaviour', () => {
    describe('when <condition>', () => {
      it('should <expected outcome>', () => { /* ... */ })
    })
  })
})

// Example
describe('CreateUserUseCase', () => {
  describe('execute', () => {
    describe('when the email is not yet registered', () => {
      it('should create and persist the user', async () => { /* ... */ })
      it('should send a welcome email', async () => { /* ... */ })
    })

    describe('when the email is already registered', () => {
      it('should throw DuplicateEmailError', async () => { /* ... */ })
    })
  })
})
```

---

## 2. Given / When / Then Structure

Every test follows the AAA (Arrange/Act/Assert) pattern, labelled as Given/When/Then in comments.

```typescript
it('should return the discounted total', () => {
  // Given
  const order = buildOrder({ total: 100 })
  const discount: Discount = { kind: 'percentage', rate: 0.1 }

  // When
  const result = applyDiscount(order.total, discount)

  // Then
  expect(result).toBe(90)
})
```

---

## 3. Factory Functions

Factories create test data with sensible defaults and allow per-test overrides.
This keeps tests readable and decouples them from schema changes.

```typescript
// tests/factories/buildUser.ts
import { randomUUID } from 'node:crypto'
import type { User } from '../../src/domain/entities/User'

export function buildUserProps(overrides: Partial<UserProps> = {}): UserProps {
  return {
    id: randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    role: 'member',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function buildUser(overrides: Partial<UserProps> = {}): User {
  return User.reconstitute(buildUserProps(overrides))
}

// tests/factories/buildInvoice.ts
export function buildInvoice(overrides: Partial<InvoiceProps> = {}): Invoice {
  return {
    id: randomUUID(),
    userId: randomUUID(),
    total: 100,
    status: 'pending',
    lineItems: [buildLineItem()],
    issuedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function buildLineItem(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: randomUUID(),
    description: 'Test item',
    quantity: 1,
    unitPrice: 100,
    ...overrides,
  }
}

// Usage in tests — minimal and expressive
it('should apply percentage discount', () => {
  const invoice = buildInvoice({ total: 200 })
  // ...
})

it('should reject invoice for inactive user', () => {
  const user = buildUser({ status: 'inactive' })
  // ...
})
```

---

## 4. Vitest Mocking

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- vi.mock(): mock an entire module ---
vi.mock('../lib/email', () => ({
  sendWelcome: vi.fn().mockResolvedValue(undefined),
}))

import { sendWelcome } from '../lib/email'

it('should call sendWelcome once', async () => {
  await someServiceThatCallsEmail()
  expect(sendWelcome).toHaveBeenCalledOnce()
  expect(sendWelcome).toHaveBeenCalledWith(expect.objectContaining({ to: 'alice@example.com' }))
})

// --- vi.spyOn(): spy on an existing method ---
describe('UserRepository', () => {
  afterEach(() => vi.restoreAllMocks())

  it('should call prisma.user.findUnique', async () => {
    const spy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(userRow)
    const repo = new PrismaUserRepository()

    await repo.findById('user-1')

    expect(spy).toHaveBeenCalledWith({ where: { id: 'user-1' } })
  })
})

// --- vi.fn(): inline mock function ---
it('should invoke the callback with the result', async () => {
  const onSuccess = vi.fn()
  await doSomething({ onSuccess })

  expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }))
})

// --- Fake timers ---
it('should expire the session after 30 minutes', () => {
  vi.useFakeTimers()
  const session = createSession()

  vi.advanceTimersByTime(30 * 60 * 1000)

  expect(session.isExpired()).toBe(true)
  vi.useRealTimers()
})
```

---

## 5. React Testing Library

```typescript
// components/__tests__/UserCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserCard } from '../UserCard'
import { buildUser } from '../../tests/factories/buildUser'

describe('UserCard', () => {
  const user = buildUser({ name: 'Alice', email: 'alice@example.com' })

  describe('rendering', () => {
    it('should display the user name and email', () => {
      // Given / When
      render(<UserCard user={user} onEdit={vi.fn()} />)

      // Then — query by role/label, not by class or id
      expect(screen.getByRole('heading', { name: 'Alice' })).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })
  })

  describe('when the Edit button is clicked', () => {
    it('should call onEdit with the user id', async () => {
      // Given
      const onEdit = vi.fn()
      render(<UserCard user={user} onEdit={onEdit} />)

      // When
      await userEvent.click(screen.getByRole('button', { name: /edit alice/i }))

      // Then
      expect(onEdit).toHaveBeenCalledWith(user.id)
    })
  })
})

// components/__tests__/CreateUserForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateUserForm } from '../CreateUserForm'
import { server } from '../../tests/mocks/server'
import { http, HttpResponse } from 'msw'

describe('CreateUserForm', () => {
  describe('when submitting valid data', () => {
    it('should call onSuccess with the new user', async () => {
      // Given
      const onSuccess = vi.fn()
      render(<CreateUserForm onSuccess={onSuccess} />)

      // When
      await userEvent.type(screen.getByLabelText('Email'), 'new@example.com')
      await userEvent.type(screen.getByLabelText('Name'), 'New User')
      await userEvent.click(screen.getByRole('button', { name: 'Create User' }))

      // Then
      await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
    })
  })

  describe('when the server returns a validation error', () => {
    it('should display the field error message', async () => {
      // Given — override the handler for this test
      server.use(
        http.post('/api/v1/users', () =>
          HttpResponse.json(
            { type: '...', title: 'Validation Error', status: 422, detail: '...', fields: { email: ['Email is taken'] } },
            { status: 422 },
          ),
        ),
      )
      render(<CreateUserForm onSuccess={vi.fn()} />)

      // When
      await userEvent.type(screen.getByLabelText('Email'), 'taken@example.com')
      await userEvent.type(screen.getByLabelText('Name'), 'User')
      await userEvent.click(screen.getByRole('button', { name: 'Create User' }))

      // Then
      await screen.findByText('Email is taken')
    })
  })
})
```

---

## 6. MSW — Mock Service Worker

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'
import { buildUser } from '../factories/buildUser'

export const handlers = [
  http.get('/api/v1/users', () => {
    return HttpResponse.json({
      data: [buildUser({ name: 'Alice' }), buildUser({ name: 'Bob' })],
      pagination: { nextCursor: null, hasMore: false, limit: 20 },
    })
  }),

  http.get('/api/v1/users/:id', ({ params }) => {
    return HttpResponse.json(buildUser({ id: params.id as string }))
  }),

  http.post('/api/v1/users', async ({ request }) => {
    const body = await request.json() as { email: string; name: string }
    return HttpResponse.json(buildUser(body), { status: 201 })
  }),

  http.delete('/api/v1/users/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

// tests/mocks/server.ts (Node.js — unit/integration tests)
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

// tests/setup.ts — run before each test file
import { beforeAll, afterAll, afterEach } from 'vitest'
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

## 7. Playwright — Page Object Model

```typescript
// e2e/pages/LoginPage.ts
import type { Page, Locator } from '@playwright/test'

export class LoginPage {
  private readonly emailInput: Locator
  private readonly passwordInput: Locator
  private readonly submitButton: Locator
  private readonly errorMessage: Locator

  constructor(private readonly page: Page) {
    this.emailInput    = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.submitButton  = page.getByRole('button', { name: 'Log in' })
    this.errorMessage  = page.getByRole('alert')
  }

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async getErrorMessage(): Promise<string | null> {
    return this.errorMessage.isVisible()
      ? this.errorMessage.textContent()
      : null
  }
}

// e2e/pages/DashboardPage.ts
export class DashboardPage {
  constructor(private readonly page: Page) {}

  async isVisible(): Promise<boolean> {
    return this.page.getByRole('heading', { name: 'Dashboard' }).isVisible()
  }

  async goto() {
    await this.page.goto('/dashboard')
  }
}

// e2e/tests/auth.spec.ts
import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'

test.describe('Authentication', () => {
  test('should redirect to dashboard after successful login', async ({ page }) => {
    // Given
    const loginPage = new LoginPage(page)
    const dashboardPage = new DashboardPage(page)
    await loginPage.goto()

    // When
    await loginPage.login('alice@example.com', 'secret123')

    // Then
    await expect(page).toHaveURL('/dashboard')
    expect(await dashboardPage.isVisible()).toBe(true)
  })

  test('should show an error for invalid credentials', async ({ page }) => {
    // Given
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    // When
    await loginPage.login('wrong@example.com', 'wrong')

    // Then
    const error = await loginPage.getErrorMessage()
    expect(error).toContain('Invalid email or password')
  })
})
```

---

## 8. Vitest Config with Coverage Thresholds

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],

  test: {
    environment: 'jsdom',
    globals: true,

    // Run setup file before every test file
    setupFiles: ['./tests/setup.ts'],

    // Files to include / exclude
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',

      // Enforced thresholds — CI fails below these
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },

      // Exclude generated and non-testable files
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/__mocks__/**',
        'tests/**',
      ],
    },
  },
})
```

### Run commands

```bash
# Unit tests (watch mode)
npx vitest

# Unit tests (single run + coverage)
npx vitest run --coverage

# E2E tests
npx playwright test

# E2E with UI
npx playwright test --ui
```
