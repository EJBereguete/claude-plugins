# API Design Standard

REST API design rules for FastAPI. Every decision here has a reason — follow the convention first, deviate only when the alternative is clearly better, and document why.

---

## URL Naming

Resources are nouns. The URL identifies the resource; the HTTP method describes the action.

**Rules:**
- Collections use plural nouns: `/users`, `/invoices`, `/orders`
- Single resource: `/users/{id}`
- Nested resources for owned relationships: `/users/{id}/invoices`
- Maximum two levels of nesting — beyond that, use query parameters
- All lowercase, hyphenated for multi-word segments: `/invoice-items`, `/payment-methods`

### ❌ BAD — Verbs in URLs

```
GET  /getUser/123
POST /createInvoice
PUT  /updateUserProfile/123
DELETE /deleteUserById/123
POST /markInvoiceAsPaid/456
GET  /fetchInvoicesByUser?user=123
```

### ✅ GOOD — Nouns + HTTP method as the verb

```
GET    /api/v1/users/123
POST   /api/v1/invoices
PUT    /api/v1/users/123/profile
DELETE /api/v1/users/123
POST   /api/v1/invoices/456/payments       ← action as sub-resource
GET    /api/v1/users/123/invoices          ← owned collection
```

For actions that do not map cleanly to CRUD, use a sub-resource noun:
```
POST /api/v1/invoices/{id}/payments        ← record a payment
POST /api/v1/invoices/{id}/cancellations   ← cancel an invoice
POST /api/v1/users/{id}/sessions           ← log in (create a session)
DELETE /api/v1/users/{id}/sessions/current ← log out
```

---

## HTTP Methods

| Method | Purpose | Idempotent | Request Body | Success Code |
|---|---|---|---|---|
| GET | Retrieve resource(s) | Yes | No | 200 |
| POST | Create resource | No | Yes | 201 |
| PUT | Replace resource entirely | Yes | Yes | 200 |
| PATCH | Partial update | No | Yes | 200 |
| DELETE | Remove resource | Yes | No | 204 |

**FastAPI examples:**

```python
# src/users/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.users.application.schemas import UserCreate, UserUpdate, UserResponse, UserPatch
from src.users.application.services import UserService
from src.shared.dependencies import get_db, get_current_user

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    user = await service.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    return await service.register(data)


@router.put("/{user_id}", response_model=UserResponse)
async def replace_user(
    user_id: str,
    data: UserUpdate,
    service: UserService = Depends(get_user_service),
    current_user = Depends(get_current_user),
) -> UserResponse:
    return await service.replace(user_id, data)


@router.patch("/{user_id}", response_model=UserResponse)
async def patch_user(
    user_id: str,
    data: UserPatch,
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    return await service.update(user_id, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    service: UserService = Depends(get_user_service),
) -> None:
    await service.delete(user_id)
```

---

## Status Codes

Use the most specific code that accurately describes the outcome. Do not use 200 for everything.

### 2xx — Success

```python
# 200 OK — request succeeded, returning data
@router.get("/{id}", response_model=InvoiceResponse)
async def get_invoice(id: str, ...) -> InvoiceResponse:
    ...  # returns the resource

# 201 Created — new resource was created; include Location header
from fastapi import Response

@router.post("", response_model=InvoiceResponse, status_code=201)
async def create_invoice(data: InvoiceCreate, response: Response, ...) -> InvoiceResponse:
    invoice = await service.create(data)
    response.headers["Location"] = f"/api/v1/invoices/{invoice.id}"
    return invoice

# 204 No Content — success, nothing to return (DELETE, some PATCHes)
@router.delete("/{id}", status_code=204)
async def delete_invoice(id: str, ...) -> None:
    await service.delete(id)
```

### 4xx — Client errors

```python
# 400 Bad Request — malformed request syntax, invalid parameters
raise HTTPException(status_code=400, detail="Invalid date range: end_date must be after start_date")

# 401 Unauthorized — authentication required or token invalid
raise HTTPException(
    status_code=401,
    detail="Authentication required",
    headers={"WWW-Authenticate": "Bearer"},
)

# 403 Forbidden — authenticated but not authorized
raise HTTPException(status_code=403, detail="You do not have permission to access this invoice")

# 404 Not Found — resource does not exist
raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")

# 409 Conflict — state conflict (duplicate, wrong state for transition)
raise HTTPException(status_code=409, detail="An invoice with this reference number already exists")

# 422 Unprocessable Entity — FastAPI raises this automatically for schema validation errors
# Also raise it explicitly for business rule violations on valid-shaped data:
raise HTTPException(status_code=422, detail="Cannot mark a cancelled invoice as paid")

# 500 Internal Server Error — never raise this manually; let the global exception handler emit it
# Install a handler in main.py:
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred"})
```

