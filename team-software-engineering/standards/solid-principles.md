# SOLID Principles

Five design principles that produce maintainable, extensible code. They apply primarily at the class/module level and are most valuable in long-lived codebases. Each principle is shown with Python (FastAPI) and TypeScript (React) examples.

---

## S — Single Responsibility Principle

A module, class, or function should have one — and only one — reason to change. "Reason to change" means one actor or stakeholder group whose requirements drive it.

### ❌ BAD — One class doing everything

**`src/users/service.py`**
```python
class UserService:
    def register(self, email: str, password: str) -> User:
        # 1. Validate
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            raise ValueError("Invalid email")

        # 2. Hash password and save to DB
        hashed = bcrypt.hash(password)
        user = User(email=email, password_hash=hashed)
        self.db.add(user)
        self.db.commit()

        # 3. Send welcome email
        smtp = smtplib.SMTP("smtp.gmail.com", 587)
        smtp.sendmail("noreply@app.com", email, "Welcome!")

        # 4. Create Stripe customer
        stripe.Customer.create(email=email)

        # 5. Log to audit trail
        self.db.add(AuditLog(action="user_registered", email=email))
        self.db.commit()

        return user
```

**`src/users/UserService.ts`**
```typescript
class UserService {
  async register(email: string, password: string): Promise<User> {
    // validation, db, email, billing, audit — all in one class
    const hashed = await bcrypt.hash(password, 10)
    const user = await this.db.user.create({ data: { email, passwordHash: hashed } })
    await this.mailer.send({ to: email, subject: "Welcome!" })
    await stripe.customers.create({ email })
    await this.db.auditLog.create({ data: { action: "user_registered", email } })
    return user
  }
}
```

### ✅ GOOD — Each class has one job

**`src/users/service.py`**
```python
class UserService:
    def __init__(self, repo: IUserRepository) -> None:
        self._repo = repo

    async def register(self, email: str, password: str) -> User:
        hashed = await hash_password(password)
        user = User(email=Email(email), password_hash=hashed)
        return await self._repo.save(user)


class AuthService:
    def __init__(self, user_repo: IUserRepository, token_service: ITokenService) -> None:
        self._users = user_repo
        self._tokens = token_service

    async def login(self, email: str, password: str) -> TokenPair:
        user = await self._users.find_by_email(email)
        if not user or not await verify_password(password, user.password_hash):
            raise InvalidCredentialsError()
        return await self._tokens.issue(user.id)


class NotificationService:
    def __init__(self, mailer: IMailer) -> None:
        self._mailer = mailer

    async def send_welcome(self, email: str) -> None:
        await self._mailer.send(
            to=email,
            subject="Welcome!",
            template="welcome",
        )


class BillingService:
    def __init__(self, stripe_client: IStripeClient) -> None:
        self._stripe = stripe_client

    async def create_customer(self, email: str) -> str:
        customer = await self._stripe.customers.create(email=email)
        return customer.id
```

**`src/users/UserService.ts`**
```typescript
// src/users/UserService.ts
class UserService {
  constructor(private readonly repo: IUserRepository) {}

  async register(email: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10)
    return this.repo.save({ email, passwordHash })
  }
}

// src/auth/AuthService.ts
class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly tokens: ITokenService,
  ) {}

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.users.findByEmail(email)
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new InvalidCredentialsError()
    }
    return this.tokens.issue(user.id)
  }
}

// src/notifications/NotificationService.ts
class NotificationService {
  constructor(private readonly mailer: IMailer) {}

  async sendWelcome(email: string): Promise<void> {
    await this.mailer.send({ to: email, subject: "Welcome!", template: "welcome" })
  }
}
```

### When it applies / when you're over-engineering

Apply SRP when a class has grown to own multiple concerns, has multiple actors requesting changes, or is hard to test in isolation. Skip it for small scripts, one-off migrations, and utility functions that happen to do two steps — splitting a 10-line function into three files is never the goal.

---

## O — Open/Closed Principle

Software entities should be open for extension but closed for modification. Add new behavior by adding new code, not by editing existing code.

### ❌ BAD — Adding a payment method requires editing the service

