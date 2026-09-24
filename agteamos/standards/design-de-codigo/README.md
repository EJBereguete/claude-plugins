---
topic: design-de-codigo
description: Clean Architecture, SOLID, DRY/KISS/YAGNI y Domain-Driven Design -- como estructurar y no sobre-disenar el codigo
keywords: [layering, dependency-inversion, use-case, repository-pattern, service-layer, solid, single-responsibility, dependency-injection, interface, duplication, abstraction, over-engineering, simplicity, premature-optimization, bounded-context, entity, aggregate, value-object, domain-event, ubiquitous-language]
globs: ["**/services/**", "**/repositories/**", "**/use_cases/**", "**/domain/**", "**/aggregates/**", "**/entities/**"]
first_consumers: [architect, quality]
---

# Design de Código

## Clean Architecture

Reference: Robert C. Martin — "Clean Architecture" (2017).

The core rule: **source code dependencies must point inward only**.
Outer layers know about inner layers. Inner layers know nothing about outer layers.

```
Entities (innermost)
  ↑
Use Cases
  ↑
Interface Adapters (controllers, presenters, gateways)
  ↑
Frameworks & Drivers (FastAPI, React, PostgreSQL, Redis)
```

---

### Folder Structure — Python / FastAPI

```
src/
├── domain/                    # Layer 1: Entities — pure Python, zero dependencies
│   ├── entities/
│   │   ├── user.py
│   │   └── order.py
│   ├── value_objects/
│   │   ├── email.py
│   │   └── money.py
│   └── exceptions.py
│
├── application/               # Layer 2: Use Cases — orchestrates domain objects
│   ├── use_cases/
│   │   ├── create_user.py
│   │   └── place_order.py
│   ├── interfaces/            # Abstract interfaces (ports) — defined here, implemented in infra
│   │   ├── user_repository.py
│   │   └── email_sender.py
│   └── dtos/
│       ├── user_dto.py
│       └── order_dto.py
│
├── infrastructure/            # Layer 3: Interface Adapters + Frameworks
│   ├── database/
│   │   ├── models/            # SQLAlchemy ORM models
│   │   │   └── user_model.py
│   │   ├── repositories/      # Concrete implementations of application/interfaces
│   │   │   └── postgres_user_repository.py
│   │   └── migrations/
│   ├── http/
│   │   ├── routers/           # FastAPI routes — thin, no business logic
│   │   │   └── users.py
│   │   └── schemas/           # Pydantic request/response schemas
│   │       └── user_schemas.py
│   └── services/              # External services (SMTP, S3, Stripe, etc.)
│       └── smtp_email_sender.py
│
└── main.py                    # FastAPI app factory, DI wiring
```

---

### Folder Structure — TypeScript / React

```
src/
├── domain/                    # Layer 1: Entities — plain TypeScript
│   ├── entities/
│   │   ├── User.ts
│   │   └── Order.ts
│   ├── value-objects/
│   │   └── Money.ts
│   └── errors/
│       └── DomainError.ts
│
├── application/               # Layer 2: Use Cases
│   ├── use-cases/
│   │   ├── CreateUser.ts
│   │   └── PlaceOrder.ts
│   ├── ports/                 # Interfaces (TypeScript interfaces, not classes)
│   │   ├── IUserRepository.ts
│   │   └── IEmailService.ts
│   └── dtos/
│       └── UserDTO.ts
│
├── infrastructure/            # Layer 3: Adapters + Frameworks
│   ├── api/                   # HTTP clients, Axios wrappers
│   │   └── userApiClient.ts
│   ├── repositories/          # Concrete implementations
│   │   └── ApiUserRepository.ts
│   └── services/
│       └── AnalyticsService.ts
│
├── presentation/              # Layer 4: UI (React)
│   ├── pages/
│   │   └── UsersPage.tsx
│   ├── components/
│   │   └── UserCard.tsx
│   └── hooks/                 # Connect presentation to application layer
│       └── useCreateUser.ts
│
└── main.tsx
```

---

### Dependency Rule — Correct vs Incorrect

#### Correct: Use Case depends on abstract interface (inward)

```python
# application/interfaces/user_repository.py
from abc import ABC, abstractmethod
from domain.entities.user import User

class UserRepository(ABC):
    @abstractmethod
    async def find_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def save(self, user: User) -> None: ...


# application/use_cases/create_user.py
from application.interfaces.user_repository import UserRepository  # depends on abstraction
from domain.entities.user import User                               # depends on entity (inner)

class CreateUserUseCase:
    def __init__(self, user_repo: UserRepository):  # injected, not imported directly
        self._repo = user_repo

    async def execute(self, email: str, name: str) -> User:
        if await self._repo.find_by_email(email):
            raise DuplicateEmailError(email)
        user = User.create(email=email, name=name)
        await self._repo.save(user)
        return user
```

#### INCORRECT: Use Case imports from infrastructure (outward dependency — violates the rule)

```python
# application/use_cases/create_user.py  <-- BAD
from infrastructure.database.repositories.postgres_user_repository import PostgresUserRepository
# ^^ This makes the use case depend on a concrete implementation in an outer layer.
# Now you cannot test the use case without a real database.
```

---

### Correct vs Incorrect Import Patterns

```python
# CORRECT imports in each layer:

# domain/entities/user.py — imports nothing outside domain
from domain.value_objects.email import Email
from domain.exceptions import DomainValidationError

# application/use_cases/create_user.py — imports domain + application only
from domain.entities.user import User
from application.interfaces.user_repository import UserRepository
from application.dtos.user_dto import CreateUserDTO

# infrastructure/repositories/postgres_user_repository.py — imports everything
from application.interfaces.user_repository import UserRepository   # implements the port
from domain.entities.user import User
from infrastructure.database.models.user_model import UserModel     # SQLAlchemy model
from sqlalchemy.ext.asyncio import AsyncSession
```

```python
# INCORRECT imports (outer layer leaking inward):

# domain/entities/user.py  <-- BAD
from sqlalchemy import Column, String  # domain must not know about SQLAlchemy

# application/use_cases/create_user.py  <-- BAD
from fastapi import HTTPException  # use cases must not know about HTTP
from infrastructure.database.session import get_db  # use cases must not know about DB driver
```

---

### Real Use Case Example

#### Python

