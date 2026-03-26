# API Design — C# / ASP.NET Core Examples

## RFC 9457 — GlobalExceptionHandler (.NET 8+)

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
        HttpContext ctx,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Unhandled exception for {Path}", ctx.Request.Path);

        var (status, title) = exception switch
        {
            AppNotFoundException  => (StatusCodes.Status404NotFound,  "Resource not found"),
            AppConflictException  => (StatusCodes.Status409Conflict,  "Conflict"),
            AppValidationException => (StatusCodes.Status422UnprocessableEntity, "Validation error"),
            _                     => (StatusCodes.Status500InternalServerError, "Internal server error"),
        };

        var problem = new ProblemDetails
        {
            Type     = $"https://api.example.com/errors/{status}",
            Title    = title,
            Status   = status,
            Detail   = exception.Message,
            Instance = ctx.Request.Path,
        };

        ctx.Response.StatusCode = status;
        await ctx.Response.WriteAsJsonAsync(problem, cancellationToken);
        ctx.Response.ContentType = "application/problem+json";
        return true;
    }
}
```

## Program.cs — Middleware Pipeline

```csharp
var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddValidatorsFromAssemblyContaining<Program>(); // FluentValidation
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("api", policy =>
    {
        policy.PermitLimit         = 100;
        policy.Window              = TimeSpan.FromMinutes(1);
        policy.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        policy.QueueLimit          = 0;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (ctx, token) =>
    {
        ctx.HttpContext.Response.Headers.RetryAfter = "60";
        await ctx.HttpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Type   = "https://api.example.com/errors/429",
            Title  = "Too many requests",
            Status = 429,
            Detail = "Rate limit exceeded. Retry after 60 seconds.",
        }, token);
    };
});

var app = builder.Build();

// Pipeline order matters:
app.UseExceptionHandler();  // 1. Catch unhandled exceptions
app.UseHttpsRedirection();  // 2. Redirect HTTP → HTTPS
app.UseRateLimiter();       // 3. Enforce rate limits
app.MapOpenApi();           // 4. Expose /openapi/v1.json

// Route groups
var api = app.MapGroup("/api/v1").RequireRateLimiting("api");
api.MapUserEndpoints();

app.Run();
```

## Minimal API — MapPost with FluentValidation

```csharp
// Features/Users/UserEndpoints.cs
public static class UserEndpoints
{
    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/users").WithTags("Users");

        group.MapPost("/", CreateUser)
            .WithName("CreateUser")
            .WithSummary("Create a new user")
            .Produces<UserResponse>(StatusCodes.Status201Created, "application/json")
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapGet("/{id}", GetUser)
            .WithName("GetUser")
            .WithSummary("Get user by ID")
            .Produces<UserResponse>()
            .ProducesProblem(StatusCodes.Status404NotFound);

        return app;
    }

    private static async Task<IResult> CreateUser(
        CreateUserRequest request,
        IValidator<CreateUserRequest> validator,
        IUserService userService)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var user = await userService.CreateAsync(request);
        return Results.Created($"/api/v1/users/{user.Id}", user);
    }

    private static async Task<IResult> GetUser(string id, IUserService userService)
    {
        var user = await userService.GetByIdAsync(id);
        return user is null ? Results.Problem(
            title: "User not found",
            statusCode: 404,
            type: "https://api.example.com/errors/404"
        ) : Results.Ok(user);
    }
}
```

## FluentValidation — Request Validator

```csharp
// Features/Users/CreateUserRequest.cs
public record CreateUserRequest(string Name, string Email, string Password);

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(100).WithMessage("Name must not exceed 100 characters.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email address is required.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches(@"[0-9]").WithMessage("Password must contain at least one digit.");
    }
}
```

## Cursor Pagination

```csharp
// Common/Pagination/CursorPagination.cs
using System.Text;
using System.Text.Json;

public record CursorPaginationResult<T>(
    IReadOnlyList<T> Data,
    bool HasNext,
    string? NextCursor,
    bool HasPrev,
    string? PrevCursor
);

public static class CursorEncoder
{
    public static string Encode(object data)
    {
        var json  = JsonSerializer.Serialize(data);
        var bytes = Encoding.UTF8.GetBytes(json);
        return Convert.ToBase64String(bytes);
    }

    public static T Decode<T>(string cursor)
    {
        var bytes = Convert.FromBase64String(cursor);
        var json  = Encoding.UTF8.GetString(bytes);
        return JsonSerializer.Deserialize<T>(json)!;
    }
}

// Usage in repository
public async Task<CursorPaginationResult<Message>> GetPageAsync(int limit, string? afterCursor)
{
    Guid? afterId = null;
    if (afterCursor is not null)
    {
        var data = CursorEncoder.Decode<CursorData>(afterCursor);
        afterId = data.Id;
    }

    var items = await _db.Messages
        .Where(m => afterId == null || m.Id.CompareTo(afterId) > 0)
        .OrderBy(m => m.CreatedAt)
        .Take(limit + 1)
        .ToListAsync();

    var hasNext   = items.Count > limit;
    var page      = hasNext ? items[..limit] : items;
    var nextCursor = hasNext
        ? CursorEncoder.Encode(new CursorData(page[^1].Id, page[^1].CreatedAt))
        : null;

    return new CursorPaginationResult<Message>(page, hasNext, nextCursor, afterCursor is not null, null);
}

public record CursorData(Guid Id, DateTime CreatedAt);
```

## Custom Domain Exceptions

```csharp
// Common/Exceptions/AppExceptions.cs
public abstract class AppException(string message) : Exception(message);

public class AppNotFoundException(string resource, object id)
    : AppException($"{resource} with id '{id}' was not found.");

public class AppConflictException(string message) : AppException(message);

public class AppValidationException(string message) : AppException(message);
```
