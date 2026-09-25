# Module: Audit Breakdown

## CONTRACT

- **Input**: un desglose ya redactado de Stories, Bugs, Tasks, Features u otros
  work items que representan un mismo objetivo.
- **Output inicial**: auditoría read-only con evidencia, bloqueantes,
  sugerencias y veredicto; no corrige ni persiste por defecto.
- **Continuación**: solo por petición explícita, normaliza el desglose mediante
  Clarify → Shape + Spec → Breakdown → Persist + Handoff.
- **No hace**: crear carpetas, editar el texto recibido, estimar, asignar,
  elegir sprint ni mutar el tracker durante la auditoría.

## 1. DETECTAR EL MODO

Entrar aquí cuando el usuario pide validar/revisar/auditar un desglose
existente o entrega varios items ya redactados para comprobarlos antes de
crear. Una sola idea en prosa sigue el flujo normal de Clarify.

Conservar el input completo verbatim en memoria. No convertirlo todavía a la
plantilla canónica y no tratar títulos o IDs mencionados como recursos reales
sin read-back.

## 2. ESTABLECER LA BASE DE COMPARACIÓN

Usar, en este orden:

1. requerimiento/objetivo original aportado por el usuario;
2. contexto, specs, decisiones y código reales del repo;
3. work items/parents/relaciones existentes leídos mediante
   `agteamos-work-items inspect-tracker`;
4. si no existe requerimiento original, coherencia interna entre los items.

La falta de objetivo original limita la detección de huecos y debe aparecer
como warning, no como permiso para inventarlo.

Si el desglose cita varios repositorios, registrar para cada uno la evidencia
disponible y su snapshot/freshness según `agteamos-work-items
inspect-repo`. Un mirror `stale` o `unverified` no sustenta un hecho técnico.

## 3. AUDITAR SIN CORREGIR

Clasificar cada hallazgo como `BLOCKER`, `WARNING` o `PASS`, con item/sección y
evidencia. Revisar:

### Cobertura y solapamiento

- requirements/resultados del objetivo sin ningún item;
- AC o comportamiento duplicado entre items;
- items sin vínculo trazable al objetivo;
- contradicciones entre alcance, fuera de alcance y criterios;
- bugs que mezclan varios defectos independientes.

### Calidad de cada item

- título orientado a resultado;
- valor/persona en Story o impacto/reproducción en Bug;
- criterios observables, concretos y no tautológicos;
- permisos, errores y bordes aplicables;
- dato obligatorio faltante según el tipo/campos reales descubiertos;
- detalle técnico frágil en un item de producto que debería quedar en
  design/evidencia enlazada;
- owner, fecha, prioridad, sprint o estimación presentados sin fuente humana o
  evidencia del proveedor.

No exigir una sección por el simple hecho de existir en una plantilla. La
semántica y los campos reales del proyecto mandan.

### Jerarquía y dependencias

- parent inexistente, múltiple o semánticamente incorrecto;
- jerarquía incompatible con el proceso/capacidades descubiertos;
- dependencias omitidas, invertidas, transitivas redundantes o cíclicas;
- secuencia de entrega que impide valor independiente;
- relación que debería ser parent, predecessor/successor, related o duplicate.

No exigir Epic o Feature universal. Reutilizar parents reales cuando el
objetivo lo justifique y marcar como propuesta cualquier parent nuevo.

### Tamaño, valor y límites de equipo

- comparar tamaños solo si existen estimaciones humanas comparables;
- señalar outliers con evidencia de alcance, sin recalcular Story Points;
- aplicar INVEST y detectar slices por capa sin valor;
- separar trabajo entre equipos/repos cuando cada uno tenga owner, ciclo o
  entrega independiente;
- no dividir solo porque hay varios repos si una slice vertical sigue siendo
  ejecutable y valiosa.

### Contexto técnico y operación

- contrastar paths, componentes, APIs, datos e integraciones con el repo;
- distinguir `Observed`, `Proposed` y `Pending decision`;
- comprobar rollout, compatibilidad, seguridad, observabilidad y migración
  cuando el riesgo los haga aplicables;
- identificar relaciones/links/attachments que requerirían capacidades no
  verificadas del proveedor.

## 4. PRESENTAR EL REPORTE

Formato:

```markdown
# Breakdown Audit

## Scope
- Objetivo/base: <fuente o ausente>
- Items revisados: <n>
- Repos/snapshots: <evidencia y freshness>
- Tracker/process: <observado o no inspeccionado>

## Blockers
- [Item/Sección] <hallazgo> — Evidencia: <fuente> — Resolución necesaria: <qué>

## Warnings
- [Item/Sección] <hallazgo> — Evidencia: <fuente> — Recomendación: <qué>

## Coverage
- Cubierto: <outcomes/requirements>
- Huecos: <outcomes/requirements>
- Duplicados: <pares o ninguno>

## Dependency and hierarchy review
- <DAG/parents/relaciones y ciclos>

## Verdict
BLOCKED | READY_WITH_CHANGES | READY
```

`BLOCKED` significa que crear ahora perdería intención, produciría estructura
inválida o exigiría inventar datos. `READY_WITH_CHANGES` contiene mejoras no
destructivas que el usuario puede aceptar o rechazar. `READY` no equivale a
aprobación para escribir.

## 5. ESPERAR UNA DECISIÓN

Ofrecer:

1. terminar con el reporte read-only;
2. proponer una versión corregida, mostrando cambios antes/después;
3. continuar al flujo de creación.

No aplicar correcciones en silencio. Si el usuario elige 2, presentar el texto
completo corregido y pedir aprobación. Si elige 3, cualquier blocker debe
estar resuelto o aceptado explícitamente cuando no comprometa integridad.

## 6. HANDOFF AL FLUJO CANÓNICO

Al continuar:

1. pasar a `CLARIFY.md` solo para decisiones de negocio aún abiertas;
2. entregar a Shape el input original verbatim y el reporte como contexto;
3. en schema full, `brief.md` conserva el desglose original sin reescribir;
4. requirements/design/deltas/tasks contienen la versión normalizada y
   aprobada;
5. `BREAKDOWN.md` vuelve a validar INVEST, cobertura y DAG;
6. `PERSIST-AND-HANDOFF.md` usa exclusivamente `agteamos-work-items`.

La auditoría no sustituye los gates SDD, el preflight semántico, provider
doctor, fingerprint, aprobación exacta ni read-back.

## ANTI-PATTERNS

- Crear una carpeta de análisis paralela a `agteamos/changes/`.
- Corregir mientras se audita y ocultar el delta al usuario.
- Exigir Feature/Epic por una política de otro proyecto.
- Usar estimaciones para comparar items de escalas/equipos distintos.
- Tratar un mirror no verificado como fuente vigente.
- Convertir `READY` en autorización de creación.