```python
# domain/entities/user.py
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4
from domain.value_objects.email import Email

@dataclass
class User:
    id: UUID
    email: Email
    name: str
    is_active: bool
    created_at: datetime

    @classmethod
    def create(cls, email: str, name: str) -> "User":
        return cls(
            id=uuid4(),
            email=Email(email),
            name=name,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )


# application/use_cases/create_user.py
from dataclasses import dataclass
from application.interfaces.user_repository import UserRepository
from application.interfaces.email_sender import EmailSender
from application.dtos.user_dto import CreateUserDTO, UserResponseDTO
from domain.entities.user import User
from domain.exceptions import DuplicateEmailError

@dataclass
class CreateUserUseCase:
    user_repo: UserRepository
    email_sender: EmailSender

    async def execute(self, dto: CreateUserDTO) -> UserResponseDTO:
        existing = await self.user_repo.find_by_email(dto.email)
        if existing:
            raise DuplicateEmailError(f"Email {dto.email} already registered")

        user = User.create(email=dto.email, name=dto.name)
        await self.user_repo.save(user)
        await self.email_sender.send_welcome(user.email.value, user.name)

        return UserResponseDTO(
            id=str(user.id),
            email=user.email.value,
            name=user.name,
            created_at=user.created_at.isoformat(),
        )


# infrastructure/http/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from infrastructure.http.schemas.user_schemas import CreateUserRequest, UserResponse
from application.use_cases.create_user import CreateUserUseCase
from domain.exceptions import DuplicateEmailError
from infrastructure.dependencies import get_create_user_use_case

router = APIRouter(prefix="/v1/users", tags=["users"])

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: CreateUserRequest,
    use_case: CreateUserUseCase = Depends(get_create_user_use_case),
):
    try:
        result = await use_case.execute(body.to_dto())
        return result
    except DuplicateEmailError as e:
        raise HTTPException(status_code=409, detail=str(e))
```

#### TypeScript

```typescript
// domain/entities/User.ts
import { Email } from '../value-objects/Email'
import { randomUUID } from 'crypto'

export class User {
  readonly id: string
  readonly email: Email
  readonly name: string
  readonly createdAt: Date

  private constructor(id: string, email: Email, name: string, createdAt: Date) {
    this.id = id
    this.email = email
    this.name = name
    this.createdAt = createdAt
  }

  static create(email: string, name: string): User {
    return new User(randomUUID(), new Email(email), name, new Date())
  }
}


// application/use-cases/CreateUser.ts
import { IUserRepository } from '../ports/IUserRepository'
import { IEmailService } from '../ports/IEmailService'
import { User } from '../../domain/entities/User'
import { DuplicateEmailError } from '../../domain/errors/DomainError'

interface CreateUserInput {
  email: string
  name: string
}

interface CreateUserOutput {
  id: string
  email: string
  name: string
  createdAt: string
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly emailService: IEmailService,
  ) {}

  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    const existing = await this.userRepo.findByEmail(input.email)
    if (existing) {
      throw new DuplicateEmailError(`Email ${input.email} already registered`)
    }

    const user = User.create(input.email, input.name)
    await this.userRepo.save(user)
    await this.emailService.sendWelcome(user.email.value, user.name)

    return {
      id: user.id,
      email: user.email.value,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    }
  }
}
```

---

### Testing with Clean Architecture

Because the Use Case depends on interfaces, you can test it with in-memory fakes — no database needed:

```python
# tests/unit/use_cases/test_create_user.py
import pytest
from application.use_cases.create_user import CreateUserUseCase
from application.dtos.user_dto import CreateUserDTO
from domain.exceptions import DuplicateEmailError


class InMemoryUserRepository:
    def __init__(self):
        self._store: dict = {}

    async def find_by_email(self, email):
        return self._store.get(email)

    async def save(self, user):
        self._store[user.email.value] = user


class FakeEmailSender:
    def __init__(self):
        self.sent = []

    async def send_welcome(self, email, name):
        self.sent.append({"email": email, "name": name})


@pytest.mark.asyncio
async def test_create_user_success():
    repo = InMemoryUserRepository()
    sender = FakeEmailSender()
    use_case = CreateUserUseCase(user_repo=repo, email_sender=sender)

    result = await use_case.execute(CreateUserDTO(email="alice@example.com", name="Alice"))

    assert result.email == "alice@example.com"
    assert len(sender.sent) == 1


@pytest.mark.asyncio
async def test_create_user_duplicate_raises():
    repo = InMemoryUserRepository()
    sender = FakeEmailSender()
    use_case = CreateUserUseCase(user_repo=repo, email_sender=sender)

    await use_case.execute(CreateUserDTO(email="alice@example.com", name="Alice"))

    with pytest.raises(DuplicateEmailError):
        await use_case.execute(CreateUserDTO(email="alice@example.com", name="Alice 2"))
```


---

### Hexagonal Architecture (Ports & Adapters) — variante equivalente

Conceptualmente la misma idea que Clean Architecture, con otro vocabulario: en vez de
Entities/Use Cases/Interface Adapters/Frameworks, se habla de Domain/Ports/Adapters.
El énfasis está en la simetría — múltiples entradas Y salidas intercambiables.

```
order-service/
├── domain/              # Núcleo de negocio — sin dependencias externas
│   └── services/order_service.py
├── ports/               # Interfaces: contratos entre dominio y exterior
│   ├── input/           # Puertos de entrada (casos de uso): ICreateOrder, IGetOrder
│   └── output/          # Puertos de salida: IOrderRepository, IPaymentGateway
├── adapters/            # Implementaciones concretas de puertos
│   ├── input/{rest,cli}/
│   └── output/{postgres,stripe}/
└── config/dependency_injection.py
```

**Cuándo usar Hexagonal en vez de Clean Architecture:**
- Múltiples tipos de entrada (REST, gRPC, CLI, message queue) — Hexagonal.
- Alta probabilidad de cambiar la base de datos o proveedor externo — Hexagonal.
- Aplicación típica con una sola entrada HTTP, equipo ya familiarizado con las 4
  capas concéntricas, o DDD pesado — Clean Architecture.

En la práctica ambas se implementan casi igual — la diferencia es de vocabulario más
que de estructura. No mezclar los dos vocabularios dentro del mismo proyecto.

---

### Ejemplos de código por lenguaje

Para implementaciones concretas de estas reglas:

