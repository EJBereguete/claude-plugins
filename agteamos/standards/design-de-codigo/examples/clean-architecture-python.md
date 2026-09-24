# Clean Architecture in Python / FastAPI

Clean Architecture organises code into concentric rings where **inner rings know nothing about outer rings**. The domain is at the centre; frameworks are at the edge.

---

## 1. Folder Structure

```
src/
├── domain/                    # Pure Python — zero external dependencies
│   ├── entities/
│   │   └── user.py
│   ├── value_objects/
│   │   └── email.py
│   └── exceptions.py
├── application/               # Use Cases — depends only on domain
│   ├── use_cases/
│   │   └── create_user.py
│   ├── interfaces/
│   │   └── user_repository.py
│   └── dtos/
│       └── user_dto.py
├── infrastructure/            # Adapters & Frameworks — depends on everything
│   ├── database/
│   │   ├── models/
│   │   │   └── user_model.py
│   │   └── repositories/
│   │       └── postgres_user_repository.py
│   └── http/
│       ├── routers/
│       │   └── users.py
│       └── schemas/
│           └── user_schemas.py
└── main.py
```

---

## 2. The Dependency Rule

Dependencies must always point **inward** (toward the domain). A use case may never import a SQLAlchemy model; the router may never import an ORM session directly.

### ❌ Wrong — use case imports a concrete ORM model

```python
# application/use_cases/create_user.py  ← BAD
from infrastructure.database.models.user_model import UserModel  # ← violates the rule

class CreateUserUseCase:
    async def execute(self, email: str, name: str) -> UserModel:
        user = UserModel(email=email, name=name)
        await self.session.add(user)
        return user
```

### ✅ Correct — use case depends on an abstract interface

```python
# application/use_cases/create_user.py  ← GOOD
from application.interfaces.user_repository import IUserRepository
from domain.entities.user import User

class CreateUserUseCase:
    def __init__(self, repo: IUserRepository) -> None:
        self._repo = repo

    async def execute(self, email: str, name: str) -> User:
        user = User.create(email=email, name=name)
        await self._repo.save(user)
        return user
```

---

## 3. Domain Layer

### `domain/value_objects/email.py`

```python
from dataclasses import dataclass
import re


@dataclass(frozen=True)
class Email:
    value: str

    _PATTERN: str = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

    def __post_init__(self) -> None:
        if not re.match(self._PATTERN, self.value):
            raise ValueError(f"Invalid email address: '{self.value}'")

    def __str__(self) -> str:
        return self.value
```

### `domain/entities/user.py`

```python
from dataclasses import dataclass
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
        """Factory method — the only way to create a new User."""
        return cls(
            id=uuid4(),
            email=Email(email),
            name=name,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )

    def deactivate(self) -> None:
        if not self.is_active:
            raise ValueError("User is already inactive.")
        self.is_active = False
```

### `domain/exceptions.py`

```python
class DomainException(Exception):
    """Base for all domain-level exceptions."""


class UserAlreadyExistsError(DomainException):
    def __init__(self, email: str) -> None:
        super().__init__(f"A user with email '{email}' already exists.")


class UserNotFoundError(DomainException):
    def __init__(self, user_id: str) -> None:
        super().__init__(f"No user found with id '{user_id}'.")
```

---

## 4. Application Layer

### `application/interfaces/user_repository.py`

```python
from abc import ABC, abstractmethod
from uuid import UUID

from domain.entities.user import User


class IUserRepository(ABC):
    @abstractmethod
    async def find_by_id(self, user_id: UUID) -> User | None: ...

    @abstractmethod
    async def find_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def save(self, user: User) -> None: ...
```

### `application/dtos/user_dto.py`

```python
from dataclasses import dataclass
from uuid import UUID
from datetime import datetime


@dataclass(frozen=True)
class CreateUserCommand:
    email: str
    name: str


@dataclass(frozen=True)
class UserDTO:
    id: UUID
    email: str
    name: str
    is_active: bool
    created_at: datetime

    @classmethod
    def from_entity(cls, user: "User") -> "UserDTO":  # noqa: F821
        from domain.entities.user import User  # avoid circular at module level

        return cls(
            id=user.id,
            email=str(user.email),
            name=user.name,
            is_active=user.is_active,
            created_at=user.created_at,
        )
```

### `application/use_cases/create_user.py`

```python
from application.dtos.user_dto import CreateUserCommand, UserDTO
from application.interfaces.user_repository import IUserRepository
from domain.entities.user import User
from domain.exceptions import UserAlreadyExistsError


class CreateUserUseCase:
    def __init__(self, repo: IUserRepository) -> None:
        self._repo = repo

    async def execute(self, cmd: CreateUserCommand) -> UserDTO:
        existing = await self._repo.find_by_email(cmd.email)
        if existing:
            raise UserAlreadyExistsError(cmd.email)

        user = User.create(email=cmd.email, name=cmd.name)
        await self._repo.save(user)
        return UserDTO.from_entity(user)
```

