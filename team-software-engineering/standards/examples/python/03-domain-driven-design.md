# Domain-Driven Design in Python

Core DDD building blocks implemented in pure Python, independent of any framework or ORM.

---

## 1. Value Object

Value Objects are **immutable** and compared by value. Use `@dataclass(frozen=True)`.

### `Email`

```python
# domain/value_objects/email.py
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Email:
    value: str

    _PATTERN: str = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

    def __post_init__(self) -> None:
        if not re.match(self._PATTERN, self.value):
            raise ValueError(f"Invalid email address: '{self.value}'")

    def domain(self) -> str:
        return self.value.split("@")[1]

    def __str__(self) -> str:
        return self.value
```

### `Money`

```python
# domain/value_objects/money.py
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP


@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str  # ISO 4217 (e.g., "USD", "EUR")

    def __post_init__(self) -> None:
        if self.amount < Decimal("0"):
            raise ValueError("Money amount cannot be negative.")
        if len(self.currency) != 3:
            raise ValueError(f"Invalid currency code: '{self.currency}'")

    def add(self, other: "Money") -> "Money":
        self._assert_same_currency(other)
        return Money(self.amount + other.amount, self.currency)

    def subtract(self, other: "Money") -> "Money":
        self._assert_same_currency(other)
        result = self.amount - other.amount
        if result < 0:
            raise ValueError("Subtraction would result in a negative amount.")
        return Money(result, self.currency)

    def multiply(self, factor: Decimal) -> "Money":
        return Money((self.amount * factor).quantize(Decimal("0.01"), ROUND_HALF_UP), self.currency)

    def _assert_same_currency(self, other: "Money") -> None:
        if self.currency != other.currency:
            raise ValueError(
                f"Currency mismatch: {self.currency} vs {other.currency}"
            )

    def __str__(self) -> str:
        return f"{self.currency} {self.amount:.2f}"
```

---

## 2. Entity

Entities have **identity** (an `id`) and mutable state. Equality is based on `id`.

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

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, User):
            return NotImplemented
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)

    # ── Factory ──────────────────────────────────────────────────────────

    @classmethod
    def create(cls, email: str, name: str) -> "User":
        return cls(
            id=uuid4(),
            email=Email(email),
            name=name,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )

    # ── Business behaviour ───────────────────────────────────────────────

    def change_email(self, new_email: str) -> None:
        self.email = Email(new_email)

    def rename(self, new_name: str) -> None:
        name = new_name.strip()
        if not name:
            raise ValueError("Name cannot be blank.")
        self.name = name

    def deactivate(self) -> None:
        if not self.is_active:
            raise ValueError("User is already inactive.")
        self.is_active = False
```

---

## 3. Aggregate

An Aggregate is a **cluster of objects treated as a single unit** for data changes. The root entity controls all invariants.

```python
# domain/aggregates/order.py
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from uuid import UUID, uuid4
from datetime import datetime, timezone
from enum import Enum

from domain.value_objects.money import Money


class OrderStatus(str, Enum):
    DRAFT = "draft"
    PLACED = "placed"
    CANCELLED = "cancelled"


@dataclass
class OrderItem:
    id: UUID
    product_id: UUID
    quantity: int
    unit_price: Money

    def subtotal(self) -> Money:
        return self.unit_price.multiply(Decimal(self.quantity))


@dataclass
class Order:
    """Aggregate root — the only entry point for mutations."""

    MAX_ITEMS: int = 50
    MIN_TOTAL: Money = field(default_factory=lambda: Money(Decimal("0.01"), "USD"))

    id: UUID = field(default_factory=uuid4)
    customer_id: UUID = field(default_factory=uuid4)
    status: OrderStatus = OrderStatus.DRAFT
    items: list[OrderItem] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    _events: list = field(default_factory=list, repr=False)

    # ── Commands ─────────────────────────────────────────────────────────

    def add_item(self, product_id: UUID, quantity: int, unit_price: Money) -> None:
        if self.status != OrderStatus.DRAFT:
            raise ValueError("Cannot modify a non-draft order.")
        if len(self.items) >= self.MAX_ITEMS:
            raise ValueError(f"An order cannot have more than {self.MAX_ITEMS} items.")
        if quantity <= 0:
            raise ValueError("Quantity must be positive.")
        self.items.append(
            OrderItem(id=uuid4(), product_id=product_id, quantity=quantity, unit_price=unit_price)
        )

    def remove_item(self, item_id: UUID) -> None:
        if self.status != OrderStatus.DRAFT:
            raise ValueError("Cannot modify a non-draft order.")
        self.items = [i for i in self.items if i.id != item_id]

    def place(self) -> None:
        if self.status != OrderStatus.DRAFT:
            raise ValueError("Only draft orders can be placed.")
        if not self.items:
            raise ValueError("Cannot place an empty order.")
        total = self.total()
        if total.amount < self.MIN_TOTAL.amount:
            raise ValueError(f"Order total must be at least {self.MIN_TOTAL}.")
        self.status = OrderStatus.PLACED
        self._events.append(OrderPlacedEvent(order_id=self.id, total=total))

    def cancel(self) -> None:
        if self.status == OrderStatus.CANCELLED:
            raise ValueError("Order is already cancelled.")
        self.status = OrderStatus.CANCELLED

    # ── Queries ───────────────────────────────────────────────────────────

    def total(self) -> Money:
        if not self.items:
            return Money(Decimal("0"), "USD")
        totals = [item.subtotal() for item in self.items]
        return sum(totals[1:], start=totals[0])

    def pop_events(self) -> list:
        events, self._events = self._events, []
        return events
