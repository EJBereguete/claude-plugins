# AgTeamOS — Documentación

Bienvenido a la documentación completa del plugin `agteamos` para Claude Code. Está organizada en 4 categorías según qué está buscando la persona que lee (principio Diátaxis: tutorial / guía práctica / explicación / referencia).

## Primeros pasos — aprender haciendo, en orden

| Documento | Descripción |
|-----------|-------------|
| [01 — Instalación](./primeros-pasos/01-instalacion.md) | Marketplace, `/plugin install`, primer chequeo |
| [02 — Tu primer proyecto](./primeros-pasos/02-primer-proyecto.md) | Recorrido guiado: `agteamos-setup` → `agteamos-new-project` → `agteamos-new-task` → `agteamos-implement` → `agteamos-close-task` |
| [03 — Compartir con tu equipo](./primeros-pasos/03-compartir-con-tu-equipo.md) | Instalación personal vs. forzada por proyecto |
| [04 — Adoptar un proyecto existente](./primeros-pasos/04-adoptar-proyecto-existente.md) | `agteamos-onboard` en un repo con código ya escrito |

## Guías — resolver una tarea puntual

| Documento | Descripción |
|-----------|-------------|
| [Configurar la plataforma](./guias/configurar-la-plataforma.md) | `agteamos-setup` y `platform.yml`, incluyendo `handoff_mode` |
| [Crear y cerrar una tarea](./guias/crear-y-cerrar-una-tarea.md) | `agteamos-new-task` → `agteamos-implement` → `agteamos-close-task`, consulta rápida |
| [Mantener los standards al día](./guias/mantener-standards-al-dia.md) | `agteamos-standards`, confidence score, cuándo re-ejecutar |
| [Ejecutar una auditoría](./guias/ejecutar-una-auditoria.md) | `agteamos-audit`, Radar de Deuda Técnica |

## Conceptos — por qué está diseñado así

| Documento | Descripción |
|-----------|-------------|
| [Filosofía y arquitectura](./conceptos/filosofia-y-arquitectura.md) | Qué es, qué problema resuelve, mapa de agentes |
| [SDD y specs maestras](./conceptos/sdd-y-specs-maestras.md) | Los 4 artefactos, esquema `full`/`lite`, deltas, `changes/` |
| [Capa de standards](./conceptos/capa-de-standards.md) | Standards base del plugin vs. `agteamos/standards/` del proyecto |
| [Context Engineering](./conceptos/context-engineering.md) | Persistencia entre sesiones, context tiers, handoffs |

## Referencia — consulta rápida, no se lee de corrido

| Documento | Descripción |
|-----------|-------------|
| [Catálogo de skills](./referencia/catalogo-de-skills.md) | Las 38 skills, con prefijo `agteamos-` |
| [Matriz de agentes y skills](./referencia/matriz-agentes-y-skills.md) | Detalle de los 9 agentes y quién usa qué skill |
| [Estructura de carpetas](./referencia/estructura-de-carpetas.md) | El árbol completo `agteamos/` que se instala en tu proyecto |

---

> Plugin version: 1.0.0 | Compatible con Claude Code >= 1.0
