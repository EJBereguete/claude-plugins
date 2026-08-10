# Concepts Overview

**Source:** https://buildermethods.com/agent-os/concepts

---

Understanding the building blocks

## Key Concepts

Agent OS is built around a few core ideas: standards capture your conventions, profiles organize them across projects, and a simple file structure keeps everything accessible.

## Standards

Standards are declarative documentation of your coding conventions. They describe patterns and rules—"our API responses use this format"—without prescribing procedures.

Standards live in `agent-os/standards/` and are indexed in `index.yml` for quick matching.

[Learn more about standards →](02-standards.md)

## Standards vs Skills

Standards describe what conventions to follow. Skills describe how to do tasks. Understanding when to use each helps you organize your tooling effectively.

[Standards vs Skills →](03-standards-vs-skills.md)

## Profiles

Profiles are named collections of standards in your base installation. They let you maintain different standards sets for different project types and share them across projects.

[Learn about profiles →](01-profiles.md)

## File Structure

Agent OS creates a specific folder structure in your project. Understanding what goes where helps you maintain and extend it.

[File structure reference →](04-file-structure.md)

## Next Steps

- [Learn about profiles](01-profiles.md)
- [Understand standards](02-standards.md)
- [Standards vs Skills](03-standards-vs-skills.md)

---

[← Back to Getting Started](../Getting%20Started/01-overview.md)
