# Skill: Análisis de Código

Esta skill te proporciona las técnicas para analizar un codebase desconocido y extraer información estructural y de dependencias. Es fundamental para el proceso de onboarding.

## Proceso de Análisis

1.  **Identificar el "Corazón" del Proyecto:**
    *   Busca primero los archivos de manifiesto. Estos son la clave para entender el proyecto a alto nivel.
        *   **Node.js:** `package.json` (mira `dependencies`, `devDependencies`, `scripts`).
        *   **Python:** `requirements.txt`, `pyproject.toml` (busca `[tool.poetry.dependencies]`), `Pipfile`.
        *   **Java:** `pom.xml` (busca `<dependencies>`), `build.gradle` (busca `dependencies { ... }`).
        *   **Go:** `go.mod`.
        *   **Rust:** `Cargo.toml`.
    *   De estos archivos, extrae: el nombre del proyecto, la versión, el lenguaje principal y, sobre todo, los **frameworks principales** (ej. `react`, `django`, `express`, `spring-boot`). El framework dicta la arquitectura.

2.  **Mapear la Estructura de Directorios:**
    *   Una vez que conoces el framework, puedes inferir la estructura.
    *   Busca un directorio `src` o `source`. Este es casi siempre el punto de entrada.
    *   **Ejemplos de patrones comunes:**
        *   `src/components`, `src/pages`, `src/hooks`: Típico de un frontend en React/Vue.
        *   `src/controllers`, `src/services`, `src/models`, `src/routes`: Típico de un backend MVC (Express, NestJS).
        *   `src/main/java/...`: Estructura estándar de Java/Spring.
        *   `[nombre_app]/models.py`, `[nombre_app]/views.py`, `[nombre_app]/urls.py`: Típico de Django.

3.  **Analizar las Dependencias y el "Cableado":**
    *   No leas cada archivo línea por línea al principio. Usa herramientas de búsqueda para encontrar las conexiones.
    *   **Comandos `grep` o `ripgrep` útiles:**
        *   `grep -r "import" ./src`: Para ver qué módulos se importan y cómo se conectan.
        *   Busca el "entrypoint": En un `package.json` es el `main` script o `scripts.start`. En un proyecto Python, puede ser `manage.py` o un `main.py`. En Java, la clase con `public static void main(String[] args)`.
        *   Busca la definición de rutas/URL para entender los puntos de entrada de la aplicación web.

4.  **Sintetizar los Hallazgos:**
    *   Resume tus hallazgos de forma concisa. El objetivo no es entender cada detalle, sino tener un mapa mental del proyecto.
    *   **Ejemplo de resumen:** "Este es un proyecto backend en Node.js usando el framework Express. La estructura sigue un patrón MVC, con las rutas definidas en `src/routes`, los controladores en `src/controllers` y la lógica de negocio en `src/services`. Las dependencias clave son `express`, `mongoose` y `jest` para testing. El punto de entrada es `server.js`."
