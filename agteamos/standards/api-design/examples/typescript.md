# API Design Patterns — Express / Hono

---

## 1. RFC 9457 Error Responses (`application/problem+json`)

### Custom error base class

```typescript
// errors/AppError.ts
export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly title: string

  constructor(opts: { message: string; statusCode: number; code: string; title: string }) {
    super(opts.message)
    this.name = 'AppError'
    this.statusCode = opts.statusCode
    this.code = opts.code
    this.title = opts.title
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super({
      message: `${resource} with id "${id}" not found`,
      statusCode: 404,
      code: 'not-found',
      title: 'Not Found',
    })
  }
}

export class ValidationError extends AppError {
  constructor(message: string, readonly fields?: Record<string, string[]>) {
    super({ message, statusCode: 422, code: 'validation-error', title: 'Validation Error' })
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super({ message, statusCode: 409, code: 'conflict', title: 'Conflict' })
  }
}
```

### Express error middleware

```typescript
// middleware/errorHandler.ts
import type { ErrorRequestHandler } from 'express'
import { AppError } from '../errors/AppError'
import { ZodError } from 'zod'

const BASE_URL = 'https://api.example.com/errors'

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Zod schema validation errors
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {}
    for (const issue of err.issues) {
      const path = issue.path.join('.')
      fields[path] = [...(fields[path] ?? []), issue.message]
    }
    return res.status(422).json({
      type: `${BASE_URL}/validation-error`,
      title: 'Validation Error',
      status: 422,
      detail: 'One or more fields are invalid.',
      instance: req.path,
      fields,
    })
  }

  // Known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      type: `${BASE_URL}/${err.code}`,
      title: err.title,
      status: err.statusCode,
      detail: err.message,
      instance: req.path,
    })
  }

  // Unknown errors — never leak internals in production
  const status = 500
  console.error('[unhandled]', err)
  return res.status(status).json({
    type: `${BASE_URL}/server-error`,
    title: 'Internal Server Error',
    status,
    detail: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
    instance: req.path,
  })
}
```

### Express app wiring

```typescript
// app.ts
import express from 'express'
import { usersRouter } from './routers/users.router'
import { errorHandler } from './middleware/errorHandler'

export function createApp() {
  const app = express()
  app.use(express.json())

  // All routers
  app.use('/api/v1/users', usersRouter)

  // Error handler must be last
  app.use(errorHandler)
  return app
}
```

---

## 2. Zod Input Validation

```typescript
// schemas/user.schema.ts
import { z } from 'zod'

export const CreateUserSchema = z.object({
  email: z.string().email('Must be a valid email'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>

// middleware/validate.ts
import { RequestHandler } from 'express'
import { ZodSchema } from 'zod'

export function validate<T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source])
    if (!result.success) return next(result.error)  // passed to error middleware
    req[source] = result.data                        // typed & sanitised data
    next()
  }
}

// routers/users.router.ts
import { Router } from 'express'
import { validate } from '../middleware/validate'
import { CreateUserSchema } from '../schemas/user.schema'
import { createUserHandler } from '../handlers/users.handler'

export const usersRouter = Router()

usersRouter.post('/', validate(CreateUserSchema), createUserHandler)
```

---

## 3. Cursor-Based Pagination

```typescript
// lib/pagination.ts
export interface CursorPage<T> {
  data: T[]
  pagination: {
    nextCursor: string | null
    hasMore: boolean
    limit: number
  }
}

export function encodeCursor(id: string): string {
  return Buffer.from(id).toString('base64url')
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf8')
}

// schemas/pagination.schema.ts
import { z } from 'zod'

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// handlers/users.handler.ts
import type { RequestHandler } from 'express'
import { PaginationSchema } from '../schemas/pagination.schema'
import { decodeCursor, encodeCursor } from '../lib/pagination'

export const listUsersHandler: RequestHandler = async (req, res, next) => {
  try {
    const { cursor, limit } = PaginationSchema.parse(req.query)
    const afterId = cursor ? decodeCursor(cursor) : undefined

    const rows = await userRepo.findMany({ afterId, limit: limit + 1 })
    const hasMore = rows.length > limit
    const data = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? encodeCursor(data[data.length - 1].id) : null

    res.json({
      data,
      pagination: { nextCursor, hasMore, limit },
    })
  } catch (err) {
    next(err)
  }
}
```

---

## 4. Rate Limiting

```typescript
// middleware/rateLimit.ts
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { redis } from '../lib/redis'

/** Standard API rate limit: 100 req/min per IP */
export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: 'draft-7',  // RateLimit-Policy header
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => redis.sendCommand(args) }),
  handler: (_req, res) => {
    res.status(429).json({
      type: 'https://api.example.com/errors/rate-limited',
      title: 'Too Many Requests',
      status: 429,
      detail: 'You have exceeded the request limit. Please try again later.',
    })
  },
})

/** Stricter limit for auth endpoints: 10 req/15 min per IP */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,  // only count failures
})
```

---

## 5. Hono + Zod OpenAPI

```typescript
// app.ts (Hono)
import { OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { createRoute } from '@hono/zod-openapi'

const app = new OpenAPIHono()

// Shared schemas
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string().datetime(),
}).openapi('User')

const CreateUserBodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
}).openapi('CreateUserBody')

const ProblemSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
  instance: z.string(),
}).openapi('Problem')

// Route definition — types flow from schema to handler automatically
const createUserRoute = createRoute({
  method: 'post',
  path: '/users',
  tags: ['Users'],
  summary: 'Create a new user',
  request: {
    body: { content: { 'application/json': { schema: CreateUserBodySchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'User created',
    },
    409: {
      content: { 'application/problem+json': { schema: ProblemSchema } },
      description: 'Email already registered',
    },
    422: {
      content: { 'application/problem+json': { schema: ProblemSchema } },
      description: 'Validation error',
    },
  },
})

app.openapi(createUserRoute, async (c) => {
  const body = c.req.valid('json')
  // body is fully typed as { email: string; name: string }
  const user = await createUserUseCase.execute(body)
  return c.json(user, 201)
})

// Serve OpenAPI spec
app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: { title: 'My API', version: '1.0.0' },
})
```

---

## 6. API Versioning

```typescript
// routers/index.ts
import { Router } from 'express'
import { usersRouterV1 } from './v1/users.router'
import { usersRouterV2 } from './v2/users.router'

export const apiRouter = Router()

// Version prefix pattern — clean and backwards-compatible
apiRouter.use('/v1/users', usersRouterV1)
apiRouter.use('/v2/users', usersRouterV2)

// app.ts
app.use('/api', apiRouter)

// Resulting routes:
// GET /api/v1/users
// GET /api/v2/users
```

---

## 7. Async Route Handler Wrapper

Avoid `try/catch` in every handler by wrapping with `asyncHandler`:

```typescript
// lib/asyncHandler.ts
import type { RequestHandler, Request, Response, NextFunction } from 'express'

type AsyncHandler<P = any, ResBody = any, ReqBody = any, ReqQuery = any> =
  (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => Promise<void>

export function asyncHandler<P = any, ResBody = any, ReqBody = any, ReqQuery = any>(
  fn: AsyncHandler<P, ResBody, ReqBody, ReqQuery>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    fn(req, res, next).catch(next)  // forwards thrown errors to errorHandler
  }
}

// Usage in router
usersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await userRepo.findById(req.params.id)
    if (!user) throw new NotFoundError('User', req.params.id)
    res.json(user)
  }),
)
```
