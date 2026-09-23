# Los ocho ángulos — detalle ampliado

Referencia de apoyo para `agteamos-premortem`. Cada ángulo trae preguntas
guía concretas y el tipo de golpe que se espera — no una lista para marcar
con un check, sino munición para argumentar en contra.

---

## 1. Premisas falsas

Preguntas guía:
- ¿Qué frase de la idea empieza (implícitamente) con "asumiendo que..."?
- Si esa premisa es falsa, ¿qué parte de la idea sigue en pie? Normalmente: nada.
- ¿La premisa está demostrada con evidencia externa, o es solo "tiene sentido para mí"?

Golpe tipo: "Todo esto depende de que [X] sea cierto. No hay una sola fuente,
dato o experimento que lo respalde — es una corazonada disfrazada de
fundamento."

## 2. El problema y el mercado

Preguntas guía:
- ¿Alguien perdió dinero, tiempo o dignidad por no tener esto? ¿O solo sería "conveniente"?
- ¿Existe evidencia de que la gente ya paga (dinero, tiempo, cambio de hábito) por resolver esto de otra forma?
- ¿Cuántas personas tienen este problema y con qué frecuencia — una vez al año no sostiene un negocio ni justifica una feature.

Golpe tipo: "Nadie se despierta pensando en este problema. Es un 'estaría
padre', no un dolor — y los 'estaría padre' no generan retención ni pago."

## 3. La competencia

Preguntas guía:
- ¿Quién ya resuelve esto — directo o indirecto (Excel, un proceso manual, no hacer nada)?
- Si el usuario dice "no hay competencia": ¿es porque el mercado no existe, o porque nadie lo buscó bien?
- ¿Qué impide que el jugador ya establecido lo copie en una sprint?

Golpe tipo: "El competidor real no es otra empresa, es la hoja de cálculo
que ya usan gratis. Ese es el bar a superar, y hoy no lo supera."

## 4. Viabilidad

Preguntas guía:
- ¿Qué parte de la propuesta de valor requiere que algo difícil (técnico, legal, regulatorio, operativo) simplemente funcione, sin plan B?
- ¿Dónde está el paso que hoy se resume en una frase pero en la práctica son semanas?
- ¿Depende de un tercero (API, proveedor, partner) que puede cambiar reglas o precio sin aviso?

Golpe tipo: "'Solo hay que integrar con el proveedor X' esconde 6 semanas de
negociación de contrato y una dependencia que puede subir el precio 10x
mañana."

## 5. Los números

Preguntas guía:
- ¿Cuánto cuesta conseguir un cliente/usuario, y cuánto deja a lo largo del tiempo? ¿La segunda cifra es mayor que la primera con margen real?
- ¿Cuánto tiempo de runway hay si el crecimiento es la mitad de lo proyectado?
- ¿Los supuestos de conversión/retención se basan en benchmarks de la industria o en optimismo?

Golpe tipo: "El costo de adquisición supera el valor de vida del cliente en
el escenario base, no solo en el pesimista. Esto no escala, empeora."

## 6. La ejecución

Preguntas guía:
- ¿El equipo actual tiene, hoy, la habilidad específica que esto requiere — o hay que contratarla/aprenderla?
- ¿Cuánto tiempo/dinero/atención real tiene disponible quien lo va a ejecutar, descontando lo que ya está comprometido?
- ¿Qué pasa si la persona clave (a menudo una sola) se enferma, se va, o simplemente se cansa?

Golpe tipo: "Esto depende de que una sola persona, part-time, aprenda una
disciplina nueva y la ejecute perfecto en 3 meses. Ese es el plan real, no
el que está escrito."

## 7. Pre-mortem (cómo muere)

Método: adelantar el reloj 12 meses, el proyecto fracasó, escribir la
autopsia como si ya hubiera pasado — no como advertencia abstracta.

Golpe tipo: "Mes 4: el primer cliente grande pide una feature que no estaba
en el plan y consume todo el roadmap. Mes 7: el runway se acaba antes de
validar el segundo canal de adquisición. Mes 9: el fundador técnico se va
por burnout. Eso es lo más probable que pase, no un escenario extremo."

## 8. El punto ciego

Preguntas guía:
- ¿Qué tema aparece mencionado una sola vez y de pasada en toda la descripción — esa es la señal.
- ¿Qué pregunta, si se la hicieran directamente, generaría una pausa incómoda antes de responder?
- ¿Hay algo que el usuario está evitando validar porque sospecha que la respuesta no le va a gustar?

Golpe tipo: "En ningún momento se menciona qué pasa si el regulador cambia
la norma — y es la industria con más cambios regulatorios de los últimos 3
años. Eso no es un olvido, es evitación."
