# CQRS + MediatR Patterns in C#/.NET — Complete Example

## Pipeline Order

```
Request
  │
  ▼
ExceptionBehavior      ← catches unhandled exceptions from inner behaviors/handler
  │
  ▼
LoggingBehavior        ← records request name, params, duration, result
  │
  ▼
PerformanceBehavior    ← warns when elapsed > threshold
  │
  ▼
TransactionBehavior    ← wraps ICommand in a DB transaction; skips IQuery
  │
  ▼
ValidationBehavior     ← runs FluentValidation, throws on failure
  │
  ▼
Handler                ← actual use-case logic
```

Registration order determines execution order: the first registered behavior is the outermost wrapper.

---

## Marker Interfaces

```csharp
// MyApp.Application/Abstractions/ICommand.cs
using MediatR;

namespace MyApp.Application.Abstractions;

/// <summary>
/// Marker for write operations. TransactionBehavior only wraps this.
/// </summary>
public interface ICommand<TResponse> : IRequest<TResponse> { }

/// <summary>
/// Command with no return value.
/// </summary>
public interface ICommand : IRequest { }
```

```csharp
// MyApp.Application/Abstractions/IQuery.cs
using MediatR;

namespace MyApp.Application.Abstractions;

/// <summary>
/// Marker for read operations. No transaction, no side effects.
/// </summary>
public interface IQuery<TResponse> : IRequest<TResponse> { }
```

---

## All 4 Pipeline Behaviors

### 1. LoggingBehavior

```csharp
// MyApp.Application/Behaviors/LoggingBehavior.cs
using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;

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

        _logger.LogInformation(
            "[START] {RequestName} — Parameters: {@Request}",
            requestName,
            request);

        var sw = Stopwatch.StartNew();

        try
        {
            var response = await next();
            sw.Stop();

            _logger.LogInformation(
                "[END] {RequestName} — Completed in {ElapsedMs}ms — Result: {@Response}",
                requestName,
                sw.ElapsedMilliseconds,
                response);

            return response;
        }
        catch (Exception ex)
        {
            sw.Stop();

            _logger.LogError(ex,
                "[FAIL] {RequestName} — Failed after {ElapsedMs}ms",
                requestName,
                sw.ElapsedMilliseconds);

            throw;
        }
    }
}
```

### 2. ValidationBehavior

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

        // Run all validators in parallel to collect every failure in a single pass
        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken)));

        var failures = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .GroupBy(
                f => f.PropertyName,
                f => f.ErrorMessage,
                StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.Distinct().ToArray());

        if (failures.Count > 0)
            throw new ValidationException(failures);

        return await next();
    }
}
```

### 3. TransactionBehavior

```csharp
// MyApp.Application/Behaviors/TransactionBehavior.cs
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MyApp.Application.Abstractions;

namespace MyApp.Application.Behaviors;

/// <summary>
/// Wraps ICommand handlers in a database transaction.
/// Queries (IQuery) bypass this behavior entirely because they don't match the constraint.
/// </summary>
internal sealed class TransactionBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : ICommand<TResponse>
{
    private readonly DbContext _dbContext;
    private readonly ILogger<TransactionBehavior<TRequest, TResponse>> _logger;

    public TransactionBehavior(DbContext dbContext, ILogger<TransactionBehavior<TRequest, TResponse>> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;

        // If a transaction is already active (e.g., nested command), reuse it
        if (_dbContext.Database.CurrentTransaction is not null)
        {
            _logger.LogDebug("Reusing existing transaction for {RequestName}", requestName);
            return await next();
        }

        await using var transaction = await _dbContext.Database
            .BeginTransactionAsync(cancellationToken);

        _logger.LogDebug(
            "Transaction {TransactionId} started for {RequestName}",
            transaction.TransactionId,
            requestName);

        try
        {
            var response = await next();
            await transaction.CommitAsync(cancellationToken);

            _logger.LogDebug(
                "Transaction {TransactionId} committed for {RequestName}",
                transaction.TransactionId,
                requestName);

            return response;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);

            _logger.LogError(ex,
                "Transaction {TransactionId} rolled back for {RequestName}",
                transaction.TransactionId,
                requestName);

            throw;
        }
    }
}
```

### 4. PerformanceBehavior

```csharp
// MyApp.Application/Behaviors/PerformanceBehavior.cs
using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;

