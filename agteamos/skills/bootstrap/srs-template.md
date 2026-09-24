# Especificación de Requisitos de Software (SRS)
## [Nombre del Proyecto]

| Versión | Fecha | Autor(es) | Descripción del cambio | Aprobado por |
|---|---|---|---|---|
| 0.1.0 | AAAA-MM-DD | | Versión inicial | |

> **Cómo usar esta plantilla:** reemplaza el texto entre `[corchetes]` con la información real del proyecto. Elimina las secciones que no apliquen (no todo proyecto necesita IA/ML, hardware, etc.). Cada requisito debe tener un ID único, ser verificable y estar redactado en modo imperativo ("El sistema deberá...").
>
> **Fuente de verdad de los IDs `RF-XXX`**: este documento es el catálogo
> global de requisitos funcionales del proyecto. Cuando después se arranque
> una feature concreta con `agteamos-task`, el `requirements.md` de esa
> tarea (ver `agteamos-spec`) debe **citar** el `RF-XXX` que le
> corresponda en vez de reescribirlo — un mismo requisito no debe tener dos
> redacciones distintas viviendo en dos archivos.

---

## 1. Introducción

### 1.1 Propósito
[Para qué sirve este documento y a quién está dirigido: equipo de desarrollo, QA, cliente, stakeholders.]

### 1.2 Alcance
[Qué abarca el sistema/producto y qué queda explícitamente fuera del alcance (out of scope). Nombre del producto, versión, y beneficios/objetivos generales.]

### 1.3 Objetivos
- [Objetivo general del proyecto]
- [Objetivos específicos]

### 1.4 Definiciones, acrónimos y abreviaturas
| Término | Definición |
|---|---|
| [Ej: MVP] | [Producto Mínimo Viable] |

### 1.5 Referencias
- [Documentos relacionados: mockups, diagramas, contratos, estándares usados (IEEE 830, ISO/IEC/IEEE 29148)]

### 1.6 Resumen del documento
[Breve descripción de cómo está organizado el resto del documento.]

---

## 2. Descripción general del producto

### 2.1 Perspectiva del producto
[Contexto del sistema: es nuevo, reemplaza a otro, se integra con sistemas externos, etc. Diagrama de contexto si aplica.]

### 2.2 Información del dominio del problema
[Descripción del negocio/problema que resuelve el sistema, en lenguaje no técnico.]

### 2.3 Glosario de términos del dominio
| Término | Definición |
|---|---|
| | |

### 2.4 Funciones del producto (resumen de alto nivel)
[Lista breve de las grandes capacidades del sistema, sin entrar en detalle — eso va en la sección 4.]

### 2.5 Características de los usuarios / actores
| Actor | Descripción | Nivel técnico |
|---|---|---|
| [Ej: Propietario] | [Rol y qué hace en el sistema] | [Bajo/medio/alto] |
| [Ej: Administrador] | | |

### 2.6 Restricciones generales
[Tecnológicas, legales, de negocio, de presupuesto o de tiempo.]

### 2.7 Supuestos y dependencias
[Qué se asume verdadero para que los requisitos sean válidos; de qué depende el sistema (APIs externas, hardware, terceros).]

---

## 3. Necesidades y procesos de negocio

### 3.1 Objetivos de negocio
| ID | Objetivo | Descripción |
|---|---|---|
| OBJ-001 | | |

### 3.2 Actores de negocio
| Actor | Rol en el negocio |
|---|---|
| | |

### 3.3 Procesos de negocio a implementar
| ID | Proceso | Descripción breve |
|---|---|---|
| PN-001 | | |

---

## 4. Casos de uso del sistema

> Uno por cada flujo importante. Duplica esta tabla por cada caso de uso.

### CU-001: [Nombre del caso de uso]
| Campo | Detalle |
|---|---|
| **Actor(es)** | |
| **Precondición** | |
| **Flujo principal** | 1. ... <br> 2. ... |
| **Flujos alternativos** | |
| **Postcondición** | |
| **Requisitos relacionados** | RF-XXX |

### 4.1 Diagrama de casos de uso
[Insertar diagrama — actores vs. casos de uso.]

---

## 5. Requisitos funcionales del sistema

> Organiza por módulo (Registro, Login, Gestión de perfil, etc.). Cada requisito con ID único, verificable, y trazable a un caso de uso.

### 5.1 [Módulo: ej. Registro]
| ID | Requisito | Prioridad | Caso de uso relacionado |
|---|---|---|---|
| RF-001 | La aplicación deberá permitir... | Alta/Media/Baja | CU-001 |
| RF-002 | La aplicación deberá impedir... | | |

