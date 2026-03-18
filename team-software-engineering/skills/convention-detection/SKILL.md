# Skill: Detección de Convenciones

Esta skill te permite inferir las "reglas no escritas" y las "reglas explícitas" de un proyecto para que tu código se alinee perfectamente con el estilo y los procesos existentes.

## 1. Detección de Comandos Clave

La forma más fiable de encontrar los comandos del proyecto es a través del archivo `package.json`.

*   **Comando:** `grep "scripts" package.json`
*   **Qué buscar:**
    *   `"test"`: Este es el comando para ejecutar tests. Casi universal.
    *   `"start"` o `"dev"`: El comando para iniciar el servidor de desarrollo.
    *   `"build"`: El comando para compilar el proyecto para producción.
    *   `"lint"`: El comando para ejecutar el linter.
*   **Si no hay `package.json` (ej. Python):**
    *   Busca un `Makefile`. Contendrá los comandos más comunes (`make test`, `make lint`).
    *   Busca un `tox.ini` o `noxfile.py`, que definen entornos de testing.
    *   Busca en los archivos de CI (ej. `.github/workflows/ci.yml`) la sección `run:` para ver qué comandos se ejecutan.

## 2. Detección de Estilo de Código y Linting

El estilo de código casi siempre está definido por un archivo de configuración de linter en la raíz del proyecto.

*   **Busca estos archivos (en orden de prioridad):**
    1.  `.eslintrc.js`, `.eslintrc.json` (JavaScript/TypeScript): Indica el uso de ESLint. Lee las `rules` para entender las convenciones.
    2.  `pyproject.toml` (Python): Busca las secciones `[tool.ruff]`, `[tool.black]` o `[tool.flake8]`. Black es un formateador, Ruff/Flake8 son linters.
    3.  `.prettierrc` (Multi-lenguaje): Indica el uso de Prettier para el formateo automático.
    4.  `checkstyle.xml` (Java): Configuración para Checkstyle.
*   **Inferencia:** Si encuentras uno de estos archivos, tu principal objetivo es **obedecerlo**. Antes de entregar tu código, ejecuta el comando de linting que descubriste en el paso anterior.

## 3. Detección de Estrategia de Commits y PRs

*   **Conventional Commits:** Revisa el historial de git con `git log -n 10`. Si los mensajes de commit se ven así: `feat: add user login` o `fix: correct validation bug`, el proyecto usa "Conventional Commits". Debes seguir este formato.
*   **Plantillas de Pull Request:** Busca en el repositorio una carpeta `.github/`. Si dentro hay un archivo `PULL_REQUEST_TEMPLATE.md`, úsalo como guía para describir tus Pull Requests.

## 4. Detección de Estructura de Módulos

*   No reinventes la rueda. Mira cómo están organizados los archivos existentes.
*   **Preguntas a responder:**
    *   ¿Dónde se definen los componentes de UI? (`src/components`?)
    *   ¿Dónde está la lógica de negocio? (`src/services`, `src/lib`, `src/use-cases`?)
    *   ¿Dónde se colocan los tests? ¿Junto a los archivos de código (`*.test.js`) o en una carpeta separada (`__tests__`)?
*   **Regla de oro:** Imita la estructura existente. Si el proyecto tiene una carpeta `utils` para funciones de ayuda, añade tu nueva función de ayuda ahí, no crees una carpeta `helpers`.
