# DRY, KISS, and YAGNI

Three complementary heuristics for keeping code simple, honest, and maintainable. They are not rules to follow mechanically — they are tensions to balance. This document covers each principle and then addresses the real difficulty: knowing when they conflict.

---

## DRY — Don't Repeat Yourself

Every piece of knowledge must have a single, unambiguous, authoritative representation within a system. DRY is about knowledge duplication, not code duplication. Two similar-looking functions that express different business rules are not a DRY violation.

### ❌ BAD — Same validation logic in three route handlers

**`src/invoices/router.py`**
```python
@router.post("/invoices")
async def create_invoice(data: dict, db: AsyncSession = Depends(get_db)):
    # Validation copy #1
    if not data.get("client_email"):
        raise HTTPException(status_code=400, detail="client_email is required")
    if "@" not in data["client_email"]:
        raise HTTPException(status_code=400, detail="client_email must be valid")
    if not data.get("amount") or data["amount"] <= 0:
        raise HTTPException(status_code=400, detail="amount must be positive")
    # ... business logic


@router.put("/invoices/{id}")
async def update_invoice(id: str, data: dict, db: AsyncSession = Depends(get_db)):
    # Validation copy #2 — exact same rules, different handler
    if not data.get("client_email"):
        raise HTTPException(status_code=400, detail="client_email is required")
    if "@" not in data["client_email"]:
        raise HTTPException(status_code=400, detail="client_email must be valid")
    if not data.get("amount") or data["amount"] <= 0:
        raise HTTPException(status_code=400, detail="amount must be positive")
    # ... business logic


@router.post("/invoices/{id}/duplicate")
async def duplicate_invoice(id: str, data: dict, db: AsyncSession = Depends(get_db)):
    # Validation copy #3
    if not data.get("client_email"):
        raise HTTPException(status_code=400, detail="client_email is required")
    if "@" not in data["client_email"]:
        raise HTTPException(status_code=400, detail="client_email must be valid")
    if not data.get("amount") or data["amount"] <= 0:
        raise HTTPException(status_code=400, detail="amount must be positive")
```

### ✅ GOOD — Single source of truth via Pydantic schema

**`src/invoices/schemas.py`**
```python
from decimal import Decimal
from pydantic import BaseModel, EmailStr, field_validator


class InvoiceInput(BaseModel):
    client_email: EmailStr          # validation lives here, once
    amount: Decimal
    description: str | None = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be positive")
        return v
```

**`src/invoices/router.py`**
```python
@router.post("/invoices", status_code=201)
async def create_invoice(data: InvoiceInput, db: AsyncSession = Depends(get_db)):
    # No validation code here — schema handles it
    return await invoice_service.create(data, db)


@router.put("/invoices/{id}")
async def update_invoice(id: str, data: InvoiceInput, db: AsyncSession = Depends(get_db)):
    return await invoice_service.update(id, data, db)


@router.post("/invoices/{id}/duplicate", status_code=201)
async def duplicate_invoice(id: str, data: InvoiceInput, db: AsyncSession = Depends(get_db)):
    return await invoice_service.duplicate(id, data, db)
```

**`src/invoices/InvoiceForm.tsx`** — same principle in TypeScript with a shared validator
```typescript
// src/invoices/validators.ts
import { z } from "zod"

export const invoiceSchema = z.object({
  clientEmail: z.string().email("Must be a valid email"),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional(),
})

export type InvoiceInput = z.infer<typeof invoiceSchema>
```

```typescript
// src/invoices/CreateInvoiceForm.tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { invoiceSchema, type InvoiceInput } from "./validators"

export function CreateInvoiceForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),  // validation in one place
  })
  // ...
}

// src/invoices/EditInvoiceForm.tsx
export function EditInvoiceForm() {
  const { register, handleSubmit } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),  // same schema, no duplication
  })
  // ...
}
```

---

### The AHA Principle — Avoid Hasty Abstractions

Wait until you see the pattern three times before abstracting. Premature DRY — extracting after the first or second occurrence — creates abstractions coupled to a specific context. When the third case arrives and is slightly different, the abstraction either becomes contorted to accommodate it or you write around it.

### ❌ BAD — Abstracted too early, now the third case forces ugly parameters

```python
# After seeing two cases that look similar, someone extracts this:
def process_document(
    doc_type: str,
    data: dict,
    send_email: bool = False,
    email_template: str | None = None,
    update_status: bool = True,
    status_value: str | None = None,
    audit: bool = True,
    audit_level: str = "info",
    notify_admin: bool = False,   # added for case #3
    skip_validation: bool = False, # added for case #4
) -> dict:
    # 80 lines of if/else controlling behavior via flags
    ...
```

The abstraction has become harder to understand than three separate functions.

### ✅ GOOD — Wait for the pattern, then abstract the right thing

