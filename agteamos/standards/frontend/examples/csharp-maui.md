# 06 — .NET MAUI with MVVM + CommunityToolkit

Patrones de producción para apps móviles/desktop con .NET MAUI, MVVM y CommunityToolkit.Mvvm.

Requiere: `CommunityToolkit.Mvvm`, `Microsoft.Maui.Controls`

---

## MauiProgram.cs — DI Setup Completo

```csharp
// MauiProgram.cs
public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();

        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("Inter-Regular.ttf", "InterRegular");
                fonts.AddFont("Inter-SemiBold.ttf", "InterSemiBold");
            });

        // Configuración
        builder.Services.Configure<ApiSettings>(options =>
        {
            options.BaseUrl = DeviceInfo.Platform == DevicePlatform.Android
                ? "http://10.0.2.2:5000"   // Android emulator → localhost del host
                : "http://localhost:5000";  // iOS simulator / Desktop
        });

        // HTTP Clients con BaseAddress
        builder.Services
            .AddHttpClient<IInvoiceApiService, InvoiceApiService>((sp, client) =>
            {
                var settings = sp.GetRequiredService<IOptions<ApiSettings>>().Value;
                client.BaseAddress = new Uri(settings.BaseUrl);
                client.DefaultRequestHeaders.Add("Accept", "application/json");
                client.Timeout = TimeSpan.FromSeconds(30);
            });

        // Servicios de infraestructura (Singleton — una instancia por app)
        builder.Services
            .AddSingleton<IConnectivity>(Connectivity.Current)
            .AddSingleton<IGeolocation>(Geolocation.Default)
            .AddSingleton<IPreferences>(Preferences.Default)
            .AddSingleton<ISecureStorage>(SecureStorage.Default)
            .AddSingleton<AppShell>();

        // ViewModels (Transient — nueva instancia por cada navegación)
        builder.Services
            .AddTransient<InvoiceListViewModel>()
            .AddTransient<InvoiceDetailViewModel>()
            .AddTransient<InvoiceCreateViewModel>()
            .AddTransient<SettingsViewModel>();

        // Pages (Transient — acompañan al ViewModel)
        builder.Services
            .AddTransient<InvoiceListPage>()
            .AddTransient<InvoiceDetailPage>()
            .AddTransient<InvoiceCreatePage>()
            .AddTransient<SettingsPage>();

#if DEBUG
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }
}
```

```csharp
// App.xaml.cs
public partial class App : Application
{
    public App(AppShell shell)
    {
        InitializeComponent();
        MainPage = shell; // Shell es el root de navegación
    }
}
```

---

## Complete ViewModel with CommunityToolkit.Mvvm

