# Python / Alembic — DB Migrations Reference

## 1. Alembic commands

```bash
# Initialise Alembic in the project
alembic init alembic

# Auto-generate migration from model changes
alembic revision --autogenerate -m "add_users_table"

# Apply all pending migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1

# Rollback to a specific revision
alembic downgrade abc123de

# Show migration history
alembic history --verbose

# Show current applied revision
alembic current

# Generate a raw SQL script (no DB connection needed)
alembic upgrade head --sql > migration.sql
```

---

## 2. Migration template

```python
# alembic/versions/20240801_120000_add_users_table.py
"""add users table

Revision ID: 3a7f9b2c1d4e
Revises:     <previous_revision>
Create Date: 2024-08-01 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "3a7f9b2c1d4e"
down_revision = None          # set to previous revision id if not the first
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id",         sa.UUID(),          primary_key=True),
        sa.Column("email",      sa.String(255),     nullable=False, unique=True),
        sa.Column("name",       sa.String(255),     nullable=False),
        sa.Column("is_active",  sa.Boolean(),       nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"])


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
```

---

## 3. Expand-Contract pattern

### Phase 1 — Add column, backfill, add NOT NULL constraint

```python
# Phase 1: add nullable column + backfill
def upgrade() -> None:
    op.execute("SET lock_timeout = '5s'")

    # Step 1: add column as nullable
    op.add_column("users", sa.Column("full_name", sa.String(500), nullable=True))

    # Step 2: backfill existing rows
    op.execute("""
        UPDATE users
        SET    full_name = first_name || ' ' || last_name
        WHERE  full_name IS NULL
    """)

    # Step 3: enforce NOT NULL now that all rows have a value
    op.alter_column("users", "full_name", nullable=False)

def downgrade() -> None:
    op.drop_column("users", "full_name")
```

### Phase 3 — Drop old columns (after app no longer reads them)

```python
def upgrade() -> None:
    op.execute("SET lock_timeout = '5s'")
    op.drop_column("users", "first_name")
    op.drop_column("users", "last_name")

def downgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("last_name",  sa.String(255), nullable=True))
```

---

## 4. Batch backfill — full loop pattern

```python
import time
from alembic import op

BATCH_SIZE = 10_000

def upgrade() -> None:
    conn = op.get_bind()

    while True:
        result = conn.execute(sa.text("""
            UPDATE users
            SET    full_name = first_name || ' ' || last_name
            WHERE  full_name IS NULL
              AND  id IN (
                  SELECT id FROM users
                  WHERE  full_name IS NULL
                  LIMIT  :batch_size
                  FOR UPDATE SKIP LOCKED
              )
            RETURNING id
        """), {"batch_size": BATCH_SIZE})

        updated = result.rowcount
        print(f"Backfilled {updated} rows")

        if updated < BATCH_SIZE:
            break                      # done

        time.sleep(0.1)                # yield to avoid lock contention
```

---

## 5. Lock timeouts

```python
def upgrade() -> None:
    # Always set lock_timeout before any DDL on a production table
    op.execute("SET lock_timeout = '5s'")
    op.execute("SET statement_timeout = '60s'")

    op.add_column("orders", sa.Column("shipped_at", sa.DateTime(timezone=True), nullable=True))
    # If the lock cannot be acquired in 5 s, the statement fails fast instead of
    # blocking all other queries for an indeterminate time.

def downgrade() -> None:
    op.execute("SET lock_timeout = '5s'")
    op.drop_column("orders", "shipped_at")
```

---

## 6. Soft delete mixin (SQLAlchemy)

```python
# app/infrastructure/db/mixins.py
from datetime import datetime, timezone
from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column

class SoftDeleteMixin:
    """Adds soft-delete semantics to any mapped class."""

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        if self.is_deleted:
            raise ValueError("Already deleted")
        self.deleted_at = datetime.now(tz=timezone.utc)

    def restore(self) -> None:
        self.deleted_at = None


# app/infrastructure/db/models.py
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase): ...

class User(SoftDeleteMixin, Base):
    __tablename__ = "users"

    id:         Mapped[int]   = mapped_column(primary_key=True)
    email:      Mapped[str]   = mapped_column(unique=True)
    name:       Mapped[str]


# Repository — filter out soft-deleted rows by default
class SqlAlchemyUserRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def find_active(self) -> list[User]:
        result = await self._session.execute(
            select(User).where(User.deleted_at.is_(None))
        )
        return list(result.scalars())
```

---

## 7. Index strategy

```python
# In migration — CONCURRENTLY avoids table lock (PostgreSQL only)
def upgrade() -> None:
    # Standard index
    op.create_index("ix_orders_user_id", "orders", ["user_id"])

    # Partial index — only index active records
    op.execute("""
        CREATE INDEX CONCURRENTLY ix_users_email_active
        ON users (email)
        WHERE deleted_at IS NULL
    """)

    # Composite index for common query pattern
    op.execute("""
        CREATE INDEX CONCURRENTLY ix_orders_user_status
        ON orders (user_id, status)
        WHERE deleted_at IS NULL
    """)

def downgrade() -> None:
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_orders_user_status")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_users_email_active")
    op.drop_index("ix_orders_user_id", table_name="orders")
```
