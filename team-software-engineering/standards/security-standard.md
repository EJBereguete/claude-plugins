# Security Standard

Based on OWASP Top 10 (2021) and ASVS Level 1. Applies to every service and PR.

---

## OWASP Top 10 — Critical Five

### 1. Injection (A03:2021)

SQL injection, NoSQL injection, command injection, LDAP injection. All have the same root cause: untrusted data concatenated into a command or query.

```python
# ❌ BAD — SQL injection, always exploitable
async def get_invoice(invoice_number: str, db: AsyncSession) -> Invoice:
    query = f"SELECT * FROM invoices WHERE number = '{invoice_number}'"
    result = await db.execute(text(query))
    return result.scalar_one()

# ❌ BAD — command injection
import subprocess
async def generate_pdf(filename: str) -> bytes:
    result = subprocess.run(f"wkhtmltopdf {filename} output.pdf", shell=True)

# ✅ GOOD — parameterized query via SQLAlchemy ORM
async def get_invoice(invoice_number: str, user_id: int, db: AsyncSession) -> Invoice:
    result = await db.execute(
        select(Invoice).where(
            Invoice.number == invoice_number,
            Invoice.user_id == user_id,
        )
    )
    invoice = result.scalar_one_or_none()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

# ✅ GOOD — validated input, safe subprocess
from pathlib import Path
import re

async def generate_pdf(invoice_id: str) -> bytes:
    # Validate id is a UUID before use
    if not re.fullmatch(r'[0-9a-f-]{36}', invoice_id):
        raise ValueError("Invalid invoice ID format")
    safe_path = Path("/tmp") / f"{invoice_id}.pdf"
    result = subprocess.run(
        ["wkhtmltopdf", str(safe_path), "output.pdf"],  # no shell=True
        capture_output=True,
        check=True,
    )
```

Validation at the boundary with Pydantic:

```python
# src/schemas/invoice.py
from pydantic import BaseModel, field_validator, constr
import re

class InvoiceCreate(BaseModel):
    number: constr(pattern=r'^INV-\d{4,8}$')  # strict format
    client_name: constr(min_length=1, max_length=200)
    subtotal: Decimal = Field(..., ge=0, le=1_000_000)

    @field_validator('client_name')
    @classmethod
    def no_script_tags(cls, v: str) -> str:
        if re.search(r'<script', v, re.IGNORECASE):
            raise ValueError('Invalid characters in client name')
        return v.strip()
```

---

### 2. Broken Authentication (A07:2021)

#### JWT Best Practices

```python
# src/services/auth_service.py
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

ACCESS_TOKEN_EXPIRE_MINUTES = 15    # short-lived — 15 minutes max
REFRESH_TOKEN_EXPIRE_DAYS = 7

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire, "type": "access"},
        key=settings.JWT_SECRET,
        algorithm="HS256",
    )

def create_refresh_token() -> str:
    """Opaque random token stored server-side (in DB or Redis)."""
    return secrets.token_urlsafe(64)

def decode_access_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return int(payload["sub"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
```

Password rules:
- Always use `argon2` or `bcrypt` — **never MD5, SHA1, or SHA256 without salt**
- Minimum cost factor: argon2id with time_cost=2, memory_cost=65536

```python
# ❌ BAD — MD5, reversible, catastrophically insecure
import hashlib
hashed = hashlib.md5(password.encode()).hexdigest()

# ❌ BAD — SHA256 without salt, still rainbow-table-able
hashed = hashlib.sha256(password.encode()).hexdigest()

# ✅ GOOD — argon2id via passlib
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
hashed = pwd_context.hash(password)
```

JWT storage in the frontend:
- Access token: in-memory only (React state or Zustand store — NOT localStorage)
- Refresh token: `HttpOnly; Secure; SameSite=Strict` cookie set by the server

```typescript
// src/lib/auth.ts
// Access token lives only in memory — wipes on tab close
let accessToken: string | null = null

export function setToken(token: string): void {
  accessToken = token
}

export function getToken(): string | null {
  return accessToken
}

export function clearToken(): void {
  accessToken = null
}

// ❌ BAD — localStorage is readable by any JS on the page (XSS)
localStorage.setItem('token', accessToken)
```

