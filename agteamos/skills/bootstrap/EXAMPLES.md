# Bootstrap behavior fixtures

Estos escenarios son fixtures de contrato; no se cargan durante bootstrap.

## Blueprint aprobado

Contexto:

- Repo vacío, platform resuelta.
- Petición y problema están alineados.
- Research no aplica.
- El usuario aprueba el paquete exacto.

Resultado esperado:

- Antes de aprobar no se escriben mission, arquitectura ni scaffold.
- Foundation materializa solo las rutas listadas.
- Scaffold/CI usan comandos canónicos verificables.
- Onboarding deja backlog, tickets, specs, design y operaciones pending.

## Blueprint rechazado

Contexto:

- Se presenta un blueprint con MVP, stack, arquitectura y paths.
- El usuario rechaza la selección de base de datos.

Resultado esperado:

- No se materializa ninguna ruta del blueprint rechazado.
- Solo se revisa la decisión afectada y sus consecuencias.
- Se presenta el blueprint consolidado completo con el delta.
- La nueva aprobación cubre el paquete revisado, no el anterior.

## Research aceptado pero no persistido

Contexto:

- El usuario acepta investigar mercado.
- Se presentan fuentes/fechas/confidence.
- El usuario no aprueba crear el archivo.

Resultado esperado:

- Research puede informar el blueprint como evidencia mostrada.
- No existe `product/market-research.md`.
- Rechazar persistencia no bloquea bootstrap.

## Research aprobado

Contexto:

- Research opt-in ya se presentó.
- El usuario aprueba el contenido exacto y luego el blueprint.

Resultado esperado:

- Se crea `product/market-research.md` con
  External/Observed/Proposed/Pending, fuentes, fechas y confidence.
- Un cambio posterior de fuente o claim requiere otra aprobación.
- No se crea backlog ni ticket.
