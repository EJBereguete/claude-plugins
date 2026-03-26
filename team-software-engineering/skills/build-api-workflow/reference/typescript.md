# TypeScript / Express — Reference Implementation

Full, runnable example of the 3-layer API pattern using Express, Zod, Prisma, and Vitest.

---

## Router — `routes/invoices.ts`

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
      return res.status(422).json({
        type: 'https://api.example.com/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Invalid request body',
        errors: parsed.error.flatten(),
      })
    }
    const invoice = await new InvoiceService().create(parsed.data, req.user!.id)
    return res.status(201).json(invoice)
  } catch (error) {
    next(error)
  }
})

router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await new InvoiceService().get(req.params.id, req.user!.id)
    if (!invoice) {
      return res.status(404).json({
        type: 'https://api.example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Invoice ${req.params.id} not found`,
      })
    }
    return res.status(200).json(invoice)
  } catch (error) {
    next(error)
  }
})

export { router as invoiceRouter }
```

---

## Schemas — `schemas/invoice.ts`

```typescript
// schemas/invoice.ts
import { z } from 'zod'

export const LineItemSchema = z.object({
  description: z.string().min(1).max(255),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive().multipleOf(0.01),
})

export const InvoiceCreateSchema = z.object({
  customerName: z.string().min(1).max(255),
  items: z.array(LineItemSchema).min(1, {
    message: 'An invoice must have at least one line item.',
  }),
})

export type LineItem = z.infer<typeof LineItemSchema>
export type InvoiceCreate = z.infer<typeof InvoiceCreateSchema>

export const InvoiceResponseSchema = z.object({
  id: z.string().uuid(),
  customerName: z.string(),
  total: z.number(),
  ownerId: z.string().uuid(),
  createdAt: z.string().datetime(),
})

export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>
```

---

## Service — `services/invoiceService.ts`

```typescript
// services/invoiceService.ts
import { InvoiceRepository } from '../repositories/invoiceRepository'
import type { InvoiceCreate, InvoiceResponse } from '../schemas/invoice'

export class InvoiceService {
  private readonly repo = new InvoiceRepository()

  async create(payload: InvoiceCreate, ownerId: string): Promise<InvoiceResponse> {
    const total = payload.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )
    if (total <= 0) {
      throw new Error('Invoice total must be greater than zero.')
    }

    return this.repo.create({
      customerName: payload.customerName,
      items: payload.items,
      total,
      ownerId,
    })
  }

  async get(id: string, ownerId: string): Promise<InvoiceResponse | null> {
    const invoice = await this.repo.findById(id)
    if (!invoice) return null
    // Treat mismatched owner as not found to avoid information disclosure
    if (invoice.ownerId !== ownerId) return null
    return invoice
  }
}
```

---

## Repository — `repositories/invoiceRepository.ts`

```typescript
// repositories/invoiceRepository.ts
import { prisma } from '../db/client'
import type { InvoiceResponse } from '../schemas/invoice'

interface CreateInvoiceInput {
  customerName: string
  items: { description: string; quantity: number; unitPrice: number }[]
  total: number
  ownerId: string
}

export class InvoiceRepository {
  async create(input: CreateInvoiceInput): Promise<InvoiceResponse> {
    const invoice = await prisma.invoice.create({
      data: {
        customerName: input.customerName,
        total: input.total,
        ownerId: input.ownerId,
        items: {
          create: input.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
    })

    return {
      id: invoice.id,
      customerName: invoice.customerName,
      total: Number(invoice.total),
      ownerId: invoice.ownerId,
      createdAt: invoice.createdAt.toISOString(),
    }
  }

  async findById(id: string): Promise<InvoiceResponse | null> {
    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) return null
    return {
      id: invoice.id,
      customerName: invoice.customerName,
      total: Number(invoice.total),
      ownerId: invoice.ownerId,
      createdAt: invoice.createdAt.toISOString(),
    }
  }
}
```

---

## Error Middleware — `middleware/errorHandler.ts`

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express'

interface AppError extends Error {
  status?: number
  type?: string
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500

  res.status(status).json({
    type: err.type ?? 'https://tools.ietf.org/html/rfc9110#section-15.6.1',
    title: status === 500 ? 'Internal Server Error' : err.message,
    status,
    detail: status === 500 ? 'An unexpected error occurred.' : err.message,
  })
}
```

Register last in `app.ts`:

```typescript
// app.ts (excerpt)
import { errorHandler } from './middleware/errorHandler'
import { invoiceRouter } from './routes/invoices'

app.use('/api/v1/invoices', invoiceRouter)

// Must be registered after all routes
app.use(errorHandler)
```

---

## Tests — `tests/invoices.test.ts`

```typescript
// tests/invoices.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import { InvoiceService } from '../services/invoiceService'

vi.mock('../services/invoiceService')

const VALID_PAYLOAD = {
  customerName: 'Acme Corp',
  items: [
    { description: 'Widget A', quantity: 2, unitPrice: 10.0 },
    { description: 'Widget B', quantity: 1, unitPrice: 5.5 },
  ],
}

const MOCK_RESPONSE = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  customerName: 'Acme Corp',
  total: 25.5,
  ownerId: 'user-123',
  createdAt: new Date().toISOString(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/v1/invoices', () => {
  it('creates an invoice and returns 201', async () => {
    vi.mocked(InvoiceService.prototype.create).mockResolvedValueOnce(MOCK_RESPONSE)

    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', 'Bearer valid-test-token')
      .send(VALID_PAYLOAD)

    expect(res.status).toBe(201)
    expect(res.body.customerName).toBe('Acme Corp')
    expect(res.body.total).toBe(25.5)
  })

  it('returns 422 when items array is empty', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', 'Bearer valid-test-token')
      .send({ ...VALID_PAYLOAD, items: [] })

    expect(res.status).toBe(422)
    expect(res.body.errors).toBeDefined()
  })

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .send(VALID_PAYLOAD)

    expect(res.status).toBe(401)
  })
})
```
