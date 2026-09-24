# AgTeamOS — Documentación

Bienvenido a la documentación completa del plugin `agteamos` para Claude Code. Está organizada en 4 categorías según qué está buscando la persona que lee (principio Diátaxis: tutorial / guía práctica / explicación / referencia).

## Primeros pasos — aprender haciendo, en orden

| Documento | Descripción |
|-----------|-------------|
| [01 — Quickstart](./primeros-pasos/01-quickstart.md) | Instalación (marketplace, `/plugin install`) + recorrido guiado de tu primer proyecto: `agteamos-setup` → `agteamos-new-project` → `agteamos-new-task` → `agteamos-implement` |
| [03 — Compartir con tu equipo](./primeros-pasos/03-compartir-con-tu-equipo.md) | Instalación personal vs. forzada por proyecto |
| [04 — Adoptar un proyecto existente](./primeros-pasos/04-adoptar-proyecto-existente.md) | `agteamos-project-docs --init` en un repo con código ya escrito |

## Guías — resolver una tarea puntual

| Documento | Descripción |
|-----------|-------------|
| [Configurar la plataforma](./guias/configurar-la-plataforma.md) | `agteamos-setup` y `platform.yml`, incluyendo `handoff_mode` |
| [Crear y cerrar una tarea](./guias/crear-y-cerrar-una-tarea.md) | `agteamos-new-task` → `agteamos-implement`, consulta rápida |
| [Mantener los standards al día](./guias/mantener-standards-al-dia.md) | `agteamos-project-docs --topic`, confidence score, cuándo re-ejecutar |
| [Ejecutar una auditoría](./guias/ejecutar-una-auditoria.md) | `agteamos-quality` (modo auditoría integral), Radar de Deuda Técnica |

## Conceptos — por qué está diseñado así

| Documento | Descripción |
|-----------|-------------|
| [Filosofía y arquitectura](./conceptos/filosofia-y-arquitectura.md) | Qué es, qué problema resuelve, mapa de agentes, y la capa de standards (base del plugin vs. `agteamos/standards/` del proyecto) |
| [SDD y specs maestras](./conceptos/sdd-y-specs-maestras.md) | Los 4 artefactos, esquema `full`/`lite`, deltas, `changes/` |
| [Context Engineering](./conceptos/context-engineering.md) | Persistencia entre sesiones, context tiers, handoffs |

## Referencia — consulta rápida, no se lee de corrido

| Documento | Descripción |
|-----------|-------------|
| [Agentes y skills](./referencia/agentes-y-skills.md) | Las 22 skills por skill y por agente — los 8 agentes y quién usa qué |
| [Estructura de carpetas](./referencia/estructura-de-carpetas.md) | El árbol completo `agteamos/` que se instala en tu proyecto |

---

> Decisiones de diseño grandes del propio plugin (no del proyecto consumidor): ver [`../DECISIONS.md`](../DECISIONS.md).

---

> Plugin version: 2.0.0 | Compatible con Claude Code >= 1.0
