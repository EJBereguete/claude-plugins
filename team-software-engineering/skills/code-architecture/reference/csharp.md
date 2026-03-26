# C# / ASP.NET Core — Clean Architecture Reference

## 1. Project Structure

```
src/
├── Domain/
│   ├── Entities/
│   │   ├── BaseEntity.cs          # Id, DomainEvents
│   │   └── User.cs               # Business rules
│   ├── ValueObjects/
│   │   ├── Email.cs              # Immutable, validated
│   │   └── Money.cs
│   ├── Errors/
│   │   └── DomainErrors.cs       # Error types (for Result pattern)
│   └── Events/
│       └── UserCreatedEvent.cs
├── Application/
│   ├── Abstractions/
│   │   ├── IUserRepository.cs
│   │   └── IEmailService.cs
│   ├── Users/
│   │   ├── Commands/
│   │   │   └── CreateUser/
│   │   │       ├── CreateUserCommand.cs
│   │   │       ├── CreateUserCommandHandler.cs
│   │   │       └── CreateUserCommandValidator.cs
│   │   └── Queries/
│   │       └── GetUser/
│   │           ├── GetUserQuery.cs
│   │           └── GetUserQueryHandler.cs
│   └── Common/
│       └── Behaviors/
│           ├── ValidationBehavior.cs
│           └── LoggingBehavior.cs
├── Infrastructure/
│   ├── Persistence/
│   │   ├── AppDbContext.cs
│   │   ├── Configurations/
│   │   │   └── UserConfiguration.cs
│   │   └── Repositories/
│   │       └── UserRepository.cs
│   └── Services/
│       └── EmailService.cs
└── API/
    ├── Endpoints/
    │   └── UserEndpoints.cs
    └── Program.cs
```

---

## 2. Domain Layer

### BaseEntity

```csharp
// Domain/Entities/BaseEntity.cs
public abstract class BaseEntity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();

    private readonly List<IDomainEvent> _domainEvents = [];
    public IReadOnlyList<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    protected void RaiseDomainEvent(IDomainEvent domainEvent) =>
        _domainEvents.Add(domainEvent);

    public void ClearDomainEvents() => _domainEvents.Clear();
}

// Domain/Events/IDomainEvent.cs
public interface IDomainEvent : INotification { }  // INotification from MediatR
```

### User Entity

```csharp
// Domain/Entities/User.cs
public sealed class User : BaseEntity
{
    public Email Email { get; private set; }
    public string Name { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private User() { } // Required by EF Core

    private User(Email email, string name)
    {
        Email = email;
        Name = name;
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
        RaiseDomainEvent(new UserCreatedEvent(Id, email.Value));
    }

    public static Result<User> Create(string email, string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return Result.Fail<User>(DomainErrors.User.NameRequired);

        var emailResult = Email.Create(email);
        if (emailResult.IsFailed)
            return Result.Fail<User>(emailResult.Errors);

        return Result.Ok(new User(emailResult.Value, name.Trim()));
    }

    public Result Deactivate()
    {
        if (!IsActive)
            return Result.Fail(DomainErrors.User.AlreadyInactive);

        IsActive = false;
        return Result.Ok();
    }
}
```

### Email Value Object

```csharp
// Domain/ValueObjects/Email.cs
public sealed record Email
{
    public string Value { get; }

    private static readonly Regex _emailRegex =
        new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    private Email(string value) => Value = value;

    public static Result<Email> Create(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return Result.Fail<Email>(DomainErrors.User.EmailRequired);

        if (!_emailRegex.IsMatch(email))
            return Result.Fail<Email>(DomainErrors.User.InvalidEmail);

        return Result.Ok(new Email(email.Trim().ToLowerInvariant()));
    }

    public override string ToString() => Value;
}
```

### Money Value Object

