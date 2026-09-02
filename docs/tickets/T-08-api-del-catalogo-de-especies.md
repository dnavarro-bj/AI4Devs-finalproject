# T-08 - API del catálogo de especies

**Área:** Backend
**Historias relacionadas:** [0.3](../user-stories/0.3-consultar-recomendaciones-por-especie.md), [0.6](../user-stories/0.6-registrar-especie-y-cuidados-recomendados.md)

## Descripción

Publicar el catálogo de especies como API REST. `Species` existe como tabla, semillas y entidad JPA desde [T-01](T-01-modelo-de-datos-de-plantas-y-lecturas.md), pero no tiene endpoints: los rangos de cuidado solo salen embebidos en `GET /plants/{id}`, y no hay forma de listar las especies, consultarlas ni mantenerlas. [T-02](T-02-api-crud-de-plantas.md) lo declaró Non-goal.

Es un habilitador: el selector de especie y el bloque de rangos de [T-05](T-05-dashboard-frontend.md) lo dan por existente, y el paso 1 de [T-07](T-07-test-e2e-del-flujo-principal.md) arranca creando una especie con rangos conocidos.

## Alcance

* `GET /species`: catálogo paginado, con orden estable por nombre científico.
* `GET /species/{id}`: ficha con los rangos de humedad, temperatura y horas de luz, y la pauta de riego.
* `POST /species`: alta con los dos nombres, los tres pares de rangos, la pauta de riego y la mezcla de tierra recomendada, seleccionada por `soilMixId` del catálogo semilla.
* `PUT /species/{id}`: edición de la ficha por reemplazo completo, idempotente.
* `DELETE /species/{id}`: retirada del catálogo, solo si la especie no tiene ejemplares.
* Unicidad del nombre científico, impuesta también en la base de datos junto con los `CHECK` de `min <= max`.

## Criterios de aceptación

* Se puede crear una especie con sus rangos de cuidado y encontrarla después en el catálogo paginado.
* Se puede consultar la ficha de una especie y ver los rangos que muestra la interfaz antes de guardar una lectura.
* Al actualizar la ficha de una especie, las plantas de esa especie reflejan los nuevos rangos en su detalle.
* Crear o renombrar una especie con un nombre científico que ya ocupa otra devuelve `409`, no un error 500.
* Borrar una especie con ejemplares devuelve `409` y no altera ni la especie ni sus plantas; borrarla sin ejemplares devuelve `204`.
* Una referencia inexistente o un cuerpo inválido devuelve un error controlado (400/404), nunca un 500.
* Los tests de integración cubren el alta, la validación, la unicidad, la paginación, la edición, la propagación a los ejemplares y los dos casos del borrado.
