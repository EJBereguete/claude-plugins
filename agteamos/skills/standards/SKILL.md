---
name: agteamos-standards
description: >
  Lee el codigo real del proyecto y lo compara contra los 11 estandares base
  empaquetados en el plugin (standards/<tema>/README.md, uno por tema, con
  sus ejemplos adentro), determina que aplica, que se adapta y que se desvia,
  pregunta al usuario si quiere agregar estandares propios, y escribe
  agteamos/standards/<tema>/README.md + examples.md + deviations.md junto
  con el manifest agteamos/standards/standards.yml y el indice
  agteamos/standards/index.yml. Distinto de agteamos-onboard (genera
  agteamos/ completo la primera vez) — agteamos-standards es la skill que
  hace el trabajo de "convention-detection" contra el codigo real.
used_by:
  - architect
---

# Skill: Standards (agteamos-standards)

## CONTRACT

- **Input**: código del proyecto ya existente (repo no vacío) + los 11 estándares base del plugin, reorganizados por tema en `standards/` (`standards/api-design/README.md`, `standards/clean-architecture/README.md`, `standards/solid-principles/README.md`, `standards/dry-kiss-yagni/README.md`, `standards/domain-driven-design/README.md`, `standards/database/README.md`, `standards/testing/README.md`, `standards/frontend/README.md`, `standards/git/README.md`, `standards/security/README.md`, `standards/devops/README.md`), cada carpeta con sus ejemplos por stack adentro (`examples/{csharp,python,typescript}.md`)
- **Output**: `agteamos/standards/<tema>/README.md` + `examples.md` (+ `deviations.md` solo si hay desviaciones), por tema, más `agteamos/standards/standards.yml` (manifest) y `agteamos/standards/index.yml` (keyword→carpeta)
- **Trigger**: `@architect` la ejecuta a demanda, o como parte de `agteamos-onboard` cuando el repo tiene código existente
- **Quién ejecuta**: `@architect` (dueño conceptual de las reglas de arquitectura en `standards/` y de `agteamos-adr`)

---

## POR QUÉ EXISTE ESTA SKILL

`standards/` es un árbol de 11 carpetas por tema (reglas + ejemplos de código real
por stack) que viene empaquetado con el plugin, pero antes de esta skill no estaba
conectado a ningún flujo — ningún agente lo leía ni lo aplicaba a un proyecto
concreto. Esta skill es el puente: lee las reglas generales del plugin y determina
cuáles aplican literalmente, cuáles necesitan adaptación, y cuáles el proyecto ya
contradice por una razón válida (framework legacy, decisión de equipo documentada,
etc.) — y deja constancia de qué tan segura está esa determinación (`Confidence`).

---

## PROCESS

### Step 1 — Detectar el stack real del proyecto

Leer `package.json`/`requirements.txt`/`*.csproj` (o equivalente), el árbol de
carpetas real, y `agteamos/architecture/PROJECT_CONTEXT.md` si existe. Determinar:
lenguaje(s), framework(s) principal(es), ORM/query builder, framework de testing.
Este resultado alimenta el campo `stack_detected` de `standards.yml` (Step 6).

### Step 2 — Comparar contra cada tema de `standards/` del plugin

Para cada una de las 11 carpetas de tema, evaluar tres categorías:

```
APLICA (status: applies)    → el proyecto ya sigue esta regla, o no la sigue pero
                                debería (sin razón documentada para desviarse), Y
                                se leyó código real suficiente para confirmarlo
                                con Confidence 4 o 5
APLICA ADAPTADO (status: adapted) → la regla general aplica pero necesita ajuste
                                al stack real (ej. `git/README.md` define branch
                                naming — adaptar al branch_strategy real definido
                                en platform.yml)
SE DESVIA (status: deviates)  → el proyecto contradice la regla por una razón
                                real — preguntar al usuario si la desviación es
                                intencional y documentarla como tal, no como
                                "pendiente de corregir"
```