```csharp
// Domain/ValueObjects/Money.cs
public sealed record Money(decimal Amount, string Currency)
{
    public static readonly Money Zero = new(0m, "USD");

    public static Result<Money> Create(decimal amount, string currency)
    {
        if (amount < 0)
            return Result.Fail<Money>("Amount cannot be negative");

        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3)
            return Result.Fail<Money>("Currency must be a 3-letter ISO code");

        return Result.Ok(new Money(amount, currency.ToUpperInvariant()));
    }

    public static Money operator +(Money a, Money b)
    {
        if (a.Currency != b.Currency)
            throw new InvalidOperationException("Cannot add different currencies");
        return new Money(a.Amount + b.Amount, a.Currency);
    }

    public override string ToString() => $"{Amount:F2} {Currency}";
}
```

### Domain Errors

```csharp
// Domain/Errors/DomainErrors.cs
public static class DomainErrors
{
    public static class User
    {
        public static readonly Error NameRequired =
            new("User.NameRequired", "User name is required");

        public static readonly Error EmailRequired =
            new("User.EmailRequired", "Email address is required");

        public static readonly Error InvalidEmail =
            new("User.InvalidEmail", "Email address format is invalid");

        public static readonly Error DuplicateEmail =
            new("User.DuplicateEmail", "A user with this email already exists");

        public static readonly Error AlreadyInactive =
            new("User.AlreadyInactive", "User is already inactive");

        public static readonly Error NotFound =
            new("User.NotFound", "User was not found");
    }
}
```

### Domain Event

```csharp
// Domain/Events/UserCreatedEvent.cs
public sealed record UserCreatedEvent(Guid UserId, string Email) : IDomainEvent;
```

---

## 3. Application Layer — CQRS with MediatR

### Command

```csharp
// Application/Users/Commands/CreateUser/CreateUserCommand.cs
public sealed record CreateUserCommand(string Email, string Name)
    : IRequest<Result<UserResponse>>;
```

### Validator (FluentValidation)

```csharp
// Application/Users/Commands/CreateUser/CreateUserCommandValidator.cs
public sealed class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Email format is invalid")
            .MaximumLength(256);

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(100);
    }
}
```

### Command Handler

```csharp
// Application/Users/Commands/CreateUser/CreateUserCommandHandler.cs
internal sealed class CreateUserCommandHandler(
    IUserRepository userRepository,
    IUnitOfWork unitOfWork,
    IPublisher publisher)
    : IRequestHandler<CreateUserCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(
        CreateUserCommand request,
        CancellationToken cancellationToken)
    {
        if (await userRepository.ExistsByEmailAsync(request.Email, cancellationToken))
            return Result.Fail<UserResponse>(DomainErrors.User.DuplicateEmail);

        var userResult = User.Create(request.Email, request.Name);
        if (userResult.IsFailed)
            return Result.Fail<UserResponse>(userResult.Errors);

        var user = userResult.Value;

        await userRepository.AddAsync(user, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Dispatch domain events after persistence
        foreach (var domainEvent in user.DomainEvents)
            await publisher.Publish(domainEvent, cancellationToken);

        user.ClearDomainEvents();

        return Result.Ok(UserResponse.FromEntity(user));
    }
}
```

### Query

```csharp
// Application/Users/Queries/GetUser/GetUserQuery.cs
public sealed record GetUserQuery(Guid UserId) : IRequest<Result<UserResponse>>;

// Application/Users/Queries/GetUser/GetUserQueryHandler.cs
internal sealed class GetUserQueryHandler(IUserRepository userRepository)
    : IRequestHandler<GetUserQuery, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(
        GetUserQuery request,
        CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByIdAsync(request.UserId, cancellationToken);

        return user is null
            ? Result.Fail<UserResponse>(DomainErrors.User.NotFound)
            : Result.Ok(UserResponse.FromEntity(user));
    }
}
```

### Response DTO

```csharp
// Application/Users/UserResponse.cs
public sealed record UserResponse(Guid Id, string Email, string Name, bool IsActive)
{
    public static UserResponse FromEntity(User user) =>
        new(user.Id, user.Email.Value, user.Name, user.IsActive);
}
```

### Pipeline Behaviors

