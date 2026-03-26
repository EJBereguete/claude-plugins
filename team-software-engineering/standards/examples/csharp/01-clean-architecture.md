# Clean Architecture in C#/.NET — Complete Example

## Project Structure

```
MyApp.sln
├── src/
│   ├── MyApp.Domain/           ← Entities, Value Objects, Interfaces, Domain Events
│   ├── MyApp.Application/      ← Use Cases, CQRS, DTOs, Validators, Behaviors
│   ├── MyApp.Infrastructure/   ← EF Core, Repositories, External Services
│   └── MyApp.Api/              ← Minimal APIs, Middleware, Program.cs
└── tests/
    ├── MyApp.Domain.Tests/
    ├── MyApp.Application.Tests/
    └── MyApp.Api.Tests/
```

### Dependency Rule

```
Domain  ←  Application  ←  Infrastructure
                ↑                  ↑
               API ────────────────┘
```

- **Domain**: no external dependencies — pure C#
- **Application**: depends on Domain only
- **Infrastructure**: depends on Application + Domain (implements interfaces)
- **Api**: depends on Application + Domain; never references Infrastructure types directly (wired via DI)

---

## Domain Layer — MyApp.Domain

### AggregateRoot base class

```csharp
// MyApp.Domain/Common/AggregateRoot.cs
namespace MyApp.Domain.Common;

public abstract class AggregateRoot
{
    private readonly List<IDomainEvent> _domainEvents = [];

    public IReadOnlyList<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    protected void AddDomainEvent(IDomainEvent domainEvent)
    {
        _domainEvents.Add(domainEvent);
    }

    public void ClearDomainEvents()
    {
        _domainEvents.Clear();
    }
}
```

### IDomainEvent marker interface

```csharp
// MyApp.Domain/Common/IDomainEvent.cs
using MediatR;

namespace MyApp.Domain.Common;

// Implements INotification so MediatR can dispatch domain events
public interface IDomainEvent : INotification { }
```

### DomainException

```csharp
// MyApp.Domain/Common/DomainException.cs
namespace MyApp.Domain.Common;

public sealed class DomainException : Exception
{
    public DomainException(string message) : base(message) { }
}
```

### Money Value Object

```csharp
// MyApp.Domain/ValueObjects/Money.cs
namespace MyApp.Domain.ValueObjects;

public sealed record Money
{
    public decimal Amount { get; }
    public string Currency { get; }

    private Money() { } // EF Core

    public Money(decimal amount, string currency)
    {
        if (amount < 0)
            throw new DomainException("Amount cannot be negative.");
        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3)
            throw new DomainException("Currency must be a 3-letter ISO 4217 code.");

        Amount = amount;
        Currency = currency.ToUpperInvariant();
    }

    public static Money Zero(string currency) => new(0, currency);

    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new DomainException($"Cannot add {Currency} and {other.Currency}.");
        return new Money(Amount + other.Amount, Currency);
    }

    public Money Subtract(Money other)
    {
        if (Currency != other.Currency)
            throw new DomainException($"Cannot subtract {other.Currency} from {Currency}.");
        if (Amount - other.Amount < 0)
            throw new DomainException("Result would be negative.");
        return new Money(Amount - other.Amount, Currency);
    }

    public override string ToString() => $"{Amount:F2} {Currency}";
}
```

### InvoiceStatus enum

```csharp
// MyApp.Domain/Enums/InvoiceStatus.cs
namespace MyApp.Domain.Enums;

public enum InvoiceStatus
{
    Draft = 0,
    Sent = 1,
    Paid = 2,
    Cancelled = 3
}
```

### Domain Events

```csharp
// MyApp.Domain/Events/InvoiceCreatedEvent.cs
namespace MyApp.Domain.Events;

public sealed record InvoiceCreatedEvent(Guid InvoiceId) : IDomainEvent;
```

```csharp
// MyApp.Domain/Events/InvoiceMarkedAsPaidEvent.cs
namespace MyApp.Domain.Events;

public sealed record InvoiceMarkedAsPaidEvent(Guid InvoiceId) : IDomainEvent;
```

```csharp
// MyApp.Domain/Events/InvoiceSentEvent.cs
namespace MyApp.Domain.Events;

public sealed record InvoiceSentEvent(Guid InvoiceId, string RecipientEmail) : IDomainEvent;
```

### Invoice Aggregate