---

### 3. Broken Access Control (A01:2021)

Every resource access must verify **ownership**, not just existence.

```python
# ❌ BAD — trusts user-provided ID, returns any invoice
@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: int, db: AsyncSession = Depends(get_db)):
    invoice = await db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Not found")
    return invoice

# ✅ GOOD — always scoped to the authenticated user
@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    result = await db.execute(
        select(Invoice).where(
            Invoice.id == invoice_id,
            Invoice.user_id == current_user.id,  # ownership check in the query
        )
    )
    invoice = result.scalar_one_or_none()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return InvoiceResponse.model_validate(invoice)
```

Reusable ownership dependency:

```python
# src/dependencies/ownership.py
async def get_invoice_for_user(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Invoice:
    result = await db.execute(
        select(Invoice).where(
            Invoice.id == invoice_id,
            Invoice.user_id == current_user.id,
        )
    )
    invoice = result.scalar_one_or_none()
    if invoice is None:
        # Return 404, not 403 — don't reveal the resource exists
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

# Usage
@router.delete("/invoices/{invoice_id}", status_code=204)
async def delete_invoice(
    invoice: Invoice = Depends(get_invoice_for_user),
    db: AsyncSession = Depends(get_db),
):
    await db.delete(invoice)
    await db.commit()
```

Role-based access:

```python
# src/dependencies/roles.py
from enum import StrEnum

class Role(StrEnum):
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"

def require_role(*roles: Role):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return dependency

# Usage
@router.post("/admin/users/{user_id}/suspend")
async def suspend_user(
    user_id: int,
    _: User = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    ...
```

---

### 4. Security Misconfiguration (A05:2021)

#### CORS — Never use `*` in production

```python
# src/main.py
from fastapi.middleware.cors import CORSMiddleware
import os

ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")

# ❌ BAD — allows any origin to call your API with credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
)

# ✅ GOOD — explicit allowlist from environment variable
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

`.env` for local:
```
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

Production (Cloud Run / VPS environment):
```
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com
```

#### Security Headers Middleware

```python
# src/middleware/security_headers.py
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.yourdomain.com"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # Remove server fingerprinting
        response.headers.pop("server", None)
        return response

# src/main.py
app.add_middleware(SecurityHeadersMiddleware)
```

---

### 5. Sensitive Data Exposure (A02:2021)

#### Never log sensitive data

```python
# ❌ BAD
logger.info(f"User {user.email} logged in with password {password}")
logger.debug(f"Stripe response: {stripe_response}")  # may contain card data
logger.error(f"Auth failed for token: {token}")

# ✅ GOOD
logger.info("User login attempt", extra={"user_id": user.id})
logger.debug("Stripe payment processed", extra={"invoice_id": invoice.id, "amount": amount})
logger.error("Auth failed", extra={"reason": "invalid_signature"})
```

#### Mask sensitive fields in API responses

```python
# ❌ BAD — exposes internal data
class UserResponse(BaseModel):
    id: int
    email: str
    hashed_password: str  # never expose this
    stripe_customer_id: str  # internal identifier, no need to expose
    created_at: datetime

# ✅ GOOD — explicit allowlist of safe fields
class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

```typescript
// ❌ BAD — frontend logs sensitive data
console.log('Auth response:', authResponse)  // may contain token
console.error('API error:', error)           // may contain user data in error body

// ✅ GOOD — log only what's needed for debugging
console.error('API error', { status: error.status, endpoint: error.url })
```

#### Environment variables — no hardcoded secrets

```python
# ❌ BAD
DATABASE_URL = "postgresql://admin:supersecret@prod-db:5432/app"
JWT_SECRET = "my-jwt-secret-key-123"
STRIPE_KEY = "sk_live_abc123..."

