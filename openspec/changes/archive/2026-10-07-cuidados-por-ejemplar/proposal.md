# Proposal: cuidados-por-ejemplar

**Ticket:** [T-16](../../../docs/tickets/T-16-ficha-del-ejemplar-ampliada.md) — segunda mitad; **cierra el ticket**. Sigue a [`ficha-del-ejemplar`](../archive/2026-10-07-ficha-del-ejemplar/proposal.md).
**Historias:** [0.7](../../../docs/user-stories/0.7-personalizar-cuidados-de-un-ejemplar.md), pendiente desde T-01
**Pantallas del prototipo:** `plant-create` (sección «Cuidados efectivos») y `plant-detail` en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html)

## Why

Hoy un ejemplar **hereda toda la pauta de su especie** y no puede apartarse de ella. Pero el cultivo real no es uniforme: una planta del alféizar recibe más luz que otra de la misma especie en el invernadero, una convaleciente pide menos riego, una se trasplantó a otro sustrato. La historia 0.7 lo pide desde el MVP y el modelo nunca tuvo dónde guardarlo: el formulario tiene un interruptor «Personalizar cuidados» deshabilitado que dice «llega en T-16».

Importa más allá de la comodidad. La recomendación de IA y, mañana, las alertas se calculan contra los **rangos efectivos** de la planta; con un único perfil por especie, toda planta que se aparte de él genera falsas alarmas o las esconde.

## What Changes

**Esquema** — migración `V9`: `plant` gana ocho columnas **nulables** —los rangos de humedad, temperatura y luz, la pauta de riego y la mezcla de sustrato—. **Nulo significa «hereda de la especie»**; un valor, «lo sobrescribe». Los ejemplares existentes no tienen ningún valor propio: heredan lo de siempre.

**Backend**

* `POST /plants` y `PUT /plants/{id}` aceptan un objeto opcional `careOverrides` con los valores propios. Es **reemplazo completo**, como el resto de la ficha: lo que no se envíe vuelve a heredarse, y no enviarlo quita todos los cuidados propios.
* El detalle devuelve **`careOverrides`** (solo lo que el ejemplar sobrescribe) y **`effectiveCare`**: el perfil que de verdad se aplica, ya resuelto, con la lista de campos que se apartan de la especie. El cliente no tiene que mezclar nada.
* **Los rangos efectivos deben ser coherentes**: sobrescribir solo el mínimo de humedad por encima del máximo de la especie se rechaza (`400`), porque el perfil resultante sería imposible.
* **Cambiar la especie conserva los cuidados propios** —son decisiones del cultivador sobre esa planta— y lo que no esté sobrescrito pasa a heredarse de la especie nueva. Si los valores propios ya no encajan con la nueva especie, el cambio se rechaza explicando el conflicto, en vez de dejar un perfil incoherente.

**Frontend**

* El interruptor de «Cuidados efectivos» deja de ser maqueta: abre el editor de los cinco conceptos, con **el valor heredado a la vista** como referencia y solo lo que se rellene se sobrescribe.
* La ficha muestra el **perfil efectivo** y distingue **a simple vista lo propio de lo heredado**, con una marca en texto además de la forma.
* Un error del API se explica sin perder lo escrito.

## Capabilities

### Modified Capabilities

- `data-model`: las columnas de cuidados propios y sus restricciones.
- `plant-inventory`: los cuidados propios, el perfil efectivo y el comportamiento al cambiar de especie.
- `plant-dashboard`: el editor y la ficha con lo propio y lo heredado.

## Non-goals

* **La exposición y el entorno propios son de [T-17](../../../docs/tickets/T-17-especie-ampliada.md).** La especie todavía no tiene esos campos, así que no hay nada que sobrescribir; entrarán con T-17 sin cambiar el modelo.
* **No se mantiene un historial de cambios de los cuidados propios.** Un cambio de pauta de una planta es edición de su ficha, no un evento; la cronología unificada (T-20) decidirá si lo recoge.
* **Las recomendaciones de IA siguen usando los rangos de la especie** en este change. Pasar a los efectivos cambia lo que el proveedor recibe y la forma de los análisis ya generados: es una decisión propia, y se anota como siguiente paso en el design.
* **Cambiar la pauta de la especie no avisa a las plantas que la sobrescriben.** La herencia es por referencia y lo no sobrescrito cambia solo; lo que sí tenga valor propio no se toca, y si el cambio de la especie dejara un perfil efectivo incoherente, se ve en la ficha (ver Riesgos).
* **No hay operación propia para quitar un cuidado.** Es reemplazo completo: se envía el objeto sin ese campo.
* **Sin tabla aparte.** El borrador de gestión proponía una tabla 1-1; ver la decisión en el design.

## Impact

* `backend/src/main/resources/db/migration/V9__plant_care_overrides.sql`; `domain/` (el objeto de valor de cuidados propios y el perfil efectivo, `Plant`, un componente de validación compartido con `Species`), `PlantService`, DTOs y controller. Tests de integración con Testcontainers.
* `frontend/` — tipos, `PlantForm`, la ficha, el panel de cuidados efectivos; se retira la maqueta del interruptor.
* `docs/diagramas/modelo-datos-actual.md`, el modelo del `README.md` y el borrador de gestión.
