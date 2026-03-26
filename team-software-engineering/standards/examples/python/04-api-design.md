# API Design in FastAPI

Production-grade FastAPI patterns: RFC 9457 error responses, cursor pagination, rate limiting headers, OpenAPI documentation, and versioning.

---

## 1. RFC 9457 Problem Details

All errors must return a `application/problem+json` body as specified in [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457).

### Model

```python
# infrastructure/http/schemas/problem_detail.py
from pydantic import BaseModel


class ProblemDetail(BaseModel):
    """RFC 9457 Problem Details for HTTP APIs."""

    type: str        # URI identifying the error type
    title: str       # Short human-readable summary
    status: int      # HTTP status code
    detail: str      # Human-readable explanation specific to this occurrence
    instance: str    # URI of the specific request

    model_config = {
        "json_schema_extra": {
            "example": {
                "type": "https://api.example.com/errors/not-found",
                "title": "Resource Not Found",
                "status": 404,
                "detail": "User with id '123' was not found.",
                "instance": "/v1/users/123",
            }
        }
    }
```

### Global Exception Handlers

```python
# infrastructure/http/exception_handlers.py
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from domain.exceptions import (
    DomainException,
    UserAlreadyExistsError,
    UserNotFoundError,
)
from infrastructure.http.schemas.problem_detail import ProblemDetail

_BASE_URL = "https://api.example.com/errors"


def _problem_response(problem: ProblemDetail) -> JSONResponse:
    return JSONResponse(
        status_code=problem.status,
        content=problem.model_dump(),
        media_type="application/problem+json",
    )


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        return _problem_response(
            ProblemDetail(
                type=f"{_BASE_URL}/validation-error",
                title="Validation Error",
                status=422,
                detail=str(exc.errors()),
                instance=str(request.url),
            )
        )

    @app.exception_handler(UserNotFoundError)
    async def handle_not_found(request: Request, exc: UserNotFoundError):
        return _problem_response(
            ProblemDetail(
                type=f"{_BASE_URL}/not-found",
                title="Resource Not Found",
                status=404,
                detail=str(exc),
                instance=str(request.url),
            )
        )

    @app.exception_handler(UserAlreadyExistsError)
    async def handle_conflict(request: Request, exc: UserAlreadyExistsError):
        return _problem_response(
            ProblemDetail(
                type=f"{_BASE_URL}/conflict",
                title="Resource Conflict",
                status=409,
                detail=str(exc),
                instance=str(request.url),
            )
        )

    @app.exception_handler(DomainException)
    async def handle_domain_error(request: Request, exc: DomainException):
        return _problem_response(
            ProblemDetail(
                type=f"{_BASE_URL}/business-rule-violation",
                title="Business Rule Violation",
                status=422,
                detail=str(exc),
                instance=str(request.url),
            )
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception):
        # Never expose internal details in production
        return _problem_response(
            ProblemDetail(
                type=f"{_BASE_URL}/internal-server-error",
                title="Internal Server Error",
                status=500,
                detail="An unexpected error occurred.",
                instance=str(request.url),
            )
        )
```

---

## 2. Cursor Pagination

Offset pagination breaks under concurrent inserts. Use an opaque cursor encoding the last-seen `id + created_at`.

### Cursor Encoding

```python
# infrastructure/http/pagination.py
import base64
import json
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PageInfo(BaseModel):
    has_next_page: bool
    end_cursor: str | None


class PaginatedResponse[T](BaseModel):
    data: list[T]
    page_info: PageInfo


def encode_cursor(last_id: UUID, last_created_at: datetime) -> str:
    payload = json.dumps({"id": str(last_id), "ts": last_created_at.isoformat()})
    return base64.urlsafe_b64encode(payload.encode()).decode()


def decode_cursor(cursor: str) -> tuple[UUID, datetime]:
    try:
        payload = json.loads(base64.urlsafe_b64decode(cursor.encode()))
        return UUID(payload["id"]), datetime.fromisoformat(payload["ts"])
    except Exception as exc:
        raise ValueError(f"Invalid pagination cursor: {cursor!r}") from exc
```

### Paginated Endpoint

