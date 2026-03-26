# 08 — Testing in C# (xUnit + FluentAssertions + Moq)

Patrones de producción para tests en C# con el stack estándar del equipo.

Paquetes requeridos:
- `xunit`, `xunit.runner.visualstudio`
- `FluentAssertions`
- `Moq` (o `NSubstitute`)
- `Microsoft.AspNetCore.Mvc.Testing` (integration tests)
- `Microsoft.EntityFrameworkCore.InMemory` (integration tests)
- `Bogus` (fake data)

---

## xUnit — Fact vs Theory

### Fact — Test sin parámetros

```csharp
public class InvoiceTests
{
    [Fact]
    public void Create_WithValidData_ShouldSetStatusToDraft()
    {
        // Arrange
        var number = "INV-001";
        var total = Money.Create(1500m, "USD");

        // Act
        var invoice = Invoice.Create(number, total);

        // Assert
        invoice.Status.Should().Be(InvoiceStatus.Draft);
        invoice.Number.Should().Be(number);
        invoice.Total.Should().Be(total);
        invoice.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void MarkAsPaid_WhenAlreadyPaid_ShouldThrowInvalidOperation()
    {
        // Arrange
        var invoice = Invoice.Create("INV-001", Money.Create(1000m, "USD"));
        invoice.MarkAsPaid(); // Primera vez: válido

        // Act
        var act = () => invoice.MarkAsPaid(); // Segunda vez: debe lanzar

        // Assert
        act.Should().Throw<InvalidOperationException>()
           .WithMessage("*already paid*");
    }
}
```

### Theory + InlineData — Parámetros inline

```csharp
public class MoneyTests
{
    [Theory]
    [InlineData(100, "USD", 100)]
    [InlineData(0, "EUR", 0)]
    [InlineData(999_999.99, "USD", 999_999.99)]
    public void Create_WithValidAmount_ShouldStoreCorrectly(
        decimal amount, string currency, decimal expected)
    {
        var money = Money.Create(amount, currency);

        money.Amount.Should().Be(expected);
        money.Currency.Should().Be(currency);
    }

    [Theory]
    [InlineData(-1, "USD")]
    [InlineData(0.001, "EUR")]    // menor a la precisión mínima
    [InlineData(1_000_000, "USD")] // supera el límite
    public void Create_WithInvalidAmount_ShouldThrow(decimal amount, string currency)
    {
        var act = () => Money.Create(amount, currency);

        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData("INVALID")]
    [InlineData("US")]
    public void Create_WithInvalidCurrency_ShouldThrow(string currency)
    {
        var act = () => Money.Create(100m, currency);

        act.Should().Throw<ArgumentException>()
           .WithMessage("*currency*");
    }
}
```

### Theory + MemberData — Datos desde propiedad/método estático

```csharp
public class InvoiceValidationTests
{
    // MemberData apunta a una propiedad/método estático que retorna IEnumerable<object[]>
    public static IEnumerable<object[]> InvalidInvoiceNumbers =>
    [
        [""],                    // vacío
        ["   "],                 // solo espacios
        ["AB"],                  // demasiado corto
        ["A".PadRight(25, 'X')], // demasiado largo
        ["INV 001"],             // espacio no permitido
        ["inv-001"],             // minúsculas no permitidas
    ];

    public static IEnumerable<object[]> ValidInvoiceNumbers =>
    [
        ["INV-001"],
        ["INV-999"],
        ["FAC-0001"],
        ["BILL-2024-001"],
    ];

    [Theory]
    [MemberData(nameof(InvalidInvoiceNumbers))]
    public void ValidateNumber_WithInvalidFormat_ShouldReturnFalse(string number)
    {
        var result = InvoiceNumberValidator.Validate(number);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
    }

    [Theory]
    [MemberData(nameof(ValidInvoiceNumbers))]
    public void ValidateNumber_WithValidFormat_ShouldReturnTrue(string number)
    {
        var result = InvoiceNumberValidator.Validate(number);

        result.IsValid.Should().BeTrue();
    }
}
```

### Theory + ClassData — Clase separada de test data