| Stack | Archivo |
|-------|---------|
| Python / FastAPI | [examples/clean-architecture-python.md](./examples/clean-architecture-python.md) |
| C# / ASP.NET Core | [examples/csharp.md](./examples/csharp.md) |
| TypeScript / Node.js | [examples/clean-architecture-typescript.md](./examples/clean-architecture-typescript.md) |

---

## SOLID Principles

Five design principles that produce maintainable, extensible code. They apply primarily at the class/module level and are most valuable in long-lived codebases. Each principle is shown with Python (FastAPI) and TypeScript (React) examples.

---

### S — Single Responsibility Principle

A module, class, or function should have one — and only one — reason to change. "Reason to change" means one actor or stakeholder group whose requirements drive it.

#### ❌ BAD — One class doing everything

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

#### ✅ GOOD — Each class has one job

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

#### When it applies / when you're over-engineering

Apply SRP when a class has grown to own multiple concerns, has multiple actors requesting changes, or is hard to test in isolation. Skip it for small scripts, one-off migrations, and utility functions that happen to do two steps — splitting a 10-line function into three files is never the goal.

---

### O — Open/Closed Principle

Software entities should be open for extension but closed for modification. Add new behavior by adding new code, not by editing existing code.

#### ❌ BAD — Adding a payment method requires editing the service

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

#### ✅ GOOD — Add a provider by adding a new class, not editing existing ones

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

#### When it applies / when you're over-engineering

OCP pays off when you have clear extension points: strategy patterns, plugin systems, payment providers, exporters. Do not apply it speculatively — if you only have one payment method today, a plain function is correct. Introduce the abstraction when the second provider arrives.

---

### L — Liskov Substitution Principle

Objects of a subclass must be substitutable for objects of the parent class without breaking the program. Violations usually appear as overridden methods that throw exceptions or silently ignore behavior defined in the parent.

#### ❌ BAD — Square breaks the Rectangle contract

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

#### ✅ GOOD — Flat hierarchy, favor composition, use interfaces for behavior

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

#### When it applies / when you're over-engineering

LSP violations are bugs dressed as inheritance. Watch for overridden methods that throw `NotImplementedError`, ignore parameters, or add preconditions. The fix is usually a flatter hierarchy or interfaces. Do not apply if you have no inheritance — the principle simply does not apply.

---

### I — Interface Segregation Principle

No client should be forced to depend on methods it does not use. Split fat interfaces into smaller, role-specific ones.

#### ❌ BAD — One giant repository interface

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

#### ✅ GOOD — Narrow interfaces composed per use case

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

#### When it applies / when you're over-engineering

ISP pays off when multiple concrete implementations exist with different capabilities. If you have one implementation today, a single interface is fine. Do not split interfaces speculatively — the split should be driven by an existing consumer that genuinely does not need certain methods.

---

### D — Dependency Inversion Principle

High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details — details depend on abstractions.

#### ❌ BAD — High-level service imports low-level implementation directly

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

#### ✅ GOOD — Depend on an abstraction, inject the implementation

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

#### When it applies / when you're over-engineering

DIP is most valuable at integration boundaries: email providers, payment gateways, databases, external APIs. Inside a bounded context with stable internals, creating an interface for every class is noise. A `UserService` that only ever talks to one database does not need `IUserService` — that abstraction has no second implementation and adds zero value.

---

### When NOT to over-engineer SOLID

SOLID is a tool, not a religion. Skip it when:

- **Small scripts and one-off automations** — a 50-line migration script does not need interfaces and abstract base classes.
- **Prototypes and MVPs** — validate the idea first. Refactor when the code survives contact with real users.
- **The code will not grow** — a read-only reporting query is not a system to extend.
- **No second implementation exists** — an interface with exactly one implementation is documentation overhead, not design.
- **The team is small and the codebase is young** — premature abstraction makes onboarding harder and PRs longer.

The test: ask "what is the second implementation?" If there is no honest answer, the abstraction is premature.


---

### Ejemplos de código por lenguaje

| Stack | Archivo |
|-------|---------|
| Python / FastAPI | [examples/solid-principles-python.md](./examples/solid-principles-python.md) |
| C# / ASP.NET Core | [examples/csharp-design-patterns.md](./examples/csharp-design-patterns.md) |
| TypeScript / Node.js | [examples/solid-principles-typescript.md](./examples/solid-principles-typescript.md) |

---

## DRY, KISS y YAGNI

Three complementary heuristics for keeping code simple, honest, and maintainable. They are not rules to follow mechanically — they are tensions to balance. This document covers each principle and then addresses the real difficulty: knowing when they conflict.

---

### DRY — Don't Repeat Yourself

Every piece of knowledge must have a single, unambiguous, authoritative representation within a system. DRY is about knowledge duplication, not code duplication. Two similar-looking functions that express different business rules are not a DRY violation.

#### ❌ BAD — Same validation logic in three route handlers

**`src/invoices/router.py`**
```python
@router.post("/invoices")
async def create_invoice(data: dict, db: AsyncSession = Depends(get_db)):
    # Validation copy #1
    if not data.get("client_email"):
        raise HTTPException(status_code=400, detail="client_email is required")
    if "@" not in data["client_email"]:
        raise HTTPException(status_code=400, detail="client_email must be valid")
    if not data.get("amount") or data["amount"] <= 0:
        raise HTTPException(status_code=400, detail="amount must be positive")
    # ... business logic


@router.put("/invoices/{id}")
async def update_invoice(id: str, data: dict, db: AsyncSession = Depends(get_db)):
    # Validation copy #2 — exact same rules, different handler
    if not data.get("client_email"):
        raise HTTPException(status_code=400, detail="client_email is required")
    if "@" not in data["client_email"]:
        raise HTTPException(status_code=400, detail="client_email must be valid")
    if not data.get("amount") or data["amount"] <= 0:
        raise HTTPException(status_code=400, detail="amount must be positive")
    # ... business logic


@router.post("/invoices/{id}/duplicate")
async def duplicate_invoice(id: str, data: dict, db: AsyncSession = Depends(get_db)):
    # Validation copy #3
    if not data.get("client_email"):
        raise HTTPException(status_code=400, detail="client_email is required")
    if "@" not in data["client_email"]:
        raise HTTPException(status_code=400, detail="client_email must be valid")
    if not data.get("amount") or data["amount"] <= 0:
        raise HTTPException(status_code=400, detail="amount must be positive")
```

