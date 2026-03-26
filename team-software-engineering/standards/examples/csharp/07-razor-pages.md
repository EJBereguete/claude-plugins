# 07 — Razor Pages Best Practices

Patrones de producción para apps form-heavy con Razor Pages (.NET 8/9).

---

## Razor Pages vs MVC — Decision Guide

```
Usa Razor Pages cuando:
✅ App form-heavy (CRUD, dashboards, paneles admin)
✅ Lógica simple y acotada: un PageModel por página
✅ Apps content-focused (CMS, portales, admin panels)
✅ Equipos pequeños o medianos
✅ No necesitas compartir controladores entre vistas

Usa MVC Controllers cuando:
✅ Múltiples actions que reutilizan la misma lógica
✅ API REST + UI comparten el mismo controlador
✅ Routing muy complejo o custom
✅ Proyecto ya tiene base MVC consolidada
✅ Surface REST pura (prefer Minimal APIs o Controllers)
```

---

## Program.cs — Setup

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages(options =>
{
    // Convenciones de autorización por carpeta
    options.Conventions.AuthorizeFolder("/Admin");
    options.Conventions.AllowAnonymousToPage("/Account/Login");
    options.Conventions.AllowAnonymousToPage("/Account/Register");
})
.AddRazorRuntimeCompilation(); // Solo en Development — recarga vistas sin recompilar

builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IClientService, ClientService>();

// TempData con cookies (default) o Session
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

var app = builder.Build();

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseSession();

app.MapRazorPages();
app.MapControllers(); // Si mezclas Controllers

app.Run();
```

---

## Complete CRUD — InvoicesPage

### PageModel (Index.cshtml.cs)

```csharp
// Pages/Invoices/Index.cshtml.cs
[Authorize] // Requiere autenticación para toda la página
public class IndexModel : PageModel
{
    private readonly IInvoiceService _invoiceService;
    private readonly IClientService _clientService;
    private readonly ILogger<IndexModel> _logger;

    // BindProperty: el framework bindea automáticamente en requests POST
    // SupportsGet=true: también bindea en GET (para filtros en query string)
    [BindProperty(SupportsGet = true)]
    public string? SearchQuery { get; set; }

    [BindProperty(SupportsGet = true)]
    public string StatusFilter { get; set; } = "All";

    [BindProperty(SupportsGet = true)]
    public int PageNumber { get; set; } = 1;

    // BindProperty para el formulario de creación
    [BindProperty]
    public CreateInvoiceInput Input { get; set; } = new();

    // Datos de la vista — NO BindProperty porque son solo lectura en la vista
    public IReadOnlyList<InvoiceListItem> Invoices { get; private set; } = Array.Empty<InvoiceListItem>();
    public IReadOnlyList<ClientSelectItem> Clients { get; private set; } = Array.Empty<ClientSelectItem>();
    public PaginationInfo Pagination { get; private set; } = PaginationInfo.Empty;
    public bool ShowCreateForm { get; private set; }

    public IndexModel(
        IInvoiceService invoiceService,
        IClientService clientService,
        ILogger<IndexModel> logger)
    {
        _invoiceService = invoiceService;
        _clientService = clientService;
        _logger = logger;
    }

    // GET: /invoices?searchQuery=...&statusFilter=...&pageNumber=2
    public async Task<IActionResult> OnGetAsync(CancellationToken ct)
    {
        await LoadPageDataAsync(ct);
        return Page();
    }

    // GET: /invoices?showCreate=true (handler nombrado)
    public async Task<IActionResult> OnGetShowCreateFormAsync(CancellationToken ct)
    {
        ShowCreateForm = true;
        await LoadPageDataAsync(ct);
        return Page();
    }

    // POST: /invoices — crear factura nueva
    public async Task<IActionResult> OnPostAsync(CancellationToken ct)
    {
        // ModelState.IsValid chequea DataAnnotations de CreateInvoiceInput
        if (!ModelState.IsValid)
        {
            ShowCreateForm = true;
            await LoadPageDataAsync(ct);
            return Page(); // Devuelve la página con errores de validación
        }

        try
        {
            var result = await _invoiceService.CreateAsync(new CreateInvoiceRequest
            {
                Number = Input.Number,
                ClientId = Input.ClientId,
                Total = Input.Total,
                DueDate = Input.DueDate
            }, ct);

            // TempData persiste en la siguiente request (redirect)
            TempData["SuccessMessage"] = $"Factura {result.Number} creada exitosamente.";

            // PRG pattern: Post → Redirect → Get (evita re-submit en F5)
            return RedirectToPage();
        }
        catch (DuplicateInvoiceNumberException ex)
        {
            // Error de negocio: agregar al ModelState para mostrarlo en el formulario
            ModelState.AddModelError(nameof(Input.Number), ex.Message);
            ShowCreateForm = true;
            await LoadPageDataAsync(ct);
            return Page();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating invoice");
            ModelState.AddModelError(string.Empty, "Error al crear la factura. Intenta de nuevo.");
            ShowCreateForm = true;
            await LoadPageDataAsync(ct);
            return Page();
        }
    }