```csharp
// Útil para datos complejos o cuando la lógica de generación es no trivial
public sealed class InvoiceDiscountTestData : TheoryData<decimal, decimal, decimal>
{
    public InvoiceDiscountTestData()
    {
        // (subtotal, discountPercent, expectedTotal)
        Add(1000m, 0m, 1000m);
        Add(1000m, 10m, 900m);
        Add(1000m, 100m, 0m);
        Add(250m, 20m, 200m);
        Add(333.33m, 15m, 283.33m);
    }
}

public class InvoiceDiscountTests
{
    [Theory]
    [ClassData(typeof(InvoiceDiscountTestData))]
    public void ApplyDiscount_ShouldCalculateCorrectTotal(
        decimal subtotal, decimal discountPercent, decimal expectedTotal)
    {
        var invoice = Invoice.Create("INV-001", Money.Create(subtotal, "USD"));

        invoice.ApplyDiscount(discountPercent);

        invoice.Total.Amount.Should().BeApproximately(expectedTotal, 0.01m);
    }
}
```

---

## FluentAssertions — All Common Assertion Types

```csharp
public class FluentAssertionsExamples
{
    // STRINGS
    [Fact]
    public void StringAssertions()
    {
        var result = "Invoice INV-001 created";

        result.Should().Be("Invoice INV-001 created");
        result.Should().StartWith("Invoice").And.EndWith("created");
        result.Should().Contain("INV-001");
        result.Should().Match("Invoice*created");        // wildcards
        result.Should().MatchRegex(@"INV-\d{3}");
        result.Should().HaveLength(24);
        result.Should().NotBeNullOrWhiteSpace();

        // Comparación case-insensitive
        result.Should().ContainEquivalentOf("invoice");
        result.Should().BeEquivalentTo("INVOICE INV-001 CREATED");
    }

    // NUMBERS
    [Fact]
    public void NumericAssertions()
    {
        decimal total = 1500.55m;

        total.Should().Be(1500.55m);
        total.Should().BeGreaterThan(0m);
        total.Should().BeGreaterThanOrEqualTo(1500m);
        total.Should().BeLessThan(2000m);
        total.Should().BeInRange(1000m, 2000m);
        total.Should().BeApproximately(1500m, 1m); // dentro de 1 de diferencia
        total.Should().BePositive();
    }

    // COLLECTIONS
    [Fact]
    public void CollectionAssertions()
    {
        var invoices = new List<InvoiceItem>
        {
            new() { Id = Guid.NewGuid(), Status = "Draft", Total = 500m },
            new() { Id = Guid.NewGuid(), Status = "Paid", Total = 1000m },
            new() { Id = Guid.NewGuid(), Status = "Draft", Total = 750m },
        };

        invoices.Should().HaveCount(3);
        invoices.Should().NotBeEmpty();
        invoices.Should().Contain(x => x.Status == "Paid");
        invoices.Should().NotContain(x => x.Status == "Cancelled");
        invoices.Should().OnlyContain(x => x.Total > 0m);

        // Orden
        var totals = invoices.Select(i => i.Total).ToList();
        // totals.Should().BeInAscendingOrder(); // fallaría con estos datos
        totals.Should().NotBeInAscendingOrder(); // porque no están ordenados

        invoices.OrderBy(i => i.Total).Should().BeInAscendingOrder(x => x.Total);

        // Subset/superset
        var subset = invoices.Where(i => i.Status == "Draft").ToList();
        subset.Should().BeSubsetOf(invoices);

        // Equivalencia (ignora orden, compara propiedades)
        var expected = new[] { invoices[2], invoices[0] };
        subset.Should().BeEquivalentTo(expected); // pasa — mismos elementos, distinto orden
    }

    // OBJECTS
    [Fact]
    public void ObjectAssertions()
    {
        var actual = new InvoiceResponse
        {
            Id = Guid.NewGuid(),
            Number = "INV-001",
            Total = 1500m,
            Status = "Draft",
            CreatedAt = DateTime.UtcNow
        };

        var expected = new InvoiceResponse
        {
            Id = actual.Id,
            Number = "INV-001",
            Total = 1500m,
            Status = "Draft",
            CreatedAt = DateTime.UtcNow.AddSeconds(-1) // diferente
        };

        // BeEquivalentTo compara todas las propiedades por valor (deep equality)
        actual.Should().BeEquivalentTo(expected, options => options
            .Excluding(x => x.CreatedAt)            // excluir propiedades
            .Excluding(x => x.Id)                   // excluir por nombre
            .Using<decimal>(ctx => ctx.Subject.Should().BeApproximately(ctx.Expectation, 0.01m))
            .WhenTypeIs<decimal>());                 // custom comparación por tipo

        // Type assertions
        actual.Should().BeOfType<InvoiceResponse>();
        actual.Should().BeAssignableTo<IInvoiceDto>();
        actual.Should().NotBeNull();
    }

    // EXCEPTIONS
    [Fact]
    public void ExceptionAssertions()
    {
        var service = new InvoiceService(/* ... */);

        // Sync exceptions
        var syncAct = () => service.Delete(Guid.Empty);
        syncAct.Should().Throw<ArgumentException>()
               .WithMessage("*cannot be empty*")
               .And.ParamName.Should().Be("id");

        // Async exceptions
        var asyncAct = async () => await service.DeleteAsync(Guid.NewGuid());
        asyncAct.Should().ThrowAsync<NotFoundException>()
                .WithMessage("*not found*");

        // No exception thrown
        var validAct = () => service.Validate(new CreateInvoiceRequest { Number = "INV-001" });
        validAct.Should().NotThrow();
    }

    // RESULT PATTERN (FluentResults)
    [Fact]
    public void ResultPatternAssertions()
    {
        var result = InvoiceService.TryCreate("INV-001", Money.Create(1000m, "USD"));

        // Success path
        result.IsSuccess.Should().BeTrue();
        result.IsFailed.Should().BeFalse();
        result.Value.Should().NotBeNull();
        result.Value.Number.Should().Be("INV-001");

        // Failure path
        var failResult = InvoiceService.TryCreate("", Money.Create(0m, "USD"));
        failResult.IsFailed.Should().BeTrue();
        failResult.Errors.Should().NotBeEmpty();
        failResult.Errors.Should().Contain(e => e.Message.Contains("number"));
    }

    // DATES
    [Fact]
    public void DateAssertions()
    {
        var createdAt = DateTime.UtcNow;

        createdAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        createdAt.Should().BeAfter(DateTime.UtcNow.AddMinutes(-1));
        createdAt.Should().BeBefore(DateTime.UtcNow.AddMinutes(1));
        createdAt.Should().HaveYear(DateTime.UtcNow.Year);
        createdAt.Kind.Should().Be(DateTimeKind.Utc);
    }
}
```

