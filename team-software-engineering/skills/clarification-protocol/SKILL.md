---
name: clarification-protocol
description: >
  Protocolo de preguntas para obtener contexto completo antes de empezar
  cualquier tarea. El agente hace preguntas hasta poder escribir ACs
  sin ambiguedad. Se usa en Flujo 2 y cuando Flujo 3 tiene ticket incompleto.
used_by:
  - product-owner
  - architect
  - ui-ux-designer
---

# Skill: Clarification Protocol

## CONTRACT
- **Input**: Request del usuario (vago o completo)
- **Output**: Contexto suficiente para escribir requirements.md con ACs verificables
- **Regla**: No empezar implementacion con contexto ambiguo

## CUANDO SE ACTIVA

1. **Flujo 2** (tarea nueva sin ticket) — siempre
2. **Flujo 3** (ticket existente) — solo si el ticket no pasa Definition of Ready
3. **Flujo 1** (proyecto desde cero) — para capturar vision completa

## PROCESO

### Step 1: Analizar lo que el usuario dijo

Lee el request del usuario e identifica:
- Lo que esta claro (no preguntar sobre esto)
- Lo que falta o es ambiguo (preguntar sobre esto)
- Lo que puedes inferir del contexto del proyecto (confirmar, no preguntar)

### Step 2: Hacer preguntas FOCALIZADAS

**Reglas:**
- Maximo 3-5 preguntas por ronda (no bombardear)
- Preguntas concretas con opciones cuando sea posible
- No preguntar lo que puedes inferir del codigo existente
- Si algo es una decision tecnica que no afecta al usuario, decidir tu

### Step 3: Confirmar entendimiento

Resumir en 2-3 bullets lo que vas a hacer y pedir confirmacion.

## PREGUNTAS POR TIPO DE TAREA

### Feature nueva (Flujo 2)

```
Preguntas de SCOPE:
- "¿Quienes son los usuarios de esta feature?"
- "¿Que debe pasar exactamente cuando [accion]?"
- "¿Hay algo que explicitamente NO debe incluir?"

Preguntas de DISENO (si afecta UI):
- "¿Hay un diseno previo o creo una propuesta?"
- "¿Debe seguir el patron visual de [seccion existente]?"

Preguntas de INTEGRACION:
- "¿Esto se conecta con algun servicio externo? ¿Cual?"
- "¿Hay un proveedor preferido o lo elijo yo?"

Preguntas de PRIORIDAD:
- "¿Es critico para el proximo release o puede esperar?"
```

### Bug fix (Flujo 2/3)

```
- "¿Puedes reproducir el error? ¿En que condiciones?"
- "¿Desde cuando ocurre? ¿Funcionaba antes?"
- "¿Afecta a todos los usuarios o solo a algunos?"
- "¿Hay algun workaround conocido?"
```

### Ticket incompleto (Flujo 3)

```
El ticket dice: "Mejorar el login"

Preguntas:
- "El ticket #42 dice 'Mejorar el login'. ¿Que aspecto especifico?
   a) Performance (carga lenta)
   b) UX (flujo confuso)
   c) Seguridad (agregar MFA)
   d) Otro: [describir]"
```

## EXAMPLE: Flujo completo de clarificacion

```
Usuario: "Quiero agregar notificaciones por email"

Agente: "Para disenar bien esta feature, necesito algunos detalles:

1. ¿Que eventos deben disparar un email?
   a) Registro de cuenta
   b) Reset de contraseña
   c) Actividad en la cuenta
   d) Todos los anteriores
   e) Otros: [describir]

2. ¿Hay un proveedor de email preferido? (SendGrid, AWS SES, SMTP propio)

3. ¿Los emails necesitan template HTML personalizado o texto plano es suficiente?"

Usuario: "a y b, usa SendGrid, y si necesito templates bonitos"

Agente: "Entendido. Voy a implementar:
- Email de bienvenida al registrar cuenta
- Email de reset de contraseña
- Usando SendGrid como proveedor
- Con templates HTML personalizados
- NO incluye: notificaciones push, SMS, ni emails de marketing

¿Correcto?"

Usuario: "Si, correcto"
→ Procede a escribir requirements.md con ACs claros
```

## ANTI-PATTERNS

- **No preguntar todo de golpe** — maximo 5 preguntas por ronda
- **No preguntar decisiones tecnicas al usuario** — esas las toma el equipo
- **No asumir sin confirmar** — si hay duda, pregunta
- **No bloquear indefinidamente** — si despues de 2 rondas no hay claridad, proponer la solucion mas razonable y pedir aprobacion
