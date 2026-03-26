# Skill: API Design

## REST — Convenciones obligatorias

### Naming de recursos
- Sustantivos en plural: `/users`, `/invoices`, `/products`
- Kebab-case en URLs: `/user-profiles`, nunca `/userProfiles` ni `/user_profiles`
- Anidación máxima 2 niveles: `/users/{id}/orders` — más niveles: crear endpoint plano
- Acciones como subpath verbal solo cuando no hay alternativa RESTful: `/invoices/{id}/send`
- Filtros y búsqueda como query params: `/orders?status=pending&customer_id=123`

**Ejemplos correctos:**
```
GET    /users                    → listar usuarios
POST   /users                    → crear usuario
GET    /users/{id}               → obtener usuario
PUT    /users/{id}               → reemplazar usuario completo
PATCH  /users/{id}               → actualizar parcialmente
DELETE /users/{id}               → eliminar usuario
GET    /users/{id}/orders        → pedidos de un usuario
POST   /invoices/{id}/send       → acción que no encaja en CRUD
```

**Ejemplos incorrectos:**
```
POST   /createUser               → verbo en URL
GET    /getUser?id=123           → verbo en URL
GET    /users/{id}/orders/{oid}/items/{iid}/reviews  → demasiado anidado
```

### HTTP Methods y semántica

| Method | Uso | Idempotente | Body en request |
|--------|-----|-------------|-----------------|
| GET | leer | Si | No |
| POST | crear | No | Si |
| PUT | reemplazar completo | Si | Si |
| PATCH | actualizar parcial | Si | Si |
| DELETE | eliminar | Si | No |

### HTTP Status Codes

```
200 OK              → GET exitoso, PUT/PATCH exitoso con body de respuesta
201 Created         → POST exitoso (incluir Location: /resources/{id} header)
204 No Content      → DELETE exitoso, PUT/PATCH sin body de respuesta
400 Bad Request     → error de validación del cliente (incluir detail)
401 Unauthorized    → no autenticado (falta token o es inválido)
403 Forbidden       → autenticado pero sin permiso para este recurso
404 Not Found       → recurso no existe
409 Conflict        → duplicado, estado inválido, conflicto de versión
422 Unprocessable   → datos bien formados pero semánticamente inválidos
429 Too Many Requests → rate limit (incluir Retry-After header)
500 Internal Server Error → error inesperado (NO exponer stack traces)
503 Service Unavailable   → servicio en mantenimiento o sobrecargado
```

### Formato de respuesta — RFC 9457 (Problem Details) para errores

**Éxito:**
```json
{
  "data": {
    "id": "usr_123",
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Lista con paginación:**
```json
{
  "data": [
    { "id": "usr_123", "name": "John Doe" },
    { "id": "usr_124", "name": "Jane Doe" }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "has_next": true
  }
}
```

**Error — estándar RFC 9457:**
```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request body contains invalid fields.",
  "instance": "/users/create",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "name", "message": "Name is required" }
  ]
}
```

**Implementación en FastAPI:**
```python
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

class ProblemDetail(BaseModel):
    type: str
    title: str
    status: int
    detail: str
    instance: str | None = None

@app.exception_handler(ValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "type": "https://api.example.com/errors/validation-error",
            "title": "Validation Error",
            "status": 422,
            "detail": str(exc),
            "instance": str(request.url),
        }
    )
```

**Implementación en ASP.NET Core (.NET 8+):**
```csharp
// Program.cs — ProblemDetails está integrado en ASP.NET Core
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions["instance"] =
            context.HttpContext.Request.Path;
    };
});

// Minimal API — validación con FluentValidation + ProblemDetails
app.MapPost("/api/v1/users", async (
    CreateUserRequest request,
    IValidator<CreateUserRequest> validator,
    IUserService userService) =>
{
    var validation = await validator.ValidateAsync(request);
    if (!validation.IsValid)
    {
        return Results.ValidationProblem(
            validation.ToDictionary(),
            type: "https://api.example.com/errors/validation-error",
            title: "Validation Error",
            statusCode: 422
        );
    }
    var result = await userService.CreateAsync(request);
    return result.IsSuccess
        ? Results.Created($"/api/v1/users/{result.Value.Id}", result.Value)
        : Results.Problem(result.Error, statusCode: 409);
})
.WithName("CreateUser")
.Produces<UserResponse>(201)
.ProducesValidationProblem(422)
.ProducesProblem(409);

