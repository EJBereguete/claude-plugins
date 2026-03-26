# Code Examples Index

Production-quality code examples organized by language. Each folder mirrors the same topics covered in the standards.

## Available Languages

| Folder | Stack | Examples |
|--------|-------|---------|
| [csharp/](./csharp/) | C# / .NET 8+ | Clean Architecture, CQRS, Middleware, Design Patterns, Blazor, MAUI, Razor Pages, Testing |
| [python/](./python/) | Python 3.12+ / FastAPI / SQLAlchemy | Clean Architecture, SOLID, DDD, API Design, Database, Testing |
| [typescript/](./typescript/) | TypeScript / Node.js / React | Clean Architecture, SOLID, API Design, React Patterns, Testing |

## How to use

1. Read the relevant **standard** first to understand the rules and decisions.
2. Consult these examples for concrete, copy-pasteable implementations.
3. Adapt the examples to the project's actual framework versions (check `context7` MCP for current docs).

## Design philosophy

- Examples are **language-specific expressions** of the language-agnostic rules in the standards.
- When the project changes stack, only the `reference/` and `examples/{language}/` files need updating — the rules stay the same.
- Each example is self-contained and runnable (no omitted imports).