    // POST: /invoices?handler=Delete — named handler para eliminar
    // La URL es /invoices y el handler se especifica con asp-page-handler="Delete"
    public async Task<IActionResult> OnPostDeleteAsync(Guid id, CancellationToken ct)
    {
        try
        {
            await _invoiceService.DeleteAsync(id, ct);
            TempData["SuccessMessage"] = "Factura eliminada.";
        }
        catch (NotFoundException)
        {
            TempData["ErrorMessage"] = "La factura no existe o ya fue eliminada.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting invoice {InvoiceId}", id);
            TempData["ErrorMessage"] = "Error al eliminar la factura.";
        }

        return RedirectToPage();
    }

    // POST: /invoices?handler=MarkAsPaid — named handler para marcar como pagada
    public async Task<IActionResult> OnPostMarkAsPaidAsync(Guid id, CancellationToken ct)
    {
        try
        {
            await _invoiceService.MarkAsPaidAsync(id, ct);
            TempData["SuccessMessage"] = "Factura marcada como pagada.";
        }
        catch (InvalidOperationException ex)
        {
            // Ej: la factura ya estaba pagada
            TempData["ErrorMessage"] = ex.Message;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking invoice {InvoiceId} as paid", id);
            TempData["ErrorMessage"] = "Error al procesar el pago.";
        }

        return RedirectToPage();
    }

    // POST: /invoices?handler=Export — exportar a CSV/PDF
    public async Task<IActionResult> OnPostExportAsync(string format, CancellationToken ct)
    {
        var data = await _invoiceService.GetAllForExportAsync(ct);

        return format switch
        {
            "csv" => File(await ExportService.ToCsvAsync(data), "text/csv", "invoices.csv"),
            "pdf" => File(await ExportService.ToPdfAsync(data), "application/pdf", "invoices.pdf"),
            _ => RedirectToPage()
        };
    }

    // Método privado compartido entre handlers
    private async Task LoadPageDataAsync(CancellationToken ct)
    {
        var query = new InvoiceListQuery
        {
            SearchQuery = SearchQuery,
            StatusFilter = StatusFilter == "All" ? null : StatusFilter,
            PageNumber = PageNumber,
            PageSize = 20
        };

        var pagedResult = await _invoiceService.GetPagedAsync(query, ct);
        Invoices = pagedResult.Items;
        Pagination = new PaginationInfo(pagedResult.TotalCount, PageNumber, 20);

        Clients = await _clientService.GetSelectListAsync(ct);
    }
}

// Input model separado del PageModel — facilita validación y binding
public sealed class CreateInvoiceInput
{
    [Required(ErrorMessage = "El número de factura es obligatorio.")]
    [StringLength(20, MinimumLength = 3, ErrorMessage = "Entre 3 y 20 caracteres.")]
    [RegularExpression(@"^INV-\d{3,}$", ErrorMessage = "Formato: INV-001")]
    public string Number { get; set; } = string.Empty;

    [Required(ErrorMessage = "Selecciona un cliente.")]
    public Guid ClientId { get; set; }

    [Required]
    [Range(0.01, 999_999.99, ErrorMessage = "El total debe ser mayor a 0.")]
    public decimal Total { get; set; }

    [Required(ErrorMessage = "La fecha de vencimiento es obligatoria.")]
    [DataType(DataType.Date)]
    public DateOnly DueDate { get; set; }
}
```

### Vista (Index.cshtml)

```cshtml
@* Pages/Invoices/Index.cshtml *@
@page
@model IndexModel
@{
    ViewData["Title"] = "Facturas";
}

@* Mensajes de TempData (de redirects previos) *@
@if (TempData["SuccessMessage"] is string success)
{
    <div class="alert alert-success alert-dismissible" role="alert">
        @success
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
}

@if (TempData["ErrorMessage"] is string error)
{
    <div class="alert alert-danger" role="alert">@error</div>
}

@* Errores globales del ModelState (no vinculados a un campo) *@
<div asp-validation-summary="ModelOnly" class="alert alert-danger"></div>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h1>Facturas</h1>
    <a asp-page-handler="ShowCreateForm" class="btn btn-primary">+ Nueva Factura</a>
