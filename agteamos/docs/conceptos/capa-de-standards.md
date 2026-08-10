# La capa de standards

AgTeamOS distingue dos cosas relacionadas pero distintas, y ambas se llaman "standards" en contextos distintos — vale la pena separarlas con claridad:

1. **`standards/` del propio plugin** — los 11 estándares base con código de referencia, empaquetados dentro de AgTeamOS. Genéricos, no atados a ningún proyecto concreto.
2. **`agteamos/standards/` de tu proyecto** — el resultado de la skill `agteamos-standards` leyendo tu código real y adaptando (o desviándose de) esos 11 estándares base. Específico de tu proyecto.

## 1. Standards base del plugin

Ubicados en `standards/` dentro del repositorio de AgTeamOS, uno por tema, cada carpeta con sus propios ejemplos de código adentro (no un árbol `examples/` separado por lenguaje):

```
standards/
├── api-design/
│   ├── README.md
│   └── examples/{csharp,python,typescript}.md
├── clean-architecture/
│   ├── README.md
│   └── examples/{csharp,python,typescript}.md
├── solid-principles/
├── dry-kiss-yagni/
├── domain-driven-design/
├── database/
├── testing/
├── frontend/
├── git/
├── security/
└── devops/
```

### Stacks soportados

| Stack | Lenguaje | Framework | ORM/DB | Tests |
|---|---|---|---|---|
| Python | 3.11+ | FastAPI | SQLAlchemy 2.x + Alembic | pytest + pytest-asyncio + factory_boy |
| C#/.NET | .NET 8+ | ASP.NET Core / Blazor / MAUI | EF Core 8 | xUnit + FluentAssertions + Moq/NSubstitute |
| TypeScript | 5+ | React 19 / NestJS / Express | Prisma / Drizzle | Vitest + Testing Library + Playwright |

### Reglas transversales que aplican todos los agentes

- Funciones pequeñas con responsabilidad única — si supera ~40 líneas, evaluar dividir
- Manejo explícito de errores — nunca silenciosos ni genéricos
- Sin lógica de negocio en controllers/handlers — delegar a servicios
- Sin secrets ni valores hardcodeados — siempre variables de entorno
- Tests obligatorios: mínimo happy path + error + edge case

**Ejemplo — Result Pattern en C#:**
```csharp
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

**Ejemplo — capas en FastAPI:**
```python
class CreateInvoiceUseCase:
    def __init__(self, repo: InvoiceRepository, notifier: NotificationService) -> None:
        self._repo = repo
        self._notifier = notifier

    async def execute(self, command: CreateInvoiceCommand) -> InvoiceDTO:
        invoice = Invoice.create(command.customer_id, command.items)
        await self._repo.save(invoice)
        await self._notifier.send_confirmation(invoice)
        return InvoiceDTO.from_domain(invoice)
```

**Ejemplo — React con TypeScript:**
```typescript
interface Invoice {
  id: string
  customerId: string
  total: number
  status: 'draft' | 'sent' | 'paid'
}

