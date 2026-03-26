# Build API Workflow — Reference Code

Full, runnable implementation examples for the [Build API Workflow Skill](../SKILL.md).

## Files

| File | Stack | Key topics |
|------|-------|-----------|
| [python.md](./python.md) | Python / FastAPI | Router, Service, Repository, unit tests, pytest |
| [csharp.md](./csharp.md) | C# / ASP.NET Core | Minimal API, Service, CQRS with MediatR, unit tests, xUnit |
| [typescript.md](./typescript.md) | TypeScript / Express | Router, Service, Repository, unit tests, Vitest |

## Pattern: Strict layering (all stacks)

```
HTTP Handler (router/controller/endpoint)
  ↓ validated input (Pydantic / FluentValidation / Zod)
Service (business logic)
  ↓
Repository (data access)
  ↓
Database
```

**No business logic in the HTTP layer. No DB calls in the service layer (use repository abstraction).**
