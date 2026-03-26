# Design Patterns in C#/.NET Enterprise Apps — Complete Example

## 1. Result Pattern

Using results instead of exceptions for expected business failures keeps the call chain explicit and avoids expensive stack unwinding for non-exceptional control flow.

### Custom Result type

```csharp
// MyApp.Domain/Common/Result.cs
namespace MyApp.Domain.Common;

public sealed class Result<T>
{
    public T? Value { get; }
    public string? Error { get; }
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;

    private Result(T value)
    {
        Value = value;
        IsSuccess = true;
    }

    private Result(string error)
    {
        Error = error;
        IsSuccess = false;
    }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(string error) => new(error);

    public Result<TOut> Map<TOut>(Func<T, TOut> mapper) =>
        IsSuccess ? Result<TOut>.Success(mapper(Value!)) : Result<TOut>.Failure(Error!);

    public async Task<Result<TOut>> MapAsync<TOut>(Func<T, Task<TOut>> mapper) =>
        IsSuccess ? Result<TOut>.Success(await mapper(Value!)) : Result<TOut>.Failure(Error!);

    public Result<TOut> Bind<TOut>(Func<T, Result<TOut>> binder) =>
        IsSuccess ? binder(Value!) : Result<TOut>.Failure(Error!);

    public async Task<Result<TOut>> BindAsync<TOut>(Func<T, Task<Result<TOut>>> binder) =>
        IsSuccess ? await binder(Value!) : Result<TOut>.Failure(Error!);

    public Result<T> OnSuccess(Action<T> action)
    {
        if (IsSuccess) action(Value!);
        return this;
    }

    public Result<T> OnFailure(Action<string> action)
    {
        if (IsFailure) action(Error!);
        return this;
    }

    public TOut Match<TOut>(Func<T, TOut> onSuccess, Func<string, TOut> onFailure) =>
        IsSuccess ? onSuccess(Value!) : onFailure(Error!);

    public override string ToString() =>
        IsSuccess ? $"Success({Value})" : $"Failure({Error})";
}

public static class Result
{
    public static Result<T> Success<T>(T value) => Result<T>.Success(value);
    public static Result<T> Failure<T>(string error) => Result<T>.Failure(error);
}
```

### Using Result in a service

```csharp
// MyApp.Application/Invoices/Services/InvoiceService.cs
using MyApp.Application.DTOs;
using MyApp.Domain.Common;
using MyApp.Domain.Entities;
using MyApp.Domain.Repositories;
using MyApp.Domain.ValueObjects;

namespace MyApp.Application.Invoices.Services;

public sealed class InvoiceService : IInvoiceService
{
    private readonly IInvoiceRepository _repository;
    private readonly IUnitOfWork _unitOfWork;

    public InvoiceService(IInvoiceRepository repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<InvoiceResponse>> CreateAsync(
        string number, Guid customerId, decimal amount, string currency,
        CancellationToken ct = default)
    {
        if (await _repository.ExistsByNumberAsync(number, ct))
            return Result.Failure<InvoiceResponse>($"Invoice number '{number}' already exists.");

        Money total;
        try
        {
            total = new Money(amount, currency);
        }
        catch (DomainException ex)
        {
            return Result.Failure<InvoiceResponse>(ex.Message);
        }

        Invoice invoice;
        try
        {
            invoice = Invoice.Create(number, customerId, total);
        }
        catch (DomainException ex)
        {
            return Result.Failure<InvoiceResponse>(ex.Message);
        }

        await _repository.AddAsync(invoice, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success(InvoiceResponse.From(invoice));
    }

    public async Task<Result<InvoiceResponse>> MarkAsPaidAsync(Guid id, CancellationToken ct = default)
    {
        var invoice = await _repository.GetByIdAsync(id, ct);
        if (invoice is null)
            return Result.Failure<InvoiceResponse>($"Invoice {id} not found.");

        try
        {
            invoice.MarkAsPaid();
        }
        catch (DomainException ex)
        {
            return Result.Failure<InvoiceResponse>(ex.Message);
        }

        _repository.Update(invoice);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success(InvoiceResponse.From(invoice));
    }
}
```