#### ✅ GOOD — Single source of truth via Pydantic schema

**`src/invoices/schemas.py`**
```python
from decimal import Decimal
from pydantic import BaseModel, EmailStr, field_validator


class InvoiceInput(BaseModel):
    client_email: EmailStr          # validation lives here, once
    amount: Decimal
    description: str | None = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be positive")
        return v
```

**`src/invoices/router.py`**
```python
@router.post("/invoices", status_code=201)
async def create_invoice(data: InvoiceInput, db: AsyncSession = Depends(get_db)):
    # No validation code here — schema handles it
    return await invoice_service.create(data, db)


@router.put("/invoices/{id}")
async def update_invoice(id: str, data: InvoiceInput, db: AsyncSession = Depends(get_db)):
    return await invoice_service.update(id, data, db)


@router.post("/invoices/{id}/duplicate", status_code=201)
async def duplicate_invoice(id: str, data: InvoiceInput, db: AsyncSession = Depends(get_db)):
    return await invoice_service.duplicate(id, data, db)
```

**`src/invoices/InvoiceForm.tsx`** — same principle in TypeScript with a shared validator
```typescript
// src/invoices/validators.ts
import { z } from "zod"

export const invoiceSchema = z.object({
  clientEmail: z.string().email("Must be a valid email"),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional(),
})

export type InvoiceInput = z.infer<typeof invoiceSchema>
```

```typescript
// src/invoices/CreateInvoiceForm.tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { invoiceSchema, type InvoiceInput } from "./validators"

export function CreateInvoiceForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),  // validation in one place
  })
  // ...
}

// src/invoices/EditInvoiceForm.tsx
export function EditInvoiceForm() {
  const { register, handleSubmit } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),  // same schema, no duplication
  })
  // ...
}
```

---

#### The AHA Principle — Avoid Hasty Abstractions

Wait until you see the pattern three times before abstracting. Premature DRY — extracting after the first or second occurrence — creates abstractions coupled to a specific context. When the third case arrives and is slightly different, the abstraction either becomes contorted to accommodate it or you write around it.

##### ❌ BAD — Abstracted too early, now the third case forces ugly parameters

```python
# After seeing two cases that look similar, someone extracts this:
def process_document(
    doc_type: str,
    data: dict,
    send_email: bool = False,
    email_template: str | None = None,
    update_status: bool = True,
    status_value: str | None = None,
    audit: bool = True,
    audit_level: str = "info",
    notify_admin: bool = False,   # added for case #3
    skip_validation: bool = False, # added for case #4
) -> dict:
    # 80 lines of if/else controlling behavior via flags
    ...
```

The abstraction has become harder to understand than three separate functions.

##### ✅ GOOD — Wait for the pattern, then abstract the right thing

```python
# First occurrence: just write it inline
async def create_invoice(data: InvoiceInput) -> Invoice:
    invoice = Invoice.create(data)
    await self._repo.save(invoice)
    await self._mailer.send_invoice_created(invoice)
    return invoice

# Second occurrence (quotes): also inline, looks similar but serves different domain
async def create_quote(data: QuoteInput) -> Quote:
    quote = Quote.create(data)
    await self._repo.save(quote)
    await self._mailer.send_quote_created(quote)
    return quote

# Third occurrence (purchase orders): NOW the pattern is clear
# Abstract the shared skeleton, keep the differences explicit
async def _create_document(document: Document, notification: Callable) -> Document:
    await self._repo.save(document)
    await notification(document)
    return document

async def create_invoice(data: InvoiceInput) -> Invoice:
    return await self._create_document(Invoice.create(data), self._mailer.send_invoice_created)

async def create_quote(data: QuoteInput) -> Quote:
    return await self._create_document(Quote.create(data), self._mailer.send_quote_created)

async def create_purchase_order(data: POInput) -> PurchaseOrder:
    return await self._create_document(PurchaseOrder.create(data), self._mailer.send_po_created)
```

---

### KISS — Keep It Simple, Stupid

Prefer the simplest solution that correctly solves the problem. Complexity must earn its place — it is not free. The enemy of KISS is cleverness: custom abstractions, hand-rolled state machines, and over-engineered utilities where a library call or a direct query would do.

#### ❌ BAD — Complex regex + state machine for email validation

**`src/shared/validators.py`**
```python
import re

EMAIL_PATTERN = re.compile(
    r"(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
    r"|\"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]"
    r"|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*\")"
    r"@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
    r"|\[(?:(?:25[0-5]|2(?:[0-4][0-9]|[1-9][0-9]?)|[0-1]?[0-9][0-9]?)\.){3}"
    r"(?:25[0-5]|2(?:[0-4][0-9]|[1-9][0-9]?)|[0-1]?[0-9][0-9]?)"
    r"|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]"
    r"|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])"
)

def validate_email(email: str) -> bool:
    # 200+ character regex that still doesn't handle all edge cases
    return bool(EMAIL_PATTERN.match(email.lower()))
```

#### ✅ GOOD — Let the library do it

**`src/shared/schemas.py`**
```python
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr   # battle-tested validation, one line
    password: str
```

---

#### ❌ BAD — Custom generic repository with 200 lines when you need 20

**`src/shared/repository.py`**
```python
class GenericRepository(Generic[T, ID]):
    """200-line generic base with query builders, eager loading toggles,
    cache invalidation hooks, soft-delete support, and audit trail injection
    — for a project with 3 tables."""

    def __init__(self, model: Type[T], session: AsyncSession, cache: ICache | None = None,
                 audit: IAuditLogger | None = None, soft_delete: bool = True) -> None:
        ...

    async def find_by_id(self, id: ID, *, eager: list[str] | None = None,
                         include_deleted: bool = False) -> T | None:
        ...
    # 15 more methods
```

#### ✅ GOOD — Direct SQLAlchemy queries scoped to the actual need