---

## RFC 9457 Error Format (Problem Details)

All error responses must follow [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) (Problem Details for HTTP APIs). This gives clients a consistent, machine-readable error structure.

```json
{
  "type": "https://api.myapp.com/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "The request body contains invalid data",
  "instance": "/api/v1/users/register",
  "errors": [
    {"field": "email", "message": "Invalid email format"},
    {"field": "password", "message": "Password must be at least 8 characters"}
  ]
}
```

### FastAPI implementation

**`src/shared/errors.py`**
```python
from dataclasses import dataclass, field
from typing import Any


@dataclass
class FieldError:
    field: str
    message: str


@dataclass
class ProblemDetail:
    type: str
    title: str
    status: int
    detail: str
    instance: str
    errors: list[FieldError] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {
            "type": self.type,
            "title": self.title,
            "status": self.status,
            "detail": self.detail,
            "instance": self.instance,
        }
        if self.errors:
            result["errors"] = [{"field": e.field, "message": e.message} for e in self.errors]
        return result
```

**`src/main.py`**
```python
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from src.shared.errors import ProblemDetail, FieldError

app = FastAPI()

BASE_ERROR_URL = "https://api.myapp.com/errors"


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [
        FieldError(
            field=".".join(str(loc) for loc in err["loc"][1:]),  # skip "body" prefix
            message=err["msg"],
        )
        for err in exc.errors()
    ]
    problem = ProblemDetail(
        type=f"{BASE_ERROR_URL}/validation-error",
        title="Validation Error",
        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="The request body contains invalid data",
        instance=str(request.url.path),
        errors=errors,
    )
    return JSONResponse(status_code=422, content=problem.to_dict())


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    problem = ProblemDetail(
        type=f"{BASE_ERROR_URL}/internal-error",
        title="Internal Server Error",
        status=500,
        detail="An unexpected error occurred. Please try again later.",
        instance=str(request.url.path),
    )
    return JSONResponse(status_code=500, content=problem.to_dict())
```

---

## Pagination

### Offset-based vs cursor-based

| | Offset-based | Cursor-based |
|---|---|---|
| Use when | Admin dashboards, small datasets, user needs page numbers | Feeds, large datasets, real-time data |
| Pros | Simple, supports jumping to page N | Stable under inserts/deletes, efficient at scale |
| Cons | Unstable if rows insert between pages, slow at high offsets | Cannot jump to arbitrary page |

### Standard response envelope

**Offset-based:**
```json
{
  "data": [
    { "id": "inv_001", "amount": 1500.00 },
    { "id": "inv_002", "amount": 750.00 }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

**Cursor-based:**
```json
{
  "data": [
    { "id": "inv_020", "amount": 900.00 }
  ],
  "pagination": {
    "has_next": true,
    "has_prev": true,
    "next_cursor": "eyJpZCI6Imludl8wMjAifQ==",
    "prev_cursor": "eyJpZCI6Imludl8wMDEifQ=="
  }
}
```

### FastAPI implementation

**`src/shared/pagination.py`**
```python
from dataclasses import dataclass
from typing import Generic, TypeVar
import base64, json

T = TypeVar("T")


@dataclass
class PaginatedResult(Generic[T]):
    items: list[T]
    total: int
    page: int
    per_page: int

    @property
    def total_pages(self) -> int:
        return (self.total + self.per_page - 1) // self.per_page


def encode_cursor(data: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(data).encode()).decode()


def decode_cursor(cursor: str) -> dict:
    return json.loads(base64.urlsafe_b64decode(cursor.encode()))
```

**`src/invoices/router.py`** — offset pagination endpoint
```python
from fastapi import Query

@router.get("", response_model=dict)
async def list_invoices(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    service: InvoiceService = Depends(get_invoice_service),
) -> dict:
    result = await service.list_paginated(page=page, per_page=per_page)
    return {
        "data": result.items,
        "pagination": {
            "total": result.total,
            "page": result.page,
            "per_page": result.per_page,
            "total_pages": result.total_pages,
        },
    }
