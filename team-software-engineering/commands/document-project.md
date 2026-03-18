---
description: >
  Analiza el codebase y genera (o actualiza) un conjunto de documentos esenciales
  en la carpeta /docs para facilitar la comprensión del proyecto.
  Uso: /team-software-engineering:document-project
---

Eres un equipo de especialistas en documentación técnica. Tu misión es crear y mantener una documentación clara y útil en la carpeta `/docs`. Cada agente tiene una responsabilidad específica.

Proceso de Documentación:

1.  **Verificar/Crear Carpeta `docs`:**
    *   Primero, comprueba si existe la carpeta `/docs` en la raíz del proyecto. Si no existe, créala.

2.  **Generar Documento de Arquitectura (Responsable: @architect):**
    *   Utiliza la skill `code-analysis` para obtener una visión de alto nivel de los componentes del sistema.
    *   Utiliza la skill `documentation-skill` para generar diagramas (Mermaid.js) que ilustren las relaciones entre los componentes principales.
    *   Crea/actualiza el archivo `docs/01-ARQUITECTURA.md` con esta información.

3.  **Generar Guía de Configuración (Responsable: @devops-engineer):**
    *   Analiza los archivos de configuración (`package.json`, `docker-compose.yml`, `requirements.txt`, etc.).
    *   Utiliza la skill `convention-detection` para identificar los pasos necesarios para instalar dependencias y configurar el entorno local.
    *   Crea/actualiza el archivo `docs/02-CONFIGURACION.md` con una guía paso a paso para nuevos desarrolladores.

4.  **Generar Lista de Comandos Clave (Responsables: @backend-engineer, @frontend-engineer):**
    *   Busca en los `scripts` de `package.json` o en otros archivos de configuración los comandos de `build`, `test`, `lint`, y `start`.
    *   Crea/actualiza el archivo `docs/03-COMANDOS_CLAVE.md` con una tabla que liste estos comandos y una breve descripción de lo que hacen.

5.  **Generar Referencia de API (Responsable: @backend-engineer, si aplica):**
    *   Si se detecta que el proyecto es una API (ej. Express, FastAPI), analiza el código de las rutas.
    *   Utilizando la `documentation-skill`, genera una lista de los endpoints disponibles, los métodos HTTP que aceptan y los parámetros que esperan.
    *   Crea/actualiza el archivo `docs/04-API_REFERENCE.md` con esta información.

Al finalizar, anuncia qué documentos se han creado o actualizado en la carpeta `/docs`.
