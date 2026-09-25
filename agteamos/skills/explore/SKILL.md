---
name: agteamos-explore
description: >
  Modo de exploracion previo a comprometerse con una tarea. Partner de
  pensamiento que lee el codigo real del proyecto y compara opciones con
  trade-offs concretos contra ESE codigo — nunca genericos. No crea ningun
  artefacto, no crea rama, no toca agteamos/changes/, no escribe codigo.
  Termina proponiendo si conviene pasar a agteamos-task (con una idea
  ya mas formada) o si hace falta seguir explorando. Sugerida por
  agteamos-router cuando el input describe un problema sin solucion
  propuesta. Solo puede persistir market research opt-in aprobado.
used_by:
  - architect
---

# Skill: Explore (agteamos-explore)

## CONTRACT
- **Input**: una descripcion de un problema o malestar, sin solucion propuesta (ej. "las paginas van lentas", "el auth es un desastre")
- **Output normal**: ningún artefacto persistente; conversación con
  diagnóstico, opciones y próximo paso.
- **Excepción explícita**: puede crear
  `agteamos/product/market-research.md` solo tras opt-in de investigación y
  aprobación posterior del contenido exacto.
- **Regla**: NO crea `agteamos/changes/<id>-<slug>/`, branch, ticket ni código.
  Fuera de la excepción anterior, es de solo lectura.
- **Quien ejecuta**: `@architect`
- **Trigger**: sugerido (nunca forzado) por `agteamos-router` cuando el input del usuario describe un sintoma/dolor sin una solucion concreta propuesta; tambien invocable directamente por el usuario ("quiero explorar opciones para X", "ayudame a pensar Y")

---

## POR QUE EXISTE ESTA SKILL

Todo el aparato SDD (`agteamos-spec`, `agteamos-task`,
`agteamos-implement`) protege contra "implementaron mal lo que pedí" —
requirements con ACs verificables, design.md aprobado antes de codear, specs
que son la fuente de verdad. Pero nada de eso protege contra "pedí lo
incorrecto", que en general es más caro de deshacer que un bug de
implementación: una feature bien construida sobre el diagnóstico equivocado
sigue siendo la solución equivocada.

Cuando el usuario tiene un problema pero todavía no una solución, forzar de
inmediato el Flujo 2 (`agteamos-task`) obliga a escribir requirements
sobre una solución que nadie comparó contra alternativas. `agteamos-explore`
es el espacio deliberado para pensar antes de comprometerse. Es efímero por
defecto: solo el market research solicitado y aprobado puede persistirse,
porque necesita fuentes/fecha/confidence auditables.

---

## PROCESS

### Step 1 — Leer el código real relacionado con el problema

No opinar en abstracto. Antes de proponer nada:

- Identificar los archivos/módulos involucrados en el síntoma descrito (ej.
  si "las páginas van lentas", leer las queries, los componentes que
  renderizan, las llamadas a API involucradas).
- Leer `agteamos/architecture/PROJECT_CONTEXT.md` y, si existe,
  `agteamos/specs/<dominio>.md` del dominio relacionado, para entender el
  contrato de comportamiento vigente antes de proponer cambiarlo.
- Si el problema no es reproducible por lectura de código, decirlo
  explícitamente y pedir al usuario un caso concreto (log, request lenta,
  screenshot) — no inventar una causa sin evidencia.

### Step 2 — Diagnosticar contra el código, no en genérico

El diagnóstico cita código real: archivo, función, línea, query — no
"probablemente sea un problema de N+1" sin señalar dónde. Un diagnóstico sin
cita de código no es exploración, es especulación con vocabulario técnico.

### Step 3 — Presentar 2-4 opciones con trade-offs concretos

Cada opción se evalúa contra ESTE código, no en abstracto:

```
Problema: "Las páginas de listado van lentas"

Diagnóstico: `InvoiceListView` (frontend/src/pages/InvoiceList.tsx:34) llama a
GET /api/invoices sin paginación — el endpoint (backend/routers/invoices.py:22)
trae todas las filas y serializa relaciones (`client`, `line_items`) que la
tabla ni siquiera muestra.

Opciones:
| Opción | Qué cambia | Esfuerzo | Trade-off concreto en ESTE código |
|---|---|---|---|
| A. Paginación server-side | Agregar `limit`/`offset` al endpoint + cursor en frontend | M | Cambia el contrato del endpoint (requiere spec delta) y el estado de `InvoiceList.tsx` |
| B. Cachear la respuesta 30s | Cache en el router | S | No resuelve el N+1, solo lo esconde mientras la carga es baja |
| C. Sacar relaciones no usadas del serializer | Quitar `client`/`line_items` del schema de listado | S | Resuelve el N+1 real hoy, pero no escala si la tabla crece a 10k+ filas |
```

No presentar opciones genéricas ("mejorar el caching", "optimizar queries")
sin ese nivel de especificidad contra el código leído — eso es lo que
distingue esta skill de una lista de buenas prácticas de libro.

