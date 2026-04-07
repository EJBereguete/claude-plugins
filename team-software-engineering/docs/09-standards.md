# Standards y Ejemplos de Código

El plugin incluye guías de estándares y ejemplos de código production-ready para los tres stacks soportados. Los agentes consultan estos estándares antes de generar código.

## Stacks soportados

| Stack | Lenguaje | Framework | ORM/DB | Tests |
|-------|----------|-----------|--------|-------|
| Python | 3.11+ | FastAPI | SQLAlchemy 2.x + Alembic | pytest + pytest-asyncio + factory_boy |
| C#/.NET | .NET 8+ | ASP.NET Core Minimal API / Blazor / MAUI | EF Core 8 | xUnit + FluentAssertions + Moq/NSubstitute |
| TypeScript | 5+ | React 19 / NestJS / Express | Prisma / Drizzle | Vitest + Testing Library + Playwright |

## Documentos de estándares

Ubicados en `standards/` dentro del repositorio del plugin:

| Documento | Cubre |
|-----------|-------|
| `clean-architecture.md` | Capas, regla de dependencia, DDD, inversión de dependencias |
| `solid-principles.md` | S, O, L, I, D con ejemplos en Python, TypeScript y C# |
| `testing-standard.md` | Pirámide de tests, naming, cobertura mínima, mocking |
| `api-design-standard.md` | REST, HTTP codes, RFC 9457 (Problem Details), paginación, versionado |
| `security-standard.md` | OWASP Top 10, JWT, secrets management, headers de seguridad |
| `database-standard.md` | Migraciones seguras, índices, soft delete, transacciones |
| `git-standard.md` | Conventional Commits, branching, hooks pre-commit |
| `frontend-standard.md` | Componentes, estado, accesibilidad WCAG 2.2 AA, performance |
| `devops-standard.md` | Docker multistage, CI/CD, variables de entorno por entorno |
| `domain-driven-design.md` | Aggregates, Value Objects, Domain Events, Bounded Contexts |
| `dry-kiss-yagni.md` | Principios de simplicidad y cuándo aplicarlos |

## Ejemplos C# — .NET Enterprise

Ubicados en `standards/examples/csharp/`:

| Archivo | Cubre |
|---------|-------|
| `01-clean-architecture.md` | Invoice aggregate, CQRS, EF Core configuration, mediator pattern |
| `02-cqrs-mediatr.md` | Pipeline behaviors, commands, queries, handlers |
| `03-middleware-patterns.md` | Middleware order, global exception handling, logging |
| `04-design-patterns.md` | Result pattern, Repository + Unit of Work, Decorator, Factory |
| `05-blazor-patterns.md` | Render modes (Server/WASM/Auto), lifecycle, Fluxor state management |
| `06-maui-mvvm.md` | CommunityToolkit.Mvvm, Shell navigation, XAML bindings |
| `07-razor-pages.md` | PageModel, tag helpers, CRUD con EF Core |
| `08-testing-csharp.md` | xUnit patterns, WebApplicationFactory, Moq, FluentAssertions |

**Ejemplo — Result Pattern en C#:**
```csharp
// No excepciones para flujos de negocio — Result pattern
public async Task<Result<InvoiceDto>> CreateInvoiceAsync(
    CreateInvoiceCommand command,
    CancellationToken cancellationToken = default)
{
    var customer = await _repository.FindAsync(command.CustomerId, cancellationToken);
    if (customer is null)
        return Result.Failure<InvoiceDto>(CustomerErrors.NotFound(command.CustomerId));

    var invoice = Invoice.Create(customer, command.Items);
    await _repository.AddAsync(invoice, cancellationToken);
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    return Result.Success(_mapper.Map<InvoiceDto>(invoice));
}
```

## Ejemplos Python — FastAPI

Ubicados en `standards/examples/python/`:

| Archivo | Cubre |
|---------|-------|
| `01-clean-architecture.md` | Domain entities, use cases, repositories, dependency injection |
| `02-solid-principles.md` | Los 5 principios con ejemplos concretos en FastAPI |
| `03-domain-driven-design.md` | Aggregates, Value Objects, Domain Events con Python dataclasses |
| `04-api-design.md` | Routers, schemas Pydantic v2, error handling, middleware |
| `05-database.md` | SQLAlchemy 2.x async, Alembic, testcontainers en tests |
| `06-testing.md` | pytest, factory_boy, AsyncMock, Pact para contract testing |