function useInvoices() {
  return useQuery<Invoice[], ApiError>({
    queryKey: ['invoices'],
    queryFn: () => apiClient.get<Invoice[]>('/invoices'),
  })
}
```

## 2. `agteamos/standards/` — la proyección sobre tu proyecto

La skill `agteamos-standards` (ver [guía operativa](../guias/mantener-standards-al-dia.md)) lee estos 11 estándares base y los compara contra tu código real, produciendo una carpeta por tema **dentro de tu proyecto**:

```
agteamos/standards/
├── standards.yml          ← manifest: qué aplica, qué se adapta, qué se desvía
├── index.yml               ← keyword → carpeta, para no escanear las ~11 carpetas
├── api/
│   ├── README.md            ← reglas adaptadas a ESTE proyecto
│   ├── examples.md           ← ejemplos reales tomados del código del proyecto
│   └── deviations.md         ← solo si hay desviaciones
├── git/README.md
├── security/README.md
├── testing/README.md
├── database/README.md
├── frontend/README.md
├── clean-architecture/README.md
├── solid-principles/README.md
├── dry-kiss-yagni/README.md
├── domain-driven-design/README.md
└── devops/README.md
```

Cada `README.md` lleva un header de proveniencia con `Estado` (STUB / EXTRACTED / DESIGN-DERIVED / CREATED / UPDATED) y `Confidence` (1-5) — un estándar no se marca como vigente (`status: applies`) con confidence menor a 4/5. El detalle completo de esta regla y el ciclo de vida está en [Mantener los standards al día](../guias/mantener-standards-al-dia.md).

## Por qué la separación importa

Si `agteamos/standards/` simplemente copiara el `standards/` del plugin sin adaptar, no aportaría nada sobre leer el árbol del plugin directamente. El valor real está en que cada regla se confirma (o se desvía, con razón documentada) contra el código que existe de verdad en tu proyecto — el `Confidence` score es la forma en que el sistema es honesto sobre qué tan seguro está de esa determinación.

## Cómo lo usan los agentes

El acceso a `agteamos/standards/` combina dos mecanismos distintos — uno pasivo (siempre activo, no requiere que ningún agente lo pida) y uno activo (lo dispara la skill que está a punto de escribir o revisar código):

### 1. Inyección pasiva — hook `SessionStart`

El script `hooks/scripts/inject-standards-index.js` corre automáticamente al iniciar cualquier sesión. Si `agteamos/standards/index.yml` ya existe en el proyecto (es decir, `agteamos-standards` corrió al menos una vez), inyecta al contexto un resumen compacto del índice — carpeta por tema con sus keywords, tope de 15 temas para no volcar el índice completo:

```
[agteamos] Standards del proyecto disponibles en agteamos/standards/.
Indice keyword -> carpeta (agteamos/standards/index.yml):
- api: api, rest, endpoints
- security: auth, jwt, mfa
- database: migrations, postgres, sql
...
Antes de escribir o revisar codigo, resuelve el tema relevante contra este
indice y lee agteamos/standards/<carpeta>/README.md (y deviations.md si existe).
```

Si `index.yml` todavía no existe (el proyecto nunca corrió `agteamos-standards`), el hook no hace nada — no bloquea ni advierte, simplemente no hay nada que inyectar todavía.

### 2. Resolución activa — las skills que escriben o revisan código

La inyección pasiva pone el índice en el contexto, pero quien realmente **lee la regla completa y la aplica** son tres skills concretas, cada una con un Step explícito para esto:

| Skill | Step | Qué hace |
|---|---|---|
| `agteamos-build-api-workflow` | Step 1.5 — Resolve project standards | Resuelve keywords (`api`, `rest`, `endpoints` + los que apliquen a la tarea: `auth`, `migrations`...) contra `index.yml`, lee el `README.md`/`deviations.md` de cada carpeta resuelta, y aplica esas reglas por encima del patrón genérico del Step de implementación |
| `agteamos-build-ui-workflow` | Step 2.5 — Resolve project standards | Mismo mecanismo, resolviendo `react`, `component`, `frontend` + lo que aplique |
| `agteamos-review` | Dimensión 7 — Project Standards Conformance | Resuelve el tema del código bajo revisión, compara contra el `README.md` del proyecto y contra `deviations.md` (una desviación ya documentada ahí no es un hallazgo nuevo) |

Si `agteamos/standards/index.yml` no existe todavía, ninguna de las tres bloquea la tarea — cada una lo deja constancia explícita en su output ("no se encontró `agteamos/standards/` — no se pudo verificar contra los estándares del proyecto") en vez de saltear el paso en silencio.

Esto garantiza que el código generado en la sesión 1 sea consistente con el generado en la sesión 50, por cualquier agente que pase por una de estas tres skills — y que un estándar exista en `agteamos/standards/` no depende de que alguien se acuerde de ir a leerlo.
