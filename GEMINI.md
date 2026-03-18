# GEMINI Project Context: team-software-engineering

## Directory Overview

This directory contains the configuration for "team-software-engineering," a Claude Code plugin that simulates a complete software engineering team. It orchestrates a team of specialized AI agents to take a software project from an idea to a deployed application, following a professional Git workflow.

This is not a traditional software project with buildable source code. Instead, it's a collection of Markdown files that define the roles, capabilities, and workflows of an AI development team.

## Key Components

The project is structured into several key directories:

*   `.claude-plugin/plugin.json`: The manifest file that defines the plugin's metadata for the Claude ecosystem.
*   `agents/`: Contains Markdown files defining the personas and responsibilities of the six specialized AI agents:
    *   `architect.md`: Designs the technical solution.
    *   `pm.md`: Creates and manages project issues.
    *   `backend-engineer.md`: Implements server-side logic and APIs.
    *   `frontend-engineer.md`: Implements the user interface.
    *   `qa-engineer.md`: Reviews code and runs tests.
    *   `devops-engineer.md`: Manages deployment and infrastructure.
*   `commands/`: Defines the commands available to the user to interact with the agent team. The primary command is `/sprint`, which executes a full development cycle. Other commands allow for more granular actions like `/plan`, `/design`, `/build-api`, `/build-ui`, etc.
*   `skills/`: These directories contain `SKILL.md` files, which act as specialized knowledge bases for the agents. They cover topics like API design, database migrations, testing strategies, and security. Agents automatically consult these skills when needed.
*   `hooks/hooks.json`: Defines automated security hooks, such as preventing destructive SQL commands and detecting hardcoded secrets.
*   `.mcp.json`: Configures the MCP (Multi-Claude-Plugin) servers that the agents use to interact with external services like GitHub, databases, and testing frameworks.
*   `README.md`: Provides a comprehensive explanation of the plugin, its agents, commands, and workflow.

## Usage

This directory's contents are intended to be used as a plugin within the Claude Code environment. The primary workflow is initiated via the `/sprint` command, which takes a high-level feature request and guides it through the entire lifecycle: design, planning, implementation, QA, and deployment.

**Example Main Command:**
```
/team-software-engineering:sprint "Implement a user authentication system with email and password."
```

Users can also invoke more specific commands to perform isolated tasks, such as asking the architect to design a specific component or telling the backend engineer to build a single API endpoint.
