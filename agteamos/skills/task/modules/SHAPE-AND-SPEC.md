# Module: Shape and Spec

## CONTRACT

- **Input**: salida confirmada de Clarify.
- **Output full**: carpeta provisional con `task.yml`, `brief.md`,
  `progress.md`, requirements, design y un delta por dominio.
- **Output lite**: `task.yml`, `progress.md` y test de regresión definido.
- **Gates**: requirements aprobados; design/deltas aprobados; UI aprobada
  cuando aplica.
- **No hace**: breakdown detallado, ticket externo ni implementación.

## 1. SHAPE EXPLÍCITO: REVISAR ANTES DE PROPONER

Seguir este orden y ampliar solo cuando aparezca evidencia relevante:

1. **Repo real**: manifests, árbol focalizado, código, contratos, tests,
   configuración e historial enfocado. Registrar snapshot Git si existe.
2. **Contexto base**: leer
   `agteamos/architecture/PROJECT_CONTEXT.md`.
3. **Producto**: si existen, leer `agteamos/product/mission.md`,
   `roadmap.md`, `kpis.md` y `backlog.md`. No generar misión/roadmap solo para
   completar este paso.
4. **Dominios**: leer `agteamos/specs/index.yml` y las specs relacionadas.
   Una spec `seeded`/`partial` no prueba que lo ausente no exista: contrastar
   con el código.
5. **Trabajo e historial**: revisar cambios activos/archivados relevantes,
   ADRs, decision log y `decisions/out-of-scope/`.
6. **Standards por paths**: ejecutar
   `agteamos-knowledge --inject "<keywords del cambio>" "<disciplina>"`.
   Debe devolver **solo paths**, no contenido. Leer únicamente los paths
   devueltos y omitir con warning cualquiera inexistente.
7. **Lazy artifacts**: si un artefacto necesario figura
   `pending`, `candidate` o `stale` en `agteamos/onboarding.yml`, invocar
   `ensure-artifact(<clave>)`. Máximo una generación JIT por step; si harían
   falta varias, pedir una decisión agrupada.

Separar hallazgos como `Observed`, `Proposed` o `Pending decision`. Una ruta
citada debe existir en el snapshot o marcarse explícitamente `proposed`.

Revalidar el `problem_framing` de Clarify contra esta evidencia más profunda.
No volver a preguntar si permanece alineado. Si aparece evidencia nueva que
demuestra una diferencia material, presentar una sola comparación
stated-request/evidence/underlying-problem/consequence y volver a Clarify para
confirmar dirección; registrar el cambio para no repetir el gate.

## 2. PROPONER EL SHAPE

Presentar de forma compacta:

- problema y outcome;
- alineación o tensión con misión/roadmap;
- comportamiento actual observado;
- solución propuesta y alternativas descartadas;
- límites y no-objetivos;
- dominios/capas afectados;
- riesgos, seguridad, datos, integraciones y seams de testing;
- riesgo operativo `standard|high|critical` con señales, blast radius y
  reversibilidad;
- decisiones pendientes.

Si el shape contradice Clarify por evidencia nueva, volver a confirmar la
dirección una sola vez antes de escribir artefactos.

## 3. ELEGIR SCHEMA

Usar `full` si se cumple cualquiera:

- feature nueva;
- 2+ capas;
- contrato observable nuevo/modificado;
- nuevo endpoint, regla de negocio, permiso, dato persistido o integración;
- impacto cross-team, seguridad/compliance o múltiples dominios.

Usar `lite` solo para un cambio trivial, interno y acotado, normalmente de un
archivo, sin impacto de contrato. Requiere resumen de un párrafo y test de
regresión. Si durante el trabajo aparece un cambio observable, promover a
`full` antes de seguir.

## 4. CREAR LA CARPETA PROVISIONAL

Usar un ID libre de colisión: `tmp-<slug>`. No crear branch todavía.

```text
agteamos/changes/tmp-<slug>/
├── task.yml
├── progress.md
├── brief.md                 # solo full
├── origin-<slug>.md         # cero o más; solo cambios de dirección
└── specs/                   # solo full
    ├── requirements.md
    ├── design.md
    └── deltas/
        └── <dominio>.md
```

Inicializar `context_tier`: lite → `1`, full → `2`; solo puede subir. Capturar
owner según el mecanismo canónico de `agteamos-implement`, no preguntarlo.

