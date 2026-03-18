# Skill: Refactorización Segura

Esta skill te guía para mejorar la estructura del código existente sin alterar su comportamiento externo. La clave de la refactorización segura es la verificación constante a través de tests.

## Principios Fundamentales

1.  **Baby Steps (Pasos de Bebé):** Realiza cambios muy pequeños y atómicos. Después de cada cambio mínimo, ejecuta los tests. Si algo se rompe, es infinitamente más fácil de depurar. No intentes "hervir el océano".

2.  **Los Tests son tu Red de Seguridad:** NUNCA refactorices código que no tiene cobertura de tests. Si el código que quieres mejorar no tiene tests, **tu primer paso es escribir tests de caracterización**. Estos tests no prueban que el código es correcto, sino que capturan su comportamiento actual, con bugs y todo. Una vez que los tests pasan, puedes empezar a refactorizar, y tu objetivo es que los tests sigan pasando.

3.  **Refactorizar es Diferente de Añadir Funcionalidad:** No hagas las dos cosas al mismo tiempo. Si estás en una tarea de refactorización, solo mejora la estructura. Si estás en una tarea para añadir una feature, evita refactorizaciones masivas. Son dos "sombreros" diferentes.

## Técnicas Comunes de Refactorización Segura

### 1. Renombrar (Variable, Función, Clase)
*   **Técnica:** Es la refactorización más simple y una de las más potentes. Usa las capacidades de tu IDE/editor para hacer un renombramiento semántico en todo el proyecto.
*   **Verificación:** Después de renombrar, ejecuta todos los tests. Si el lenguaje es compilado, el propio compilador te avisará de errores.

### 2. Extraer Método / Función
*   **Cuándo:** Cuando tienes una función muy larga o una pieza de código que se repite en varios lugares.
*   **Técnica:**
    1.  Copia el fragmento de código que quieres extraer.
    2.  Crea una nueva función y pega el código.
    3.  Identifica las variables que necesita la nueva función y pásalas como parámetros.
    4.  Identifica el valor de retorno que debe proporcionar la nueva función.
    5.  En el lugar original, reemplaza el código extraído con una llamada a la nueva función.
*   **Verificación:** Ejecuta los tests.

### 3. Mover Función
*   **Cuándo:** Cuando una función está en un módulo incorrecto y tiene más afinidad con otro.
*   **Técnica:**
    1.  Copia la función al nuevo módulo.
    2.  Actualiza todas las llamadas a la función original para que apunten al nuevo módulo.
    3.  Elimina la función del módulo antiguo.
*   **Verificación:** Ejecuta los tests y el linter.

### 4. Reemplazar Condicional con Polimorfismo
*   **Cuándo:** Cuando tienes un `switch` o una cadena de `if/else` que verifica el tipo de un objeto para decidir un comportamiento.
*   **Técnica:**
    1.  Crea una interfaz o clase base con un método para el comportamiento que varía.
    2.  Crea clases concretas para cada caso del condicional, implementando el método de la interfaz.
    3.  Reemplaza la llamada al condicional con una llamada al método polimórfico del objeto.
*   **Verificación:** Esta es una refactorización compleja. Requiere tests unitarios muy sólidos para cada caso del condicional antes de empezar.