**`src/payments/service.py`**
```python
class PaymentService:
    def charge(self, amount: Decimal, method: str, token: str) -> Receipt:
        if method == "stripe":
            result = stripe.PaymentIntent.create(amount=int(amount * 100), currency="usd")
            return Receipt(provider="stripe", id=result.id)
        elif method == "paypal":
            result = paypalrestsdk.Payment.create({"amount": {"total": str(amount)}})
            return Receipt(provider="paypal", id=result.id)
        elif method == "mercadopago":   # ← must open this file every time
            result = mercadopago.SDK().payment().create({"transaction_amount": amount})
            return Receipt(provider="mercadopago", id=result.id)
        else:
            raise ValueError(f"Unknown payment method: {method}")
```

**`src/payments/PaymentService.ts`**
```typescript
class PaymentService {
  charge(amount: number, method: string, token: string): Receipt {
    if (method === "stripe") {
      // stripe logic
    } else if (method === "paypal") {
      // paypal logic
    } else if (method === "mercadopago") {  // must edit this file every time
      // mercadopago logic
    }
    throw new Error(`Unknown method: ${method}`)
  }
}
```

### ✅ GOOD — Add a provider by adding a new class, not editing existing ones

**`src/payments/providers.py`**
```python
from abc import ABC, abstractmethod
from decimal import Decimal


class PaymentProvider(ABC):
    @abstractmethod
    async def charge(self, amount: Decimal, token: str) -> Receipt:
        ...


class StripeProvider(PaymentProvider):
    async def charge(self, amount: Decimal, token: str) -> Receipt:
        result = await stripe.PaymentIntent.create_async(
            amount=int(amount * 100),
            currency="usd",
            payment_method=token,
        )
        return Receipt(provider="stripe", id=result.id)


class PayPalProvider(PaymentProvider):
    async def charge(self, amount: Decimal, token: str) -> Receipt:
        result = await self._client.orders.create({"purchase_units": [{"amount": {"value": str(amount)}}]})
        return Receipt(provider="paypal", id=result.id)


# Adding MercadoPago: create new file, zero changes to existing code
class MercadoPagoProvider(PaymentProvider):
    async def charge(self, amount: Decimal, token: str) -> Receipt:
        result = await self._sdk.payment().create({"transaction_amount": float(amount)})
        return Receipt(provider="mercadopago", id=result["response"]["id"])
```

**`src/payments/service.py`**
```python
class PaymentService:
    def __init__(self, provider: PaymentProvider) -> None:
        self._provider = provider   # injected — no conditionals here

    async def charge(self, amount: Decimal, token: str) -> Receipt:
        return await self._provider.charge(amount, token)
```

**`src/payments/PaymentProvider.ts`**
```typescript
interface PaymentProvider {
  charge(amount: number, token: string): Promise<Receipt>
}

class StripeProvider implements PaymentProvider {
  async charge(amount: number, token: string): Promise<Receipt> {
    const result = await stripe.paymentIntents.create({ amount: amount * 100, currency: "usd" })
    return { provider: "stripe", id: result.id }
  }
}

class PayPalProvider implements PaymentProvider {
  async charge(amount: number, token: string): Promise<Receipt> {
    const result = await this.client.orders.create({ purchase_units: [{ amount: { value: String(amount) } }] })
    return { provider: "paypal", id: result.id }
  }
}

// No existing files touched when adding a new provider
class MercadoPagoProvider implements PaymentProvider {
  async charge(amount: number, token: string): Promise<Receipt> {
    const result = await this.sdk.payment.create({ transaction_amount: amount })
    return { provider: "mercadopago", id: result.body.id }
  }
}
```

### When it applies / when you're over-engineering

OCP pays off when you have clear extension points: strategy patterns, plugin systems, payment providers, exporters. Do not apply it speculatively — if you only have one payment method today, a plain function is correct. Introduce the abstraction when the second provider arrives.

---

## L — Liskov Substitution Principle

Objects of a subclass must be substitutable for objects of the parent class without breaking the program. Violations usually appear as overridden methods that throw exceptions or silently ignore behavior defined in the parent.

### ❌ BAD — Square breaks the Rectangle contract