---

## Mocking with Moq

```csharp
public class InvoiceServiceTests
{
    private readonly Mock<IInvoiceRepository> _repoMock;
    private readonly Mock<IEventBus> _eventBusMock;
    private readonly Mock<ILogger<InvoiceService>> _loggerMock;
    private readonly InvoiceService _sut; // System Under Test

    public InvoiceServiceTests()
    {
        _repoMock = new Mock<IInvoiceRepository>(MockBehavior.Strict);
        // MockBehavior.Strict: lanza si se llama un método no configurado → detecta llamadas inesperadas
        // MockBehavior.Loose (default): retorna defaults para métodos no configurados

        _eventBusMock = new Mock<IEventBus>();
        _loggerMock = new Mock<ILogger<InvoiceService>>();

        _sut = new InvoiceService(_repoMock.Object, _eventBusMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task CreateAsync_WithValidRequest_ShouldPersistAndPublishEvent()
    {
        // Arrange — configurar qué retorna el mock
        var request = new CreateInvoiceRequest { Number = "INV-001", Total = 1000m };
        Invoice? capturedInvoice = null;

        _repoMock
            .Setup(r => r.ExistsByNumberAsync(request.Number, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false); // El número no existe aún

        _repoMock
            .Setup(r => r.AddAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
            .Callback<Invoice, CancellationToken>((inv, _) => capturedInvoice = inv) // Captura el argumento
            .Returns(Task.CompletedTask);

        _repoMock
            .Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        _eventBusMock
            .Setup(e => e.PublishAsync(It.IsAny<InvoiceCreatedEvent>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.CreateAsync(request, CancellationToken.None);

        // Assert — resultado
        result.Should().NotBeNull();
        result.Number.Should().Be(request.Number);

        // Assert — el objeto que se persistió
        capturedInvoice.Should().NotBeNull();
        capturedInvoice!.Number.Should().Be(request.Number);
        capturedInvoice.Status.Should().Be(InvoiceStatus.Draft);

        // Assert — verificar que se llamaron los métodos esperados (exactamente N veces)
        _repoMock.Verify(r => r.AddAsync(It.IsAny<Invoice>(), default), Times.Once);
        _repoMock.Verify(r => r.SaveChangesAsync(default), Times.Once);
        _eventBusMock.Verify(e => e.PublishAsync(It.IsAny<InvoiceCreatedEvent>(), default), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_WithDuplicateNumber_ShouldThrowAndNotPersist()
    {
        // Arrange
        var request = new CreateInvoiceRequest { Number = "INV-001", Total = 1000m };

        _repoMock
            .Setup(r => r.ExistsByNumberAsync(request.Number, default))
            .ReturnsAsync(true); // El número ya existe

        // Act
        var act = async () => await _sut.CreateAsync(request, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<DuplicateInvoiceNumberException>()
                 .WithMessage("*INV-001*");

        // Verificar que NO se llamó a AddAsync (nunca debería llegar ahí)
        _repoMock.Verify(r => r.AddAsync(It.IsAny<Invoice>(), default), Times.Never);
        _repoMock.Verify(r => r.SaveChangesAsync(default), Times.Never);
        _eventBusMock.Verify(e => e.PublishAsync(It.IsAny<object>(), default), Times.Never);
    }

    [Fact]
    public async Task GetByIdAsync_WithExistingId_ShouldReturnMappedResponse()
    {
        // Arrange
        var id = Guid.NewGuid();
        var invoice = Invoice.Create("INV-001", Money.Create(1500m, "USD"));
        invoice.SetId(id); // helper para tests

        _repoMock
            .Setup(r => r.GetByIdAsync(id, default))
            .ReturnsAsync(invoice);

        // Act
        var result = await _sut.GetByIdAsync(id, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(id);
        result.Number.Should().Be("INV-001");
        result.Total.Should().Be(1500m);
    }

    [Fact]
    public async Task GetByIdAsync_WithUnknownId_ShouldReturnNull()
    {
        // Arrange
        _repoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default))
            .ReturnsAsync((Invoice?)null);

        // Act
        var result = await _sut.GetByIdAsync(Guid.NewGuid(), CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_WhenRepositoryThrows_ShouldPropagateException()
    {
        // Arrange — mock que lanza excepción
        var id = Guid.NewGuid();
        _repoMock
            .Setup(r => r.GetByIdAsync(id, default))
            .ThrowsAsync(new DatabaseException("Connection lost"));

        // Act & Assert
        var act = async () => await _sut.DeleteAsync(id, CancellationToken.None);
        await act.Should().ThrowAsync<DatabaseException>();
    }

    // Setup con diferentes returns según el input (secuencia)
    [Fact]
    public async Task RetryBehavior_ShouldSucceedOnThirdAttempt()
    {
        var id = Guid.NewGuid();

        _repoMock
            .SetupSequence(r => r.GetByIdAsync(id, default))
            .ThrowsAsync(new TimeoutException()) // 1er intento: falla
            .ThrowsAsync(new TimeoutException()) // 2do intento: falla
            .ReturnsAsync(Invoice.Create("INV-001", Money.Create(100m, "USD"))); // 3er: OK

        var result = await _sut.GetWithRetryAsync(id, maxAttempts: 3);

        result.Should().NotBeNull();
        _repoMock.Verify(r => r.GetByIdAsync(id, default), Times.Exactly(3));
    }
}
```

