# Discovery and consolidated blueprint

Carga este módulo solo durante `DISCOVERY` y `BLUEPRINT`. No escribas
artefactos del proyecto ni scaffold hasta aprobar el blueprint consolidado.

## 1. Contexto mínimo y problem framing

Leer primero la petición literal, `agteamos/platform.yml` y cualquier archivo
real que ya exista en el repo. Clasificar:

- `External`: evidencia pública con fuente y fecha;
- `Observed`: pedido, repo o decisión ya confirmada;
- `Proposed`: inferencia/recomendación del equipo;
- `Pending decision`: decisión humana realmente faltante.

Presentar este framing compacto:

```markdown
## Problem framing
- Stated request: <qué pidió literalmente>
- Intended users/outcome: <observed o pending>
- Evidence available: <hechos y fuentes>
- Underlying problem hypothesis: <proposed, no hecho>
- Alignment: aligned | material mismatch
- Consequence if wrong: <qué se construiría equivocadamente>
```

Si la hipótesis del problema real difiere materialmente del pedido, explicar
la evidencia y pedir **una sola confirmación de dirección** antes de diseñar.
Si están alineados, continuar sin añadir un gate. No diagnosticar al usuario
ni convertir una intuición en “problema real”.

## 2. Decisiones faltantes, no cuestionario fijo

Resolver hechos por lectura. Preguntar en una ronda agrupada solo las
decisiones que bloquean el blueprint, con recomendación y razón:

- outcome, usuarios y límites del MVP;
- restricciones duras de stack/operación;
- obligaciones de seguridad, privacidad, regulación o accesibilidad;
- proveedor/branching solo si setup todavía los dejó sin resolver;
- SRS formal solo si hay señal contractual/regulada.

Integraciones, escala o deploy que no afecten el scaffold actual se difieren a
su primer trabajo real. No preguntar tecnologías que el usuario ya decidió ni
crear backlog como forma de aclarar el MVP.

## 3. Market research opt-in

Ofrecerlo una sola vez solo si evidencia externa puede cambiar mercado,
usuarios, posicionamiento, pricing, regulación o alcance:

> Puedo contrastar esta idea con fuentes externas antes del blueprint. Es
> opcional; añade tiempo y no crea archivos hasta que apruebes el resultado.

Si se declina o no aporta valor, registrar `not_applicable`/`declined` y
continuar. Nunca es requisito de bootstrap.

Si se acepta:

1. investigar únicamente preguntas concretas que puedan cambiar decisiones;
2. preferir fuentes primarias/recientes y registrar URL, título, publisher,
   fecha de publicación si existe y fecha de consulta;
3. separar claim citado de interpretación;
4. asignar `confidence: high|medium|low` con razón;
5. mostrar contradicciones y límites; no completar huecos con una certeza
   falsa;
6. presentar el research en conversación y pedir aprobación separada para
   persistirlo.

Formato propuesto:

```markdown
# Market Research

- Scope: <preguntas investigadas>
- Researched at: YYYY-MM-DD
- Status: approved

## Evidence
| Claim | Source | Published/accessed | Confidence | Classification |
|---|---|---|---|---|
| <claim acotado> | [title](url), publisher | <dates> | high/medium/low — <reason> | External |

## Observed project implications
- <Observed: vínculo con pedido o restricción>

## Proposed decisions
- <Proposed: recomendación y evidencia>

## Conflicts and limitations
- <fuentes en conflicto, dato ausente o vigencia>

## Pending decisions
- <decisión humana o none>
```

Crear `agteamos/product/market-research.md` solo después de que el usuario
apruebe ese contenido exacto. Una aprobación del blueprint no aprueba
automáticamente research nuevo o cambiado.

## 4. Blueprint consolidado

Antes de escribir, presentar **un solo paquete**:

```markdown
# Greenfield Blueprint — Draft

## Problem and mission
- Stated request: <literal/resumen fiel>
- Confirmed problem/outcome: <confirmado>
- Users: <confirmados>

## MVP
- In scope: <3-5 outcomes/capabilities>
- Out of scope: <exclusiones>
- Success metrics: <reales o Pending decision>

## Technical foundation
- Stack: <layer → technology → reason>
- Architecture: <componentes y flujo>
- Data/integrations: <solo decisiones actuales>
- Canonical commands: <test/lint/build/dev/migrate>

## Security and operations
- Auth/data/privacy/threats: <aplicable o deferred con trigger>
- CI/local runtime: <mínimo verificable>
- Deploy/observability: <actual o deferred>

## Experience
- UI/design applicability: applies | not_applicable | deferred
- Accessibility baseline: <si aplica>

## Files to materialize
- <ruta exacta y propósito>

## Deferred, not created
- backlog, tickets, domain specs, design system and operational docs until
  their real trigger.

## Research
- not_applicable | declined | approved at <path>

## Pending decisions and risks
- <bloqueante o none>

¿Apruebas este blueprint consolidado para materializar exactamente estos
artefactos y scaffold?
```

La aprobación es agrupada y solo cubre el contenido mostrado. Si cambia
misión, MVP, stack, arquitectura, seguridad, archivos o research, mostrar la
revisión y pedir aprobación nuevamente.

## Salida

```yaml
problem_alignment: aligned | mismatch-confirmed
research: not_applicable | declined | approved
research_path: agteamos/product/market-research.md | null
blueprint: approved
approved_files: [<paths>]
pending_decisions: []
```

Solo entonces cargar `MATERIALIZE-FOUNDATION.md`.
