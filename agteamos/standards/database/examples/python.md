# Database Patterns with SQLAlchemy 2.0 Async

All patterns use SQLAlchemy 2.0 with the async engine, `mapped_column`, and proper session lifecycle management.

---

## 1. Base Mixins

### `TimestampMixin` — UUID primary key + audit timestamps

```python
# infrastructure/database/mixins.py
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """Adds id (UUID), created_at, and updated_at to any model."""

    id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
```

---

## 2. Soft Delete

Use a `deleted_at` nullable timestamp instead of physical deletion. Apply a global query filter so deleted rows are invisible by default.

```python
# infrastructure/database/mixins.py  (continued)
from datetime import datetime, timezone
from sqlalchemy import DateTime, event
from sqlalchemy.orm import Mapped, mapped_column, Session


class SoftDeleteMixin:
    """Adds deleted_at; rows with a non-NULL value are considered deleted."""

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    def soft_delete(self) -> None:
        self.deleted_at = datetime.now(timezone.utc)

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
```

### Applying the filter at query time

```python
# infrastructure/database/repositories/base_repository.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database.mixins import SoftDeleteMixin


class SoftDeleteRepository[M: SoftDeleteMixin]:
    def __init__(self, session: AsyncSession, model_class: type[M]) -> None:
        self._session = session
        self._model = model_class

    async def find_active(self) -> list[M]:
        result = await self._session.execute(
            select(self._model).where(self._model.deleted_at.is_(None))
        )
        return list(result.scalars())

    async def find_all_including_deleted(self) -> list[M]:
        result = await self._session.execute(select(self._model))
        return list(result.scalars())
```

---

## 3. Session Management

### Engine + session factory

```python
# infrastructure/database/session.py
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/db"

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=False,        # set True during development
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

SessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)
```

### FastAPI dependency

```python
# infrastructure/http/dependencies.py
from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database.session import SessionLocal


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        async with session.begin():
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
```

---

## 4. Full Repository

```python
# infrastructure/database/repositories/postgres_order_repository.py
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from application.interfaces.order_repository import IOrderRepository
from domain.aggregates.order import Order
from infrastructure.database.mappers.order_mapper import OrderMapper
from infrastructure.database.models.order_model import OrderModel


class PostgresOrderRepository(IOrderRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, order_id: UUID) -> Order | None:
        model = await self._session.get(OrderModel, str(order_id))
        return OrderMapper.to_domain(model) if model and not model.is_deleted else None

    async def find_by_user(
        self,
        user_id: UUID,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Order], int]:
        """Returns (orders, total_count)."""
        base_stmt = (
            select(OrderModel)
            .where(
                OrderModel.customer_id == str(user_id),
                OrderModel.deleted_at.is_(None),
            )
        )

        count_result = await self._session.execute(
            select(func.count()).select_from(base_stmt.subquery())
        )
        total = count_result.scalar_one()

        page_result = await self._session.execute(
            base_stmt.order_by(OrderModel.created_at.desc()).limit(limit).offset(offset)
        )
        orders = [OrderMapper.to_domain(m) for m in page_result.scalars()]

        return orders, total

    async def save(self, order: Order) -> None:
        model = await self._session.get(OrderModel, str(order.id))
        if model is None:
            self._session.add(OrderMapper.to_model(order))
        else:
            OrderMapper.update_model(model, order)

    async def soft_delete(self, order_id: UUID) -> None:
        model = await self._session.get(OrderModel, str(order_id))
        if model:
            model.soft_delete()
```

---

## 5. Domain ↔ ORM Mappers

Mappers keep SQLAlchemy out of the domain layer entirely.

