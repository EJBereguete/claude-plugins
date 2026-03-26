---
name: build-api-workflow
description: >
  Construccion quirurgica de API: endpoints, modelos, migraciones y tests.
  Lee el proyecto actual, detecta patrones existentes, crea mini-SDD antes
  de codificar y documenta la tarea para trazabilidad.
used_by:
  - backend-engineer
  - architect
---

# SKILL: Build API Workflow

## CONTRACT

- **Input**: descripcion de lo que se necesita implementar + PROJECT_CONTEXT.md existente
- **Output**: endpoints implementados + unit tests pasando + mini-spec creado + PR abierto
- **Who runs this**: @backend-engineer, con supervision de @architect en cambios de schema o contratos de API

---

## PROCESS

### Step 1 — Read project context

Read `/docs/01-architecture/PROJECT_CONTEXT.md` to understand the stack, conventions and patterns.

Then explore the codebase to detect existing patterns:
```bash
# Detect project structure
find . -type f -name "*.py" -path "*/routes/*" -o -name "*.py" -path "*/routers/*" | head -20
find . -type f -name "*.ts" -path "*/routes/*" -o -name "*.ts" -path "*/controllers/*" | head -20

# Find existing models/schemas to replicate patterns
find . -name "models.py" -o -name "schemas.py" -o -name "*.model.ts" | head -10
```

Identify:
- Framework: FastAPI / Django / Express / NestJS / other
- ORM: SQLAlchemy / Prisma / TypeORM / other
- Auth pattern: JWT / session / API key
- Error handling convention in use
- Naming conventions (snake_case vs camelCase in routes, etc.)

---

### Step 2 — Create the mini-spec (MANDATORY before writing code)

Create `specs/design.md` with the minimum necessary design:

```markdown
# Mini-Spec: [Feature Name]

**Date**: YYYY-MM-DD
**Author**: @backend-engineer

## Endpoints

| Method | Path | Auth required | Description |
|--------|------|---------------|-------------|
| POST | /api/v1/invoices | Yes | Create a new invoice |
| GET | /api/v1/invoices/{id} | Yes | Get invoice by ID |

## Data Model

```sql
-- New table or changes to existing table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Input/Output Schemas

**POST /api/v1/invoices**
- Input: `{ "user_id": "uuid", "line_items": [...] }`
- Output: `{ "id": "uuid", "total": 150.00, "status": "draft" }`

## Technical Decisions

- Using optimistic locking for concurrent invoice updates
- Status transitions validated in service layer, not controller
- Soft delete via `deleted_at` column (matches existing pattern in orders table)

## New Environment Variables

None required.
```

Do not write any implementation code until this document is created.

---

### Step 3 — Create the feature branch

```bash
git checkout -b feature/<slug>-api
# Example: feature/invoice-creation-api
```

---

### Step 4 — Implement following detected patterns

Strict layering — never skip:

```
routes/controllers → services → repositories → database
```

**Python FastAPI example (full pattern)**:

```python
# routes/invoices.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.invoice_service import InvoiceService
from app.schemas.invoice import InvoiceCreate, InvoiceResponse
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/invoices", tags=["invoices"])

@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    payload: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    try:
        invoice = await InvoiceService(db).create(payload, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    return InvoiceResponse.model_validate(invoice)
```

```python
# services/invoice_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.invoice_repository import InvoiceRepository
from app.schemas.invoice import InvoiceCreate
from app.models.invoice import Invoice
import uuid

class InvoiceService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = InvoiceRepository(db)

    async def create(self, payload: InvoiceCreate, owner_id: uuid.UUID) -> Invoice:
        if not payload.line_items:
            raise ValueError("Invoice must have at least one line item")
        total = sum(item.quantity * item.unit_price for item in payload.line_items)
        return await self.repo.create(owner_id=owner_id, total=total)
```

**TypeScript / Express example (full pattern)**:

```typescript
// routes/invoices.ts
import { Router, Request, Response, NextFunction } from 'express'
import { InvoiceService } from '../services/invoiceService'
import { InvoiceCreateSchema } from '../schemas/invoice'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = InvoiceCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(422).json({ error: parsed.error.flatten() })
    }
    const invoice = await new InvoiceService().create(parsed.data, req.user!.id)
    return res.status(201).json(invoice)
  } catch (error) {
    next(error)
  }
})

export { router as invoiceRouter }
```

```typescript
// services/invoiceService.ts
import { InvoiceRepository } from '../repositories/invoiceRepository'
import { InvoiceCreate } from '../schemas/invoice'

export class InvoiceService {
  private repo = new InvoiceRepository()