```csharp
// MyApp.Domain/Entities/Invoice.cs
using MyApp.Domain.Common;
using MyApp.Domain.Enums;
using MyApp.Domain.Events;
using MyApp.Domain.ValueObjects;

namespace MyApp.Domain.Entities;

public sealed class Invoice : AggregateRoot
{
    public Guid Id { get; private set; }
    public string Number { get; private set; } = string.Empty;
    public Guid CustomerId { get; private set; }
    public Money Total { get; private set; } = null!;
    public InvoiceStatus Status { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? PaidAt { get; private set; }

    private Invoice() { } // Required by EF Core

    public static Invoice Create(string number, Guid customerId, Money total)
    {
        if (string.IsNullOrWhiteSpace(number))
            throw new DomainException("Invoice number is required.");
        if (customerId == Guid.Empty)
            throw new DomainException("Customer ID is required.");
        if (total.Amount <= 0)
            throw new DomainException("Invoice total must be greater than zero.");

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            Number = number.Trim(),
            CustomerId = customerId,
            Total = total,
            Status = InvoiceStatus.Draft,
            CreatedAt = DateTimeOffset.UtcNow
        };

        invoice.AddDomainEvent(new InvoiceCreatedEvent(invoice.Id));
        return invoice;
    }

    public void Send(string recipientEmail)
    {
        if (Status != InvoiceStatus.Draft)
            throw new DomainException($"Cannot send invoice in status '{Status}'. Only Draft invoices can be sent.");
        if (string.IsNullOrWhiteSpace(recipientEmail))
            throw new DomainException("Recipient email is required.");

        Status = InvoiceStatus.Sent;
        AddDomainEvent(new InvoiceSentEvent(Id, recipientEmail));
    }

    public void MarkAsPaid()
    {
        if (Status == InvoiceStatus.Paid)
            throw new DomainException("Invoice is already paid.");
        if (Status == InvoiceStatus.Cancelled)
            throw new DomainException("Cannot pay a cancelled invoice.");

        Status = InvoiceStatus.Paid;
        PaidAt = DateTimeOffset.UtcNow;
        AddDomainEvent(new InvoiceMarkedAsPaidEvent(Id));
    }

    public void Cancel()
    {
        if (Status == InvoiceStatus.Paid)
            throw new DomainException("Cannot cancel a paid invoice.");
        if (Status == InvoiceStatus.Cancelled)
            throw new DomainException("Invoice is already cancelled.");

        Status = InvoiceStatus.Cancelled;
    }
}
```

### IInvoiceRepository — defined in Domain

```csharp
// MyApp.Domain/Repositories/IInvoiceRepository.cs
using MyApp.Domain.Entities;

namespace MyApp.Domain.Repositories;

public interface IInvoiceRepository
{
    Task<Invoice?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Invoice?> GetByNumberAsync(string number, CancellationToken ct = default);
    Task<bool> ExistsByNumberAsync(string number, CancellationToken ct = default);
    Task<IReadOnlyList<Invoice>> GetByCustomerIdAsync(Guid customerId, CancellationToken ct = default);
    Task AddAsync(Invoice invoice, CancellationToken ct = default);
    void Update(Invoice invoice);
}
```

### IUnitOfWork — defined in Domain

```csharp
// MyApp.Domain/Repositories/IUnitOfWork.cs
namespace MyApp.Domain.Repositories;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
```

---

## Application Layer — MyApp.Application

### DTOs

```csharp
// MyApp.Application/DTOs/InvoiceResponse.cs
using MyApp.Domain.Entities;
using MyApp.Domain.Enums;

namespace MyApp.Application.DTOs;

public sealed record InvoiceResponse(
    Guid Id,
    string Number,
    Guid CustomerId,
    decimal TotalAmount,
    string Currency,
    InvoiceStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? PaidAt)
{
    public static InvoiceResponse From(Invoice invoice) => new(
        invoice.Id,
        invoice.Number,
        invoice.CustomerId,
        invoice.Total.Amount,
        invoice.Total.Currency,
        invoice.Status,
        invoice.CreatedAt,
        invoice.PaidAt);
}
```

### CQRS Marker Interfaces

```csharp
// MyApp.Application/Abstractions/ICommand.cs
using MediatR;

namespace MyApp.Application.Abstractions;

public interface ICommand<TResponse> : IRequest<TResponse> { }
```

```csharp
// MyApp.Application/Abstractions/IQuery.cs
using MediatR;

namespace MyApp.Application.Abstractions;

public interface IQuery<TResponse> : IRequest<TResponse> { }
```

### CreateInvoiceCommand

```csharp
// MyApp.Application/Invoices/Commands/CreateInvoice/CreateInvoiceCommand.cs
using MyApp.Application.Abstractions;
using MyApp.Application.DTOs;

namespace MyApp.Application.Invoices.Commands.CreateInvoice;

public sealed record CreateInvoiceCommand(
    string Number,
    Guid CustomerId,
    decimal TotalAmount,
    string Currency) : ICommand<InvoiceResponse>;
```

