# Clean Architecture — TypeScript / Node.js + React

## 1. Folder Structure

```
src/
├── domain/                        # Enterprise business rules (no deps)
│   ├── entities/
│   │   ├── User.ts
│   │   └── Invoice.ts
│   ├── value-objects/
│   │   ├── Email.ts
│   │   └── Money.ts
│   └── errors/
│       ├── DuplicateEmailError.ts
│       └── DomainError.ts
│
├── application/                   # Application business rules
│   ├── ports/                     # Interfaces (outbound)
│   │   ├── IUserRepository.ts
│   │   └── IEmailService.ts
│   └── use-cases/
│       ├── CreateUser.ts
│       └── GetUserById.ts
│
├── infrastructure/                # Frameworks & drivers (concrete)
│   ├── repositories/
│   │   ├── PrismaUserRepository.ts
│   │   └── InMemoryUserRepository.ts
│   ├── services/
│   │   └── SendgridEmailService.ts
│   └── db/
│       └── prisma.ts
│
└── presentation/                  # UI & delivery (React / Express)
    ├── hooks/
    │   └── useCreateUser.ts
    ├── components/
    │   └── CreateUserForm.tsx
    └── api/
        └── users.router.ts
```

**The Dependency Rule:** source-code dependencies point *inward only*.

```
presentation → application → domain
infrastructure → application → domain
```

---

## 2. Dependency Rule — Correct vs Incorrect

```typescript
// ❌ WRONG — use-case imports a concrete infrastructure class
import { PrismaUserRepository } from '../../infrastructure/repositories/PrismaUserRepository'

export class CreateUserUseCase {
  private repo = new PrismaUserRepository() // hard-coupled to Prisma
}

// ✅ CORRECT — use-case depends only on the port interface
import type { IUserRepository } from '../ports/IUserRepository'

export class CreateUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}
}
```

---

## 3. Domain Layer

### `domain/value-objects/Email.ts`

```typescript
export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const trimmed = raw.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new Error(`Invalid email: "${raw}"`)
    }
    return new Email(trimmed)
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
```

### `domain/entities/User.ts`

```typescript
import { randomUUID } from 'node:crypto'
import { Email } from '../value-objects/Email'

export interface UserProps {
  id: string
  email: Email
  name: string
  createdAt: Date
}

export class User {
  readonly id: string
  readonly email: Email
  readonly name: string
  readonly createdAt: Date

  private constructor(props: UserProps) {
    this.id = props.id
    this.email = props.email
    this.name = props.name
    this.createdAt = props.createdAt
  }

  /** Factory — use this instead of `new User()` */
  static create(rawEmail: string, name: string): User {
    if (!name.trim()) throw new Error('Name cannot be empty')
    return new User({
      id: randomUUID(),
      email: Email.create(rawEmail),
      name: name.trim(),
      createdAt: new Date(),
    })
  }

  /** Reconstitute from persistence */
  static reconstitute(props: UserProps): User {
    return new User(props)
  }
}
```

### `domain/errors/DuplicateEmailError.ts`

```typescript
export class DuplicateEmailError extends Error {
  readonly code = 'DUPLICATE_EMAIL'
  readonly statusCode = 409

  constructor(email: string) {
    super(`Email "${email}" is already registered`)
    this.name = 'DuplicateEmailError'
  }
}
```

---

## 4. Application Layer

### `application/ports/IUserRepository.ts`

```typescript
import type { User } from '../../domain/entities/User'

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  save(user: User): Promise<void>
  delete(id: string): Promise<void>
}
```

### `application/ports/IEmailService.ts`

```typescript
export interface WelcomeEmailPayload {
  to: string
  name: string
}

export interface IEmailService {
  sendWelcome(payload: WelcomeEmailPayload): Promise<void>
}
```

### `application/use-cases/CreateUser.ts`

```typescript
import type { IUserRepository } from '../ports/IUserRepository'
import type { IEmailService } from '../ports/IEmailService'
import { User } from '../../domain/entities/User'
import { DuplicateEmailError } from '../../domain/errors/DuplicateEmailError'

export interface CreateUserInput {
  email: string
  name: string
}

export interface CreateUserOutput {
  id: string
  email: string
  name: string
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly emailService: IEmailService,
  ) {}

  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    const existing = await this.userRepo.findByEmail(input.email)
    if (existing) throw new DuplicateEmailError(input.email)

    const user = User.create(input.email, input.name)
    await this.userRepo.save(user)
    await this.emailService.sendWelcome({ to: user.email.value, name: user.name })

    return { id: user.id, email: user.email.value, name: user.name }
  }
}
```

---

## 5. Infrastructure Layer

### `infrastructure/repositories/PrismaUserRepository.ts`