```

---

## 4. Domain Events

```python
# domain/events.py
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4

from domain.value_objects.money import Money


@dataclass(frozen=True)
class DomainEvent:
    event_id: UUID = field(default_factory=uuid4)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class OrderPlacedEvent(DomainEvent):
    order_id: UUID = field(default_factory=uuid4)
    total: Money = field(default_factory=lambda: Money(Decimal("0"), "USD"))
```

### Event Publisher

```python
# application/event_publisher.py
from collections import defaultdict
from typing import Callable, TypeVar

from domain.events import DomainEvent

E = TypeVar("E", bound=DomainEvent)
Handler = Callable[[DomainEvent], None]


class EventPublisher:
    def __init__(self) -> None:
        self._handlers: dict[type, list[Handler]] = defaultdict(list)

    def subscribe(self, event_type: type[E], handler: Callable[[E], None]) -> None:
        self._handlers[event_type].append(handler)  # type: ignore[arg-type]

    def publish(self, event: DomainEvent) -> None:
        for handler in self._handlers.get(type(event), []):
            handler(event)
```

### Dispatching events after save

```python
# application/use_cases/place_order.py
from uuid import UUID

from application.event_publisher import EventPublisher
from application.interfaces.order_repository import IOrderRepository


class PlaceOrderUseCase:
    def __init__(self, repo: IOrderRepository, publisher: EventPublisher) -> None:
        self._repo = repo
        self._publisher = publisher

    async def execute(self, order_id: UUID) -> None:
        order = await self._repo.find_by_id(order_id)
        if order is None:
            raise ValueError(f"Order {order_id} not found.")

        order.place()
        await self._repo.save(order)

        # Dispatch only after successful persistence
        for event in order.pop_events():
            self._publisher.publish(event)
```

---

## 5. Repository

```python
# application/interfaces/order_repository.py
from abc import ABC, abstractmethod
from uuid import UUID

from domain.aggregates.order import Order


class IOrderRepository(ABC):
    @abstractmethod
    async def find_by_id(self, order_id: UUID) -> Order | None: ...

    @abstractmethod
    async def find_by_customer(
        self, customer_id: UUID, *, limit: int = 20, offset: int = 0
    ) -> list[Order]: ...

    @abstractmethod
    async def save(self, order: Order) -> None: ...

    @abstractmethod
    async def delete(self, order_id: UUID) -> None: ...
```

### SQLAlchemy Implementation (sketch)

```python
# infrastructure/database/repositories/postgres_order_repository.py
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from application.interfaces.order_repository import IOrderRepository
from domain.aggregates.order import Order
from infrastructure.database.mappers.order_mapper import OrderMapper
from infrastructure.database.models.order_model import OrderModel


class PostgresOrderRepository(IOrderRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, order_id: UUID) -> Order | None:
        result = await self._session.execute(
            select(OrderModel).where(OrderModel.id == str(order_id))
        )
        model = result.scalar_one_or_none()
        return OrderMapper.to_domain(model) if model else None

    async def find_by_customer(
        self, customer_id: UUID, *, limit: int = 20, offset: int = 0
    ) -> list[Order]:
        result = await self._session.execute(
            select(OrderModel)
            .where(OrderModel.customer_id == str(customer_id))
            .limit(limit)
            .offset(offset)
        )
        return [OrderMapper.to_domain(m) for m in result.scalars()]

    async def save(self, order: Order) -> None:
        model = await self._session.get(OrderModel, str(order.id))
        if model is None:
            self._session.add(OrderMapper.to_model(order))
        else:
            OrderMapper.update_model(model, order)

    async def delete(self, order_id: UUID) -> None:
        model = await self._session.get(OrderModel, str(order_id))
        if model:
            await self._session.delete(model)
```

---

## 6. Quick Tests

```python
# tests/unit/domain/test_order_aggregate.py
import pytest
from decimal import Decimal
from uuid import uuid4

from domain.aggregates.order import Order, OrderStatus
from domain.events import OrderPlacedEvent
from domain.value_objects.money import Money

USD = lambda amount: Money(Decimal(str(amount)), "USD")


def test_add_item_increases_item_count():
    order = Order(customer_id=uuid4())
    order.add_item(uuid4(), quantity=2, unit_price=USD(10))
    assert len(order.items) == 1


def test_total_sums_subtotals():
    order = Order(customer_id=uuid4())
    order.add_item(uuid4(), quantity=2, unit_price=USD(10))
    order.add_item(uuid4(), quantity=1, unit_price=USD(5))
    assert order.total() == USD(25)


def test_place_emits_order_placed_event():
    order = Order(customer_id=uuid4())
    order.add_item(uuid4(), quantity=1, unit_price=USD(50))
    order.place()
    events = order.pop_events()
    assert len(events) == 1
    assert isinstance(events[0], OrderPlacedEvent)


def test_place_empty_order_raises():
    order = Order(customer_id=uuid4())
    with pytest.raises(ValueError, match="empty"):
        order.place()


def test_cannot_add_items_after_placed():
    order = Order(customer_id=uuid4())
    order.add_item(uuid4(), quantity=1, unit_price=USD(50))
    order.place()
    with pytest.raises(ValueError, match="non-draft"):
        order.add_item(uuid4(), quantity=1, unit_price=USD(10))
```