### Chaining Result in a handler

```csharp
// Chaining example
var result = await invoiceService
    .CreateAsync(request.Number, request.CustomerId, request.Amount, request.Currency, ct)
    .ContinueWith(t => t.Result
        .OnSuccess(r => logger.LogInformation("Invoice {Id} created", r.Id))
        .OnFailure(err => logger.LogWarning("Invoice creation failed: {Error}", err)));
```

### Converting Result to HTTP responses in Minimal APIs

```csharp
// MyApp.Api/Extensions/ResultExtensions.cs
using MyApp.Domain.Common;

namespace MyApp.Api.Extensions;

public static class ResultExtensions
{
    public static IResult ToCreatedAtRoute<T>(
        this Result<T> result,
        string routeName,
        object? routeValues = null) =>
        result.Match(
            onSuccess: value => Results.CreatedAtRoute(routeName, routeValues, value),
            onFailure: error => Results.BadRequest(new { error }));

    public static IResult ToOk<T>(this Result<T> result) =>
        result.Match(
            onSuccess: value => Results.Ok(value),
            onFailure: error => Results.BadRequest(new { error }));

    public static IResult ToNoContent<T>(this Result<T> result) =>
        result.Match(
            onSuccess: _ => Results.NoContent(),
            onFailure: error => Results.BadRequest(new { error }));
}
```

```csharp
// Usage in endpoint
app.MapPost("/api/invoices", async (
    CreateInvoiceRequest req,
    IInvoiceService svc,
    CancellationToken ct) =>
{
    var result = await svc.CreateAsync(req.Number, req.CustomerId, req.TotalAmount, req.Currency, ct);
    return result.ToCreatedAtRoute("GetInvoice", new { id = result.Value?.Id });
});
```

---

## 2. Repository + Unit of Work

### Generic repository interface

```csharp
// MyApp.Domain/Repositories/IRepository.cs
namespace MyApp.Domain.Repositories;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(T entity, CancellationToken ct = default);
    void Update(T entity);
    void Remove(T entity);
}
```

### Specific repository extending generic

```csharp
// MyApp.Domain/Repositories/IInvoiceRepository.cs
using MyApp.Domain.Entities;
using MyApp.Domain.Enums;

namespace MyApp.Domain.Repositories;

public interface IInvoiceRepository : IRepository<Invoice>
{
    Task<Invoice?> GetByNumberAsync(string number, CancellationToken ct = default);
    Task<bool> ExistsByNumberAsync(string number, CancellationToken ct = default);
    Task<IReadOnlyList<Invoice>> GetByCustomerIdAsync(Guid customerId, CancellationToken ct = default);
    Task<IReadOnlyList<Invoice>> GetByStatusAsync(InvoiceStatus status, CancellationToken ct = default);
    Task<int> CountByCustomerAsync(Guid customerId, CancellationToken ct = default);
}
```

### Generic EF Core base repository

```csharp
// MyApp.Infrastructure/Persistence/Repositories/EfRepository.cs
using Microsoft.EntityFrameworkCore;
using MyApp.Domain.Repositories;

namespace MyApp.Infrastructure.Persistence.Repositories;

internal abstract class EfRepository<T> : IRepository<T> where T : class
{
    protected readonly ApplicationDbContext Context;
    protected readonly DbSet<T> DbSet;

    protected EfRepository(ApplicationDbContext context)
    {
        Context = context;
        DbSet = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await DbSet.FindAsync([id], ct);
    }

    public virtual async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default)
    {
        return await DbSet.AsNoTracking().ToListAsync(ct);
    }

    public virtual async Task AddAsync(T entity, CancellationToken ct = default)
    {
        await DbSet.AddAsync(entity, ct);
    }

    public virtual void Update(T entity)
    {
        DbSet.Update(entity);
    }

    public virtual void Remove(T entity)
    {
        DbSet.Remove(entity);
    }
}
```

