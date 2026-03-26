# Python Code Examples

Production-quality Python code examples implementing team standards. Uses Python 3.12+, FastAPI 0.115+, SQLAlchemy 2.0 async.

## Index

| File | Covers |
|------|--------|
| [01-clean-architecture.md](./01-clean-architecture.md) | Folder structure, Dependency Rule, Use Case example, DI wiring |
| [02-solid-principles.md](./02-solid-principles.md) | SRP, OCP, LSP, ISP, DIP with before/after examples |
| [03-domain-driven-design.md](./03-domain-driven-design.md) | Entity, Value Object, Aggregate, Repository, Domain Events |
| [04-api-design.md](./04-api-design.md) | RFC 9457 errors, pagination, rate limiting, OpenAPI |
| [05-database.md](./05-database.md) | SQLAlchemy 2.0 async patterns, soft delete, migrations, query safety |
| [06-testing.md](./06-testing.md) | pytest fixtures, factories, mocking, integration tests, E2E |

## Stack

- Python 3.12+
- FastAPI 0.115+
- SQLAlchemy 2.0 async + Alembic
- Pydantic v2
- pytest + pytest-asyncio + factory_boy
