# C# / EF Core — DB Migrations Reference

## 1. EF Core CLI commands

```bash
# Add a new migration
dotnet ef migrations add AddUsersTable --project src/Infrastructure --startup-project src/Api

# Apply all pending migrations to the database
dotnet ef database update --project src/Infrastructure --startup-project src/Api

# Roll back to a specific migration
dotnet ef database update AddInitialSchema --project src/Infrastructure --startup-project src/Api

# Generate idempotent SQL script (for production deploy)
dotnet ef migrations script --idempotent --output migrations.sql \
    --project src/Infrastructure --startup-project src/Api

# List all migrations and their applied state
dotnet ef migrations list --project src/Infrastructure --startup-project src/Api

# Remove the last (not yet applied) migration
dotnet ef migrations remove --project src/Infrastructure --startup-project src/Api
```

---

## 2. Migration class structure

```csharp
// src/Infrastructure/Migrations/20240801120000_AddUsersTable.cs
using Microsoft.EntityFrameworkCore.Migrations;

/// <inheritdoc />
public partial class AddUsersTable : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Users",
            columns: table => new
            {
                Id        = table.Column<Guid>(nullable: false),
                Email     = table.Column<string>(maxLength: 255, nullable: false),
                Name      = table.Column<string>(maxLength: 255, nullable: false),
                IsActive  = table.Column<bool>(nullable: false, defaultValue: true),
                CreatedAt = table.Column<DateTime>(nullable: false),
                DeletedAt = table.Column<DateTime>(nullable: true),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Users", x => x.Id);
            });

        migrationBuilder.CreateIndex(
            name:    "IX_Users_Email",
            table:   "Users",
            column:  "Email",
            unique:  true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Users");
    }
}
```

---

## 3. Batch backfill in migration — via `migrationBuilder.Sql()`

```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    // Step 1: Add nullable column
    migrationBuilder.AddColumn<string>(
        name:     "FullName",
        table:    "Users",
        maxLength: 500,
        nullable: true);

    // Step 2: Backfill in batches using a PL/pgSQL loop (PostgreSQL)
    migrationBuilder.Sql(@"
        DO $$
        DECLARE
            batch_size  INT := 10000;
            rows_updated INT;
        BEGIN
            LOOP
                UPDATE ""Users""
                SET    ""FullName"" = ""FirstName"" || ' ' || ""LastName""
                WHERE  ""FullName"" IS NULL
                  AND  ""Id"" IN (
                      SELECT ""Id"" FROM ""Users""
                      WHERE  ""FullName"" IS NULL
                      LIMIT  batch_size
                      FOR UPDATE SKIP LOCKED
                  );

                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                EXIT WHEN rows_updated < batch_size;

                PERFORM pg_sleep(0.1);  -- yield between batches
            END LOOP;
        END $$;
    ");

    // Step 3: Enforce NOT NULL
    migrationBuilder.AlterColumn<string>(
        name:     "FullName",
        table:    "Users",
        nullable: false);
}
```

---

## 4. SoftDeletableEntity — abstract base class

```csharp
// src/Domain/Common/SoftDeletableEntity.cs
public abstract class SoftDeletableEntity
{
    public DateTime? DeletedAt { get; private set; }

    public bool IsDeleted => DeletedAt.HasValue;

    public void SoftDelete()
    {
        if (IsDeleted) throw new InvalidOperationException("Entity is already deleted.");
        DeletedAt = DateTime.UtcNow;
    }

    public void Restore()
    {
        DeletedAt = null;
    }
}

// Example entity inheriting soft delete
public class User : SoftDeletableEntity
{
    public Guid   Id        { get; private set; } = Guid.NewGuid();
    public string Email     { get; private set; } = default!;
    public string Name      { get; private set; } = default!;
    public bool   IsActive  { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    private User() { }   // EF Core

    public static User Create(string email, string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email);
        return new User { Email = email, Name = name };
    }
}
```

---

## 5. AppDbContext with global query filter

```csharp
// src/Infrastructure/Persistence/AppDbContext.cs
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public DbSet<User>  Users  { get; set; } = default!;
    public DbSet<Order> Orders { get; set; } = default!;

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Apply all IEntityTypeConfiguration<T> implementations from this assembly
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Global soft-delete filter — automatically excludes deleted rows
        builder.Entity<User>().HasQueryFilter(u => u.DeletedAt == null);
        builder.Entity<Order>().HasQueryFilter(o => o.DeletedAt == null);
    }
}
```

---

## 6. Override SaveChangesAsync — intercept Delete → soft delete

```csharp
// src/Infrastructure/Persistence/AppDbContext.cs  (continued)
public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
{
    foreach (var entry in ChangeTracker.Entries<SoftDeletableEntity>()
                                       .Where(e => e.State == EntityState.Deleted))
    {
        entry.State = EntityState.Modified;   // prevent hard DELETE
        entry.Entity.SoftDelete();
    }

    return await base.SaveChangesAsync(ct);
}
```

---

## 7. Index configuration — entity configuration

```csharp
// src/Infrastructure/Persistence/Configurations/UserConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Email)
               .HasMaxLength(255)
               .IsRequired();

        builder.Property(u => u.Name)
               .HasMaxLength(255)
               .IsRequired();

        // Unique index on active (non-deleted) emails only
        builder.HasIndex(u => u.Email)
               .IsUnique()
               .HasFilter("\"DeletedAt\" IS NULL")   // partial index (PostgreSQL)
               .HasDatabaseName("IX_Users_Email_Active");

        // Composite index for common query pattern
        builder.HasIndex(u => new { u.IsActive, u.CreatedAt })
               .HasDatabaseName("IX_Users_IsActive_CreatedAt");
    }
}
```
