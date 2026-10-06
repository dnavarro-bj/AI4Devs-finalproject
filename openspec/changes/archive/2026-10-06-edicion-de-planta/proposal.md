# Proposal: edicion-de-planta

**Ticket:** [T-26](../../../docs/tickets/T-26-api-de-edicion-de-planta.md)
**Historias:** [0.1](../../../docs/user-stories/0.1-registrar-cactus.md) (su nota de edición); prepara [1.3](../../../docs/user-stories/1.3-estado-y-ciclo-de-vida-de-un-ejemplar.md) y [T-16](../../../docs/tickets/T-16-ficha-del-ejemplar-ampliada.md)
**Pantalla del prototipo:** `plant-create` en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html), que el producto reutiliza para editar (§5.4)

## Why

El API expone `POST /plants`, `GET /plants`, `GET /plants/{id}` y `PUT /plants/{id}/tags`, y **nada más**: un ejemplar ya creado no puede cambiar de apodo, de localización ni de especie. Un error al dar de alta —la especie equivocada, un apodo mal escrito— no tiene arreglo.

El wireframe da la edición por hecha («Editar planta» está en la cabecera de la ficha) y el formulario ya existe, llega prellenado y **advierte de que los cambios no se guardan**, porque no hay dónde mandarlos. Lo destapó `esqueleto-plantas` al construir esa pantalla. Es la misma situación que abrió [T-08](../../../docs/tickets/T-08-api-del-catalogo-de-especies.md) en su día.

Va **antes de T-16**, que amplía el ejemplar con campos —descripción, germinación, procedencia, estado— que tampoco se podrían editar sin esto, y antes de T-15, porque «cambiar la especie no regenera el código» solo se puede probar si cambiarla es posible.

## What Changes

**Backend** — un único endpoint, sin tocar el esquema:

* `PUT /plants/{id}` con **reemplazo completo** de los tres campos editables: `nickname`, `locationId` y `speciesId`. Mismo criterio que `PUT /species/{id}`: el cuerpo es la planta entera, no un parche.
* `Plant` gana un método de dominio que cambia los tres campos **revalidando su invariante** ([ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)), en lugar de abrir `private set`.
* Cambiar la especie **conserva** el identificador, el historial de lecturas, los análisis de IA, los tags y la fecha de alta. Los cuidados efectivos del ejemplar salen de la especie, así que cambian con ella sin recalcular nada.
* Una referencia inexistente en el cuerpo —localización o especie— responde `400`, **igual que en el alta** (ver Non-goals); una planta inexistente, `404`; y nada se modifica si algo falla.

**Frontend** — conectar lo que ya está construido:

* `PlantsApiService` y `usePlants` ganan `update`; la pantalla `/plants/[id]/edit` **guarda de verdad** y vuelve a la ficha, que refleja los cambios.
* Se retira el aviso «Los cambios no se han guardado» y el comentario que lo justificaba.
* Un error del API (referencia inválida, apodo en blanco) se explica **sin perder lo escrito**.
* El pie del formulario deja de decir que «el resto llega con su ticket» como excusa de un guardado parcial: lo que no se guarda ya está deshabilitado y marcado con su ticket.

## Capabilities

### Modified Capabilities

- `plant-inventory`: nace la edición de una planta, y la validación de referencias pasa a cubrir también la edición.
- `plant-dashboard`: el formulario compartido guarda al editar, en lugar de advertir de que no puede.

## Non-goals

* **Los tags no se absorben en este `PUT`.** Ya tienen su endpoint (`PUT /plants/{id}/tags`), con su semántica de reemplazo, y funcionan. Mezclarlos obligaría a que un `PUT /plants/{id}` sin `tagIds` signifique «borra todos» o «no los toques», una ambigüedad que el endpoint aparte no tiene.
* **No hay `404` para una referencia del cuerpo.** El ticket dice «`404` ante localización o especie inexistente», pero el alta ya responde `400` a lo mismo y el contrato transversal distingue las dos: `404` es **el recurso de la URL** (la planta), `400` es **una referencia dentro del cuerpo**. Editar con otro código habría hecho que el mismo error significara dos cosas según el verbo. El ticket se corrige en este change.
* **No se regenera ni se asigna ningún código de inventario.** No existe todavía (T-15); este change solo garantiza que cambiar la especie no es un obstáculo para cuando exista.
* **No se editan los campos de T-16** —descripción, estado, germinación, procedencia, cuidados propios—. Siguen deshabilitados en el formulario con su ticket; cuando llegue T-16 este endpoint los gana.
* **Sin control de concurrencia optimista.** Dos ediciones simultáneas de la misma planta: gana la última. No hay `version` en el esquema y con un único administrador no es un problema todavía.
* **No se mueve la planta como evento.** Cambiar de localización aquí corrige un dato; el movimiento con su historial y motivo es [T-18](../../../docs/tickets/T-18-localizaciones-jerarquicas.md) y [T-20](../../../docs/tickets/T-20-cronologia-unificada.md).
* **Sin migración.** Las tres columnas existen desde `V1__schema.sql`.

## Impact

* `backend/` — `domain/Plant.kt` (método de dominio), `application/PlantService.kt`, `web/controllers/PlantController.kt` con su cuerpo de petición. Tests de integración con Testcontainers ([ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)).
* `frontend/src/features/plants/` — service y composable; `frontend/app/pages/plants/[id]/edit.vue`; `PlantForm.vue` (texto del pie).
* `docs/tickets/T-26-api-de-edicion-de-planta.md` (corregir el `404`) y `README.md` (tabla del API).
* Sin cambios en el esquema ni en la infraestructura.
