# Python / FastAPI — Reference Implementation

Full, runnable example of the 3-layer API pattern using FastAPI, SQLAlchemy (async), Pydantic v2, and pytest.

---

## Router — `routes/invoices.py`

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


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    invoice = await InvoiceService(db).get(invoice_id, owner_id=current_user.id)
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return InvoiceResponse.model_validate(invoice)
```

---

## Schemas — `schemas/invoice.py`

```python
# schemas/invoice.py
from __future__ import annotations
from decimal import Decimal
from pydantic import BaseModel, Field, model_validator


class LineItem(BaseModel):
    description: str = Field(..., min_length=1, max_length=255)
    quantity: int = Field(..., ge=1)
    unit_price: Decimal = Field(..., gt=0, decimal_places=2)

    @property
    def subtotal(self) -> Decimal:
        return self.quantity * self.unit_price


class InvoiceCreate(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=255)
    items: list[LineItem] = Field(..., min_length=1)

    @model_validator(mode="after")
    def items_not_empty(self) -> "InvoiceCreate":
        if not self.items:
            raise ValueError("An invoice must have at least one line item.")
        return self


class InvoiceResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    customer_name: str
    total: Decimal
    owner_id: int
```

---

## Service — `services/invoice_service.py`

```python
# services/invoice_service.py
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.invoice_repository import InvoiceRepository
from app.schemas.invoice import InvoiceCreate
from app.models.invoice import Invoice


class InvoiceService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = InvoiceRepository(db)

    async def create(self, payload: InvoiceCreate, *, owner_id: int) -> Invoice:
        total: Decimal = sum(
            item.quantity * item.unit_price for item in payload.items
        )
        if total <= 0:
            raise ValueError("Invoice total must be greater than zero.")

        return await self._repo.create(
            customer_name=payload.customer_name,
            total=total,
            owner_id=owner_id,
        )

    async def get(self, invoice_id: int, *, owner_id: int) -> Invoice | None:
        invoice = await self._repo.get_by_id(invoice_id)
        if invoice is None:
            return None
        if invoice.owner_id != owner_id:
            return None  # treat as not found to avoid information disclosure
        return invoice
```

---

## Repository — `repositories/invoice_repository.py`

```python
# repositories/invoice_repository.py
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.invoice import Invoice


class InvoiceRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(
        self,
        *,
        customer_name: str,
        total: Decimal,
        owner_id: int,
    ) -> Invoice:
        invoice = Invoice(
            customer_name=customer_name,
            total=total,
            owner_id=owner_id,
        )
        self._db.add(invoice)
        await self._db.commit()
        await self._db.refresh(invoice)
        return invoice

    async def get_by_id(self, invoice_id: int) -> Invoice | None:
        result = await self._db.execute(
            select(Invoice).where(Invoice.id == invoice_id)
        )
        return result.scalar_one_or_none()
```

---

## Tests — `tests/test_invoices.py`

```python
# tests/test_invoices.py
import pytest
from decimal import Decimal
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch
from app.models.invoice import Invoice


VALID_PAYLOAD = {
    "customer_name": "Acme Corp",
    "items": [
        {"description": "Widget A", "quantity": 2, "unit_price": "10.00"},
        {"description": "Widget B", "quantity": 1, "unit_price": "5.50"},
    ],
}


@pytest.mark.asyncio
async def test_create_invoice_success(auth_client: AsyncClient) -> None:
    mock_invoice = Invoice(id=1, customer_name="Acme Corp", total=Decimal("25.50"), owner_id=1)

    with patch(
        "app.services.invoice_service.InvoiceService.create",
        new_callable=AsyncMock,
        return_value=mock_invoice,
    ):
        response = await auth_client.post("/api/v1/invoices/", json=VALID_PAYLOAD)

    assert response.status_code == 201
    data = response.json()
    assert data["customer_name"] == "Acme Corp"
    assert data["total"] == "25.50"


@pytest.mark.asyncio
async def test_create_invoice_empty_items_returns_422(auth_client: AsyncClient) -> None:
    payload = {**VALID_PAYLOAD, "items": []}
    response = await auth_client.post("/api/v1/invoices/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_invoice_unauthenticated_returns_401(client: AsyncClient) -> None:
    response = await client.post("/api/v1/invoices/", json=VALID_PAYLOAD)
    assert response.status_code == 401
```

---

## Conftest — `tests/conftest.py`

```python
# tests/conftest.py
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.auth import get_current_user
from app.models.user import User


FAKE_USER = User(id=1, email="test@example.com")


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient) -> AsyncClient:
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    yield client
    app.dependency_overrides.clear()
```