```csharp
// Application/Common/Behaviors/ValidationBehavior.cs
public sealed class ValidationBehavior<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!validators.Any())
            return await next();

        var context = new ValidationContext<TRequest>(request);
        var failures = validators
            .Select(v => v.Validate(context))
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count != 0)
            throw new ValidationException(failures);

        return await next();
    }
}

// Application/Common/Behaviors/LoggingBehavior.cs
public sealed class LoggingBehavior<TRequest, TResponse>(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        logger.LogInformation("Handling {RequestName}", requestName);

        var response = await next();

        logger.LogInformation("Handled {RequestName}", requestName);
        return response;
    }
}
```

### Abstractions (Ports)

```csharp
// Application/Abstractions/IUserRepository.cs
public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task AddAsync(User user, CancellationToken cancellationToken = default);
    Task UpdateAsync(User user, CancellationToken cancellationToken = default);
}

// Application/Abstractions/IUnitOfWork.cs
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

// Application/Abstractions/IEmailService.cs
public interface IEmailService
{
    Task SendWelcomeAsync(string toEmail, string name, CancellationToken cancellationToken = default);
}
```

---

## 4. SOLID in C#

### SRP — Single Responsibility Principle

**❌ Before: one class with multiple responsibilities**
```csharp
public class UserService
{
    public User CreateUser(string email, string name) { /* ... */ }
    public void SendWelcomeEmail(User user) { /* ... */ }  // wrong layer
    public byte[] ExportToCsv(IEnumerable<User> users) { /* ... */ }  // wrong layer
    public UserReport GenerateReport() { /* ... */ }  // wrong layer
}
```

**✅ After: each class has one reason to change**
```csharp
// Orchestrates user creation
public class CreateUserCommandHandler { /* ... */ }

// Sends transactional emails
public class EmailService : IEmailService { /* ... */ }

// Handles data export
public class UserExportService
{
    public byte[] ExportToCsv(IEnumerable<User> users) { /* ... */ }
}
```

---

### OCP — Open/Closed Principle

**❌ Before: adding a new discount type requires modifying the class**
```csharp
public class PriceCalculator
{
    public decimal Calculate(decimal price, string customerType)
    {
        return customerType switch
        {
            "vip" => price * 0.8m,
            "member" => price * 0.9m,
            _ => price  // Adding "staff" means editing this file
        };
    }
}
```

**✅ After: extend via new strategy, existing code stays untouched**
```csharp
public interface IDiscountStrategy
{
    decimal Apply(decimal price);
}

public sealed class VipDiscount : IDiscountStrategy
{
    public decimal Apply(decimal price) => price * 0.8m;
}

public sealed class MemberDiscount : IDiscountStrategy
{
    public decimal Apply(decimal price) => price * 0.9m;
}

public sealed class StaffDiscount : IDiscountStrategy  // New type — zero existing changes
{
    public decimal Apply(decimal price) => price * 0.5m;
}

public class PriceCalculator(IDiscountStrategy strategy)
{
    public decimal Calculate(decimal price) => strategy.Apply(price);
}
```

---

### LSP — Liskov Substitution Principle

**❌ Before: Square breaks Rectangle's behavioral contract**
```csharp
public class Rectangle
{
    public virtual double Width { get; set; }
    public virtual double Height { get; set; }
    public double Area() => Width * Height;
}

public class Square : Rectangle
{
    public override double Width
    {
        set { base.Width = value; base.Height = value; }  // Surprises callers
    }
}

// Caller expectation violated:
// rect.Width = 4; rect.Height = 5; Assert(rect.Area() == 20); // fails for Square
```

**✅ After: model the domain correctly — shapes share an abstraction**
```csharp
public abstract class Shape
{
    public abstract double Area();
}

public sealed class Rectangle(double width, double height) : Shape
{
    public double Width { get; } = width;
    public double Height { get; } = height;
    public override double Area() => Width * Height;
}

public sealed class Square(double side) : Shape
{
    public double Side { get; } = side;
    public override double Area() => Side * Side;
}
```

---

### ISP — Interface Segregation Principle