**`src/invoices/repository.py`**
```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.invoices.models import InvoiceModel


class PostgreSQLInvoiceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, invoice_id: str) -> InvoiceModel | None:
        result = await self._session.execute(
            select(InvoiceModel).where(InvoiceModel.id == invoice_id)
        )
        return result.scalar_one_or_none()

    async def find_by_user(self, user_id: str) -> list[InvoiceModel]:
        result = await self._session.execute(
            select(InvoiceModel)
            .where(InvoiceModel.user_id == user_id, InvoiceModel.deleted_at.is_(None))
            .order_by(InvoiceModel.created_at.desc())
        )
        return list(result.scalars().all())

    async def save(self, invoice: InvoiceModel) -> InvoiceModel:
        self._session.add(invoice)
        await self._session.flush()
        return invoice
```

**`src/invoices/invoiceApi.ts`** — same principle in TypeScript
```typescript
// ❌ BAD: Generic API client factory with type magic
class ApiRepository<T extends { id: string }> {
  constructor(private readonly endpoint: string, private readonly transform: (raw: unknown) => T) {}
  async findById(id: string): Promise<T> { /* ... */ }
  async findAll(filters?: Partial<T>): Promise<T[]> { /* ... */ }
  // ...
}

// ✅ GOOD: Direct, explicit API calls for what you actually need
// src/invoices/invoiceApi.ts
export async function fetchInvoice(id: string): Promise<Invoice> {
  const response = await fetch(`/api/v1/invoices/${id}`)
  if (!response.ok) throw new ApiError(response)
  return response.json() as Promise<Invoice>
}

export async function fetchUserInvoices(userId: string): Promise<Invoice[]> {
  const response = await fetch(`/api/v1/users/${userId}/invoices`)
  if (!response.ok) throw new ApiError(response)
  return response.json() as Promise<Invoice[]>
}
```

---

### YAGNI — You Aren't Gonna Need It

Do not implement features or abstractions until they are actually needed. Every line of unused infrastructure is code you have to read, maintain, test, and explain. The future requirements you imagine rarely arrive in the form you imagined.

#### ❌ BAD — Building for imaginary scale on day one

**`src/invoices/service.py`**
```python
class InvoiceService:
    def __init__(
        self,
        repo: IInvoiceRepository,
        plugin_registry: IPluginRegistry,        # no plugins exist
        tenant_resolver: ITenantResolver,         # single-tenant MVP
        locale_service: ILocaleService,           # one language, one country
        event_bus: IEventBus,                     # no event consumers
        feature_flags: IFeatureFlagClient,        # no flags configured
        export_strategy_factory: IExportFactory,  # only PDF export needed
    ) -> None:
        ...

    async def create_invoice(self, data: InvoiceInput, tenant_id: str | None = None) -> Invoice:
        tenant = await self._tenant_resolver.resolve(tenant_id or "default")
        locale = await self._locale_service.get(tenant.locale)
        plugins = await self._plugin_registry.get_pre_create_hooks("invoice")

        for plugin in plugins:
            data = await plugin.transform(data)  # no plugins will ever run

        if await self._feature_flags.is_enabled("new_invoice_flow", tenant_id):
            invoice = await self._new_flow(data, tenant, locale)
        else:
            invoice = await self._legacy_flow(data, tenant, locale)

        await self._event_bus.publish(InvoiceCreatedEvent(invoice))  # no consumers
        return invoice
```

#### ✅ GOOD — Build what one client needs today

**`src/invoices/service.py`**
```python
class InvoiceService:
    def __init__(self, repo: IInvoiceRepository, mailer: IMailer) -> None:
        self._repo = repo
        self._mailer = mailer

    async def create_invoice(self, data: InvoiceInput, user_id: str) -> Invoice:
        invoice = Invoice.create(
            user_id=user_id,
            client_email=data.client_email,
            amount=data.amount,
            description=data.description,
        )
        saved = await self._repo.save(invoice)
        await self._mailer.send_invoice_created(saved)
        return saved
```

When a second tenant appears, add multi-tenancy. When a second language is requested, add i18n. When a second export format is needed, add the strategy. Not before.

**`src/invoices/CreateInvoicePage.tsx`** — same discipline in the frontend
```typescript
// ❌ BAD: Building i18n, theming, and feature flags for an MVP
export function CreateInvoicePage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { isEnabled } = useFeatureFlags()

  if (!isEnabled("invoice_creation")) return <ComingSoon />

  return (
    <ThemeProvider theme={theme}>
      <InvoiceForm
        title={t("invoice.create.title")}
        submitLabel={t("invoice.create.submit")}
      />
    </ThemeProvider>
  )
}

// ✅ GOOD: Solve what exists today
export function CreateInvoicePage() {
  return <InvoiceForm title="New Invoice" />
}
```

---

#### How to Identify YAGNI Violations in Code Review

Look for these signals:

- **Parameters named `*_type`, `*_strategy`, `*_mode`** that only ever receive one value.
- **Abstract base classes with one concrete implementation** and no planned second.
- **Feature flags for features that are always on.**
- **Config files for services not yet integrated.**
- **Comments like "will be needed when we add multi-tenancy"** — if it is not needed now, delete it.
- **Tables with columns that are always NULL** — the schema anticipates a feature that was never built.

Ask in PR review: "Is this used today? Does a ticket exist for when it will be?" If both answers are no, the code should not merge.

---

### The Tension Between DRY and YAGNI

DRY and YAGNI give opposite advice in one common situation: you have seen this pattern twice and want to abstract it.

- **DRY says:** "Extract the shared logic now — duplication will diverge."
- **YAGNI says:** "You only have two cases. The abstraction will guess wrong."

**The resolution:** apply the AHA Principle (see above). Wait for the third case. When it arrives, you will have three real examples to design the abstraction from, rather than guessing from two. The cost of one duplication is almost always lower than the cost of the wrong abstraction.

```
                 Wait            Third case           Refactor
Two cases ───────────────────────────────────────────────────▶  Correct abstraction
              (deliberate        arrives with             (based on real
               duplication)      real constraints)         evidence)
```

When NOT to wait:

- The two cases are owned by the same team, touched in every sprint, and already diverging.
- The shared logic is security-critical (auth, validation) — divergence there is a vulnerability.
- The abstraction is trivially obvious: extracting a constant, a type alias, or a helper that formats a date.

When to wait:

- The cases are in different bounded contexts owned by different teams.
- The second case arrived in the same sprint as the first — you have not seen them in the wild yet.
- The "abstraction" would require adding a parameter to handle the second case's differences.

---

## Domain-Driven Design

Practical DDD for a FastAPI + React project. The goal is to use DDD patterns where they reduce complexity — not to implement every tactical pattern by default. Start with Bounded Contexts and Entities; add the rest as complexity demands.

