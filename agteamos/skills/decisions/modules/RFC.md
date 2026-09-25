# RFC — propuesta abierta

## Contrato

Un RFC documenta una propuesta antes de implementar cuando el cambio:

- cruza límites de equipo;
- introduce o reemplaza un servicio, librería, plataforma o tecnología compartida;
- cambia un contrato público, autenticación o un modelo usado por varios servicios;
- cambia un proceso de entrega que afecta a varios equipos; o
- tiene riesgo arquitectónico o blast radius significativo.

La implementación no empieza hasta que el RFC esté `Accepted`. Un bug fix,
refactor interno, endpoint que sigue un patrón existente, feature de un solo
equipo o upgrade no breaking suele resolverse con una PR detallada. Ante un
caso fronterizo, usar un RFC corto.

Un RFC conserva deliberación; un ADR conserva la decisión final. Un RFC
aceptado puede producir uno o más ADRs.

## Lifecycle

```text
Draft → Under Review → Accepted
                     → Rejected
                     → Withdrawn
```

- `Draft`: el autor todavía escribe; se puede cambiar libremente.
- `Under Review`: revisión formal abierta. Mínimo 5 días hábiles si es
  cross-team y 2 días si es single-team.
- `Accepted`: hay aprobación; puede comenzar la implementación.
- `Rejected`: la propuesta fue declinada y la razón quedó registrada.
- `Withdrawn`: el autor abandonó la propuesta.

Al pasar a `Accepted` o `Rejected`, congelar el cuerpo. Agregar el resumen de
resolución arriba o en `Resolution`; no reescribir la deliberación.

## Revisión y aprobación

1. El autor crea
   `agteamos/decisions/rfcs/RFC-NNN-slug.md` con estado `Draft`.
2. Al publicar, cambia a `Under Review`, anuncia enlace y deadline.
3. Los revisores comentan en la PR; el autor puede editar durante la revisión.
4. Para un RFC cross-team, exigir quorum de al menos dos ingenieros ajenos al
   equipo inmediato del autor.
5. El architect o tech lead registra en la PR una decisión explícita:
   `Decision: Accepted` o `Decision: Rejected — <razón>`.
6. Solo entonces actualizar estado, completar `Resolution`, índice y mergear.
7. Vincular desde `Resolution` los ADRs derivados.

No inventar consenso, revisores ni aprobación. Si falta quien decide, dejar el
RFC en `Under Review` y señalar el dato pendiente.

## Premortem opt-in

Antes de aceptar un RFC cross-team o de alto riesgo, ofrecer una vez el
premortem sobre la opción propuesta. Es opcional, nunca automático ni
bloqueante. Si el usuario lo acepta, ejecutar el flujo de `PREMORTEM.md`; si
no, continuar sin penalización.

El premortem no repite `Alternatives Considered`: ataca cómo podría fallar la
opción ganadora. Si se ejecutó, anexar `Premortem` antes de `Accepted`. Si no
se ejecutó, omitir esa sección; nunca fabricar una.

## Numeración e índice

- Ubicación: `agteamos/decisions/rfcs/RFC-NNN-slug.md`.
- `NNN` es secuencial, permanente y zero-padded a tres dígitos.
- Empezar en `RFC-001`; nunca reutilizar un número.
- Derivar el slug del título en kebab-case.
- Actualizar `agteamos/decisions/rfcs/README.md` al crear un RFC y cada vez que
  cambie su estado.
- Determinar el siguiente número leyendo archivos e índice; no adivinarlo.

## Contenido obligatorio

- Metadatos: status, date, author, reviewers, deadline y ADRs relacionados.
- `Summary`
- `Motivation`
- `Proposal`, incluyendo migración y rollout cuando apliquen.
- `Alternatives Considered`, con alternativas reales y razones.
- `Impact`: servicios/equipos, breaking changes, rendimiento y seguridad.
- `Acceptance Criteria` binarios y verificables.
- `Resolution`, completada al cerrar la revisión.
- `Premortem` solo si fue ejecutado.

Para un scaffold copiable, el usuario debe pedir el módulo `TEMPLATES.md`.

## Checklist

- El cambio supera el umbral de RFC.
- No comenzó implementación, salvo un spike explícito, aislado y time-boxed.
- Deadline, revisores y quorum aplicables están presentes.
- Breaking changes están descritos o negados explícitamente.
- Las alternativas y criterios de aceptación son concretos.
- La decisión y su aprobador están registrados.
- Archivo e índice usan el mismo número, título, status y fecha.
- Los ADRs derivados están enlazados.

## Anti-patrones

- Usar el RFC como sello para una decisión ya cerrada.
- Empezar implementación y crear presión por costo hundido.
- Omitir alternativas o escribir criterios no verificables.
- Dejar un RFC indefinidamente en `Under Review`.
- Exigir RFCs para cambios rutinarios de un solo equipo.
- Convertir el premortem en gate obligatorio.