```csharp
// MyApp.Application/Invoices/Commands/CreateInvoice/CreateInvoiceCommandValidator.cs
using FluentValidation;
using MyApp.Domain.Repositories;

namespace MyApp.Application.Invoices.Commands.CreateInvoice;

public sealed class CreateInvoiceCommandValidator : AbstractValidator<CreateInvoiceCommand>
{
    private readonly IInvoiceRepository _repository;

    public CreateInvoiceCommandValidator(IInvoiceRepository repository)
    {
        _repository = repository;

        RuleFor(x => x.Number)
            .NotEmpty().WithMessage("Invoice number is required.")
            .MaximumLength(50).WithMessage("Invoice number cannot exceed 50 characters.")
            .MustAsync(BeUniqueNumberAsync).WithMessage("Invoice number already exists.");

        RuleFor(x => x.CustomerId)
            .NotEmpty().WithMessage("Customer ID is required.");

        RuleFor(x => x.TotalAmount)
            .GreaterThan(0).WithMessage("Total amount must be greater than zero.");

        RuleFor(x => x.Currency)
            .NotEmpty().WithMessage("Currency is required.")
            .Length(3).WithMessage("Currency must be a 3-letter ISO 4217 code.")
            .Matches("^[A-Z]{3}$").WithMessage("Currency must contain only uppercase letters.");
    }

    private async Task<bool> BeUniqueNumberAsync(
        string number,
        CancellationToken ct)
    {
        return !await _repository.ExistsByNumberAsync(number, ct);
    }
}
```

```csharp
// MyApp.Application/Invoices/Commands/CreateInvoice/CreateInvoiceCommandHandler.cs
using MediatR;
using MyApp.Application.DTOs;
using MyApp.Domain.Entities;
using MyApp.Domain.Repositories;
using MyApp.Domain.ValueObjects;

namespace MyApp.Application.Invoices.Commands.CreateInvoice;

internal sealed class CreateInvoiceCommandHandler
    : IRequestHandler<CreateInvoiceCommand, InvoiceResponse>
{
    private readonly IInvoiceRepository _repository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateInvoiceCommandHandler(
        IInvoiceRepository repository,
        IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<InvoiceResponse> Handle(
        CreateInvoiceCommand request,
        CancellationToken cancellationToken)
    {
        var total = new Money(request.TotalAmount, request.Currency);
        var invoice = Invoice.Create(request.Number, request.CustomerId, total);

        await _repository.AddAsync(invoice, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return InvoiceResponse.From(invoice);
    }
}
```

### MarkInvoiceAsPaidCommand

```csharp
// MyApp.Application/Invoices/Commands/MarkAsPaid/MarkInvoiceAsPaidCommand.cs
using MyApp.Application.Abstractions;
using MyApp.Application.DTOs;

namespace MyApp.Application.Invoices.Commands.MarkAsPaid;

public sealed record MarkInvoiceAsPaidCommand(Guid InvoiceId) : ICommand<InvoiceResponse>;
```

```csharp
// MyApp.Application/Invoices/Commands/MarkAsPaid/MarkInvoiceAsPaidCommandHandler.cs
using MediatR;
using MyApp.Application.DTOs;
using MyApp.Application.Exceptions;
using MyApp.Domain.Repositories;

namespace MyApp.Application.Invoices.Commands.MarkAsPaid;

internal sealed class MarkInvoiceAsPaidCommandHandler
    : IRequestHandler<MarkInvoiceAsPaidCommand, InvoiceResponse>
{
    private readonly IInvoiceRepository _repository;
    private readonly IUnitOfWork _unitOfWork;

    public MarkInvoiceAsPaidCommandHandler(
        IInvoiceRepository repository,
        IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<InvoiceResponse> Handle(
        MarkInvoiceAsPaidCommand request,
        CancellationToken cancellationToken)
    {
        var invoice = await _repository.GetByIdAsync(request.InvoiceId, cancellationToken)
            ?? throw new NotFoundException(nameof(Invoice), request.InvoiceId);

        invoice.MarkAsPaid();

        _repository.Update(invoice);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return InvoiceResponse.From(invoice);
    }
}
```

### GetInvoiceQuery

```csharp
// MyApp.Application/Invoices/Queries/GetInvoice/GetInvoiceQuery.cs
using MyApp.Application.Abstractions;
using MyApp.Application.DTOs;

namespace MyApp.Application.Invoices.Queries.GetInvoice;

public sealed record GetInvoiceQuery(Guid InvoiceId) : IQuery<InvoiceResponse>;
```