</div>

@* Formulario de filtros — GET con BindProperty(SupportsGet=true) *@
<form method="get" class="row g-3 mb-4">
    <div class="col-md-6">
        <input asp-for="SearchQuery"
               class="form-control"
               placeholder="Buscar por número o cliente..." />
    </div>
    <div class="col-md-3">
        <select asp-for="StatusFilter" class="form-select">
            <option value="All">Todos los estados</option>
            <option value="Draft">Borrador</option>
            <option value="Sent">Enviada</option>
            <option value="Paid">Pagada</option>
            <option value="Overdue">Vencida</option>
        </select>
    </div>
    <div class="col-md-3">
        <button type="submit" class="btn btn-outline-secondary w-100">Filtrar</button>
    </div>
</form>

@* Formulario de creación (condicional) *@
@if (Model.ShowCreateForm)
{
    <div class="card mb-4">
        <div class="card-body">
            <h5 class="card-title">Nueva Factura</h5>
            @* method="post" incluye automáticamente el anti-forgery token *@
            <form method="post">
                <div class="row g-3">
                    <div class="col-md-3">
                        <label asp-for="Input.Number" class="form-label"></label>
                        <input asp-for="Input.Number" class="form-control" />
                        @* asp-validation-for muestra el error de ModelState para el campo *@
                        <span asp-validation-for="Input.Number" class="text-danger small"></span>
                    </div>
                    <div class="col-md-4">
                        <label asp-for="Input.ClientId" class="form-label"></label>
                        @* asp-items genera los <option> desde SelectListItem *@
                        <select asp-for="Input.ClientId"
                                asp-items="@(new SelectList(Model.Clients, "Id", "Name"))"
                                class="form-select">
                            <option value="">-- Seleccionar cliente --</option>
                        </select>
                        <span asp-validation-for="Input.ClientId" class="text-danger small"></span>
                    </div>
                    <div class="col-md-2">
                        <label asp-for="Input.Total" class="form-label"></label>
                        <input asp-for="Input.Total" class="form-control" />
                        <span asp-validation-for="Input.Total" class="text-danger small"></span>
                    </div>
                    <div class="col-md-3">
                        <label asp-for="Input.DueDate" class="form-label"></label>
                        <input asp-for="Input.DueDate" class="form-control" type="date" />
                        <span asp-validation-for="Input.DueDate" class="text-danger small"></span>
                    </div>
                </div>
                <div class="mt-3">
                    <button type="submit" class="btn btn-primary">Crear Factura</button>
                    <a asp-page class="btn btn-outline-secondary ms-2">Cancelar</a>
                </div>
            </form>
        </div>
    </div>
}

@* Tabla de facturas *@
<table class="table table-hover">
    <thead>
        <tr>
            <th>Número</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Vencimiento</th>
            <th>Acciones</th>
        </tr>
    </thead>
    <tbody>
        @foreach (var invoice in Model.Invoices)
        {
            <tr>
                <td>
                    @* asp-route-id: agrega el parámetro a la URL generada *@
                    <a asp-page="./Detail" asp-route-id="@invoice.Id">@invoice.Number</a>
                </td>
                <td>@invoice.ClientName</td>
                <td>@invoice.Total.ToString("C")</td>
                <td>
                    <span class="badge bg-@GetStatusColor(invoice.Status)">@invoice.Status</span>
                </td>
                <td>@invoice.DueDate.ToString("dd/MM/yyyy")</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        @* Named handler: POST /invoices?handler=MarkAsPaid *@
                        @if (invoice.Status != "Paid")
                        {
                            <form method="post" class="d-inline">
                                @* asp-page-handler especifica el método OnPost{Handler}Async *@
                                <input type="hidden" name="id" value="@invoice.Id" />
                                <button asp-page-handler="MarkAsPaid"
                                        type="submit"
                                        class="btn btn-outline-success btn-sm">
                                    Marcar pagada
                                </button>
                            </form>
                        }
                        <form method="post"
                              class="d-inline"
                              onsubmit="return confirm('¿Eliminar factura @invoice.Number?')">
                            <input type="hidden" name="id" value="@invoice.Id" />
                            <button asp-page-handler="Delete"
                                    type="submit"
                                    class="btn btn-outline-danger btn-sm">
                                Eliminar
                            </button>
                        </form>
                    </div>
                </td>
            </tr>
        }
    </tbody>
</table>

@* Partial view para paginación — reutilizable entre páginas *@
<partial name="_Pagination" model="Model.Pagination" />

