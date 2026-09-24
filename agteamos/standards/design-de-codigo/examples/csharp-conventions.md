# C# / .NET Examples — convenciones y paquetes del equipo

Ejemplos de código de producción para el stack C#/.NET del equipo.
Todos los ejemplos usan patrones modernos (.NET 8/9).

> Estos ejemplos ahora viven repartidos por tema en vez de en un único árbol `examples/csharp/`
> separado — cada archivo está dentro de la carpeta `standards/<tema>/examples/` que le corresponde.

## Índice

| Archivo | Qué cubre | Dónde vive ahora |
|---------|-----------|-------------------|
| Clean Architecture | Estructura de proyecto, capas, Domain/Application/Infrastructure/API | [./csharp.md](./csharp.md) |
| CQRS/MediatR | CQRS, Commands, Queries, Pipeline Behaviors (Validation, Logging, Transaction) | [./csharp-cqrs-mediatr.md](./csharp-cqrs-mediatr.md) |
| Middleware patterns | Middleware pipeline, orden correcto, IExceptionHandler, Rate Limiting | [../../api-design/examples/csharp.md](../../api-design/examples/csharp.md) |
| Design patterns | Result Pattern, Repository/UoW, Decorator, Strategy, Observer (Domain Events) | [./csharp-design-patterns.md](./csharp-design-patterns.md) |
| Blazor patterns | Server/WASM/Auto, lifecycle, comunicación entre componentes, state management | [../../frontend/examples/csharp-blazor.md](../../frontend/examples/csharp-blazor.md) |
| MAUI MVVM | MVVM con CommunityToolkit, Shell navigation, platform-specific code | [../../frontend/examples/csharp-maui.md](../../frontend/examples/csharp-maui.md) |
| Razor Pages | PageModel, handlers nombrados, tag helpers, anti-forgery | [../../frontend/examples/csharp-razor-pages.md](../../frontend/examples/csharp-razor-pages.md) |
| Testing C# | xUnit Fact/Theory, FluentAssertions, Moq, WebApplicationFactory | [../../testing/examples/csharp.md](../../testing/examples/csharp.md) |

## Paquetes NuGet estándar del equipo

| Package | Propósito |
|---------|-----------|
| `MediatR` | CQRS, routing de commands/queries |
| `FluentValidation` | Validación fluida y reutilizable |
| `FluentResults` | Result pattern (sin excepciones para flujo de negocio) |
| `FluentAssertions` | Assertions legibles en tests |
| `Moq` o `NSubstitute` | Mocking en tests unitarios |
| `CommunityToolkit.Mvvm` | MVVM para MAUI/WPF/WinForms |
| `Scrutor` | Decorator pattern vía DI |
| `Serilog` | Logging estructurado |
| `AutoMapper` | Mapeo de DTOs (cuando aplica) |
| `Bogus` | Fake data para tests |

## Convenciones del equipo en C#

- Nullable reference types habilitado en todos los proyectos (`<Nullable>enable</Nullable>`)
- `async`/`await` con `CancellationToken` en todos los métodos de servicio
- `record` para DTOs y Commands/Queries (inmutabilidad)
- `sealed` en clases que no deben heredarse
- Result pattern sobre excepciones para flujo de negocio
- Excepciones solo para condiciones verdaderamente excepcionales