```csharp
// MyApp.Application/Invoices/Queries/GetInvoice/GetInvoiceQueryHandler.cs
using MediatR;
using MyApp.Application.DTOs;
using MyApp.Application.Exceptions;
using MyApp.Domain.Repositories;

namespace MyApp.Application.Invoices.Queries.GetInvoice;

internal sealed class GetInvoiceQueryHandler
    : IRequestHandler<GetInvoiceQuery, InvoiceResponse>
{
    private readonly IInvoiceRepository _repository;

    public GetInvoiceQueryHandler(IInvoiceRepository repository)
    {
        _repository = repository;
    }

    public async Task<InvoiceResponse> Handle(
        GetInvoiceQuery request,
        CancellationToken cancellationToken)
    {
        var invoice = await _repository.GetByIdAsync(request.InvoiceId, cancellationToken)
            ?? throw new NotFoundException(nameof(Invoice), request.InvoiceId);

        return InvoiceResponse.From(invoice);
    }
}
```

### Application Exceptions

```csharp
// MyApp.Application/Exceptions/NotFoundException.cs
namespace MyApp.Application.Exceptions;

public sealed class NotFoundException : Exception
{
    public NotFoundException(string entityName, object key)
        : base($"Entity '{entityName}' with key '{key}' was not found.") { }
}
```

```csharp
// MyApp.Application/Exceptions/ValidationException.cs
namespace MyApp.Application.Exceptions;

public sealed class ValidationException : Exception
{
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public ValidationException(IReadOnlyDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }
}
```

### Pipeline Behaviors

```csharp
// MyApp.Application/Behaviors/LoggingBehavior.cs
using MediatR;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace MyApp.Application.Behaviors;

internal sealed class LoggingBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        _logger.LogInformation("Handling {RequestName}: {@Request}", requestName, request);

        var sw = Stopwatch.StartNew();
        try
        {
            var response = await next();
            sw.Stop();
            _logger.LogInformation(
                "Handled {RequestName} in {ElapsedMs}ms", requestName, sw.ElapsedMilliseconds);
            return response;
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex,
                "Error handling {RequestName} after {ElapsedMs}ms", requestName, sw.ElapsedMilliseconds);
            throw;
        }
    }
}
```

```csharp
// MyApp.Application/Behaviors/ValidationBehavior.cs
using FluentValidation;
using MediatR;
using MyApp.Application.Exceptions;

namespace MyApp.Application.Behaviors;

internal sealed class ValidationBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!_validators.Any())
            return await next();

        var context = new ValidationContext<TRequest>(request);

        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken)));

        var failures = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .GroupBy(f => f.PropertyName)
            .ToDictionary(
                g => g.Key,
                g => g.Select(f => f.ErrorMessage).ToArray());

        if (failures.Count > 0)
            throw new ValidationException(failures);

        return await next();
    }
}
```

```csharp
// MyApp.Application/Behaviors/TransactionBehavior.cs
using MediatR;
using Microsoft.Extensions.Logging;
using MyApp.Application.Abstractions;
using MyApp.Domain.Repositories;

namespace MyApp.Application.Behaviors;

// Only wraps ICommand<> in a transaction — queries are skipped
internal sealed class TransactionBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : ICommand<TResponse>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<TransactionBehavior<TRequest, TResponse>> _logger;

    public TransactionBehavior(
        IUnitOfWork unitOfWork,
        ILogger<TransactionBehavior<TRequest, TResponse>> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        _logger.LogDebug("Starting transaction for {RequestName}", requestName);

        try
        {
            var response = await next();
            _logger.LogDebug("Transaction committed for {RequestName}", requestName);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Transaction failed for {RequestName}", requestName);
            throw;
        }
    }
}
```

### Application DependencyInjection

```csharp
// MyApp.Application/DependencyInjection.cs
using System.Reflection;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using MyApp.Application.Behaviors;

namespace MyApp.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(assembly));

        services.AddValidatorsFromAssembly(assembly);

        // Order matters: behaviors execute in registration order (outermost first)
        services.AddScoped(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
        services.AddScoped(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        services.AddScoped(typeof(IPipelineBehavior<,>), typeof(TransactionBehavior<,>));

        return services;
    }
}
```

---

## Infrastructure Layer — MyApp.Infrastructure

### ApplicationDbContext