### Concrete InvoiceRepository

```csharp
// MyApp.Infrastructure/Persistence/Repositories/InvoiceRepository.cs
using Microsoft.EntityFrameworkCore;
using MyApp.Domain.Entities;
using MyApp.Domain.Enums;
using MyApp.Domain.Repositories;

namespace MyApp.Infrastructure.Persistence.Repositories;

internal sealed class InvoiceRepository : EfRepository<Invoice>, IInvoiceRepository
{
    public InvoiceRepository(ApplicationDbContext context) : base(context) { }

    public async Task<Invoice?> GetByNumberAsync(string number, CancellationToken ct = default)
    {
        return await DbSet
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Number == number, ct);
    }

    public async Task<bool> ExistsByNumberAsync(string number, CancellationToken ct = default)
    {
        return await DbSet.AnyAsync(i => i.Number == number, ct);
    }

    public async Task<IReadOnlyList<Invoice>> GetByCustomerIdAsync(
        Guid customerId, CancellationToken ct = default)
    {
        return await DbSet
            .AsNoTracking()
            .Where(i => i.CustomerId == customerId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Invoice>> GetByStatusAsync(
        InvoiceStatus status, CancellationToken ct = default)
    {
        return await DbSet
            .AsNoTracking()
            .Where(i => i.Status == status)
            .ToListAsync(ct);
    }

    public async Task<int> CountByCustomerAsync(Guid customerId, CancellationToken ct = default)
    {
        return await DbSet.CountAsync(i => i.CustomerId == customerId, ct);
    }
}
```

---

## 3. Decorator Pattern

Decorators add cross-cutting concerns (caching, logging, validation) without modifying the original service. Stack them by nesting wrappers — innermost decorator calls the real implementation.

### IInvoiceService interface

```csharp
// MyApp.Application/Invoices/Services/IInvoiceService.cs
using MyApp.Application.DTOs;
using MyApp.Domain.Common;

namespace MyApp.Application.Invoices.Services;

public interface IInvoiceService
{
    Task<Result<InvoiceResponse>> CreateAsync(
        string number, Guid customerId, decimal amount, string currency,
        CancellationToken ct = default);

    Task<Result<InvoiceResponse>> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<Result<InvoiceResponse>> MarkAsPaidAsync(Guid id, CancellationToken ct = default);
}
```

### Decorator 1: CachingInvoiceServiceDecorator

```csharp
// MyApp.Infrastructure/Decorators/CachingInvoiceServiceDecorator.cs
using Microsoft.Extensions.Caching.Memory;
using MyApp.Application.DTOs;
using MyApp.Application.Invoices.Services;
using MyApp.Domain.Common;

namespace MyApp.Infrastructure.Decorators;

internal sealed class CachingInvoiceServiceDecorator : IInvoiceService
{
    private readonly IInvoiceService _inner;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public CachingInvoiceServiceDecorator(IInvoiceService inner, IMemoryCache cache)
    {
        _inner = inner;
        _cache = cache;
    }

    public Task<Result<InvoiceResponse>> CreateAsync(
        string number, Guid customerId, decimal amount, string currency,
        CancellationToken ct = default)
    {
        // Write operations are never cached — delegate directly
        return _inner.CreateAsync(number, customerId, amount, currency, ct);
    }

    public async Task<Result<InvoiceResponse>> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var cacheKey = $"invoice:{id}";

        if (_cache.TryGetValue(cacheKey, out InvoiceResponse? cached))
            return Result.Success(cached!);

        var result = await _inner.GetByIdAsync(id, ct);

        if (result.IsSuccess)
        {
            _cache.Set(cacheKey, result.Value, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CacheDuration,
                SlidingExpiration = TimeSpan.FromMinutes(1)
            });
        }

        return result;
    }

    public async Task<Result<InvoiceResponse>> MarkAsPaidAsync(Guid id, CancellationToken ct = default)
    {
        var result = await _inner.MarkAsPaidAsync(id, ct);

        // Invalidate cache on state change
        if (result.IsSuccess)
            _cache.Remove($"invoice:{id}");

        return result;
    }
}
```

