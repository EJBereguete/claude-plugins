# Skill: Database Migrations

## Principios

- Cada migración es irreversible en producción — diseña con rollback en mente
- Nunca modificar una migración ya aplicada
- Una migración = un cambio lógico
- Migraciones van en control de versiones con el código

## Operaciones seguras

**Agregar columna (tabla grande)**
```sql
-- 1. Agregar nullable primero
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- 2. Backfill por batches si necesario
-- 3. Agregar NOT NULL en migración separada
```

**Renombrar columna (sin downtime)**
```sql
-- Migración 1: agregar nueva columna
-- Deploy 1: código lee ambas columnas
-- Migración 2: backfill datos
-- Deploy 2: código solo usa nueva columna
-- Migración 3: DROP columna vieja
```

**Índices sin bloquear (PostgreSQL)**
```sql
CREATE INDEX CONCURRENTLY idx_orders_customer_id ON orders(customer_id);
-- CONCURRENTLY no puede estar dentro de BEGIN/COMMIT
```

## Por framework

```bash
# Alembic
alembic revision --autogenerate -m "add phone to users"
alembic upgrade head
alembic downgrade -1

# Prisma
npx prisma migrate dev --name add_phone_to_users
npx prisma migrate deploy  # producción

# Supabase
supabase db diff --file nombre_migracion
supabase db push
```

## Checklist antes de producción

- [ ] Migración probada en desarrollo y staging
- [ ] Backup reciente de la base de datos
- [ ] Rollback script preparado y probado
- [ ] Estimado de tiempo para tablas grandes
- [ ] Equipo notificado
