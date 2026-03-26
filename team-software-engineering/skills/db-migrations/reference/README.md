# Database Migrations — Reference Code

Language-specific migration implementations aligned with the [DB Migrations Skill](../SKILL.md).

## Files

| File | Stack | Key topics |
|------|-------|-----------|
| [python.md](./python.md) | Python / Alembic / SQLAlchemy | Migration scripts, batch backfill, soft delete, indexes |
| [csharp.md](./csharp.md) | C# / EF Core | Migration classes, batch backfill via SQL, global query filters |
| [typescript.md](./typescript.md) | TypeScript / Prisma | Schema DSL, migrate commands, seed scripts |

## Zero-downtime migration checklist

- [ ] NEVER rename column in one step — use Expand-Contract (3 phases)
- [ ] ADD COLUMN with NOT NULL requires DEFAULT or backfill first
- [ ] CREATE INDEX uses CONCURRENTLY (PostgreSQL)
- [ ] SET lock_timeout before any DDL on large tables
- [ ] Backfill in batches of 10,000 rows max