---

## Integration Tests with WebApplicationFactory

```csharp
// Tests/Integration/InvoicesApiTests.cs
public class InvoicesApiTests : IClassFixture<WebApplicationFactory<Program>>, IAsyncLifetime
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public InvoicesApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Reemplazar la BD real con InMemory para tests
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor is not null)
                    services.Remove(descriptor);

                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}"));

                // Reemplazar servicios externos con mocks/fakes
                services.RemoveAll<IEmailService>();
                services.AddSingleton<IEmailService, FakeEmailService>();

                services.RemoveAll<IPaymentGateway>();
                services.AddSingleton<IPaymentGateway, FakePaymentGateway>();
            });

            builder.UseEnvironment("Testing");
        });

        _client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false // Mejor control sobre redirects en tests
        });
    }

    // IAsyncLifetime: setup/teardown async para la clase
    public async Task InitializeAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();
        await SeedTestDataAsync(db);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private static async Task SeedTestDataAsync(AppDbContext db)
    {
        db.Invoices.AddRange(
            Invoice.Create("INV-SEED-001", Money.Create(1000m, "USD")),
            Invoice.Create("INV-SEED-002", Money.Create(2000m, "USD"))
        );
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task POST_invoices_WithValidData_Returns201WithLocation()
    {
        // Arrange
        var payload = new
        {
            number = "INV-TEST-001",
            total = 1500.00m,
            currency = "USD",
            clientId = Guid.NewGuid()
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/invoices", payload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.ToString().Should().Contain("/api/invoices/");

        var body = await response.Content.ReadFromJsonAsync<InvoiceResponse>();
        body.Should().NotBeNull();
        body!.Number.Should().Be("INV-TEST-001");
        body.Status.Should().Be("Draft");
    }

    [Fact]
    public async Task POST_invoices_WithDuplicateNumber_Returns409()
    {
        // Arrange
        var payload = new { number = "INV-SEED-001", total = 500m }; // número ya seedeado

        // Act
        var response = await _client.PostAsJsonAsync("/api/invoices", payload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task POST_invoices_WithInvalidData_Returns422WithErrors()
    {
        var payload = new { number = "", total = -100m }; // inválido

        var response = await _client.PostAsJsonAsync("/api/invoices", payload);

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);

        var problemDetails = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        problemDetails.Should().NotBeNull();
        problemDetails!.Errors.Should().ContainKey("Number");
        problemDetails.Errors.Should().ContainKey("Total");
    }

    [Fact]
    public async Task GET_invoices_id_WithKnownId_Returns200()
    {
        // Obtener un ID seedeado
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var existingId = db.Invoices.First().Id;

        var response = await _client.GetAsync($"/api/invoices/{existingId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<InvoiceResponse>();
        body.Should().NotBeNull();
        body!.Id.Should().Be(existingId);
    }

    [Fact]
    public async Task GET_invoices_id_WithUnknownId_Returns404()
    {
        var response = await _client.GetAsync($"/api/invoices/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GET_invoices_Returns200WithPaginatedList()
    {
        var response = await _client.GetAsync("/api/invoices?page=1&pageSize=10");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<PagedResponse<InvoiceListItem>>();
        body.Should().NotBeNull();
        body!.Items.Should().NotBeEmpty();
        body.TotalCount.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task DELETE_invoices_id_WithKnownId_Returns204()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var invoice = Invoice.Create("INV-TO-DELETE", Money.Create(100m, "USD"));
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        var response = await _client.DeleteAsync($"/api/invoices/{invoice.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verificar que ya no existe
        var getResponse = await _client.GetAsync($"/api/invoices/{invoice.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
```