```

---

## Versioning

This team uses URL versioning: `/api/v1/`, `/api/v2/`.

**Rationale:** URL versioning is explicit, easy to route at the infrastructure level (nginx, Cloud Run), easy to test, and discoverable. Header-based versioning is harder to test and less visible.

### When to bump the version

Bump to `/api/v2/` when making a **breaking change**:
- Removing a field from a response
- Renaming a field
- Changing a field type
- Removing an endpoint
- Changing required/optional status of a request field

Do NOT bump the version for:
- Adding new optional fields to a response
- Adding new endpoints
- Adding new optional query parameters
- Bug fixes that correct incorrect behavior

### FastAPI versioning structure

```python
# src/main.py
from fastapi import FastAPI
from src.users.presentation.router_v1 import router as users_v1
from src.users.presentation.router_v2 import router as users_v2
from src.invoices.presentation.router_v1 import router as invoices_v1

app = FastAPI()

app.include_router(users_v1, prefix="/api/v1")
app.include_router(users_v2, prefix="/api/v2")
app.include_router(invoices_v1, prefix="/api/v1")
```

Maintain v1 until all clients have migrated. Set a deprecation header:
```python
from fastapi import Response

@router_v1.get("/{id}")
async def get_user_v1(id: str, response: Response, ...) -> UserResponseV1:
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "2026-12-31"
    response.headers["Link"] = '</api/v2/users/{id}>; rel="successor-version"'
    return await service.find_by_id(id)
```

---

## Rate Limiting Headers

Include these headers on every response so clients can back off gracefully:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1711929600
```

When the limit is exceeded, return **429 Too Many Requests**:

```json
{
  "type": "https://api.myapp.com/errors/rate-limit-exceeded",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Rate limit of 1000 requests per hour exceeded",
  "instance": "/api/v1/invoices"
}
```

With headers:
```
Retry-After: 3600
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1711929600
```

**FastAPI middleware example using `slowapi`:**

```python
# src/main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# src/invoices/router.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("")
@limiter.limit("100/minute")
async def create_invoice(request: Request, data: InvoiceCreate, ...) -> InvoiceResponse:
    return await service.create(data)
```

---

## OpenAPI / Swagger Documentation

Every endpoint must have a `summary`, a `description`, and documented response codes. FastAPI generates the OpenAPI spec automatically from type hints and docstrings — keep both accurate.

### ✅ GOOD — Fully documented endpoint

**`src/invoices/router.py`**
```python
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from src.invoices.application.schemas import InvoiceCreate, InvoiceResponse
from src.invoices.application.services import InvoiceService

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.post(
    "",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "Invoice created successfully"},
        400: {"description": "Invalid request data"},
        401: {"description": "Authentication required"},
        409: {"description": "Invoice with this reference already exists"},
        422: {"description": "Validation error in request body"},
    },
    summary="Create a new invoice",
)
async def create_invoice(
    data: InvoiceCreate,
    response: Response,
    service: InvoiceService = Depends(get_invoice_service),
    current_user=Depends(get_current_user),
) -> InvoiceResponse:
    """
    Create a new invoice for the authenticated user.

    The invoice starts in **DRAFT** status. Use `POST /invoices/{id}/payments`
    to record a payment and transition to **PAID** status.

    - `client_email`: Must be a valid email address
    - `amount`: Must be positive, in the currency specified
    - `currency`: ISO 4217 code (e.g. `USD`, `EUR`)
    - `due_date`: Must be a future date

    Returns the created invoice with its assigned ID.
    """
    invoice = await service.create(data, user_id=current_user.id)
    response.headers["Location"] = f"/api/v1/invoices/{invoice.id}"
    return invoice


@router.get(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    responses={
        200: {"description": "Invoice found"},
        401: {"description": "Authentication required"},
        403: {"description": "Access denied — invoice belongs to another user"},
        404: {"description": "Invoice not found"},
    },
    summary="Get invoice by ID",
)
async def get_invoice(
    invoice_id: str,
    service: InvoiceService = Depends(get_invoice_service),
    current_user=Depends(get_current_user),
) -> InvoiceResponse:
    """
    Retrieve a single invoice by its ID.

    Only the owner of the invoice can retrieve it. Admins can retrieve any invoice.
    """
    invoice = await service.find_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")
    if invoice.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    return invoice
```

The OpenAPI spec is available at `/docs` (Swagger UI) and `/redoc` during development. Export it for the repository:

```bash
# Export to docs/02-api/openapi.json after running the server
curl http://localhost:8000/openapi.json > docs/02-api/openapi.json
```

The spec lives at `docs/02-api/openapi.json` and is regenerated as part of the CI pipeline to keep it in sync with the implementation.