**`src/shapes/models.py`**
```python
class Rectangle:
    def __init__(self, width: float, height: float) -> None:
        self.width = width
        self.height = height

    def set_width(self, w: float) -> None:
        self.width = w

    def set_height(self, h: float) -> None:
        self.height = h

    def area(self) -> float:
        return self.width * self.height


class Square(Rectangle):
    def set_width(self, w: float) -> None:
        self.width = w
        self.height = w  # ← silently changes height — breaks callers expecting Rectangle

    def set_height(self, h: float) -> None:
        self.width = h   # ← same problem
        self.height = h


def resize_and_print(shape: Rectangle) -> None:
    shape.set_width(5)
    shape.set_height(10)
    # Expected area: 50. For Square: 100. Contract broken.
    print(shape.area())
```

**`src/shapes/Shape.ts`**
```typescript
class Rectangle {
  constructor(public width: number, public height: number) {}
  setWidth(w: number) { this.width = w }
  setHeight(h: number) { this.height = h }
  area() { return this.width * this.height }
}

class Square extends Rectangle {
  setWidth(w: number) { this.width = w; this.height = w }   // breaks LSP
  setHeight(h: number) { this.width = h; this.height = h }  // breaks LSP
}
```

### ✅ GOOD — Flat hierarchy, favor composition, use interfaces for behavior

**`src/shapes/models.py`**
```python
from abc import ABC, abstractmethod
from dataclasses import dataclass


class Shape(ABC):
    @abstractmethod
    def area(self) -> float:
        ...


@dataclass(frozen=True)
class Rectangle(Shape):
    width: float
    height: float

    def area(self) -> float:
        return self.width * self.height


@dataclass(frozen=True)
class Square(Shape):
    side: float

    def area(self) -> float:
        return self.side ** 2


def print_area(shape: Shape) -> None:
    # Works correctly for any Shape subtype
    print(shape.area())
```

**`src/shapes/Shape.ts`**
```typescript
interface Shape {
  area(): number
}

class Rectangle implements Shape {
  constructor(readonly width: number, readonly height: number) {}
  area() { return this.width * this.height }
}

class Square implements Shape {
  constructor(readonly side: number) {}
  area() { return this.side ** 2 }
}

function printArea(shape: Shape): void {
  console.log(shape.area())  // safe for any Shape implementation
}
```

### When it applies / when you're over-engineering

LSP violations are bugs dressed as inheritance. Watch for overridden methods that throw `NotImplementedError`, ignore parameters, or add preconditions. The fix is usually a flatter hierarchy or interfaces. Do not apply if you have no inheritance — the principle simply does not apply.

---

## I — Interface Segregation Principle

No client should be forced to depend on methods it does not use. Split fat interfaces into smaller, role-specific ones.

### ❌ BAD — One giant repository interface

**`src/shared/repositories.py`**
```python
from abc import ABC, abstractmethod
from typing import Any


class IRepository(ABC):
    @abstractmethod
    async def find_by_id(self, id: str) -> Any: ...
    @abstractmethod
    async def find_all(self) -> list[Any]: ...
    @abstractmethod
    async def find_by_filter(self, filters: dict) -> list[Any]: ...
    @abstractmethod
    async def save(self, entity: Any) -> Any: ...
    @abstractmethod
    async def update(self, entity: Any) -> Any: ...
    @abstractmethod
    async def delete(self, id: str) -> None: ...
    @abstractmethod
    async def bulk_insert(self, entities: list[Any]) -> None: ...
    @abstractmethod
    async def bulk_update(self, entities: list[Any]) -> None: ...
    @abstractmethod
    async def count(self, filters: dict) -> int: ...
    @abstractmethod
    async def exists(self, id: str) -> bool: ...
    @abstractmethod
    async def paginate(self, page: int, size: int) -> Any: ...
    # ... 4 more abstract methods


# ReadOnlyAuditRepo is forced to implement save, update, delete, bulk_*
class ReadOnlyAuditRepository(IRepository):
    async def save(self, entity: Any) -> Any:
        raise NotImplementedError("Audit log is read-only")  # LSP violation too
    async def delete(self, id: str) -> None:
        raise NotImplementedError("Cannot delete audit entries")
```