> Esta página define las convenciones DDD del proyecto (snapshot, generado por
> `agteamos-knowledge`). Para detectar cuándo un PR concreto se aleja de
> estas convenciones — concepto disperso, God Module, leaky boundary entre
> bounded contexts — usa `agteamos-domain-review`, que hace ese chequeo por
> cambio, no una vez.

---

### Bounded Contexts

A Bounded Context is an explicit boundary within which a domain model applies. Inside the boundary, terms are unambiguous. "User" in the Billing context means something different from "User" in the Notification context — and that is fine, because they are in separate contexts with their own models.

#### How to identify them from user stories

Group user stories by the business capability they serve. When you notice that a concept means different things across groups — or that one change ripples through unrelated stories — you have found a context boundary.

Example — Invoice SaaS:

| User Story | Bounded Context |
|---|---|
| "As a user, I can register and log in" | Identity |
| "As a user, I can create and send invoices" | Billing |
| "As a user, I receive email when my invoice is paid" | Notification |
| "As a user, I can view my payment history" | Billing |
| "As an admin, I can disable accounts" | Identity |

#### Folder structure per context

```
src/
  billing/             ← Billing bounded context
    domain/
    application/
    infrastructure/
    presentation/
  identity/            ← Identity bounded context
    domain/
    application/
    infrastructure/
    presentation/
  notification/        ← Notification bounded context
    domain/
    application/
    infrastructure/
    presentation/
```

Dependencies between contexts go through explicit interfaces (ports), never by importing from another context's `domain/` or `infrastructure/` directly.

---

### Entities

An Entity is an object defined by its identity, not its attributes. Two invoices with the same amount and the same client are still two different invoices — because they have different IDs. Entities have identity that persists over time and across state changes.

Entities carry behavior. They are not data bags — they enforce invariants and express domain operations as methods.

#### ✅ GOOD — Invoice entity with domain methods

**`src/billing/domain/entities.py`**
```python
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from src.billing.domain.value_objects import Money, InvoiceStatus, Email
from src.billing.domain.events import InvoiceCreated, PaymentReceived


@dataclass
class Invoice:
    id: UUID
    user_id: UUID
    client_email: Email
    subtotal: Money
    discount_rate: Decimal       # 0.00 to 1.00
    status: InvoiceStatus
    created_at: datetime
    paid_at: datetime | None

    _events: list = field(default_factory=list, init=False, repr=False)

    @classmethod
    def create(cls, user_id: UUID, client_email: Email, subtotal: Money) -> "Invoice":
        invoice = cls(
            id=uuid4(),
            user_id=user_id,
            client_email=client_email,
            subtotal=subtotal,
            discount_rate=Decimal("0"),
            status=InvoiceStatus.DRAFT,
            created_at=datetime.now(timezone.utc),
            paid_at=None,
        )
        invoice._events.append(InvoiceCreated(invoice_id=invoice.id, user_id=user_id))
        return invoice

    def calculate_total(self) -> Money:
        discount_amount = self.subtotal.amount * self.discount_rate
        return Money(
            amount=self.subtotal.amount - discount_amount,
            currency=self.subtotal.currency,
        )

    def apply_discount(self, rate: Decimal) -> None:
        if not (Decimal("0") <= rate <= Decimal("1")):
            raise ValueError(f"Discount rate must be between 0 and 1, got {rate}")
        if self.status != InvoiceStatus.DRAFT:
            raise ValueError("Cannot apply discount to a non-draft invoice")
        self.discount_rate = rate

    def mark_as_sent(self) -> None:
        if self.status != InvoiceStatus.DRAFT:
            raise ValueError(f"Cannot send invoice with status {self.status}")
        self.status = InvoiceStatus.SENT

    def mark_as_paid(self, payment_amount: Money) -> None:
        total = self.calculate_total()
        if payment_amount.amount < total.amount:
            raise ValueError(
                f"Payment {payment_amount.amount} is less than invoice total {total.amount}"
            )
        if self.status == InvoiceStatus.PAID:
            raise ValueError("Invoice is already paid")
        self.status = InvoiceStatus.PAID
        self.paid_at = datetime.now(timezone.utc)
        self._events.append(PaymentReceived(invoice_id=self.id, amount=payment_amount))

    def collect_events(self) -> list:
        events = list(self._events)
        self._events.clear()
        return events
```

The entity encapsulates: ID identity, invariant enforcement (`apply_discount` rejects invalid rates and wrong status), state transitions (`mark_as_paid` validates payment amount), and domain event collection.

---

### Value Objects

A Value Object is defined by its attributes, not by identity. Two `Money(100, "USD")` instances are equal — they are the same value. Value Objects are immutable. Replace them, never mutate them.

#### ✅ GOOD — Money, Email, InvoiceStatus as Value Objects

**`src/billing/domain/value_objects.py`**
```python
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
import re


@dataclass(frozen=True)   # frozen=True enforces immutability
class Money:
    amount: Decimal
    currency: str         # ISO 4217, e.g. "USD", "EUR"

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError(f"Money amount cannot be negative: {self.amount}")
        if len(self.currency) != 3:
            raise ValueError(f"Currency must be ISO 4217 (3 chars): {self.currency}")

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"Cannot add {self.currency} and {other.currency}")
        return Money(amount=self.amount + other.amount, currency=self.currency)

    def __str__(self) -> str:
        return f"{self.amount:.2f} {self.currency}"


@dataclass(frozen=True)
class Email:
    value: str

    def __post_init__(self) -> None:
        if not re.match(r"[^@]+@[^@]+\.[^@]+", self.value):
            raise ValueError(f"Invalid email address: {self.value}")

    def __str__(self) -> str:
        return self.value


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"
```

Value Objects enforce their own invariants in `__post_init__`. Because they are immutable (`frozen=True`), you cannot put a `Money` in an invalid state after construction.

**Equality by value, not reference:**
```python
a = Money(amount=Decimal("100"), currency="USD")
b = Money(amount=Decimal("100"), currency="USD")

assert a == b        # True — same value
assert a is not b    # True — different objects, but equal by value
```