namespace MyApp.Application.Behaviors;

internal sealed class PerformanceBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private const int WarningThresholdMs = 500;

    private readonly ILogger<PerformanceBehavior<TRequest, TResponse>> _logger;

    public PerformanceBehavior(ILogger<PerformanceBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        var response = await next();
        sw.Stop();

        if (sw.ElapsedMilliseconds > WarningThresholdMs)
        {
            _logger.LogWarning(
                "Slow request detected: {RequestName} took {ElapsedMs}ms (threshold: {ThresholdMs}ms) — {@Request}",
                typeof(TRequest).Name,
                sw.ElapsedMilliseconds,
                WarningThresholdMs,
                request);
        }

        return response;
    }
}
```

---

## Full Command Example — CreateInvoiceCommand

### Command record

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

### Validator with async uniqueness check

```csharp
// MyApp.Application/Invoices/Commands/CreateInvoice/CreateInvoiceCommandValidator.cs
using FluentValidation;
using MyApp.Domain.Repositories;

namespace MyApp.Application.Invoices.Commands.CreateInvoice;

public sealed class CreateInvoiceCommandValidator : AbstractValidator<CreateInvoiceCommand>
{
    public CreateInvoiceCommandValidator(IInvoiceRepository repository)
    {
        RuleFor(x => x.Number)
            .NotEmpty().WithMessage("Invoice number is required.")
            .MaximumLength(50).WithMessage("Invoice number cannot exceed 50 characters.")
            .MustAsync(async (number, ct) =>
                !await repository.ExistsByNumberAsync(number, ct))
            .WithMessage("An invoice with this number already exists.")
            .When(x => !string.IsNullOrWhiteSpace(x.Number));

        RuleFor(x => x.CustomerId)
            .NotEmpty().WithMessage("Customer ID is required.");

        RuleFor(x => x.TotalAmount)
            .GreaterThan(0).WithMessage("Total amount must be greater than zero.")
            .LessThanOrEqualTo(1_000_000).WithMessage("Total amount cannot exceed 1,000,000.");

        RuleFor(x => x.Currency)
            .NotEmpty().WithMessage("Currency is required.")
            .Length(3).WithMessage("Currency must be a 3-letter ISO 4217 code.")
            .Matches(@"^[A-Z]{3}$").WithMessage("Currency must contain only uppercase letters.");
    }
}
```

### Handler with Result pattern

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

### Minimal API endpoint

```csharp
// MyApp.Api/Endpoints/InvoiceEndpoints.cs (create endpoint)
group.MapPost("/", async (
    CreateInvoiceRequest request,
    IMediator mediator,
    CancellationToken ct) =>
{
    var command = new CreateInvoiceCommand(
        request.Number,
        request.CustomerId,
        request.TotalAmount,
        request.Currency);

    var result = await mediator.Send(command, ct);

    return Results.CreatedAtRoute("GetInvoice", new { id = result.Id }, result);
})
.WithName("CreateInvoice")
.WithSummary("Creates a new invoice")
.WithOpenApi()
.Produces<InvoiceResponse>(StatusCodes.Status201Created)
.ProducesValidationProblem()
.Produces(StatusCodes.Status400BadRequest);
```

---

## Full Query Example — GetInvoicesByCustomerQuery

### Paginated response DTO

```csharp
// MyApp.Application/DTOs/PagedResponse.cs
namespace MyApp.Application.DTOs;

public sealed record PagedResponse<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int Page,
    int PageSize)
{
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;
}
```

### Query record with filtering/pagination

```csharp
// MyApp.Application/Invoices/Queries/GetByCustomer/GetInvoicesByCustomerQuery.cs
using MyApp.Application.Abstractions;
using MyApp.Application.DTOs;
using MyApp.Domain.Enums;

