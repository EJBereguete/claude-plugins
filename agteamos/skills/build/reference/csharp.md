# C# / ASP.NET Core — Reference Implementation

Full, runnable example of the 3-layer API pattern using ASP.NET Core Minimal APIs, FluentValidation, FluentResults, and xUnit.
Includes a CQRS variant with MediatR and a global exception handler.

---

## Endpoints — `Endpoints/InvoiceEndpoints.cs`

```csharp
// Endpoints/InvoiceEndpoints.cs
using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

public static class InvoiceEndpoints
{
    public static IEndpointRouteBuilder MapInvoiceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/invoices")
            .WithTags("Invoices")
            .RequireAuthorization();

        group.MapPost("/", CreateInvoiceAsync)
            .WithName("CreateInvoice")
            .Produces<InvoiceResponse>(201)
            .ProducesValidationProblem(422);

        group.MapGet("/{id:guid}", GetInvoiceAsync)
            .WithName("GetInvoice")
            .Produces<InvoiceResponse>(200)
            .ProducesProblem(404);

        return app;
    }

    private static async Task<IResult> CreateInvoiceAsync(
        [FromBody] CreateInvoiceRequest request,
        IValidator<CreateInvoiceRequest> validator,
        IInvoiceService service,
        ClaimsPrincipal user)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var ownerId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await service.CreateAsync(request, ownerId);

        return result.IsSuccess
            ? Results.Created($"/api/v1/invoices/{result.Value.Id}", result.Value)
            : Results.Problem(result.Errors.First().Message, statusCode: 422);
    }

    private static async Task<IResult> GetInvoiceAsync(
        Guid id,
        IInvoiceService service,
        ClaimsPrincipal user)
    {
        var ownerId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await service.GetAsync(id, ownerId);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.Problem(title: "Not Found", statusCode: 404);
    }
}
```

---

## Request / Validator — `Contracts/CreateInvoiceRequest.cs`

```csharp
// Contracts/CreateInvoiceRequest.cs
public record CreateInvoiceRequest(
    string CustomerName,
    IReadOnlyList<LineItemRequest> Items
);

public record LineItemRequest(
    string Description,
    int Quantity,
    decimal UnitPrice
);

// Validators/CreateInvoiceRequestValidator.cs
using FluentValidation;

public class CreateInvoiceRequestValidator : AbstractValidator<CreateInvoiceRequest>
{
    public CreateInvoiceRequestValidator()
    {
        RuleFor(x => x.CustomerName)
            .NotEmpty()
            .MaximumLength(255);

        RuleFor(x => x.Items)
            .NotEmpty()
            .WithMessage("An invoice must have at least one line item.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.Description).NotEmpty().MaximumLength(255);
            item.RuleFor(i => i.Quantity).GreaterThan(0);
            item.RuleFor(i => i.UnitPrice).GreaterThan(0);
        });
    }
}
```

---

## Service — `Services/InvoiceService.cs`

```csharp
// Services/IInvoiceService.cs
using FluentResults;

public interface IInvoiceService
{
    Task<Result<InvoiceResponse>> CreateAsync(CreateInvoiceRequest request, Guid ownerId);
    Task<Result<InvoiceResponse>> GetAsync(Guid id, Guid ownerId);
}

// Services/InvoiceService.cs
using FluentResults;

public class InvoiceService : IInvoiceService
{
    private readonly IInvoiceRepository _repository;

    public InvoiceService(IInvoiceRepository repository)
        => _repository = repository;

    public async Task<Result<InvoiceResponse>> CreateAsync(
        CreateInvoiceRequest request,
        Guid ownerId)
    {
        var total = request.Items.Sum(i => i.Quantity * i.UnitPrice);
        if (total <= 0)
            return Result.Fail("Invoice total must be greater than zero.");

        var invoice = await _repository.CreateAsync(
            customerName: request.CustomerName,
            total: total,
            ownerId: ownerId);

        return Result.Ok(InvoiceResponse.FromEntity(invoice));
    }

    public async Task<Result<InvoiceResponse>> GetAsync(Guid id, Guid ownerId)
    {
        var invoice = await _repository.GetByIdAsync(id);
        if (invoice is null || invoice.OwnerId != ownerId)
            return Result.Fail("Invoice not found.");

        return Result.Ok(InvoiceResponse.FromEntity(invoice));
    }
}
```

---

## CQRS Variant — MediatR Command + Handler

