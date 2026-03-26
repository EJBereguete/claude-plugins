# Skill: Database Migrations & Design Standards

## Principios base

- Cada migración es irreversible en producción — diseña con rollback en mente
- Nunca modificar una migración ya aplicada en staging/prod
- Una migración = un cambio lógico atómico
- Las migraciones van en control de versiones junto al código
- En tablas grandes (>1M rows): siempre usar operaciones sin lock

---

## Convenciones de naming (PostgreSQL)

### Tablas
- Plural, snake_case: `users`, `orders`, `order_items`, `invoice_line_items`
- Sin prefijos de tipo: `users` no `tbl_users`
- Tablas de relación N:N: `user_roles`, `product_categories`

### Columnas
- Singular, snake_case: `first_name`, `created_at`, `is_active`
- Primary key: `id` (UUID recomendado)
- Foreign keys: `{tabla_referenciada_singular}_id` — ej: `user_id`, `order_id`
- Timestamps estándar: `created_at`, `updated_at`, `deleted_at` (para soft delete)
- Booleanos: prefijo `is_` o `has_`: `is_active`, `has_newsletter`, `is_verified`

### Índices
```sql
-- Patrón: idx_{tabla}_{columna(s)}
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

### Constraints
```sql
-- Foreign key: fk_{tabla}_{columna}
ALTER TABLE orders ADD CONSTRAINT fk_orders_user_id
    FOREIGN KEY (user_id) REFERENCES users(id);

-- Unique: {tabla}_{columna}_key
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Check: chk_{tabla}_{descripcion}
ALTER TABLE orders ADD CONSTRAINT chk_orders_positive_total
    CHECK (total_amount > 0);
```

---

## Migraciones zero-downtime

### Expand-Contract Pattern — la regla de oro

Nunca operaciones destructivas directas. Siempre 3 fases:

**Fase 1 — Expand:** agregar nueva estructura sin eliminar la vieja
```sql
ALTER TABLE users ADD COLUMN display_name VARCHAR(200);
```

**Fase 2 — Migrate:** deploy de código que usa la nueva columna con fallback
```python
display_name = user.display_name or user.username
```

**Fase 3 — Contract:** eliminar la vieja columna cuando el código nuevo es estable
```sql
ALTER TABLE users DROP COLUMN username;
```

### Operaciones seguras vs peligrosas

**SEGURAS (no bloquean):**
```sql
-- Agregar columna nullable
ALTER TABLE orders ADD COLUMN notes TEXT;

-- Agregar columna con default constant
ALTER TABLE orders ADD COLUMN priority INTEGER DEFAULT 0;

-- Crear índice sin lock (PostgreSQL)
CREATE INDEX CONCURRENTLY idx_orders_customer_id ON orders(customer_id);
-- CONCURRENTLY no puede estar dentro de BEGIN/COMMIT

-- Agregar foreign key sin validar datos existentes
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer_id
    FOREIGN KEY (customer_id) REFERENCES customers(id) NOT VALID;

-- Validar en paso separado (lock brevísimo)
ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_customer_id;
```

**PELIGROSAS (bloquean la tabla — evitar en prod con datos):**
```sql
-- Agregar NOT NULL sin default en tabla con datos existentes
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;  -- BLOQUEA

-- Cambiar tipo de columna
ALTER TABLE orders ALTER COLUMN total TYPE BIGINT;  -- BLOQUEA

-- Crear índice sin CONCURRENTLY en tabla grande
CREATE INDEX idx_orders_date ON orders(created_at);  -- BLOQUEA

-- DROP TABLE, DROP COLUMN — irreversible
```

**NOT NULL sin bloqueo — secuencia correcta:**
```sql
-- Paso 1: agregar nullable con default temporal
ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT 'TBD';
UPDATE users SET phone = 'TBD' WHERE phone IS NULL;

-- Paso 2: agregar constraint NOT VALID (no escanea tabla)
ALTER TABLE users
    ADD CONSTRAINT users_phone_not_null CHECK (phone IS NOT NULL) NOT VALID;

-- Paso 3: validar en paso separado (lock brevísimo)
ALTER TABLE users VALIDATE CONSTRAINT users_phone_not_null;
```

### Backfills en tablas grandes

```python
# Alembic — backfill por batches para evitar locks prolongados
def upgrade() -> None:
    op.add_column("orders", sa.Column("display_currency", sa.String(3), nullable=True))

    connection = op.get_bind()
    batch_size = 10_000
    last_id = 0

    while True:
        result = connection.execute(
            text("""
                UPDATE orders
                SET display_currency = currency
                WHERE id > :last_id AND display_currency IS NULL
                ORDER BY id
                LIMIT :batch_size
                RETURNING id
            """),
            {"last_id": last_id, "batch_size": batch_size},
        )
        rows = result.fetchall()
        if not rows:
            break
        last_id = rows[-1][0]
        # En prod: time.sleep(0.05) da tiempo al autovacuum
