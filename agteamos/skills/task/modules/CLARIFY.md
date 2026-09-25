# Module: Clarify

## CONTRACT

- **Input**: pedido original y contexto mínimo del router.
- **Output**: problema, usuarios, comportamiento esperado, límites, prioridad,
  integraciones y decisiones pendientes confirmados.
- **Gate**: la frontera de preguntas queda vacía.
- **No hace**: elegir schema, escribir specs, crear tickets o implementar.

## 1. ANALIZAR ANTES DE PREGUNTAR

Clasificar cada dato relevante:

- **Claro**: el usuario ya lo dijo; no repetir la pregunta.
- **Hecho comprobable**: resolver leyendo código, tests, manifests,
  configuración, `PROJECT_CONTEXT.md` o decisiones existentes.
- **Decisión humana**: puede entrar en la frontera.
- **Dependiente**: diferir hasta resolver su prerequisito.

Antes de preguntar por una feature o dirección, revisar
`agteamos/decisions/out-of-scope/` si existe. Comparar por intención, no solo
keywords. Si algo fue descartado, citar fecha/razón y preguntar si se desea
reabrirlo; no presentarlo como idea nueva.

**Regla**: averiguar hechos es trabajo del agente. Nunca pedir al usuario que
inspeccione su propio repo.

### Petición declarada vs problema sustentado

Antes de construir la frontera, comparar explícitamente:

- `stated_request`: lo pedido, sin reinterpretarlo;
- `observed_evidence`: conducta/costo confirmado por repo, tracker, datos o
  decisión existente;
- `underlying_problem`: hipótesis propuesta y falsable;
- `alignment`: `aligned` o `material_mismatch`;
- `consequence`: qué solución incorrecta se construiría si la hipótesis falla.

No llamar “problema real” a una preferencia del agente. Si hay
`material_mismatch`, mostrar evidencia y pedir **una sola confirmación de
dirección** antes de especificar. Si está `aligned`, no añadir otra pregunta.
Registrar el resultado para que Shape no repita el gate.

## 2. CONSTRUIR EL ÁRBOL DE PREGUNTAS

1. Enumerar internamente todas las ambigüedades.
2. Registrar prerequisitos entre preguntas.
3. Definir la frontera actual: preguntas cuyas dependencias ya están resueltas.
4. Resolver primero los hechos comprobables de esa frontera.
5. Preguntar solo las decisiones humanas restantes.
6. Incorporar respuestas y recalcular la frontera.
7. Repetir hasta que no queden preguntas desbloqueadas ni dependencias abiertas.

No preguntar una decisión de una ronda futura antes de tiempo.

## 3. FORMATO DE CADA RONDA

- 3-5 preguntas máximo.
- Numeradas, concretas y con opciones cuando ayuden.
- Cada pregunta incluye una recomendación del agente y su razón.
- No preguntar elecciones técnicas sin impacto para el usuario; decidirlas en
  Shape con evidencia.
- Si tras dos rondas queda una decisión humana abierta, proponer el default más
  razonable y pedir aprobación. La aprobación cierra esa rama; no abandonar la
  frontera arbitrariamente.

Ejemplo breve:

> 1. ¿El fallo del proveedor debe bloquear el registro o permitirlo y reintentar
> después? Recomiendo conservar el registro y reintentar porque evita perder la
> acción principal del usuario.

## 4. COBERTURA MÍNIMA

Preguntar solo lo que siga abierto:

- usuario/persona y problema real;
- acción disparadora y resultado observable;
- errores, permisos y bordes relevantes;
- out-of-scope explícito;
- urgencia o restricción de release;
- integración externa o restricción no visible en el repo;
- para UI: diseño previo vs propuesta nueva y restricciones de experiencia;
- para bugs: reproducción, expected vs actual, alcance y workaround, salvo lo
  ya comprobado.

## 5. CONFIRMAR ENTENDIMIENTO

Resumir en 2-5 bullets:

- qué se resolverá;
- para quién y con qué valor;
- comportamiento y restricciones clave;
- qué queda fuera;
- decisiones todavía marcadas como `Pending decision`, si alguna bloquea.

Pedir confirmación explícita. Si la respuesta cambia la dirección, volver a
calcular la frontera; no saltar a Shape con contradicciones.

## 6. PREMORTEM OPT-IN

Solo para una feature grande, riesgosa o con decisión de negocio no trivial,
ofrecer una vez:

> ¿Quieres una crítica dura de esta feature antes de especificarla? Es
> opcional y puede detectar una mala inversión temprano.

- Si acepta, usar `agteamos-decisions` a escala de feature.
- Si rechaza, continuar sin fricción.
- Para cambios pequeños, no ofrecerlo.
- El veredicto informa, no bloquea. Si el usuario continúa pese a un riesgo,
  trazar ese riesgo en requirements/design según corresponda.

## SALIDA PARA SHAPE

Entregar un resumen estructurado:

```yaml
original_input: <texto literal>
problem_framing:
  stated_request: <pedido>
  observed_evidence: [<fuente/hallazgo>]
  underlying_problem: <confirmado o proposed>
  alignment: aligned | mismatch-confirmed
problem: <problema confirmado>
users: [<personas>]
desired_behavior: [<resultados observables>]
out_of_scope: [<límites confirmados>]
constraints: [<restricciones humanas confirmadas>]
priority: <confirmada o pending>
integrations: [<confirmadas>]
ui_impact_hint: true | false | unknown
premortem: not-offered | declined | completed
pending_decisions: []
```

No parafrasear `original_input`.

## ANTI-PATTERNS

- Cuestionario fijo sin analizar el pedido.
- Una pregunta por mensaje cuando hay varias en la misma frontera.
- Preguntar framework, proveedor o path que el repo puede revelar.
- Asumir una preferencia humana sin confirmación.
- Cortar después de un número arbitrario de rondas.
- Reabrir una decisión descartada sin reconocer su historial.
