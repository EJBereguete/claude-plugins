# Domain-Level Code Smells (D1–D10)

Diez patrones de deuda de dominio, adaptados a Python/FastAPI, TypeScript/React y
C#/Blazor. Cada uno indica: qué buscar, cómo se ve en el stack real del usuario, y
la remediación concreta. Ninguno es "estilo" — todos afectan qué tan fácil es
razonar sobre el dominio a medida que el proyecto crece.

---

## D1 — Scattered Concept

El mismo predicado, derivación o chequeo de estado está reimplementado en varios
archivos con variaciones menores.

**Ejemplo (Python)**:
```python
# invoice_service.py
if invoice.status == "paid" and invoice.paid_at is not None:
    ...
# report_service.py
if inv.status == "paid" and inv.paid_at:
    ...
```
**Remediación**: centralizar en un método/propiedad (`Invoice.is_settled`) y
reemplazar todas las reimplementaciones.

## D2 — Missing System Metaphor

Funciones que operan sobre estructuras de datos crudas sin un tipo dedicado que
encapsule las reglas del dominio. Los llamadores repiten los mismos campos en vez
de trabajar con un objeto cohesivo.

**Ejemplo (TypeScript)**: cinco funciones distintas reciben
`(amount: number, currency: string, taxRate: number)` en vez de un tipo `Money`.

**Remediación**: introducir el tipo faltante solo cuando aparece la 2da o 3ra
función con la misma firma repetida — no antes (evitar sobre-diseño anticipado).

## D3 — Parallel Hierarchies

Dos jerarquías de tipos o funciones que evolucionan juntas (DTOs y modelos,
variantes de validación) y que deberían unificarse detrás de un adaptador en el
límite del sistema.

**Ejemplo (C#/Blazor)**: `InvoiceDto`, `InvoiceViewModel` e `InvoiceEntity` con
los mismos 12 campos duplicados y que cada uno agrega campos nuevos por
separado cuando cambia el requerimiento.

**Remediación**: un solo modelo de dominio + mapeo explícito en el borde
(serialización/presentación), no tres copias que hay que sincronizar a mano.

## D4 — Second Way of Doing X

Un nuevo helper o utilidad duplica funcionalidad que ya existe en el codebase,
normalmente porque no se buscó antes de escribir.

**Remediación**: `grep` antes de crear — si ya existe `formatCurrency`, no crear
`formatMoney`. Eliminar el duplicado y usar el existente.

## D5 — Leaky Boundary

Un módulo accede a los internals de otro (campos privados, helpers internos,
filas de base de datos) en vez de usar su interfaz pública, o hay dependencia
circular entre módulos.

**Ejemplo (Python/FastAPI)**: un router importa directamente el modelo SQLAlchemy
de otro dominio en vez de pasar por su repositorio/servicio.

**Remediación**: exponer lo necesario a través de la interfaz pública del módulo
(servicio o repositorio), nunca acceder al ORM ajeno directamente.

## D6 — God Module/Class

Un archivo o clase que acumula responsabilidades no relacionadas, típicamente
superando 400 líneas o creciendo significativamente por este cambio.

**Remediación**: extraer por responsabilidad (no por tamaño arbitrario) — si el
cambio agrega una responsabilidad nueva a un módulo que ya tiene 3+, esa es la
señal para partir, no para seguir agregando.

## D7 — Special-Case Undercut

Lógica condicional basada en valores específicos o feature flags que altera el
comportamiento central del dominio en lo profundo del módulo, en vez de resolverse
en el límite del sistema.

**Ejemplo**: `if tenant_id == "acme-corp": skip_validation()` enterrado dentro de
`InvoiceService.create()`.

**Remediación**: mover el caso especial a configuración o a un patrón
estrategia resuelto en el borde (middleware, factory), no dentro del flujo
principal.

## D8 — Anaemic Hot Path

Un módulo que se modifica con frecuencia carece de cobertura de tests mientras
módulos comparables sí la tienen.

**Remediación**: no es "agregar cobertura porque sí" — es proteger los
comportamientos críticos que ese módulo cambia seguido, con tests que fallarían
si esos comportamientos se rompieran.

## D9 — Dead Layer

Una capa de abstracción que nunca se llama o que solo reenvía la llamada sin
agregar valor.

**Ejemplo**: un `InvoiceFacade` que solo delega 1:1 a `InvoiceService` sin
transformar nada, con un único call site.

**Remediación**: eliminar la capa e inlinear la lógica en su único punto de uso.

## D10 — Drifted Copies

Instancias de D1 (concepto disperso) que ya divergieron en su implementación,
generando ambigüedad sobre cuál es la regla de negocio correcta.

**Remediación**: identificar cuál copia es la correcta (preguntar al dominio, no
asumir), documentar la decisión, y unificar — nunca promediar ambas
implementaciones "por las dudas".

---

## Severidad y clasificación

Cada smell detectado se reporta con el mismo formato de severidad que
`agteamos-quality` (Bloqueante/Importante/Sugerencia), aplicando la ratchet rule
de `agteamos-quality` (ver `SKILL.md`): solo bloqueante si el cambio
actual introduce o extiende el smell.