### Decorator 2: LoggingInvoiceServiceDecorator

```csharp
// MyApp.Infrastructure/Decorators/LoggingInvoiceServiceDecorator.cs
using System.Diagnostics;
using Microsoft.Extensions.Logging;
using MyApp.Application.DTOs;
using MyApp.Application.Invoices.Services;
using MyApp.Domain.Common;

namespace MyApp.Infrastructure.Decorators;

internal sealed class LoggingInvoiceServiceDecorator : IInvoiceService
{
    private readonly IInvoiceService _inner;
    private readonly ILogger<LoggingInvoiceServiceDecorator> _logger;

    public LoggingInvoiceServiceDecorator(
        IInvoiceService inner,
        ILogger<LoggingInvoiceServiceDecorator> logger)
    {
        _inner = inner;
        _logger = logger;
    }

    public async Task<Result<InvoiceResponse>> CreateAsync(
        string number, Guid customerId, decimal amount, string currency,
        CancellationToken ct = default)
    {
        _logger.LogInformation("Creating invoice {Number} for customer {CustomerId}", number, customerId);
        var sw = Stopwatch.StartNew();

        var result = await _inner.CreateAsync(number, customerId, amount, currency, ct);
        sw.Stop();

        result
            .OnSuccess(r => _logger.LogInformation(
                "Invoice {Id} created in {ElapsedMs}ms", r.Id, sw.ElapsedMilliseconds))
            .OnFailure(err => _logger.LogWarning(
                "Invoice creation failed in {ElapsedMs}ms: {Error}", sw.ElapsedMilliseconds, err));

        return result;
    }

    public async Task<Result<InvoiceResponse>> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        _logger.LogDebug("Getting invoice {Id}", id);
        var result = await _inner.GetByIdAsync(id, ct);

        result.OnFailure(err => _logger.LogWarning("Invoice {Id} not found: {Error}", id, err));

        return result;
    }

    public async Task<Result<InvoiceResponse>> MarkAsPaidAsync(Guid id, CancellationToken ct = default)
    {
        _logger.LogInformation("Marking invoice {Id} as paid", id);
        var result = await _inner.MarkAsPaidAsync(id, ct);

        result
            .OnSuccess(_ => _logger.LogInformation("Invoice {Id} marked as paid", id))
            .OnFailure(err => _logger.LogWarning("Failed to mark invoice {Id} as paid: {Error}", id, err));

        return result;
    }
}
```

### Decorator 3: ValidationInvoiceServiceDecorator

```csharp
// MyApp.Infrastructure/Decorators/ValidationInvoiceServiceDecorator.cs
using MyApp.Application.DTOs;
using MyApp.Application.Invoices.Services;
using MyApp.Domain.Common;

namespace MyApp.Infrastructure.Decorators;

internal sealed class ValidationInvoiceServiceDecorator : IInvoiceService
{
    private readonly IInvoiceService _inner;

    public ValidationInvoiceServiceDecorator(IInvoiceService inner)
    {
        _inner = inner;
    }

    public Task<Result<InvoiceResponse>> CreateAsync(
        string number, Guid customerId, decimal amount, string currency,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(number))
            return Task.FromResult(Result.Failure<InvoiceResponse>("Invoice number is required."));

        if (customerId == Guid.Empty)
            return Task.FromResult(Result.Failure<InvoiceResponse>("Customer ID is required."));

        if (amount <= 0)
            return Task.FromResult(Result.Failure<InvoiceResponse>("Amount must be greater than zero."));

        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3)
            return Task.FromResult(Result.Failure<InvoiceResponse>("Currency must be a 3-letter ISO code."));

        return _inner.CreateAsync(number, customerId, amount, currency, ct);
    }

    public Task<Result<InvoiceResponse>> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        if (id == Guid.Empty)
            return Task.FromResult(Result.Failure<InvoiceResponse>("Invoice ID is required."));

        return _inner.GetByIdAsync(id, ct);
    }

    public Task<Result<InvoiceResponse>> MarkAsPaidAsync(Guid id, CancellationToken ct = default)
    {
        if (id == Guid.Empty)
            return Task.FromResult(Result.Failure<InvoiceResponse>("Invoice ID is required."));

        return _inner.MarkAsPaidAsync(id, ct);
    }
}
```