**❌ Before: fat interface forces unused implementations**
```csharp
public interface INotificationService
{
    Task SendEmailAsync(string to, string subject, string body);
    Task SendSmsAsync(string to, string text);
    Task SendPushAsync(string deviceToken, string title, string body);
    // An email-only service must stub SMS and Push methods
}
```

**✅ After: small, focused interfaces**
```csharp
public interface IEmailNotifier
{
    Task SendEmailAsync(string to, string subject, string body, CancellationToken ct = default);
}

public interface ISmsNotifier
{
    Task SendSmsAsync(string to, string text, CancellationToken ct = default);
}

public interface IPushNotifier
{
    Task SendPushAsync(string deviceToken, string title, string body, CancellationToken ct = default);
}

// Compose only what you need
public class WelcomeEmailHandler(IEmailNotifier emailNotifier) { /* ... */ }
```

---

### DIP — Dependency Inversion Principle

**❌ Before: high-level handler newing a concrete repository**
```csharp
public class CreateUserCommandHandler
{
    private readonly SqlUserRepository _repo = new();  // Hard dependency on concrete class

    public async Task Handle(CreateUserCommand command)
    {
        // Now impossible to test without a database
    }
}
```

**✅ After: inject the abstraction**
```csharp
public class CreateUserCommandHandler(IUserRepository userRepository)
{
    public async Task<Result<UserResponse>> Handle(
        CreateUserCommand command,
        CancellationToken cancellationToken)
    {
        // Swap SqlUserRepository for InMemoryUserRepository in tests — no code change
    }
}
```

---

## 5. DDD Patterns in C#

### Aggregate Root — Order

```csharp
// Domain/Entities/Order.cs
public sealed class Order : BaseEntity
{
    private readonly List<OrderItem> _items = [];
    public IReadOnlyList<OrderItem> Items => _items.AsReadOnly();

    public Guid CustomerId { get; private set; }
    public OrderStatus Status { get; private set; }
    public Money Total => _items.Aggregate(Money.Zero, (sum, item) => sum + item.Total);

    private Order() { }

    public static Order Create(Guid customerId)
    {
        var order = new Order { CustomerId = customerId, Status = OrderStatus.Draft };
        order.RaiseDomainEvent(new OrderCreatedEvent(order.Id, customerId));
        return order;
    }

    public Result AddItem(Product product, int quantity)
    {
        if (Status != OrderStatus.Draft)
            return Result.Fail("Cannot add items to a non-draft order");

        if (quantity <= 0)
            return Result.Fail("Quantity must be positive");

        var existing = _items.FirstOrDefault(i => i.ProductId == product.Id);
        if (existing is not null)
            existing.IncreaseQuantity(quantity);
        else
            _items.Add(OrderItem.Create(product, quantity));

        return Result.Ok();
    }

    public Result Confirm()
    {
        if (Status != OrderStatus.Draft)
            return Result.Fail("Order is not in draft status");

        if (_items.Count == 0)
            return Result.Fail("Order must have at least one item");

        Status = OrderStatus.Confirmed;
        RaiseDomainEvent(new OrderConfirmedEvent(Id, CustomerId, Total));
        return Result.Ok();
    }
}
```

### Domain Events

```csharp
// Domain/Events/OrderCreatedEvent.cs
public sealed record OrderCreatedEvent(Guid OrderId, Guid CustomerId) : IDomainEvent;

// Domain/Events/OrderConfirmedEvent.cs
public sealed record OrderConfirmedEvent(Guid OrderId, Guid CustomerId, Money Total) : IDomainEvent;
```

### Domain Event Handler

```csharp
// Application/Orders/EventHandlers/OrderConfirmedEventHandler.cs
internal sealed class OrderConfirmedEventHandler(
    IEmailService emailService,
    ILogger<OrderConfirmedEventHandler> logger)
    : INotificationHandler<OrderConfirmedEvent>
{
    public async Task Handle(
        OrderConfirmedEvent notification,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Order {OrderId} confirmed for customer {CustomerId}, total {Total}",
            notification.OrderId,
            notification.CustomerId,
            notification.Total);

        await emailService.SendOrderConfirmationAsync(
            notification.CustomerId,
            notification.OrderId,
            notification.Total,
            cancellationToken);
    }
}
```

