# C# / xUnit — Testing Reference

## 1. Naming convention: `MethodName_Condition_ExpectedResult`

```csharp
// Method_Condition_Result
public async Task Execute_ValidData_ReturnsCreatedUser()
public async Task Execute_DuplicateEmail_ThrowsConflictException()
public async Task Execute_InvalidEmail_ThrowsValidationException()
public async Task GetById_UserNotFound_ThrowsNotFoundException()
public async Task ProcessPayment_InsufficientFunds_ThrowsPaymentException()
```

---

## 2. Test class structure

```csharp
// tests/Unit/CreateUserUseCaseTests.cs
using Moq;
using FluentAssertions;
using Xunit;

public class CreateUserUseCaseTests
{
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<IPasswordHasher>  _hasherMock;
    private readonly CreateUserUseCase      _sut;   // system under test

    public CreateUserUseCaseTests()
    {
        _userRepoMock = new Mock<IUserRepository>();
        _hasherMock   = new Mock<IPasswordHasher>();
        _sut          = new CreateUserUseCase(_userRepoMock.Object, _hasherMock.Object);

        // Default: no existing user
        _userRepoMock
            .Setup(r => r.FindByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        _hasherMock
            .Setup(h => h.Hash(It.IsAny<string>()))
            .Returns("hashed_secret");
    }
}
```

---

## 3. Full CreateUserUseCase tests

```csharp
// Happy path — [Fact]
[Fact]
public async Task Execute_ValidData_ReturnsCreatedUser()
{
    // Arrange
    var command = new CreateUserCommand("alice@example.com", "Alice", "p@ssw0rd!");

    // Act
    var result = await _sut.Execute(command);

    // Assert
    result.Email.Should().Be("alice@example.com");
    result.Name.Should().Be("Alice");
    _userRepoMock.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
}

// Duplicate email
[Fact]
public async Task Execute_DuplicateEmail_ThrowsConflictException()
{
    // Arrange
    var existing = UserBuilder.New().WithEmail("taken@example.com").Build();
    _userRepoMock
        .Setup(r => r.FindByEmailAsync("taken@example.com", It.IsAny<CancellationToken>()))
        .ReturnsAsync(existing);

    var command = new CreateUserCommand("taken@example.com", "Bob", "p@ssw0rd!");

    // Act & Assert
    await _sut.Invoking(s => s.Execute(command))
              .Should().ThrowAsync<ConflictException>()
              .WithMessage("*already exists*");

    _userRepoMock.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
}

// Invalid inputs — [Theory] + [InlineData]
[Theory]
[InlineData("",               "Name is required")]
[InlineData("not-an-email",   "Email is invalid")]
[InlineData("a@",             "Email is invalid")]
[InlineData("@domain.com",    "Email is invalid")]
public async Task Execute_InvalidInput_ThrowsValidationException(string email, string expectedMessage)
{
    var command = new CreateUserCommand(email, "Test User", "p@ssw0rd!");

    var act = async () => await _sut.Execute(command);

    await act.Should().ThrowAsync<ValidationException>()
             .WithMessage($"*{expectedMessage}*");
}
```

---

## 4. FluentAssertions examples

```csharp
// Scalar assertions
result.Id.Should().NotBeEmpty();
result.Email.Should().Be("alice@example.com");
result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
result.IsActive.Should().BeTrue();

// Exception assertions
await act.Should().ThrowAsync<NotFoundException>()
         .WithMessage("User * not found");

await act.Should().NotThrowAsync();

// Collection assertions
users.Should().HaveCount(3);
users.Should().ContainSingle(u => u.Email == "alice@example.com");
users.Should().AllSatisfy(u => u.IsActive.Should().BeTrue());
users.Should().BeInAscendingOrder(u => u.CreatedAt);

// Object graph
result.Should().BeEquivalentTo(expected, opts =>
    opts.Excluding(u => u.Id).Excluding(u => u.CreatedAt));
```

---

## 5. Builder pattern for test data

```csharp
// tests/Builders/UserBuilder.cs
public class UserBuilder
{
    private string  _email    = "default@example.com";
    private string  _name     = "Default User";
    private bool    _isActive = true;
    private Guid    _id       = Guid.NewGuid();

    public static UserBuilder New() => new UserBuilder();

    public UserBuilder WithEmail(string email)      { _email    = email;    return this; }
    public UserBuilder WithName(string name)        { _name     = name;     return this; }
    public UserBuilder AsInactive()                 { _isActive = false;    return this; }
    public UserBuilder WithId(Guid id)              { _id       = id;       return this; }

    public User Build() => new User
    {
        Id        = _id,
        Email     = _email,
        Name      = _name,
        IsActive  = _isActive,
        CreatedAt = DateTime.UtcNow,
    };
}

// Usage:
var user = UserBuilder.New()
    .WithEmail("alice@example.com")
    .WithName("Alice")
    .Build();
```

---

## 6. WebApplicationFactory — integration test

```csharp
// tests/Integration/UserApiIntegrationTests.cs
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public class UserApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public UserApiIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Swap real DB for in-memory
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);

                services.AddDbContext<AppDbContext>(opts =>
                    opts.UseInMemoryDatabase("TestDb_" + Guid.NewGuid()));
            });
        }).CreateClient();
    }

    [Fact]
    public async Task PostUser_ValidPayload_Returns201()
    {
        var payload = new { email = "integration@example.com", name = "Int User", password = "p@ssw0rd!" };
        var response = await _client.PostAsJsonAsync("/users", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<UserResponse>();
        body!.Email.Should().Be("integration@example.com");
    }

    [Fact]
    public async Task PostUser_DuplicateEmail_Returns409()
    {
        var payload = new { email = "dup@example.com", name = "Dup", password = "p@ssw0rd!" };
        await _client.PostAsJsonAsync("/users", payload);   // first — succeeds
        var response = await _client.PostAsJsonAsync("/users", payload);  // second — conflict

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }
}
```

---

## 7. Bogus data generation

```csharp
// NuGet: Bogus
using Bogus;

var faker = new Faker<User>()
    .RuleFor(u => u.Id,        f => Guid.NewGuid())
    .RuleFor(u => u.Email,     f => f.Internet.Email())
    .RuleFor(u => u.Name,      f => f.Name.FullName())
    .RuleFor(u => u.Phone,     f => f.Phone.PhoneNumber())
    .RuleFor(u => u.CreatedAt, f => f.Date.Past(2))
    .RuleFor(u => u.IsActive,  f => f.Random.Bool(0.9f));   // 90 % active

// Single object
var user = faker.Generate();

// List of 50
var users = faker.Generate(50);

// Seeded — deterministic output for snapshots
Randomizer.Seed = new Random(42);
var deterministicUser = faker.Generate();
```