### 5.2 [Módulo: ej. Login y recuperación]
| ID | Requisito | Prioridad | Caso de uso relacionado |
|---|---|---|---|
| RF-XXX | | | |

### 5.3 [Módulo: ej. Gestión de perfil]
...

### 5.4 [Módulo adicional según el proyecto]
...

---

## 6. Requisitos no funcionales del sistema

> Basado en atributos de calidad (rendimiento, seguridad, usabilidad, disponibilidad, mantenibilidad, escalabilidad, observabilidad).

| ID | Categoría | Requisito | Métrica / Criterio de aceptación |
|---|---|---|---|
| RNF-001 | Rendimiento | El sistema deberá responder... | Ej: < 2s en el 95% de las solicitudes |
| RNF-002 | Seguridad | | |
| RNF-003 | Usabilidad | | |
| RNF-004 | Disponibilidad | | |
| RNF-005 | Escalabilidad | | |
| RNF-006 | Mantenibilidad | | |
| RNF-007 | Observabilidad / Logging | | |

---

## 7. Requisitos de interfaz

### 7.1 Interfaces de usuario
[Pantallas, navegación, accesibilidad, wireframes/mockups relacionados.]

### 7.2 Interfaces de hardware
[Si aplica: dispositivos, sensores, impresoras, etc.]

### 7.3 Interfaces de software
[APIs externas, librerías, servicios de terceros con los que se integra.]

### 7.4 Interfaces de comunicación
[Protocolos: REST, WebSockets, colas de mensajes, etc.]

---

## 8. Restricciones de diseño e implementación

- **Instalación / despliegue:** [Docker, Cloud Run, on-premise, etc.]
- **Entrega continua / CI-CD:** [pipelines, ambientes]
- **Portabilidad:** [navegadores, sistemas operativos soportados]
- **Costos y plazos:** [presupuesto, fechas límite]
- **Gestión de cambios:** [cómo se aprueban cambios a este documento]

---

## 9. Requisitos de IA/ML *(solo si aplica)*

- **Especificación del modelo:** [tipo de modelo, entradas/salidas esperadas]
- **Gestión de datos:** [origen, calidad, privacidad de los datos]
- **Guardrails y ética:** [límites de uso, sesgos a evitar]
- **Supervisión humana (human-in-the-loop):** [cuándo interviene una persona]

---

## 10. Verificación y trazabilidad

### 10.1 Métodos de verificación
[Cómo se comprobará cada requisito: prueba manual, prueba automatizada, revisión, demostración.]

### 10.2 Matriz de trazabilidad

Formato base (siempre presente):
| Requisito | Caso de uso | Método de verificación | Estado |
|---|---|---|---|
| RF-001 | CU-001 | | Pendiente/En progreso/Verificado |

**Columna 5 — solo si `agteamos/platform.yml` tiene `tracker: planner`**:
agregar `| Planner Task ID |` al final de cada fila. La llena
`agteamos-bootstrap` (Step 3.5) al crear una tarea de Planner por cada
`RF-XXX`, y la usa `agteamos-implement` (Step 5) para saber qué tarea de
Planner actualizar cuando el requisito se verifica:
| Requisito | Caso de uso | Método de verificación | Estado | Planner Task ID |
|---|---|---|---|---|
| RF-001 | CU-001 | | Pendiente/En progreso/Verificado | `<id>` |

> Esta tabla se actualiza en `agteamos-implement` (Step 5 — Verify), no a
> mano: cuando una tarea que cita `RF-XXX` en su `requirements.md` cierra con
> `verify-report.md` en `PASS`, la fila correspondiente pasa a `Verificado`
> (y, si hay `tracker: planner`, la tarea de Planner citada en la columna 5
> se marca `percentComplete: 100` vía `[operación: close-ticket]`).

---

## 11. Diagramas de arquitectura

### 11.1 Diagrama de componentes
[Insertar diagrama mostrando los componentes principales — ej: Usuario, Servicios, Persistencia, Seguridad, DB — y sus relaciones.]

### 11.2 Otros diagramas relevantes
[Diagrama de despliegue, de secuencia, entidad-relación, etc. según el proyecto.]

---

## Apéndices

- **A. Mockups / prototipos**
- **B. Documentos de referencia adicionales**
- **C. Historial de decisiones importantes**

---

*Plantilla basada en IEEE 830-1998 e ISO/IEC/IEEE 29148, adaptada para el flujo ágil de AgTeamOS.*
