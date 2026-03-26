# Testing Standard

## Testing Pyramid

```
        /\
       /E2E\        10% — Playwright, slow, few
      /------\
     /  Integ  \    20% — Real DB, service interactions
    /------------\
   /  Unit Tests  \  70% — Fast, isolated, many
  /________________\
```

**Rationale:** Do not invert the pyramid. An overweight E2E suite is slow, brittle, and expensive to maintain. Unit tests give the fastest feedback loop. Integration tests validate real wiring. E2E tests validate the most critical user flows only.

---

## Test Naming Convention

### Python — `test_{what}_{condition}_{expected_result}`

```python
# tests/invoices/test_invoice_service.py

def test_create_invoice_with_valid_data_returns_201(): ...
def test_create_invoice_without_auth_returns_401(): ...
def test_create_invoice_with_duplicate_number_returns_409(): ...
def test_get_invoice_belonging_to_other_user_returns_403(): ...
def test_calculate_total_with_zero_items_returns_zero(): ...
```

### TypeScript/Vitest — descriptive `describe/it` blocks

```typescript
// src/__tests__/components/InvoiceForm.test.tsx

describe('InvoiceForm', () => {
  describe('when the user submits with valid data', () => {
    it('calls onSubmit with the correct payload', async () => { ... })
    it('resets the form after successful submission', async () => { ... })
  })

  describe('when the amount is negative', () => {
    it('shows a validation error message', async () => { ... })
    it('does not call onSubmit', async () => { ... })
  })
})
```

---

## Given / When / Then Structure

Every test follows this structure, always with comments:

```python
# tests/invoices/test_invoice_service.py

def test_create_invoice_marks_status_as_draft():
    # Given
    user = UserFactory.create()
    data = InvoiceCreateFactory.build()

    # When
    invoice = invoice_service.create(user.id, data)

    # Then
    assert invoice.status == InvoiceStatus.DRAFT
    assert invoice.user_id == user.id
```

```typescript
// src/__tests__/services/invoiceService.test.ts

it('sets status to DRAFT on creation', async () => {
  // Given
  const payload: CreateInvoiceDto = { clientName: 'Acme', amount: 500 }
  server.use(http.post('/invoices', () => HttpResponse.json({ ...payload, status: 'DRAFT' })))

  // When
  const result = await createInvoice(payload)

  // Then
  expect(result.status).toBe('DRAFT')
})
```

---

## What to Test vs What NOT to Test

**Test these:**
- Business logic and domain rules (invoice totals, discount application, status transitions)
- Edge cases (zero amounts, empty lists, max length strings)
- Error conditions (missing required fields, unauthorized access, duplicate records)
- Data transformations (serialization, currency rounding, date formatting)
- Auth and permission enforcement (who can access what)

**Do NOT test these:**
- Framework internals (FastAPI routing, SQLAlchemy session management)
- Third-party library behavior (Stripe SDK, boto3)
- Trivial property getters/setters with no logic
- ORM model field definitions

```python
# ❌ BAD — testing a trivial getter
def test_invoice_has_id():
    invoice = Invoice(id=1)
    assert invoice.id == 1

# ✅ GOOD — testing business logic
def test_invoice_total_includes_tax_when_taxable():
    # Given
    invoice = InvoiceFactory.build(subtotal=Decimal("100.00"), tax_rate=Decimal("0.21"))

    # When
    total = invoice.calculate_total()

    # Then
    assert total == Decimal("121.00")
```

---

## Factories — Use Factories, Not Inline Fixtures

Use factories to create test data. Never repeat object construction across tests.

### Python — pytest-factoryboy / manual factories

```python
# tests/factories.py
import factory
from factory.alchemy import SQLAlchemyModelFactory
from src.models import User, Invoice
from src.database import TestingSessionLocal

class UserFactory(SQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session = TestingSessionLocal()

    id = factory.Sequence(lambda n: n + 1)
    email = factory.LazyAttribute(lambda obj: f"user{obj.id}@example.com")
    hashed_password = factory.LazyFunction(lambda: hash_password("test-password"))
    is_active = True


class InvoiceFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Invoice
        sqlalchemy_session = TestingSessionLocal()

    number = factory.Sequence(lambda n: f"INV-{n:04d}")
    client_name = factory.Faker("company")
    subtotal = factory.Faker("pydecimal", left_digits=4, right_digits=2, positive=True)
    status = "draft"
    user = factory.SubFactory(UserFactory)


class InvoiceCreateFactory(factory.Factory):
    """Build-only factory for DTO creation (no DB)."""
    class Meta:
        model = dict

    number = factory.Sequence(lambda n: f"INV-{n:04d}")
    client_name = factory.Faker("company")
    subtotal = "500.00"
```

