# MCP capabilities

AgTeamOS ships a minimal default set:

- `github`: repository and issue provider.
- `azure-devops`: Azure Boards and Azure Repos provider.
- `context7`: current library documentation.

All package versions in `.mcp.json` are pinned. Updating a version is an
explicit plugin change and must pass the plugin validation suite.

Variables del perfil:

- `GITHUB_TOKEN`: token de GitHub.
- `AZURE_DEVOPS_ORG`: nombre de la organización, sin URL.
- `AZURE_DEVOPS_PAT`: PAT de Azure DevOps en texto original. No usar base64;
  el MCP lo recibe como `PERSONAL_ACCESS_TOKEN`.

Solo se guardan estos nombres en configuración; nunca sus valores.

## Optional capabilities

Browser automation, databases, Docker, Sentry and SonarQube are not enabled by
default. They increase startup cost, permissions and platform assumptions.
Enable one only when a project needs it, using the host's user/project MCP
configuration and the provider's current official instructions.

Skills discover capabilities before use:

1. If a native host tool is available, use it.
2. Otherwise use an enabled MCP with the required scope.
3. If neither exists, report `unavailable` and the exact setup needed.
4. Never silently substitute a write-capable provider.

Read-only inspection does not authorize writes. Provider mutations keep the
approval and read-back contracts defined by `agteamos-work-items`,
`agteamos-pr` and the owning skill.

## Platform notes

- Do not assume a Unix Docker socket on Windows.
- Do not place database connection strings or provider tokens in committed
  configuration.
- Prefer least-privilege credentials and read-only scopes until a workflow
  needs an approved mutation.
- A project may use host-native GitHub/Azure tools instead of these MCP
  entries; the capability contract matters, not the tool name.
- Azure business text should use structured MCP values. If a capability needs
  REST fallback, `agteamos-work-items/AZURE-TRANSPORT.md` requires UTF-8 data
  files and structured read-back; do not pass rich/non-ASCII text through CLI
  arguments, especially on Windows.
