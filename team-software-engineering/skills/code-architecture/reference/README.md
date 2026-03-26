# Code Architecture — Reference Code

Language-specific architecture implementations aligned with the [Code Architecture Skill](../SKILL.md).

## Files

| File | Stack | Key topics |
|------|-------|-----------|
| [python.md](./python.md) | Python / FastAPI | Clean Architecture layers, SOLID, DDD patterns |
| [csharp.md](./csharp.md) | C# / ASP.NET Core | Clean Architecture, CQRS, SOLID, DDD with MediatR |
| [typescript.md](./typescript.md) | TypeScript / Node.js | Clean Architecture, SOLID with TypeScript interfaces |

## Architecture principles (all stacks)

1. **Dependency Rule**: Dependencies point inward only. Domain knows nothing about infrastructure.
2. **SOLID**: Applied consistently across all layers.
3. **DDD**: Entities enforce their own invariants. Value Objects are immutable.
4. **Testability**: Business logic is testable without framework or database.
