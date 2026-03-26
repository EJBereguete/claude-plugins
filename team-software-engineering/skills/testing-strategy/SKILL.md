# Skill: Testing Strategy (Expert Level)

## Pirámide de testing — distribución recomendada

```
         E2E & Visual Regression (5-10%)
        /                               \
      Contract & Integration (20-25%)
     /                                   \
   Unit Tests (60-70%)
```

| Capa | % recomendado | Velocidad | Confianza |
|------|---------------|-----------|-----------|
| Unit | 60-70% | Milisegundos | Lógica aislada |
| Integration | 20-25% | Segundos | Componentes juntos |
| E2E | 5-10% | Minutos | Flujos críticos |

---

## Naming conventions — Given/When/Then

**Python/pytest:**
```python
# Patrón: test_{lo_que_se_prueba}_{condicion}_{resultado_esperado}
def test_create_user_with_valid_data_returns_user_dto():
    # Given
    data = CreateUserDTO(name="John", email="john@example.com")

    # When
    result = use_case.execute(data)

    # Then
    assert result.id is not None
    assert result.email == "john@example.com"

def test_create_user_with_duplicate_email_raises_conflict_error():
    # Given
    existing_user = UserFactory(email="john@example.com")
    data = CreateUserDTO(name="Jane", email="john@example.com")

    # When / Then
    with pytest.raises(DuplicateEmailError):
        use_case.execute(data)

def test_create_user_with_invalid_email_raises_validation_error():
    # Given
    data = CreateUserDTO(name="John", email="not-an-email")

    # When / Then
    with pytest.raises(ValueError, match="Invalid email"):
        use_case.execute(data)
```

**TypeScript/Jest/Vitest:**
```typescript
describe('CreateUserUseCase', () => {
  describe('when email is valid', () => {
    it('should return a UserDTO with a generated id', async () => {
      // Given
      const dto = { name: 'John', email: 'john@example.com' }

      // When
      const result = await useCase.execute(dto)

      // Then
      expect(result.id).toBeDefined()
      expect(result.email).toBe('john@example.com')
    })
  })

  describe('when email is already registered', () => {
    it('should throw DuplicateEmailError', async () => {
      // Given
      userRepo.findByEmail.mockResolvedValue(existingUser)

      // When / Then
      await expect(useCase.execute({ email: 'existing@test.com' }))
        .rejects.toThrow(DuplicateEmailError)
    })
  })
})
```

**C# / xUnit + FluentAssertions:**
```csharp
// Patrón: MethodName_Condition_ExpectedResult
public class CreateUserUseCaseTests
{
    private readonly Mock<IUserRepository> _repoMock = new();
    private readonly CreateUserUseCase _sut;

    public CreateUserUseCaseTests()
    {
        _sut = new CreateUserUseCase(_repoMock.Object);
    }

    [Fact]
    public async Task ExecuteAsync_WithValidData_ReturnsUserDto()
    {
        // Given
        var dto = new CreateUserDto("John", "john@example.com");
        _repoMock.Setup(r => r.FindByEmailAsync(dto.Email)).ReturnsAsync((User?)null);

        // When
        var result = await _sut.ExecuteAsync(dto);

        // Then
        result.IsSuccess.Should().BeTrue();
        result.Value.Email.Should().Be("john@example.com");
        _repoMock.Verify(r => r.SaveAsync(It.IsAny<User>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WithDuplicateEmail_ReturnsFailure()
    {
        // Given
        var existingUser = UserBuilder.New().WithEmail("john@example.com").Build();
        _repoMock.Setup(r => r.FindByEmailAsync("john@example.com"))
                 .ReturnsAsync(existingUser);
        var dto = new CreateUserDto("Jane", "john@example.com");

        // When
        var result = await _sut.ExecuteAsync(dto);

        // Then
        result.IsFailed.Should().BeTrue();
        result.Errors.Should().ContainSingle(e => e is DuplicateEmailError);
        _repoMock.Verify(r => r.SaveAsync(It.IsAny<User>()), Times.Never);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    [InlineData("@missing-local.com")]
    public async Task ExecuteAsync_WithInvalidEmail_ReturnsValidationError(string invalidEmail)
    {
        // Given
        var dto = new CreateUserDto("John", invalidEmail);

        // When
        var result = await _sut.ExecuteAsync(dto);

        // Then
        result.IsFailed.Should().BeTrue();
        result.Errors.Should().ContainSingle(e => e is ValidationError);
    }
}
```

