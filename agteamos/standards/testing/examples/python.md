# Testing in Python with pytest

Production-grade testing patterns: naming conventions, test structure, factories, fixtures, unit tests, integration tests, mocking external services, and pytest configuration.

---

## 1. Naming Convention

Use the format `test_{what}_{condition}_{expected_result}`:

```python
# ✅ Good names — self-documenting
def test_create_user_valid_email_returns_user_dto(): ...
def test_create_user_duplicate_email_raises_conflict(): ...
def test_place_order_empty_items_raises_value_error(): ...
def test_calculate_discount_vip_customer_applies_20_percent(): ...

# ❌ Bad names — meaningless
def test_user(): ...
def test_create(): ...
def test_1(): ...
```

---

## 2. Given / When / Then Structure

Every test must have explicit `# Given`, `# When`, and `# Then` sections.

```python
import pytest
from decimal import Decimal
from uuid import uuid4

from domain.aggregates.order import Order
from domain.value_objects.money import Money


def test_place_order_valid_items_changes_status_to_placed():
    # Given
    order = Order(customer_id=uuid4())
    order.add_item(
        product_id=uuid4(),
        quantity=2,
        unit_price=Money(Decimal("25.00"), "USD"),
    )

    # When
    order.place()

    # Then
    assert order.status.value == "placed"


def test_place_order_empty_items_raises_value_error():
    # Given
    order = Order(customer_id=uuid4())

    # When / Then
    with pytest.raises(ValueError, match="empty"):
        order.place()
```

---

## 3. factory_boy — Test Object Factories

Factories eliminate repetitive fixture setup and produce realistic data.

```python
# tests/factories.py
import factory
from factory import LazyAttribute, LazyFunction, SubFactory
from factory.alchemy import SQLAlchemyModelFactory
from decimal import Decimal
from uuid import uuid4
from datetime import datetime, timezone

from infrastructure.database.models.user_model import UserModel
from infrastructure.database.models.order_model import OrderModel, OrderItemModel


class UserFactory(SQLAlchemyModelFactory):
    class Meta:
        model = UserModel
        sqlalchemy_session_persistence = "commit"

    id = LazyFunction(lambda: str(uuid4()))
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    name = factory.Faker("name")
    is_active = True
    created_at = LazyFunction(lambda: datetime.now(timezone.utc))


class OrderItemFactory(factory.Factory):
    class Meta:
        model = OrderItemModel

    id = LazyFunction(lambda: str(uuid4()))
    product_id = LazyFunction(lambda: str(uuid4()))
    quantity = factory.Faker("random_int", min=1, max=10)
    unit_price = "19.99"
    currency = "USD"


class OrderFactory(SQLAlchemyModelFactory):
    class Meta:
        model = OrderModel
        sqlalchemy_session_persistence = "commit"

    id = LazyFunction(lambda: str(uuid4()))
    customer_id = LazyFunction(lambda: str(uuid4()))
    status = "draft"
    created_at = LazyFunction(lambda: datetime.now(timezone.utc))
```

### Usage

```python
# build() — in-memory only, no DB hit
user = UserFactory.build(email="custom@example.com")

# create() — persists to DB (requires session)
order = OrderFactory.create(status="placed")

# batch creation
users = UserFactory.create_batch(5, is_active=True)
```

---

## 4. Fixtures — `conftest.py`

```python
# tests/conftest.py
import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from infrastructure.database.mixins import Base
from infrastructure.http.dependencies import get_db_session
from main import app

TEST_DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/test_db"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    eng = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Each test runs inside a transaction that is rolled back afterwards."""
    async with engine.connect() as conn:
        await conn.begin()
        session_factory = async_sessionmaker(conn, expire_on_commit=False)
        async with session_factory() as session:
            yield session
        await conn.rollback()


@pytest_asyncio.fixture
async def auth_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient with DB session override and a pre-authenticated user."""

    async def override_session():
        yield db_session

    app.dependency_overrides[get_db_session] = override_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": "Bearer test-token"},
    ) as client:
        yield client

    app.dependency_overrides.clear()
```

---

## 5. Unit Test — Service with AsyncMock

```python
# tests/unit/use_cases/test_create_user.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from application.dtos.user_dto import CreateUserCommand
from application.interfaces.user_repository import IUserRepository
from application.use_cases.create_user import CreateUserUseCase
from domain.exceptions import UserAlreadyExistsError


@pytest.fixture
def mock_repo() -> IUserRepository:
    repo = MagicMock(spec=IUserRepository)
    repo.find_by_email = AsyncMock(return_value=None)
    repo.save = AsyncMock()
    return repo


@pytest.fixture
def use_case(mock_repo: IUserRepository) -> CreateUserUseCase:
    return CreateUserUseCase(mock_repo)


@pytest.mark.asyncio
async def test_create_user_new_email_saves_and_returns_dto(use_case, mock_repo):
    # Given
    cmd = CreateUserCommand(email="alice@example.com", name="Alice")

    # When
    dto = await use_case.execute(cmd)

    # Then
    assert dto.email == "alice@example.com"
    mock_repo.save.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_user_existing_email_raises_conflict(use_case, mock_repo):
    # Given
    from domain.entities.user import User
    mock_repo.find_by_email = AsyncMock(return_value=User.create("alice@example.com", "Alice"))
    cmd = CreateUserCommand(email="alice@example.com", name="Alice Duplicate")

    # When / Then
    with pytest.raises(UserAlreadyExistsError):
        await use_case.execute(cmd)

    mock_repo.save.assert_not_awaited()
```

