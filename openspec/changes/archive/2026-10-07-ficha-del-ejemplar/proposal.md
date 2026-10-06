# Proposal: ficha-del-ejemplar

**Ticket:** [T-16](../../../docs/tickets/T-16-ficha-del-ejemplar-ampliada.md) — primera mitad. La segunda, **`cuidados-por-ejemplar`** (overrides con herencia de la especie y perfil efectivo), se propone después.
**Historias:** [0.1](../../../docs/user-stories/0.1-registrar-cactus.md), [1.3](../../../docs/user-stories/1.3-estado-y-ciclo-de-vida-de-un-ejemplar.md)
**Pantallas del prototipo:** `plant-create`, `plant-detail` y `plants` en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html)

## Why

La ficha del ejemplar del prototipo da por supuestas cinco cosas que el modelo no tiene: **qué es** (descripción), **en qué situación está** (estado), **cuándo nació** (germinación), **cuándo y cómo llegó** (adquisición y procedencia). Hoy salen de constantes del frontend: `MOCK_STATUS` dice «Activa» para todas las plantas y `MOCK_CONTEXT` dice «Germinada 04/2021» a todas. Cinco campos del formulario de alta y edición están deshabilitados con «llega con T-16».

El estado es lo más importante. Una colección de 2000 ejemplares **pierde plantas**: mueren, se venden, se ceden, se extravían. Hoy no hay forma de decirlo sin borrar, y borrar destruye la historia —y el código, que no se reutiliza—. La historia 1.3 lo pide con claridad: *un ejemplar no desaparece de la historia por haber muerto; deja de estar activo, no deja de existir*.

## What Changes

**Esquema** — migración `V8`:

* `plant` gana `description`, `status`, `germination_year`, `germination_month`, `acquired_on`, `origin` y `origin_note`. Las plantas existentes quedan **activas** y sin datos de germinación ni origen.
* Tabla nueva `plant_status_change`: cada cambio de estado con su estado anterior, el nuevo, un motivo opcional y **cuándo ocurrió**.

**Backend**

* **Ficha ampliada.** `POST /plants` y `PUT /plants/{id}` aceptan y devuelven los campos nuevos (todos opcionales); el detalle y el listado los llevan.
* **Estados y transiciones.** Siete estados: `activa`, `cuarentena`, `enferma` (en curso) y `cedida`, `vendida`, `muerta`, `perdida` (finales). Entre los de en curso se pasa libremente; de un en curso a un final, también; **de un final solo se vuelve a `activa`, y con un motivo obligatorio** (es una corrección, no una resurrección silenciosa).
* `PUT /plants/{id}/status` cambia el estado y deja constancia con su fecha. `GET /plants/{id}/status-changes` devuelve el historial, paginado.
* **El inventario no mezcla lo vivo con lo archivado**: sin filtro devuelve las plantas en curso; `?status=` (repetible) pide los estados que se quieran, finales incluidos.
* **Germinación parcial.** Año y mes opcionales, pero **el mes solo vale si hay año**: nunca se inventa un día ni un mes. La edad se muestra como aproximada cuando falta el mes.
* **Procedencia** como lista cerrada (`vivero`, `intercambio`, `germinación propia`, `compra`, `regalo`, `otro`) más una nota libre.

**Frontend** — conectar lo que ya está esqueletado:

* El formulario de alta y edición habilita descripción, procedencia (con su nota), adquisición, germinación y estado inicial; se retiran sus marcas «T-16».
* La cabecera de la ficha muestra el **estado real** y la germinación real (con su edad aproximada); se borran `MOCK_STATUS` y la germinación de `MOCK_CONTEXT`.
* La ficha ofrece **cambiar el estado**, con su motivo, y muestra el historial de cambios en la pestaña de datos.
* El inventario y la ficha de localización muestran y filtran por estado real; por defecto, solo lo que está en curso.

## Capabilities

### Modified Capabilities

- `data-model`: los campos nuevos del ejemplar y el historial de estados, con sus restricciones en la base.
- `plant-inventory`: la ficha ampliada, los estados con sus transiciones, el historial y el filtro por estado.
- `plant-dashboard`: el formulario, la cabecera, el cambio de estado y el filtro del inventario, reales.

## Non-goals

* **Los cuidados propios por ejemplar son `cuidados-por-ejemplar`.** El interruptor «Personalizar cuidados» sigue deshabilitado y marcado.
* **El cambio de estado no entra en la cronología unificada.** La cronología de eventos es [T-20](../../../docs/tickets/T-20-cronologia-unificada.md). Aquí el historial es su propia lista en la ficha; T-20 la integrará como un tipo más de evento sin migrar nada si la tabla tiene lo que ese evento necesita.
* **No se borra ni se archiva «de verdad».** Un estado final no oculta el ejemplar: solo lo saca del listado por defecto. No hay `DELETE /plants`.
* **Sin máquina de estados configurable.** Las transiciones son las de arriba, fijas en el dominio.
* **Sin automatismos.** Que una planta «enferma» genere una alerta es T-23; cambiar de estado no crea tareas ni alertas.
* **Sin cálculo de edad exacta.** Se muestra «~5 años» o «desde 04/2021»; no hay fecha de nacimiento completa.
* **El código del ejemplar no cambia con el estado**: un número usado no se reutiliza, aunque la planta esté muerta.
* **No se valida contra el futuro la fecha de adquisición ni la germinación.** Una planta se puede registrar con una fecha anterior a su alta; la coherencia entre ellas no se impone.

## Impact

* `backend/src/main/resources/db/migration/V8__plant_profile_and_status.sql`; `domain/` (`PlantStatus`, `PlantOrigin`, `Plant`, `PlantStatusChange`), repositorio, `PlantService` y su controller, converters, DTOs. Tests de integración con Testcontainers ([ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)).
* `frontend/` — tipos, `PlantForm`, `PlantHeader`, la ficha, el inventario y la ficha de localización; se retiran los mocks de estado y germinación.
* `docs/diagramas/modelo-datos-actual.md`, el modelo del `README.md` y el borrador de gestión.
