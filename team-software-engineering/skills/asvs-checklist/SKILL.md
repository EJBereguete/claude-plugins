---
name: asvs-checklist
description: >
  OWASP Application Security Verification Standard v5.0. Checklists L1 y L2
  organizadas por capitulo con patrones correctos e incorrectos en Python
  (FastAPI) y TypeScript. Referencia obligatoria para QA y backend antes de
  marcar un endpoint como listo para produccion.
used_by:
  - qa-engineer
  - security-engineer
  - backend-engineer
---

# Skill: OWASP ASVS v5.0 Checklist

## CONTRACT

Antes de aprobar cualquier PR que exponga un endpoint nuevo o modifique
autenticacion/autorizacion, el agente debe ejecutar mentalmente este checklist
y bloquear el merge si algun item L1 falla. Los items L2 son obligatorios para
endpoints que manejan datos sensibles (PII, pagos, salud).

---

## CORE CONCEPTS

### Niveles de verificacion

| Nivel | Contexto | Criterio de exigencia |
|-------|----------|----------------------|
| L1 | Todas las aplicaciones | Minimo no negociable — bloquea PR |
| L2 | Aplicaciones que manejan datos sensibles | Obligatorio en dominios criticos |
| L3 | Alta criticidad (finanzas, salud, defensa) | Verificacion formal + pentest |

### Como leer cada item

Cada item tiene formato: `[ASVS-X.Y.Z] Descripcion (L1/L2)`.
- L1 = bloquea merge si falla
- L2 = bloquea deploy a produccion si falla

---

## CHECKLIST POR CAPITULO

### V1 — Codificacion y Documentacion

- [ ] `[ASVS-1.1.1]` Todo el codigo del proyecto tiene un repositorio de control de versiones con historial completo (L1)
- [ ] `[ASVS-1.1.2]` Existe documentacion de arquitectura actualizada que incluye componentes de seguridad (L2)
- [ ] `[ASVS-1.1.3]` Los threat models estan documentados y revisados para cada feature critica (L2)
- [ ] `[ASVS-1.2.1]` Los componentes usan el principio de least privilege — cada servicio solo tiene los permisos que necesita (L1)

---

### V2 — Autenticacion

- [ ] `[ASVS-2.1.1]` Las contrasenas tienen minimo 12 caracteres (L1)
- [ ] `[ASVS-2.1.2]` Las contrasenas de hasta 128 caracteres son permitidas (L1)
- [ ] `[ASVS-2.1.5]` El sistema permite cambiar contrasena y la nueva no puede ser igual a la anterior (L1)
- [ ] `[ASVS-2.1.6]` El formulario de cambio de contrasena requiere la contrasena actual (L1)
- [ ] `[ASVS-2.2.1]` Los controles anti-automatizacion (CAPTCHA, rate limiting) protegen endpoints de autenticacion (L1)
- [ ] `[ASVS-2.2.2]` Las cuentas se bloquean o introducen delays progresivos tras N intentos fallidos (L2)
- [ ] `[ASVS-2.3.1]` Las credenciales temporales (reset de contrasena, magic links) expiran en maximo 24h (L1)
- [ ] `[ASVS-2.3.2]` Las credenciales temporales son de un solo uso (L1)
- [ ] `[ASVS-2.4.1]` Las contrasenas se almacenan con Argon2id, bcrypt o PBKDF2 — nunca MD5/SHA1/SHA256 sin salt (L1)
- [ ] `[ASVS-2.5.1]` Los mensajes de error de autenticacion no revelan si el usuario existe o no (L1)
- [ ] `[ASVS-2.6.1]` Los TOTP son validos por una sola ventana de tiempo (L2)
- [ ] `[ASVS-2.7.1]` Los tokens OTP/magic link son generados con CSPRNG (L1)
- [ ] `[ASVS-2.8.1]` Los tokens de acceso tienen tiempo de expiracion <= 24h (L2)

---

### V3 — Gestion de Sesiones