@* Exportar *@
<div class="mt-3">
    <form method="post" class="d-inline">
        <input type="hidden" name="format" value="csv" />
        <button asp-page-handler="Export" type="submit" class="btn btn-outline-secondary btn-sm">
            Exportar CSV
        </button>
    </form>
    <form method="post" class="d-inline ms-2">
        <input type="hidden" name="format" value="pdf" />
        <button asp-page-handler="Export" type="submit" class="btn btn-outline-secondary btn-sm">
            Exportar PDF
        </button>
    </form>
</div>

@* Sección de scripts — se inyecta en el _Layout.cshtml donde esté @await RenderSectionAsync("Scripts") *@
@section Scripts {
    @* Scripts de validación client-side (unobtrusive) *@
    <partial name="_ValidationScriptsPartial" />
}

@functions {
    // Funciones helper locales a la vista
    private static string GetStatusColor(string status) => status switch
    {
        "Paid" => "success",
        "Sent" => "info",
        "Draft" => "secondary",
        "Overdue" => "danger",
        _ => "secondary"
    };
}
```

### Partial View — _Pagination.cshtml

```cshtml
@* Pages/Shared/_Pagination.cshtml *@
@model PaginationInfo

@if (Model.TotalPages > 1)
{
    <nav aria-label="Paginación">
        <ul class="pagination justify-content-center">
            <li class="page-item @(Model.HasPreviousPage ? "" : "disabled")">
                <a class="page-link"
                   asp-page="./Index"
                   asp-route-pageNumber="@(Model.CurrentPage - 1)"
                   asp-route-searchQuery="@Context.Request.Query["searchQuery"]"
                   asp-route-statusFilter="@Context.Request.Query["statusFilter"]">
                    Anterior
                </a>
            </li>

            @for (int i = 1; i <= Model.TotalPages; i++)
            {
                <li class="page-item @(i == Model.CurrentPage ? "active" : "")">
                    <a class="page-link"
                       asp-page="./Index"
                       asp-route-pageNumber="@i"
                       asp-route-searchQuery="@Context.Request.Query["searchQuery"]"
                       asp-route-statusFilter="@Context.Request.Query["statusFilter"]">
                        @i
                    </a>
                </li>
            }

            <li class="page-item @(Model.HasNextPage ? "" : "disabled")">
                <a class="page-link"
                   asp-page="./Index"
                   asp-route-pageNumber="@(Model.CurrentPage + 1)"
                   asp-route-searchQuery="@Context.Request.Query["searchQuery"]"
                   asp-route-statusFilter="@Context.Request.Query["statusFilter"]">
                    Siguiente
                </a>
            </li>
        </ul>
    </nav>
    <p class="text-center text-muted small">
        Página @Model.CurrentPage de @Model.TotalPages (@Model.TotalCount registros)
    </p>
}
```

---

## Anti-forgery en Razor Pages

```cshtml
@* AUTOMÁTICO en Razor Pages con <form method="post">
   El framework inyecta el token invisible via tag helpers.
   NO necesitas @Html.AntiForgeryToken() manualmente.

   El token se valida automáticamente en OnPost*.
   Para deshabilitar (no recomendado): [IgnoreAntiforgeryToken] en el PageModel *@

@* Para AJAX con fetch/axios desde Razor Pages: *@
@inject Microsoft.AspNetCore.Antiforgery.IAntiforgery Antiforgery
@{
    var token = Antiforgery.GetAndStoreTokens(Context);
}

@* Opción 1: meta tag (estilo tradicional) *@
<meta name="csrf-token" content="@token.RequestToken" />

@* Opción 2: header en formulario oculto (más explícito) *@
<input name="@token.FormFieldName" type="hidden" value="@token.RequestToken" />

@section Scripts {
    <script>
        // Configurar fetch para incluir el token en todas las requests AJAX
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

        async function apiPost(url, data) {
            return fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': csrfToken  // Header que Razor Pages valida
                },
                body: JSON.stringify(data)
            });
        }
    </script>
}
```

```csharp
// PageModel para endpoints AJAX — valida el token del header
public class AjaxHandlerModel : PageModel
{
    // Para llamadas AJAX que envían el token en el header:
    // El framework lo valida automáticamente si el header es "RequestVerificationToken"

    public async Task<IActionResult> OnPostUpdateStatusAsync([FromBody] UpdateStatusRequest request)
    {
        // Anti-forgery ya validado por el middleware
        await _service.UpdateStatusAsync(request.Id, request.Status);
        return new JsonResult(new { success = true });
    }
}
```

---

## Detail Page — PageModel con Route Parameter

```csharp
// Pages/Invoices/Detail.cshtml.cs
public class DetailModel : PageModel
{
    private readonly IInvoiceService _invoiceService;

