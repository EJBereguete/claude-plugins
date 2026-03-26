# Python / FastAPI — Clean Architecture Reference

## 1. Folder Structure

```
src/
├── domain/
│   ├── entities/
│   │   └── user.py          # User entity with factory method
│   ├── value_objects/
│   │   └── email.py         # Immutable, validated Email
│   ├── events/
│   │   └── user_events.py   # UserCreatedEvent
│   └── repositories/
│       └── user_repository.py  # Abstract repository interface
├── application/
│   ├── use_cases/
│   │   └── create_user.py   # CreateUserUseCase
│   └── interfaces/
│       └── email_sender.py  # IEmailSender protocol
├── infrastructure/
│   ├── persistence/
│   │   └── sql_user_repository.py
│   └── services/
│       └── smtp_email_sender.py
└── api/
    └── routers/
        └── users.py
```

---

## 2. Domain Entity — User

```python
# domain/entities/user.py
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, UTC
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from domain.value_objects.email import Email
from domain.events.user_events import UserCreatedEvent

if TYPE_CHECKING:
    from domain.events.base import DomainEvent


@dataclass
class User:
    id: UUID
    email: Email
    name: str
    is_active: bool
    created_at: datetime
    _domain_events: list[DomainEvent] = field(default_factory=list, repr=False, compare=False)

    # Factory method — the only way to create a valid User
    @classmethod
    def create(cls, email: str, name: str) -> "User":
        if not name or not name.strip():
            raise ValueError("Name is required")

        validated_email = Email.create(email)
        user = cls(
            id=uuid4(),
            email=validated_email,
            name=name.strip(),
            is_active=True,
            created_at=datetime.now(UTC),
        )
        user._domain_events.append(UserCreatedEvent(user_id=user.id, email=validated_email.value))
        return user

    def deactivate(self) -> None:
        if not self.is_active:
            raise ValueError("User is already inactive")
        self.is_active = False

    def collect_events(self) -> list[DomainEvent]:
        events = list(self._domain_events)
        self._domain_events.clear()
        return events
```

---

## 3. Value Object — Email

```python
# domain/value_objects/email.py
import re
from dataclasses import dataclass

_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass(frozen=True)  # Immutable by design
class Email:
    value: str

    @classmethod
    def create(cls, raw: str) -> "Email":
        if not raw or not raw.strip():
            raise ValueError("Email is required")
        normalized = raw.strip().lower()
        if not _EMAIL_PATTERN.match(normalized):
            raise ValueError(f"Invalid email format: {raw!r}")
        return cls(value=normalized)

    def __str__(self) -> str:
        return self.value
```

---

## 4. Use Case — CreateUserUseCase

```python
# application/use_cases/create_user.py
from dataclasses import dataclass
from typing import Protocol

from domain.entities.user import User
from domain.repositories.user_repository import IUserRepository


class IEmailSender(Protocol):
    async def send_welcome(self, to_email: str, name: str) -> None: ...


@dataclass
class CreateUserRequest:
    email: str
    name: str


@dataclass
class CreateUserResponse:
    id: str
    email: str
    name: str


class CreateUserUseCase:
    """Orchestrates user creation. Depends only on abstractions."""

    def __init__(self, user_repo: IUserRepository, email_sender: IEmailSender) -> None:
        self._user_repo = user_repo
        self._email_sender = email_sender

    async def execute(self, request: CreateUserRequest) -> CreateUserResponse:
        if await self._user_repo.exists_by_email(request.email):
            raise ValueError(f"Email already in use: {request.email}")

        user = User.create(email=request.email, name=request.name)

        await self._user_repo.add(user)
        await self._email_sender.send_welcome(to_email=user.email.value, name=user.name)

        return CreateUserResponse(id=str(user.id), email=user.email.value, name=user.name)
```

---

## 5. SOLID in Python

### SRP — Single Responsibility Principle

**❌ Before: one class does too much**
```python
class UserService:
    def create_user(self, email: str, name: str) -> User: ...
    def send_welcome_email(self, user: User) -> None: ...  # ← wrong layer
    def export_users_csv(self) -> bytes: ...               # ← wrong layer
    def generate_report(self) -> dict: ...                 # ← wrong layer
```