- [ ] `[ASVS-3.1.1]` Nunca se expone el session ID en URLs, logs ni headers de error (L1)
- [ ] `[ASVS-3.2.1]` Los session IDs se generan con un CSPRNG y tienen minimo 128 bits de entropia (L1)
- [ ] `[ASVS-3.2.2]` Se invalida el session ID anterior al hacer login exitoso (previene session fixation) (L1)
- [ ] `[ASVS-3.2.3]` La sesion expira tras inactividad configurada (L1)
- [ ] `[ASVS-3.3.1]` El logout invalida la sesion en el servidor — no solo borra la cookie del cliente (L1)
- [ ] `[ASVS-3.4.1]` Las cookies de sesion usan el atributo `HttpOnly` (L1)
- [ ] `[ASVS-3.4.2]` Las cookies de sesion usan el atributo `Secure` (L1)
- [ ] `[ASVS-3.4.3]` Las cookies de sesion usan `SameSite=Strict` o `SameSite=Lax` (L1)
- [ ] `[ASVS-3.4.5]` Las cookies de sesion tienen el atributo `Path` configurado al path minimo necesario (L1)
- [ ] `[ASVS-3.5.1]` Los JWT usan algoritmos seguros (RS256, ES256, PS256) — nunca `alg: none` (L1)
- [ ] `[ASVS-3.5.2]` Los JWT son validados completamente: firma, `exp`, `nbf`, `iss`, `aud` (L1)
- [ ] `[ASVS-3.7.1]` La aplicacion invalida tokens activos cuando el usuario cambia su contrasena (L2)

---

### V4 — Control de Acceso

- [ ] `[ASVS-4.1.1]` El principio de deny-by-default es aplicado: acceso denegado salvo permiso explicito (L1)
- [ ] `[ASVS-4.1.2]` El control de acceso se verifica en el servidor — nunca solo en el cliente (L1)
- [ ] `[ASVS-4.1.3]` El control de acceso a nivel de fila/recurso esta implementado (previene IDOR) (L1)
- [ ] `[ASVS-4.2.1]` Los datos sensibles requieren re-autenticacion o MFA para acceder (L2)
- [ ] `[ASVS-4.2.2]` El ownership se valida antes de cada operacion sobre un recurso (L1)
- [ ] `[ASVS-4.3.1]` Las interfaces administrativas tienen controles de acceso adicionales (L1)
- [ ] `[ASVS-4.3.2]` El acceso directo a archivos o funciones del servidor esta prohibido (L1)

---

### V5 — Validacion de Inputs y Sanitizacion

- [ ] `[ASVS-5.1.1]` El servidor valida todos los inputs independientemente de la validacion del cliente (L1)
- [ ] `[ASVS-5.1.2]` Los parametros de arrays, objetos y primitivos son validados en tipo, rango y longitud (L1)
- [ ] `[ASVS-5.1.3]` Los valores JSON son validados contra un schema definido (L1)
- [ ] `[ASVS-5.2.1]` El HTML no-confiable es sanitizado con una libreria probada (DOMPurify, bleach) antes de renderizar (L1)
- [ ] `[ASVS-5.2.2]` Los inputs de markdown son sanitizados antes de renderizar (L1)
- [ ] `[ASVS-5.2.3]` La salida hacia LDAP usa escape correcto para prevenir LDAP injection (L2)
- [ ] `[ASVS-5.2.5]` Las queries SQL usan parametros preparados — nunca concatenacion de strings (L1)
- [ ] `[ASVS-5.2.6]` Las queries NoSQL usan parametros o metodos del driver — nunca interpolacion (L1)
- [ ] `[ASVS-5.3.1]` El encoding de output es contextual: HTML para HTML, JS para JS, URL para URLs (L1)
- [ ] `[ASVS-5.3.3]` La proteccion contra XSS se aplica en todos los puntos de rendering (L1)
- [ ] `[ASVS-5.4.1]` La aplicacion no usa funciones peligrosas de memoria (si aplica al lenguaje) (L1)
- [ ] `[ASVS-5.5.1]` Los objetos serializados son validados antes de desserializar (L2)
- [ ] `[ASVS-5.5.2]` El sistema rechaza XML con DTD externas (previene XXE) (L1)

---

### V6 — Criptografia

- [ ] `[ASVS-6.1.1]` Los datos sensibles (PII, credenciales, tokens) estan cifrados en reposo (L2)
- [ ] `[ASVS-6.2.1]` Solo se usan modulos criptograficos validados o libreria estandar del lenguaje (L1)
- [ ] `[ASVS-6.2.2]` El algoritmo de cifrado es AES-256-GCM o ChaCha20-Poly1305 — no AES-ECB, DES, RC4 (L1)
- [ ] `[ASVS-6.2.3]` Los IVs/nonces son unicos por operacion — nunca reutilizados (L1)
- [ ] `[ASVS-6.2.5]` Los modos de cifrado inseguros (ECB, CBC sin MAC) no se usan (L1)
- [ ] `[ASVS-6.3.1]` Los numeros aleatorios para tokens o keys se generan con CSPRNG (L1)
- [ ] `[ASVS-6.3.2]` Los UUIDs se generan con UUID v4 o superior (L1)
- [ ] `[ASVS-6.4.1]` Las claves criptograficas son intercambiables sin re-despliegue del codigo (L2)
- [ ] `[ASVS-6.4.2]` Las claves criptograficas no estan en el codigo fuente ni en variables de entorno del repo (L1)