### Step 3.5 — Market research opcional

Solo si una decisión depende de evidencia externa de mercado, usuarios,
competidores, regulación o pricing, ofrecer research una vez. No ejecutarlo
por defecto ni para una pregunta puramente técnica.

Si el usuario acepta:

1. investigar preguntas acotadas que puedan cambiar la recomendación;
2. citar URL, título, publisher, fecha de publicación si existe y fecha de
   consulta;
3. separar `External`, `Observed`, `Proposed` y `Pending decision`;
4. marcar confidence `high|medium|low` con razón y mostrar conflictos;
5. presentar resultados antes de escribir.

Preguntar si desea conservar exactamente ese resultado. Solo con aprobación
crear `agteamos/product/market-research.md`; si cambia el texto/fuentes,
mostrarlo y pedir aprobación otra vez. Rechazar research o persistencia no
bloquea Step 4.

### Step 4 — Proponer el próximo paso

Terminar SIEMPRE con una de estas dos conclusiones explícitas:

1. **"Esto ya está lo bastante claro para pasar a `agteamos-task`"** — si
   el usuario elige una opción, resumir en 2-3 líneas la idea ya formada
   (qué opción, por qué) para que `agteamos-task` arranque su Step 1
   (clarification-protocol) con contexto real en vez de desde cero.
2. **"Hace falta seguir explorando"** — si ninguna opción es clara todavía,
   o el usuario quiere profundizar en una antes de decidir, proponer el
   siguiente paso concreto de exploración (ej. "medir cuántas filas trae hoy
   la tabla `invoices` en producción antes de elegir entre A y C").

---

## EXAMPLE: Sesión completa

```
Usuario: "El auth de este proyecto es un desastre, no se ni por donde empezar"

@architect (Step 1): Lee backend/auth/, encuentra tres puntos distintos que
validan el JWT (middleware.py:12, routers/users.py:45, routers/admin.py:8),
cada uno con una lógica de expiración ligeramente distinta.

@architect (Step 2): "El problema concreto: hay 3 implementaciones de
validación de JWT que no comparten código — middleware.py no chequea el
claim `role`, routers/admin.py sí pero con una lógica distinta a
routers/users.py. Eso es lo que probablemente estás viendo como
'desastre': no es un bug puntual, es falta de una única fuente de verdad."

@architect (Step 3):
| Opción | Qué cambia | Esfuerzo | Trade-off en este código |
|---|---|---|---|
| A. Extraer un único `AuthService.validate()` | Refactor de los 3 puntos a una función compartida | M | Requiere tocar los 3 routers, riesgo de romper el admin check existente si no se testea bien |
| B. Migrar a una librería de auth completa (ej. Auth0) | Reemplazar JWT casero | L | Resuelve de raíz pero es un cambio grande con dependencia externa nueva |
| C. Dejarlo como está y solo agregar tests de regresión sobre los 3 puntos | Ningún cambio de código, solo tests | S | No arregla el problema estructural, solo evita que empeore sin darse cuenta |

@architect (Step 4): "Esto todavía no está lo bastante claro para arrancar
una tarea — ¿el objetivo es arreglar la inconsistencia (opción A) o evaluar
si vale la pena depender de un proveedor externo (opción B)? Eso cambia todo
el approach. ¿Seguimos explorando el approach B con un spike de 1 día, o
vamos directo a `agteamos-task` con la opción A ya que es la de menor
riesgo?"
```

---

## ANTI-PATTERNS

- Crear `agteamos/changes/<id>-<slug>/` "para no perder la conversación" —
  Explore es efímero salvo el research opt-in aprobado. Si hace falta
  persistir otra cosa, esa necesidad ya es señal de pasar a `agteamos-task`.
- Proponer opciones genéricas de libro de texto sin citar el código real del
  proyecto — el valor de esta skill es el trade-off contra ESE código, no una
  lista de best practices.
- Escribir código o abrir una rama "para probar rápido" — cualquier cambio de
  código, por chico que sea, saca la conversación de `agteamos-explore` y la
  mueve a `agteamos-fix` / `agteamos-debug` / `agteamos-task`.
- Forzar una conclusión cuando el usuario todavía no tiene claridad — terminar
  en "hace falta seguir explorando" es un resultado válido, no un fracaso de
  la skill.
- Usar `agteamos-explore` como excusa para saltarse
  `agteamos-task` cuando el usuario YA sabe lo que quiere —
  si el input ya es una feature o cambio concreto, no es este el flujo, es
  Flujo 2 directo (`agteamos-task`).
- Diagnosticar sin haber leído el código — "puede ser un problema de
  performance" sin señalar el archivo/función concreto no es exploración.

---

## Próximo paso sugerido

**Próximo paso sugerido**: `agteamos-task`, si ya se decidió qué hacer — o
seguir explorando, si todavía no hay claridad (ver `agteamos-context`
§Próximo paso).
