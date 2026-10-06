# Design: edicion-de-planta

## Context

Ver [proposal.md](proposal.md) y [specs/](specs/plant-inventory/spec.md).

De lo que se parte:

* `PlantController` tiene `POST`, `GET /{id}`, `PUT /{id}/tags` y `GET`. `PlantService.create` ya resuelve localización y especie con `InvalidReferenceException`, que el manejador global traduce a `400`.
* `Plant` tiene `nickname`, `location` y `species` con `private set` y la invariante del apodo en un bloque `init`. Su único método de cambio es `updateTags`. Es de las entidades que ya estaban pensadas para mutarse por métodos de dominio ([ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)).
* `AbstractEntity` sella `updatedAt` con el `Clock` inyectado ([ADR-010](../../../docs/adr/ADR-010-fechas-y-auditoria.md)): una edición actualiza la fecha sin que nadie la toque.
* Las lecturas de cultivo cuelgan de `plant_id`, no de la especie, así que cambiar la especie no las toca.
* En el frontend, `/plants/[id]/edit` monta `PlantForm` prellenado y su `onSubmit` solo enciende un aviso.

## Goals / Non-Goals

**Goals:** poder corregir apodo, localización y especie de un ejemplar; que la pantalla de edición guarde de verdad.

**Non-Goals:** los de la propuesta. A nivel de diseño: no se añade ningún componente al kit y no se toca el esquema.

## Decisions

### `PUT` con reemplazo completo, como en las especies

El cuerpo lleva los tres campos y se aplican los tres.

**Por qué**: es la semántica que ya usan `PUT /species/{id}` y `PUT /soil-mixes/{id}`, y evita decidir qué significa «campo ausente». Con T-16 el cuerpo crecerá; el reemplazo completo obliga a que el formulario envíe siempre la planta entera, que es lo que ya hace.

**Alternativa descartada**: `PATCH` con campos opcionales. Permitiría cambiar solo el apodo con una petición mínima, pero abre la pregunta de si un `null` es «no tocar» o «vaciar», y no hay ningún cliente que la necesite.

### Un solo método de dominio que revalida, no tres setters

`Plant.update(nickname, location, species)` cambia los tres y vuelve a exigir la invariante del apodo antes de asignar nada.

**Por qué**: ADR-011 pide que el cambio pase por métodos de dominio que revalidan, y que la entidad sea dueña de su consistencia. Un método por campo permitiría aplicar dos y fallar en el tercero; uno solo hace que la edición sea todo o nada dentro de la entidad.

### Resolver las referencias antes de mutar

El servicio carga la planta (`404` si no existe), resuelve la localización y la especie (`400` si alguna falta) y **solo entonces** llama al método de dominio.

**Por qué**: es el criterio del escenario «referencia inválida junto a un apodo nuevo»: la edición no se aplica a medias. Es el mismo orden que ya usa `replaceTags`, que resuelve todos los tags antes de tocar la planta.

**Orden de los errores**: primero la planta, después las referencias. Editar una planta inexistente con una referencia inválida responde `404`, porque el recurso de la dirección manda sobre el contenido del cuerpo.

### `400` para referencias del cuerpo, no `404`

El ticket pedía `404`. Se mantiene el `400` del alta.

**Por qué**: `plant-inventory` ya fija que una referencia inexistente en el cuerpo es `400`, y que el `404` es para el recurso de la URL. Que el mismo error significara cosas distintas según el verbo —`POST` y `PUT` con una especie que no existe— obligaría a los clientes a tratarlo de dos formas. Se corrige el ticket en lugar de dividir el contrato.

### El cambio de especie no necesita lógica propia

Los cuidados efectivos se calculan desde la especie de la planta al leerla; no se copian. Cambiar la referencia basta.

**Por qué**: es la decisión de herencia de los borradores del modelo (`PLANT_CARE_OVERRIDE` nulo = hereda): nada que recalcular ni propagar. La prueba de que es cierto es el escenario «cambiar la especie conserva la identidad y el historial», que se escribe como test de integración.

### Frontend: el service y el composable crecen, la pantalla se simplifica

`PlantsApiService.update` devuelve `ServiceResponse` y no lanza ([ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md)); `usePlants.update` lo expone; la pantalla pasa de «encender un aviso» a «guardar y navegar, o explicar el error».

**Por qué un error no pierde lo escrito**: el formulario es el dueño de sus valores y la pantalla solo lo envuelve; si no se navega, el formulario sigue montado con lo que el usuario había tecleado. No hace falta guardarlo en ninguna parte.

### Qué se aparta de la composición del prototipo

Nada. La pantalla `plant-create` ya está reproducida; este change **conecta** su guardado. El contraste final comprueba que la composición no cambia.

## Risks / Trade-offs

* **Dos ediciones simultáneas** → gana la última, sin aviso. Aceptado: un solo administrador y sin `version` en el esquema. Si llega el multiusuario, será un campo de versión en todas las entidades, no una decisión de este change.
* **Cambiar la especie cambia en silencio los rangos con los que se interpretan las lecturas antiguas** → las recomendaciones de IA ya generadas conservan el texto que se escribió con los rangos de entonces. Es coherente con que sean un registro histórico, pero el usuario puede verlas junto a rangos nuevos. No se resuelve aquí; si molesta, es un asunto de T-20 (mostrar la especie vigente en cada evento).
* **El `400` contradice la letra del ticket** → se documenta en la propuesta y se corrige el ticket.
