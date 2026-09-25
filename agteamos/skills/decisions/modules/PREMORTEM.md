# Premortem — crítica opt-in

## Contrato

El premortem construye el caso más fuerte contra una idea, plan, feature, RFC,
ADR o proyecto. Produce opinión de solo lectura:

- veredicto;
- grietas priorizadas por severidad;
- causa de muerte más probable;
- arreglos concretos.

No modifica código ni documentos, no crea tickets y no cambia estados. El
usuario decide qué hacer con el resultado.

## Consentimiento y alcance

Ejecutar únicamente cuando:

1. el usuario lo pide de forma directa; o
2. el flujo lo ofrece y el usuario acepta.

Es opcional, nunca automático, bloqueante ni requisito de `Accepted`. Rechazar
la oferta deja el flujo exactamente igual.

Puede ofrecerse desde bootstrap, task, RFC o ADR, pero ofrecer no equivale a
ejecutar: cada invocación requiere el opt-in anterior.

La petición debe identificar un objeto concreto. Si el contexto no contiene
ninguno, hacer como máximo una pregunta. No ampliar de una feature a todo el
proyecto sin permiso.

## Investigación y fan-out

Por defecto, trabajar en un solo hilo con el material que el usuario entregó y
el contexto local estrictamente necesario.

La investigación externa solo se ejecuta cuando se cumplen ambas condiciones:

- existe una incertidumbre concreta que puede cambiar materialmente el
  veredicto; y
- el usuario dio permiso explícito para investigar, ya sea en su solicitud o
  después de una pregunta directa.

Si falta cualquiera, no usar WebSearch/WebFetch ni fingir fuentes. Separar
hechos aportados, inferencias y datos faltantes.

El fan-out a subagentes también exige simultáneamente:

- un objeto grande o complejo que se beneficie de perspectivas independientes;
- una descomposición necesaria y no meramente conveniente; y
- permiso explícito del usuario.

Sin necesidad y permiso, no lanzar subagentes. Incluso con permiso, usar el
mínimo número útil, dividir ángulos sin solapamiento y sintetizar sin repetir.

Una solicitud explícita de revisar el proyecto entero autoriza lectura local
del proyecto, pero no investigación web ni fan-out salvo que también los
autorice. Limitar la lectura a README, manifiestos, contexto arquitectónico,
estructura y archivos clave. Si existe un audit reciente, reutilizarlo en vez
de repetir una auditoría técnica.

## Actitud

- Atacar la idea, nunca a la persona.
- No abrir ni cerrar con elogios, validación o relleno cortés.
- Ser directo, específico y falsable; no inventar defectos.
- Asumir como hipótesis de trabajo que el objeto fracasó y reconstruir por qué.
- La salida debe permitir decidir o reparar, no solo demoler.

## Ocho ángulos

Recorrer los ocho. Si uno no aplica, decirlo en una línea; no rellenar.

1. **Premisas falsas:** qué supuesto sostiene todo y sigue sin demostrarse.
2. **Problema y mercado:** dolor real, frecuencia, disposición a pagar o
   prioridad del usuario.
3. **Competencia:** alternativas directas, statu quo y no hacer nada.
4. **Viabilidad:** obstáculos técnicos, legales, operativos o regulatorios.
5. **Números:** costos, margen, adquisición, retorno, runway o esfuerzo frente
   al valor.
6. **Ejecución:** capacidad real del equipo, tiempo, skill, capital y
   distribución.
7. **Cómo muere:** autopsia concreta a 12 meses y causa probable.
8. **Punto ciego:** tema incómodo ausente de la descripción.

Para una feature, reinterpretar mercado/competencia/números como prioridad
frente al backlog, capacidad existente y costo de oportunidad.

Cuando el objeto vive en AgTeamOS y el historial conceptual es relevante,
revisar únicamente `agteamos/decisions/out-of-scope/`. Si aparece una
coincidencia, exponer fecha y razón previa y preguntar qué cambió. Esta lectura
acotada no autoriza explorar otros ámbitos.

## Formato de salida

Responder en el idioma del usuario y siempre en este orden:

1. **VEREDICTO** — una a tres frases; conclusión primero.
2. **Grietas por severidad** — no por ángulo. Para cada una:
   - `El golpe`: problema específico.
   - `Por qué es letal`: qué se rompe.
   - `Qué tendría que ser cierto`: condición de supervivencia o arreglo.
3. **La que lo mata** — una causa principal sin ambigüedad.
4. **Si insistes, arregla esto primero** — acciones priorizadas, medibles y
   ejecutables.

Si se anexará a un RFC o ADR, condensar después el resultado a `Veredicto`,
`Grieta más letal` y `Mitigación aceptada`. El usuario o aprobador decide la
mitigación; el premortem no la declara aceptada por sí mismo.

## Calibración

Brutal no significa falso. Una idea solo aguanta después de recorrer los ocho
ángulos sin encontrar una grieta letal. No inventar fallas para cubrir una
cuota. Si aguanta, decirlo sin entusiasmo y listar los supuestos que siguen en
riesgo.

## Anti-patrones

- Ejecutarlo porque el agente cree que sería útil, sin opt-in.
- Investigar por curiosidad o para adornar una crítica.
- Lanzar fan-out automáticamente por tamaño.
- Confundirlo con auditoría de calidad o seguridad del código.
- Reportar recomendaciones genéricas sin nombres, cifras o condiciones.
- Bloquear RFC, ADR, bootstrap o task por el veredicto.
- Convertir el resultado en out-of-scope sin aceptación explícita del usuario.