// GlobalExceptionHandler — manejo global RFC 9457
public sealed class GlobalExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken ct)
    {
        var (status, title, type) = exception switch
        {
            NotFoundException e => (404, "Not Found", "not-found"),
            DuplicateException e => (409, "Conflict", "duplicate"),
            ValidationException e => (422, "Validation Error", "validation-error"),
            _ => (500, "Internal Server Error", "server-error")
        };

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Type = $"https://api.example.com/errors/{type}",
            Title = title,
            Status = status,
            Detail = exception.Message,
            Instance = httpContext.Request.Path
        }, ct);
        return true;
    }
}
```

### Versionado

**URL versioning (recomendado para simplicidad):**
```
/api/v1/users
/api/v2/users  # nueva versión cuando hay breaking changes
```

**Header versioning (más REST puro):**
```
Accept: application/vnd.myapi.v1+json
```

**Reglas:**
- Nueva versión solo cuando hay breaking changes (cambio de contrato)
- Mantener versiones anteriores por mínimo 6 meses tras deprecación
- Anunciar deprecación con header: `Deprecation: Sat, 01 Jan 2025 00:00:00 GMT`

### Paginación

**Offset pagination (simple, para datos que no cambian frecuentemente):**
```
GET /orders?page=1&limit=20&sort=created_at&order=desc

Response:
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "total_pages": 25,
    "has_next": true,
    "has_prev": false
  }
}
```

**Cursor pagination (para datos en tiempo real, feeds, grandes volúmenes):**
```
# Primera petición
GET /messages?limit=20

# Peticiones siguientes — usar cursor del response anterior
GET /messages?limit=20&after=eyJpZCI6IjEyMyJ9

Response:
{
  "data": [...],
  "pagination": {
    "has_next": true,
    "next_cursor": "eyJpZCI6IjE0MyJ9",
    "has_prev": false
  }
}
```

**Cuándo usar cada una:**
- Offset: reportes, admin panels, datos que no cambian frecuentemente, cuando se necesita saltar a página específica
- Cursor: feeds, real-time data, tablas grandes (+100k rows), cuando los datos cambian frecuentemente

**Cursor en Python:**
```python
import base64, json

def encode_cursor(data: dict) -> str:
    return base64.b64encode(json.dumps(data).encode()).decode()

def decode_cursor(cursor: str) -> dict:
    return json.loads(base64.b64decode(cursor.encode()).decode())

# Uso
cursor = encode_cursor({"id": last_item.id, "created_at": last_item.created_at.isoformat()})
```

### Rate Limiting — headers estándar

```
X-RateLimit-Limit: 1000         # límite de requests por ventana
X-RateLimit-Remaining: 999      # requests restantes
X-RateLimit-Reset: 1700000000   # Unix timestamp del reset
Retry-After: 60                 # segundos hasta poder reintentar (en 429)
```

### OpenAPI 3.1 — estándares de documentación

```yaml
openapi: 3.1.0
info:
  title: My API
  version: 1.0.0
  description: |
    Descripción completa de la API.

paths:
  /users/{id}:
    get:
      summary: Get a user by ID
      operationId: getUserById        # Requerido — identificador único
      tags: [Users]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
              example:
                id: "usr_123"
                name: "John Doe"
        '404':
          $ref: '#/components/responses/NotFound'

components:
  schemas:
    UserResponse:
      type: object
      required: [id, name, email]
      properties:
        id:
          type: string
          description: Unique identifier
        name:
          type: string
        email:
          type: string
          format: email
  responses:
    NotFound:
      description: Resource not found
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'
```

### GraphQL — cuándo preferirlo
- Múltiples clientes con necesidades distintas de datos (web, mobile, partner)
- Queries complejas con muchas relaciones donde REST genera N+1
- Cuando REST genera over/under-fetching real y medido
- NOT GraphQL para: APIs simples, cuando los clientes son homogéneos, cuando el equipo no tiene experiencia

### Checklist de enforcement
- [ ] URLs usan sustantivos plurales y kebab-case
- [ ] No hay verbos en URLs (salvo acciones excepcionales documentadas)
- [ ] Errores usan RFC 9457 (Problem Details) con `type`, `title`, `status`, `detail`
- [ ] Paginación siempre presente en endpoints de colección
- [ ] Status codes correctos (201 en POST, 204 en DELETE sin body)
- [ ] Versión en URL: `/api/v1/`
- [ ] OpenAPI actualizado con ejemplos en cada endpoint
- [ ] Rate limit headers en respuestas
