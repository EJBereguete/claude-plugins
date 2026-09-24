# SOLID Principles in Python

Each principle is illustrated with a **Before** (violation) and **After** (correct) example using Python 3.12 type hints, dataclasses, `ABC`, and `Protocol`.

---

## S — Single Responsibility Principle

> *A class should have only one reason to change.*

### ❌ Before — InvoiceService does too much

```python
class InvoiceService:
    """Handles business logic, persistence, PDF generation, AND email delivery."""

    def create_invoice(self, order_id: str, amount: float) -> dict:
        # 1. Persist to DB
        invoice = {"id": "inv-1", "order_id": order_id, "amount": amount}
        self._db.insert("invoices", invoice)

        # 2. Generate PDF
        pdf_bytes = self._generate_pdf(invoice)
        self._storage.upload(f"invoices/{invoice['id']}.pdf", pdf_bytes)

        # 3. Send email
        self._mailer.send(
            to=order["customer_email"],
            subject="Your invoice",
            body=f"Amount due: {amount}",
        )
        return invoice

    def _generate_pdf(self, invoice: dict) -> bytes: ...
```

Three distinct reasons to change: persistence schema, PDF layout, email template.

### ✅ After — one responsibility per class

```python
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID, uuid4


@dataclass
class Invoice:
    id: UUID
    order_id: UUID
    amount: Decimal


# 1. Domain/persistence concern
class InvoiceRepository:
    def save(self, invoice: Invoice) -> None:
        ...  # DB insert


# 2. Rendering concern
class InvoicePdfRenderer:
    def render(self, invoice: Invoice) -> bytes:
        ...  # weasyprint / reportlab


# 3. Notification concern
class InvoiceNotifier:
    def notify(self, invoice: Invoice, recipient_email: str) -> None:
        ...  # send email


# 4. Orchestrator — thin, delegates to specialists
class CreateInvoiceUseCase:
    def __init__(
        self,
        repo: InvoiceRepository,
        renderer: InvoicePdfRenderer,
        notifier: InvoiceNotifier,
    ) -> None:
        self._repo = repo
        self._renderer = renderer
        self._notifier = notifier

    def execute(self, order_id: UUID, amount: Decimal, email: str) -> Invoice:
        invoice = Invoice(id=uuid4(), order_id=order_id, amount=amount)
        self._repo.save(invoice)
        pdf = self._renderer.render(invoice)
        self._notifier.notify(invoice, email)
        return invoice
```

Each class now has exactly one reason to change.

---

## O — Open/Closed Principle

> *Classes should be open for extension but closed for modification.*

### ❌ Before — adding a new discount type requires editing existing code

```python
class DiscountCalculator:
    def calculate(self, customer_type: str, amount: float) -> float:
        if customer_type == "vip":
            return amount * 0.80
        elif customer_type == "employee":
            return amount * 0.70
        elif customer_type == "student":
            return amount * 0.90
        # Adding "partner" requires editing this method ← closed for extension
        return amount
```

### ✅ After — strategy pattern, add strategies without touching existing code

```python
from abc import ABC, abstractmethod
from decimal import Decimal


class DiscountStrategy(ABC):
    @abstractmethod
    def apply(self, amount: Decimal) -> Decimal: ...


class VipDiscount(DiscountStrategy):
    def apply(self, amount: Decimal) -> Decimal:
        return amount * Decimal("0.80")


class EmployeeDiscount(DiscountStrategy):
    def apply(self, amount: Decimal) -> Decimal:
        return amount * Decimal("0.70")


class StudentDiscount(DiscountStrategy):
    def apply(self, amount: Decimal) -> Decimal:
        return amount * Decimal("0.90")


# Adding "PartnerDiscount" = new class, zero changes here ↓
class PartnerDiscount(DiscountStrategy):
    def apply(self, amount: Decimal) -> Decimal:
        return amount * Decimal("0.85")


class DiscountCalculator:
    def __init__(self, strategy: DiscountStrategy) -> None:
        self._strategy = strategy

    def calculate(self, amount: Decimal) -> Decimal:
        return self._strategy.apply(amount)
```

---

## L — Liskov Substitution Principle

> *Subclasses must be substitutable for their base class without altering program correctness.*

### ❌ Before — Penguin violates the contract of Bird

```python
class Bird:
    def fly(self) -> str:
        return "I'm flying!"


class Penguin(Bird):
    def fly(self) -> str:
        raise NotImplementedError("Penguins can't fly!")  # ← breaks substitutability


def make_bird_fly(bird: Bird) -> str:
    return bird.fly()  # explodes if bird is a Penguin
```

### ✅ After — hierarchy based on actual capabilities