**Regla dura (sin excepción)**: NO se marca `status: applies` en `standards.yml`
con `Confidence` menor a 4/5. Si no se pudo leer suficiente código real para
llegar a esa confianza, el tema queda como `adapted` con `Confidence` más bajo
y una nota de qué falta revisar — nunca se declara "vigente" por default o por
similitud de nombre de framework. No asumir cuál categoría aplica sin evidencia.

### Step 3 — Preguntar por estándares propios del equipo

Antes de escribir el resultado final, preguntar explícitamente:

```
"¿Tu equipo tiene convenciones propias que no están en los 11 estándares
del plugin (ej. una guía de estilo interna, un documento de arquitectura
previo, reglas de un tech lead anterior)? Si las tienes, compárteme la
fuente (archivo, URL, o pégalas aquí) y las incorporo a
agteamos/standards/ junto con las del plugin, como custom_standards."
```

Si el usuario aporta estándares propios, estos tienen prioridad sobre los del
plugin en caso de conflicto — documentar el conflicto y la resolución, y
agregarlos a `custom_standards` en `standards.yml` (Step 6).

### Step 4 — Escribir `agteamos/standards/<tema>/`

Una carpeta por tema — todo lo relacionado a ese tema vive junto, no archivos
sueltos y un manifest aparte:

```
agteamos/standards/
├── standards.yml          ← manifest (Step 6, DENTRO de standards/, no en la raíz de agteamos/)
├── index.yml               ← keyword→carpeta (Step 7)
├── api/
│   ├── README.md            ← reglas adaptadas de standards/api-design/README.md del plugin, a ESTE proyecto
│   ├── examples.md           ← ejemplos reales tomados del código del proyecto (no genéricos)
│   └── deviations.md         ← solo si hay desviaciones (opcional)
├── git/README.md
├── security/README.md
├── testing/README.md
├── database/README.md
├── frontend/README.md         ← omitir si el proyecto no tiene frontend
├── clean-architecture/README.md
├── solid-principles/README.md
├── dry-kiss-yagni/README.md
├── domain-driven-design/README.md   ← omitir si el proyecto no usa DDD
└── devops/README.md
```

**Plantilla de `agteamos/standards/<tema>/README.md`** (header de proveniencia
obligatorio arriba del todo, antes de cualquier regla concreta):

```markdown
# Estándar: API Design

**Estado**: EXTRACTED           <!-- STUB | EXTRACTED | DESIGN-DERIVED | CREATED | UPDATED -->
**Confidence**: 5/5              <!-- 1-5, minimo 4 para status: applies en standards.yml -->
**Aplicación**: ADAPTADO — aplica con ajuste al stack real del proyecto (FastAPI + React)
**Fuentes revisadas**: src/api/routers/*.py (12 archivos), openapi.yml
**Última revisión**: 2026-08-05
**Referencia del plugin**: standards/api-design/README.md

## Cómo aplica en este proyecto
[reglas concretas, con el nombre real de archivos/carpetas del proyecto, no genérico]

## Desviaciones (si las hay)
Ver deviations.md
```

Significado de `Estado`:
- **STUB**: carpeta creada pero sin evidencia suficiente todavía (Confidence bajo).
- **EXTRACTED**: la regla se extrajo leyendo código real del proyecto.
- **DESIGN-DERIVED**: no hay código real que la contradiga o confirme aún, se derivó de decisiones de diseño ya tomadas (ej. ADRs).
- **CREATED**: estándar propio del equipo, no existía en el plugin.
- **UPDATED**: revisión posterior que actualizó una versión anterior de este README.

`examples.md` contiene fragmentos de código real del proyecto (no del plugin) que
ilustran la regla en la práctica. `deviations.md` solo se crea si `Step 2`
determinó `status: deviates` para ese tema, con la razón documentada por el usuario.

### Step 5 — Reportar desviaciones no resueltas

Si algo quedó en `status: deviates` sin una razón clara del usuario, listarlo
explícitamente en el reporte final como deuda técnica candidata para `agteamos-audit`.

### Step 6 — Generar/actualizar `agteamos/standards/standards.yml`

