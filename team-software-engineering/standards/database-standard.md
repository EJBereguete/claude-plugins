# Database Standard

PostgreSQL standards for the team. These rules apply to all production databases. Migrations, naming, indexing, and query safety are non-negotiable — everything else is a strong default.

---

## Naming Conventions

| Object | Convention | Example |
|---|---|---|
| Tables | `snake_case`, plural | `users`, `invoices`, `invoice_items` |
| Columns | `snake_case` | `created_at`, `user_id`, `first_name` |
| Primary key | `id` | `id` |
| Foreign keys | `{referenced_table_singular}_id` | `user_id`, `invoice_id`, `order_item_id` |
| Indexes | `idx_{table}_{columns}` | `idx_users_email`, `idx_invoices_user_id_status` |
| Unique constraints | `uq_{table}_{columns}` | `uq_users_email`, `uq_invoices_reference_number` |
| Check constraints | `ck_{table}_{constraint}` | `ck_invoices_amount_positive`, `ck_users_role_valid` |
| Sequences | `{table}_{column}_seq` | `invoices_number_seq` |

---

## Required Columns for Every Table

Every table in production must have these three columns:

```sql
CREATE TABLE invoices (
    id          UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()             NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()             NOT NULL,

    -- domain columns follow
    user_id     UUID                                               NOT NULL,
    amount      NUMERIC(12, 2)                                     NOT NULL
);
```

Keep `updated_at` in sync with a trigger rather than relying on application code:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_set_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**SQLAlchemy mixin:**

```python
# src/shared/db/mixins.py
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
```

---

## Soft Delete

Never hard-delete user or business data. Use a `deleted_at` column.

```sql
ALTER TABLE invoices ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
-- NULL means active. Non-NULL means soft-deleted.
```

Full table definition example:

```sql
CREATE TABLE invoices (
    id          UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()             NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()             NOT NULL,
    deleted_at  TIMESTAMP WITH TIME ZONE,                          -- NULL = active

    user_id     UUID                                               NOT NULL REFERENCES users(id),
    amount      NUMERIC(12, 2)                                     NOT NULL,
    status      TEXT                                               NOT NULL DEFAULT 'draft',

    CONSTRAINT ck_invoices_amount_positive CHECK (amount > 0),
    CONSTRAINT ck_invoices_status_valid    CHECK (status IN ('draft','sent','paid','cancelled','overdue'))
);
```

Add a partial index so queries on active records are fast:

```sql
-- Only active records in the index — much smaller and faster
CREATE INDEX idx_invoices_user_id_active
    ON invoices(user_id)
    WHERE deleted_at IS NULL;
```

**SQLAlchemy soft delete pattern:**

```python
# src/billing/infrastructure/models.py
from datetime import datetime, timezone
from sqlalchemy import DateTime, Numeric, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.db.mixins import Base, TimestampMixin


class InvoiceModel(TimestampMixin, Base):
    __tablename__ = "invoices"

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="draft")

    def soft_delete(self) -> None:
        self.deleted_at = datetime.now(timezone.utc)

    @property
    def is_active(self) -> bool:
        return self.deleted_at is None
```

**Repository query always filters deleted:**

```python
# src/billing/infrastructure/db_repository.py
from sqlalchemy import select

async def find_by_user(self, user_id: str) -> list[InvoiceModel]:
    result = await self._session.execute(
        select(InvoiceModel)
        .where(
            InvoiceModel.user_id == user_id,
            InvoiceModel.deleted_at.is_(None),   # always filter soft-deleted
        )
        .order_by(InvoiceModel.created_at.desc())
    )
    return list(result.scalars().all())
```

---

## Migrations — Expand-Contract Pattern

Never make destructive schema changes in a single migration. Use the Expand-Contract pattern to keep zero-downtime deployments safe.

**Rules:**
- NEVER rename a column directly — add, copy, remove in phases
- NEVER drop a column without a deprecation period (minimum one full deploy cycle)
- NEVER change a column type destructively (e.g., `TEXT` to `INTEGER`) in one step
- NEVER add a NOT NULL column without a default or a backfill migration

### Step-by-step example: renaming `user_name` to `full_name`

**Phase 1 — Expand: add the new column, keep the old one**

```sql
-- Migration: 20240901_001_add_full_name_to_users.sql
ALTER TABLE users ADD COLUMN full_name TEXT;

-- Backfill existing data
UPDATE users SET full_name = user_name WHERE full_name IS NULL;

-- NOT NULL after backfill is safe
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;
```