```typescript
import type { IUserRepository } from '../../application/ports/IUserRepository'
import type { User } from '../../domain/entities/User'
import { User as UserEntity } from '../../domain/entities/User'
import { Email } from '../../domain/value-objects/Email'
import { prisma } from '../db/prisma'

export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    const row = await prisma.user.findUnique({ where: { id } })
    return row ? this.toDomain(row) : null
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const row = await prisma.user.findUnique({ where: { email } })
    return row ? this.toDomain(row) : null
  }

  async save(user: UserEntity): Promise<void> {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email.value,
        name: user.name,
        createdAt: user.createdAt,
      },
      update: { name: user.name },
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } })
  }

  private toDomain(row: { id: string; email: string; name: string; createdAt: Date }): UserEntity {
    return UserEntity.reconstitute({
      id: row.id,
      email: Email.create(row.email),
      name: row.name,
      createdAt: row.createdAt,
    })
  }
}
```

### `infrastructure/repositories/InMemoryUserRepository.ts`

```typescript
import type { IUserRepository } from '../../application/ports/IUserRepository'
import type { User } from '../../domain/entities/User'

/** Fake repository for tests — no database required */
export class InMemoryUserRepository implements IUserRepository {
  private store = new Map<string, User>()

  async findById(id: string): Promise<User | null> {
    return this.store.get(id) ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.store.values()) {
      if (user.email.value === email) return user
    }
    return null
  }

  async save(user: User): Promise<void> {
    this.store.set(user.id, user)
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }

  /** Test helper */
  all(): User[] {
    return [...this.store.values()]
  }
}
```

---

## 6. Presentation Layer

### `presentation/hooks/useCreateUser.ts`

```typescript
import { useState, useCallback } from 'react'
import { CreateUserUseCase } from '../../application/use-cases/CreateUser'
import { PrismaUserRepository } from '../../infrastructure/repositories/PrismaUserRepository'
import { SendgridEmailService } from '../../infrastructure/services/SendgridEmailService'

// Compose dependencies once (could also come from a DI container)
const useCase = new CreateUserUseCase(
  new PrismaUserRepository(),
  new SendgridEmailService(),
)

interface State {
  loading: boolean
  error: string | null
}

export function useCreateUser() {
  const [state, setState] = useState<State>({ loading: false, error: null })

  const createUser = useCallback(async (email: string, name: string) => {
    setState({ loading: true, error: null })
    try {
      const result = await useCase.execute({ email, name })
      setState({ loading: false, error: null })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState({ loading: false, error: message })
      return null
    }
  }, [])

  return { ...state, createUser }
}
```

---

## 7. Test — Use Case with In-Memory Fake

```typescript
// application/use-cases/__tests__/CreateUser.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreateUserUseCase } from '../CreateUser'
import { InMemoryUserRepository } from '../../../infrastructure/repositories/InMemoryUserRepository'
import type { IEmailService } from '../../ports/IEmailService'
import { DuplicateEmailError } from '../../../domain/errors/DuplicateEmailError'

describe('CreateUserUseCase', () => {
  let userRepo: InMemoryUserRepository
  let emailService: IEmailService
  let useCase: CreateUserUseCase

  beforeEach(() => {
    userRepo = new InMemoryUserRepository()
    emailService = { sendWelcome: vi.fn().mockResolvedValue(undefined) }
    useCase = new CreateUserUseCase(userRepo, emailService)
  })

  describe('when creating a new user', () => {
    it('should persist the user and return their id/email/name', async () => {
      // Given
      const input = { email: 'alice@example.com', name: 'Alice' }

      // When
      const output = await useCase.execute(input)

      // Then
      expect(output.email).toBe('alice@example.com')
      expect(output.name).toBe('Alice')
      expect(output.id).toBeTruthy()
      expect(userRepo.all()).toHaveLength(1)
    })

    it('should send a welcome email', async () => {
      // When
      await useCase.execute({ email: 'bob@example.com', name: 'Bob' })

      // Then
      expect(emailService.sendWelcome).toHaveBeenCalledWith({
        to: 'bob@example.com',
        name: 'Bob',
      })
    })
  })

  describe('when the email is already registered', () => {
    it('should throw DuplicateEmailError', async () => {
      // Given
      await useCase.execute({ email: 'alice@example.com', name: 'Alice' })

      // When / Then
      await expect(
        useCase.execute({ email: 'alice@example.com', name: 'Another Alice' }),
      ).rejects.toThrow(DuplicateEmailError)
    })
  })

  describe('when email is invalid', () => {
    it('should throw a domain validation error', async () => {
      await expect(
        useCase.execute({ email: 'not-an-email', name: 'Test' }),
      ).rejects.toThrow('Invalid email')
    })
  })
})
```