```python
# tests/invoices/test_invoice_service.py
from tests.factories import UserFactory, InvoiceFactory, InvoiceCreateFactory

def test_user_cannot_access_other_users_invoice(db_session):
    # Given
    owner = UserFactory.create()
    other_user = UserFactory.create()
    invoice = InvoiceFactory.create(user=owner)

    # When / Then
    with pytest.raises(PermissionError):
        invoice_service.get(invoice.id, requesting_user_id=other_user.id)
```

### TypeScript — factory functions

```typescript
// src/__tests__/factories/invoiceFactory.ts
import type { Invoice, CreateInvoiceDto } from '@/types/invoice'

let seq = 0

export function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
  seq++
  return {
    id: `inv-${seq}`,
    number: `INV-${String(seq).padStart(4, '0')}`,
    clientName: 'Acme Corp',
    subtotal: 500.0,
    status: 'draft',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

export function buildCreateInvoiceDto(overrides: Partial<CreateInvoiceDto> = {}): CreateInvoiceDto {
  return {
    clientName: 'Acme Corp',
    subtotal: 500.0,
    ...overrides,
  }
}
```

---

## Mocking Strategy

**Mock at the boundary — not inside your own code.**

| What | Mock? | Why |
|------|-------|-----|
| External HTTP APIs (Stripe, SendGrid) | Yes | Avoid real charges, network flakiness |
| Email/SMS sending | Yes | Avoid sending real messages |
| Your own services | No | Test the real implementation |
| Your own repositories | No | Use a test DB instead |
| File system (in unit tests) | Yes | Speed and isolation |
| Time (`datetime.now`) | Yes | Deterministic assertions |

### Python — pytest-mock

```python
# tests/invoices/test_payment_service.py
from unittest.mock import AsyncMock

async def test_process_payment_calls_stripe_with_correct_amount(mocker):
    # Given
    mock_stripe = mocker.patch("src.services.payment_service.stripe.PaymentIntent.create")
    mock_stripe.return_value = AsyncMock(id="pi_test_123", status="succeeded")
    invoice = InvoiceFactory.build(subtotal=Decimal("250.00"))

    # When
    result = await payment_service.process(invoice)

    # Then
    mock_stripe.assert_called_once_with(
        amount=25000,  # cents
        currency="eur",
        metadata={"invoice_id": str(invoice.id)},
    )
    assert result.stripe_payment_id == "pi_test_123"


async def test_process_payment_raises_on_stripe_failure(mocker):
    # Given
    mocker.patch(
        "src.services.payment_service.stripe.PaymentIntent.create",
        side_effect=stripe.error.CardError("Card declined", None, "card_declined"),
    )
    invoice = InvoiceFactory.build()

    # When / Then
    with pytest.raises(PaymentFailedError, match="Card declined"):
        await payment_service.process(invoice)
```

### TypeScript — vi.mock()

```typescript
// src/__tests__/services/emailService.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { sendInvoiceEmail } from '@/services/emailService'
import { sendgrid } from '@/lib/sendgrid'

vi.mock('@/lib/sendgrid')

describe('sendInvoiceEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls sendgrid with correct recipient and template', async () => {
    // Given
    const invoice = buildInvoice({ clientEmail: 'client@acme.com' })
    vi.mocked(sendgrid.send).mockResolvedValue([{ statusCode: 202 }] as never)

    // When
    await sendInvoiceEmail(invoice)

    // Then
    expect(sendgrid.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'client@acme.com',
        templateId: 'd-invoice-template',
      })
    )
  })
})
```

---

## Test Coverage Rules

- **Minimum 80%** coverage on all new code
- **100%** coverage on critical paths: authentication, payments, data mutations, access control
- Coverage is a safety net, not a metric to game — a 95% coverage test suite full of trivial assertions is worse than a 75% suite with meaningful tests

