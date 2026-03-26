# Clean Architecture

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

## Folder Structure — Python / FastAPI

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

## Folder Structure — TypeScript / React

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

## Dependency Rule — Correct vs Incorrect

### Correct: Use Case depends on abstract interface (inward)

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

### INCORRECT: Use Case imports from infrastructure (outward dependency — violates the rule)

```python
# application/use_cases/create_user.py  <-- BAD
from infrastructure.database.repositories.postgres_user_repository import PostgresUserRepository
# ^^ This makes the use case depend on a concrete implementation in an outer layer.
# Now you cannot test the use case without a real database.
```

---

## Correct vs Incorrect Import Patterns

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

## Real Use Case Example

### Python

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

### TypeScript

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

## Testing with Clean Architecture

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

## Ejemplos de código por lenguaje

Para implementaciones concretas de estas reglas:

| Stack | Archivo |
|-------|---------|
| Python / FastAPI | [xamples/python/01-clean-architecture.md](./examples/python/01-clean-architecture.md) |
| C# / ASP.NET Core | [xamples/csharp/01-clean-architecture.md](./examples/csharp/01-clean-architecture.md) |
| TypeScript / Node.js | [xamples/typescript/01-clean-architecture.md](./examples/typescript/01-clean-architecture.md) |