# ✅ GOOD
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    stripe_secret_key: str
    environment: str = "development"

    model_config = SettingsConfig(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
```

---

## OWASP ASVS L1 — Pre-PR Checklist

Before every PR that touches auth, data access, or API endpoints:

- [ ] All SQL queries use parameterized statements or ORM (no string interpolation)
- [ ] User input validated with Pydantic/Zod before use
- [ ] Access token expiry is 15 minutes or less
- [ ] Passwords hashed with argon2id or bcrypt (no MD5, SHA1)
- [ ] Every resource endpoint checks ownership (`AND user_id = :current_user_id`)
- [ ] No secrets or credentials in source code or logs
- [ ] CORS allowlist does not include `*` in non-development environments
- [ ] Security headers middleware is active
- [ ] API responses do not expose `hashed_password`, internal IDs, or PII unnecessarily
- [ ] Error messages do not reveal internal stack traces in production

---

## Secrets Management

### Local development

```bash
# .env (never commit this file)
DATABASE_URL=postgresql://postgres:localpass@localhost:5432/appdb
JWT_SECRET=local-dev-secret-change-in-production
STRIPE_SECRET_KEY=sk_test_...

# .env.example (commit this — no real values)
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=generate-with-openssl-rand-hex-32
STRIPE_SECRET_KEY=sk_test_or_sk_live_from_stripe_dashboard
```

```gitignore
# .gitignore
.env
.env.local
.env.*.local
```

### CI/CD — GitHub Secrets

Store all production secrets in **GitHub Secrets** (`Settings → Secrets and variables → Actions`). Reference them in workflows:

```yaml
# .github/workflows/deploy.yml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
```

### Secret scanning — detect before it ships

```yaml
# .github/workflows/secret-scan.yml
name: Secret Scan
on: [push, pull_request]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### If a secret is accidentally committed

Act immediately — assume the secret is already compromised:

```bash
# Step 1: Revoke the exposed secret immediately (rotate in the provider dashboard)
# Step 2: Remove from git history

git filter-repo --path-glob '*.env' --invert-paths
# or for a specific string:
git filter-repo --replace-text <(echo 'sk_live_XXXX==>REDACTED')

# Step 3: Force push all branches (coordinate with team)
git push origin --force --all
git push origin --force --tags

# Step 4: Notify the team — all local clones must be recloned
# Step 5: Audit logs for unauthorized usage of the exposed secret
```

---

## Input Validation

Validate at the boundary. Reject early. Never sanitize and continue — fail fast.

```python
# src/schemas/invoice.py
from pydantic import BaseModel, field_validator, Field
from decimal import Decimal
import re

class InvoiceCreate(BaseModel):
    number: str = Field(..., pattern=r'^INV-\d{4,8}$')
    client_name: str = Field(..., min_length=1, max_length=200)
    client_email: EmailStr
    subtotal: Decimal = Field(..., ge=Decimal("0.01"), le=Decimal("999999.99"))
    currency: str = Field(..., pattern=r'^[A-Z]{3}$')  # ISO 4217
    due_date: date

    @field_validator('due_date')
    @classmethod
    def due_date_must_be_future(cls, v: date) -> date:
        if v <= date.today():
            raise ValueError('Due date must be in the future')
        return v
```

```typescript
// src/schemas/invoice.ts — Zod for runtime validation
import { z } from 'zod'

export const createInvoiceSchema = z.object({
  number: z.string().regex(/^INV-\d{4,8}$/, 'Invalid invoice number format'),
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().email(),
  subtotal: z.number().positive().max(999999.99),
  currency: z.string().regex(/^[A-Z]{3}$/),
  dueDate: z.string().datetime().refine(
    (val) => new Date(val) > new Date(),
    { message: 'Due date must be in the future' }
  ),
})

export type CreateInvoiceDto = z.infer<typeof createInvoiceSchema>

// In the form handler
function handleSubmit(rawData: unknown) {
  const result = createInvoiceSchema.safeParse(rawData)
  if (!result.success) {
    // Reject — don't sanitize and proceed
    setErrors(result.error.flatten().fieldErrors)
    return
  }
  await createInvoice(result.data)
}
```

---

## Rate Limiting

Protect all unauthenticated endpoints. Use `slowapi` for FastAPI:

```python
# src/middleware/rate_limit.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

# src/main.py
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# src/routers/auth.py
@router.post("/auth/login")
@limiter.limit("5/minute")  # 5 attempts per minute per IP
async def login(request: Request, credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    ...

@router.post("/auth/register")
@limiter.limit("3/minute")
async def register(request: Request, data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    ...
```