**✅ After: each class has one reason to change**
```python
class UserService:
    def create_user(self, email: str, name: str) -> User: ...

class EmailNotificationService:
    def send_welcome(self, user: User) -> None: ...

class UserExportService:
    def export_csv(self, users: list[User]) -> bytes: ...
```

---

### OCP — Open/Closed Principle

**❌ Before: modify the class to add a new discount**
```python
class PriceCalculator:
    def calculate(self, price: float, customer_type: str) -> float:
        if customer_type == "vip":
            return price * 0.8
        elif customer_type == "member":
            return price * 0.9
        return price  # Adding "staff" requires editing this file
```

**✅ After: extend via new strategy, never edit existing code**
```python
from abc import ABC, abstractmethod

class DiscountStrategy(ABC):
    @abstractmethod
    def apply(self, price: float) -> float: ...

class VipDiscount(DiscountStrategy):
    def apply(self, price: float) -> float:
        return price * 0.8

class MemberDiscount(DiscountStrategy):
    def apply(self, price: float) -> float:
        return price * 0.9

class StaffDiscount(DiscountStrategy):          # New type — no existing code touched
    def apply(self, price: float) -> float:
        return price * 0.5

class PriceCalculator:
    def __init__(self, strategy: DiscountStrategy) -> None:
        self._strategy = strategy

    def calculate(self, price: float) -> float:
        return self._strategy.apply(price)
```

---

### LSP — Liskov Substitution Principle

**❌ Before: Square breaks Rectangle's contract**
```python
class Rectangle:
    def set_width(self, w: float) -> None: self.width = w
    def set_height(self, h: float) -> None: self.height = h
    def area(self) -> float: return self.width * self.height

class Square(Rectangle):
    def set_width(self, w: float) -> None:   # Violates caller's expectations
        self.width = w
        self.height = w
```

**✅ After: model the domain correctly**
```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...

class Rectangle(Shape):
    def __init__(self, width: float, height: float) -> None:
        self.width = width
        self.height = height
    def area(self) -> float:
        return self.width * self.height

class Square(Shape):
    def __init__(self, side: float) -> None:
        self.side = side
    def area(self) -> float:
        return self.side ** 2
```

---

### ISP — Interface Segregation Principle

**❌ Before: fat protocol forces unused methods**
```python
class INotificationService(Protocol):
    def send_email(self, to: str, subject: str, body: str) -> None: ...
    def send_sms(self, to: str, text: str) -> None: ...
    def send_push(self, device_token: str, title: str) -> None: ...
    # Implementors that only send email still must handle SMS/push
```

**✅ After: small, focused protocols**
```python
class IEmailSender(Protocol):
    def send_email(self, to: str, subject: str, body: str) -> None: ...

class ISmsSender(Protocol):
    def send_sms(self, to: str, text: str) -> None: ...

class IPushSender(Protocol):
    def send_push(self, device_token: str, title: str) -> None: ...

# Compose only what you need
class WelcomeEmailService:
    def __init__(self, sender: IEmailSender) -> None: ...
```

---

### DIP — Dependency Inversion Principle

**❌ Before: high-level module depends on concrete class**
```python
from infrastructure.persistence.sql_user_repository import SqlUserRepository

class CreateUserUseCase:
    def __init__(self) -> None:
        self._repo = SqlUserRepository()  # Hard-coded concrete dependency
```

**✅ After: depend on the abstraction**
```python
from domain.repositories.user_repository import IUserRepository

class CreateUserUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:  # Injected
        self._repo = user_repo
```

---

## 6. DDD Patterns

### Aggregate Root with Domain Events

```python
# domain/repositories/user_repository.py
from abc import ABC, abstractmethod
from uuid import UUID

from domain.entities.user import User


class IUserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> User | None: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def exists_by_email(self, email: str) -> bool: ...

    @abstractmethod
    async def add(self, user: User) -> None: ...

    @abstractmethod
    async def update(self, user: User) -> None: ...
```

```python
# domain/events/user_events.py
from dataclasses import dataclass
from uuid import UUID

from domain.events.base import DomainEvent


@dataclass(frozen=True)
class UserCreatedEvent(DomainEvent):
    user_id: UUID
    email: str
```

```python
# domain/events/base.py
from dataclasses import dataclass, field
from datetime import datetime, UTC
from uuid import UUID, uuid4


@dataclass(frozen=True)
class DomainEvent:
    event_id: UUID = field(default_factory=uuid4)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))
```