### Registration with Scrutor

```csharp
// MyApp.Infrastructure/DependencyInjection.cs (decorator section)
// Decorators are applied bottom-up: the last Decorate call is the outermost wrapper.
// Execution order: Caching → Logging → Validation → InvoiceService (real)

services.AddScoped<IInvoiceService, InvoiceService>();

// Applied first (innermost after real impl)
services.Decorate<IInvoiceService, ValidationInvoiceServiceDecorator>();

// Applied second
services.Decorate<IInvoiceService, LoggingInvoiceServiceDecorator>();

// Applied last (outermost — checked first on every call)
services.Decorate<IInvoiceService, CachingInvoiceServiceDecorator>();
```

Call stack for `GetByIdAsync`:

```
CachingInvoiceServiceDecorator.GetByIdAsync
  → LoggingInvoiceServiceDecorator.GetByIdAsync
      → ValidationInvoiceServiceDecorator.GetByIdAsync
          → InvoiceService.GetByIdAsync  ← real implementation
```

---

## 4. Strategy Pattern — Payment Processing

### Strategy interface

```csharp
// MyApp.Domain/Payments/IPaymentStrategy.cs
namespace MyApp.Domain.Payments;

public interface IPaymentStrategy
{
    string ProviderName { get; }

    Task<PaymentResult> ProcessAsync(
        PaymentRequest request,
        CancellationToken ct = default);

    Task<RefundResult> RefundAsync(
        string transactionId,
        decimal amount,
        CancellationToken ct = default);
}
```

### Payment value objects

```csharp
// MyApp.Domain/Payments/PaymentRequest.cs
namespace MyApp.Domain.Payments;

public sealed record PaymentRequest(
    Guid InvoiceId,
    decimal Amount,
    string Currency,
    string Description,
    IDictionary<string, string> Metadata);
```

```csharp
// MyApp.Domain/Payments/PaymentResult.cs
namespace MyApp.Domain.Payments;

public sealed record PaymentResult(
    bool IsSuccess,
    string TransactionId,
    string? ErrorCode,
    string? ErrorMessage);
```

```csharp
// MyApp.Domain/Payments/RefundResult.cs
namespace MyApp.Domain.Payments;

public sealed record RefundResult(
    bool IsSuccess,
    string RefundId,
    string? ErrorMessage);
```

```csharp
// MyApp.Domain/Payments/PaymentProvider.cs
namespace MyApp.Domain.Payments;

public enum PaymentProvider
{
    Stripe,
    PayPal,
    CreditCard
}
```

### Concrete strategies

