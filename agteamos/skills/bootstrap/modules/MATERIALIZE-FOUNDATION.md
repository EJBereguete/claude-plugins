# Materialize approved foundation

Carga este módulo solo con un blueprint consolidado aprobado. Escribe
exclusivamente sus rutas y valores aprobados; si hace falta cambiar una
decisión material, vuelve a `DISCOVERY-AND-BLUEPRINT.md`.

## 1. Arquitectura y decisión inicial

Crear:

- `agteamos/architecture/PROJECT_CONTEXT.md`: producto, diagrama, stack
  justificado, componentes, límites, concerns transversales y tabla de
  comandos canónicos reales (`test`, `lint/typecheck`, `build`, `dev`,
  `migrate` si aplica).
- `agteamos/architecture/adr/ADR-001-stack-selection.md`: contexto,
  alternativas, decisión aprobada, consecuencias y estado.

No inventar comandos. Deben corresponder al scaffold aprobado y serán la
fuente de verify para trabajo futuro.

ADRs de modelo de datos, auth u otras decisiones futuras quedan `pending` en
onboarding con su trigger. No documentar como decidido lo que aún no tiene
evidencia.

## 2. Producto lean

Crear:

- `agteamos/product/mission.md`: problema/outcome, visión, personas, MVP,
  out-of-scope y Definition of Done del producto;
- `agteamos/product/kpis.md`: métricas aprobadas o una nota explícita
  `pending` con trigger antes del primer deploy a producción;
- `agteamos/product/roadmap.md`: Phase 0 foundation, Phase 1 outcomes MVP y
  post-MVP como propuestas, sin IDs ni tickets fabricados.

Si hubo premortem aprobado, incluir riesgos aceptados. No crear
`product/backlog.md`: solo lo materializa `agteamos-capture` cuando el usuario
pide guardar/importar/gestionar backlog.

## 3. Market research aprobado

Crear `agteamos/product/market-research.md` únicamente si existe aprobación
explícita sobre su contenido exacto. Conservar fuentes, fechas, confidence y
las etiquetas `External`, `Observed`, `Proposed`, `Pending decision`.

Si fue declinado/no aplicable, no crear placeholder. Si se investigó pero no
se aprobó persistir, queda solo en conversación.

## 4. SRS formal opt-in

Solo si el blueprint lo aprobó por necesidad contractual, académica o
regulada:

1. cargar `../srs-template.md`;
2. crear `agteamos/architecture/SRS.md`;
3. asignar `RF-XXX` únicos y matriz inicialmente pendiente;
4. si se pidieron items externos, delegar a `agteamos-work-items` con
   inspect-repo/tracker, dry-run, aprobación y read-back.

No crear SRS por defecto. Una aprobación local del blueprint no autoriza
mutaciones externas.

## 5. Checkpoint

Registrar las rutas creadas y comparar hashes/contenido esencial con el
blueprint aprobado. No hacer commit/push automático. Luego cargar
`SCAFFOLD-AND-HANDOFF.md`.