---

## 5. Infrastructure Layer

### `infrastructure/database/models/user_model.py`

```python
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
```

### `infrastructure/database/repositories/postgres_user_repository.py`

```python
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from application.interfaces.user_repository import IUserRepository
from domain.entities.user import User
from domain.value_objects.email import Email
from infrastructure.database.models.user_model import UserModel


class PostgresUserRepository(IUserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, user_id: UUID) -> User | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.id == str(user_id))
        )
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def find_by_email(self, email: str) -> User | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.email == email)
        )
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def save(self, user: User) -> None:
        model = await self._session.get(UserModel, str(user.id))
        if model is None:
            model = self._to_model(user)
            self._session.add(model)
        else:
            model.email = str(user.email)
            model.name = user.name
            model.is_active = user.is_active

    # ── Mappers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _to_domain(m: UserModel) -> User:
        return User(
            id=UUID(m.id),
            email=Email(m.email),
            name=m.name,
            is_active=m.is_active,
            created_at=m.created_at,
        )

    @staticmethod
    def _to_model(u: User) -> UserModel:
        return UserModel(
            id=str(u.id),
            email=str(u.email),
            name=u.name,
            is_active=u.is_active,
            created_at=u.created_at,
        )
```

### `infrastructure/http/schemas/user_schemas.py`

```python
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str

    model_config = {"json_schema_extra": {"example": {"email": "alice@example.com", "name": "Alice"}}}


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    is_active: bool
    created_at: datetime
```

### `infrastructure/http/routers/users.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status

from application.dtos.user_dto import CreateUserCommand
from application.interfaces.user_repository import IUserRepository
from application.use_cases.create_user import CreateUserUseCase
from domain.exceptions import UserAlreadyExistsError
from infrastructure.http.schemas.user_schemas import CreateUserRequest, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


def get_user_repo() -> IUserRepository:
    """Override this dependency in main.py via app.dependency_overrides."""
    raise NotImplementedError


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
    operation_id="createUser",
)
async def create_user(
    body: CreateUserRequest,
    repo: IUserRepository = Depends(get_user_repo),
) -> UserResponse:
    use_case = CreateUserUseCase(repo)
    try:
        dto = await use_case.execute(CreateUserCommand(email=body.email, name=body.name))
    except UserAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return UserResponse(**vars(dto))
```

---

## 6. DI Wiring (`main.py`)

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from infrastructure.database.models.user_model import Base
from infrastructure.database.repositories.postgres_user_repository import (
    PostgresUserRepository,
)
from infrastructure.http.routers import users
from infrastructure.http.routers.users import get_user_repo

DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/db"

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(users.router, prefix="/v1")


async def _get_session() -> AsyncSession:  # type: ignore[return]
    async with SessionLocal() as session:
        yield session  # type: ignore[misc]


app.dependency_overrides[get_user_repo] = lambda: PostgresUserRepository(
    next(_get_session.__wrapped__())  # replaced at runtime by FastAPI
)
```

> **Tip**: In production, use `Depends(get_db_session)` properly and pass the session inside a factory dependency rather than using a lambda override.

---

## 7. Test with In-Memory Fake

```python
# tests/unit/use_cases/test_create_user.py
import pytest
from uuid import UUID

from application.dtos.user_dto import CreateUserCommand
from application.interfaces.user_repository import IUserRepository
from application.use_cases.create_user import CreateUserUseCase
from domain.entities.user import User
from domain.exceptions import UserAlreadyExistsError


class InMemoryUserRepository(IUserRepository):
    def __init__(self) -> None:
        self._store: dict[str, User] = {}

    async def find_by_id(self, user_id: UUID) -> User | None:
        return self._store.get(str(user_id))

    async def find_by_email(self, email: str) -> User | None:
        return next((u for u in self._store.values() if str(u.email) == email), None)

    async def save(self, user: User) -> None:
        self._store[str(user.id)] = user


@pytest.fixture
def repo() -> InMemoryUserRepository:
    return InMemoryUserRepository()


@pytest.fixture
def use_case(repo: InMemoryUserRepository) -> CreateUserUseCase:
    return CreateUserUseCase(repo)


@pytest.mark.asyncio
async def test_create_user_valid_data_returns_dto(use_case, repo):
    # Given
    cmd = CreateUserCommand(email="alice@example.com", name="Alice")

    # When
    dto = await use_case.execute(cmd)

    # Then
    assert dto.email == "alice@example.com"
    assert dto.name == "Alice"
    assert dto.is_active is True
    saved = await repo.find_by_email("alice@example.com")
    assert saved is not None


@pytest.mark.asyncio
async def test_create_user_duplicate_email_raises(use_case):
    # Given
    cmd = CreateUserCommand(email="alice@example.com", name="Alice")
    await use_case.execute(cmd)

    # When / Then
    with pytest.raises(UserAlreadyExistsError):
        await use_case.execute(cmd)
```
