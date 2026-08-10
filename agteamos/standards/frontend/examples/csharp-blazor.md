# 05 — Blazor Patterns (Server / WASM / Auto)

Patrones de producción para Blazor. Aplica para .NET 8/9 con render modes.

---

## Render Mode Decision

```
┌─────────────────────────────────────────────────┐
│ ¿Necesitas acceso directo a BD/servicios server? │
│    YES → InteractiveServer                       │
│    NO  → ¿App offline/PWA?                      │
│              YES → InteractiveWebAssembly         │
│              NO  → InteractiveAuto (.NET 8+)     │
└─────────────────────────────────────────────────┘
```

| Mode | Ejecución | Latencia | Sin conexión | Uso recomendado |
|------|-----------|----------|--------------|-----------------|
| `InteractiveServer` | Servidor (SignalR) | Baja | No | Acceso a BD, auth, datos sensibles |
| `InteractiveWebAssembly` | Cliente (WASM) | Alta (descarga) | Sí | PWA, app offline |
| `InteractiveAuto` | Server primero, luego WASM | Progresiva | Sí (tras descarga) | Apps generales .NET 8+ |
| `Static SSR` | Server, sin interactividad | Ninguna | No | Páginas de contenido, SEO |

```razor
@* App.razor — aplica render mode a nivel de app *@
<Routes @rendermode="InteractiveAuto" />

@* O por componente individual *@
<InvoiceList @rendermode="InteractiveServer" />

@* O declarado en el componente *@
@rendermode InteractiveServer
```

---

## Component Lifecycle — Complete Example

```razor
@* InvoiceDetail.razor *@
@page "/invoice/{Id:guid}"
@implements IAsyncDisposable
@inject IInvoiceService InvoiceService
@inject NavigationManager NavigationManager
@inject ILogger<InvoiceDetail> Logger

@if (invoice is null && isLoading)
{
    <div class="loading-spinner">Loading...</div>
}
else if (invoice is null)
{
    <p class="alert alert-warning">Invoice not found.</p>
}
else
{
    <h1>Invoice @invoice.Number</h1>
    <p>Total: @invoice.Total.ToString("C")</p>
    <p>Status: @invoice.Status</p>

    <button @onclick="MarkAsPaid"
            disabled="@isProcessing"
            class="btn btn-primary">
        @(isProcessing ? "Processing..." : "Mark as Paid")
    </button>
}

@code {
    // [Parameter] se llena antes de OnInitialized*
    [Parameter] public Guid Id { get; set; }

    private InvoiceResponse? invoice;
    private bool isLoading;
    private bool isProcessing;

    // CancellationTokenSource para cancelar operaciones al destruir el componente
    private readonly CancellationTokenSource cts = new();

    // SetParametersAsync: primer hook, antes de cualquier render.
    // Raramente se override salvo para lógica especial de parámetros.
    // public override async Task SetParametersAsync(ParameterView parameters)
    // {
    //     await base.SetParametersAsync(parameters);
    // }

    // OnInitialized(Async): se ejecuta UNA sola vez al montar el componente.
    // Úsalo para: suscribirse a servicios, cargar datos que no dependen de params.
    protected override void OnInitialized()
    {
        // Aquí no hay parámetros disponibles aún en algunos escenarios de prerender.
        // Para datos que dependen de [Parameter], usa OnParametersSetAsync.
        Logger.LogInformation("InvoiceDetail component initialized");
    }

    // OnParametersSet(Async): se llama en el PRIMER render Y cada vez que un
    // [Parameter] cambia desde el padre. Úsalo para recargar datos cuando cambia Id.
    protected override async Task OnParametersSetAsync()
    {
        isLoading = true;
        invoice = null;

        try
        {
            // Cancela cualquier carga previa si el parámetro cambió rápido
            invoice = await InvoiceService.GetByIdAsync(Id, cts.Token);
        }
        catch (OperationCanceledException)
        {
            // Normal: el componente fue destruido o el parámetro cambió
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to load invoice {InvoiceId}", Id);
        }
        finally
        {
            isLoading = false;
        }
    }

    // OnAfterRender(Async): se llama después de cada render.
    // firstRender=true solo la primera vez. Úsalo para: JS interop, inicializar
    // librerías JS, medir el DOM.
    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            // Ejemplo: inicializar un plugin JS después del primer render
            // await JS.InvokeVoidAsync("initTooltips", cts.Token);
        }
    }

    private async Task MarkAsPaid()
    {
        if (isProcessing) return;

        isProcessing = true;
        // StateHasChanged() es automático cuando termina un event handler,
        // pero se puede llamar manualmente para actualizar UI intermedia.
        StateHasChanged();

        try
        {
            await InvoiceService.MarkAsPaidAsync(Id, cts.Token);
            NavigationManager.NavigateTo("/invoices");
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to mark invoice {InvoiceId} as paid", Id);
        }
        finally
        {
            isProcessing = false;
        }
    }

    // IAsyncDisposable: úsalo cuando tienes recursos async que liberar.
    // Se llama al destruir el componente (navegación, condicional en padre, etc.)
    async ValueTask IAsyncDisposable.DisposeAsync()
    {
        await cts.CancelAsync();
        cts.Dispose();
    }
}
```

