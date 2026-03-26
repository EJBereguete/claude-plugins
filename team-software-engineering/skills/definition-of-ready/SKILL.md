---
name: definition-of-ready
description: >
  Valida si un ticket tiene la informacion minima para empezar a trabajar.
  Si no la tiene, activa clarification-protocol para completar lo que falta.
  Se aplica en Flujo 3 (ticket existente).
used_by:
  - product-owner
  - project-manager
  - qa-engineer
---

# Skill: Definition of Ready (DoR)

## CONTRACT
- **Input**: Ticket de GitHub o Azure DevOps
- **Output**: READY (proceder) o NOT READY (activar clarification-protocol)
- **Trigger**: Al inicio de Flujo 3, despues de leer el ticket

## CHECKLIST DE READINESS

Un ticket esta READY si cumple al menos 5 de 7:

| # | Criterio | Obligatorio | Descripcion |
|---|----------|-------------|-------------|
| 1 | **Descripcion clara** | SI | El problema o feature esta bien definido, no ambiguo |
| 2 | **Acceptance Criteria** | SI | Al menos 2 ACs verificables en formato Given/When/Then |
| 3 | **Tipo definido** | SI | Es feature, bug, hotfix, refactor, o tech debt |
| 4 | **Prioridad asignada** | NO | P0/P1/P2/P3 o equivalent |
| 5 | **Estimable** | NO | El equipo puede asignar talla (S/M/L/XL) |
| 6 | **Independiente** | SI | No esta bloqueado por otro ticket abierto |
| 7 | **Testeable** | SI | Hay forma clara de verificar que el trabajo esta completo |

## PROCESO DE VALIDACION

```
Leer ticket completo (titulo + descripcion + comments + labels)
    ↓
¿Tiene descripcion clara?
  NO → Preguntar al usuario que quiere exactamente
    ↓
¿Tiene ACs verificables?
  NO → Proponer ACs basados en la descripcion y pedir confirmacion
    ↓
¿Tipo definido?
  NO → Inferir del contexto (bug si menciona error, feature si es nuevo)
    ↓
¿Es independiente?
  NO → Alertar: "Este ticket depende de #X que aun esta abierto"
    ↓
¿Es testeable?
  NO → Definir criterio de verificacion con el usuario
    ↓
READY → Proceder con story-breakdown
```

## EXAMPLE: Ticket que PASA DoR

```
Title: Add JWT refresh token rotation
Type: Feature
Priority: P1

Description:
Currently tokens expire and users must re-login. Implement automatic
token refresh using rotation pattern.

Acceptance Criteria:
- Given a user with an expired access token and valid refresh token,
  When they make an API request,
  Then a new access/refresh token pair is issued automatically
- Given a user with a revoked refresh token,
  When they attempt to refresh,
  Then they receive 401 and must re-login
- Given a refresh token that has been used before (replay),
  When it's presented for refresh,
  Then ALL tokens for that user are invalidated (security measure)

Labels: feature, auth, backend
```

## EXAMPLE: Ticket que NO PASA DoR

```
Title: Fix login
Description: Login is broken

→ NOT READY. Falta:
  - ¿Que esta roto exactamente? ¿Error? ¿Lentitud? ¿UX?
  - ¿Desde cuando? ¿Funciona en staging?
  - Sin ACs verificables
  - Sin tipo (¿es bug? ¿es mejora?)

→ Activar clarification-protocol:
  "El ticket #42 dice 'Fix login'. Necesito mas contexto:
  1. ¿Que error exacto ves? (screenshot o stack trace si es posible)
  2. ¿Esto funcionaba antes? ¿Desde cuando falla?
  3. ¿Afecta a todos los usuarios o solo a algunos?"
```

## TEMPLATE PARA COMPLETAR TICKETS INCOMPLETOS

Cuando el ticket no pasa DoR, el agente puede proponer ACs:

```
"Basandome en la descripcion del ticket, propongo estos Acceptance Criteria:

- [ ] Given usuario con credenciales validas, When hace login, Then recibe token y es redirigido al dashboard
- [ ] Given usuario con password incorrecto, When hace login, Then recibe error 401 con mensaje claro
- [ ] Given usuario inexistente, When hace login, Then recibe error 404

¿Estan correctos? ¿Agrego o modifico alguno?"
```