**`src/shared/IRepository.ts`**
```typescript
interface IRepository<T> {
  findById(id: string): Promise<T>
  findAll(): Promise<T[]>
  findByFilter(filters: Record<string, unknown>): Promise<T[]>
  save(entity: T): Promise<T>
  update(entity: T): Promise<T>
  delete(id: string): Promise<void>
  bulkInsert(entities: T[]): Promise<void>
  bulkUpdate(entities: T[]): Promise<void>
  count(filters: Record<string, unknown>): Promise<number>
  exists(id: string): Promise<boolean>
  paginate(page: number, size: number): Promise<PaginatedResult<T>>
}

// ReadOnlyRepo is forced to stub write methods it will never need
```

### ✅ GOOD — Narrow interfaces composed per use case

**`src/shared/repositories.py`**
```python
from abc import ABC, abstractmethod
from typing import Generic, TypeVar

T = TypeVar("T")


class IReadRepository(ABC, Generic[T]):
    @abstractmethod
    async def find_by_id(self, id: str) -> T | None: ...

    @abstractmethod
    async def find_all(self) -> list[T]: ...


class IWriteRepository(ABC, Generic[T]):
    @abstractmethod
    async def save(self, entity: T) -> T: ...

    @abstractmethod
    async def delete(self, id: str) -> None: ...


class IPaginatedRepository(ABC, Generic[T]):
    @abstractmethod
    async def paginate(self, page: int, size: int) -> PaginatedResult[T]: ...


# Compose only what each implementation needs
class IInvoiceRepository(IReadRepository["Invoice"], IWriteRepository["Invoice"], IPaginatedRepository["Invoice"]):
    @abstractmethod
    async def find_by_user(self, user_id: str) -> list["Invoice"]: ...


class IAuditLogRepository(IReadRepository["AuditLog"]):
    # Only reads — no write methods to stub
    pass
```

**`src/shared/IRepository.ts`**
```typescript
interface IReadRepository<T> {
  findById(id: string): Promise<T | null>
  findAll(): Promise<T[]>
}

interface IWriteRepository<T> {
  save(entity: T): Promise<T>
  delete(id: string): Promise<void>
}

interface IPaginatedRepository<T> {
  paginate(page: number, size: number): Promise<PaginatedResult<T>>
}

// Each concrete interface picks exactly what it needs
interface IInvoiceRepository
  extends IReadRepository<Invoice>,
    IWriteRepository<Invoice>,
    IPaginatedRepository<Invoice> {
  findByUser(userId: string): Promise<Invoice[]>
}

interface IAuditLogRepository extends IReadRepository<AuditLog> {
  // read-only — no write methods to implement
}
```

### When it applies / when you're over-engineering

ISP pays off when multiple concrete implementations exist with different capabilities. If you have one implementation today, a single interface is fine. Do not split interfaces speculatively — the split should be driven by an existing consumer that genuinely does not need certain methods.

---

## D — Dependency Inversion Principle

High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details — details depend on abstractions.

### ❌ BAD — High-level service imports low-level implementation directly

**`src/users/service.py`**
```python
from src.notifications.smtp_mailer import SmtpMailer   # concrete class imported

class UserService:
    def __init__(self) -> None:
        self._mailer = SmtpMailer(host="smtp.gmail.com", port=587)  # hardwired

    async def register(self, email: str, password: str) -> User:
        user = await self._create_user(email, password)
        # Cannot swap to SendGrid, SES, or test double without editing this class
        await self._mailer.send(to=email, subject="Welcome!")
        return user
```

**`src/users/UserService.ts`**
```typescript
import { SmtpMailer } from "../notifications/SmtpMailer"  // concrete dependency

class UserService {
  private mailer = new SmtpMailer("smtp.gmail.com", 587)  // hardwired

  async register(email: string, password: string): Promise<User> {
    const user = await this.createUser(email, password)
    await this.mailer.send({ to: email, subject: "Welcome!" })  // cannot swap
    return user
  }
}
```

### ✅ GOOD — Depend on an abstraction, inject the implementation

**`src/notifications/ports.py`**
```python
from abc import ABC, abstractmethod


class IMailer(ABC):
    @abstractmethod
    async def send(self, *, to: str, subject: str, body: str) -> None:
        ...
```