  async create(payload: InvoiceCreate, ownerId: string) {
    if (payload.lineItems.length === 0) {
      throw new Error('Invoice must have at least one line item')
    }
    const total = payload.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )
    return this.repo.create({ ownerId, total, lineItems: payload.lineItems })
  }
}
```

**C# / ASP.NET Core Minimal API (full pattern)**:

```csharp
// Endpoints/InvoiceEndpoints.cs
public static class InvoiceEndpoints
{
    public static IEndpointRouteBuilder MapInvoiceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/invoices")
            .WithTags("Invoices")
            .RequireAuthorization();

        group.MapPost("/", CreateInvoiceAsync)
            .WithName("CreateInvoice")
            .Produces<InvoiceResponse>(201)
            .ProducesValidationProblem(422);

        group.MapGet("/{id:guid}", GetInvoiceAsync)
            .WithName("GetInvoice")
            .Produces<InvoiceResponse>(200)
            .ProducesProblem(404);

        return app;
    }

    private static async Task<IResult> CreateInvoiceAsync(
        [FromBody] CreateInvoiceRequest request,
        IValidator<CreateInvoiceRequest> validator,
        IInvoiceService service,
        ClaimsPrincipal user)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var ownerId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await service.CreateAsync(request, ownerId);

        return result.IsSuccess
            ? Results.Created($"/api/v1/invoices/{result.Value.Id}", result.Value)
            : Results.Problem(result.Errors.First().Message, statusCode: 422);
    }

    private static async Task<IResult> GetInvoiceAsync(
        Guid id,
        IInvoiceService service,
        ClaimsPrincipal user)
    {
        var ownerId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await service.GetByIdAsync(id, ownerId);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.Problem("Invoice not found", statusCode: 404);
    }
}
```

```csharp
// Services/InvoiceService.cs
public sealed class InvoiceService(IInvoiceRepository repo) : IInvoiceService
{
    public async Task<Result<InvoiceResponse>> CreateAsync(
        CreateInvoiceRequest request,
        Guid ownerId)
    {
        if (request.LineItems.Count == 0)
            return Result.Fail(new ValidationError("Invoice must have at least one line item"));

        var total = request.LineItems.Sum(i => i.Quantity * i.UnitPrice);
        var invoice = Invoice.Create(ownerId, total, request.LineItems);

        await repo.SaveAsync(invoice);

        return Result.Ok(InvoiceResponse.FromEntity(invoice));
    }
}
```

Rules:
- Never put business logic in the route handler
- Always use Pydantic models (Python) or Zod schemas (TypeScript) for input validation
- All errors must be explicit — no silent failures
- Structured logging (never `print` or `console.log` in production code)
- Write SQL migrations with both UP and DOWN if schema changes

---

### Step 5 — Write unit tests (MANDATORY)

Minimum: happy path + error case + edge case per endpoint.

**Python pytest example**:

```python
# tests/test_invoice_routes.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_invoice_success(auth_client: AsyncClient, db_session):
    response = await auth_client.post("/api/v1/invoices/", json={
        "line_items": [{"description": "Service", "quantity": 1, "unit_price": 100.00}]
    })
    assert response.status_code == 201
    data = response.json()
    assert data["total"] == 100.00
    assert data["status"] == "draft"

@pytest.mark.asyncio
async def test_create_invoice_empty_line_items(auth_client: AsyncClient):
    response = await auth_client.post("/api/v1/invoices/", json={"line_items": []})
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_create_invoice_unauthenticated(client: AsyncClient):
    response = await client.post("/api/v1/invoices/", json={"line_items": []})
    assert response.status_code == 401
```

---

### Step 6 — Run tests — they must pass

```bash
# Python
pytest tests/ -v --tb=short

# TypeScript
npx vitest run
```

Do not open a PR if any test fails.

---

### Step 7 — Open the PR

Execute the `pr-standards` skill to format and open the PR correctly.

The PR description must include:
- Link to the mini-spec: `specs/design.md`
- List of new endpoints with method + path
- Any new environment variables required
- Migration commands if schema changed

---

### Step 8 — Document in task tracking

If there is an active task in `/docs/tasks/active/`, update its `TASK-*.md` with:
- Status: `IN_REVIEW`
- PR link
- List of files created/modified

---

## ANTI-PATTERNS

- Writing code before creating the mini-spec — the spec exists to force decisions before they become expensive to change
- Business logic in the route handler — it cannot be tested in isolation and creates tight coupling
- Missing the error case test — the happy path test alone gives false confidence
- Using `any` type in TypeScript or skipping Pydantic models — type safety is the first line of defence against injection and runtime errors
- Opening a PR with failing tests — never, under any circumstances
- Hardcoding values that belong in environment variables (URLs, keys, timeouts)