---

## Test Fixtures — Shared State

```csharp
// Tests/Fixtures/DatabaseFixture.cs
// Se comparte entre tests de la misma Collection — evita recrear la BD en cada test
public sealed class DatabaseFixture : IDisposable
{
    public AppDbContext Context { get; }
    public List<Invoice> SeedInvoices { get; } = new();

    public DatabaseFixture()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"SharedTestDb_{Guid.NewGuid()}")
            .Options;

        Context = new AppDbContext(options);
        Context.Database.EnsureCreated();
        SeedTestData();
    }

    private void SeedTestData()
    {
        var faker = new Faker<Invoice>()
            .CustomInstantiator(f => Invoice.Create(
                $"INV-{f.Random.Number(100, 999)}",
                Money.Create(f.Random.Decimal(100m, 10_000m), "USD")));

        var invoices = faker.Generate(10);
        SeedInvoices.AddRange(invoices);

        // Algunos en estado específico para tests
        invoices[0].MarkAsPaid();
        invoices[1].MarkAsSent();

        Context.Invoices.AddRange(invoices);
        Context.SaveChanges();
    }

    // Crea un scope de datos aislado para un test que modifica datos
    public AppDbContext CreateIsolatedContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"IsolatedTestDb_{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    public void Dispose() => Context.Dispose();
}

// CollectionDefinition: define la colección y asocia el fixture
[CollectionDefinition("Database")]
public class DatabaseCollection : ICollectionFixture<DatabaseFixture> { }
```

