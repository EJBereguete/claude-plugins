# Work Item Templates

Estas plantillas son semánticas. El módulo del proveedor decide qué sección
va a un campo nativo, rich text, label/tag, relación o link.

Reglas:

- Incluir solo datos observados o decididos.
- Usar `Pending decision` cuando falte información opcional.
- Un campo requerido pendiente bloquea `apply`.
- No repetir en el body un valor ya guardado en un campo nativo, salvo que el
  proveedor necesite esa degradación.

## Campos comunes

```yaml
project: "{{project}}"
team: "{{team | not applicable}}"
type: "{{real provider type}}"
title: "{{title}}"
state: "{{discovered initial state | omit}}"
assigned_to: "{{verified identity | omit}}"
area: "{{verified area | omit}}"
iteration: "{{verified iteration | omit}}"
tags: []
parent: "{{verified id | temporary key | none}}"
relations: []
external_links: []
attachments: [] # solo evidencia revisada, hasheada y aprobada
```

El body comunica comportamiento, valor y criterios. El análisis técnico
detallado permanece en los artefactos del cambio y se enlaza por permalink.
Adjuntarlo al proveedor es opcional y sigue `AZURE-TRANSPORT.md`; no insertar
paths/clases frágiles en una Story solo para transportar evidencia.

## Epic

Un Epic representa un resultado estratégico medible.

```markdown
## Resumen ejecutivo
{{Resultado, audiencia y razón; basado en misión/roadmap o decisión explícita.}}

## Problema u oportunidad
{{Situación actual y evidencia.}}

## Objetivo estratégico
{{Outcome, no lista de entregables.}}

## Usuarios y stakeholders
- Usuarios beneficiados: {{personas | Pending decision}}
- Sponsor: {{sponsor | Pending decision}}
- Stakeholders: {{stakeholders | Pending decision}}
- Owner: {{owner | Pending decision}}

## Resultados y métricas
- KPI: {{métrica | Pending decision}}
- Línea base: {{valor | Pending decision}}
- Meta: {{valor | Pending decision}}
- Fecha objetivo: {{fecha | Pending decision}}
- Fuente: {{fuente | Pending decision}}

## Alcance incluido
- {{resultado/capacidad}}

## Fuera de alcance
- {{exclusión}}

## Features previstas
- {{feature justificada}}

## Dependencias
- {{dependencia, owner y fecha necesaria si existen}}

## Riesgos y mitigaciones
- Riesgo: {{riesgo}}
  - Probabilidad/impacto: {{valor | Pending decision}}
  - Mitigación: {{acción | Pending decision}}
  - Owner: {{owner | Pending decision}}

## Hitos
- {{hito}} — {{fecha/release | Pending decision}}

## Criterios de finalización
- [ ] Las Features comprometidas están cerradas.
- [ ] Los outcomes/KPIs acordados fueron evaluados.
- [ ] No existen riesgos críticos abiertos o están aceptados.
- [ ] El sponsor acepta formalmente el resultado.
```

Mapear Business Value, Time Criticality, Risk, Start Date y Target Date solo
si los campos existen y hay valores reales.

## Feature

Una Feature representa una capacidad entregable y demostrable.

```markdown
## Resultado esperado
{{Capacidad que existirá al finalizar.}}

## Valor para usuario y negocio
{{Beneficio y vínculo con el Epic.}}

## Contexto actual
{{Comportamiento y evidencia del repo.}}

## Alcance funcional
- {{comportamiento incluido}}

## Fuera de alcance
- {{comportamiento excluido}}

## Requisitos no funcionales
- Seguridad: {{requisito aplicable}}
- Rendimiento: {{requisito medible}}
- Disponibilidad: {{requisito}}
- Accesibilidad: {{estándar}}
- Observabilidad: {{logs, métricas o alertas}}

## Reglas de negocio
- {{regla inequívoca}}

## Dependencias e integraciones
- {{servicio, equipo o work item real}}

## Criterios de aceptación
### Escenario: {{nombre}}
Given {{contexto}}
When {{acción}}
Then {{resultado verificable}}

### Escenario de error
Given {{contexto}}
When {{condición inválida}}
Then {{respuesta esperada}}

## Métricas de éxito
- {{métrica y objetivo | Pending decision}}

## Estrategia de entrega
- Release: {{release | Pending decision}}
- Rollout: {{estrategia | Pending decision}}
- Rollback: {{condición/procedimiento | Pending decision}}

## Definition of Done
{{Referenciar la DoD aprobada para esta tarea; no duplicar la definición canónica.}}
```

## User Story

