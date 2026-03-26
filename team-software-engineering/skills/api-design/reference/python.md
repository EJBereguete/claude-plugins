# API Design — Python / FastAPI Examples

## RFC 9457 — ProblemDetail Response

```python
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError

class ProblemDetail(BaseModel):
    type: str
    title: str
    status: int
    detail: str
    instance: str | None = None

app = FastAPI()

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ProblemDetail(
            type=f"https://api.example.com/errors/{exc.status_code}",
            title=exc.detail,
            status=exc.status_code,
            detail=str(exc.detail),
            instance=str(request.url.path),
        ).model_dump(),
        media_type="application/problem+json",
    )

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "type": "https://api.example.com/errors/validation-error",
            "title": "Validation Error",
            "status": 422,
            "detail": "The request body contains invalid fields.",
            "instance": str(request.url.path),
            "errors": exc.errors(),
        },
        media_type="application/problem+json",
    )
```

## Cursor Pagination

```python
import base64
import json
from typing import TypeVar, Generic
from pydantic import BaseModel

T = TypeVar("T")

def encode_cursor(data: dict) -> str:
    return base64.b64encode(json.dumps(data).encode()).decode()

def decode_cursor(cursor: str) -> dict:
    return json.loads(base64.b64decode(cursor.encode()).decode())

class PaginationMeta(BaseModel):
    has_next: bool
    next_cursor: str | None
    has_prev: bool
    prev_cursor: str | None

class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    pagination: PaginationMeta

@router.get("/messages", response_model=PaginatedResponse[MessageResponse])
async def list_messages(
    limit: int = 20,
    after: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    cursor_data = decode_cursor(after) if after else None
    messages, has_next = await message_repo.get_page(
        limit=limit,
        after_id=cursor_data["id"] if cursor_data else None,
    )
    next_cursor = (
        encode_cursor({"id": messages[-1].id, "created_at": messages[-1].created_at.isoformat()})
        if has_next else None
    )
    return PaginatedResponse(
        data=[MessageResponse.model_validate(m) for m in messages],
        pagination=PaginationMeta(
            has_next=has_next,
            next_cursor=next_cursor,
            has_prev=after is not None,
            prev_cursor=None,
        ),
    )
```

## OpenAPI Documentation

```python
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/users", tags=["Users"])

class UserResponse(BaseModel):
    id: str = Field(..., description="User unique identifier")
    name: str = Field(..., description="Full name")
    email: str = Field(..., description="Email address", examples=["john@example.com"])

@router.post(
    "/",
    response_model=UserResponse,
    status_code=201,
    responses={
        422: {"description": "Validation error", "model": ProblemDetail},
        409: {"description": "Email already registered", "model": ProblemDetail},
    },
    summary="Create a new user",
    operation_id="createUser",
)
async def create_user(payload: CreateUserRequest) -> UserResponse:
    ...
```

## Rate Limiting Headers

```python
from starlette.middleware.base import BaseHTTPMiddleware
import time

class RateLimitHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # These values should come from your actual rate limiting store
        response.headers["X-RateLimit-Limit"] = "1000"
        response.headers["X-RateLimit-Remaining"] = "999"
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + 3600)
        return response
```