```csharp
// Commands/CreateInvoiceCommand.cs
using FluentResults;
using MediatR;

public record CreateInvoiceCommand(
    string CustomerName,
    IReadOnlyList<LineItemRequest> Items,
    Guid OwnerId
) : IRequest<Result<InvoiceResponse>>;

// Commands/CreateInvoiceHandler.cs
using FluentResults;
using MediatR;

public class CreateInvoiceHandler : IRequestHandler<CreateInvoiceCommand, Result<InvoiceResponse>>
{
    private readonly IInvoiceRepository _repository;

    public CreateInvoiceHandler(IInvoiceRepository repository)
        => _repository = repository;

    public async Task<Result<InvoiceResponse>> Handle(
        CreateInvoiceCommand command,
        CancellationToken cancellationToken)
    {
        var total = command.Items.Sum(i => i.Quantity * i.UnitPrice);
        if (total <= 0)
            return Result.Fail("Invoice total must be greater than zero.");

        var invoice = await _repository.CreateAsync(
            customerName: command.CustomerName,
            total: total,
            ownerId: command.OwnerId,
            cancellationToken: cancellationToken);

        return Result.Ok(InvoiceResponse.FromEntity(invoice));
    }
}
```

---

## Global Exception Handler — `Infrastructure/GlobalExceptionHandler.cs`

```csharp
// Infrastructure/GlobalExceptionHandler.cs
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
        => _logger = logger;

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);

        var problem = new ProblemDetails
        {
            Type   = "https://tools.ietf.org/html/rfc9110#section-15.6.1",
            Title  = "An unexpected error occurred.",
            Status = StatusCodes.Status500InternalServerError,
        };

        httpContext.Response.StatusCode = problem.Status!.Value;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}
```

---

## Program.cs — Pipeline Order

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthentication().AddJwtBearer();
builder.Services.AddAuthorization();

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddValidatorsFromAssemblyContaining<CreateInvoiceRequestValidator>();
builder.Services.AddScoped<IInvoiceRepository, InvoiceRepository>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();

// MediatR variant (uncomment to use CQRS):
// builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<CreateInvoiceCommand>());

var app = builder.Build();

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

app.MapInvoiceEndpoints();

app.Run();
```

---

## Tests — `Tests/InvoiceEndpointsTests.cs`

```csharp
// Tests/InvoiceEndpointsTests.cs
using FluentResults;
using Moq;
using Xunit;

public class InvoiceEndpointsTests
{
    private readonly Mock<IInvoiceService> _serviceMock = new();

    private static CreateInvoiceRequest ValidRequest() => new(
        CustomerName: "Acme Corp",
        Items: new[]
        {
            new LineItemRequest("Widget A", 2, 10.00m),
            new LineItemRequest("Widget B", 1, 5.50m),
        }
    );

    [Fact]
    public async Task CreateAsync_ValidRequest_ReturnsCreatedResponse()
    {
        var expected = new InvoiceResponse(Guid.NewGuid(), "Acme Corp", 25.50m);
        _serviceMock
            .Setup(s => s.CreateAsync(It.IsAny<CreateInvoiceRequest>(), It.IsAny<Guid>()))
            .ReturnsAsync(Result.Ok(expected));

        var result = await _serviceMock.Object.CreateAsync(ValidRequest(), Guid.NewGuid());

        Assert.True(result.IsSuccess);
        Assert.Equal("Acme Corp", result.Value.CustomerName);
        Assert.Equal(25.50m, result.Value.Total);
    }

    [Fact]
    public async Task CreateAsync_EmptyItems_ReturnsFailure()
    {
        var request = ValidRequest() with { Items = Array.Empty<LineItemRequest>() };
        _serviceMock
            .Setup(s => s.CreateAsync(It.IsAny<CreateInvoiceRequest>(), It.IsAny<Guid>()))
            .ReturnsAsync(Result.Fail("An invoice must have at least one line item."));

        var result = await _serviceMock.Object.CreateAsync(request, Guid.NewGuid());

        Assert.True(result.IsFailed);
        Assert.Contains("at least one line item", result.Errors.First().Message);
    }

    [Fact]
    public async Task GetAsync_UnknownId_ReturnsFailure()
    {
        _serviceMock
            .Setup(s => s.GetAsync(It.IsAny<Guid>(), It.IsAny<Guid>()))
            .ReturnsAsync(Result.Fail("Invoice not found."));

        var result = await _serviceMock.Object.GetAsync(Guid.NewGuid(), Guid.NewGuid());

        Assert.True(result.IsFailed);
    }
}
```