**`src/notifications/smtp_mailer.py`**
```python
class SmtpMailer(IMailer):
    async def send(self, *, to: str, subject: str, body: str) -> None:
        # SMTP implementation detail
        ...


class SendGridMailer(IMailer):
    async def send(self, *, to: str, subject: str, body: str) -> None:
        # SendGrid implementation detail — swappable without touching UserService
        ...


class InMemoryMailer(IMailer):
    """Used in tests — captures sent messages."""
    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send(self, *, to: str, subject: str, body: str) -> None:
        self.sent.append({"to": to, "subject": subject, "body": body})
```

**`src/users/service.py`**
```python
class UserService:
    def __init__(self, user_repo: IUserRepository, mailer: IMailer) -> None:
        self._repo = user_repo
        self._mailer = mailer   # depends on abstraction, not implementation

    async def register(self, email: str, password: str) -> User:
        user = await self._repo.save(User(email=Email(email), password_hash=await hash_password(password)))
        await self._mailer.send(to=email, subject="Welcome!", body="Thanks for joining.")
        return user
```

**`src/users/router.py`** — wiring at the composition root
```python
from fastapi import Depends
from src.notifications.sendgrid_mailer import SendGridMailer
from src.users.service import UserService


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(
        user_repo=PostgreSQLUserRepository(db),
        mailer=SendGridMailer(api_key=settings.SENDGRID_API_KEY),
    )
```

**`src/notifications/IMailer.ts`**
```typescript
interface IMailer {
  send(options: { to: string; subject: string; body: string }): Promise<void>
}

class SmtpMailer implements IMailer {
  async send(options: { to: string; subject: string; body: string }): Promise<void> {
    // SMTP detail
  }
}

class InMemoryMailer implements IMailer {
  public sent: Array<{ to: string; subject: string; body: string }> = []

  async send(options: { to: string; subject: string; body: string }): Promise<void> {
    this.sent.push(options)
  }
}
```

**`src/users/UserService.ts`**
```typescript
class UserService {
  constructor(
    private readonly repo: IUserRepository,
    private readonly mailer: IMailer,   // depends on abstraction
  ) {}

  async register(email: string, password: string): Promise<User> {
    const user = await this.repo.save({ email, passwordHash: await bcrypt.hash(password, 10) })
    await this.mailer.send({ to: email, subject: "Welcome!", body: "Thanks for joining." })
    return user
  }
}
```

**Test — swap with no production code changes**
```typescript
// src/users/UserService.test.ts
it("sends welcome email on register", async () => {
  const mailer = new InMemoryMailer()
  const repo = new InMemoryUserRepository()
  const service = new UserService(repo, mailer)

  await service.register("alice@example.com", "secret")

  expect(mailer.sent).toHaveLength(1)
  expect(mailer.sent[0].to).toBe("alice@example.com")
})
```

### When it applies / when you're over-engineering

DIP is most valuable at integration boundaries: email providers, payment gateways, databases, external APIs. Inside a bounded context with stable internals, creating an interface for every class is noise. A `UserService` that only ever talks to one database does not need `IUserService` — that abstraction has no second implementation and adds zero value.

---

## When NOT to over-engineer SOLID

SOLID is a tool, not a religion. Skip it when:

- **Small scripts and one-off automations** — a 50-line migration script does not need interfaces and abstract base classes.
- **Prototypes and MVPs** — validate the idea first. Refactor when the code survives contact with real users.
- **The code will not grow** — a read-only reporting query is not a system to extend.
- **No second implementation exists** — an interface with exactly one implementation is documentation overhead, not design.
- **The team is small and the codebase is young** — premature abstraction makes onboarding harder and PRs longer.

The test: ask "what is the second implementation?" If there is no honest answer, the abstraction is premature.


---

## Ejemplos de código por lenguaje

| Stack | Archivo |
|-------|---------|
| Python / FastAPI | [xamples/python/02-solid-principles.md](./examples/python/02-solid-principles.md) |
| C# / ASP.NET Core | [xamples/csharp/04-design-patterns.md](./examples/csharp/04-design-patterns.md) |
| TypeScript / Node.js | [xamples/typescript/02-solid-principles.md](./examples/typescript/02-solid-principles.md) |
