# API Design — Reference Code

Language-specific implementations of the [API Design Skill](../SKILL.md) rules.

## Files

| File | Stack | Key topics |
|------|-------|-----------|
| [python.md](./python.md) | Python / FastAPI | RFC 9457, cursor pagination, rate limiting middleware |
| [csharp.md](./csharp.md) | C# / ASP.NET Core | ProblemDetails, GlobalExceptionHandler, Minimal API |
| [typescript.md](./typescript.md) | TypeScript / Express / Hono | RFC 9457 middleware, Zod validation, cursor pagination |

## Quick reference

| Task | Python | C# | TypeScript |
|------|--------|----|-----------|
| RFC 9457 error response | FastAPI exception_handler | IExceptionHandler + ProblemDetails | Express error middleware |
| Input validation | Pydantic v2 | FluentValidation | Zod |
| Cursor pagination | base64 + json encode | base64 + JSON | base64 + JSON |
| Rate limiting | slowapi / middleware | ASP.NET Core rate limiting | express-rate-limit |