---

## Test Data Management

### Python — factory_boy

```python
import factory
from factory import Faker
from uuid import uuid4

class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.LazyFunction(uuid4)
    name = Faker("name")
    email = Faker("email")
    created_at = Faker("date_time_this_year")

class OrderFactory(factory.Factory):
    class Meta:
        model = Order

    id = factory.LazyFunction(uuid4)
    customer = factory.SubFactory(UserFactory)
    total = factory.LazyAttribute(lambda _: Money(100.0, "USD"))
    status = "pending"

# Uso en tests
def test_order_confirm_sets_status_confirmed():
    # Given
    order = OrderFactory(items=[OrderItemFactory(), OrderItemFactory()])

    # When
    order.confirm()

    # Then
    assert order.status == "confirmed"

# Fixtures reutilizables con pytest
@pytest.fixture
def pending_order():
    return OrderFactory(status="pending")

@pytest.fixture
def user_with_orders():
    user = UserFactory()
    orders = OrderFactory.create_batch(3, customer=user)
    return user, orders
```

### TypeScript — patrón factory

```typescript
// test/factories/userFactory.ts
import { v4 as uuidv4 } from 'uuid'
import type { User } from '@/domain/entities/User'

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: uuidv4(),
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date('2024-01-01'),
    ...overrides,  // permite sobreescribir campos específicos
  }
}

// Uso en tests
it('should update user email', () => {
  const user = createUser({ email: 'old@example.com' })
  user.changeEmail('new@example.com')
  expect(user.email).toBe('new@example.com')
})
```

---

## Unit Tests — backend Python

```python
# tests/unit/use_cases/test_create_user.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from application.use_cases.create_user import CreateUserUseCase
from application.dtos.user_dto import CreateUserDTO
from domain.exceptions import DuplicateEmailError

@pytest.fixture
def user_repo():
    repo = AsyncMock()
    repo.find_by_email.return_value = None  # default: no user found
    return repo

@pytest.fixture
def use_case(user_repo):
    return CreateUserUseCase(user_repo=user_repo)

class TestCreateUserUseCase:
    async def test_happy_path_creates_and_returns_user(self, use_case, user_repo):
        # Given
        dto = CreateUserDTO(name="Alice", email="alice@example.com")

        # When
        result = await use_case.execute(dto)

        # Then
        assert result.name == "Alice"
        assert result.email == "alice@example.com"
        user_repo.save.assert_called_once()

    async def test_duplicate_email_raises_error(self, use_case, user_repo):
        # Given — simular que ya existe el email
        user_repo.find_by_email.return_value = UserFactory()
        dto = CreateUserDTO(name="Bob", email="alice@example.com")

        # When / Then
        with pytest.raises(DuplicateEmailError):
            await use_case.execute(dto)
        user_repo.save.assert_not_called()

    async def test_invalid_email_format_raises_validation_error(self, use_case):
        # Given
        dto = CreateUserDTO(name="Charlie", email="not-an-email")

        # When / Then
        with pytest.raises(ValueError):
            await use_case.execute(dto)
```

---

## Integration Tests — DB con Testcontainers

```python
# tests/integration/test_user_repository.py
import pytest
from testcontainers.postgres import PostgresContainer
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg

@pytest.fixture
async def db_session(postgres_container):
    engine = create_async_engine(postgres_container.get_connection_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

async def test_save_and_retrieve_user(db_session):
    # Given
    repo = SQLAlchemyUserRepository(db_session)
    user = UserFactory()

    # When
    await repo.save(user)
    retrieved = await repo.find_by_id(user.id)

    # Then
    assert retrieved is not None
    assert retrieved.email == user.email
```

---

## Contract Testing con Pact

