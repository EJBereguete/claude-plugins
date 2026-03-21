# Skill: Security Checklist

## OWASP Top 10 — por agente

### @architect — verifica en diseño
- [ ] Auth y autorización definidas desde el inicio
- [ ] Datos sensibles identificados y plan de protección
- [ ] HTTPS obligatorio en todos los environments
- [ ] Principio de mínimo privilegio en roles y permisos

### @backend-engineer — verifica antes de cada PR

**Inyección SQL**
```python
# NUNCA
query = f"SELECT * FROM users WHERE id = {user_id}"
# SIEMPRE
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

**Autorización a nivel de objeto (IDOR)**
```python
async def get_resource(resource_id, current_user):
    resource = await db.get(resource_id)
    if resource.owner_id != current_user.id:  # CRÍTICO
        raise ForbiddenError()
    return resource
```

**Passwords y datos sensibles**
- Hashear con bcrypt/argon2 — nunca MD5 o SHA1
- Nunca logear passwords, tokens ni datos de tarjetas
- Campos sensibles excluidos del JSON de respuesta

**Headers de seguridad mínimos**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

### @frontend-engineer — verifica antes de cada PR

**XSS**
```typescript
// NUNCA
element.innerHTML = userInput
dangerouslySetInnerHTML={{ __html: data }}

// Si necesitas HTML dinámico: DOMPurify.sanitize()
// React y Vue escapan por defecto — no saltarse esto
```

**Tokens de auth**
- httpOnly cookies → preferido
- Memoria (variable) → aceptable
- localStorage → NUNCA para tokens de auth

**Datos sensibles**
- Sin API keys en código frontend
- Sin datos sensibles en URL params
- Sin datos sensibles en console.log

### @qa-engineer — verifica en testing

- [ ] Token expirado → debe rechazar (401)
- [ ] Token de otro usuario → debe rechazar (403)
- [ ] Input con `<script>` → no debe ejecutarse
- [ ] Endpoint sin auth → 401
- [ ] Sin info sensible en mensajes de error

### @security-engineer — auditoría y respuesta
- [ ] Escaneo de secretos (`trufflehog`, `gitleaks` o manual)
- [ ] Auditoría de dependencias (`npm audit`, `pip audit`, `snyk`)
- [ ] Pruebas DAST (ataques activos en formularios y auth)
- [ ] Verificación de cifrado y gestión de llaves
- [ ] Configuración de Rate Limiting y protección anti-bruta

### @devops-engineer — verifica en infraestructura

- [ ] Docker sin usuario root
- [ ] Secrets en variables de entorno, no en imagen
- [ ] SSL configurado y auto-renovable
- [ ] Puertos mínimos expuestos
- [ ] Firewall configurado

## Severidad

| Severidad | Ejemplo | Acción |
|-----------|---------|--------|
| Crítica | SQL injection, auth bypass | Bloquear PR, fix inmediato |
| Alta | Datos sensibles expuestos | Bloquear PR |
| Media | Headers faltantes | Issue + fix en sprint |
| Baja | Mejoras menores | Issue + backlog |