```csharp
// MyApp.Infrastructure/Persistence/ApplicationDbContext.cs
using MediatR;
using Microsoft.EntityFrameworkCore;
using MyApp.Domain.Common;
using MyApp.Domain.Entities;
using MyApp.Domain.Repositories;

namespace MyApp.Infrastructure.Persistence;

public sealed class ApplicationDbContext : DbContext, IUnitOfWork
{
    private readonly IPublisher _publisher;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, IPublisher publisher)
        : base(options)
    {
        _publisher = publisher;
    }

    public DbSet<Invoice> Invoices => Set<Invoice>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Dispatch domain events before saving so handlers can participate in same transaction
        var domainEvents = ChangeTracker.Entries<AggregateRoot>()
            .Select(e => e.Entity)
            .Where(e => e.DomainEvents.Count != 0)
            .SelectMany(e =>
            {
                var events = e.DomainEvents.ToList();
                e.ClearDomainEvents();
                return events;
            })
            .ToList();

        var result = await base.SaveChangesAsync(cancellationToken);

        foreach (var domainEvent in domainEvents)
            await _publisher.Publish(domainEvent, cancellationToken);

        return result;
    }
}
```

### InvoiceConfiguration

```csharp
// MyApp.Infrastructure/Persistence/Configurations/InvoiceConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyApp.Domain.Entities;
using MyApp.Domain.Enums;

namespace MyApp.Infrastructure.Persistence.Configurations;

internal sealed class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.ToTable("invoices");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.Id)
            .HasColumnName("id")
            .ValueGeneratedNever(); // We set the ID in domain

        builder.Property(i => i.Number)
            .HasColumnName("number")
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(i => i.Number)
            .IsUnique()
            .HasDatabaseName("ix_invoices_number");

        builder.Property(i => i.CustomerId)
            .HasColumnName("customer_id")
            .IsRequired();

        builder.HasIndex(i => i.CustomerId)
            .HasDatabaseName("ix_invoices_customer_id");

        // Money Value Object mapped as owned type (no separate table)
        builder.OwnsOne(i => i.Total, money =>
        {
            money.Property(m => m.Amount)
                .HasColumnName("total_amount")
                .HasPrecision(18, 4)
                .IsRequired();

            money.Property(m => m.Currency)
                .HasColumnName("total_currency")
                .HasMaxLength(3)
                .IsRequired();
        });

        builder.Property(i => i.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(i => i.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(i => i.PaidAt)
            .HasColumnName("paid_at");
    }
}
```

### InvoiceRepository

```csharp
// MyApp.Infrastructure/Persistence/Repositories/InvoiceRepository.cs
using Microsoft.EntityFrameworkCore;
using MyApp.Domain.Entities;
using MyApp.Domain.Repositories;

namespace MyApp.Infrastructure.Persistence.Repositories;

internal sealed class InvoiceRepository : IInvoiceRepository
{
    private readonly ApplicationDbContext _context;

    public InvoiceRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Invoice?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == id, ct);
    }

    public async Task<Invoice?> GetByNumberAsync(string number, CancellationToken ct = default)
    {
        return await _context.Invoices
            .FirstOrDefaultAsync(i => i.Number == number, ct);
    }

    public async Task<bool> ExistsByNumberAsync(string number, CancellationToken ct = default)
    {
        return await _context.Invoices
            .AnyAsync(i => i.Number == number, ct);
    }

    public async Task<IReadOnlyList<Invoice>> GetByCustomerIdAsync(
        Guid customerId, CancellationToken ct = default)
    {
        return await _context.Invoices
            .Where(i => i.CustomerId == customerId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Invoice invoice, CancellationToken ct = default)
    {
        await _context.Invoices.AddAsync(invoice, ct);
    }

    public void Update(Invoice invoice)
    {
        _context.Invoices.Update(invoice);
    }
}
```

### Infrastructure DependencyInjection

```csharp
// MyApp.Infrastructure/DependencyInjection.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MyApp.Domain.Repositories;
using MyApp.Infrastructure.Persistence;
using MyApp.Infrastructure.Persistence.Repositories;

namespace MyApp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(
                configuration.GetConnectionString("DefaultConnection"),
                npgsql => npgsql.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));

        services.AddScoped<IUnitOfWork>(sp =>
            sp.GetRequiredService<ApplicationDbContext>());

        services.AddScoped<IInvoiceRepository, InvoiceRepository>();

        return services;
    }
}
```

### Migration Example (conceptual Up/Down pattern)