namespace MyApp.Application.Invoices.Queries.GetByCustomer;

public sealed record GetInvoicesByCustomerQuery(
    Guid CustomerId,
    InvoiceStatus? StatusFilter = null,
    DateTimeOffset? From = null,
    DateTimeOffset? To = null,
    int Page = 1,
    int PageSize = 20) : IQuery<PagedResponse<InvoiceResponse>>;
```

### Handler that queries the read side directly

```csharp
// MyApp.Application/Invoices/Queries/GetByCustomer/GetInvoicesByCustomerQueryHandler.cs
using MediatR;
using Microsoft.EntityFrameworkCore;
using MyApp.Application.DTOs;
using MyApp.Infrastructure.Persistence; // Exception: queries may reference DbContext directly

namespace MyApp.Application.Invoices.Queries.GetByCustomer;

/// <remarks>
/// Queries can reference the DbContext directly for efficiency (no repository abstraction).
/// There is no risk of write-side leaking because this handler has no IUnitOfWork dependency.
/// If you need strict layer isolation, extract a read-only IInvoiceReadModel interface instead.
/// </remarks>
internal sealed class GetInvoicesByCustomerQueryHandler
    : IRequestHandler<GetInvoicesByCustomerQuery, PagedResponse<InvoiceResponse>>
{
    private readonly ApplicationDbContext _context;

    public GetInvoicesByCustomerQueryHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResponse<InvoiceResponse>> Handle(
        GetInvoicesByCustomerQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Invoices
            .AsNoTracking()
            .Where(i => i.CustomerId == request.CustomerId);

        if (request.StatusFilter.HasValue)
            query = query.Where(i => i.Status == request.StatusFilter.Value);

        if (request.From.HasValue)
            query = query.Where(i => i.CreatedAt >= request.From.Value);

        if (request.To.HasValue)
            query = query.Where(i => i.CreatedAt <= request.To.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(i => InvoiceResponse.From(i))
            .ToListAsync(cancellationToken);

        return new PagedResponse<InvoiceResponse>(
            items,
            totalCount,
            request.Page,
            request.PageSize);
    }
}
```

### Query endpoint

```csharp
group.MapGet("/customer/{customerId:guid}", async (
    Guid customerId,
    IMediator mediator,
    CancellationToken ct,
    [FromQuery] string? status = null,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20) =>
{
    InvoiceStatus? statusFilter = Enum.TryParse<InvoiceStatus>(status, ignoreCase: true, out var parsed)
        ? parsed
        : null;

    var result = await mediator.Send(
        new GetInvoicesByCustomerQuery(customerId, statusFilter, Page: page, PageSize: pageSize), ct);

    return Results.Ok(result);
})
.WithName("GetInvoicesByCustomer")
.WithSummary("Lists invoices for a customer with optional filtering and pagination")
.WithOpenApi()
.Produces<PagedResponse<InvoiceResponse>>();
```

---

## Application DependencyInjection.cs

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
        {
            cfg.RegisterServicesFromAssembly(assembly);

            // Behaviors are registered here so they are NOT affected by
            // the global IPipelineBehavior<,> registration below if you use both approaches.
            // Using cfg.AddBehavior is more explicit and recommended.
            cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
            cfg.AddOpenBehavior(typeof(PerformanceBehavior<,>));
            cfg.AddOpenBehavior(typeof(TransactionBehavior<,>));
            cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
        });

        // Registers all validators from this assembly (e.g., CreateInvoiceCommandValidator)
        services.AddValidatorsFromAssembly(assembly);

        return services;
    }
}
```

> **Note on behavior ordering:** `AddOpenBehavior` registers behaviors in order. The first registered is the outermost wrapper, so `LoggingBehavior` runs before `ValidationBehavior`. This means logging captures both successful and failed (validation) executions — intentional.

---

## Notification Handlers for Domain Events

```csharp
// MyApp.Application/Invoices/EventHandlers/InvoiceCreatedEventHandler.cs
using MediatR;
using Microsoft.Extensions.Logging;
using MyApp.Domain.Events;

namespace MyApp.Application.Invoices.EventHandlers;

internal sealed class InvoiceCreatedEventHandler : INotificationHandler<InvoiceCreatedEvent>
{
    private readonly ILogger<InvoiceCreatedEventHandler> _logger;

    public InvoiceCreatedEventHandler(ILogger<InvoiceCreatedEventHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(InvoiceCreatedEvent notification, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Invoice {InvoiceId} was created. Sending welcome email or triggering downstream tasks.",
            notification.InvoiceId);

        // Dispatch to email service, audit log, outbox, etc.
        return Task.CompletedTask;
    }
}
```

```csharp
// MyApp.Application/Invoices/EventHandlers/InvoiceMarkedAsPaidEventHandler.cs
using MediatR;
using Microsoft.Extensions.Logging;
using MyApp.Domain.Events;

namespace MyApp.Application.Invoices.EventHandlers;

internal sealed class InvoiceMarkedAsPaidEventHandler : INotificationHandler<InvoiceMarkedAsPaidEvent>
{
    private readonly ILogger<InvoiceMarkedAsPaidEventHandler> _logger;

    public InvoiceMarkedAsPaidEventHandler(ILogger<InvoiceMarkedAsPaidEventHandler> logger)
    {
        _logger = logger;
    }

    public async Task Handle(InvoiceMarkedAsPaidEvent notification, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Invoice {InvoiceId} was marked as paid. Triggering receipt generation.",
            notification.InvoiceId);

        // e.g., await receiptService.GenerateAsync(notification.InvoiceId, cancellationToken);
        await Task.CompletedTask;
    }
}
```

---

## Unit Tests for Behaviors

```csharp
// tests/MyApp.Application.Tests/ValidationBehaviorTests.cs
using FluentValidation;
using FluentValidation.Results;
using Moq;
using MyApp.Application.Behaviors;
using MyApp.Application.Exceptions;
using MediatR;

namespace MyApp.Application.Tests;

public sealed class ValidationBehaviorTests
{
    [Fact]
    public async Task Handle_WithNoValidators_CallsNext()
    {
        var behavior = new ValidationBehavior<TestCommand, string>(
            Enumerable.Empty<IValidator<TestCommand>>());

        var nextCalled = false;
        var result = await behavior.Handle(
            new TestCommand("value"),
            () => { nextCalled = true; return Task.FromResult("ok"); },
            CancellationToken.None);

        Assert.True(nextCalled);
        Assert.Equal("ok", result);
    }

    [Fact]
    public async Task Handle_WithFailingValidator_ThrowsValidationException()
    {
        var validatorMock = new Mock<IValidator<TestCommand>>();
        validatorMock
            .Setup(v => v.ValidateAsync(It.IsAny<ValidationContext<TestCommand>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new[]
            {
                new ValidationFailure("Name", "Name is required.")
            }));

        var behavior = new ValidationBehavior<TestCommand, string>(new[] { validatorMock.Object });

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            behavior.Handle(
                new TestCommand(""),
                () => Task.FromResult("ok"),
                CancellationToken.None));

        Assert.True(ex.Errors.ContainsKey("Name"));
    }

    private sealed record TestCommand(string Name) : IRequest<string>;
}
```

```csharp
// tests/MyApp.Application.Tests/PerformanceBehaviorTests.cs
using MediatR;
using Microsoft.Extensions.Logging;
using Moq;
using MyApp.Application.Behaviors;

namespace MyApp.Application.Tests;

public sealed class PerformanceBehaviorTests
{
    [Fact]
    public async Task Handle_FastRequest_DoesNotLogWarning()
    {
        var loggerMock = new Mock<ILogger<PerformanceBehavior<TestQuery, string>>>();
        var behavior = new PerformanceBehavior<TestQuery, string>(loggerMock.Object);

        await behavior.Handle(
            new TestQuery(),
            () => Task.FromResult("result"),
            CancellationToken.None);

        loggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception?>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Never);
    }

    private sealed record TestQuery : IRequest<string>;
}
```