```csharp
// ViewModels/InvoiceListViewModel.cs
public partial class InvoiceListViewModel : ObservableObject
{
    private readonly IInvoiceApiService _apiService;
    private readonly IConnectivity _connectivity;
    private readonly ILogger<InvoiceListViewModel> _logger;

    // [ObservableProperty] genera:
    // - private backing field (invoices → _invoices)
    // - public property con getter/setter
    // - OnPropertyChanged("Invoices") automáticamente
    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(HasInvoices))]  // Notifica también HasInvoices al cambiar Invoices
    [NotifyPropertyChangedFor(nameof(EmptyStateVisible))]
    private ObservableCollection<InvoiceItem> invoices = new();

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(EmptyStateVisible))]
    private bool isLoading;

    [ObservableProperty]
    private bool isRefreshing;

    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(DeleteInvoiceCommand))] // Recalcula CanExecute al cambiar
    private InvoiceItem? selectedInvoice;

    [ObservableProperty]
    private string searchText = string.Empty;

    [ObservableProperty]
    private string statusFilter = "All";

    // Propiedad derivada — calculada, no notificada directamente
    // La notificación viene de [NotifyPropertyChangedFor] en Invoices e IsLoading
    public bool HasInvoices => Invoices.Any();
    public bool EmptyStateVisible => !IsLoading && !HasInvoices;

    // Propiedad manual con lógica custom en el setter
    private string _sortOrder = "Date";
    public string SortOrder
    {
        get => _sortOrder;
        set
        {
            if (SetProperty(ref _sortOrder, value)) // SetProperty: asigna + notifica + retorna true si cambió
            {
                ApplySortAndFilter();
            }
        }
    }

    public InvoiceListViewModel(
        IInvoiceApiService apiService,
        IConnectivity connectivity,
        ILogger<InvoiceListViewModel> logger)
    {
        _apiService = apiService;
        _connectivity = connectivity;
        _logger = logger;
    }

    // [RelayCommand] genera un IAsyncRelayCommand / IRelayCommand
    // - Admite CancellationToken automáticamente en métodos async
    // - Desactiva el command mientras está ejecutándose (previene doble tap)
    // - Expone .IsRunning para binding en UI
    [RelayCommand]
    private async Task LoadInvoicesAsync(CancellationToken ct)
    {
        if (!_connectivity.NetworkAccess.HasFlag(NetworkAccess.Internet))
        {
            await Shell.Current.DisplayAlert("Sin conexión",
                "Verifica tu conexión a internet.", "OK");
            return;
        }

        try
        {
            IsLoading = true;
            var items = await _apiService.GetInvoicesAsync(ct);

            // UI updates SIEMPRE en main thread cuando vienen de background
            MainThread.BeginInvokeOnMainThread(() =>
            {
                Invoices = new ObservableCollection<InvoiceItem>(items);
            });
        }
        catch (OperationCanceledException)
        {
            _logger.LogDebug("LoadInvoices cancelled");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Network error loading invoices");
            await Shell.Current.DisplayAlert("Error de red",
                "No se pudieron cargar las facturas.", "OK");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error loading invoices");
            await Shell.Current.DisplayAlert("Error",
                "Ocurrió un error inesperado.", "OK");
        }
        finally
        {
            IsLoading = false;
            IsRefreshing = false; // Para RefreshView: resetea el spinner
        }
    }

    // Command con CanExecute — el botón se desactiva automáticamente cuando retorna false
    [RelayCommand(CanExecute = nameof(CanDeleteInvoice))]
    private async Task DeleteInvoiceAsync(InvoiceItem invoice, CancellationToken ct)
    {
        bool confirmed = await Shell.Current.DisplayAlert(
            "Confirmar eliminación",
            $"¿Eliminar factura {invoice.Number}?",
            "Eliminar", "Cancelar");

        if (!confirmed) return;

        try
        {
            await _apiService.DeleteAsync(invoice.Id, ct);
            MainThread.BeginInvokeOnMainThread(() => Invoices.Remove(invoice));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting invoice {InvoiceId}", invoice.Id);
            await Shell.Current.DisplayAlert("Error", ex.Message, "OK");
        }
    }

    private bool CanDeleteInvoice(InvoiceItem? invoice) =>
        invoice is not null && invoice.Status != "Paid";

    [RelayCommand(CanExecute = nameof(CanNavigateToDetail))]
    private async Task NavigateToDetailAsync(InvoiceItem invoice)
        => await Shell.Current.GoToAsync(
            $"{nameof(InvoiceDetailPage)}?id={invoice.Id}");

    private bool CanNavigateToDetail(InvoiceItem? invoice) => invoice is not null;

    [RelayCommand]
    private async Task NavigateToCreateAsync()
        => await Shell.Current.GoToAsync(nameof(InvoiceCreatePage));

    // Partial methods generadas por [ObservableProperty] — override para reaccionar a cambios
    // Nomenclatura: On{PropertyName}Changed(oldValue, newValue) o On{PropertyName}Changed(value)
    partial void OnSearchTextChanged(string value)
    {
        // Debounce manual o usar Task.Delay
        ApplySortAndFilter();
    }

    partial void OnStatusFilterChanged(string value)
    {
        ApplySortAndFilter();
    }

    private void ApplySortAndFilter()
    {
        // Aplicar filtro y orden a la colección
        // En apps reales: usar CollectionView con filtrado server-side
        var filtered = _apiService.GetCachedInvoices()
            .Where(i => string.IsNullOrEmpty(SearchText)
                       || i.Number.Contains(SearchText, StringComparison.OrdinalIgnoreCase))
            .Where(i => StatusFilter == "All" || i.Status == StatusFilter);

        var sorted = SortOrder == "Date"
            ? filtered.OrderByDescending(i => i.CreatedAt)
            : filtered.OrderBy(i => i.Number);

        MainThread.BeginInvokeOnMainThread(() =>
            Invoices = new ObservableCollection<InvoiceItem>(sorted));
    }
}
```

