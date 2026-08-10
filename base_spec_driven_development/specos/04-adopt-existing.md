# Adopting in an Existing Project

If your project already has code, `/spec-os-init` detects this and enters Adopt mode automatically. You don't need to pass any flags.

## What Adopt mode does

Instead of creating empty stubs, Adopt mode:
- Scans your codebase to propose domain boundaries from existing namespaces, modules, and bounded contexts
- Seeds domain spec stubs from what it finds in your code — entities, patterns, and behaviors observed in the existing implementation
- Proposes a replacement `CLAUDE.md` for your approval — never overwrites without explicit confirmation

## Example

```text
You: /spec-os-init

AI:  Detecting mode...
     Existing source files found. Mode: ADOPT

     Codebase analysis:
       Detected stack: dotnet + nextjs
       Domain candidates: Equipment (14 files), Maintenance (8 files), Auth (6 files)
       Existing CLAUDE.md: found

     Proposed domains:
       - equipment: Equipment.cs, EquipmentService.cs, EquipmentController.cs ...
       - maintenance: MaintenanceRecord.cs, MaintenanceService.cs ...
       - auth: AuthController.cs, TokenService.cs ...
     Confirm or adjust?

You: y

AI:  Created:
     spec-os/config.yaml
     spec-os/specs/equipment/spec.md  (seeded from 14 files)
     spec-os/specs/maintenance/spec.md
     spec-os/specs/auth/spec.md
     spec-os/specs/_index.md
     spec-os/standards/  (stubs — run /spec-os-discover to populate)
     CLAUDE.md (proposed — review before accepting)
```

## After adoption

1. Review the seeded `spec-os/specs/{domain}/spec.md` files — they're drafts, not authoritative
2. Run `/spec-os-discover` to extract your actual coding conventions into standards
3. Fill any gaps in the domain specs with known system behavior

## Next Steps

← [Back to Installation](02-installation.md)

- [Discover Standards](../Workflow/02-setup.md) — extract conventions from your codebase
- [Workflow Overview](../Workflow/01-workflow-overview.md) — start building features