Manifest estructurado, DENTRO de `standards/` (no en la raíz de `agteamos/`):

```yaml
generated_at: 2026-08-05
stack_detected: [python-fastapi, typescript-react]
standards:
  - topic: api
    status: adapted          # applies | adapted | deviates
    folder: api/
    last_checked: 2026-08-05
  - topic: security
    status: deviates
    folder: security/
    last_checked: 2026-08-05
    deviation_reason: "MFA pendiente, trackeado como deuda tecnica"
custom_standards: []          # estandares propios del equipo, agregados por el usuario
```

Se regenera cada vez que se ejecuta esta skill (no en cada tarea individual).
`agteamos-dashboard` lee este archivo para mostrar un contador tipo
"8/11 estándares aplicando, 2 adaptados, 1 con desviación".

### Step 7 — Generar/actualizar `agteamos/standards/index.yml`

Índice liviano que mapea keyword→carpeta, para que un agente (o una persona)
encuentre el estándar relevante sin escanear las ~11 carpetas:

```yaml
# agteamos/standards/index.yml
api: api/
rest: api/
endpoints: api/
auth: security/
jwt: security/
mfa: security/
migrations: database/
postgres: database/
sql: database/
react: frontend/
component: frontend/
branch: git/
commit: git/
pytest: testing/
vitest: testing/
solid: solid-principles/
ddd: domain-driven-design/
docker: devops/
ci: devops/
```

Se regenera junto con `standards.yml` en el mismo Step 6, siempre que corre
esta skill — nunca en cada tarea.

**Próximo paso sugerido**: ejecutar la skill `agteamos-docs` para verificar que el
resto del esquema `agteamos/` está completo y sincronizado con lo que
`agteamos-standards` acaba de generar.

---

## EJEMPLO

```
Proyecto: FastAPI + SQLAlchemy + React, sin capas explícitas (todo en un
único módulo `app/main.py` de 2000 líneas).

Resultado:
- clean-architecture/ → status: deviates, Confidence 5/5. El proyecto no separa
  domain/application/infrastructure. Pregunta al usuario: "¿es intencional
  (prototipo, MVP rápido) o deuda a resolver?" → Usuario responde "deuda,
  vamos a refactorizar antes del release 2.0" → se documenta en deviations.md
  como deuda técnica, no como estándar vigente.
- git/ → status: adapted, Confidence 5/5. El repo usa `main` únicamente
  (branch_strategy: personal en platform.yml) — se documenta el flujo de
  branching real en README.md, no el de "equipo" que describe el estándar
  genérico del plugin.
- security/ → status: applies, Confidence 5/5. Ya usa Pydantic para
  validación, variables de entorno para secrets, HTTPS en prod — confirmado
  leyendo src/api/dependencies.py y .env.example.
- frontend/ → status: adapted, Confidence 3/5 (no se revisó suficiente código
  React todavía) — NO se marca applies aunque "parezca" que sigue el
  estándar, por la regla dura de Confidence mínimo 4.
```

---

## ANTI-PATTERNS

- Copiar `standards/<tema>/README.md` del plugin literal a `agteamos/standards/<tema>/README.md` sin adaptar al proyecto real — esto no aporta valor sobre simplemente leer el árbol del plugin directamente.
- Marcar algo como `status: deviates` (intencional) sin haber preguntado al usuario — solo el usuario puede confirmar que una desviación es intencional.
- Marcar `status: applies` con `Confidence` menor a 4/5 — viola la regla dura de esta skill; si la evidencia es insuficiente, el tema se queda en `adapted` con Confidence bajo hasta revisar más código.
- Escribir `standards.yml` en la raíz de `agteamos/` en vez de dentro de `agteamos/standards/`.
- Regenerar `index.yml` a mano sin que coincida con las carpetas reales de `standards.yml` — ambos se regeneran juntos, en el mismo paso.
- Ejecutar esta skill en un repo vacío — para eso existe `agteamos-new-project`/`agteamos-setup`, no `agteamos-standards`.