---

## Shell Navigation

```csharp
// AppShell.xaml.cs
public partial class AppShell : Shell
{
    public AppShell()
    {
        InitializeComponent();

        // Registrar rutas que NO están en el XAML del Shell
        // (páginas de detalle, formularios, etc.)
        Routing.RegisterRoute(nameof(InvoiceDetailPage), typeof(InvoiceDetailPage));
        Routing.RegisterRoute(nameof(InvoiceCreatePage), typeof(InvoiceCreatePage));
    }
}
```

```xml
<!-- AppShell.xaml -->
<Shell xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
       xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
       xmlns:pages="clr-namespace:MyApp.Pages"
       x:Class="MyApp.AppShell">

    <TabBar>
        <Tab Title="Facturas" Icon="invoice.png">
            <ShellContent Title="Facturas"
                          ContentTemplate="{DataTemplate pages:InvoiceListPage}" />
        </Tab>
        <Tab Title="Ajustes" Icon="settings.png">
            <ShellContent Title="Ajustes"
                          ContentTemplate="{DataTemplate pages:SettingsPage}" />
        </Tab>
    </TabBar>
</Shell>
```

```csharp
// Navegación desde ViewModel
// Navegar hacia adelante
await Shell.Current.GoToAsync($"{nameof(InvoiceDetailPage)}?id={invoice.Id}");

// Navegar con objeto complejo (evita serialización)
var navigationParam = new Dictionary<string, object>
{
    [nameof(InvoiceDetailViewModel.Invoice)] = invoice
};
await Shell.Current.GoToAsync(nameof(InvoiceDetailPage), navigationParam);

// Navegar hacia atrás
await Shell.Current.GoToAsync("..");

// Navegar hacia atrás con resultado
await Shell.Current.GoToAsync("..", new Dictionary<string, object>
{
    ["CreatedInvoiceId"] = newId
});
```

```csharp
// ViewModels/InvoiceDetailViewModel.cs
// [QueryProperty] recibe parámetros de la URL o del diccionario de navegación
[QueryProperty(nameof(InvoiceId), "id")]
public partial class InvoiceDetailViewModel : ObservableObject
{
    private readonly IInvoiceApiService _apiService;

    [ObservableProperty]
    private string? invoiceId;

    [ObservableProperty]
    private InvoiceDetail? invoice;

    [ObservableProperty]
    private bool isLoading;

    // Cuando InvoiceId cambia (viene de la navegación), carga los datos
    partial void OnInvoiceIdChanged(string? value)
    {
        if (!string.IsNullOrEmpty(value))
            LoadInvoiceCommand.Execute(value);
    }

    [RelayCommand]
    private async Task LoadInvoiceAsync(string id, CancellationToken ct)
    {
        IsLoading = true;
        try
        {
            Invoice = await _apiService.GetDetailAsync(Guid.Parse(id), ct);
        }
        finally
        {
            IsLoading = false;
        }
    }

    public InvoiceDetailViewModel(IInvoiceApiService apiService)
        => _apiService = apiService;
}
```

---

## XAML — Full InvoiceListPage

