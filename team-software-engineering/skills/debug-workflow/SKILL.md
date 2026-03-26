---
name: debug-workflow
description: >
  Debugging sistematico con analisis de causa raiz (5 Whys), reproduccion
  del error, fix minimo y test de regresion obligatorio. Categoriza el bug
  y lo documenta.
used_by:
  - backend-engineer
  - frontend-engineer
  - qa-engineer
---

# SKILL: Debug Workflow

## CONTRACT

- **Input**: descripcion del error, stack trace, o comportamiento inesperado
- **Output**: bug fixed + test de regresion escrito + causa raiz documentada + categoria del bug registrada
- **Who runs this**: @backend-engineer or @frontend-engineer for implementation, @qa-engineer validates the regression test

---

## PROCESS

### Step 1 — Reproduce the context

Read every file referenced in the stack trace or error message. Never guess — read the exact code.

```bash
# Find the file from a stack trace line like "app/services/invoice_service.py:42"
# Read it with the Read tool at line 42 with ±20 lines of context

# For frontend errors, find the compiled source map reference
grep -r "functionNameFromStackTrace" src/ --include="*.ts" --include="*.tsx" -l
```

Confirm you can reproduce the error mentally by tracing the execution path from input to failure. If you cannot reproduce it from reading the code, add a minimal reproduction case before proceeding.

---

### Step 2 — 5 Whys root cause analysis

Fill in this table before proposing any fix:

| Level | Question | Answer |
|-------|----------|--------|
| Error observado | What is happening? | [exact error message or behaviour] |
| Why 1 | Why does that happen? | [immediate technical cause] |
| Why 2 | Why does that cause exist? | [underlying mechanism] |
| Why 3 | Why was that mechanism flawed? | [design or logic gap] |
| Why 4 | Why was that gap not caught? | [missing test / missing validation] |
| Why 5 (root cause) | Why was there no safeguard? | [process or architectural gap] |

**Example — NullPointerException in invoice total calculation**:

| Level | Answer |
|-------|--------|
| Error observado | `AttributeError: 'NoneType' object has no attribute 'total'` in `invoice_service.py:58` |
| Why 1 | `invoice.total` is None when the invoice has no line items |
| Why 2 | The `create_invoice` function does not validate that `line_items` is non-empty before saving |
| Why 3 | The validation was assumed to happen in the API layer but the schema allowed an empty list |
| Why 4 | No test covered the empty line_items case — only the happy path was tested |
| Why 5 (root cause) | The team convention "validate in the service layer" was not enforced — business rules lived in the wrong layer |

---

### Step 3 — Propose two solutions

Always present both options before implementing:

**Fix inmediato (tactical patch)**: the minimum change that stops the bleeding. Appropriate when production is down and the correct fix takes time.

**Fix correcto (structural solution)**: addresses the root cause, not just the symptom. This is what you implement unless there is an active production incident requiring the tactical patch first.

**Example**:

Fix inmediato:
```python
# Add a guard at the point of failure
if invoice.total is None:
    invoice.total = Decimal("0.00")
```

Fix correcto:
```python
# In the service layer — enforce the business rule where it belongs
async def create_invoice(self, payload: InvoiceCreate, owner_id: uuid.UUID) -> Invoice:
    if not payload.line_items:
        raise ValueError("Invoice must have at least one line item")
    total = sum(item.quantity * item.unit_price for item in payload.line_items)
    return await self.repo.create(owner_id=owner_id, total=total)
```

Implement the fix correcto. Document the tactical patch only if it was applied as an emergency measure.

---

### Step 4 — Implement the fix

Apply the fix with the Edit tool — surgical, minimum change.

**Before (broken)**:
```python
# services/invoice_service.py:55-60
async def create_invoice(self, payload: InvoiceCreate, owner_id: uuid.UUID) -> Invoice:
    total = sum(item.quantity * item.unit_price for item in payload.line_items)
    return await self.repo.create(owner_id=owner_id, total=total)
```