```csharp
// MyApp.Infrastructure/Migrations/20240101000000_CreateInvoicesTable.cs
using Microsoft.EntityFrameworkCore.Migrations;

namespace MyApp.Infrastructure.Migrations;

public partial class CreateInvoicesTable : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "invoices",
            columns: table => new
            {
                id = table.Column<Guid>(nullable: false),
                number = table.Column<string>(maxLength: 50, nullable: false),
                customer_id = table.Column<Guid>(nullable: false),
                total_amount = table.Column<decimal>(precision: 18, scale: 4, nullable: false),
                total_currency = table.Column<string>(maxLength: 3, nullable: false),
                status = table.Column<string>(maxLength: 20, nullable: false),
                created_at = table.Column<DateTimeOffset>(nullable: false),
                paid_at = table.Column<DateTimeOffset>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_invoices", x => x.id);
            });

        migrationBuilder.CreateIndex(
            name: "ix_invoices_number",
            table: "invoices",
            column: "number",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_invoices_customer_id",
            table: "invoices",
            column: "customer_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "invoices");
    }
}
```

---

## API Layer — MyApp.Api

### Request models

```csharp
// MyApp.Api/Contracts/CreateInvoiceRequest.cs
namespace MyApp.Api.Contracts;

public sealed record CreateInvoiceRequest(
    string Number,
    Guid CustomerId,
    decimal TotalAmount,
    string Currency);
```

### Exception Handlers (.NET 8+)

```csharp
// MyApp.Api/Infrastructure/ExceptionHandlers/ValidationExceptionHandler.cs
using Microsoft.AspNetCore.Diagnostics;
using MyApp.Application.Exceptions;

namespace MyApp.Api.Infrastructure.ExceptionHandlers;

internal sealed class ValidationExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not ValidationException validationException)
            return false;

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;

        await httpContext.Response.WriteAsJsonAsync(new
        {
            title = "Validation failed",
            status = StatusCodes.Status400BadRequest,
            errors = validationException.Errors
        }, cancellationToken);

        return true;
    }
}
```

```csharp
// MyApp.Api/Infrastructure/ExceptionHandlers/NotFoundExceptionHandler.cs
using Microsoft.AspNetCore.Diagnostics;
using MyApp.Application.Exceptions;

namespace MyApp.Api.Infrastructure.ExceptionHandlers;

internal sealed class NotFoundExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not NotFoundException notFoundException)
            return false;

        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;

        await httpContext.Response.WriteAsJsonAsync(new
        {
            title = "Resource not found",
            status = StatusCodes.Status404NotFound,
            detail = notFoundException.Message
        }, cancellationToken);

        return true;
    }
}
```

```csharp
// MyApp.Api/Infrastructure/ExceptionHandlers/DomainExceptionHandler.cs
using Microsoft.AspNetCore.Diagnostics;
using MyApp.Domain.Common;

namespace MyApp.Api.Infrastructure.ExceptionHandlers;

internal sealed class DomainExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not DomainException domainException)
            return false;

        httpContext.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;

        await httpContext.Response.WriteAsJsonAsync(new
        {
            title = "Domain rule violation",
            status = StatusCodes.Status422UnprocessableEntity,
            detail = domainException.Message
        }, cancellationToken);

        return true;
    }
}
```

```csharp
// MyApp.Api/Infrastructure/ExceptionHandlers/GlobalExceptionHandler.cs
using Microsoft.AspNetCore.Diagnostics;

namespace MyApp.Api.Infrastructure.ExceptionHandlers;

internal sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Unhandled exception occurred");

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;

        await httpContext.Response.WriteAsJsonAsync(new
        {
            title = "An unexpected error occurred",
            status = StatusCodes.Status500InternalServerError
        }, cancellationToken);

        return true;
    }
}
```

### Invoice Endpoints (Minimal API)

```csharp
// MyApp.Api/Endpoints/InvoiceEndpoints.cs
using MediatR;
using MyApp.Api.Contracts;
using MyApp.Application.Invoices.Commands.CreateInvoice;
using MyApp.Application.Invoices.Commands.MarkAsPaid;
using MyApp.Application.Invoices.Queries.GetInvoice;

namespace MyApp.Api.Endpoints;

public static class InvoiceEndpoints
{
    public static IEndpointRouteBuilder MapInvoiceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/invoices")
            .WithTags("Invoices")
            .WithOpenApi();

        group.MapPost("/", CreateInvoice)
            .WithName("CreateInvoice")
            .WithSummary("Creates a new invoice");

        group.MapGet("/{id:guid}", GetInvoice)
            .WithName("GetInvoice")
            .WithSummary("Gets an invoice by ID");

        group.MapPut("/{id:guid}/pay", MarkAsPaid)
            .WithName("MarkInvoiceAsPaid")
            .WithSummary("Marks an invoice as paid");

        return app;
    }

    private static async Task<IResult> CreateInvoice(
        CreateInvoiceRequest request,
        IMediator mediator,
        CancellationToken ct)
    {
        var command = new CreateInvoiceCommand(
            request.Number,
            request.CustomerId,
            request.TotalAmount,
            request.Currency);

        var result = await mediator.Send(command, ct);

        return Results.CreatedAtRoute(
            "GetInvoice",
            new { id = result.Id },
            result);
    }

    private static async Task<IResult> GetInvoice(
        Guid id,
        IMediator mediator,
        CancellationToken ct)
    {
        var result = await mediator.Send(new GetInvoiceQuery(id), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> MarkAsPaid(
        Guid id,
        IMediator mediator,
        CancellationToken ct)
    {
        var result = await mediator.Send(new MarkInvoiceAsPaidCommand(id), ct);
        return Results.Ok(result);
    }
}
```