---

## 6. Integration Test — Real DB with pytest-asyncio

```python
# tests/integration/test_order_repository.py
import pytest
import pytest_asyncio
from decimal import Decimal
from uuid import uuid4

from domain.aggregates.order import Order
from domain.value_objects.money import Money
from infrastructure.database.repositories.postgres_order_repository import (
    PostgresOrderRepository,
)


@pytest_asyncio.fixture
async def order_repo(db_session):
    return PostgresOrderRepository(db_session)


@pytest.mark.asyncio
async def test_save_and_find_order(order_repo):
    # Given
    customer_id = uuid4()
    order = Order(customer_id=customer_id)
    order.add_item(uuid4(), quantity=3, unit_price=Money(Decimal("10.00"), "USD"))

    # When
    await order_repo.save(order)
    fetched = await order_repo.find_by_id(order.id)

    # Then
    assert fetched is not None
    assert fetched.id == order.id
    assert len(fetched.items) == 1
    assert fetched.total() == Money(Decimal("30.00"), "USD")


@pytest.mark.asyncio
async def test_soft_delete_hides_order(order_repo):
    # Given
    order = Order(customer_id=uuid4())
    order.add_item(uuid4(), quantity=1, unit_price=Money(Decimal("5.00"), "USD"))
    await order_repo.save(order)

    # When
    await order_repo.soft_delete(order.id)
    fetched = await order_repo.find_by_id(order.id)

    # Then
    assert fetched is None
```

---

## 7. Mocking External Services

### Stripe

```python
# tests/unit/services/test_payment_service.py
import pytest
from unittest.mock import patch, MagicMock

from application.services.payment_service import PaymentService


@pytest.fixture
def payment_service():
    return PaymentService(api_key="sk_test_fake")


def test_charge_valid_card_returns_charge_id(payment_service):
    # Given
    mock_charge = MagicMock()
    mock_charge.id = "ch_test_123"

    # When
    with patch("stripe.Charge.create", return_value=mock_charge) as mock_stripe:
        result = payment_service.charge(amount=1000, currency="usd", token="tok_visa")

    # Then
    assert result == "ch_test_123"
    mock_stripe.assert_called_once_with(amount=1000, currency="usd", source="tok_visa")


def test_charge_declined_card_raises_payment_error(payment_service):
    # Given
    import stripe
    # When / Then
    with patch("stripe.Charge.create", side_effect=stripe.error.CardError("Declined", None, "card_declined")):
        from application.exceptions import PaymentDeclinedError
        with pytest.raises(PaymentDeclinedError):
            payment_service.charge(amount=1000, currency="usd", token="tok_chargeDeclined")
```

### Sendgrid / HTTP with `httpx` mock

```python
# tests/unit/services/test_email_service.py
import pytest
import httpx
import respx

from application.services.email_service import EmailService


@pytest.fixture
def email_service():
    return EmailService(api_key="SG.test", sender="noreply@example.com")


@pytest.mark.asyncio
@respx.mock
async def test_send_email_success(email_service):
    # Given
    respx.post("https://api.sendgrid.com/v3/mail/send").mock(
        return_value=httpx.Response(202)
    )

    # When
    await email_service.send(to="user@example.com", subject="Hello", body="World")

    # Then
    assert respx.calls.called
```

---

## 8. `pyproject.toml` — pytest & coverage config

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = [
    "--strict-markers",
    "--tb=short",
    "-q",
]
markers = [
    "unit: fast, no external dependencies",
    "integration: requires a real database",
    "e2e: full stack tests",
]

[tool.coverage.run]
source = ["src"]
omit = [
    "src/main.py",
    "src/infrastructure/database/migrations/*",
]

[tool.coverage.report]
fail_under = 80
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "\\.\\.\\.",
]
```

Run with:

```bash
pytest --cov=src --cov-report=term-missing -m "unit"
pytest --cov=src --cov-report=term-missing -m "integration"
```

---

## 9. Anti-Patterns to Avoid

### ❌ Testing implementation details

```python
# BAD — tests internal call sequence, not observable behaviour
def test_create_user_calls_repo_save(use_case, mock_repo):
    await use_case.execute(cmd)
    mock_repo.save.assert_called_once()   # fragile: breaks if rename save → persist
```

Prefer asserting on the **returned value** or **state change** visible from outside.

### ❌ Order-dependent tests

```python
# BAD — test_b assumes test_a ran first
class TestUserWorkflow:
    user_id = None

    def test_a_create_user(self):
        TestUserWorkflow.user_id = create_user()

    def test_b_get_user(self):
        get_user(TestUserWorkflow.user_id)  # breaks if tests run in different order
```

Each test must be fully **self-contained**. Use fixtures to set up state.

### ❌ Magic sleep in async tests

```python
# BAD
async def test_event_published():
    publisher.publish(event)
    await asyncio.sleep(1)   # flaky: timing-dependent
    assert handler.called
```

Use awaitable event primitives or synchronous assertions instead.

### ✅ Self-contained, behaviour-driven tests

```python
@pytest.mark.asyncio
async def test_place_order_publishes_order_placed_event(use_case, order_repo):
    # Given
    order = await order_repo.create_draft(customer_id=uuid4())

    # When
    await use_case.execute(order.id)

    # Then — assert observable state, not implementation
    placed = await order_repo.find_by_id(order.id)
    assert placed.status.value == "placed"
```