### Orden de ejecución del lifecycle

```
1. SetParametersAsync          ← parámetros asignados
2. OnInitialized(Async)        ← primer render solamente
3. OnParametersSet(Async)      ← primer render + cada cambio de [Parameter]
4. [render]
5. OnAfterRender(Async)        ← después de cada render (firstRender=true la primera vez)

Al destruir:
6. IDisposable.Dispose() / IAsyncDisposable.DisposeAsync()
```

---

## Component Communication — 4 Patterns

### 1. Parameters (Parent → Child)

```razor
@* InvoiceCard.razor — componente hijo *@
@code {
    // Parámetros simples
    [Parameter, EditorRequired] public required InvoiceItem Invoice { get; set; }
    [Parameter] public string CssClass { get; set; } = string.Empty;

    // Parámetros complejos: RenderFragment para contenido personalizable
    [Parameter] public RenderFragment? ChildContent { get; set; }
    [Parameter] public RenderFragment<InvoiceItem>? FooterTemplate { get; set; }

    // Captura de atributos adicionales (pass-through a elemento HTML)
    [Parameter(CaptureUnmatchedValues = true)]
    public Dictionary<string, object>? AdditionalAttributes { get; set; }
}
```

```razor
@* InvoiceList.razor — componente padre *@
<InvoiceCard Invoice="@item" CssClass="highlighted" data-testid="invoice-card">
    <ChildContent>
        <span>Custom content</span>
    </ChildContent>
    <FooterTemplate Context="inv">
        <small>Created: @inv.CreatedAt.ToShortDateString()</small>
    </FooterTemplate>
</InvoiceCard>
```

### 2. EventCallback (Child → Parent)

```razor
@* InvoiceCard.razor — hijo emite eventos *@
@code {
    [Parameter, EditorRequired] public required InvoiceItem Invoice { get; set; }

    // EventCallback<T> es preferido sobre Action<T> porque:
    // 1. Llama StateHasChanged() automáticamente en el componente padre
    // 2. Maneja correctamente async/await
    // 3. Es null-safe (no lanza si no está suscrito)
    [Parameter] public EventCallback<InvoiceItem> OnPaid { get; set; }
    [Parameter] public EventCallback<Guid> OnDelete { get; set; }

    // Action<T> — NO recomendado en Blazor:
    // - No llama StateHasChanged() → UI del padre no se actualiza
    // - No maneja async correctamente
    // [Parameter] public Action<InvoiceItem>? OnPaid { get; set; } // ❌

    private async Task HandlePaid()
    {
        await InvoiceService.MarkAsPaidAsync(Invoice.Id);
        await OnPaid.InvokeAsync(Invoice); // Padre se actualiza automáticamente
    }
}
```

```razor
@* InvoiceList.razor — padre escucha eventos *@
<InvoiceCard Invoice="@item"
             OnPaid="HandleInvoicePaid"
             OnDelete="HandleInvoiceDeleted" />

@code {
    private List<InvoiceItem> invoices = new();

    private void HandleInvoicePaid(InvoiceItem paid)
    {
        // StateHasChanged() ya fue llamado por EventCallback
        var idx = invoices.FindIndex(i => i.Id == paid.Id);
        if (idx >= 0) invoices[idx] = paid with { Status = "Paid" };
    }

    private async Task HandleInvoiceDeleted(Guid id)
    {
        invoices.RemoveAll(i => i.Id == id);
        // No necesitas llamar StateHasChanged() — EventCallback lo hace
    }
}
```

### 3. CascadingValue (Any Depth)

Ideal para contexto que muchos componentes necesitan: usuario actual, tema, configuración.