Deploy application code that writes to **both** `user_name` and `full_name`, reads from `full_name`.

**Phase 2 — Contract: remove the old column after all code is migrated**

```sql
-- Migration: 20240915_001_drop_user_name_from_users.sql
-- Only run after verifying no code reads user_name anymore
ALTER TABLE users DROP COLUMN user_name;
```

**Alembic migration for Phase 1:**

```python
# alembic/versions/20240901_001_add_full_name_to_users.py
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    # Step 1: add nullable column
    op.add_column("users", sa.Column("full_name", sa.Text, nullable=True))

    # Step 2: backfill from old column
    op.execute("UPDATE users SET full_name = user_name WHERE full_name IS NULL")

    # Step 3: make NOT NULL now that all rows have data
    op.alter_column("users", "full_name", nullable=False)


def downgrade() -> None:
    op.drop_column("users", "full_name")
```

---

## Index Strategy

### Rules

1. **Index every foreign key column** — PostgreSQL does not do this automatically, unlike MySQL.
2. **Composite indexes:** put the most selective column first.
3. **Partial indexes** for common filtered queries.
4. **NEVER create an index on a boolean column alone** — two distinct values make the index useless.
5. Review `EXPLAIN ANALYZE` before and after adding an index to confirm it is used.

```sql
-- Foreign key indexes (do this for every FK)
CREATE INDEX idx_invoices_user_id      ON invoices(user_id);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Composite index — user_id first (most selective), then status
CREATE INDEX idx_invoices_user_id_status
    ON invoices(user_id, status)
    WHERE deleted_at IS NULL;   -- partial: only active records

-- Partial index for a common query pattern
CREATE INDEX idx_invoices_overdue
    ON invoices(due_date)
    WHERE status = 'sent' AND deleted_at IS NULL;

-- ❌ BAD — boolean index with no filtering value
CREATE INDEX idx_users_is_active ON users(is_active);
-- This index is never selective enough to be useful
```

### EXPLAIN ANALYZE before/after

```sql
-- Before index:
EXPLAIN ANALYZE
SELECT * FROM invoices
WHERE user_id = 'abc123' AND status = 'paid' AND deleted_at IS NULL;

-- Output (bad):
-- Seq Scan on invoices  (cost=0.00..4821.00 rows=3 width=312) (actual time=0.123..45.231 rows=3)
--   Filter: ((user_id = 'abc123') AND (status = 'paid') AND (deleted_at IS NULL))
-- Planning Time: 0.4 ms
-- Execution Time: 45.8 ms

-- After: CREATE INDEX idx_invoices_user_id_status ON invoices(user_id, status) WHERE deleted_at IS NULL;
EXPLAIN ANALYZE
SELECT * FROM invoices
WHERE user_id = 'abc123' AND status = 'paid' AND deleted_at IS NULL;

-- Output (good):
-- Index Scan using idx_invoices_user_id_status on invoices  (cost=0.42..8.46 rows=3 width=312) (actual time=0.021..0.031 rows=3)
--   Index Cond: ((user_id = 'abc123') AND (status = 'paid'))
-- Planning Time: 0.3 ms
-- Execution Time: 0.1 ms
```

---

## Query Safety

**Never use string interpolation to build SQL queries.** This is a SQL injection vulnerability.

### ❌ BAD — SQL injection vulnerability

```python
# src/users/repository.py

# NEVER do this
async def find_by_email(self, email: str) -> UserModel | None:
    query = f"SELECT * FROM users WHERE email = '{email}'"   # injection risk
    result = await self._session.execute(text(query))
    return result.fetchone()

# Attacker input: "' OR '1'='1'; DROP TABLE users; --"
# Resulting query: SELECT * FROM users WHERE email = '' OR '1'='1'; DROP TABLE users; --'
```

```typescript
// src/users/userRepository.ts

// NEVER do this
async findByEmail(email: string): Promise<User | null> {
  const result = await this.db.query(`SELECT * FROM users WHERE email = '${email}'`)
  // SQL injection: input "' OR 1=1 --" returns all users
  return result.rows[0] ?? null
}
```

### ✅ GOOD — Parameterized queries