    [BindProperty]
    public EditInvoiceInput Input { get; set; } = new();

    public InvoiceDetail? Invoice { get; private set; }

    public DetailModel(IInvoiceService invoiceService)
        => _invoiceService = invoiceService;

    // GET: /invoices/detail?id={id}
    public async Task<IActionResult> OnGetAsync(Guid id, CancellationToken ct)
    {
        Invoice = await _invoiceService.GetDetailAsync(id, ct);

        if (Invoice is null)
            return NotFound(); // Devuelve 404

        // Pre-llenar el formulario con datos existentes
        Input = new EditInvoiceInput
        {
            Number = Invoice.Number,
            Total = Invoice.Total,
            DueDate = Invoice.DueDate
        };

        return Page();
    }

    // POST: /invoices/detail?id={id} — actualizar
    public async Task<IActionResult> OnPostAsync(Guid id, CancellationToken ct)
    {
        if (!ModelState.IsValid)
        {
            // Recargar datos de solo lectura para la vista
            Invoice = await _invoiceService.GetDetailAsync(id, ct);
            return Page();
        }

        await _invoiceService.UpdateAsync(id, new UpdateInvoiceRequest
        {
            Number = Input.Number,
            Total = Input.Total,
            DueDate = Input.DueDate
        }, ct);

        TempData["SuccessMessage"] = "Factura actualizada correctamente.";
        return RedirectToPage("./Index");
    }
}
```

```cshtml
@* Pages/Invoices/Detail.cshtml *@
@page "{id:guid}"
@model DetailModel
@{
    ViewData["Title"] = $"Factura {Model.Invoice?.Number}";
}

@if (Model.Invoice is null)
{
    <p>Factura no encontrada.</p>
    return;
}

<h1>@Model.Invoice.Number</h1>

<form method="post">
    @* id se pasa automáticamente en la ruta (definida en @page) *@
    <div class="mb-3">
        <label asp-for="Input.Number" class="form-label"></label>
        <input asp-for="Input.Number" class="form-control" />
        <span asp-validation-for="Input.Number" class="text-danger"></span>
    </div>
    <div class="mb-3">
        <label asp-for="Input.Total" class="form-label"></label>
        <input asp-for="Input.Total" class="form-control" />
        <span asp-validation-for="Input.Total" class="text-danger"></span>
    </div>
    <div class="mb-3">
        <label asp-for="Input.DueDate" class="form-label"></label>
        <input asp-for="Input.DueDate" class="form-control" type="date" />
        <span asp-validation-for="Input.DueDate" class="text-danger"></span>
    </div>
    <button type="submit" class="btn btn-primary">Guardar cambios</button>
    <a asp-page="./Index" class="btn btn-outline-secondary ms-2">Cancelar</a>
</form>

@section Scripts {
    <partial name="_ValidationScriptsPartial" />
}
```

---

## Tag Helpers Reference

```cshtml
@* Los tag helpers más usados en Razor Pages *@

@* Generación de URLs *@
<a asp-page="./Index">Volver</a>
<a asp-page="./Detail" asp-route-id="@invoice.Id">Ver detalle</a>
<a asp-page="/Admin/Dashboard">Admin</a>

@* Formularios *@
<form method="post">                          @* Anti-forgery automático *@
<form asp-page-handler="Delete" method="post"> @* Handler nombrado *@
<input asp-for="Input.Name" />               @* name, id, value, type automáticos *@
<label asp-for="Input.Name"></label>         @* for= automático *@
<select asp-for="Input.ClientId" asp-items="..."> @* options desde lista *@
<textarea asp-for="Input.Description"></textarea>

@* Validación *@
<span asp-validation-for="Input.Name" class="text-danger"></span>
<div asp-validation-summary="ModelOnly"></div>   @* Solo errores globales *@
<div asp-validation-summary="All"></div>          @* Todos los errores *@

@* Imágenes con cache busting *@
<img asp-append-version="true" src="~/img/logo.png" />

@* Scripts y estilos con cache busting *@
<script asp-append-version="true" src="~/js/app.js"></script>
<link rel="stylesheet" asp-append-version="true" href="~/css/app.css" />

@* Environment-based rendering *@
<environment include="Development">
    <link rel="stylesheet" href="~/css/app.css" />
</environment>
<environment exclude="Development">
    <link rel="stylesheet" href="~/css/app.min.css" asp-append-version="true" />
</environment>
```
