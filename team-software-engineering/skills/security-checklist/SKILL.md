# Skill: Security Checklist (Expert Level)

## 🛡️ Principios de Arquitectura de Seguridad (Zero Trust)
- **Nunca confíes, siempre verifica**: Cada servicio y usuario requiere autenticación y autorización explícita.
- **Least Privilege**: El código, los usuarios y los procesos corren con el mínimo permiso necesario.
- **Security by Design**: La seguridad es parte del flujo de diseño inicial (Architect & Security Engineer).

## 🗺️ Threat Modeling (STRIDE) - Obligatorio en Diseño
Antes de implementar, evaluamos amenazas en cada componente:
- **S**poofing: ¿Pueden suplantar a un usuario o servicio? (Authn)
- **T**ampering: ¿Pueden modificar los datos en tránsito o reposo? (Integridad)
- **R**epudiation: ¿Podemos probar quién hizo qué? (Logging/Audit)
- **I**nformation Disclosure: ¿Estamos exponiendo datos sensibles (PII)? (Privacidad)
- **D**enial of Service: ¿El sistema es resiliente a ataques de carga? (Disponibilidad)
- **E**levation of Privilege: ¿Puede un usuario normal volverse admin? (Authz)

## 🔐 Auth & Identity (OAuth2 / OIDC Advanced)
- **Flujos Seguros**: Usar "Authorization Code with PKCE" para clientes públicos (SPA/Mobile).
- **Token Handling**:
  - **JWT**: Validar siempre `iss`, `aud`, `exp` y firma. No confiar en el header `alg: none`.
  - **Almacenamiento**: `httpOnly`, `secure`, `SameSite=Strict` cookies. Nunca localStorage para tokens de acceso.
- **MFA**: Requerir Multi-Factor Authentication para acciones críticas (Pagos, Admin).

## 🤫 Secret Management (Zero Secrets Policy)
- **No Hardcoded Secrets**: Prohibido el uso de API keys o passwords en el código o `.env` locales.
- **Vault Integration**: Usar AWS Secrets Manager, HashiCorp Vault o Azure Key Vault.
- **Dynamic Secrets**: Preferir secretos que expiren o se roten automáticamente.

## 🧱 Hardening de APIs (Secure by Default)
- **Input Validation & Sanitization**: Tratar todo input como malicioso. Usar esquemas estrictos (Zod, Pydantic).
- **Security Headers**:
  - `Content-Security-Policy` (CSP): Prevenir XSS inyectando políticas de origen.
  - `Strict-Transport-Security` (HSTS): Forzar HTTPS siempre.
  - `X-Frame-Options: DENY`: Prevenir Clickjacking.
- **Rate Limiting & Throttling**: Prevenir Brute Force y DoS en cada endpoint crítico.

## 📦 Dependency Security (Supply Chain)
- **Audit Continuo**: `npm audit`, `pip audit`, `trivy` integrados en el pipeline de CI.
- **Pin Versions**: Usar hashes (`sha256`) o versiones exactas para evitar ataques de inyección de dependencias.

## 📊 Security Audit Checklist (Definition of Done)
- [ ] ¿Se realizó Threat Modeling (STRIDE) para esta feature?
- [ ] ¿Los datos sensibles están cifrados en reposo (AES-256-GCM)?
- [ ] ¿Se validaron los permisos a nivel de recurso (IDOR protection)?
- [ ] ¿El logging incluye Request-ID pero NO incluye PII/Passwords?
- [ ] ¿El escaneo de SAST/DAST pasa sin vulnerabilidades críticas?
- [ ] ¿Se verificó que no existan secretos hardcodeados con herramientas (Gitleaks)?