```

**C# / EF Core — Backfill por batches:**
```csharp
// Migrations/20240315_AddDisplayCurrency.cs
public partial class AddDisplayCurrency : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "display_currency",
            table: "orders",
            type: "varchar(3)",
            nullable: true);

        // Backfill por batches vía SQL directo
        migrationBuilder.Sql("""
            DO $$
            DECLARE
                batch_size INT := 10000;
                last_id UUID := '00000000-0000-0000-0000-000000000000';
                affected INT;
            BEGIN
                LOOP
                    WITH updated AS (
                        UPDATE orders
                        SET display_currency = currency
                        WHERE id > last_id
                          AND display_currency IS NULL
                        ORDER BY id
                        LIMIT batch_size
                        RETURNING id
                    )
                    SELECT COUNT(*), MAX(id) INTO affected, last_id FROM updated;
                    EXIT WHEN affected = 0;
                END LOOP;
            END $$;
        """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "display_currency", table: "orders");
    }
}
```

### Lock timeouts — obligatorios en prod

```sql
SET lock_timeout = '5s';       -- Si no puede adquirir lock en 5s, falla
SET statement_timeout = '30s'; -- Si la operación tarda más de 30s, falla

ALTER TABLE users ADD COLUMN verified_at TIMESTAMPTZ;
```

---

## Soft Delete — patrón

```sql
-- Columna estándar
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Índice parcial para queries de activos (más pequeño y rápido)
CREATE INDEX CONCURRENTLY idx_users_active ON users(email)
WHERE deleted_at IS NULL;
```

```python
# SQLAlchemy 2.x
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import TIMESTAMP

class SoftDeleteMixin:
    deleted_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True, default=None
    )

    def soft_delete(self) -> None:
        self.deleted_at = datetime.now(timezone.utc)

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
```

**Soft Delete en C# / EF Core:**
```csharp
// Domain/Common/SoftDeletableEntity.cs
public abstract class SoftDeletableEntity : BaseEntity
{
    public DateTime? DeletedAt { get; private set; }
    public bool IsDeleted => DeletedAt.HasValue;

    public void SoftDelete() => DeletedAt = DateTime.UtcNow;
}

// Infrastructure/Persistence/AppDbContext.cs
public class AppDbContext : DbContext
{
    protected override void OnModelCreating(ModelBuilder builder)
    {
        // Global query filter — excluye soft-deleted de todas las queries
        foreach (var entityType in builder.Model.GetEntityTypes()
            .Where(t => typeof(SoftDeletableEntity).IsAssignableFrom(t.ClrType)))
        {
            builder.Entity(entityType.ClrType)
                .HasQueryFilter(
                    Expression.Lambda(
                        Expression.Equal(
                            Expression.Property(
                                Expression.Parameter(entityType.ClrType, "e"),
                                nameof(SoftDeletableEntity.DeletedAt)),
                            Expression.Constant(null)),
                        Expression.Parameter(entityType.ClrType, "e")));
        }
    }

    // Override SaveChanges para interceptar hard deletes
    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<SoftDeletableEntity>()
            .Where(e => e.State == EntityState.Deleted))
        {
            entry.State = EntityState.Modified;
            entry.Entity.SoftDelete();
        }
        return base.SaveChangesAsync(ct);
    }
}
```

**Cuándo NO usar soft delete:**
- Datos sujetos a GDPR / derecho al olvido — hard delete + audit log separado
- Tablas de eventos/logs — append-only por naturaleza
- Relaciones donde el soft delete genera inconsistencias en FK

---

## Estrategia de índices

```sql
-- Índice simple: queries de igualdad
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);

-- Índice compuesto: la columna más selectiva primero
CREATE INDEX CONCURRENTLY idx_orders_user_status ON orders(user_id, status);

-- Índice parcial: solo subset de filas — más pequeño, más rápido
CREATE INDEX CONCURRENTLY idx_users_unverified
    ON users(created_at) WHERE verified_at IS NULL;

-- Índice covering: incluir columnas extra para evitar heap scan
CREATE INDEX CONCURRENTLY idx_orders_covering
    ON orders(user_id) INCLUDE (total_amount, status, created_at);
```

**Siempre indexar:**
- Todas las foreign keys
- Columnas en WHERE con alta cardinalidad y queries frecuentes
- Columnas en ORDER BY de queries lentas (con dirección: DESC si aplica)

**No indexar:**
- Columnas booleanas solas (baja cardinalidad)
- Tablas < 1000 rows
- Columnas solo escritas, nunca leídas en SELECT

---

## Por framework

```bash
# Alembic (FastAPI / SQLAlchemy)
alembic revision --autogenerate -m "add_phone_to_users"
alembic upgrade head
alembic downgrade -1
alembic history --verbose

# Prisma (Node.js / TypeScript)
npx prisma migrate dev --name add_phone_to_users    # dev
npx prisma migrate deploy                           # prod (solo aplica, no genera)

# Supabase
supabase db diff --file add_phone_to_users          # generar migración
supabase db push                                    # aplicar

# EF Core (.NET)
dotnet ef migrations add AddDisplayCurrencyToOrders --project src/Infrastructure
dotnet ef database update                           # aplicar todas las pendientes
dotnet ef migrations script                         # generar SQL puro
dotnet ef database update 20240101_PreviousMigration # rollback a migración específica
```

---

## Checklist antes de producción

- [ ] Migración probada en desarrollo y staging con dataset similar a prod
- [ ] Backup reciente de la base de datos confirmado
- [ ] Rollback script preparado y probado
- [ ] `EXPLAIN ANALYZE` ejecutado para estimar duración
- [ ] `lock_timeout` y `statement_timeout` configurados
- [ ] `CREATE INDEX` usa `CONCURRENTLY`
- [ ] `ADD COLUMN NOT NULL` tiene valor DEFAULT o backfill planificado por batches
- [ ] No hay DROP TABLE / DROP COLUMN sin confirmación de que nada lo usa
- [ ] Equipo notificado si la migración puede afectar disponibilidad
- [ ] Monitoreo activo durante la ejecución
