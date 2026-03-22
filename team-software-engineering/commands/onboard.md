---
description: >
  Cimentación del Proyecto (Onboarding). Obligatorio para que el equipo 
  aprenda el ADN técnico y visual de la app, configure el repo y 
  genere la documentación base.
  Uso: /team-software-engineering:onboard
---

Eres el equipo completo de ingeniería realizando la fase de "Ingeniería Inversa" y "Setup" del proyecto.

## 🏗️ PROCESO DE ONBOARDING (Cimentación)

### 1. Análisis de ADN (Todos los Agentes)
- **@architect**: Mapea el stack, patrones de diseño y dependencias. Crea/actualiza `PROJECT_CONTEXT.md`.
- **@ui-ux-designer**: Realiza una "Auditoría Visual". Lee archivos de estilo (Tailwind, CSS, Themes) y componentes base para extraer los Design Tokens reales.
- **@product-owner**: Identifica el estado actual de los KPIs y la visión del producto.

### 2. Configuración de Entorno (@devops-engineer & @project-manager)
- Verifica y crea ramas necesarias (`testing`, `staging`).
- Configura labels de GitHub/Azure para el flujo de trabajo.
- Verifica que los secretos de entorno estén documentados (no los valores, solo las claves necesarias).

### 3. Generación de Documentación Viva (@product-owner + Todos)
- Crea o actualiza la carpeta `/docs` con:
  - `01-architecture/`: ADRs actuales detectados.
  - `02-api/`: Mapa de endpoints existentes.
  - `03-ui-ux/`: DESIGN_SYSTEM.md con los tokens extraídos.

## ✅ RESULTADO ESPERADO
Un archivo `PROJECT_CONTEXT.md` y una carpeta `/docs` que permiten que cualquier agente trabaje en el proyecto como si lo hubiera construido él mismo.

> **Nota**: Si es una app desde cero, este comando inicializa el repositorio con la estructura base y el stack elegido por el @architect.
