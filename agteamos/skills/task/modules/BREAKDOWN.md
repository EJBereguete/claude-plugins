# Module: Breakdown

## CONTRACT

- **Input**: schema, requirements/design/deltas aprobados y evidencia del Shape.
- **Output full**: decisión INVEST/split y `specs/tasks.md` completo.
- **Output lite**: una task implícita en el resumen, con test de regresión.
- **Gate**: cobertura completa, tasks atómicas, jerarquía válida y DAG acíclica.
- **No hace**: crear work items externos ni implementar.

## 1. ANALIZAR IMPACTO

Confirmar con evidencia:

- capas: frontend, backend, database, auth, infrastructure, docs;
- dominios;
- complejidad: S, M, L o XL;
- disciplinas necesarias, sin activar agentes irrelevantes;
- riesgos, dependencias, incertidumbres y blast radius.

Guía:

- **S**: 1 capa, 1-2 ACs, horas.
- **M**: 1-2 capas, 3-5 ACs, aproximadamente un día.
- **L**: 2-3 capas o 5+ ACs; evaluar split.
- **XL**: 3+ capas, incertidumbre fuerte o > sprint; split obligatorio.

## 2. EVALUAR INVEST

Para cada Story propuesta:

| Criterio | Pregunta |
|---|---|
| Independent | ¿Puede entregar sin acoplamiento evitable? |
| Negotiable | ¿El diseño puede evolucionar sin perder el outcome? |
| Valuable | ¿Entrega valor o reduce un riesgo demostrable? |
| Estimable | ¿Las incógnitas están acotadas? |
| Small | ¿Cabe en un sprint y una revisión manejable? |
| Testable | ¿Tiene ACs binarios y verificables? |

Registrar `PASS`, `FAIL` o la mitigación. No dividir automáticamente una tarea
pequeña full-stack si una slice vertical sigue siendo independiente y valiosa.

## 3. DECIDIR EL PATRÓN

Elegir uno y justificarlo:

1. **No split**: S/M, cohesiva y revisable.
2. **Slices verticales/funcionalidad**: cada Story entrega valor observable.
3. **Por operación**: CRUD o flujos independientes.
4. **Happy path → errores/bordes**: solo si cada paso queda utilizable y seguro.
5. **Spike → implementación**: incertidumbre impide estimar; la implementación
   depende del resultado del Spike.
6. **Expand → Migrate → Contract**: refactor mecánico de muchos call sites.
   Contract depende de que todas las migraciones terminen.

Dividir por capa solo cuando el tracker necesita Tasks técnicas bajo una Story;
no presentar una capa aislada como valor de usuario.

Se debe dividir si:

- XL o fuera de un sprint;
- >5 ACs forman capacidades separables;
- 3+ capas no caben en una slice revisable;
- existe investigación no resuelta;
- el cambio mecánico masivo necesita fases seguras.

## 4. PRESERVAR JERARQUÍA

Modelo conceptual:

```text
Epic (outcome)
└── Feature (capacidad)
    └── Story o Bug (valor/comportamiento verificable)
        └── Task (trabajo ejecutable por una disciplina)
```

- Reutilizar padres existentes cuando el Shape lo sustente.
- Nunca inventar Epic/Feature para llenar niveles.
- Un item tiene como máximo un parent.
- Azure usa jerarquía nativa solo tras inspeccionar proceso/WITs reales.
- GitHub usa sub-issues si están disponibles; de lo contrario, degradación
  textual explícita.
- Planner usa links/checklist y declara la pérdida de jerarquía.
- Toda degradación se muestra en el draft de `agteamos-work-items`.

## 5. DEFINIR LA DAG

- IDs locales estables: `T01`, `T02`, etc.
- `depends_on` contiene solo IDs locales existentes o prerequisitos externos
  identificados.
- Una dependencia significa “no puede comenzar/terminar correctamente sin”.
- No usar dependencia solo para expresar orden preferido.
- Padres no dependen de sus hijos.
- Spike precede a implementación; Expand precede a Migrate; todas las Migrate
  preceden a Contract.

Validar ciclos antes de persistir:

1. construir aristas `dependencia → task`;
2. ejecutar orden topológico;
3. si no se visitan todas las tasks, hay ciclo;
4. mostrar la cadena del ciclo y corregirla; nunca degradarla a texto.

## 6. ESCRIBIR `tasks.md`

Solo para schema `full`. Cargar la sección `tasks.md` de `TEMPLATES.md`, no el
módulo completo por adelantado.

Cada task registra obligatoriamente:

| Campo | Regla |
|---|---|
| `id` | Único y estable dentro del cambio |
| `requirement(s)` | Uno o más IDs `R<n>`; `none` solo para closure justificada |
| `agent/discipline` | Un responsable ejecutor principal |
| `depends_on` | Lista de IDs; vacía si es independiente |
| `scope_paths` | Paths reales o `proposed:<path>` |
| `done_when` | Resultado observable/binario |
| `test_scope` | Tests existentes/propuestos y nivel |
| `doc_impact` | `true` o `false`, con docs afectadas si true |
| `status` | Inicialmente `planned` |

Además puede registrar `context_tier`, riesgos y tracker mapping, pero nunca
reemplazan los nueve campos.

Reglas de atomicidad:

- una task = una sesión/agente principal y un entregable;
- `done_when` no puede ser “código terminado”;
- `scope_paths` no usa globs amplios sin justificación;
- tests forman parte de la task que cambia comportamiento, salvo una Task QA
  E2E transversal explícita;
- documentación se planifica donde cambia el contrato;
- toda requirement y escenario crítico tiene al menos una task;
- cada delta ADDED/MODIFIED mapea a una task.

## 7. SELF-CHECK

Antes de pasar a Persist:

- [ ] La decisión split/no-split está justificada por INVEST.
- [ ] Cada Story tiene persona/valor y ACs propios.
- [ ] Cada Task tiene los nueve campos obligatorios.
- [ ] Todos los IDs de requirements y dependencias existen.
- [ ] No hay ciclos ni parent múltiple.
- [ ] Todas las requirements/deltas tienen cobertura.
- [ ] UI, seguridad, migración, rollout y docs tienen task cuando aplican.
- [ ] Los paths distinguen observed de proposed.

## SALIDA PARA PERSIST

```yaml
split: none | vertical | operation | staged | spike | expand-migrate-contract
hierarchy_intent: [<parents/hijos propuestos>]
task_ids: [T01, T02]
topological_order: [T01, T02]
external_dependencies: []
coverage:
  R1: [T01]
  R2: [T02]
```

## ANTI-PATTERNS

- Una Task por bullet genérico o por archivo sin outcome.
- “Backend, Frontend, QA” como Stories sin valor independiente.
- Dependencies bidireccionales o implícitas.
- Scope basado en paths inventados presentados como existentes.
- Tests o docs relegados a “después”.
- Crear jerarquía directamente en el proveedor.