```razor
@* MainLayout.razor — proveedor del cascading value *@
@inherits LayoutComponentBase
@inject ICurrentUserService CurrentUserService

<CascadingValue Value="this" IsFixed="true">
    @* IsFixed=true: el valor no cambia después del primer render.
       Optimización importante: evita re-renders en toda la jerarquía. *@
    <div class="layout">
        <NavMenu />
        <main>@Body</main>
    </div>
</CascadingValue>

@code {
    public AppUser? CurrentUser { get; private set; }
    public string Theme { get; private set; } = "light";

    protected override async Task OnInitializedAsync()
    {
        CurrentUser = await CurrentUserService.GetCurrentAsync();
    }

    public async Task ToggleThemeAsync()
    {
        Theme = Theme == "light" ? "dark" : "light";
        // Cuando IsFixed=false (default), cambiar el valor re-renderiza la jerarquía
    }
}
```

```razor
@* DeepNestedComponent.razor — consume sin prop drilling *@
@code {
    // Obtiene el MainLayout sin importar la profundidad en el árbol
    [CascadingParameter] public MainLayout? Layout { get; set; }

    private bool IsAdmin => Layout?.CurrentUser?.Role == "Admin";
    private string CurrentTheme => Layout?.Theme ?? "light";
}
```

```razor
@* Para múltiples cascading values, usa Name *@
<CascadingValue Value="theme" Name="AppTheme">
    <CascadingValue Value="locale" Name="AppLocale">
        @Body
    </CascadingValue>
</CascadingValue>

@code {
    [CascadingParameter(Name = "AppTheme")] public string? Theme { get; set; }
    [CascadingParameter(Name = "AppLocale")] public string? Locale { get; set; }
}
```

### 4. Service-based State (Siblings / Cross-Tree)

Para componentes no relacionados jerárquicamente (siblings, completamente separados).

```csharp
// AppStateService.cs — registrado como Scoped (Server) o Singleton (WASM)
public sealed class AppStateService
{
    private string _theme = "light";
    private int _unreadNotifications;

    // El evento permite que cualquier componente se suscriba a cambios
    public event Action? OnChange;

    public string Theme
    {
        get => _theme;
        set
        {
            if (_theme == value) return;
            _theme = value;
            NotifyStateChanged();
        }
    }

    public int UnreadNotifications
    {
        get => _unreadNotifications;
        private set
        {
            _unreadNotifications = value;
            NotifyStateChanged();
        }
    }

    public void IncrementNotifications() => UnreadNotifications++;
    public void ClearNotifications() => UnreadNotifications = 0;

    private void NotifyStateChanged() => OnChange?.Invoke();
}
```

```csharp
// Program.cs — registro
builder.Services.AddScoped<AppStateService>(); // Scoped para Blazor Server
// builder.Services.AddSingleton<AppStateService>(); // Singleton para WASM (un usuario por app)
```

```razor
@* Cualquier componente que consuma el estado *@
@implements IDisposable
@inject AppStateService AppState

<div class="theme-@AppState.Theme">
    <span>Notifications: @AppState.UnreadNotifications</span>
    <button @onclick="ToggleTheme">Toggle Theme</button>
</div>

@code {
    protected override void OnInitialized()
    {
        // Suscribirse al evento de cambio
        AppState.OnChange += OnStateChanged;
    }

    private void OnStateChanged()
    {
        // Forzar re-render cuando el estado cambia
        // Necesario porque el cambio viene de fuera del componente
        InvokeAsync(StateHasChanged);
    }

    private void ToggleTheme()
    {
        AppState.Theme = AppState.Theme == "light" ? "dark" : "light";
        // OnStateChanged se dispara → todos los suscriptores se actualizan
    }

    // CRÍTICO: desuscribirse para evitar memory leaks
    // El servicio (Scoped/Singleton) vive más que el componente
    public void Dispose()
    {
        AppState.OnChange -= OnStateChanged;
    }
}
```

---

## State Management Options

### Simple — Scoped Service (para la mayoría de apps)