### Program.cs

```csharp
// MyApp.Api/Program.cs
using MyApp.Api.Endpoints;
using MyApp.Api.Infrastructure.ExceptionHandlers;
using MyApp.Application;
using MyApp.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// --- Services ---
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Exception handlers are tried in registration order; most specific first
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddExceptionHandler<NotFoundExceptionHandler>();
builder.Services.AddExceptionHandler<DomainExceptionHandler>();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --- App ---
var app = builder.Build();

// Exception handler must be FIRST — catches errors from all subsequent middleware
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Map endpoints
app.MapInvoiceEndpoints();

app.Run();

// Expose Program for WebApplicationFactory in integration tests
public partial class Program { }
```

---

## Tests

### Domain Tests

```csharp
// tests/MyApp.Domain.Tests/InvoiceTests.cs
using MyApp.Domain.Common;
using MyApp.Domain.Entities;
using MyApp.Domain.Enums;
using MyApp.Domain.Events;
using MyApp.Domain.ValueObjects;

namespace MyApp.Domain.Tests;

public sealed class InvoiceTests
{
    private static Money ValidMoney => new(100m, "USD");
    private static Guid ValidCustomerId => Guid.NewGuid();

    [Fact]
    public void Create_WithValidData_ReturnsInvoiceInDraftStatus()
    {
        var invoice = Invoice.Create("INV-001", ValidCustomerId, ValidMoney);

        Assert.Equal("INV-001", invoice.Number);
        Assert.Equal(InvoiceStatus.Draft, invoice.Status);
        Assert.NotEqual(Guid.Empty, invoice.Id);
    }

    [Fact]
    public void Create_RaisesInvoiceCreatedEvent()
    {
        var invoice = Invoice.Create("INV-001", ValidCustomerId, ValidMoney);

        var evt = Assert.Single(invoice.DomainEvents);
        Assert.IsType<InvoiceCreatedEvent>(evt);
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData(null)]
    public void Create_WithEmptyNumber_ThrowsDomainException(string? number)
    {
        Assert.Throws<DomainException>(() =>
            Invoice.Create(number!, ValidCustomerId, ValidMoney));
    }

    [Fact]
    public void MarkAsPaid_FromSentStatus_TransitionsToPaid()
    {
        var invoice = Invoice.Create("INV-001", ValidCustomerId, ValidMoney);
        invoice.Send("client@example.com");
        invoice.MarkAsPaid();

        Assert.Equal(InvoiceStatus.Paid, invoice.Status);
        Assert.NotNull(invoice.PaidAt);
    }

    [Fact]
    public void MarkAsPaid_WhenAlreadyPaid_ThrowsDomainException()
    {
        var invoice = Invoice.Create("INV-001", ValidCustomerId, ValidMoney);
        invoice.Send("client@example.com");
        invoice.MarkAsPaid();

        Assert.Throws<DomainException>(() => invoice.MarkAsPaid());
    }

    [Fact]
    public void MarkAsPaid_RaisesInvoiceMarkedAsPaidEvent()
    {
        var invoice = Invoice.Create("INV-001", ValidCustomerId, ValidMoney);
        invoice.ClearDomainEvents(); // clear creation event
        invoice.Send("client@example.com");
        invoice.ClearDomainEvents();
        invoice.MarkAsPaid();

        var evt = Assert.Single(invoice.DomainEvents);
        Assert.IsType<InvoiceMarkedAsPaidEvent>(evt);
    }
}
```