**After (fixed)**:
```python
# services/invoice_service.py:55-62
async def create_invoice(self, payload: InvoiceCreate, owner_id: uuid.UUID) -> Invoice:
    if not payload.line_items:
        raise ValueError("Invoice must have at least one line item")
    total = sum(item.quantity * item.unit_price for item in payload.line_items)
    return await self.repo.create(owner_id=owner_id, total=total)
```

---

### Step 5 — Write the regression test

The regression test is the test that would have caught this bug BEFORE it reached production.

```python
# This test did not exist — it must exist now
@pytest.mark.asyncio
async def test_create_invoice_empty_line_items_raises_value_error():
    """
    Regression test for: AttributeError when creating invoice with no line items.
    Fixed in: feature/fix-empty-invoice-validation
    """
    service = InvoiceService(db=mock_db)
    with pytest.raises(ValueError, match="at least one line item"):
        await service.create_invoice(
            payload=InvoiceCreate(line_items=[]),
            owner_id=uuid.uuid4()
        )
```

The test must:
1. Test the exact condition that caused the bug
2. Include a docstring referencing the bug it prevents
3. Fail without the fix, pass with the fix (verify this mentally)

---

### Step 6 — Categorize the bug

Document the following:

**Type**: choose one:
- `Logic Error` — incorrect business rule implementation
- `Auth Issue` — missing or bypassed authorization check
- `DB Error` — query, constraint, or transaction issue
- `Race Condition` — concurrent access without proper locking
- `Config Error` — missing or wrong environment variable / configuration
- `Integration Error` — contract mismatch with external service
- `Type Error` — wrong type assumption (null, undefined, type mismatch)
- `Performance` — query or algorithm causing unacceptable latency

**Severity**:
- `Critical` — production down, data loss, or security breach
- `High` — significant feature broken for all or most users
- `Medium` — feature broken for some users or with a workaround
- `Low` — cosmetic issue or edge case with low impact

**Is regression?**: Did this work before? If yes, identify the commit that introduced it:
```bash
git log --oneline --all -- path/to/affected/file.py
git bisect start HEAD <last-known-good-commit>
```

---

### Step 7 — Create ADR if the bug reveals an architectural gap

If the 5 Whys analysis reveals that the bug is a symptom of a systemic architectural problem (wrong layering, missing abstraction, unclear ownership), execute the `adr-management` skill to document the architectural decision that prevents this class of bugs.

**Example trigger**: "We have three different places where invoice validation is happening — we need a single source of truth for business rules."

---

## EXAMPLES

**5 Whys — Race condition in seat reservation**:

| Level | Answer |
|-------|--------|
| Error observado | Two users book the same seat simultaneously |
| Why 1 | Both read `status = "available"` before either writes "reserved" |
| Why 2 | No database-level locking on the read-modify-write sequence |
| Why 3 | The service uses two separate queries instead of a single atomic UPDATE |
| Why 4 | Load tests did not simulate concurrent requests on the same resource |
| Why 5 (root cause) | The team had no convention for handling concurrent writes — this was an implicit assumption that the framework would handle it |

Fix: Replace two-query pattern with `SELECT ... FOR UPDATE` + single transaction.

---

## ANTI-PATTERNS

- Fixing the symptom without completing the 5 Whys — the bug will reappear in a different form
- Implementing the tactical patch and forgetting the structural fix — patches accumulate into unmaintainable code
- Writing the regression test after the fix passes — write it first, verify it fails, then verify it passes
- Not categorizing the bug — without categorization, the team cannot identify systemic patterns (e.g., "70% of our bugs are Type Errors — we need stricter schema validation")
- Fixing without reading the original code — assumptions about what the code does are almost always wrong
- Skipping the ADR when the root cause is architectural — the same class of bug will appear in a different module next sprint
