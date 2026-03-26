# Testing Strategy — Reference Code

Language-specific testing implementations aligned with the [Testing Strategy Skill](../SKILL.md).

## Files

| File | Stack | Key topics |
|------|-------|-----------|
| [python.md](./python.md) | Python / pytest | factory_boy, AsyncMock, testcontainers, Pact |
| [csharp.md](./csharp.md) | C# / xUnit | FluentAssertions, Moq, WebApplicationFactory, builder pattern |
| [typescript.md](./typescript.md) | TypeScript / Vitest | factory functions, vi.mock, MSW, Playwright |

## Test naming quick reference

| Stack | Pattern |
|-------|---------|
| Python | `test_{what}_{condition}_{result}` |
| C# | `MethodName_Condition_ExpectedResult` |
| TypeScript | `describe('Class') → describe('when...') → it('should...')` |