```csharp
// MyApp.Infrastructure/Payments/StripePaymentStrategy.cs
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MyApp.Domain.Payments;

namespace MyApp.Infrastructure.Payments;

internal sealed class StripePaymentStrategy : IPaymentStrategy
{
    private readonly StripeOptions _options;
    private readonly ILogger<StripePaymentStrategy> _logger;

    public StripePaymentStrategy(
        IOptions<StripeOptions> options,
        ILogger<StripePaymentStrategy> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public string ProviderName => "Stripe";

    public async Task<PaymentResult> ProcessAsync(PaymentRequest request, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Processing payment via Stripe for invoice {InvoiceId}, amount {Amount} {Currency}",
            request.InvoiceId, request.Amount, request.Currency);

        try
        {
            // var service = new PaymentIntentService();
            // var intent = await service.CreateAsync(new PaymentIntentCreateOptions { ... }, cancellationToken: ct);
            // Simulated for example:
            await Task.Delay(10, ct);

            var transactionId = $"pi_{Guid.NewGuid():N}";
            _logger.LogInformation("Stripe payment successful: {TransactionId}", transactionId);
            return new PaymentResult(true, transactionId, null, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Stripe payment failed for invoice {InvoiceId}", request.InvoiceId);
            return new PaymentResult(false, string.Empty, "stripe_error", ex.Message);
        }
    }

    public async Task<RefundResult> RefundAsync(
        string transactionId, decimal amount, CancellationToken ct = default)
    {
        await Task.Delay(10, ct);
        return new RefundResult(true, $"re_{Guid.NewGuid():N}", null);
    }
}
```

```csharp
// MyApp.Infrastructure/Payments/PayPalPaymentStrategy.cs
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MyApp.Domain.Payments;

namespace MyApp.Infrastructure.Payments;

internal sealed class PayPalPaymentStrategy : IPaymentStrategy
{
    private readonly PayPalOptions _options;
    private readonly ILogger<PayPalPaymentStrategy> _logger;

    public PayPalPaymentStrategy(
        IOptions<PayPalOptions> options,
        ILogger<PayPalPaymentStrategy> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public string ProviderName => "PayPal";

    public async Task<PaymentResult> ProcessAsync(PaymentRequest request, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Processing payment via PayPal for invoice {InvoiceId}", request.InvoiceId);

        try
        {
            await Task.Delay(10, ct);
            var transactionId = $"PAY-{Guid.NewGuid():N}";
            return new PaymentResult(true, transactionId, null, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PayPal payment failed for invoice {InvoiceId}", request.InvoiceId);
            return new PaymentResult(false, string.Empty, "paypal_error", ex.Message);
        }
    }

    public async Task<RefundResult> RefundAsync(
        string transactionId, decimal amount, CancellationToken ct = default)
    {
        await Task.Delay(10, ct);
        return new RefundResult(true, $"REFUND-{Guid.NewGuid():N}", null);
    }
}
```

```csharp
// MyApp.Infrastructure/Payments/CreditCardPaymentStrategy.cs
using Microsoft.Extensions.Logging;
using MyApp.Domain.Payments;

namespace MyApp.Infrastructure.Payments;

internal sealed class CreditCardPaymentStrategy : IPaymentStrategy
{
    private readonly ILogger<CreditCardPaymentStrategy> _logger;

    public CreditCardPaymentStrategy(ILogger<CreditCardPaymentStrategy> logger)
    {
        _logger = logger;
    }

    public string ProviderName => "CreditCard";

    public async Task<PaymentResult> ProcessAsync(PaymentRequest request, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Processing credit card payment for invoice {InvoiceId}", request.InvoiceId);

        try
        {
            await Task.Delay(10, ct);
            var transactionId = $"CC-{Guid.NewGuid():N}";
            return new PaymentResult(true, transactionId, null, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Credit card payment failed for invoice {InvoiceId}", request.InvoiceId);
            return new PaymentResult(false, string.Empty, "cc_error", ex.Message);
        }
    }

    public async Task<RefundResult> RefundAsync(
        string transactionId, decimal amount, CancellationToken ct = default)
    {
        await Task.Delay(10, ct);
        return new RefundResult(true, $"REFUND-CC-{Guid.NewGuid():N}", null);
    }
}
```

### Strategy factory