```python
from abc import ABC, abstractmethod


class Bird(ABC):
    """All birds share this interface."""

    @abstractmethod
    def move(self) -> str: ...

    @abstractmethod
    def make_sound(self) -> str: ...


class FlyingBird(Bird, ABC):
    @abstractmethod
    def fly(self) -> str: ...

    def move(self) -> str:
        return self.fly()


class SwimmingBird(Bird, ABC):
    @abstractmethod
    def swim(self) -> str: ...

    def move(self) -> str:
        return self.swim()


class Eagle(FlyingBird):
    def fly(self) -> str:
        return "Eagle soaring at 150 km/h"

    def make_sound(self) -> str:
        return "Screech!"


class Penguin(SwimmingBird):
    def swim(self) -> str:
        return "Penguin gliding through cold water"

    def make_sound(self) -> str:
        return "Squawk!"


def describe_bird(bird: Bird) -> str:
    return f"{type(bird).__name__}: {bird.move()} — {bird.make_sound()}"
```

Every `Bird` subtype is fully substitutable; callers using `Bird` never crash.

---

## I — Interface Segregation Principle

> *No client should be forced to depend on methods it does not use.*

### ❌ Before — fat interface forces EmailNotifier to implement SMS

```python
from abc import ABC, abstractmethod


class Notifier(ABC):
    @abstractmethod
    def send_email(self, to: str, body: str) -> None: ...

    @abstractmethod
    def send_sms(self, phone: str, message: str) -> None: ...

    @abstractmethod
    def send_push(self, device_token: str, payload: dict) -> None: ...


class EmailNotifier(Notifier):
    def send_email(self, to: str, body: str) -> None:
        ...  # real implementation

    def send_sms(self, phone: str, message: str) -> None:
        raise NotImplementedError  # forced to implement!

    def send_push(self, device_token: str, payload: dict) -> None:
        raise NotImplementedError  # forced to implement!
```

### ✅ After — fine-grained interfaces; implement only what you support

```python
from abc import ABC, abstractmethod
from typing import Protocol


class EmailSender(Protocol):
    def send_email(self, to: str, body: str) -> None: ...


class SmsSender(Protocol):
    def send_sms(self, phone: str, message: str) -> None: ...


class PushSender(Protocol):
    def send_push(self, device_token: str, payload: dict) -> None: ...


# Concrete classes implement only what they support
class SendgridEmailSender:
    def send_email(self, to: str, body: str) -> None:
        print(f"Sending email via Sendgrid to {to}")


class TwilioSmsSender:
    def send_sms(self, phone: str, message: str) -> None:
        print(f"Sending SMS via Twilio to {phone}")


# Notification service depends on the smallest interfaces it needs
class OrderConfirmationService:
    def __init__(self, email: EmailSender, sms: SmsSender) -> None:
        self._email = email
        self._sms = sms

    def confirm(self, customer_email: str, customer_phone: str) -> None:
        self._email.send_email(customer_email, "Your order is confirmed!")
        self._sms.send_sms(customer_phone, "Order confirmed.")
```

---

## D — Dependency Inversion Principle

> *High-level modules must not depend on low-level modules. Both should depend on abstractions.*

### ❌ Before — use case imports a concrete repository

```python
# application layer importing infrastructure ← wrong direction
from infrastructure.database.postgres_user_repo import PostgresUserRepo


class GetUserProfileUseCase:
    def __init__(self) -> None:
        self._repo = PostgresUserRepo()  # hard-coupled to Postgres

    async def execute(self, user_id: str) -> dict:
        return await self._repo.find_by_id(user_id)
```

Changing the database requires editing the use case.

### ✅ After — use case depends on an abstract interface

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID


@dataclass
class UserProfile:
    id: UUID
    name: str
    email: str


# Abstraction lives in the APPLICATION layer
class IUserRepository(ABC):
    @abstractmethod
    async def find_by_id(self, user_id: UUID) -> UserProfile | None: ...


# High-level module — knows nothing about Postgres
class GetUserProfileUseCase:
    def __init__(self, repo: IUserRepository) -> None:
        self._repo = repo

    async def execute(self, user_id: UUID) -> UserProfile:
        profile = await self._repo.find_by_id(user_id)
        if profile is None:
            raise ValueError(f"User {user_id} not found")
        return profile


# Low-level module (infrastructure) depends on the abstraction
class PostgresUserRepository(IUserRepository):
    async def find_by_id(self, user_id: UUID) -> UserProfile | None:
        # SQLAlchemy query here
        ...


# Wiring at composition root (main.py / DI container)
use_case = GetUserProfileUseCase(repo=PostgresUserRepository())
```

Now swapping Postgres for DynamoDB or an in-memory stub requires **zero changes** to the use case.