```csharp
// CartState.cs
public sealed class CartState
{
    private readonly List<CartItem> _items = new();

    public IReadOnlyList<CartItem> Items => _items.AsReadOnly();
    public decimal Total => _items.Sum(i => i.Price * i.Quantity);
    public int ItemCount => _items.Sum(i => i.Quantity);

    public event Action? OnChange;

    public void AddItem(CartItem item)
    {
        var existing = _items.FirstOrDefault(i => i.ProductId == item.ProductId);
        if (existing is not null)
            existing.Quantity++;
        else
            _items.Add(item);

        OnChange?.Invoke();
    }

    public void RemoveItem(Guid productId)
    {
        _items.RemoveAll(i => i.ProductId == productId);
        OnChange?.Invoke();
    }

    public void Clear()
    {
        _items.Clear();
        OnChange?.Invoke();
    }
}
```

### Complex — Fluxor (Redux-like, para apps grandes)

```csharp
// State/InvoiceState.cs
[FeatureState]
public sealed record InvoiceState
{
    public ImmutableList<InvoiceItem> Invoices { get; init; } = ImmutableList<InvoiceItem>.Empty;
    public bool IsLoading { get; init; }
    public string? ErrorMessage { get; init; }
}
```

```csharp
// Actions/InvoiceActions.cs
public sealed record LoadInvoicesAction;
public sealed record LoadInvoicesSuccessAction(ImmutableList<InvoiceItem> Invoices);
public sealed record LoadInvoicesFailureAction(string ErrorMessage);
public sealed record DeleteInvoiceAction(Guid InvoiceId);
```

```csharp
// Reducers/InvoiceReducers.cs
public static class InvoiceReducers
{
    [ReducerMethod]
    public static InvoiceState OnLoadInvoices(InvoiceState state, LoadInvoicesAction _) =>
        state with { IsLoading = true, ErrorMessage = null };

    [ReducerMethod]
    public static InvoiceState OnLoadInvoicesSuccess(
        InvoiceState state, LoadInvoicesSuccessAction action) =>
        state with { IsLoading = false, Invoices = action.Invoices };

    [ReducerMethod]
    public static InvoiceState OnLoadInvoicesFailure(
        InvoiceState state, LoadInvoicesFailureAction action) =>
        state with { IsLoading = false, ErrorMessage = action.ErrorMessage };

    [ReducerMethod]
    public static InvoiceState OnDeleteInvoice(
        InvoiceState state, DeleteInvoiceAction action) =>
        state with
        {
            Invoices = state.Invoices.RemoveAll(i => i.Id == action.InvoiceId)
        };
}
```

```csharp
// Effects/InvoiceEffects.cs
public sealed class InvoiceEffects(IInvoiceService invoiceService)
{
    [EffectMethod]
    public async Task HandleLoadInvoices(LoadInvoicesAction _, IDispatcher dispatcher)
    {
        try
        {
            var invoices = await invoiceService.GetAllAsync();
            dispatcher.Dispatch(new LoadInvoicesSuccessAction(invoices.ToImmutableList()));
        }
        catch (Exception ex)
        {
            dispatcher.Dispatch(new LoadInvoicesFailureAction(ex.Message));
        }
    }
}
```

```razor
@* InvoiceList.razor con Fluxor *@
@page "/invoices"
@inherits Fluxor.Blazor.Web.Components.FluxorComponent
@inject IState<InvoiceState> InvoiceState
@inject IDispatcher Dispatcher

@if (InvoiceState.Value.IsLoading)
{
    <p>Loading...</p>
}
else if (InvoiceState.Value.ErrorMessage is not null)
{
    <p class="alert alert-danger">@InvoiceState.Value.ErrorMessage</p>
}
else
{
    @foreach (var invoice in InvoiceState.Value.Invoices)
    {
        <InvoiceCard @key="invoice.Id" Invoice="invoice" />
    }
}

@code {
    protected override void OnInitialized()
    {
        base.OnInitialized(); // IMPORTANTE: llama al base para suscripción automática
        Dispatcher.Dispatch(new LoadInvoicesAction());
    }
}
```

---

## Error Handling in Blazor

### ErrorBoundary por sección

```razor
@* Layout o página padre *@
<ErrorBoundary>
    <ChildContent>
        <InvoiceList />
    </ChildContent>
    <ErrorContent Context="exception">
        <div class="alert alert-danger">
            <h4>Error loading invoices</h4>
            <p>@exception.Message</p>
            <button class="btn btn-outline-danger" @onclick="ResetError">Try Again</button>
        </div>
    </ErrorContent>
</ErrorBoundary>

@* Para resetear el ErrorBoundary y reintentar *@
<ErrorBoundary @ref="errorBoundary">
    ...
</ErrorBoundary>

@code {
    private ErrorBoundary? errorBoundary;

    private void ResetError() => errorBoundary?.Recover();
}
```

