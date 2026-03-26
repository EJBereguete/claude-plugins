# TypeScript / Vitest — Testing Reference

## 1. describe/it naming — nested describe blocks

```typescript
describe('CreateUserUseCase', () => {
  describe('when email is valid and not taken', () => {
    it('should return the created user', async () => { ... })
    it('should call repository.save once', async () => { ... })
  })

  describe('when email is already registered', () => {
    it('should throw ConflictException', async () => { ... })
    it('should NOT call repository.save', async () => { ... })
  })

  describe('when email format is invalid', () => {
    it('should throw ValidationException with "email" in message', async () => { ... })
  })
})
```

---

## 2. Given / When / Then with comments

```typescript
it('should return the created user', async () => {
  // Given
  const command = { email: 'alice@example.com', name: 'Alice' }
  userRepoMock.findByEmail.mockResolvedValue(null)  // no duplicate

  // When
  const result = await useCase.execute(command)

  // Then
  expect(result.email).toBe('alice@example.com')
  expect(userRepoMock.save).toHaveBeenCalledOnce()
})
```

---

## 3. Factory functions

```typescript
// tests/factories/user.factory.ts
import { faker } from '@faker-js/faker'
import type { User, Order } from '@/domain/models'

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id:        faker.string.uuid(),
    email:     faker.internet.email(),
    name:      faker.person.fullName(),
    isActive:  true,
    createdAt: faker.date.past(),
    ...overrides,
  }
}

export function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id:        faker.string.uuid(),
    userId:    faker.string.uuid(),
    status:    'PENDING',
    total:     parseFloat(faker.commerce.price()),
    createdAt: faker.date.past(),
    ...overrides,
  }
}

// Usage:
const alice         = createUser({ email: 'alice@example.com' })
const inactiveUser  = createUser({ isActive: false })
const paidOrder     = createOrder({ status: 'PAID', total: 99.99 })
```

---

## 4. Vitest unit test — `CreateUserUseCase`

```typescript
// tests/unit/create-user.use-case.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreateUserUseCase }   from '@/application/use-cases/create-user.use-case'
import { ConflictException }   from '@/domain/exceptions'
import { createUser }          from '@tests/factories/user.factory'

const userRepoMock = {
  findByEmail: vi.fn(),
  save:        vi.fn(),
}

let useCase: CreateUserUseCase

beforeEach(() => {
  vi.clearAllMocks()
  useCase = new CreateUserUseCase(userRepoMock)
})

describe('CreateUserUseCase', () => {
  describe('when email is valid and not taken', () => {
    it('should return the created user', async () => {
      userRepoMock.findByEmail.mockResolvedValue(null)
      userRepoMock.save.mockResolvedValue(createUser({ email: 'bob@example.com' }))

      const result = await useCase.execute({ email: 'bob@example.com', name: 'Bob' })

      expect(result.email).toBe('bob@example.com')
      expect(userRepoMock.save).toHaveBeenCalledOnce()
    })
  })

  describe('when email is already registered', () => {
    it('should throw ConflictException', async () => {
      userRepoMock.findByEmail.mockResolvedValue(createUser({ email: 'taken@example.com' }))

      await expect(
        useCase.execute({ email: 'taken@example.com', name: 'Eve' })
      ).rejects.toThrow(ConflictException)

      expect(userRepoMock.save).not.toHaveBeenCalled()
    })
  })

  describe('when email format is invalid', () => {
    it.each(['not-an-email', '', 'a@', '@domain.com'])(
      'should throw ValidationException for email "%s"',
      async (email) => {
        await expect(
          useCase.execute({ email, name: 'Test' })
        ).rejects.toThrowError(/email/i)
      }
    )
  })
})
```

---

## 5. MSW setup — API mocking

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/users/:id', ({ params }) => {
    return HttpResponse.json({
      id:    params.id,
      email: 'mock@example.com',
      name:  'Mock User',
    })
  }),

  http.post('/users', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({ id: '123', ...body }, { status: 201 })
  }),
]

// tests/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers }    from './handlers'

export const server = setupServer(...handlers)

// tests/setup.ts  (referenced by vitest.config.ts setupFiles)
import { server } from './mocks/server'
beforeAll(()  => server.listen({ onUnhandledRequest: 'error' }))
afterEach(()  => server.resetHandlers())
afterAll(()   => server.close())

// Per-test override — simulate error:
it('handles 500 response gracefully', async () => {
  server.use(
    http.get('/users/:id', () => HttpResponse.json({ message: 'Internal error' }, { status: 500 }))
  )
  await expect(fetchUser('1')).rejects.toThrow(/500/)
})
```

---

## 6. Testing Library — component tests

```typescript
// tests/components/UserForm.spec.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserForm } from '@/components/UserForm'
import { server }   from '@tests/mocks/server'
import { http, HttpResponse } from 'msw'

describe('UserForm', () => {
  it('should submit the form and show success message', async () => {
    const user = userEvent.setup()
    render(<UserForm />)

    // Fill form
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'alice@example.com')
    await user.type(screen.getByRole('textbox', { name: /name/i }),  'Alice')
    await user.type(screen.getByLabelText(/password/i),              'p@ssw0rd!')

    // Submit
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Assert
    await waitFor(() =>
      expect(screen.getByText(/account created/i)).toBeInTheDocument()
    )
  })

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup()
    render(<UserForm />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'bad-email')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })
})
```

---

## 7. Playwright E2E — page object model

```typescript
// tests/e2e/pages/LoginPage.ts
import { type Page, type Locator } from '@playwright/test'

export class LoginPage {
  readonly emailInput:    Locator
  readonly passwordInput: Locator
  readonly submitButton:  Locator

  constructor(private page: Page) {
    this.emailInput    = page.getByRole('textbox', { name: /email/i })
    this.passwordInput = page.getByLabel(/password/i)
    this.submitButton  = page.getByRole('button', { name: /sign in/i })
  }

  async goto()                               { await this.page.goto('/login') }
  async login(email: string, pass: string)   {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(pass)
    await this.submitButton.click()
  }
}

// tests/e2e/user-management.spec.ts
import { test, expect } from '@playwright/test'
import { LoginPage }    from './pages/LoginPage'

test.describe('User management', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin@example.com', 'admin_p@ss!')
    await page.waitForURL('/dashboard')
  })

  test('admin can invite a new user', async ({ page }) => {
    await page.getByRole('link', { name: /users/i }).click()
    await page.getByRole('button', { name: /invite/i }).click()
    await page.getByLabel(/email/i).fill('new@example.com')
    await page.getByRole('button', { name: /send invite/i }).click()

    await expect(page.getByText(/invitation sent/i)).toBeVisible()

    // Screenshot evidence
    await page.screenshot({ path: 'test-results/invite-success.png', fullPage: true })
  })
})
```

---

## 8. Coverage config — `vitest.config.ts`

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals:     true,
    environment: 'jsdom',
    setupFiles:  ['./tests/setup.ts'],

    coverage: {
      provider:        'v8',
      reporter:        ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include:         ['src/**/*.{ts,tsx}'],
      exclude:         ['src/**/*.d.ts', 'src/main.tsx', 'src/**/*.stories.*'],
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   75,
        statements: 80,
      },
    },

    alias: {
      '@':      path.resolve(__dirname, 'src'),
      '@tests': path.resolve(__dirname, 'tests'),
    },
  },
})
```
