---
name: agteamos-docs
description: >
  Mantenimiento continuo del esquema agteamos/ canonico (distinto de
  agteamos-onboard, que es la generacion inicial pesada de un proyecto
  existente). Recorre el esquema completo, reporta que falta o esta
  desactualizado, y ofrece regenerar solo lo obsoleto. Incluye el estandar
  de estilo y plantillas de documentacion (diagramas Mermaid obligatorios,
  estructura de ADRs, documentacion centrada en codigo) heredado de la
  antigua skill documentation-skill.
used_by:
  - architect
  - product-owner
---

# Skill: Docs (agteamos-docs)

## CONTRACT

- **Input**: ninguno explícito — se ejecuta a demanda ("¿está `agteamos/` al día?") o periódicamente
- **Output**: reporte de gaps/desactualización + regeneración de lo obsoleto (con confirmación del usuario antes de sobreescribir)
- **Trigger**: `@architect` o `@product-owner` lo ejecutan a demanda; distinto de `agteamos-onboard` (que se ejecuta una sola vez, al inicio, sobre un repo con código pero sin `agteamos/`)
- **Diferencia con `agteamos-onboard`**: `agteamos-onboard` genera `agteamos/` completo desde cero vía ingeniería inversa. `agteamos-docs` asume que `agteamos/` ya existe parcialmente y hace mantenimiento incremental — detecta qué se desactualizó desde la última pasada.

---

## PROCESS

### Step 1 — Recorrer el esquema canónico completo

```
agteamos/
├── platform.yml                      configuración de la plataforma (skill `agteamos-setup`)
├── dashboard.html                     reporte general (skill `agteamos-dashboard`)
├── product/                           mission.md, roadmap.md, kpis.md
├── architecture/                      PROJECT_CONTEXT.md, ARCHITECTURE.md, adr/
├── api/                               openapi.yml, endpoints.md
├── design/                            DESIGN_SYSTEM.md, mockup-v<n>.png
├── devops/                            INFRASTRUCTURE.md, DORA_METRICS.md, SLO.md, prr/
├── security/                          AUDIT-YYYY-MM-DD.md, threat-models/
├── incidents/                         post-mortems/, runbooks/, playbooks/
├── decisions/                         decision-log.md, rfcs/
├── standards/                         standards.yml, index.yml, <tema>/README.md (salida de `agteamos-standards`)
├── specs/<dominio>.md                 capa de specs maestras — ver `agteamos-sdd-protocol`
└── changes/                           activas y changes/archive/ (cerradas)
```

Para cada carpeta: ¿existe? ¿tiene al menos el archivo mínimo esperado? ¿la fecha
de última modificación del archivo es anterior al último cambio relevante en el
código (ej. `openapi.yml` más viejo que el router más reciente)?

### Step 2 — Clasificar cada gap

```
FALTA POR COMPLETO   → la carpeta/archivo no existe en absoluto
DESACTUALIZADO        → existe pero el código real ya no coincide
                         (ej. PROJECT_CONTEXT.md menciona un stack que ya no se usa)
OK                    → existe y está sincronizado
N/A                   → no aplica a este proyecto (ej. design/ en una API pura)
```

### Step 3 — Reportar antes de regenerar

Mostrar la tabla completa de gaps al usuario. NUNCA regenerar sin confirmación
explícita — algunos archivos (`ARCHITECTURE.md`, `decision-log.md`) pueden tener
contexto histórico valioso que una regeneración automática destruiría.

### Step 4 — Regenerar solo lo confirmado

Regenerar únicamente los archivos que el usuario aprobó. Para archivos con
historial (ADRs, decision-log, RFCs) — nunca sobreescribir, solo agregar
entradas nuevas (ver `agteamos-adr`, `agteamos-rfc`).

**Próximo paso sugerido**: si el reporte encontró que `agteamos/standards/` está
vacío o muy desactualizado, sugerir ejecutar `agteamos-standards`. Si todo está
al día, no hay próximo paso — el ciclo de mantenimiento termina aquí hasta la
siguiente pasada.

---

## ESTILO Y PLANTILLAS DE DOCUMENTACIÓN

*(heredado de la antigua skill `documentation-skill`, fusionada aquí)*

### Diagramas Mermaid — obligatorios para lo no-trivial

Todo cambio arquitectónico, flujo de usuario o lógica de negocio compleja debe
incluir un diagrama Mermaid — no se aceptan descripciones puramente textuales
para procesos que pueden visualizarse:

| Tipo de contenido | Diagrama Mermaid |
|---|---|
| Flujo de usuario / lógica de navegación | `graph TD` |
| Interacción entre componentes (API FE↔BE) | `sequenceDiagram` |
| Arquitectura de sistema / infraestructura | `graph LR` o `C4Component` |
| Modelado de datos / esquema de BD | `erDiagram` |
| Estados de un componente de UI complejo | `stateDiagram-v2` |

### ADRs — estructura mínima

Ver la skill `agteamos-adr` para el protocolo completo (numeración, índice,
inmutabilidad). Resumen rápido de la estructura: Título, Contexto, Decisión,
Alternativas consideradas, Consecuencias.

### Documentación centrada en el código

- El código debe ser autoexplicativo — los nombres de variables/funciones explican el *qué*.
- Los docstrings/comentarios explican el *por qué* y los edge cases no evidentes — no repiten lo que el código ya dice.
- El `README.md` raíz del proyecto es la puerta de entrada, con links a `agteamos/`, no un duplicado de su contenido.

### Definition of Done — documentación

- [ ] ¿El PR incluye o actualiza la documentación necesaria (no solo código)?
- [ ] ¿Se incluyó un diagrama Mermaid para flujos/arquitectura compleja?
- [ ] ¿Si hubo una decisión técnica significativa, se creó un ADR (`agteamos-adr`)?
- [ ] ¿Los docstrings/comentarios son precisos y explican el *por qué*, no el *qué*?

---

## ANTI-PATTERNS

- Regenerar `agteamos/` completo cuando solo un archivo está desactualizado — usar `agteamos-docs` para mantenimiento incremental, no como un `agteamos-onboard` disfrazado.
- Sobreescribir ADRs, RFCs o decision-log en vez de agregar entradas nuevas — estos son append-only por diseño.
- Reportar "todo OK" sin haber comparado contra el código real (ej. sin abrir `openapi.yml` y compararlo contra los routers reales).
