# SOLID Principles — TypeScript

---

## 1. Single Responsibility Principle (SRP)

> A class / module should have only one reason to change.

### ❌ Before — UserService does too much

```typescript
class UserService {
  // Responsibility 1: data access
  async findUser(id: string) {
    return db.query(`SELECT * FROM users WHERE id = $1`, [id])
  }

  // Responsibility 2: business validation
  async createUser(email: string, name: string) {
    const exists = await db.query(`SELECT id FROM users WHERE email = $1`, [email])
    if (exists.rows.length) throw new Error('Email taken')
    const hash = await bcrypt.hash(randomPassword(), 10)
    const row = await db.query(
      `INSERT INTO users(email, name, password) VALUES ($1,$2,$3) RETURNING *`,
      [email, name, hash],
    )
    // Responsibility 3: email delivery
    await sgMail.send({ to: email, subject: 'Welcome!', text: `Hi ${name}` })
    // Responsibility 4: logging
    console.log(`[audit] user created id=${row.rows[0].id}`)
    return row.rows[0]
  }
}
```

### ✅ After — each class has one job

```typescript
// data/UserRepository.ts
export class UserRepository {
  async findById(id: string): Promise<UserRow | null> {
    const result = await db.query(`SELECT * FROM users WHERE id = $1`, [id])
    return result.rows[0] ?? null
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await db.query(`SELECT * FROM users WHERE email = $1`, [email])
    return result.rows[0] ?? null
  }

  async insert(email: string, name: string, passwordHash: string): Promise<UserRow> {
    const result = await db.query(
      `INSERT INTO users(email, name, password) VALUES ($1,$2,$3) RETURNING *`,
      [email, name, passwordHash],
    )
    return result.rows[0]
  }
}

// services/PasswordService.ts
export class PasswordService {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10)
  }
}

// services/EmailService.ts
export class EmailService {
  async sendWelcome(to: string, name: string): Promise<void> {
    await sgMail.send({ to, subject: 'Welcome!', text: `Hi ${name}` })
  }
}

// services/AuditLogger.ts
export class AuditLogger {
  log(event: string, meta: Record<string, unknown>): void {
    console.log(`[audit] ${event}`, meta)
  }
}

// use-cases/CreateUser.ts — orchestrates the above
export class CreateUserUseCase {
  constructor(
    private readonly repo: UserRepository,
    private readonly passwords: PasswordService,
    private readonly email: EmailService,
    private readonly audit: AuditLogger,
  ) {}

  async execute(input: { email: string; name: string }): Promise<UserRow> {
    const existing = await this.repo.findByEmail(input.email)
    if (existing) throw new DuplicateEmailError(input.email)

    const hash = await this.passwords.hash(randomPassword())
    const user = await this.repo.insert(input.email, input.name, hash)

    await this.email.sendWelcome(user.email, user.name)
    this.audit.log('user.created', { id: user.id })
    return user
  }
}
```

---

## 2. Open/Closed Principle (OCP)

> Open for extension, closed for modification.

### ❌ Before — switch statement that grows with every new discount

```typescript
function applyDiscount(order: Order, discountType: string): number {
  if (discountType === 'percentage') {
    return order.total * 0.9
  } else if (discountType === 'fixed') {
    return order.total - 10
  } else if (discountType === 'bogo') {
    return order.total / 2
  }
  // Adding a new type requires modifying this function 👎
  return order.total
}
```

### ✅ After — discriminated union + strategy map

```typescript
// Domain types
type PercentageDiscount = { kind: 'percentage'; rate: number }
type FixedDiscount      = { kind: 'fixed'; amount: number }
type BogoDiscount       = { kind: 'bogo' }
type Discount = PercentageDiscount | FixedDiscount | BogoDiscount

// Strategies — each in its own file, never touch the others
type DiscountStrategy = (total: number, discount: Discount) => number

const discountStrategies: Record<Discount['kind'], DiscountStrategy> = {
  percentage: (total, d) => total * (1 - (d as PercentageDiscount).rate),
  fixed:      (total, d) => total - (d as FixedDiscount).amount,
  bogo:       (total)    => total / 2,
}

// Closed to modification — add new kinds by adding a new key + file
export function applyDiscount(total: number, discount: Discount): number {
  return discountStrategies[discount.kind](total, discount)
}

// Usage
const price = applyDiscount(100, { kind: 'percentage', rate: 0.1 }) // 90
```

---

## 3. Liskov Substitution Principle (LSP)

> Subtypes must be substitutable for their base types without altering correctness.

### ❌ Before — ReadonlyList violates the contract of MutableList

```typescript
class MutableList<T> {
  protected items: T[] = []

  add(item: T): void {
    this.items.push(item)
  }

  getAll(): readonly T[] {
    return this.items
  }
}

class ReadonlyList<T> extends MutableList<T> {
  // ❌ Throws at runtime — callers of MutableList don't expect this
  add(_item: T): void {
    throw new Error('This list is read-only')
  }
}

function appendAndLog<T>(list: MutableList<T>, item: T) {
  list.add(item)           // 💥 explodes when called with ReadonlyList
  console.log(list.getAll())
}
```

