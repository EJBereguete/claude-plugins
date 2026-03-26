# Python / pytest — Testing Reference

## 1. Naming convention: `test_{what}_{condition}_{result}`

```python
def test_create_user_valid_data_returns_user(): ...
def test_create_user_duplicate_email_raises_conflict(): ...
def test_get_order_not_found_raises_not_found_error(): ...
def test_calculate_total_empty_cart_returns_zero(): ...
def test_process_payment_insufficient_funds_raises_payment_error(): ...
```

---

## 2. Given / When / Then structure

```python
async def test_create_user_valid_data_returns_user(user_repo, use_case):
    # Given
    command = CreateUserCommand(email="alice@example.com", name="Alice")
    user_repo.find_by_email.return_value = None   # no duplicate

    # When
    result = await use_case.execute(command)

    # Then
    assert result.email == "alice@example.com"
    user_repo.save.assert_called_once()
```

---

## 3. factory_boy setup

```python
# tests/factories.py
import factory
from factory.faker import Faker
from app.domain.models import User, Order, OrderStatus

class UserFactory(factory.Factory):
    class Meta:
        model = User

    id    = factory.Sequence(lambda n: n + 1)
    email = Faker("email")
    name  = Faker("name")
    is_active = True

class OrderFactory(factory.Factory):
    class Meta:
        model = Order

    id     = factory.Sequence(lambda n: n + 1)
    user   = factory.SubFactory(UserFactory)
    status = OrderStatus.PENDING
    total  = factory.Faker("pydecimal", left_digits=4, right_digits=2, positive=True)
```

---

## 4. pytest fixtures

```python
# tests/conftest.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.application.use_cases import CreateUserUseCase
from tests.factories import OrderFactory

@pytest.fixture
def user_repo():
    repo = AsyncMock()
    repo.find_by_email = AsyncMock(return_value=None)
    repo.save          = AsyncMock()
    return repo

@pytest.fixture
def use_case(user_repo):
    return CreateUserUseCase(user_repository=user_repo)

@pytest.fixture
def pending_order():
    return OrderFactory(status="PENDING", total="99.99")
```

---

## 5. Unit test class — `TestCreateUserUseCase`

```python
# tests/unit/test_create_user_use_case.py
import pytest
from unittest.mock import AsyncMock
from app.application.use_cases import CreateUserUseCase
from app.application.commands  import CreateUserCommand
from app.domain.exceptions      import DuplicateEmailError, ValidationError
from tests.factories            import UserFactory

class TestCreateUserUseCase:

    # --- happy path ---
    async def test_execute_valid_data_returns_user(self, user_repo, use_case):
        command = CreateUserCommand(email="bob@example.com", name="Bob")
        user_repo.find_by_email.return_value = None

        result = await use_case.execute(command)

        assert result.email == "bob@example.com"
        user_repo.save.assert_called_once()

    # --- duplicate email ---
    async def test_execute_duplicate_email_raises_conflict(self, user_repo, use_case):
        existing = UserFactory(email="taken@example.com")
        user_repo.find_by_email.return_value = existing

        with pytest.raises(DuplicateEmailError):
            await use_case.execute(
                CreateUserCommand(email="taken@example.com", name="Eve")
            )
        user_repo.save.assert_not_called()

    # --- validation error ---
    @pytest.mark.parametrize("email", ["not-an-email", "", "a@", "@b.com"])
    async def test_execute_invalid_email_raises_validation_error(self, email, use_case):
        with pytest.raises(ValidationError, match="email"):
            await use_case.execute(
                CreateUserCommand(email=email, name="Test")
            )
```

---

## 6. Integration test — PostgresContainer (testcontainers)

```python
# tests/integration/test_user_repository.py
import pytest
import pytest_asyncio
from testcontainers.postgres import PostgresContainer
from sqlalchemy.ext.asyncio  import create_async_engine, AsyncSession
from sqlalchemy.orm          import sessionmaker
from app.infrastructure.db.models  import Base
from app.infrastructure.db.repos   import SqlAlchemyUserRepository
from tests.factories               import UserFactory

@pytest.fixture(scope="session")
def postgres():
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg

@pytest_asyncio.fixture
async def db_session(postgres):
    engine = create_async_engine(postgres.get_connection_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

async def test_save_and_retrieve_user(db_session):
    repo = SqlAlchemyUserRepository(db_session)
    user = UserFactory.build(email="int@example.com")

    await repo.save(user)
    found = await repo.find_by_email("int@example.com")

    assert found is not None
    assert found.email == user.email
```

---

## 7. Contract test (Pact) — consumer-driven

```python
# tests/contract/test_user_api_consumer.py
import pytest
from pact import Consumer, Provider

@pytest.fixture(scope="module")
def pact():
    pact = Consumer("frontend").has_pact_with(Provider("user-api"))
    pact.start_service()
    yield pact
    pact.stop_service()

def test_get_user_returns_expected_shape(pact):
    (
        pact
        .given("user 42 exists")
        .upon_receiving("a request for user 42")
        .with_request("GET", "/users/42")
        .will_respond_with(
            200,
            body={"id": 42, "email": pact.like("user@example.com"), "name": pact.like("Alice")},
        )
    )
    with pact:
        import requests
        response = requests.get(f"{pact.uri}/users/42")
        assert response.status_code == 200
        assert "email" in response.json()
```

---

## 8. Performance test (locust)

```python
# tests/performance/locustfile.py
from locust import HttpUser, task, between, constant_throughput
from locust import events

class UserApiUser(HttpUser):
    wait_time = between(0.5, 2)

    def on_start(self):
        resp = self.client.post("/auth/login", json={"email": "load@example.com", "password": "secret"})
        self.token = resp.json()["access_token"]

    @task(3)
    def get_profile(self):
        self.client.get("/users/me", headers={"Authorization": f"Bearer {self.token}"})

    @task(1)
    def create_order(self):
        self.client.post("/orders", json={"items": [{"sku": "A1", "qty": 2}]},
                         headers={"Authorization": f"Bearer {self.token}"})

# Run: locust -f locustfile.py --headless -u 100 -r 10 --run-time 2m \
#            --host http://localhost:8000 \
#            --exit-code-on-error 1 \
#            --csv results
```

---

## 9. Coverage config (`pyproject.toml`)

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths    = ["tests"]
addopts      = "-v --tb=short --cov=app --cov-report=term-missing --cov-report=xml"

[tool.coverage.run]
source   = ["app"]
omit     = ["app/main.py", "app/migrations/*", "**/__init__.py"]
branch   = true

[tool.coverage.report]
fail_under = 80
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
```