**TypeScript equivalent:**
```typescript
// src/billing/domain/valueObjects.ts

class Money {
  private constructor(readonly amount: number, readonly currency: string) {}

  static create(amount: number, currency: string): Money {
    if (amount < 0) throw new Error(`Amount cannot be negative: ${amount}`)
    if (currency.length !== 3) throw new Error(`Invalid currency: ${currency}`)
    return new Money(amount, currency)
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot add ${this.currency} and ${other.currency}`)
    }
    return Money.create(this.amount + other.amount, this.currency)
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency
  }
}

class Email {
  private constructor(readonly value: string) {}

  static create(value: string): Email {
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(value)) {
      throw new Error(`Invalid email: ${value}`)
    }
    return new Email(value)
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }
}
```

---

### Aggregates

An Aggregate is a cluster of domain objects (Entities and Value Objects) treated as a single unit for data changes. The Aggregate Root is the only entry point — external code never accesses internal objects directly.

The aggregate enforces consistency within its boundary. Anything inside must be consistent at all times. Changes outside the aggregate boundary are eventually consistent (coordinated via domain events).

#### ✅ GOOD — Order aggregate with OrderItems

**`src/billing/domain/order_aggregate.py`**
```python
from dataclasses import dataclass, field
from decimal import Decimal
from uuid import UUID, uuid4

from src.billing.domain.value_objects import Money


@dataclass
class OrderItem:
    """Never instantiated directly by callers — only through Order."""
    id: UUID
    product_id: UUID
    quantity: int
    unit_price: Money

    def line_total(self) -> Money:
        return Money(amount=self.unit_price.amount * self.quantity, currency=self.unit_price.currency)


@dataclass
class Order:
    """Aggregate Root — the only public interface for this aggregate."""
    id: UUID
    user_id: UUID
    _items: list[OrderItem] = field(default_factory=list, repr=False)

    @classmethod
    def create(cls, user_id: UUID) -> "Order":
        return cls(id=uuid4(), user_id=user_id)

    def add_item(self, product_id: UUID, quantity: int, unit_price: Money) -> None:
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        existing = next((i for i in self._items if i.product_id == product_id), None)
        if existing:
            # Merge into existing line — invariant: one line per product
            self._items.remove(existing)
            self._items.append(OrderItem(
                id=existing.id,
                product_id=product_id,
                quantity=existing.quantity + quantity,
                unit_price=unit_price,
            ))
        else:
            self._items.append(OrderItem(id=uuid4(), product_id=product_id, quantity=quantity, unit_price=unit_price))

    def remove_item(self, product_id: UUID) -> None:
        self._items = [i for i in self._items if i.product_id != product_id]

    def calculate_total(self) -> Money:
        if not self._items:
            return Money(amount=Decimal("0"), currency="USD")
        totals = [item.line_total() for item in self._items]
        result = totals[0]
        for t in totals[1:]:
            result = result.add(t)
        return result

    @property
    def items(self) -> tuple[OrderItem, ...]:
        return tuple(self._items)   # immutable view — callers cannot mutate _items
```

**Why you never access `OrderItem` directly:**
```python
# ❌ BAD — bypasses aggregate consistency
item = OrderItem(id=uuid4(), product_id=product_id, quantity=-1, unit_price=price)
order._items.append(item)   # negative quantity slips through

# ✅ GOOD — all mutations go through the aggregate root
order.add_item(product_id=product_id, quantity=2, unit_price=price)
# The root enforces: quantity > 0, merges duplicates, maintains invariants
```

---

### Repository Pattern

The Repository provides a collection-like interface to access domain objects. Its interface belongs to the domain layer. Its implementation belongs to the infrastructure layer. This inversion means the domain has zero knowledge of PostgreSQL, SQLAlchemy, or any persistence technology.

#### ✅ GOOD — Abstract interface in domain, PostgreSQL implementation in infra

**`src/billing/domain/repositories.py`**
```python
from abc import ABC, abstractmethod
from uuid import UUID

from src.billing.domain.entities import Invoice
from src.shared.pagination import PaginatedResult


class IInvoiceRepository(ABC):
    @abstractmethod
    async def find_by_id(self, invoice_id: UUID) -> Invoice | None:
        ...

    @abstractmethod
    async def find_by_user(self, user_id: UUID, *, page: int, per_page: int) -> PaginatedResult[Invoice]:
        ...

    @abstractmethod
    async def save(self, invoice: Invoice) -> Invoice:
        ...

    @abstractmethod
    async def delete(self, invoice_id: UUID) -> None:
        ...
```

**`src/billing/infrastructure/db_repository.py`**
```python
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.billing.domain.entities import Invoice
from src.billing.domain.repositories import IInvoiceRepository
from src.billing.infrastructure.models import InvoiceModel
from src.billing.infrastructure.mappers import to_domain, to_model
from src.shared.pagination import PaginatedResult


class PostgreSQLInvoiceRepository(IInvoiceRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, invoice_id: UUID) -> Invoice | None:
        result = await self._session.execute(
            select(InvoiceModel).where(
                InvoiceModel.id == invoice_id,
                InvoiceModel.deleted_at.is_(None),
            )
        )
        model = result.scalar_one_or_none()
        return to_domain(model) if model else None

    async def find_by_user(self, user_id: UUID, *, page: int, per_page: int) -> PaginatedResult[Invoice]:
        offset = (page - 1) * per_page
        total_result = await self._session.execute(
            select(func.count()).select_from(InvoiceModel).where(
                InvoiceModel.user_id == user_id,
                InvoiceModel.deleted_at.is_(None),
            )
        )
        total = total_result.scalar_one()
        rows = await self._session.execute(
            select(InvoiceModel)
            .where(InvoiceModel.user_id == user_id, InvoiceModel.deleted_at.is_(None))
            .order_by(InvoiceModel.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        return PaginatedResult(
            items=[to_domain(m) for m in rows.scalars().all()],
            total=total,
            page=page,
            per_page=per_page,
        )

    async def save(self, invoice: Invoice) -> Invoice:
        model = to_model(invoice)
        merged = await self._session.merge(model)
        await self._session.flush()
        return to_domain(merged)

    async def delete(self, invoice_id: UUID) -> None:
        result = await self._session.execute(
            select(InvoiceModel).where(InvoiceModel.id == invoice_id)
        )
        model = result.scalar_one_or_none()
        if model:
            from datetime import datetime, timezone
            model.deleted_at = datetime.now(timezone.utc)
            await self._session.flush()
```

**TypeScript equivalent:**
```typescript
// src/billing/domain/IUserRepository.ts
interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  save(user: User): Promise<User>
}

// src/billing/infrastructure/PrismaUserRepository.ts
class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } })
    return record ? toDomain(record) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } })
    return record ? toDomain(record) : null
  }

  async save(user: User): Promise<User> {
    const record = await this.prisma.user.upsert({
      where: { id: user.id },
      create: toRecord(user),
      update: toRecord(user),
    })
    return toDomain(record)
  }
}

