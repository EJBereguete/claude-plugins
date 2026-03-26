# ASP.NET Core Middleware Patterns — Complete Example

## Correct Middleware Pipeline Order

```csharp
// MyApp.Api/Program.cs
using MyApp.Api.Extensions;
using MyApp.Api.Infrastructure.ExceptionHandlers;
using MyApp.Application;
using MyApp.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// ── Services ─────────────────────────────────────────────────────────────────

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// IExceptionHandler chain — most specific first, global last
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddExceptionHandler<NotFoundExceptionHandler>();
builder.Services.AddExceptionHandler<UnauthorizedExceptionHandler>();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddCorrelationId();  // see Extension methods section
builder.Services.AddRequestResponseLogging();
builder.Services.AddApiRateLimiting();

builder.Services.AddAuthentication().AddJwtBearer();
builder.Services.AddAuthorization();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── App pipeline ─────────────────────────────────────────────────────────────

var app = builder.Build();

// 1. Exception handler MUST be first.
//    Any middleware registered after it can throw and be caught here.
app.UseExceptionHandler();

// 2. Correlation ID early in the pipeline so it is available in all subsequent
//    middleware and in structured logs via ILogger scope.
app.UseCorrelationId();

// 3. Request/Response logging after correlation so logs include the correlation ID.
app.UseRequestResponseLogging();

// 4. HTTPS redirect before any content is served.
app.UseHttpsRedirection();

// 5. Static files (if any) before routing — no auth needed for static assets.
app.UseStaticFiles();

// 6. Routing must come before CORS, auth, rate limiting.
app.UseRouting();

// 7. CORS after routing so route metadata is available, but before auth.
app.UseCors("DefaultPolicy");

// 8. Rate limiting after CORS; anonymous rate limiting doesn't need identity.
app.UseRateLimiter();

// 9. Authentication before authorization — must establish identity first.
app.UseAuthentication();

// 10. Authorization after authentication.
app.UseAuthorization();

// 11. Antiforgery (for Blazor/Razor Pages form submissions).
app.UseAntiforgery();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapInvoiceEndpoints()
   .RequireRateLimiting("api");

app.Run();

public partial class Program { }
```

---

## Middleware Implementation 1: Request/Response Logging

```csharp
// MyApp.Api/Infrastructure/Middleware/RequestResponseLoggingMiddleware.cs
using System.Diagnostics;
using System.Text;
using Microsoft.IO;

namespace MyApp.Api.Infrastructure.Middleware;

/// <summary>
/// Logs HTTP method, path, status code, and duration for every request.
/// Uses RecyclableMemoryStreamManager to avoid LOH pressure when reading bodies.
/// Body logging is opt-in via configuration to avoid PII exposure in production.
/// </summary>
public sealed class RequestResponseLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestResponseLoggingMiddleware> _logger;
    private readonly RecyclableMemoryStreamManager _streamManager;
    private readonly bool _logBodies;

    public RequestResponseLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestResponseLoggingMiddleware> logger,
        IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _streamManager = new RecyclableMemoryStreamManager();
        _logBodies = configuration.GetValue<bool>("Logging:LogRequestBodies");
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();

        string? requestBody = null;
        if (_logBodies && context.Request.ContentLength > 0)
        {
            // EnableBuffering allows the body to be read multiple times
            context.Request.EnableBuffering();
            requestBody = await ReadBodyAsync(context.Request.Body);
            context.Request.Body.Position = 0; // rewind for actual handler
        }

        _logger.LogInformation(
            "HTTP {Method} {Path}{Query} started — Body: {RequestBody}",
            context.Request.Method,
            context.Request.Path,
            context.Request.QueryString,
            requestBody ?? "(not logged)");

        // Swap out the response body stream so we can read it back
        var originalBodyStream = context.Response.Body;
        await using var responseBody = _streamManager.GetStream();
        context.Response.Body = responseBody;

        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();

            responseBody.Seek(0, SeekOrigin.Begin);
            string? responseBodyText = null;
            if (_logBodies)
                responseBodyText = await new StreamReader(responseBody).ReadToEndAsync();

            responseBody.Seek(0, SeekOrigin.Begin);
            await responseBody.CopyToAsync(originalBodyStream);
            context.Response.Body = originalBodyStream;

            _logger.LogInformation(
                "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs}ms — Body: {ResponseBody}",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                sw.ElapsedMilliseconds,
                responseBodyText ?? "(not logged)");
        }
    }

    private static async Task<string> ReadBodyAsync(Stream body)
    {
        using var reader = new StreamReader(body, Encoding.UTF8, leaveOpen: true);
        return await reader.ReadToEndAsync();
    }
}
```

---

## Middleware Implementation 2: Correlation ID

