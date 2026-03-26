# TypeScript / Prisma — DB Migrations Reference

## 1. Prisma schema — User and Order models

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String    @id @default(uuid())
  email     String    @unique
  name      String
  isActive  Boolean   @default(true) @map("is_active")
  createdAt DateTime  @default(now()) @map("created_at")
  deletedAt DateTime? @map("deleted_at")

  orders    Order[]

  @@map("users")
  @@index([email])
  @@index([isActive, createdAt], map: "idx_users_active_created")
}

model Order {
  id        String      @id @default(uuid())
  userId    String      @map("user_id")
  status    OrderStatus @default(PENDING)
  total     Decimal     @db.Decimal(10, 2)
  createdAt DateTime    @default(now()) @map("created_at")
  deletedAt DateTime?   @map("deleted_at")

  user      User        @relation(fields: [userId], references: [id])

  @@map("orders")
  @@index([userId, status])
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  CANCELLED
}
```

---

## 2. Migration commands

```bash
# Create and apply a migration in development (updates schema.prisma → creates SQL file → applies)
npx prisma migrate dev --name add_users_table

# Apply pending migrations in CI / production (no schema changes, no interactive prompts)
npx prisma migrate deploy

# Reset DB and re-apply all migrations + seed (DEV ONLY — destroys data)
npx prisma migrate reset

# Show migration status (applied vs pending)
npx prisma migrate status

# Run seed script defined in package.json prisma.seed
npx prisma db seed

# Open Prisma Studio (GUI browser for DB)
npx prisma studio

# Regenerate Prisma Client after schema change (usually run automatically by migrate dev)
npx prisma generate
```

---

## 3. Seed script — `prisma/seed.ts`

```typescript
// prisma/seed.ts
import { PrismaClient, OrderStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.$transaction(async (tx) => {
    // Upsert admin user (idempotent)
    const admin = await tx.user.upsert({
      where:  { email: 'admin@example.com' },
      update: {},
      create: {
        email:    'admin@example.com',
        name:     'Admin',
        isActive: true,
      },
    })

    // Create sample orders only if none exist
    const count = await tx.order.count({ where: { userId: admin.id } })
    if (count === 0) {
      await tx.order.createMany({
        data: [
          { userId: admin.id, status: OrderStatus.PAID,    total: 49.99 },
          { userId: admin.id, status: OrderStatus.PENDING, total: 12.50 },
        ],
      })
    }
  })

  console.log('Seed complete')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

```json
// package.json — register seed script
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## 4. Soft delete in Prisma — extension to filter deleted rows

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const basePrisma = new PrismaClient()

export const prisma = basePrisma.$extends({
  name: 'softDelete',
  model: {
    $allModels: {
      // Override delete → set deletedAt
      async softDelete<T>(this: T, where: Record<string, unknown>) {
        const ctx = Prisma.getExtensionContext(this) as any
        return ctx.update({ where, data: { deletedAt: new Date() } })
      },
    },
  },
  query: {
    $allModels: {
      // Automatically exclude soft-deleted rows in every query
      async findMany({ model, operation, args, query }) {
        args.where = { ...args.where, deletedAt: null }
        return query(args)
      },
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: null }
        return query(args)
      },
      async findUnique({ args, query }) {
        args.where = { ...args.where, deletedAt: null }
        return query(args)
      },
      async count({ args, query }) {
        args.where = { ...args.where, deletedAt: null }
        return query(args)
      },
    },
  },
})

// Usage:
await prisma.user.softDelete({ id: userId })      // soft delete
await prisma.user.findMany()                       // automatically excludes deleted
```

---

## 5. Expand-Contract with Prisma — two separate migrations

### Migration 1 — Phase 1: add `fullName`, backfill, enforce NOT NULL

```sql
-- prisma/migrations/20240901_add_full_name/migration.sql

-- Step 1: Add nullable column
ALTER TABLE "users" ADD COLUMN "full_name" TEXT;

-- Step 2: Backfill
UPDATE "users"
SET    "full_name" = "first_name" || ' ' || "last_name"
WHERE  "full_name" IS NULL;

-- Step 3: Enforce NOT NULL
ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL;
```

### Migration 2 — Phase 3: drop old columns (separate deploy, after app code updated)

```sql
-- prisma/migrations/20240915_drop_first_last_name/migration.sql

ALTER TABLE "users" DROP COLUMN "first_name";
ALTER TABLE "users" DROP COLUMN "last_name";
```

> **Note:** Edit generated migration files before running `prisma migrate deploy` to add backfill SQL or CONCURRENTLY indexes.

---

## 6. Index strategy — `@@index`, `@@unique` in schema

```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique                                      // unique index
  tenantId  String    @map("tenant_id")
  createdAt DateTime  @default(now()) @map("created_at")
  deletedAt DateTime? @map("deleted_at")

  @@map("users")

  // Composite index for multi-tenant queries
  @@index([tenantId, createdAt], map: "idx_users_tenant_created")

  // Unique constraint scoped to tenant (unique email per tenant)
  @@unique([tenantId, email], map: "uq_users_tenant_email")
}

model Order {
  id       String @id @default(uuid())
  userId   String @map("user_id")
  status   String
  total    Decimal @db.Decimal(10, 2)

  @@map("orders")
  @@index([userId])
  @@index([userId, status], map: "idx_orders_user_status")
}
```

---

## 7. Raw SQL in migration — backfill via `executeRawUnsafe`

```typescript
// Use in a one-off script (NOT in application code path)
// scripts/backfill-full-name.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BATCH  = 10_000

async function main() {
  let offset = 0
  let updated: number

  do {
    const result = await prisma.$executeRawUnsafe(`
      UPDATE users
      SET    full_name = first_name || ' ' || last_name
      WHERE  full_name IS NULL
        AND  id IN (
            SELECT id FROM users
            WHERE  full_name IS NULL
            ORDER  BY id
            LIMIT  ${BATCH}
            OFFSET ${offset}
        )
    `)

    updated = result
    offset += BATCH
    console.log(`Backfilled ${updated} rows (offset ${offset})`)

    await new Promise(r => setTimeout(r, 100))  // yield between batches
  } while (updated === BATCH)

  console.log('Backfill complete')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

```bash
# Run the backfill script
npx ts-node scripts/backfill-full-name.ts
```
