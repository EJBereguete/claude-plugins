# Domain-Driven Design

Practical DDD for a FastAPI + React project. The goal is to use DDD patterns where they reduce complexity — not to implement every tactical pattern by default. Start with Bounded Contexts and Entities; add the rest as complexity demands.

---

## Bounded Contexts

A Bounded Context is an explicit boundary within which a domain model applies. Inside the boundary, terms are unambiguous. "User" in the Billing context means something different from "User" in the Notification context — and that is fine, because they are in separate contexts with their own models.

### How to identify them from user stories

Group user stories by the business capability they serve. When you notice that a concept means different things across groups — or that one change ripples through unrelated stories — you have found a context boundary.

Example — Invoice SaaS:

| User Story | Bounded Context |
|---|---|
| "As a user, I can register and log in" | Identity |
| "As a user, I can create and send invoices" | Billing |
| "As a user, I receive email when my invoice is paid" | Notification |
| "As a user, I can view my payment history" | Billing |
| "As an admin, I can disable accounts" | Identity |

### Folder structure per context

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

## Entities

An Entity is an object defined by its identity, not its attributes. Two invoices with the same amount and the same client are still two different invoices — because they have different IDs. Entities have identity that persists over time and across state changes.

Entities carry behavior. They are not data bags — they enforce invariants and express domain operations as methods.

### ✅ GOOD — Invoice entity with domain methods

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

## Value Objects

A Value Object is defined by its attributes, not by identity. Two `Money(100, "USD")` instances are equal — they are the same value. Value Objects are immutable. Replace them, never mutate them.

### ✅ GOOD — Money, Email, InvoiceStatus as Value Objects

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

## Aggregates

An Aggregate is a cluster of domain objects (Entities and Value Objects) treated as a single unit for data changes. The Aggregate Root is the only entry point — external code never accesses internal objects directly.

The aggregate enforces consistency within its boundary. Anything inside must be consistent at all times. Changes outside the aggregate boundary are eventually consistent (coordinated via domain events).

### ✅ GOOD — Order aggregate with OrderItems

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

## Repository Pattern

The Repository provides a collection-like interface to access domain objects. Its interface belongs to the domain layer. Its implementation belongs to the infrastructure layer. This inversion means the domain has zero knowledge of PostgreSQL, SQLAlchemy, or any persistence technology.

### ✅ GOOD — Abstract interface in domain, PostgreSQL implementation in infra

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

## Domain Events

A Domain Event represents something that happened in the domain that other parts of the system may care about. Events are named in the past tense and carry the data that downstream handlers need.

### ✅ GOOD — InvoiceCreated and PaymentReceived events

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

## Practical Folder Structure for FastAPI

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