```xml
<?xml version="1.0" encoding="utf-8" ?>
<ContentPage xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             xmlns:vm="clr-namespace:MyApp.ViewModels"
             xmlns:model="clr-namespace:MyApp.Models"
             x:Class="MyApp.Pages.InvoiceListPage"
             x:DataType="vm:InvoiceListViewModel"
             Title="Facturas">

    <ContentPage.ToolbarItems>
        <ToolbarItem Text="Nueva"
                     IconImageSource="add.png"
                     Command="{Binding NavigateToCreateCommand}" />
    </ContentPage.ToolbarItems>

    <Grid RowDefinitions="Auto,Auto,*">

        <!-- SearchBar vinculada al ViewModel -->
        <SearchBar Grid.Row="0"
                   Placeholder="Buscar factura..."
                   Text="{Binding SearchText}"
                   SearchCommand="{Binding LoadInvoicesCommand}" />

        <!-- ActivityIndicator vinculada a IsLoading -->
        <ActivityIndicator Grid.Row="1"
                           IsRunning="{Binding IsLoading}"
                           IsVisible="{Binding IsLoading}"
                           HorizontalOptions="Center" />

        <!-- RefreshView para pull-to-refresh -->
        <RefreshView Grid.Row="2"
                     IsRefreshing="{Binding IsRefreshing}"
                     Command="{Binding LoadInvoicesCommand}">

            <CollectionView ItemsSource="{Binding Invoices}"
                            SelectionMode="Single"
                            SelectedItem="{Binding SelectedInvoice}"
                            SelectionChangedCommand="{Binding NavigateToDetailCommand}"
                            SelectionChangedCommandParameter="{Binding SelectedItem, Source={RelativeSource Self}}">

                <!-- Estado vacío -->
                <CollectionView.EmptyView>
                    <VerticalStackLayout HorizontalOptions="Center"
                                         VerticalOptions="Center"
                                         Spacing="16"
                                         IsVisible="{Binding EmptyStateVisible}">
                        <Image Source="empty_invoices.png" HeightRequest="120" />
                        <Label Text="No hay facturas"
                               FontSize="18"
                               HorizontalOptions="Center" />
                        <Button Text="Crear primera factura"
                                Command="{Binding NavigateToCreateCommand}" />
                    </VerticalStackLayout>
                </CollectionView.EmptyView>

                <CollectionView.ItemTemplate>
                    <DataTemplate x:DataType="model:InvoiceItem">

                        <!-- SwipeView para acciones al deslizar -->
                        <SwipeView>
                            <SwipeView.RightItems>
                                <SwipeItems>
                                    <SwipeItem Text="Eliminar"
                                               BackgroundColor="Red"
                                               IconImageSource="trash.png"
                                               Command="{Binding Source={RelativeSource AncestorType={x:Type vm:InvoiceListViewModel}}, Path=DeleteInvoiceCommand}"
                                               CommandParameter="{Binding .}" />
                                </SwipeItems>
                            </SwipeView.RightItems>

                            <!-- Item content -->
                            <Border Margin="16,4"
                                    Padding="16"
                                    StrokeShape="RoundRectangle 8">
                                <Grid ColumnDefinitions="*,Auto">
                                    <VerticalStackLayout Grid.Column="0">
                                        <Label Text="{Binding Number}"
                                               FontAttributes="Bold"
                                               FontSize="16" />
                                        <Label Text="{Binding ClientName}"
                                               TextColor="Gray"
                                               FontSize="13" />
                                        <Label Text="{Binding CreatedAt, StringFormat='{0:dd/MM/yyyy}'}"
                                               TextColor="Gray"
                                               FontSize="12" />
                                    </VerticalStackLayout>
                                    <VerticalStackLayout Grid.Column="1"
                                                          HorizontalOptions="End">
                                        <Label Text="{Binding Total, StringFormat='{0:C}'}"
                                               FontAttributes="Bold"
                                               FontSize="16" />
                                        <Label Text="{Binding Status}"
                                               HorizontalOptions="End"
                                               FontSize="12" />
                                    </VerticalStackLayout>
                                </Grid>
                            </Border>
                        </SwipeView>
                    </DataTemplate>
                </CollectionView.ItemTemplate>
            </CollectionView>
        </RefreshView>
    </Grid>
</ContentPage>
```

```csharp
// Pages/InvoiceListPage.xaml.cs
// La page recibe el ViewModel vía DI — no new() manual
public partial class InvoiceListPage : ContentPage
{
    private readonly InvoiceListViewModel _viewModel;

    public InvoiceListPage(InvoiceListViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = _viewModel = viewModel;
    }

    // Cargar datos al aparecer la página (no en constructor)
    protected override void OnAppearing()
    {
        base.OnAppearing();
        _viewModel.LoadInvoicesCommand.Execute(null);
    }
}
```

---

## Platform-specific Code

### Opción 1: Directivas de compilación (código simple)

