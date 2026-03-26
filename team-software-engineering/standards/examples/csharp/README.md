# C# / .NET Examples

Ejemplos de código de producción para el stack C#/.NET del equipo.
Todos los ejemplos usan patrones modernos (.NET 8/9).

## Índice

| Archivo | Qué cubre |
|---------|-----------|
| [01-clean-architecture.md](./01-clean-architecture.md) | Estructura de proyecto, capas, Domain/Application/Infrastructure/API |
| [02-cqrs-mediatr.md](./02-cqrs-mediatr.md) | CQRS, Commands, Queries, Pipeline Behaviors (Validation, Logging, Transaction) |
| [03-middleware-patterns.md](./03-middleware-patterns.md) | Middleware pipeline, orden correcto, IExceptionHandler, Rate Limiting |
| [04-design-patterns.md](./04-design-patterns.md) | Result Pattern, Repository/UoW, Decorator, Strategy, Observer (Domain Events) |
| [05-blazor-patterns.md](./05-blazor-patterns.md) | Server/WASM/Auto, lifecycle, comunicación entre componentes, state management |
| [06-maui-mvvm.md](./06-maui-mvvm.md) | MVVM con CommunityToolkit, Shell navigation, platform-specific code |
| [07-razor-pages.md](./07-razor-pages.md) | PageModel, handlers nombrados, tag helpers, anti-forgery |
| [08-testing-csharp.md](./08-testing-csharp.md) | xUnit Fact/Theory, FluentAssertions, Moq, WebApplicationFactory |

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
