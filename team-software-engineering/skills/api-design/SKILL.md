# Skill: API Design

## REST — convenciones obligatorias

### Naming
- Sustantivos en plural: `/users`, `/invoices`, `/products`
- Anidación máxima 2 niveles: `/users/{id}/orders` ✅ — más: crear endpoint plano
- Acciones como verbos cuando no hay otro camino: `/invoices/{id}/send`

### HTTP Methods
| Method | Uso | Idempotente |
|--------|-----|-------------|
| GET | leer | ✅ |
| POST | crear | ❌ |
| PUT | reemplazar completo | ✅ |
| PATCH | actualizar parcial | ✅ |
| DELETE | eliminar | ✅ |

### Response codes
```
200 OK          → GET, PUT, PATCH exitoso
201 Created     → POST exitoso (incluir Location header)
204 No Content  → DELETE exitoso
400 Bad Request → validación fallida (con detail)
401 Unauthorized → no autenticado
403 Forbidden   → autenticado pero sin permiso
404 Not Found   → recurso no existe
409 Conflict    → duplicado o estado inválido
422 Unprocessable → datos bien formados pero inválidos
429 Too Many Requests → rate limit
500 Internal Server Error → error inesperado (no exponer detalle)
```

### Response format — siempre consistente
```json
// Éxito con datos
{ "data": { ... }, "meta": { "page": 1, "total": 100 } }

// Error
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

### Paginación
```
GET /resources?page=1&limit=20&sort=created_at&order=desc
```

### Versionado
```
/api/v1/resources  → versión en URL (más simple)
Accept: application/vnd.api+json;version=1  → versión en header
```

## GraphQL — cuándo preferirlo
- Múltiples clientes con necesidades distintas de datos
- Queries complejas con muchas relaciones
- Cuando REST genera over/under-fetching real

## Documentación
- OpenAPI/Swagger para REST
- Esquema GraphQL bien comentado
- Ejemplos de request/response para todos los endpoints