```markdown
## User Story
Como {{persona}},
quiero {{capacidad}},
para {{beneficio medible}}.

## Contexto
{{Necesidad y comportamiento actual confirmado.}}

## Reglas de negocio
- {{regla}}
- {{validación}}
- {{restricción}}

## Datos y permisos
- Datos de entrada: {{datos}}
- Resultado esperado: {{resultado}}
- Roles autorizados: {{roles}}
- Datos sensibles: {{tratamiento}}

## Fuera de alcance
- {{exclusión}}

## Acceptance Criteria
### AC1 — Happy path
Given {{precondición}}
When {{acción}}
Then {{resultado observable}}

### AC2 — Validación
Given {{entrada inválida}}
When {{acción}}
Then {{mensaje/comportamiento}}

### AC3 — Permisos
Given {{rol no autorizado}}
When {{intenta la acción}}
Then {{respuesta}}

### AC4 — Caso límite
Given {{condición límite}}
When {{acción}}
Then {{resultado}}

## Quality gates
- Definition of Ready: resultado de `agteamos-implement` Step 2.
- INVEST: resultado de `agteamos-task` Step 7.
- Definition of Done: referencia al contrato aprobado.
```

Story Points, Priority, Risk y Value Area se pueden proponer con
justificación, pero no escribir sin aprobación.

## Task

Una Task es trabajo ejecutable por una persona con resultado comprobable.

```markdown
## Objetivo
{{Resultado técnico u operativo.}}

## Entregable
{{Archivo, componente, configuración, análisis o evidencia.}}

## Trabajo requerido
1. {{paso concreto}}
2. {{paso concreto}}
3. {{validación}}

## Archivos o componentes afectados
- `{{ruta/símbolo real o proposed}}` — {{cambio}}

## Dependencias
- Bloqueada por: {{item/condición | ninguna conocida}}
- Desbloquea: {{item | ninguno conocido}}

## Validación
- Comando/prueba: {{método real}}
- Resultado esperado: {{resultado}}

## Definition of Done
- [ ] Entregable completado.
- [ ] Validación ejecutada con éxito.
- [ ] Evidencia adjunta o enlazada.
- [ ] Tracking de trabajo actualizado según el proveedor.
- [ ] El parent continúa cumpliendo sus criterios.
```

Activity, Original Estimate, Remaining Work y Completed Work solo se
incluyen si el tipo real los expone.

## Bug

```markdown
## Resumen
{{Defecto e impacto.}}

## Entorno
- Ambiente: {{valor | Unknown}}
- Versión/build: {{valor | Unknown}}
- SO/dispositivo: {{valor | Unknown}}
- Navegador/hardware: {{valor | Unknown}}
- Usuario/rol: {{valor | Unknown}}
- Primera detección: {{fecha | Unknown}}

## Precondiciones
- {{estado necesario}}

## Pasos para reproducir
1. {{paso}}
2. {{paso}}
3. {{paso}}

## Resultado actual
{{Comportamiento observado.}}

## Resultado esperado
{{Contrato/spec/decisión que lo sustenta.}}

## Frecuencia
{{dato | Unknown}}

## Impacto
- Usuarios afectados: {{dato | Unknown}}
- Datos afectados: {{dato | Unknown}}
- Operación bloqueada: {{sí/no/unknown}}
- Workaround: {{alternativa | ninguno conocido}}

## Evidencia
- Screenshot/video: {{link}}
- Logs/traces: {{link seguro}}
- Correlation ID: {{id}}

## Análisis inicial
- Regresión: {{sí/no/unknown}}
- Última versión correcta: {{valor | Unknown}}
- Componente probable: {{hipótesis}}
- Hipótesis: {{no confirmada}}

## Acceptance Criteria de corrección
### Corrección
Given {{condición}}
When {{se repite la operación}}
Then {{resultado correcto}}

### No regresión
Given {{flujo relacionado}}
When {{se ejecuta}}
Then {{continúa funcionando}}

## Validación de cierre
- [ ] Ya no es reproducible en el ambiente objetivo.
- [ ] Existe prueba de regresión aplicable.
- [ ] No se observaron regresiones relacionadas.
- [ ] Evidencia de validación adjunta.
```

Severity, Priority, Repro Steps y System Info se mapean solo si existen. El
nivel jerárquico del Bug depende de la configuración efectiva del equipo.

## Issue

En Agile se usa para impedimentos, riesgos, dependencias o decisiones; no
para trabajo funcional.

```markdown
## Situación
{{Qué ocurre y evidencia.}}

## Impacto
- Objetivos afectados: {{objetivos}}
- Work items afectados: {{IDs}}
- Alcance/fecha/calidad: {{detalle}}

## Owner
{{identidad verificada | Pending decision}}

## Acción requerida
{{Decisión, información o intervención.}}

## Opciones
1. {{opción y consecuencia}}
2. {{opción y consecuencia}}

## Mitigación temporal
{{acción | Pending decision}}

## Fecha límite
{{fecha y razón | Pending decision}}

## Criterio de escalamiento
{{condición}}

## Criterio de cierre
{{evidencia concreta}}
```

## Patrones sin tipo nativo

- **Spike**: Task o Story real con tag `Spike`, pregunta de investigación,
  timebox pendiente/decidido, alternativas, criterio de decisión y
  entregable.
- **Deuda técnica**: tipo real de backlog con tag `Technical Debt`; en Azure
  Agile, proponer `Value Area = Architectural` solo si el campo existe.
- **Cambio de alcance**: Issue/relación soportada + change set de los items
  afectados.
- **Duplicado**: vincular con la relación nativa si existe; si no, comentar y
  enlazar. Nunca cerrar el duplicado sin aprobación.