```python
# First occurrence: just write it inline
async def create_invoice(data: InvoiceInput) -> Invoice:
    invoice = Invoice.create(data)
    await self._repo.save(invoice)
    await self._mailer.send_invoice_created(invoice)
    return invoice

# Second occurrence (quotes): also inline, looks similar but serves different domain
async def create_quote(data: QuoteInput) -> Quote:
    quote = Quote.create(data)
    await self._repo.save(quote)
    await self._mailer.send_quote_created(quote)
    return quote

# Third occurrence (purchase orders): NOW the pattern is clear
# Abstract the shared skeleton, keep the differences explicit
async def _create_document(document: Document, notification: Callable) -> Document:
    await self._repo.save(document)
    await notification(document)
    return document

async def create_invoice(data: InvoiceInput) -> Invoice:
    return await self._create_document(Invoice.create(data), self._mailer.send_invoice_created)

async def create_quote(data: QuoteInput) -> Quote:
    return await self._create_document(Quote.create(data), self._mailer.send_quote_created)

async def create_purchase_order(data: POInput) -> PurchaseOrder:
    return await self._create_document(PurchaseOrder.create(data), self._mailer.send_po_created)
```

---

## KISS — Keep It Simple, Stupid

Prefer the simplest solution that correctly solves the problem. Complexity must earn its place — it is not free. The enemy of KISS is cleverness: custom abstractions, hand-rolled state machines, and over-engineered utilities where a library call or a direct query would do.

### ❌ BAD — Complex regex + state machine for email validation

**`src/shared/validators.py`**
```python
import re

EMAIL_PATTERN = re.compile(
    r"(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
    r"|\"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]"
    r"|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*\")"
    r"@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
    r"|\[(?:(?:25[0-5]|2(?:[0-4][0-9]|[1-9][0-9]?)|[0-1]?[0-9][0-9]?)\.){3}"
    r"(?:25[0-5]|2(?:[0-4][0-9]|[1-9][0-9]?)|[0-1]?[0-9][0-9]?)"
    r"|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]"
    r"|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])"
)

def validate_email(email: str) -> bool:
    # 200+ character regex that still doesn't handle all edge cases
    return bool(EMAIL_PATTERN.match(email.lower()))
```

### ✅ GOOD — Let the library do it

**`src/shared/schemas.py`**
```python
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr   # battle-tested validation, one line
    password: str
```

---

### ❌ BAD — Custom generic repository with 200 lines when you need 20

**`src/shared/repository.py`**
```python
class GenericRepository(Generic[T, ID]):
    """200-line generic base with query builders, eager loading toggles,
    cache invalidation hooks, soft-delete support, and audit trail injection
    — for a project with 3 tables."""

    def __init__(self, model: Type[T], session: AsyncSession, cache: ICache | None = None,
                 audit: IAuditLogger | None = None, soft_delete: bool = True) -> None:
        ...

    async def find_by_id(self, id: ID, *, eager: list[str] | None = None,
                         include_deleted: bool = False) -> T | None:
        ...
    # 15 more methods
```

### ✅ GOOD — Direct SQLAlchemy queries scoped to the actual need

**`src/invoices/repository.py`**
```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.invoices.models import InvoiceModel


class PostgreSQLInvoiceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, invoice_id: str) -> InvoiceModel | None:
        result = await self._session.execute(
            select(InvoiceModel).where(InvoiceModel.id == invoice_id)
        )
        return result.scalar_one_or_none()

    async def find_by_user(self, user_id: str) -> list[InvoiceModel]:
        result = await self._session.execute(
            select(InvoiceModel)
            .where(InvoiceModel.user_id == user_id, InvoiceModel.deleted_at.is_(None))
            .order_by(InvoiceModel.created_at.desc())
        )
        return list(result.scalars().all())

    async def save(self, invoice: InvoiceModel) -> InvoiceModel:
        self._session.add(invoice)
        await self._session.flush()
        return invoice
```

**`src/invoices/invoiceApi.ts`** — same principle in TypeScript
```typescript
// ❌ BAD: Generic API client factory with type magic
class ApiRepository<T extends { id: string }> {
  constructor(private readonly endpoint: string, private readonly transform: (raw: unknown) => T) {}
  async findById(id: string): Promise<T> { /* ... */ }
  async findAll(filters?: Partial<T>): Promise<T[]> { /* ... */ }
  // ...
}

// ✅ GOOD: Direct, explicit API calls for what you actually need
// src/invoices/invoiceApi.ts
export async function fetchInvoice(id: string): Promise<Invoice> {
  const response = await fetch(`/api/v1/invoices/${id}`)
  if (!response.ok) throw new ApiError(response)
  return response.json() as Promise<Invoice>
}

export async function fetchUserInvoices(userId: string): Promise<Invoice[]> {
  const response = await fetch(`/api/v1/users/${userId}/invoices`)
  if (!response.ok) throw new ApiError(response)
  return response.json() as Promise<Invoice[]>
}
```