**Consumer (frontend) define el contrato:**
```javascript
// tests/pact/userConsumer.pact.test.js
import { PactV3, MatchersV3 } from "@pact-foundation/pact";

const provider = new PactV3({
  consumer: "frontend_app",
  provider: "user_api",
  dir: path.resolve(process.cwd(), "pacts"),
});

describe("User API Contract", () => {
  it("should return user by id", async () => {
    await provider
      .given("a user with id usr_123 exists")
      .uponReceiving("a GET request for user usr_123")
      .withRequest({
        method: "GET",
        path: "/api/v1/users/usr_123",
        headers: { Accept: "application/json" },
      })
      .willRespondWith({
        status: 200,
        body: {
          data: {
            id: MatchersV3.regex("usr_[a-z0-9]+", "usr_123"),
            name: MatchersV3.string("Alice"),
            email: MatchersV3.email("alice@example.com"),
          },
        },
      })
      .executeTest(async (mockServer) => {
        const result = await fetchUser("usr_123", mockServer.url)
        expect(result.data.email).toBe("alice@example.com")
      })
  })
})
```

**Provider (backend) verifica el contrato:**
```python
# tests/pact/test_user_provider.py
import pytest
from pact import Verifier

def test_provider_honors_consumer_contract():
    verifier = Verifier(
        provider="user_api",
        provider_base_url="http://localhost:8000",
    )
    result = verifier.verify_with_broker(
        broker_url="https://pact-broker.example.com",
        publish_version="1.0.0",
        provider_states_setup_url="http://localhost:8000/pact/setup",
    )
    assert result == 0, "Provider does not honor consumer contracts"
```

---

## Performance Testing — thresholds

| Métrica | Aceptable | Bueno | Excelente |
|---------|-----------|-------|-----------|
| Response time (p50) | <200ms | <100ms | <50ms |
| Response time (p95) | <500ms | <300ms | <200ms |
| Response time (p99) | <1000ms | <500ms | <300ms |
| Error rate | <1% | <0.1% | <0.01% |
| Throughput | baseline | +20% | +50% |

```python
# locust — performance test básico
from locust import HttpUser, task, between

class UserAPILoadTest(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def get_user(self):
        self.client.get("/api/v1/users/usr_123")

    @task(1)
    def list_users(self):
        self.client.get("/api/v1/users?limit=20")

# Umbrales de paso: p95 < 500ms, error_rate < 1%
```

---

## Mutation Testing

```bash
# Python — mutmut
mutmut run --paths-to-mutate src/domain/
mutmut results
mutmut show <id>  # ver mutante que sobrevivió

# TypeScript — Stryker
npx stryker run
# Objetivo: mutation score > 80%
```

---

## Accessibility Testing

```typescript
// Playwright + axe-core
import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

test("dashboard page has no critical accessibility violations", async ({ page }) => {
  await page.goto("/dashboard")

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze()

  expect(results.violations.filter(v => v.impact === "critical")).toHaveLength(0)
  expect(results.violations.filter(v => v.impact === "serious")).toHaveLength(0)
})
```

---

## Metricas y cobertura

| Tipo | Minimo | Target | Herramienta |
|------|--------|--------|-------------|
| Unit (domain logic) | 80% | 95% | pytest-cov / Vitest |
| Integration | cubrir repos y servicios | todos los paths | pytest / Jest |
| E2E | flujos criticos | happy + error paths | Playwright |
| Mutation score | - | >80% | mutmut / Stryker |
| A11y (critical+serious) | 0 violations | 0 violations | axe-core |

## Politicas de bloqueo (CI)

1. Unit coverage < 80% en codigo nuevo: bloquear
2. A11y violations de nivel critical/serious: bloquear
3. Contract break (Pact): bloquear inmediatamente
4. Mutation score < 60% en modulos de dominio nuevos: bloquear
5. Regression visual detectada: bloquear (requiere aprobacion manual)

## Checklist de enforcement

- [ ] Cada funcion de use case tiene test: happy path + error + edge case
- [ ] Tests nombrados con patron: `test_{que}_{condicion}_{resultado}`
- [ ] Factories usadas para crear datos de test — no objetos hardcodeados en el test
- [ ] Mocks solo para dependencias externas (red, DB) — no para logica de dominio
- [ ] Integration tests usan contenedores reales (Testcontainers), no SQLite/mock DB
- [ ] Contrato Pact actualizado cuando cambia la API
- [ ] Performance test ejecutado antes de releases mayores