```python
# infrastructure/http/routers/users.py  (pagination section)
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database.models.user_model import UserModel
from infrastructure.http.pagination import (
    PaginatedResponse,
    PageInfo,
    encode_cursor,
    decode_cursor,
)
from infrastructure.http.schemas.user_schemas import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/",
    response_model=PaginatedResponse[UserResponse],
    summary="List users with cursor pagination",
    operation_id="listUsers",
)
async def list_users(
    limit: int = Query(default=20, ge=1, le=100),
    after: str | None = Query(default=None, description="Opaque cursor from previous page"),
    session: AsyncSession = Depends(get_db_session),
) -> PaginatedResponse[UserResponse]:
    stmt = select(UserModel).order_by(UserModel.created_at.desc(), UserModel.id).limit(limit + 1)

    if after:
        _, after_ts = decode_cursor(after)
        stmt = stmt.where(UserModel.created_at < after_ts)

    result = await session.execute(stmt)
    rows = result.scalars().all()

    has_next = len(rows) > limit
    items = rows[:limit]

    end_cursor = encode_cursor(items[-1].id, items[-1].created_at) if has_next else None

    return PaginatedResponse(
        data=[UserResponse.model_validate(r, from_attributes=True) for r in items],
        page_info=PageInfo(has_next_page=has_next, end_cursor=end_cursor),
    )
```

---

## 3. Rate Limiting Headers

Return standard `RateLimit-*` headers so clients can back off gracefully.

```python
# infrastructure/http/middleware/rate_limit.py
import time
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

LIMIT = 100       # requests
WINDOW = 60       # seconds


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = LIMIT, window: int = WINDOW) -> None:
        super().__init__(app)
        self._limit = limit
        self._window = window
        self._counts: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - self._window

        # Slide the window
        calls = [t for t in self._counts[client_ip] if t > window_start]
        calls.append(now)
        self._counts[client_ip] = calls

        remaining = max(0, self._limit - len(calls))
        reset_at = int(window_start + self._window)

        if len(calls) > self._limit:
            return Response(
                content='{"detail":"Too many requests"}',
                status_code=429,
                headers={
                    "RateLimit-Limit": str(self._limit),
                    "RateLimit-Remaining": "0",
                    "RateLimit-Reset": str(reset_at),
                    "Retry-After": str(self._window),
                },
                media_type="application/json",
            )

        response = await call_next(request)
        response.headers["RateLimit-Limit"] = str(self._limit)
        response.headers["RateLimit-Remaining"] = str(remaining)
        response.headers["RateLimit-Reset"] = str(reset_at)
        return response
```

Register in `main.py`:

```python
from infrastructure.http.middleware.rate_limit import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware, limit=100, window=60)
```

---

## 4. OpenAPI Documentation

Document every endpoint with tags, `operationId`, response schemas, and inline examples.

```python
# infrastructure/http/routers/orders.py
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/orders", tags=["Orders"])


class CreateOrderRequest(BaseModel):
    customer_id: UUID
    items: list[dict] = Field(
        min_length=1,
        examples=[[{"product_id": "uuid", "quantity": 2}]],
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "customer_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "items": [{"product_id": "abc123", "quantity": 2}],
            }
        }
    }


class OrderResponse(BaseModel):
    id: UUID
    status: str
    total: str


@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Place a new order",
    description=(
        "Creates a new order for the given customer. "
        "The order starts in DRAFT status until explicitly placed via `POST /orders/{id}/place`."
    ),
    operation_id="createOrder",
    responses={
        201: {"description": "Order created successfully"},
        409: {"description": "Duplicate order"},
        422: {"description": "Validation error"},
    },
)
async def create_order(body: CreateOrderRequest) -> OrderResponse:
    ...


@router.post(
    "/{order_id}/place",
    response_model=OrderResponse,
    summary="Place a draft order",
    operation_id="placeOrder",
    responses={
        200: {"description": "Order placed"},
        404: {"description": "Order not found"},
        422: {"description": "Business rule violation"},
    },
)
async def place_order(
    order_id: UUID = Path(description="UUID of the order to place"),
) -> OrderResponse:
    ...
```

### App metadata

```python
# main.py
app = FastAPI(
    title="MyApp API",
    version="1.0.0",
    description="Microservice following team standards.",
    contact={"name": "Platform Team", "email": "platform@example.com"},
    license_info={"name": "Proprietary"},
    openapi_tags=[
        {"name": "Users", "description": "User management endpoints."},
        {"name": "Orders", "description": "Order lifecycle endpoints."},
    ],
)
```

---

## 5. Versioning via Router Prefix

```python
# main.py  — version via URL prefix
from infrastructure.http.routers import users, orders

app.include_router(users.router, prefix="/v1")
app.include_router(orders.router, prefix="/v1")

# When introducing breaking changes, register the new router alongside the old:
# app.include_router(users_v2.router, prefix="/v2")
```

All routes become `/v1/users`, `/v1/orders`, etc. Never remove a version without a deprecation window.