```csharp
// Tests/Repositories/InvoiceRepositoryTests.cs
[Collection("Database")] // Usa el fixture compartido
public class InvoiceRepositoryTests
{
    private readonly DatabaseFixture _fixture;
    private readonly InvoiceRepository _sut;

    public InvoiceRepositoryTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
        _sut = new InvoiceRepository(_fixture.Context);
    }

    [Fact]
    public async Task GetByIdAsync_WithExistingId_ReturnsInvoice()
    {
        // Usar datos seedeados — no modifican el DB compartido
        var existing = _fixture.SeedInvoices.First();

        var result = await _sut.GetByIdAsync(existing.Id);

        result.Should().NotBeNull();
        result!.Number.Should().Be(existing.Number);
        result.Total.Should().Be(existing.Total);
    }

    [Fact]
    public async Task GetByIdAsync_WithUnknownId_ReturnsNull()
    {
        var result = await _sut.GetByIdAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnAllSeedInvoices()
    {
        var results = await _sut.GetAllAsync();

        results.Should().HaveCount(_fixture.SeedInvoices.Count);
    }

    [Fact]
    public async Task GetByStatusAsync_WithPaidStatus_ShouldReturnOnlyPaidInvoices()
    {
        var results = await _sut.GetByStatusAsync(InvoiceStatus.Paid);

        results.Should().NotBeEmpty();
        results.Should().OnlyContain(i => i.Status == InvoiceStatus.Paid);
    }

    // Test que modifica datos: usa contexto aislado para no contaminar el fixture
    [Fact]
    public async Task AddAsync_WithValidInvoice_ShouldPersist()
    {
        using var isolatedContext = _fixture.CreateIsolatedContext();
        var repo = new InvoiceRepository(isolatedContext);

        var invoice = Invoice.Create("INV-NEW-001", Money.Create(5000m, "USD"));
        await repo.AddAsync(invoice);
        await isolatedContext.SaveChangesAsync();

        var persisted = await repo.GetByIdAsync(invoice.Id);
        persisted.Should().NotBeNull();
        persisted!.Number.Should().Be("INV-NEW-001");
    }
}
```

---

## Test Naming & Organization

```csharp
// Convención de nomenclatura: MethodName_Scenario_ExpectedBehavior
// Ejemplos:
// CreateAsync_WithValidData_ShouldReturnCreatedInvoice
// CreateAsync_WithDuplicateNumber_ShouldThrowDuplicateException
// GetByIdAsync_WithUnknownId_ShouldReturnNull
// MarkAsPaid_WhenAlreadyPaid_ShouldThrowInvalidOperation

// Estructura de carpetas en el proyecto de tests:
// Tests/
//   Unit/
//     Domain/          ← tests de entidades y value objects
//     Application/     ← tests de servicios y handlers (con mocks)
//     Infrastructure/  ← tests de repositorios (con DB in-memory)
//   Integration/       ← tests de API end-to-end (WebApplicationFactory)
//   Fixtures/          ← fixtures compartidos
//   Helpers/           ← builders, fakers, extensiones de test

// Builder pattern para test data compleja
public sealed class InvoiceBuilder
{
    private string _number = "INV-001";
    private decimal _amount = 1000m;
    private string _currency = "USD";
    private InvoiceStatus _status = InvoiceStatus.Draft;
    private Guid? _id;

    public InvoiceBuilder WithNumber(string number) { _number = number; return this; }
    public InvoiceBuilder WithTotal(decimal amount, string currency = "USD")
    {
        _amount = amount; _currency = currency; return this;
    }
    public InvoiceBuilder WithStatus(InvoiceStatus status) { _status = status; return this; }
    public InvoiceBuilder WithId(Guid id) { _id = id; return this; }

    public Invoice Build()
    {
        var invoice = Invoice.Create(_number, Money.Create(_amount, _currency));
        if (_id.HasValue) invoice.SetId(_id.Value);
        if (_status == InvoiceStatus.Paid) invoice.MarkAsPaid();
        if (_status == InvoiceStatus.Sent) invoice.MarkAsSent();
        return invoice;
    }
}

// Uso en tests:
var paidInvoice = new InvoiceBuilder()
    .WithNumber("INV-PAID-001")
    .WithTotal(2500m, "EUR")
    .WithStatus(InvoiceStatus.Paid)
    .Build();
```