```python
# infrastructure/database/mappers/order_mapper.py
from decimal import Decimal
from uuid import UUID

from domain.aggregates.order import Order, OrderItem, OrderStatus
from domain.value_objects.money import Money
from infrastructure.database.models.order_model import OrderItemModel, OrderModel


class OrderMapper:
    @staticmethod
    def to_domain(model: OrderModel) -> Order:
        items = [
            OrderItem(
                id=UUID(i.id),
                product_id=UUID(i.product_id),
                quantity=i.quantity,
                unit_price=Money(Decimal(i.unit_price), i.currency),
            )
            for i in model.items
        ]
        return Order(
            id=UUID(model.id),
            customer_id=UUID(model.customer_id),
            status=OrderStatus(model.status),
            items=items,
            created_at=model.created_at,
        )

    @staticmethod
    def to_model(order: Order) -> OrderModel:
        model = OrderModel(
            id=str(order.id),
            customer_id=str(order.customer_id),
            status=order.status.value,
            created_at=order.created_at,
        )
        model.items = [
            OrderItemModel(
                id=str(i.id),
                order_id=str(order.id),
                product_id=str(i.product_id),
                quantity=i.quantity,
                unit_price=str(i.unit_price.amount),
                currency=i.unit_price.currency,
            )
            for i in order.items
        ]
        return model

    @staticmethod
    def update_model(model: OrderModel, order: Order) -> None:
        model.status = order.status.value
        # Re-sync items (simplified: delete and re-insert in production use orphan delete)
        model.items = [
            OrderItemModel(
                id=str(i.id),
                order_id=str(order.id),
                product_id=str(i.product_id),
                quantity=i.quantity,
                unit_price=str(i.unit_price.amount),
                currency=i.unit_price.currency,
            )
            for i in order.items
        ]
```

---

## 6. Alembic Migration — Expand-Contract

Never make a breaking schema change in a single migration. Use the **expand → backfill → contract** pattern.

### Step 1 — Expand (add nullable column, deploy)

```python
# migrations/versions/0001_expand_add_full_name.py
"""expand: add full_name nullable column"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None


def upgrade() -> None:
    op.add_column("users", sa.Column("full_name", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "full_name")
```

### Step 2 — Backfill in batches (data migration, deploy)

```python
# migrations/versions/0002_backfill_full_name.py
"""backfill: populate full_name from first_name + last_name"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"

BATCH_SIZE = 500


def upgrade() -> None:
    conn = op.get_bind()
    users = sa.table(
        "users",
        sa.column("id", sa.String),
        sa.column("first_name", sa.String),
        sa.column("last_name", sa.String),
        sa.column("full_name", sa.String),
    )

    offset = 0
    while True:
        rows = conn.execute(
            sa.select(users.c.id, users.c.first_name, users.c.last_name)
            .where(users.c.full_name.is_(None))
            .limit(BATCH_SIZE)
            .offset(offset)
        ).fetchall()

        if not rows:
            break

        for row in rows:
            conn.execute(
                users.update()
                .where(users.c.id == row.id)
                .values(full_name=f"{row.first_name} {row.last_name}".strip())
            )
        offset += BATCH_SIZE


def downgrade() -> None:
    pass  # no rollback for data backfills
```

### Step 3 — Contract (make NOT NULL, drop old columns, deploy)

```python
# migrations/versions/0003_contract_full_name.py
"""contract: make full_name NOT NULL, drop first_name/last_name"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"


def upgrade() -> None:
    op.alter_column("users", "full_name", nullable=False)
    op.drop_column("users", "first_name")
    op.drop_column("users", "last_name")


def downgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(100), nullable=True))
    op.alter_column("users", "full_name", nullable=True)
```

---

## 7. Query Safety — Never Interpolate User Input

### ❌ SQL Injection risk

```python
# NEVER DO THIS
async def find_by_status_bad(self, status: str) -> list[OrderModel]:
    # User-controlled `status` is interpolated directly into SQL
    result = await self._session.execute(
        text(f"SELECT * FROM orders WHERE status = '{status}'")  # ← INJECTION RISK
    )
    return result.fetchall()
```

### ✅ Always use parameterised queries

```python
from sqlalchemy import select, text


# Option A: ORM (preferred)
async def find_by_status_orm(self, status: str) -> list[OrderModel]:
    result = await self._session.execute(
        select(OrderModel).where(OrderModel.status == status)  # auto-parameterised
    )
    return list(result.scalars())


# Option B: text() with bound parameters (when raw SQL is necessary)
async def find_by_status_raw(self, status: str) -> list:
    result = await self._session.execute(
        text("SELECT * FROM orders WHERE status = :status"),
        {"status": status},  # ← bound parameter, never interpolated
    )
    return result.fetchall()
```

Always prefer the ORM. Use `text()` only for complex queries that can't be expressed via the ORM, and always bind parameters.