Cuando se vaya a escribir un artefacto, cargar únicamente su sección en
`TEMPLATES.md`; no cargar todas las plantillas por adelantado.

## 5. PRESERVAR LA INTENCIÓN

En schema full, escribir `brief.md` antes que requirements:

- copiar el input original literalmente;
- describir problema, solución de alto nivel y out-of-scope original;
- no incluir paths ni números de línea frágiles;
- no reescribirlo después.

`## Resolution notes` es append-only para resoluciones de preguntas ya
contenidas en el brief, con fecha. Una nueva petición o cambio de dirección no
es una resolution note: crear `origin-<slug>.md` junto al brief.

Cada origin:

- es append-only y nunca reemplaza otro origen;
- copia literalmente la nueva petición;
- explica qué dirección cambia y por qué;
- lista artefactos afectados;
- registra `pending` al crearse y agrega transiciones `incorporated` o
  `superseded` al log; nunca edita entradas previas.

Antes de avanzar, revisar brief + todos los origins no incorporados. Actualizar
requirements/design/deltas/tasks mediante propuesta y aprobación; jamás hacer
que el brief “siempre hubiera dicho” lo nuevo.

## 6. REQUIREMENTS

`@product-manager` escribe comportamiento observable:

- objetivo de negocio y personas;
- requirements `R1...Rn`, cada uno con un único modal RFC 2119;
- ACs Given/When/Then que citan requirement(s), con resultados concretos;
- happy path, error, borde y permisos aplicables;
- out-of-scope, KPI solo si existe evidencia y Definition of Done;
- referencia SRS solo si `agteamos/architecture/SRS.md` existe.

No usar fórmulas tautológicas como resultado esperado. Cada requirement tiene
al menos un AC y cada AC tiene requirement.

**Gate S1**: presentar `requirements.md` completo y obtener aprobación.

## 7. DESIGN Y DELTAS

`@architect` escribe `design.md` desde requirements aprobados:

- componentes y capas reales afectados;
- flujo, datos/migraciones, integración, seguridad y rollout;
- decisiones y alternativas;
- seams de testing exactos;
- riesgos y ADRs requeridos;
- standards aplicados, citados por path.

Determinar dominios exactos contra `agteamos/specs/index.yml`. Un nombre
desconocido requiere confirmar dominio nuevo vs typo.

Por cada dominio, escribir `specs/deltas/<dominio>.md`:

- `ADDED`: requirement nuevo completo;
- `MODIFIED`: nombre exacto y bloque nuevo completo;
- `REMOVED`: nombre exacto y razón;
- o `Sin cambios en la spec maestra`.

Cada ADDED/MODIFIED incluye escenarios. No editar la spec maestra; el sync de
`agteamos-implement` la aplica después.

Recalcular complejidad y subir `context_tier` a `3` para L/XL, 2+ dominios,
seguridad/compliance o contrato cross-repo. Registrar el motivo en
`progress.md`.

**Gate S2**: presentar design + deltas y obtener aprobación antes de código.

## 8. UI APPROVAL

Si Frontend cambia visualmente:

1. asegurar/leer `agteamos/design/DESIGN_SYSTEM.md` mediante
   `ensure-artifact(design_system)` si corresponde;
2. proponer wireframe/Mermaid/imagen consistente con patrones observados;
3. describir estados normal, loading, empty, error, responsive y accesibilidad;
4. pedir aprobación explícita;
5. ajustar y volver a presentar si se rechaza.

**Regla absoluta**: ningún código UI antes de aprobación. Si no hay cambio
visual, registrar `ui_approval: not-applicable`.

## SALIDA PARA BREAKDOWN

```yaml
schema: full | lite
change_path: agteamos/changes/tmp-<slug>
requirements: [R1, R2]
domains: [<dominio>]
layers: [frontend, backend, database, infrastructure]
complexity: S | M | L | XL
context_tier: 1 | 2 | 3
risk: standard | high | critical
risk_reason: <evidencia y reversibilidad>
origins_pending: []
ui_approval: approved | not-applicable
```

## ANTI-PATTERNS

- Diseñar desde memoria antes de abrir repo/contexto.
- Volcar todos los standards al contexto.
- Crear un full vacío o un lite que cambia contrato.
- Reescribir brief o reutilizar Resolution notes para una dirección nueva.
- Inventar dominios, KPIs, paths o componentes.
- Escribir un delta en prosa sin anclas `### Requirement:`.
- Diseñar tests sin seam acordado.