```csharp
// MyApp.Api/Infrastructure/Middleware/CorrelationIdMiddleware.cs
namespace MyApp.Api.Infrastructure.Middleware;

/// <summary>
/// Reads X-Correlation-ID from the incoming request (or generates a new one),
/// adds it to the response headers, and pushes it into the ILogger scope so
/// every log entry within this request includes the correlation ID automatically.
/// </summary>
public sealed class CorrelationIdMiddleware
{
    private const string CorrelationIdHeaderName = "X-Correlation-ID";

    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;

    public CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = GetOrCreateCorrelationId(context);

        // Make it available downstream via HttpContext.Items
        context.Items["CorrelationId"] = correlationId;

        // Echo it back in the response
        context.Response.OnStarting(() =>
        {
            context.Response.Headers.TryAdd(CorrelationIdHeaderName, correlationId);
            return Task.CompletedTask;
        });

        // Push into ILogger scope so all log entries in this request carry the ID
        using (_logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId
        }))
        {
            await _next(context);
        }
    }

    private static string GetOrCreateCorrelationId(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue(CorrelationIdHeaderName, out var existingId)
            && !string.IsNullOrWhiteSpace(existingId))
        {
            return existingId.ToString();
        }

        return Guid.NewGuid().ToString("N"); // compact format, no dashes
    }
}
```

```csharp
// MyApp.Api/Infrastructure/Services/ICorrelationIdAccessor.cs
namespace MyApp.Api.Infrastructure.Services;

/// <summary>
/// Allows application/infrastructure services to read the current correlation ID
/// without depending on HttpContext directly.
/// </summary>
public interface ICorrelationIdAccessor
{
    string? CorrelationId { get; }
}
```

```csharp
// MyApp.Api/Infrastructure/Services/HttpContextCorrelationIdAccessor.cs
namespace MyApp.Api.Infrastructure.Services;

internal sealed class HttpContextCorrelationIdAccessor : ICorrelationIdAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpContextCorrelationIdAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? CorrelationId =>
        _httpContextAccessor.HttpContext?.Items["CorrelationId"] as string;
}
```

---

## Middleware Implementation 3: Rate Limiting (.NET 8 built-in)

```csharp
// MyApp.Api/Extensions/RateLimitingExtensions.cs
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace MyApp.Api.Extensions;

public static class RateLimitingExtensions
{
    public static IServiceCollection AddApiRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            // Default rejection response
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, ct) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter =
                        ((int)retryAfter.TotalSeconds).ToString();
                }
                await context.HttpContext.Response.WriteAsJsonAsync(new
                {
                    title = "Too many requests",
                    status = StatusCodes.Status429TooManyRequests,
                    detail = "You have exceeded the allowed request rate. Please try again later."
                }, ct);
            };

            // Anonymous / unauthenticated callers — strict limit
            options.AddFixedWindowLimiter("api", o =>
            {
                o.PermitLimit = 100;
                o.Window = TimeSpan.FromMinutes(1);
                o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                o.QueueLimit = 10;
            });

            // Authenticated callers — more generous sliding window
            options.AddSlidingWindowLimiter("api-authenticated", o =>
            {
                o.PermitLimit = 500;
                o.Window = TimeSpan.FromMinutes(1);
                o.SegmentsPerWindow = 6; // 10-second granularity
                o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                o.QueueLimit = 20;
            });

            // Per-user token bucket — bursts allowed up to BucketSize
            options.AddTokenBucketLimiter("api-user", o =>
            {
                o.TokenLimit = 100;
                o.TokensPerPeriod = 20;
                o.ReplenishmentPeriod = TimeSpan.FromSeconds(10);
                o.AutoReplenishment = true;
                o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                o.QueueLimit = 5;
            });

            // Concurrency limiter for expensive endpoints
            options.AddConcurrencyLimiter("expensive", o =>
            {
                o.PermitLimit = 5;
                o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                o.QueueLimit = 2;
            });
        });

        return services;
    }
}
```

Usage on endpoints:

```csharp
// Apply a named policy per endpoint group or individual route
app.MapGroup("/api/invoices")
   .RequireRateLimiting("api");

// Apply the concurrency limiter on a single expensive route
app.MapPost("/api/reports/generate", GenerateReport)
   .RequireRateLimiting("expensive");

// Authenticated users get higher limits — policy selected at runtime
app.MapGet("/api/invoices", ListInvoices)
   .RequireRateLimiting("api-authenticated");
```

---

## IExceptionHandler Chain (.NET 8+)

Exception handlers are tried in registration order. Each handler returns `true` to claim the exception or `false` to pass it to the next handler.

### ValidationExceptionHandler