```csharp
// MyApp.Infrastructure/Payments/PaymentStrategyFactory.cs
using MyApp.Domain.Payments;

namespace MyApp.Infrastructure.Payments;

public interface IPaymentStrategyFactory
{
    IPaymentStrategy GetStrategy(PaymentProvider provider);
}

internal sealed class PaymentStrategyFactory : IPaymentStrategyFactory
{
    private readonly IEnumerable<IPaymentStrategy> _strategies;

    public PaymentStrategyFactory(IEnumerable<IPaymentStrategy> strategies)
    {
        _strategies = strategies;
    }

    public IPaymentStrategy GetStrategy(PaymentProvider provider)
    {
        var providerName = provider switch
        {
            PaymentProvider.Stripe     => "Stripe",
            PaymentProvider.PayPal     => "PayPal",
            PaymentProvider.CreditCard => "CreditCard",
            _ => throw new ArgumentOutOfRangeException(nameof(provider), $"Unknown provider: {provider}")
        };

        return _strategies.FirstOrDefault(s => s.ProviderName == providerName)
            ?? throw new InvalidOperationException(
                $"No payment strategy registered for provider '{providerName}'.");
    }
}
```

### Registration

```csharp
// MyApp.Infrastructure/DependencyInjection.cs (payment section)
services.Configure<StripeOptions>(configuration.GetSection("Stripe"));
services.Configure<PayPalOptions>(configuration.GetSection("PayPal"));

services.AddScoped<IPaymentStrategy, StripePaymentStrategy>();
services.AddScoped<IPaymentStrategy, PayPalPaymentStrategy>();
services.AddScoped<IPaymentStrategy, CreditCardPaymentStrategy>();
services.AddScoped<IPaymentStrategyFactory, PaymentStrategyFactory>();
```

### Usage in application handler

```csharp
// MyApp.Application/Payments/Commands/ProcessPayment/ProcessPaymentCommandHandler.cs
using MediatR;
using MyApp.Application.Abstractions;
using MyApp.Domain.Payments;
using MyApp.Domain.Repositories;

namespace MyApp.Application.Payments.Commands.ProcessPayment;

public sealed record ProcessPaymentCommand(
    Guid InvoiceId,
    PaymentProvider Provider) : ICommand<PaymentResult>;

internal sealed class ProcessPaymentCommandHandler
    : IRequestHandler<ProcessPaymentCommand, PaymentResult>
{
    private readonly IPaymentStrategyFactory _factory;
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ProcessPaymentCommandHandler(
        IPaymentStrategyFactory factory,
        IInvoiceRepository invoiceRepository,
        IUnitOfWork unitOfWork)
    {
        _factory = factory;
        _invoiceRepository = invoiceRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<PaymentResult> Handle(
        ProcessPaymentCommand request,
        CancellationToken cancellationToken)
    {
        var invoice = await _invoiceRepository.GetByIdAsync(request.InvoiceId, cancellationToken)
            ?? throw new InvalidOperationException($"Invoice {request.InvoiceId} not found.");

        var strategy = _factory.GetStrategy(request.Provider);

        var paymentRequest = new PaymentRequest(
            invoice.Id,
            invoice.Total.Amount,
            invoice.Total.Currency,
            $"Payment for invoice {invoice.Number}",
            new Dictionary<string, string>());

        var result = await strategy.ProcessAsync(paymentRequest, cancellationToken);

        if (result.IsSuccess)
        {
            invoice.MarkAsPaid();
            _invoiceRepository.Update(invoice);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return result;
    }
}
```

---

## 5. Observer Pattern — Domain Events with MediatR

Domain events decouple the aggregate from downstream side effects. The aggregate raises events; handlers react after SaveChangesAsync.

### Dispatching domain events from ApplicationDbContext