### Repository Interface (Domain layer — no EF Core reference)

```csharp
// Application/Abstractions/IOrderRepository.cs
public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Order>> GetByCustomerIdAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task AddAsync(Order order, CancellationToken cancellationToken = default);
    Task UpdateAsync(Order order, CancellationToken cancellationToken = default);
}
```

---

## 6. Infrastructure — EF Core Configuration

### AppDbContext

```csharp
// Infrastructure/Persistence/AppDbContext.cs
public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : DbContext(options), IUnitOfWork
{
    public DbSet<User> Users { get; init; }
    public DbSet<Order> Orders { get; init; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply all configurations from the current assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await base.SaveChangesAsync(cancellationToken);
    }
}
```

### User Configuration

```csharp
// Infrastructure/Persistence/Configurations/UserConfiguration.cs
public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        // Map Email value object as an owned type (stored in same table)
        builder.OwnsOne(u => u.Email, email =>
        {
            email.Property(e => e.Value)
                .HasColumnName("email")
                .HasMaxLength(256)
                .IsRequired();

            email.HasIndex(e => e.Value).IsUnique();
        });

        builder.Property(u => u.Name)
            .HasColumnName("name")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(u => u.IsActive)
            .HasColumnName("is_active")
            .HasDefaultValue(true);

        builder.Property(u => u.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        // Domain events are transient — never persisted
        builder.Ignore(u => u.DomainEvents);
    }
}
```

### User Repository (Infrastructure — implements Application port)

```csharp
// Infrastructure/Persistence/Repositories/UserRepository.cs
internal sealed class UserRepository(AppDbContext dbContext) : IUserRepository
{
    public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.Value == email.ToLowerInvariant(), cancellationToken);

    public async Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        await dbContext.Users
            .AnyAsync(u => u.Email.Value == email.ToLowerInvariant(), cancellationToken);

    public async Task AddAsync(User user, CancellationToken cancellationToken = default) =>
        await dbContext.Users.AddAsync(user, cancellationToken);

    public Task UpdateAsync(User user, CancellationToken cancellationToken = default)
    {
        dbContext.Users.Update(user);
        return Task.CompletedTask;
    }
}
```

---

## 7. API Layer — Minimal API Endpoints

```csharp
// API/Endpoints/UserEndpoints.cs
public static class UserEndpoints
{
    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapPost("/", CreateUserAsync)
            .WithName("CreateUser")
            .WithSummary("Create a new user")
            .Produces<UserResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem();

        group.MapGet("/{id:guid}", GetUserAsync)
            .WithName("GetUser")
            .WithSummary("Get a user by ID")
            .Produces<UserResponse>()
            .Produces(StatusCodes.Status404NotFound);

        return app;
    }

    private static async Task<IResult> CreateUserAsync(
        CreateUserCommand command,
        ISender sender,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);

        return result.IsFailed
            ? Results.Problem(result.Errors.First().Message, statusCode: StatusCodes.Status400BadRequest)
            : Results.CreatedAtRoute("GetUser", new { id = result.Value.Id }, result.Value);
    }

    private static async Task<IResult> GetUserAsync(
        Guid id,
        ISender sender,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetUserQuery(id), cancellationToken);

        return result.IsFailed
            ? Results.NotFound()
            : Results.Ok(result.Value);
    }
}
```

### Program.cs — Dependency Registration

```csharp
// API/Program.cs
var builder = WebApplication.CreateBuilder(args);

// Application
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(CreateUserCommand).Assembly);
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
});

builder.Services.AddValidatorsFromAssembly(typeof(CreateUserCommandValidator).Assembly);

// Infrastructure
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<AppDbContext>());
builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.MapUserEndpoints();
app.UseSwagger();
app.UseSwaggerUI();

app.Run();
```