```python
# src/users/repository.py
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from src.users.infrastructure.models import UserModel


class PostgreSQLUserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # Option 1: SQLAlchemy ORM (preferred — no SQL injection possible)
    async def find_by_email(self, email: str) -> UserModel | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.email == email)
        )
        return result.scalar_one_or_none()

    # Option 2: Raw SQL with named parameters (when ORM is insufficient)
    async def find_by_email_raw(self, email: str) -> UserModel | None:
        result = await self._session.execute(
            text("SELECT * FROM users WHERE email = :email AND deleted_at IS NULL"),
            {"email": email},   # ← bound parameter, never interpolated
        )
        return result.fetchone()
```

```typescript
// src/users/userRepository.ts
import { Pool } from "pg"

class PostgreSQLUserRepository implements IUserRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<User | null> {
    // $1 is a positional parameter — never interpolated into the query string
    const result = await this.pool.query(
      "SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL",
      [email],
    )
    return result.rows[0] ? toDomain(result.rows[0]) : null
  }
}
```

---

## SQLAlchemy Patterns

### Async session management

**`src/shared/db/session.py`**
```python
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.shared.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG,
)

AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,   # prevents lazy-load errors after commit
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

**`src/shared/db/dependencies.py`**
```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.shared.db.session import get_db
from src.billing.infrastructure.db_repository import PostgreSQLInvoiceRepository
from src.billing.application.services import InvoiceService


def get_invoice_repository(db: AsyncSession = Depends(get_db)) -> PostgreSQLInvoiceRepository:
    return PostgreSQLInvoiceRepository(db)


def get_invoice_service(
    repo: PostgreSQLInvoiceRepository = Depends(get_invoice_repository),
) -> InvoiceService:
    return InvoiceService(repo=repo)
```

### Full repository example with async SQLAlchemy 2.0

**`src/billing/infrastructure/db_repository.py`**
```python
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func, update
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
                InvoiceModel.id == str(invoice_id),
                InvoiceModel.deleted_at.is_(None),
            )
        )
        model = result.scalar_one_or_none()
        return to_domain(model) if model else None

    async def find_by_user(
        self, user_id: UUID, *, page: int = 1, per_page: int = 20
    ) -> PaginatedResult[Invoice]:
        base_filter = (
            InvoiceModel.user_id == str(user_id),
            InvoiceModel.deleted_at.is_(None),
        )

        total_result = await self._session.execute(
            select(func.count()).select_from(InvoiceModel).where(*base_filter)
        )
        total = total_result.scalar_one()

        rows_result = await self._session.execute(
            select(InvoiceModel)
            .where(*base_filter)
            .order_by(InvoiceModel.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        items = [to_domain(m) for m in rows_result.scalars().all()]

        return PaginatedResult(items=items, total=total, page=page, per_page=per_page)

    async def save(self, invoice: Invoice) -> Invoice:
        model = to_model(invoice)
        merged = await self._session.merge(model)
        await self._session.flush()
        await self._session.refresh(merged)
        return to_domain(merged)

    async def delete(self, invoice_id: UUID) -> None:
        await self._session.execute(
            update(InvoiceModel)
            .where(InvoiceModel.id == str(invoice_id))
            .values(deleted_at=datetime.now(timezone.utc))
        )
        await self._session.flush()
```

### Mapper functions — keep ORM models out of the domain

**`src/billing/infrastructure/mappers.py`**
```python
from decimal import Decimal
from src.billing.domain.entities import Invoice
from src.billing.domain.value_objects import Money, Email, InvoiceStatus
from src.billing.infrastructure.models import InvoiceModel


def to_domain(model: InvoiceModel) -> Invoice:
    return Invoice(
        id=model.id,
        user_id=model.user_id,
        client_email=Email(model.client_email),
        subtotal=Money(amount=Decimal(str(model.subtotal)), currency=model.currency),
        discount_rate=Decimal(str(model.discount_rate)),
        status=InvoiceStatus(model.status),
        created_at=model.created_at,
        paid_at=model.paid_at,
    )


def to_model(invoice: Invoice) -> InvoiceModel:
    return InvoiceModel(
        id=str(invoice.id),
        user_id=str(invoice.user_id),
        client_email=str(invoice.client_email),
        subtotal=float(invoice.subtotal.amount),
        currency=invoice.subtotal.currency,
        discount_rate=float(invoice.discount_rate),
        status=invoice.status.value,
        created_at=invoice.created_at,
        paid_at=invoice.paid_at,
    )
```

Domain entities never import from `infrastructure/`. The mapper is the only file that knows both sides.