```csharp
public static string GetDeviceInfo()
{
    var info = $"Device: {DeviceInfo.Model}, OS: {DeviceInfo.Platform}";

#if ANDROID
    // Código exclusivo Android — se compila solo en el build de Android
    info += $", API Level: {Android.OS.Build.VERSION.SdkInt}";
#elif IOS
    info += $", iOS: {UIKit.UIDevice.CurrentDevice.SystemVersion}";
#elif WINDOWS
    info += $", WinVer: {Environment.OSVersion.Version}";
#elif MACCATALYST
    info += ", Platform: Mac Catalyst";
#endif

    return info;
}
```

### Opción 2: Partial classes (recomendada para código extenso)

```csharp
// Services/IPhotoPickerService.cs — interfaz compartida (shared project)
public interface IPhotoPickerService
{
    Task<Stream?> PickPhotoAsync();
}
```

```csharp
// Platforms/Android/PhotoPickerService.cs
public partial class PhotoPickerService : IPhotoPickerService
{
    public async Task<Stream?> PickPhotoAsync()
    {
        var result = await MediaPicker.Default.PickPhotoAsync(new MediaPickerOptions
        {
            Title = "Seleccionar foto"
        });
        return result is not null ? await result.OpenReadAsync() : null;
    }
}
```

```csharp
// Platforms/iOS/PhotoPickerService.cs
public partial class PhotoPickerService : IPhotoPickerService
{
    public async Task<Stream?> PickPhotoAsync()
    {
        // iOS requiere permisos explícitos en Info.plist
        var status = await Permissions.RequestAsync<Permissions.Photos>();
        if (status != PermissionStatus.Granted) return null;

        var result = await MediaPicker.Default.PickPhotoAsync();
        return result is not null ? await result.OpenReadAsync() : null;
    }
}
```

```csharp
// Platforms/Windows/PhotoPickerService.cs
public partial class PhotoPickerService : IPhotoPickerService
{
    public async Task<Stream?> PickPhotoAsync()
    {
        var picker = new Windows.Storage.Pickers.FileOpenPicker();
        picker.FileTypeFilter.Add(".jpg");
        picker.FileTypeFilter.Add(".png");

        var hwnd = ((MauiWinUIWindow)App.Current!.Windows[0].Handler.PlatformView!).WindowHandle;
        WinRT.Interop.InitializeWithWindow.Initialize(picker, hwnd);

        var file = await picker.PickSingleFileAsync();
        return file is not null ? await file.OpenStreamForReadAsync() : null;
    }
}
```

```csharp
// MauiProgram.cs — registro de la implementación platform-specific
builder.Services.AddSingleton<IPhotoPickerService, PhotoPickerService>();
```

### Opción 3: DependencyService (patrón legacy, aún válido)

```csharp
// Registro manual por plataforma en MauiProgram o via atributo
#if ANDROID
builder.Services.AddSingleton<INotificationService, AndroidNotificationService>();
#elif IOS
builder.Services.AddSingleton<INotificationService, IOSNotificationService>();
#endif
```

---

## Connectivity & Offline Handling

```csharp
// Services/ConnectivityAwareApiService.cs — decorador sobre el servicio real
public sealed class ConnectivityAwareInvoiceService : IInvoiceApiService
{
    private readonly IInvoiceApiService _inner;
    private readonly IConnectivity _connectivity;
    private readonly ILocalCacheService _cache;

    public ConnectivityAwareInvoiceService(
        IInvoiceApiService inner,
        IConnectivity connectivity,
        ILocalCacheService cache)
    {
        _inner = inner;
        _connectivity = connectivity;
        _cache = cache;
    }

    public async Task<IReadOnlyList<InvoiceItem>> GetInvoicesAsync(CancellationToken ct)
    {
        if (!_connectivity.NetworkAccess.HasFlag(NetworkAccess.Internet))
        {
            // Sin red: devuelve caché local
            return await _cache.GetInvoicesAsync(ct);
        }

        var invoices = await _inner.GetInvoicesAsync(ct);
        await _cache.SaveInvoicesAsync(invoices, ct); // Actualiza caché
        return invoices;
    }
}
```
