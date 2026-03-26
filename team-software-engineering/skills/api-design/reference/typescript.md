# API Design — TypeScript / Express / Hono Examples

## Custom Error Classes

```typescript
// src/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly title: string,
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(422, 'Validation Error', message, 'validation-error')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const detail = id ? `${resource} with id '${id}' was not found.` : `${resource} was not found.`
    super(404, 'Not Found', detail, 'not-found')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'Conflict', message, 'conflict')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.') {
    super(401, 'Unauthorized', message, 'unauthorized')
  }
}
```

## RFC 9457 — Express Error Handler

```typescript
// src/middleware/errorHandler.ts
import { ErrorRequestHandler } from 'express'
import { AppError, ValidationError } from '../errors/AppError'

interface ProblemDetail {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  errors?: Record<string, string[]>
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = err instanceof AppError ? err.statusCode : 500
  const title  = err instanceof AppError ? err.title : 'Internal Server Error'
  const code   = err instanceof AppError ? err.code  : 'server-error'

  const body: ProblemDetail = {
    type:     `https://api.example.com/errors/${code}`,
    title,
    status,
    detail:   err.message ?? 'An unexpected error occurred.',
    instance: req.path,
  }

  if (err instanceof ValidationError && err.errors) {
    body.errors = err.errors
  }

  if (process.env.NODE_ENV !== 'production' && !(err instanceof AppError)) {
    console.error(err)
  }

  res.status(status).type('application/problem+json').json(body)
}
```

## Zod Validation Middleware

```typescript
// src/middleware/validate.ts
import { RequestHandler } from 'express'
import { ZodSchema, ZodError } from 'zod'
import { ValidationError } from '../errors/AppError'

export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = formatZodErrors(result.error)
      return next(new ValidationError('The request body contains invalid fields.', errors))
    }
    req.body = result.data
    next()
  }
}

export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      const errors = formatZodErrors(result.error)
      return next(new ValidationError('The query parameters are invalid.', errors))
    }
    req.query = result.data as typeof req.query
    next()
  }
}

function formatZodErrors(error: ZodError): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path.join('.') || '_root'
    acc[key] = [...(acc[key] ?? []), issue.message]
    return acc
  }, {})
}

// Usage
import { z } from 'zod'

const CreateUserSchema = z.object({
  name:     z.string().min(1).max(100),
  email:    z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain digit'),
})

router.post('/users', validateBody(CreateUserSchema), createUser)
```

## Cursor Pagination

```typescript
// src/utils/pagination.ts
export interface PaginationMeta {
  hasNext:    boolean
  nextCursor: string | null
  hasPrev:    boolean
  prevCursor: string | null
}

export interface PaginatedResponse<T> {
  data:       T[]
  pagination: PaginationMeta
}

export function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url')
}

export function decodeCursor<T = Record<string, unknown>>(cursor: string): T {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as T
}

export function buildPaginatedResponse<T>(
  items:  T[],
  limit:  number,
  cursor: (item: T) => Record<string, unknown>,
  after?: string,
): PaginatedResponse<T> {
  const hasNext   = items.length > limit
  const page      = hasNext ? items.slice(0, limit) : items
  const nextCursor = hasNext ? encodeCursor(cursor(page[page.length - 1])) : null

  return {
    data: page,
    pagination: {
      hasNext,
      nextCursor,
      hasPrev:    !!after,
      prevCursor: null,
    },
  }
}

// Usage in route handler
router.get('/messages', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100)
    const after = req.query.after as string | undefined

    const afterId = after ? decodeCursor<{ id: string }>(after).id : undefined
    const rows    = await db.messages.findMany({ take: limit + 1, cursor: afterId ? { id: afterId } : undefined })

    res.json(buildPaginatedResponse(rows, limit, (m) => ({ id: m.id, createdAt: m.createdAt }), after))
  } catch (err) {
    next(err)
  }
})
```

## Rate Limiting — express-rate-limit

```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit'

export const apiRateLimit = rateLimit({
  windowMs:          60 * 1000,  // 1 minute
  limit:             100,
  standardHeaders:   'draft-7',  // RateLimit-Policy, RateLimit headers
  legacyHeaders:     false,
  handler: (_req, res) => {
    res.status(429).type('application/problem+json').json({
      type:   'https://api.example.com/errors/rate-limit-exceeded',
      title:  'Too Many Requests',
      status: 429,
      detail: 'Rate limit exceeded. Please retry after 60 seconds.',
    })
  },
})

export const strictRateLimit = rateLimit({
  windowMs:        15 * 60 * 1000,  // 15 minutes
  limit:           10,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  skipSuccessfulRequests: false,
})

// Usage in app.ts
app.use('/api/v1', apiRateLimit)
app.use('/api/v1/auth', strictRateLimit)  // Stricter limit on auth endpoints
```

## Express App Setup

```typescript
// src/app.ts
import express from 'express'
import { apiRateLimit } from './middleware/rateLimit'
import { errorHandler }  from './middleware/errorHandler'
import { userRouter }    from './features/users/userRouter'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rate limiting before routes
app.use('/api/v1', apiRateLimit)

// Routes
app.use('/api/v1/users', userRouter)

// Error handler must be last
app.use(errorHandler)

export { app }
```

---

## Hono Alternative

### RFC 9457 Error Handling — Hono

```typescript
// src/hono/errorHandler.ts
import { Hono, HTTPException } from 'hono'
import { AppError } from '../errors/AppError'

const app = new Hono()

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      {
        type:     `https://api.example.com/errors/${err.code}`,
        title:    err.title,
        status:   err.statusCode,
        detail:   err.message,
        instance: c.req.path,
      },
      err.statusCode,
      { 'Content-Type': 'application/problem+json' },
    )
  }

  if (err instanceof HTTPException) {
    return c.json(
      {
        type:   `https://api.example.com/errors/${err.status}`,
        title:  'HTTP Error',
        status: err.status,
        detail: err.message,
      },
      err.status,
      { 'Content-Type': 'application/problem+json' },
    )
  }

  console.error(err)
  return c.json(
    {
      type:   'https://api.example.com/errors/server-error',
      title:  'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred.',
    },
    500,
    { 'Content-Type': 'application/problem+json' },
  )
})
```

### Zod Validation — Hono with zod-validator

```typescript
// src/hono/routes/users.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const CreateUserSchema = z.object({
  name:     z.string().min(1).max(100),
  email:    z.string().email(),
  password: z.string().min(8),
})

const users = new Hono()

users.post(
  '/',
  zValidator('json', CreateUserSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          type:   'https://api.example.com/errors/validation-error',
          title:  'Validation Error',
          status: 422,
          detail: 'The request body contains invalid fields.',
          errors: result.error.flatten().fieldErrors,
        },
        422,
        { 'Content-Type': 'application/problem+json' },
      )
    }
  }),
  async (c) => {
    const body = c.req.valid('json')
    // ... create user logic
    return c.json({ id: 'new-id', ...body }, 201)
  },
)

export { users }
```

### Rate Limiting — Hono

```typescript
// src/hono/middleware/rateLimit.ts
import { rateLimiter } from 'hono-rate-limiter'

export const honoRateLimit = rateLimiter({
  windowMs: 60 * 1000,
  limit:    100,
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'unknown',
  handler: (c) =>
    c.json(
      {
        type:   'https://api.example.com/errors/rate-limit-exceeded',
        title:  'Too Many Requests',
        status: 429,
        detail: 'Rate limit exceeded. Please retry after 60 seconds.',
      },
      429,
      { 'Content-Type': 'application/problem+json' },
    ),
})

// Usage
app.use('/api/v1/*', honoRateLimit)
```