```csharp
// MyApp.Api/Infrastructure/ExceptionHandlers/ValidationExceptionHandler.cs
using Microsoft.AspNetCore.Diagnostics;
using MyApp.Application.Exceptions;

namespace MyApp.Api.Infrastructure.ExceptionHandlers;

internal sealed class ValidationExceptionHandler : IExceptionHandler
{
    private readonly ILogger<ValidationExceptionHandler> _logger;

    public ValidationExceptionHandler(ILogger<ValidationExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not ValidationException validationException)
            return false;

        _logger.LogInformation(
            "Validation failed for request to {Path}: {@Errors}",
            httpContext.Request.Path,
            validationException.Errors);

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;

        await httpContext.Response.WriteAsJsonAsync(new
        {
            type = "https://tools.ietf.org/html/rfc7807",
            title = "One or more validation errors occurred.",
            status = StatusCodes.Status400BadRequest,
            errors = validationException.Errors
        }, cancellationToken);

        return true;
    }
}
```

### NotFoundExceptionHandler

```csharp
// MyApp.Api/Infrastructure/ExceptionHandlers/NotFoundExceptionHandler.cs
using Microsoft.AspNetCore.Diagnostics;
using MyApp.Application.Exceptions;

namespace MyApp.Api.Infrastructure.ExceptionHandlers;

internal sealed class NotFoundExceptionHandler : IExceptionHandler
{
    private readonly ILogger<NotFoundExceptionHandler> _logger;

    public NotFoundExceptionHandler(ILogger<NotFoundExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not NotFoundException notFoundException)
            return false;

        _logger.LogInformation(
            "Resource not found: {Message}",
            notFoundException.Message);

        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;

        await httpContext.Response.WriteAsJsonAsync(new
        {
            type = "https://tools.ietf.org/html/rfc7231#section-6.5.4",
            title = "The specified resource was not found.",
            status = StatusCodes.Status404NotFound,
            detail = notFoundException.Message
        }, cancellationToken);

        return true;
    }
}
```

### UnauthorizedExceptionHandler

```csharp
// MyApp.Api/Infrastructure/ExceptionHandlers/UnauthorizedExceptionHandler.cs
using Microsoft.AspNetCore.Diagnostics;
using MyApp.Application.Exceptions;

namespace MyApp.Api.Infrastructure.ExceptionHandlers;

internal sealed class UnauthorizedExceptionHandler : IExceptionHandler
{
    private readonly ILogger<UnauthorizedExceptionHandler> _logger;

    public UnauthorizedExceptionHandler(ILogger<UnauthorizedExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not UnauthorizedAccessException)
            return false;

        _logger.LogWarning(
            "Unauthorized access attempt to {Path} — {Message}",
            httpContext.Request.Path,
            exception.Message);

        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;

        await httpContext.Response.WriteAsJsonAsync(new
        {
            type = "https://tools.ietf.org/html/rfc7235#section-3.1",
            title = "Unauthorized",
            status = StatusCodes.Status401Unauthorized
        }, cancellationToken);

        return true;
    }
}
```

### GlobalExceptionHandler

```csharp
// MyApp.Api/Infrastructure/ExceptionHandlers/GlobalExceptionHandler.cs
using Microsoft.AspNetCore.Diagnostics;

namespace MyApp.Api.Infrastructure.ExceptionHandlers;

/// <summary>
/// Last-resort handler. Always returns true to stop exception propagation.
/// Never expose exception details to callers in production.
/// </summary>
internal sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;
    private readonly IHostEnvironment _environment;

    public GlobalExceptionHandler(
        ILogger<GlobalExceptionHandler> logger,
        IHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception,
            "Unhandled exception for {Method} {Path}",
            httpContext.Request.Method,
            httpContext.Request.Path);

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;

        var response = _environment.IsDevelopment()
            ? new
            {
                type = "https://tools.ietf.org/html/rfc7231#section-6.6.1",
                title = "An unexpected error occurred.",
                status = StatusCodes.Status500InternalServerError,
                detail = exception.Message,
                stackTrace = exception.StackTrace
            }
            : (object)new
            {
                type = "https://tools.ietf.org/html/rfc7231#section-6.6.1",
                title = "An unexpected error occurred.",
                status = StatusCodes.Status500InternalServerError
            };

        await httpContext.Response.WriteAsJsonAsync(response, cancellationToken);

        return true;
    }
}
```

---

## Extension Methods Pattern

Encapsulate related service and middleware registrations in extension methods to keep `Program.cs` clean.

### IServiceCollection extensions