// In tests: swap with in-memory implementation, no database required
class InMemoryUserRepository implements IUserRepository {
  private store = new Map<string, User>()

  async findById(id: string): Promise<User | null> {
    return this.store.get(id) ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    return [...this.store.values()].find(u => u.email === email) ?? null
  }

  async save(user: User): Promise<User> {
    this.store.set(user.id, user)
    return user
  }
}
```

---

### Domain Events

A Domain Event represents something that happened in the domain that other parts of the system may care about. Events are named in the past tense and carry the data that downstream handlers need.

#### ✅ GOOD — InvoiceCreated and PaymentReceived events

**`src/billing/domain/events.py`**
```python
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from src.billing.domain.value_objects import Money


@dataclass(frozen=True)
class DomainEvent:
    occurred_at: datetime = None

    def __post_init__(self) -> None:
        if self.occurred_at is None:
            object.__setattr__(self, "occurred_at", datetime.now(timezone.utc))


@dataclass(frozen=True)
class InvoiceCreated(DomainEvent):
    invoice_id: UUID
    user_id: UUID


@dataclass(frozen=True)
class PaymentReceived(DomainEvent):
    invoice_id: UUID
    amount: Money
```

**`src/billing/application/services.py`** — dispatching events after use case completes
```python
from src.billing.domain.repositories import IInvoiceRepository
from src.billing.domain.entities import Invoice
from src.billing.domain.value_objects import Money, Email
from src.billing.application.schemas import CreateInvoiceRequest
from src.shared.event_bus import IEventBus


class CreateInvoiceUseCase:
    def __init__(self, repo: IInvoiceRepository, event_bus: IEventBus) -> None:
        self._repo = repo
        self._event_bus = event_bus

    async def execute(self, request: CreateInvoiceRequest, user_id: str) -> Invoice:
        invoice = Invoice.create(
            user_id=user_id,
            client_email=Email(request.client_email),
            subtotal=Money(amount=request.amount, currency=request.currency),
        )
        saved = await self._repo.save(invoice)

        # Dispatch domain events collected during the operation
        for event in saved.collect_events():
            await self._event_bus.publish(event)

        return saved


class MarkAsPaidUseCase:
    def __init__(self, repo: IInvoiceRepository, event_bus: IEventBus) -> None:
        self._repo = repo
        self._event_bus = event_bus

    async def execute(self, invoice_id: str, payment_amount: Money) -> Invoice:
        invoice = await self._repo.find_by_id(invoice_id)
        if not invoice:
            raise InvoiceNotFoundError(invoice_id)

        invoice.mark_as_paid(payment_amount)
        saved = await self._repo.save(invoice)

        for event in saved.collect_events():
            await self._event_bus.publish(event)

        return saved
```

**`src/notification/handlers.py`** — consuming events in another bounded context
```python
from src.billing.domain.events import InvoiceCreated, PaymentReceived
from src.notification.service import NotificationService


class BillingEventHandlers:
    def __init__(self, notifications: NotificationService) -> None:
        self._notifications = notifications

    async def on_invoice_created(self, event: InvoiceCreated) -> None:
        await self._notifications.send_invoice_created_confirmation(
            invoice_id=event.invoice_id,
            user_id=event.user_id,
        )

    async def on_payment_received(self, event: PaymentReceived) -> None:
        await self._notifications.send_payment_receipt(
            invoice_id=event.invoice_id,
            amount=event.amount,
        )
```

---

### Practical Folder Structure for FastAPI

```
src/
  billing/                        ← bounded context
    domain/
      entities.py                 ← Invoice, Payment (identity, behavior, invariants)
      value_objects.py            ← Money, InvoiceStatus, Email (immutable, equality by value)
      repositories.py             ← IInvoiceRepository (abstract — no imports from infra)
      events.py                   ← InvoiceCreated, PaymentReceived (past-tense facts)
      exceptions.py               ← InvoiceNotFoundError, InvalidPaymentError
    application/
      services.py                 ← CreateInvoiceUseCase, MarkAsPaidUseCase (orchestration)
      schemas.py                  ← Pydantic request/response DTOs (no domain objects leaked)
    infrastructure/
      db_repository.py            ← PostgreSQLInvoiceRepository (SQLAlchemy, concrete)
      models.py                   ← SQLAlchemy ORM models (persistence concern)
      mappers.py                  ← to_domain(), to_model() (translate between layers)
    presentation/
      router.py                   ← FastAPI routes (thin: parse → call use case → return DTO)
      dependencies.py             ← FastAPI Depends() wiring

  identity/                       ← bounded context (same structure)
    domain/
    application/
    infrastructure/
    presentation/

  notification/                   ← bounded context (same structure)
    domain/
    application/
    infrastructure/
    presentation/

  shared/                         ← cross-context utilities (no domain logic)
    event_bus.py                  ← IEventBus interface
    pagination.py                 ← PaginatedResult dataclass
    exceptions.py                 ← base exception classes
```

**Dependency rules:**

- `domain/` imports nothing from `application/`, `infrastructure/`, or `presentation/`.
- `application/` imports from `domain/` only.
- `infrastructure/` imports from `domain/` and `application/`.
- `presentation/` imports from `application/` (use cases and schemas).
- No context imports from another context's `domain/` or `infrastructure/` — only through explicit interfaces in `shared/` or via events.


---

### Ejemplos de código por lenguaje

| Stack | Archivo |
|-------|---------|
| Python / FastAPI | [examples/domain-driven-design-python.md](./examples/domain-driven-design-python.md) |
| C# / ASP.NET Core | [examples/csharp.md](./examples/csharp.md) + [csharp-cqrs-mediatr.md](./examples/csharp-cqrs-mediatr.md) |
| TypeScript / Node.js | [examples/clean-architecture-typescript.md](./examples/clean-architecture-typescript.md) |