```csharp
// MyApp.Infrastructure/Persistence/ApplicationDbContext.cs (SaveChangesAsync)
public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
{
    // Collect domain events BEFORE saving so entities can be included in the same transaction
    var domainEvents = ChangeTracker
        .Entries<AggregateRoot>()
        .Select(e => e.Entity)
        .Where(a => a.DomainEvents.Count != 0)
        .SelectMany(a =>
        {
            var events = a.DomainEvents.ToList();
            a.ClearDomainEvents(); // clear before save to avoid re-dispatching on retries
            return events;
        })
        .ToList();

    var result = await base.SaveChangesAsync(cancellationToken);

    // Publish after commit — each handler runs in the same request scope
    foreach (var domainEvent in domainEvents)
        await _publisher.Publish(domainEvent, cancellationToken);

    return result;
}
```

### Domain event notification handlers

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
            "Domain event: Invoice {InvoiceId} created — triggering audit log entry",
            notification.InvoiceId);

        // Could dispatch to: audit service, outbox, notification service, analytics, etc.
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
            "Domain event: Invoice {InvoiceId} marked as paid — generating receipt",
            notification.InvoiceId);

        // e.g., await receiptService.GenerateAsync(notification.InvoiceId, cancellationToken);
        await Task.CompletedTask;
    }
}
```

```csharp
// Multiple handlers for the same event are fully supported by MediatR
// MyApp.Application/Invoices/EventHandlers/InvoiceMarkedAsPaidAuditHandler.cs
using MediatR;
using Microsoft.Extensions.Logging;
using MyApp.Domain.Events;

namespace MyApp.Application.Invoices.EventHandlers;

internal sealed class InvoiceMarkedAsPaidAuditHandler : INotificationHandler<InvoiceMarkedAsPaidEvent>
{
    private readonly ILogger<InvoiceMarkedAsPaidAuditHandler> _logger;

    public InvoiceMarkedAsPaidAuditHandler(ILogger<InvoiceMarkedAsPaidAuditHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(InvoiceMarkedAsPaidEvent notification, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Audit: Invoice {InvoiceId} payment recorded in audit trail",
            notification.InvoiceId);

        return Task.CompletedTask;
    }
}
```

---

## Pattern Decision Guide

| Situation | Pattern | Reason |
|---|---|---|
| Multiple implementations of the same operation | Strategy | Swap algorithm at runtime without changing callers |
| Cross-cutting concerns on a single interface | Decorator | Add behavior transparently; each decorator has one responsibility |
| Reacting to state changes without coupling | Observer / Domain Events | Aggregate raises event; multiple handlers react independently |
| Expected business failures (not bugs) | Result pattern | Avoids exception-as-control-flow; makes failure paths explicit |
| Data access abstraction | Repository + UoW | Isolates persistence; enables unit testing without a real DB |

**Anti-patterns to avoid:**

```csharp
// BAD: fat service with try/catch everywhere for business logic
public async Task ProcessAsync(...)
{
    try { ... }
    catch (InvoiceAlreadyPaidException) { return false; }  // exceptions as control flow
}

// GOOD: Result type makes paths explicit
public async Task<Result<InvoiceResponse>> ProcessAsync(...)
{
    if (invoice.Status == InvoiceStatus.Paid)
        return Result.Failure<InvoiceResponse>("Invoice is already paid.");
    ...
}
```

```csharp
// BAD: strategy selected with a long if/else in the handler
if (provider == "stripe") { ... }
else if (provider == "paypal") { ... }

// GOOD: factory resolves the correct implementation
var strategy = _factory.GetStrategy(provider);
var result = await strategy.ProcessAsync(request, ct);
```

```csharp
// BAD: domain event dispatched before SaveChanges — handler may see stale data
invoice.MarkAsPaid();
await _publisher.Publish(new InvoiceMarkedAsPaidEvent(invoice.Id)); // DB not saved yet!
await _unitOfWork.SaveChangesAsync();

// GOOD: dispatch in SaveChangesAsync after base.SaveChangesAsync()
// (as shown in ApplicationDbContext above)
```