**Ejemplo — Estructura de capas en FastAPI:**
```python
# Domain layer — sin dependencias externas
@dataclass
class Invoice:
    id: UUID
    customer_id: UUID
    items: list[InvoiceItem]
    status: InvoiceStatus

    def total(self) -> Decimal:
        return sum(item.subtotal for item in self.items)

# Application layer — use case
class CreateInvoiceUseCase:
    def __init__(self, repo: InvoiceRepository, notifier: NotificationService) -> None:
        self._repo = repo
        self._notifier = notifier

    async def execute(self, command: CreateInvoiceCommand) -> InvoiceDTO:
        invoice = Invoice.create(command.customer_id, command.items)
        await self._repo.save(invoice)
        await self._notifier.send_confirmation(invoice)
        return InvoiceDTO.from_domain(invoice)

# Router layer — HTTP concern only
@router.post("/invoices", response_model=InvoiceDTO, status_code=201)
async def create_invoice(
    command: CreateInvoiceCommand,
    use_case: CreateInvoiceUseCase = Depends(get_create_invoice_use_case),
) -> InvoiceDTO:
    try:
        return await use_case.execute(command)
    except CustomerNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

## Ejemplos TypeScript

Ubicados en `standards/examples/typescript/`:

| Archivo | Cubre |
|---------|-------|
| `01-clean-architecture.md` | Interfaces, use cases, adapters, dependency injection |
| `02-solid-principles.md` | TypeScript generics + SOLID, inversión de dependencias |
| `03-api-design.md` | Express + Zod + error middleware, RFC 9457 |
| `04-react-patterns.md` | Hooks, Context, React Query, Testing Library |
| `05-testing.md` | Vitest, MSW para mocking de API, Playwright E2E |

**Ejemplo — React con TypeScript:**
```typescript
// Interfaces explícitas — nunca `any`
interface Invoice {
  id: string
  customerId: string
  total: number
  status: 'draft' | 'sent' | 'paid'
  createdAt: Date
}

// React Query para estado del servidor
function useInvoices() {
  return useQuery<Invoice[], ApiError>({
    queryKey: ['invoices'],
    queryFn: () => apiClient.get<Invoice[]>('/invoices'),
  })
}

// Componente con manejo de errores
function InvoiceList() {
  const { data, isLoading, error } = useInvoices()

  if (isLoading) return <InvoiceListSkeleton />
  if (error) return <ErrorBoundary error={error} />

  return (
    <ul role="list" aria-label="Lista de facturas">
      {data?.map(invoice => (
        <InvoiceItem key={invoice.id} invoice={invoice} />
      ))}
    </ul>
  )
}
```

## Cómo usan los agentes los estándares

Los agentes consultan los estándares **antes de generar código**:

1. Detectan el stack del proyecto vía `convention-detection` (lee `package.json`, `pyproject.toml`, `*.csproj`)
2. Cargan los estándares relevantes para ese stack
3. Generan código que sigue los patrones documentados
4. En code review, el QA Engineer verifica el código contra estos mismos estándares

El flujo garantiza que el código generado en la sesión 1 sea consistente con el generado en la sesión 15, por cualquier agente.

## Reglas de código que aplican todos los agentes

### Transversales (todos los stacks)
- Funciones pequeñas con responsabilidad única — si supera ~40 líneas, evaluar dividir
- Manejo explícito de errores — nunca silenciosos ni genéricos
- Sin lógica de negocio en controllers/handlers — delegar a servicios
- Sin secrets ni valores hardcodeados — siempre variables de entorno
- Tests obligatorios por cada pieza funcional (mínimo happy path + error + edge case)

### Python
- Type hints en todas las funciones
- `async`/`await` consistente — no mezclar sync y async
- `try/except` explícito con el tipo de excepción específico
- HTTPException con status code correcto en routers

### TypeScript
- Interfaces explícitas — nunca `any` ni `unknown` sin narrowing
- `async`/`await` sobre `.then()` — más legible, mejor stack trace
- Error handling en cada `await` que puede fallar
- React: componentes funcionales + hooks únicamente

### C#
- Nullable reference types habilitado en el proyecto
- `async`/`await` con `CancellationToken` donde aplique
- Result pattern sobre excepciones para flujos de negocio
- `record` types para DTOs y Value Objects inmutables