### ✅ After — correct hierarchy with segregated interfaces

```typescript
interface ReadableList<T> {
  getAll(): readonly T[]
}

interface MutableList<T> extends ReadableList<T> {
  add(item: T): void
  remove(item: T): void
}

class ArrayList<T> implements MutableList<T> {
  private items: T[] = []

  add(item: T): void { this.items.push(item) }
  remove(item: T): void { this.items = this.items.filter(i => i !== item) }
  getAll(): readonly T[] { return this.items }
}

class ImmutableList<T> implements ReadableList<T> {
  constructor(private readonly items: T[]) {}
  getAll(): readonly T[] { return this.items }
}

// Function only requires ReadableList — both types work correctly
function logAll<T>(list: ReadableList<T>): void {
  console.log(list.getAll())
}
```

---

## 4. Interface Segregation Principle (ISP)

> Clients should not be forced to depend on methods they don't use.

### ❌ Before — fat IWorker interface

```typescript
interface IWorker {
  work(): void
  eat(): void
  sleep(): void
  receiveBonus(amount: number): void
  getHealthInsurance(): string
}

// Robot only needs work() but is forced to implement everything
class Robot implements IWorker {
  work(): void { /* OK */ }
  eat(): void { throw new Error('Robots do not eat') }       // ❌
  sleep(): void { throw new Error('Robots do not sleep') }   // ❌
  receiveBonus(_amount: number): void { /* noop */ }         // ❌
  getHealthInsurance(): string { return '' }                  // ❌
}
```

### ✅ After — segregated interfaces

```typescript
interface Workable {
  work(): void
}

interface Feedable {
  eat(): void
  sleep(): void
}

interface Compensable {
  receiveBonus(amount: number): void
  getHealthInsurance(): string
}

// Human needs all three
class HumanEmployee implements Workable, Feedable, Compensable {
  work(): void { /* ... */ }
  eat(): void { /* ... */ }
  sleep(): void { /* ... */ }
  receiveBonus(amount: number): void { /* ... */ }
  getHealthInsurance(): string { return 'plan-A' }
}

// Robot only implements what it actually supports
class Robot implements Workable {
  work(): void { /* ... */ }
}

// Consumers depend only on what they need
function runShift(worker: Workable): void {
  worker.work()
}
```

---

## 5. Dependency Inversion Principle (DIP)

> High-level modules should not depend on low-level modules. Both should depend on abstractions.

### ❌ Before — OrderService is tightly coupled to concrete MySQL class

```typescript
import { MySQLOrderRepository } from './MySQLOrderRepository'  // concrete!

class OrderService {
  private repo = new MySQLOrderRepository()  // hard-coded dependency

  async getOrder(id: string) {
    return this.repo.findById(id)
  }
}
// Switching to PostgreSQL requires changing OrderService 👎
```

### ✅ After — depend on the abstraction (interface)

```typescript
// ports/IOrderRepository.ts — the abstraction
export interface IOrderRepository {
  findById(id: string): Promise<Order | null>
  save(order: Order): Promise<void>
}

// infrastructure/MySQLOrderRepository.ts
export class MySQLOrderRepository implements IOrderRepository {
  async findById(id: string): Promise<Order | null> { /* ... */ }
  async save(order: Order): Promise<void> { /* ... */ }
}

// infrastructure/PostgresOrderRepository.ts
export class PostgresOrderRepository implements IOrderRepository {
  async findById(id: string): Promise<Order | null> { /* ... */ }
  async save(order: Order): Promise<void> { /* ... */ }
}

// application/OrderService.ts — depends only on abstraction
export class OrderService {
  constructor(private readonly repo: IOrderRepository) {}  // injected ✅

  async getOrder(id: string): Promise<Order | null> {
    return this.repo.findById(id)
  }
}

// Composition root (main.ts / app bootstrap)
const repo = process.env.DB === 'mysql'
  ? new MySQLOrderRepository()
  : new PostgresOrderRepository()

const orderService = new OrderService(repo)  // swap DB without touching service
```

### TypeScript DI with Generic Factory

```typescript
// Useful for tests — swap any dependency without a DI container
type Deps = {
  orderRepo: IOrderRepository
  emailService: IEmailService
}

function makeOrderService(deps: Deps) {
  return new OrderService(deps.orderRepo, deps.emailService)
}

// Production
const prodService = makeOrderService({
  orderRepo: new PostgresOrderRepository(),
  emailService: new SendgridEmailService(),
})

// Test
const testService = makeOrderService({
  orderRepo: new InMemoryOrderRepository(),
  emailService: { sendConfirmation: vi.fn() },
})
```