```csharp
// MyApp.Api/Extensions/CorrelationIdExtensions.cs
using MyApp.Api.Infrastructure.Services;

namespace MyApp.Api.Extensions;

public static class CorrelationIdExtensions
{
    public static IServiceCollection AddCorrelationId(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ICorrelationIdAccessor, HttpContextCorrelationIdAccessor>();
        return services;
    }

    public static IApplicationBuilder UseCorrelationId(this IApplicationBuilder app)
    {
        return app.UseMiddleware<CorrelationIdMiddleware>();
    }
}
```

```csharp
// MyApp.Api/Extensions/RequestLoggingExtensions.cs
using MyApp.Api.Infrastructure.Middleware;

namespace MyApp.Api.Extensions;

public static class RequestLoggingExtensions
{
    public static IServiceCollection AddRequestResponseLogging(this IServiceCollection services)
    {
        // No extra DI registrations needed; middleware takes ILogger from DI
        return services;
    }

    public static IApplicationBuilder UseRequestResponseLogging(this IApplicationBuilder app)
    {
        return app.UseMiddleware<RequestResponseLoggingMiddleware>();
    }
}
```

```csharp
// MyApp.Api/Extensions/CorsExtensions.cs
namespace MyApp.Api.Extensions;

public static class CorsExtensions
{
    public static IServiceCollection AddApiCors(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var allowedOrigins = configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? [];

        services.AddCors(options =>
        {
            options.AddPolicy("DefaultPolicy", policy =>
            {
                if (allowedOrigins.Length == 0)
                {
                    // Development: allow all
                    policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
                }
                else
                {
                    policy
                        .WithOrigins(allowedOrigins)
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials();
                }
            });
        });

        return services;
    }
}
```

### Final clean Program.cs

```csharp
// MyApp.Api/Program.cs — clean version using extension methods
using MyApp.Api.Extensions;
using MyApp.Api.Infrastructure.ExceptionHandlers;
using MyApp.Application;
using MyApp.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration)
    .AddExceptionHandler<ValidationExceptionHandler>()
    .AddExceptionHandler<NotFoundExceptionHandler>()
    .AddExceptionHandler<UnauthorizedExceptionHandler>()
    .AddExceptionHandler<GlobalExceptionHandler>()
    .AddProblemDetails()
    .AddCorrelationId()
    .AddRequestResponseLogging()
    .AddApiCors(builder.Configuration)
    .AddApiRateLimiting()
    .AddAuthentication().Services
    .AddAuthorization()
    .AddEndpointsApiExplorer()
    .AddSwaggerGen();

var app = builder.Build();

app.UseExceptionHandler()
   .UseCorrelationId()
   .UseRequestResponseLogging()
   .UseHttpsRedirection()
   .UseRouting()
   .UseCors("DefaultPolicy")
   .UseRateLimiter()
   .UseAuthentication()
   .UseAuthorization()
   .UseAntiforgery();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapInvoiceEndpoints()
   .RequireRateLimiting("api");

app.Run();

public partial class Program { }
```

---

## Middleware Unit Tests

```csharp
// tests/MyApp.Api.Tests/CorrelationIdMiddlewareTests.cs
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using MyApp.Api.Infrastructure.Middleware;

namespace MyApp.Api.Tests;

public sealed class CorrelationIdMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_WhenNoHeader_AddsNewCorrelationIdToResponse()
    {
        var context = new DefaultHttpContext();
        var middleware = new CorrelationIdMiddleware(
            _ => Task.CompletedTask,
            NullLogger<CorrelationIdMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        // Response header is set via OnStarting — simulate response start
        Assert.True(context.Items.ContainsKey("CorrelationId"));
        Assert.NotNull(context.Items["CorrelationId"] as string);
    }

    [Fact]
    public async Task InvokeAsync_WhenHeaderPresent_ReusesExistingId()
    {
        var existingId = "abc123";
        var context = new DefaultHttpContext();
        context.Request.Headers["X-Correlation-ID"] = existingId;

        var middleware = new CorrelationIdMiddleware(
            _ => Task.CompletedTask,
            NullLogger<CorrelationIdMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        Assert.Equal(existingId, context.Items["CorrelationId"] as string);
    }
}
```

```csharp
// tests/MyApp.Api.Tests/GlobalExceptionHandlerTests.cs
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MyApp.Api.Infrastructure.ExceptionHandlers;

namespace MyApp.Api.Tests;

public sealed class GlobalExceptionHandlerTests
{
    [Fact]
    public async Task TryHandleAsync_Always_Returns500AndTrue()
    {
        var envMock = new Mock<IHostEnvironment>();
        envMock.Setup(e => e.EnvironmentName).Returns("Production");

        var handler = new GlobalExceptionHandler(
            NullLogger<GlobalExceptionHandler>.Instance,
            envMock.Object);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var handled = await handler.TryHandleAsync(
            context,
            new Exception("Boom"),
            CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
    }
}
```