---

## YAGNI — You Aren't Gonna Need It

Do not implement features or abstractions until they are actually needed. Every line of unused infrastructure is code you have to read, maintain, test, and explain. The future requirements you imagine rarely arrive in the form you imagined.

### ❌ BAD — Building for imaginary scale on day one

**`src/invoices/service.py`**
```python
class InvoiceService:
    def __init__(
        self,
        repo: IInvoiceRepository,
        plugin_registry: IPluginRegistry,        # no plugins exist
        tenant_resolver: ITenantResolver,         # single-tenant MVP
        locale_service: ILocaleService,           # one language, one country
        event_bus: IEventBus,                     # no event consumers
        feature_flags: IFeatureFlagClient,        # no flags configured
        export_strategy_factory: IExportFactory,  # only PDF export needed
    ) -> None:
        ...

    async def create_invoice(self, data: InvoiceInput, tenant_id: str | None = None) -> Invoice:
        tenant = await self._tenant_resolver.resolve(tenant_id or "default")
        locale = await self._locale_service.get(tenant.locale)
        plugins = await self._plugin_registry.get_pre_create_hooks("invoice")

        for plugin in plugins:
            data = await plugin.transform(data)  # no plugins will ever run

        if await self._feature_flags.is_enabled("new_invoice_flow", tenant_id):
            invoice = await self._new_flow(data, tenant, locale)
        else:
            invoice = await self._legacy_flow(data, tenant, locale)

        await self._event_bus.publish(InvoiceCreatedEvent(invoice))  # no consumers
        return invoice
```

### ✅ GOOD — Build what one client needs today

**`src/invoices/service.py`**
```python
class InvoiceService:
    def __init__(self, repo: IInvoiceRepository, mailer: IMailer) -> None:
        self._repo = repo
        self._mailer = mailer

    async def create_invoice(self, data: InvoiceInput, user_id: str) -> Invoice:
        invoice = Invoice.create(
            user_id=user_id,
            client_email=data.client_email,
            amount=data.amount,
            description=data.description,
        )
        saved = await self._repo.save(invoice)
        await self._mailer.send_invoice_created(saved)
        return saved
```

When a second tenant appears, add multi-tenancy. When a second language is requested, add i18n. When a second export format is needed, add the strategy. Not before.

**`src/invoices/CreateInvoicePage.tsx`** — same discipline in the frontend
```typescript
// ❌ BAD: Building i18n, theming, and feature flags for an MVP
export function CreateInvoicePage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { isEnabled } = useFeatureFlags()

  if (!isEnabled("invoice_creation")) return <ComingSoon />

  return (
    <ThemeProvider theme={theme}>
      <InvoiceForm
        title={t("invoice.create.title")}
        submitLabel={t("invoice.create.submit")}
      />
    </ThemeProvider>
  )
}

// ✅ GOOD: Solve what exists today
export function CreateInvoicePage() {
  return <InvoiceForm title="New Invoice" />
}
```

---

### How to Identify YAGNI Violations in Code Review

Look for these signals:

- **Parameters named `*_type`, `*_strategy`, `*_mode`** that only ever receive one value.
- **Abstract base classes with one concrete implementation** and no planned second.
- **Feature flags for features that are always on.**
- **Config files for services not yet integrated.**
- **Comments like "will be needed when we add multi-tenancy"** — if it is not needed now, delete it.
- **Tables with columns that are always NULL** — the schema anticipates a feature that was never built.

Ask in PR review: "Is this used today? Does a ticket exist for when it will be?" If both answers are no, the code should not merge.

---

## The Tension Between DRY and YAGNI

DRY and YAGNI give opposite advice in one common situation: you have seen this pattern twice and want to abstract it.

- **DRY says:** "Extract the shared logic now — duplication will diverge."
- **YAGNI says:** "You only have two cases. The abstraction will guess wrong."

**The resolution:** apply the AHA Principle (see above). Wait for the third case. When it arrives, you will have three real examples to design the abstraction from, rather than guessing from two. The cost of one duplication is almost always lower than the cost of the wrong abstraction.

```
                 Wait            Third case           Refactor
Two cases ───────────────────────────────────────────────────▶  Correct abstraction
              (deliberate        arrives with             (based on real
               duplication)      real constraints)         evidence)
```

When NOT to wait:

- The two cases are owned by the same team, touched in every sprint, and already diverging.
- The shared logic is security-critical (auth, validation) — divergence there is a vulnerability.
- The abstraction is trivially obvious: extracting a constant, a type alias, or a helper that formats a date.

When to wait:

- The cases are in different bounded contexts owned by different teams.
- The second case arrived in the same sprint as the first — you have not seen them in the wild yet.
- The "abstraction" would require adding a parameter to handle the second case's differences.
