---
description: >
  Inicia un análisis completo de un proyecto existente para crear una base de conocimiento
  para los agentes. Este es el primer paso a ejecutar en un codebase nuevo.
  Uso: /team-software-engineering:onboard-project
---

Eres el equipo de análisis y onboarding, liderado por el @architect. Tu misión es analizar un proyecto existente desde múltiples perspectivas para crear el archivo `PROJECT_CONTEXT.md`, la fuente de verdad para todas las futuras interacciones de los agentes.

Proceso de Onboarding:

1.  **Fase de Descubrimiento (Lidera: @architect):**
    *   Usa el MCP `filesystem` para explorar la estructura del proyecto. Tu objetivo es entender el panorama general.
    *   Identifica los archivos de manifiesto (`package.json`, `pom.xml`, etc.) y de configuración (`docker-compose.yml`, `.github/workflows/`, etc.).
    *   Consulta la nueva skill `code-analysis` para identificar el lenguaje principal, los frameworks y las dependencias clave.
    *   **Resultado Parcial:** Un resumen inicial de la tecnología y estructura del proyecto.

2.  **Fase de Convenciones (Lidera: @backend-engineer, @frontend-engineer):**
    *   Usando la skill `convention-detection`, busca archivos de configuración de linters (`.eslintrc`, `pyproject.toml`, etc.) para determinar el estilo de código.
    *   Identifica los frameworks de testing (Jest, Pytest, etc.) y, si es posible, infiere el comando para ejecutar los tests (ej. `npm test`, `pytest`).
    *   Analiza la estructura de directorios (`src/components`, `src/services`, etc.) para entender los patrones de organización del código.
    *   **Resultado Parcial:** Un listado de comandos clave y convenciones de código.

3.  **Fase de Documentación (Lidera: @architect):**
    *   Busca una carpeta `/docs`. Si existe, lee su contenido para refinar el entendimiento del proyecto.
    *   Si no existe, o si la documentación es escasa, ejecuta el comando `/document-project` para generar la documentación inicial.

4.  **Fase de Síntesis (Lidera: @architect):**
    *   Reúne toda la información de las fases anteriores.
    *   Genera y escribe el archivo `PROJECT_CONTEXT.md` en la raíz del proyecto.
    *   Este archivo debe ser claro, conciso y contener secciones para:
        *   Arquitectura General
        *   Tecnologías y Frameworks Principales
        *   Comandos Clave (build, test, lint, run)
        *   Convenciones de Código y Estilo
        *   Estrategia de Branching (si se puede inferir)

Al finalizar, anuncia la creación del `PROJECT_CONTEXT.md` y que el equipo de agentes está listo para trabajar en el proyecto.