### Manejo de errores en event handlers

```razor
@code {
    private string? errorMessage;

    private async Task HandleSubmit()
    {
        errorMessage = null;
        try
        {
            await InvoiceService.CreateAsync(model);
            NavigationManager.NavigateTo("/invoices");
        }
        catch (ValidationException ex)
        {
            // Error esperado: mostrar al usuario
            errorMessage = ex.Message;
        }
        catch (Exception ex)
        {
            // Error inesperado: loguear y mostrar mensaje genérico
            Logger.LogError(ex, "Unexpected error creating invoice");
            errorMessage = "An unexpected error occurred. Please try again.";
        }
    }
}
```

### Global error handling (Blazor Server)

```csharp
// Program.cs — Blazor Server
builder.Services.AddServerSideBlazor(options =>
{
    options.DetailedErrors = builder.Environment.IsDevelopment();
});
```

```razor
@* App.razor — página de error global *@
<!DOCTYPE html>
<html>
<body>
    <Routes />
    <div id="blazor-error-ui">
        An unhandled error has occurred.
        <a href="" class="reload">Reload</a>
        <a class="dismiss">🗙</a>
    </div>
</body>
</html>
```

---

## Performance

### @key directive — Evita re-renders incorrectos

```razor
@* SIN @key: Blazor reutiliza componentes por posición en la lista.
   Si la lista cambia de orden o se insertan elementos, componentes
   existentes reciben datos del elemento en su misma posición → bugs visuales. *@
@foreach (var invoice in invoices)
{
    <InvoiceCard Invoice="invoice" /> @* ❌ puede renderizar datos incorrectos *@
}

@* CON @key: Blazor trackea cada componente por su identidad.
   Reordenar la lista mueve el DOM correctamente. Solo se re-renderiza
   si los datos del invoice con ese Id cambiaron. *@
@foreach (var invoice in invoices)
{
    <InvoiceCard @key="invoice.Id" Invoice="invoice" /> @* ✅ correcto *@
}
```

### ShouldRender — Evitar re-renders innecesarios

```razor
@code {
    [Parameter] public InvoiceItem Invoice { get; set; } = default!;
    private InvoiceItem? previousInvoice;

    protected override bool ShouldRender()
    {
        // Solo re-renderiza si los datos realmente cambiaron
        if (ReferenceEquals(Invoice, previousInvoice)) return false;
        previousInvoice = Invoice;
        return true;
    }
}
```

### Virtualization para listas largas

```razor
@* Virtualiza listas de cientos/miles de items — solo renderiza los visibles *@
<Virtualize Items="allInvoices" Context="invoice" OverscanCount="5">
    <InvoiceCard @key="invoice.Id" Invoice="invoice" />
</Virtualize>

@* Para datos paginados desde servidor *@
<Virtualize Context="invoice"
            ItemsProvider="LoadInvoicesAsync"
            ItemSize="72">
    <InvoiceCard @key="invoice.Id" Invoice="invoice" />
</Virtualize>

@code {
    private async ValueTask<ItemsProviderResult<InvoiceItem>> LoadInvoicesAsync(
        ItemsProviderRequest request)
    {
        var result = await InvoiceService.GetPagedAsync(
            skip: request.StartIndex,
            take: request.Count,
            cancellationToken: request.CancellationToken);

        return new ItemsProviderResult<InvoiceItem>(result.Items, result.TotalCount);
    }
}
```

### JavaScript Interop — Patrón correcto

```csharp
// IJSObjectReference para módulos JS (tree-shaking friendly)
public sealed class ChartComponent : ComponentBase, IAsyncDisposable
{
    [Inject] private IJSRuntime JS { get; set; } = default!;

    private IJSObjectReference? chartModule;
    private IJSObjectReference? chartInstance;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender) return;

        // Importar módulo JS lazy (solo cuando se necesita)
        chartModule = await JS.InvokeAsync<IJSObjectReference>(
            "import", "./js/chart.js");

        chartInstance = await chartModule.InvokeAsync<IJSObjectReference>(
            "createChart", "#chart-container", chartData);
    }

    public async ValueTask DisposeAsync()
    {
        if (chartInstance is not null)
            await chartInstance.InvokeVoidAsync("destroy");

        if (chartModule is not null)
            await chartModule.DisposeAsync();
    }
}
```
