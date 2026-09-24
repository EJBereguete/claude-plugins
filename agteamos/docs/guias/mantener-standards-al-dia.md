# Mantener los standards al día (`agteamos-project-docs`)

`agteamos/standards/` es donde AgTeamOS deja constancia de qué convenciones de código realmente aplica tu proyecto — no un genérico copiado del plugin, sino el resultado de leer tu código real y compararlo contra los 7 temas base. Ver el diseño completo en [Capa de standards](../conceptos/filosofia-y-arquitectura.md#capa-de-standards); esta guía es la referencia operativa de cuándo y cómo correr la skill.

## Cuándo correrla

- Automáticamente, como parte de `agteamos-project-docs` la primera vez que se documenta un proyecto con código existente.
- A demanda, cuando quieras: `/agteamos-project-docs`.
- **Cuándo re-ejecutarla**: después de un cambio de stack relevante (nuevo framework, migración de ORM), después de resolver una desviación documentada (`status: deviates` → ya corregida), o periódicamente como parte de una auditoría (`agteamos-quality` la puede disparar si los estándares no se revisaron en mucho tiempo).

## Qué hace

1. Detecta el stack real leyendo `package.json`/`requirements.txt`/`*.csproj` y el árbol de carpetas.
2. Compara cada uno de los 11 temas contra el código real y clasifica en tres categorías.
3. Pregunta explícitamente si el equipo tiene convenciones propias no cubiertas por el plugin.
4. Escribe `agteamos/standards/<tema>/README.md` + `examples.md` (+ `deviations.md` si aplica).
5. Genera el manifest `agteamos/standards/standards.yml` y el índice `agteamos/standards/index.yml`.

## Las tres categorías

| Categoría | `status:` | Significa |
|---|---|---|
| Aplica | `applies` | El proyecto ya sigue la regla (o debería, sin razón para desviarse), confirmado con evidencia suficiente |
| Aplica adaptado | `adapted` | La regla general aplica pero necesita ajuste al stack real del proyecto |
| Se desvía | `deviates` | El proyecto contradice la regla por una razón real, confirmada con el usuario y documentada — nunca como "pendiente" sin más |

## La regla del confidence score

Cada `agteamos/standards/<tema>/README.md` lleva un header de proveniencia:

```markdown
# Estándar: API Design

**Estado**: EXTRACTED           <!-- STUB | EXTRACTED | DESIGN-DERIVED | CREATED | UPDATED -->
**Confidence**: 5/5              <!-- 1-5, mínimo 4 para status: applies -->
**Aplicación**: ADAPTADO — aplica con ajuste al stack real del proyecto (FastAPI + React)
**Fuentes revisadas**: src/api/routers/*.py (12 archivos), openapi.yml
**Última revisión**: 2026-08-09
**Referencia del plugin**: standards/api-design/README.md
```

**Regla dura, sin excepción**: no se marca `status: applies` en `standards.yml` con `Confidence` menor a 4/5. Si no se leyó suficiente código real para llegar a esa confianza, el tema queda en `adapted` con un `Confidence` más bajo y una nota explícita de qué falta revisar — nunca se declara "vigente" por similitud de nombre de framework o por default.

Significado de `Estado`:

| Estado | Cuándo se usa |
|---|---|
| `STUB` | Carpeta creada, evidencia todavía insuficiente |
| `EXTRACTED` | La regla se extrajo leyendo código real del proyecto |
| `DESIGN-DERIVED` | Sin código que lo confirme/contradiga aún, derivado de decisiones ya tomadas (ADRs) |
| `CREATED` | Estándar propio del equipo, no existía en el plugin |
| `UPDATED` | Revisión posterior que actualizó una versión anterior |

## `standards.yml` — el manifest

```yaml
generated_at: 2026-08-09
stack_detected: [python-fastapi, typescript-react]
standards:
  - topic: api
    status: adapted
    folder: api/
    last_checked: 2026-08-09
  - topic: security
    status: deviates
    folder: security/
    last_checked: 2026-08-09
    deviation_reason: "MFA pendiente, trackeado como deuda tecnica"
custom_standards: []
```

`agteamos-dashboard` lee este archivo para mostrar un contador tipo "8/11 estándares aplicando, 2 adaptados, 1 con desviación".

## `index.yml` — encontrar el estándar relevante sin escanear todo

```yaml
api: api/
rest: api/
auth: security/
jwt: security/
migrations: database/
postgres: database/
react: frontend/
component: frontend/
```

Se regenera junto con `standards.yml`, en el mismo paso, siempre que corre `agteamos-project-docs`.

## Errores comunes a evitar

- Copiar el `README.md` del plugin literal, sin adaptar al proyecto real — no aporta nada sobre leer el árbol del plugin directamente.
- Marcar `status: deviates` sin haber preguntado al usuario si es intencional.
- Marcar `status: applies` con `Confidence` menor a 4/5.
- Escribir `standards.yml` fuera de `agteamos/standards/` (en la raíz de `agteamos/`, por ejemplo).
- Correr esta skill en un repo vacío — para eso está `agteamos-new-project`/`agteamos-setup`, no `agteamos-project-docs`.
