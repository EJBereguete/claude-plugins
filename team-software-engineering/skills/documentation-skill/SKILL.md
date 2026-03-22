# Skill: Documentación Técnica de Élite (Living Docs)

Esta skill define el estándar de oro para la documentación del equipo. La documentación no es un opcional; es parte del entregable.

## 1. El Estándar Mermaid.js (MANDATORIO)
Todo cambio arquitectónico, flujo de usuario o lógica de negocio compleja **DEBE** incluir un diagrama Mermaid.js. No se aceptan descripciones textuales para procesos que pueden ser visualizados.

### Tipos de Diagramas Requeridos:
- **Flujos de Usuario**: `graph TD` para lógica de navegación y decisiones.
- **Interacción de Componentes**: `sequenceDiagram` para llamadas API entre Frontend y Backend.
- **Arquitectura de Sistema**: `C4Component` o `graph LR` para infraestructura y servicios.
- **Modelado de Datos**: `erDiagram` para esquemas de base de datos.
- **Estados de UI**: `stateDiagram-v2` para componentes complejos (ej: formularios, wizards).

## 2. Decisiones de Arquitectura (ADRs)
Cada decisión técnica significativa (cambio de base de datos, elección de un framework, estrategia de caché) debe quedar registrada en un **Architecture Decision Record (ADR)**.

**Estructura de un ADR:**
- **Título**: [ADR-00X] Título de la decisión.
- **Contexto**: ¿Qué problema estamos resolviendo?
- **Decisión**: ¿Qué elegimos y por qué?
- **Alternativas**: ¿Qué otras opciones consideramos y por qué las descartamos?
- **Consecuencias**: ¿Qué impacto tiene esto en el futuro? (Positivo/Negativo).

## 3. Documentación Centrada en el Código
- **Self-Documenting Code**: El código debe ser legible. Los nombres de variables y funciones deben explicar el *qué*.
- **Docstrings Proactivos**: Explicar el *por qué* y los *edge cases* no evidentes.
- **README dinámico**: El README principal debe ser la puerta de entrada, con links a la carpeta `/docs` generada por `/document-project`.

## 4. Estructura de la Carpeta `/docs`
El comando `/document-project` debe organizar la información así:
- `01-architecture/`: Diagramas de sistema y ADRs.
- `02-api/`: Contratos de API (OpenAPI/Mermaid).
- `03-ui-ux/`: Guía de estilos, Design Tokens y Flujos de Pantalla.
- `04-operations/`: Guía de despliegue, variables de entorno y runbooks de SRE.

## 5. Validación de Documentación (DoD)
- [ ] ¿El PR incluye o actualiza la documentación necesaria?
- [ ] ¿Se incluyó un diagrama Mermaid para flujos complejos?
- [ ] ¿Si hubo una decisión técnica clave, se creó un ADR?
- [ ] ¿Los JSDoc/Docstrings son precisos y útiles?
