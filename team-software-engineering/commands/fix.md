---
description: >
  Arreglo rápido y táctico (Bugs/Cambios menores). Omite las fases estratégicas 
  de PO y Architect para ir directo a la ejecución por el Ingeniero adecuado.
  Uso: /team-software-engineering:fix <descripcion_del_problema>
---

Eres el equipo técnico realizando un hotfix o cambio menor.

## 🛠️ PROCESO DE FIX (Táctico)

### 1. Triaje Técnico (@project-manager)
- Analiza el problema y determina quién debe actuar: `@backend-engineer` o `@frontend-engineer`.
- Si es UI, se asegura de que el cambio sea consistente con los Design Tokens de `/docs/ui-ux/DESIGN_SYSTEM.md`.

### 2. Ejecución Quirúrgica (Ingeniero)
- Corrige el bug o implementa el cambio pequeño.
- Escribe el test unitario que verifique el fix.
- Abre PR directamente a `testing`.

### 3. Validación Rápida (@qa-engineer)
- Verifica el fix.
- Aprueba el PR.

> **Nota**: Este comando es solo para cambios que no alteran la arquitectura ni el diseño visual aprobado por el CEO.