```ini
# pyproject.toml
[tool.pytest.ini_options]
addopts = "--cov=src --cov-report=term-missing --cov-fail-under=80"

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
      },
      exclude: ['src/types/**', 'src/constants/**', '**/*.d.ts'],
    },
  },
})
```

---

## Integration Tests with Real Database

Use a dedicated test database and wrap every test in a transaction that rolls back. This keeps tests isolated without truncating tables between each test.

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.database import Base, get_db
from src.main import app

TEST_DATABASE_URL = "postgresql://postgres:testpass@localhost:5432/testdb"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """Each test gets its own transaction that rolls back on teardown."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

```python
# tests/invoices/test_invoice_api_integration.py

def test_create_invoice_persists_to_database(client, db_session):
    # Given
    user = UserFactory.create()
    token = create_access_token(user.id)
    payload = {"number": "INV-0001", "client_name": "Acme Corp", "subtotal": "500.00"}

    # When
    response = client.post(
        "/invoices",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    # Then
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "draft"

    db_invoice = db_session.query(Invoice).filter_by(id=data["id"]).first()
    assert db_invoice is not None
    assert db_invoice.client_name == "Acme Corp"
```

---

## E2E with Playwright

E2E tests cover critical user flows only. Every test must capture a screenshot as evidence.

```typescript
// e2e/invoices/create-invoice.spec.ts
import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth'

test.describe('Invoice creation flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'user@example.com', 'test-password')
  })

  test('user can create an invoice and see the confirmation', async ({ page }) => {
    // Given
    await page.goto('/invoices/new')

    // When
    await page.fill('[data-testid="invoice-client"]', 'Acme Corp')
    await page.fill('[data-testid="invoice-amount"]', '1500.00')
    await page.selectOption('[data-testid="invoice-currency"]', 'EUR')
    await page.click('[data-testid="submit-invoice"]')

    // Then
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="invoice-number"]')).toContainText('INV-')

    await page.screenshot({
      path: 'docs/tasks/active/TASK-42/evidence/create-invoice.png',
      fullPage: true,
    })
  })

  test('user sees error when submitting without a client name', async ({ page }) => {
    // Given
    await page.goto('/invoices/new')

    // When
    await page.fill('[data-testid="invoice-amount"]', '1500.00')
    await page.click('[data-testid="submit-invoice"]')

    // Then
    await expect(page.locator('[data-testid="error-invoice-client"]')).toContainText('Client name is required')

    await page.screenshot({
      path: 'docs/tasks/active/TASK-42/evidence/create-invoice-validation-error.png',
      fullPage: true,
    })
  })
})
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## Anti-Patterns

### Testing implementation details instead of behavior

```python
# ❌ BAD — brittle, breaks on internal refactor
def test_invoice_service_calls_repository_save():
    mock_repo = MagicMock()
    service = InvoiceService(repo=mock_repo)
    service.create(data)
    mock_repo.save.assert_called_once()

# ✅ GOOD — tests observable outcome
def test_create_invoice_is_retrievable_after_creation(db_session):
    invoice = invoice_service.create(user.id, data)
    fetched = invoice_service.get(invoice.id, user.id)
    assert fetched.id == invoice.id
```

### Order-dependent tests

```python
# ❌ BAD — test B depends on test A having run first
def test_A_creates_user():
    user_service.create(email="a@b.com")

def test_B_user_exists():
    user = user_service.get_by_email("a@b.com")
    assert user is not None

# ✅ GOOD — each test creates its own state
def test_get_user_by_email_returns_correct_user(db_session):
    user = UserFactory.create(email="a@b.com")
    result = user_service.get_by_email("a@b.com")
    assert result.id == user.id
```

### Skipping tests without a ticket reference

```python
# ❌ BAD
@pytest.mark.skip
def test_refund_process_updates_balance(): ...

# ✅ GOOD — link to the issue tracking the fix
@pytest.mark.skip(reason="Flaky due to race condition — tracked in TASK-88")
def test_refund_process_updates_balance(): ...
```

### Using production data in tests

Never seed tests with real customer emails, real payment methods, or any PII. Use factories with fake data generators (`factory.Faker`, `@faker-js/faker`).