---

### V7 — Manejo de Errores y Logging

- [ ] `[ASVS-7.1.1]` Los logs no contienen credenciales, tokens, PII ni datos de tarjetas (L1)
- [ ] `[ASVS-7.1.2]` Los logs no contienen informacion de debug sensible en produccion (L1)
- [ ] `[ASVS-7.2.1]` Todos los controles de autenticacion logean exitos y fallos con contexto suficiente (L2)
- [ ] `[ASVS-7.2.2]` Todos los controles de acceso logean fallos con contexto suficiente (L2)
- [ ] `[ASVS-7.3.1]` Los logs estan protegidos contra inyeccion — los inputs de usuario se escapan antes de loguear (L2)
- [ ] `[ASVS-7.4.1]` Los errores de la aplicacion al usuario no exponen stack traces, IDs internos ni detalles del servidor (L1)
- [ ] `[ASVS-7.4.2]` Los errores tienen un identificador unico que permite correlacionar con los logs del servidor (L2)

---

### V8 — Proteccion de Datos

- [ ] `[ASVS-8.1.1]` Los datos sensibles no se almacenan en cache del cliente (headers `Cache-Control: no-store`) (L2)
- [ ] `[ASVS-8.1.2]` Los datos en memoria son sobreescritos cuando ya no son necesarios (L2)
- [ ] `[ASVS-8.2.1]` Los datos PII tienen politica de retencion y borrado definida (L2)
- [ ] `[ASVS-8.3.1]` Los datos sensibles en requests/responses usan TLS — nunca HTTP plano (L1)
- [ ] `[ASVS-8.3.4]` Todos los datos sensibles son identificados y clasificados en la documentacion (L2)

---

### V9 — Comunicaciones

- [ ] `[ASVS-9.1.1]` TLS 1.2+ es el minimo para toda comunicacion externa (L1)
- [ ] `[ASVS-9.1.2]` Los cipher suites inseguros (RC4, DES, 3DES, NULL) estan deshabilitados (L1)
- [ ] `[ASVS-9.1.3]` TLS 1.0 y TLS 1.1 estan deshabilitados (L1)
- [ ] `[ASVS-9.2.1]` Los certificados de cliente se validan cuando estan configurados (L2)
- [ ] `[ASVS-9.2.2]` Los errores de TLS/certificado estan logueados y no son ignorados silenciosamente (L2)

---

### V13 — Seguridad de APIs

- [ ] `[ASVS-13.1.1]` Los endpoints de API tienen autenticacion excepto los explicitamente publicos (L1)
- [ ] `[ASVS-13.1.2]` Los endpoints de API tienen rate limiting contra abuso automatizado (L1)
- [ ] `[ASVS-13.1.3]` Los endpoints de API validan el Content-Type del request y rechazan tipos no soportados (L1)
- [ ] `[ASVS-13.1.4]` Los endpoints de API validan el Content-Type en la respuesta (L1)
- [ ] `[ASVS-13.2.1]` Los endpoints REST que modifican estado tienen proteccion CSRF o tokens anti-CSRF (L1)
- [ ] `[ASVS-13.2.2]` Los endpoints REST usan los HTTP methods correctos segun su semantica (L1)
- [ ] `[ASVS-13.3.1]` Los schemas de GraphQL tienen depth limiting para prevenir queries abusivas (L2)
- [ ] `[ASVS-13.3.2]` La introspection de GraphQL esta deshabilitada en produccion (L2)

---

## EXAMPLES

### V2 — Almacenamiento de contrasenas

**INCORRECTO (Python):**
```python
import hashlib

def store_password(password: str) -> str:
    # MD5 sin salt — completamente inseguro
    return hashlib.md5(password.encode()).hexdigest()

def store_password_v2(password: str) -> str:
    # SHA256 sin salt — resiste brute-force pero rainbow tables lo rompen
    return hashlib.sha256(password.encode()).hexdigest()
```

