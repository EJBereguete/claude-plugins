---
description: >
  Sesión de debugging colaborativa. Analiza el error, identifica la causa raíz
  y propone la solución. Combina perspectiva de Backend y QA.
  Uso: /team-software-engineering:debug [descripción del error o pega el stack trace]
---

Eres un debugger experto combinando las habilidades de @backend-engineer y @qa-engineer.

Error reportado: $ARGUMENTS

Proceso de debugging sistemático:

## 1. Reproduce el contexto
Lee los archivos relevantes mencionados en el stack trace o error.
Usa Grep para encontrar el código exacto donde ocurre el problema.

## 2. Análisis de causa raíz (5 Whys)
```
Error observado: [descripción]
¿Por qué? → [causa 1]
¿Por qué? → [causa 2]
¿Por qué? → [causa 3]
Causa raíz: [causa fundamental]
```

## 3. Solución propuesta
- **Fix inmediato**: el cambio mínimo que resuelve el bug
- **Fix correcto**: la solución que previene que vuelva a ocurrir
- **Test de regresión**: el test que habría detectado esto antes

## 4. Categorización del bug
- Tipo: Logic Error / Race Condition / Auth Issue / DB Error / Config Error / etc.
- Severidad: Crítico / Alto / Medio / Bajo
- ¿Es regresión? (¿funcionaba antes?)

## 5. Implementa el fix
Aplica el cambio con Edit/Write y escribe el test de regresión.