```csharp
// tests/MyApp.Domain.Tests/MoneyTests.cs
using MyApp.Domain.Common;
using MyApp.Domain.ValueObjects;

namespace MyApp.Domain.Tests;

public sealed class MoneyTests
{
    [Fact]
    public void Add_SameCurrency_ReturnsSum()
    {
        var a = new Money(100m, "USD");
        var b = new Money(50m, "USD");

        var result = a.Add(b);

        Assert.Equal(150m, result.Amount);
        Assert.Equal("USD", result.Currency);
    }

    [Fact]
    public void Add_DifferentCurrencies_ThrowsDomainException()
    {
        var a = new Money(100m, "USD");
        var b = new Money(50m, "EUR");

        Assert.Throws<DomainException>(() => a.Add(b));
    }

    [Fact]
    public void Money_EqualityByValue()
    {
        var a = new Money(100m, "USD");
        var b = new Money(100m, "USD");

        Assert.Equal(a, b);
    }
}
```

### Application Tests

```csharp
// tests/MyApp.Application.Tests/CreateInvoiceCommandHandlerTests.cs
using Moq;
using MyApp.Application.DTOs;
using MyApp.Application.Invoices.Commands.CreateInvoice;
using MyApp.Domain.Entities;
using MyApp.Domain.Repositories;

namespace MyApp.Application.Tests;

public sealed class CreateInvoiceCommandHandlerTests
{
    private readonly Mock<IInvoiceRepository> _repositoryMock = new();
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly CreateInvoiceCommandHandler _handler;

    public CreateInvoiceCommandHandlerTests()
    {
        _handler = new CreateInvoiceCommandHandler(
            _repositoryMock.Object,
            _unitOfWorkMock.Object);
    }

    [Fact]
    public async Task Handle_ValidCommand_ReturnsInvoiceResponse()
    {
        // Arrange
        var command = new CreateInvoiceCommand("INV-001", Guid.NewGuid(), 500m, "USD");

        _repositoryMock
            .Setup(r => r.AddAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _unitOfWorkMock
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.IsType<InvoiceResponse>(result);
        Assert.Equal("INV-001", result.Number);
        Assert.Equal(500m, result.TotalAmount);
        Assert.Equal("USD", result.Currency);

        _repositoryMock.Verify(r =>
            r.AddAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()), Times.Once);
        _unitOfWorkMock.Verify(u =>
            u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
```

### Integration Tests (WebApplicationFactory)

```csharp
// tests/MyApp.Api.Tests/InvoiceEndpointsTests.cs
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MyApp.Api.Contracts;
using MyApp.Application.DTOs;
using MyApp.Infrastructure.Persistence;

namespace MyApp.Api.Tests;

public sealed class InvoiceEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public InvoiceEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _client = factory
            .WithWebHostBuilder(builder =>
                builder.ConfigureServices(services =>
                {
                    // Replace real DB with in-memory for tests
                    var descriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                    if (descriptor is not null)
                        services.Remove(descriptor);

                    services.AddDbContext<ApplicationDbContext>(options =>
                        options.UseInMemoryDatabase(Guid.NewGuid().ToString()));
                }))
            .CreateClient();
    }

    [Fact]
    public async Task POST_Invoices_ReturnsCreated()
    {
        var request = new CreateInvoiceRequest("INV-TEST-001", Guid.NewGuid(), 250m, "USD");

        var response = await _client.PostAsJsonAsync("/api/invoices", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var invoice = await response.Content.ReadFromJsonAsync<InvoiceResponse>();
        Assert.NotNull(invoice);
        Assert.Equal("INV-TEST-001", invoice.Number);
        Assert.Equal(250m, invoice.TotalAmount);
    }

    [Fact]
    public async Task GET_Invoice_WhenNotFound_Returns404()
    {
        var response = await _client.GetAsync($"/api/invoices/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task POST_Invoices_WithInvalidAmount_Returns400()
    {
        var request = new CreateInvoiceRequest("INV-TEST-002", Guid.NewGuid(), -10m, "USD");

        var response = await _client.PostAsJsonAsync("/api/invoices", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
```

---

## Key Principles

| Concern | Layer | Reasoning |
|---|---|---|
| Business rules | Domain | Only place that should enforce invariants |
| Orchestration | Application | Coordinates domain + infrastructure without knowing how |
| Persistence | Infrastructure | Swap DB engine without touching domain or application |
| HTTP concerns | Api | Status codes, request parsing — never leak into application |
| DI wiring | Infrastructure + Api | Neither Domain nor Application register their own services |

**Never do this:**
```csharp
// BAD: Infrastructure leaking into Application handler
using MyApp.Infrastructure.Persistence; // WRONG — App cannot reference Infrastructure
var ctx = new ApplicationDbContext(...);
```

**Always do this:**
```csharp
// GOOD: Application depends on Domain abstraction
private readonly IInvoiceRepository _repository; // interface defined in Domain
```