**CORRECTO (Python):**
```python
from passlib.context import CryptContext

# Argon2id: ganador de Password Hashing Competition 2015 — ASVS v5 lo recomienda
pwd_context = CryptContext(
    schemes=["argon2"],
    argon2__memory_cost=65536,   # 64 MB
    argon2__time_cost=3,          # 3 iteraciones
    argon2__parallelism=4,
    deprecated="auto",
)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

---

### V3 — JWT: validacion correcta

**INCORRECTO (TypeScript):**
```typescript
import jwt from 'jsonwebtoken'

// Solo decodifica sin verificar — completamente inseguro
const payload = jwt.decode(token)

// Acepta alg: none
const payload2 = jwt.verify(token, secret)  // sin options — acepta alg: none en algunas versiones
```

**CORRECTO (TypeScript):**
```typescript
import jwt, { JwtPayload } from 'jsonwebtoken'

interface TokenPayload extends JwtPayload {
  userId: string
  role: string
}

function verifyAccessToken(token: string): TokenPayload {
  // algorithms explicito — nunca permite alg: none
  const payload = jwt.verify(token, process.env.JWT_PUBLIC_KEY!, {
    algorithms: ['RS256'],
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  }) as TokenPayload

  return payload
}
```

---

### V4 — IDOR prevention (ownership check)

**INCORRECTO (Python/FastAPI):**
```python
@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: int, db: AsyncSession = Depends(get_db)):
    # Cualquier usuario autenticado puede ver cualquier factura
    invoice = await db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404)
    return invoice
```

**CORRECTO (Python/FastAPI):**
```python
@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    invoice = await db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    # Ownership check — ASVS 4.2.2
    if invoice.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    return InvoiceResponse.model_validate(invoice)
```

---

### V5 — SQL injection prevention

**INCORRECTO (Python):**
```python
async def find_user_by_email(email: str, db: AsyncSession):
    # Concatenacion directa — vulnerable a SQL injection
    result = await db.execute(
        text(f"SELECT * FROM users WHERE email = '{email}'")
    )
    return result.fetchone()
```

**CORRECTO (Python):**
```python
from sqlalchemy import select

async def find_user_by_email(email: str, db: AsyncSession) -> User | None:
    # ORM usa parametros preparados automaticamente
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()

# Si necesitas SQL raw, siempre con parametros nombrados
async def find_user_raw(email: str, db: AsyncSession):
    result = await db.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": email},  # parametro — nunca interpolacion
    )
    return result.fetchone()
```

---

### V7 — Error handling sin stack trace

**INCORRECTO (TypeScript/Express):**
```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Expone stack trace y detalles internos al cliente
  res.status(500).json({
    error: err.message,
    stack: err.stack,
    query: req.query,
  })
})
```

**CORRECTO (TypeScript/Express):**
```typescript
import { randomUUID } from 'crypto'
import { logger } from './logger'

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const errorId = randomUUID()

  // Stack trace solo en logs internos — ASVS 7.4.1
  logger.error({
    errorId,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  })

  // Al cliente: mensaje generico + correlation ID — ASVS 7.4.2
  res.status(500).json({
    type: 'https://api.example.com/errors/internal-error',
    title: 'Internal Server Error',
    status: 500,
    errorId,  // permite correlacionar con logs sin exponer detalles
  })
})
```

---

## ANTI-PATTERNS

1. **Validacion solo en el cliente.** El servidor debe validar todos los inputs sin excepcion.
2. **Mensajes de error informativos.** `"Invalid password for user john@example.com"` enumera usuarios — usar mensaje generico.
3. **JWT sin verificar `aud` e `iss`.** Un token valido de otro servicio del mismo ecosistema podria ser reutilizado.
4. **Comparacion de tokens con `==`.** Usar comparacion en tiempo constante (`hmac.compare_digest`) para prevenir timing attacks.
5. **Loguear el body completo del request.** Puede capturar contrasenas, tokens o tarjetas.
6. **Deshabilitar verificacion TLS en clientes HTTP internos.** `verify=False` en requests o `rejectUnauthorized: false` en Node.
7. **Secrets en variables de entorno del repositorio (`.env` commiteado).** Usar un gestor de secretos externo.
8. **UUIDs secuenciales o predecibles como IDs publicos.** Usar UUID v4 o IDs opacos.
