# T-26 - API de edición de planta

**Área:** Backend
**Historia relacionada:** [0.1](../user-stories/0.1-registrar-cactus.md) — su nota de edición; [1.3](../user-stories/1.3-estado-y-ciclo-de-vida-de-un-ejemplar.md)
**Bloque:** 1 — gestión de plantas. **Va antes de [T-16](T-16-ficha-del-ejemplar-ampliada.md)**, que amplía el ejemplar con campos que tampoco se podrían editar sin esto.

## Descripción

El API expone `POST /plants`, `GET /plants`, `GET /plants/{id}` y `PUT /plants/{id}/tags`, y **nada más**: no hay forma de cambiar el apodo, la localización ni la especie de un ejemplar ya creado.

El wireframe da la edición por hecha —«Editar planta» está en la cabecera de la ficha— y §5.4 del [documento de producto](../producto/definicion-funcional-y-ux.md) describe que el alta y la edición comparten formulario. Ningún ticket lo cubría.

**Lo destapó el change `esqueleto-plantas`** al construir esa pantalla: hoy el formulario de edición existe, llega prellenado y **advierte de que los cambios no se guardan**, porque no hay dónde mandarlos. Es la misma situación que abrió [T-08](T-08-api-del-catalogo-de-especies.md) en su día.

## Alcance

* Endpoint de modificación de una planta existente: apodo, localización y especie.
* Cambiar la especie **no regenera** el código de inventario del ejemplar (§5.4) ni pierde su historial.
* Una referencia inexistente —localización o especie que no existen— responde `404`, nunca `500`.
* El frontend deja de advertir y guarda de verdad: se retira el aviso de `pages/plants/[id]/edit.vue`.

## Criterios de aceptación

* Editar el apodo de una planta lo persiste y la ficha lo refleja.
* Cambiar la especie de una planta conserva su identificador, su historial de lecturas y sus tags.
* Referenciar una localización o una especie inexistente devuelve `404` con el cuerpo de error uniforme.
* La pantalla de edición guarda sin advertencias.

## Notas

* Los tags ya tienen su propio endpoint (`PUT /plants/{id}/tags`); conviene decidir si se absorben aquí o se quedan aparte.
* Al llegar [T-16](T-16-ficha-del-ejemplar-ampliada.md), este endpoint gana los campos nuevos —descripción, germinación, procedencia y estado—.
