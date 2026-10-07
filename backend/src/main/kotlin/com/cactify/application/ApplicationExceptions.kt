package com.cactify.application

/**
 * Una referencia del cuerpo de la petición (especie, localización, tag) no existe. Es un dato
 * inválido del mensaje, no un recurso ausente de la ruta: el manejador global lo traduce a 400.
 */
class InvalidReferenceException(reference: String, value: String) :
  RuntimeException("$reference '$value' no existe")

/** La especie pedida por la ruta no existe: 404. */
class SpeciesNotFoundException(id: String) :
  RuntimeException("La especie '$id' no existe")

/** La planta pedida por la ruta no existe: 404. */
class PlantNotFoundException(id: String) :
  RuntimeException("La planta '$id' no existe")

/** Ya hay un tag con ese nombre normalizado en el catálogo: 409. */
class DuplicateTagNameException(name: String) :
  RuntimeException("Ya existe un tag con el nombre '$name'")

/**
 * Ya hay otra especie con ese nombre científico: 409.
 *
 * La comparación es sensible a mayúsculas, a diferencia de la de los tags: un nombre científico
 * es un binomio latino con capitalización canónica, no texto libre, y el `UNIQUE` de `V6__` es
 * igualmente sensible. Las dos capas deben coincidir para que el conflicto no se cuele como 500.
 */
class DuplicateScientificNameException(scientificName: String) :
  RuntimeException("Ya existe una especie con el nombre científico '$scientificName'")

/** Ya hay otra especie con ese código de inventario: 409. */
class DuplicateSpeciesCodeException(code: String) :
  RuntimeException("Ya existe una especie con el código '$code'")

/**
 * El código de una especie con ejemplares no se puede cambiar: 409. Ya identifica plantas, y hay
 * etiquetas pegadas en macetas que lo llevan.
 */
class SpeciesCodeLockedException(code: String) :
  RuntimeException("El código '$code' ya identifica ejemplares de la especie y no se puede cambiar")

/**
 * La especie tiene ejemplares y no puede retirarse del catálogo: 409.
 *
 * `plant.species_id` es `NOT NULL` y no tiene `ON DELETE`: sin esta comprobación el borrado
 * reventaría contra la FK y el cliente recibiría un 500 por un caso perfectamente previsible.
 */
class SpeciesInUseException(id: String) :
  RuntimeException("La especie '$id' tiene ejemplares registrados y no se puede eliminar")

/** La etiqueta pedida por la ruta no existe: 404. */
class TagNotFoundException(id: String) :
  RuntimeException("El tag '$id' no existe")

/**
 * La etiqueta la tiene alguna planta y no puede retirarse del catálogo: 409.
 *
 * A diferencia de especies o localizaciones, aquí no hay una FK que fuese a saltar —`plant_tag`
 * se borraría en cascada—, y precisamente por eso la comprobación es imprescindible: sin ella el
 * borrado se llevaría por delante las asignaciones en silencio.
 */
class TagInUseException(id: String) :
  RuntimeException("El tag '$id' lo tienen plantas registradas y no se puede eliminar")

/** Combinar una etiqueta consigo misma no es una operación: 400. */
class TagMergeIntoItselfException(id: String) :
  RuntimeException("No se puede combinar el tag '$id' consigo mismo")

/** La localización pedida por la ruta no existe: 404. */
class LocationNotFoundException(id: String) :
  RuntimeException("La localización '$id' no existe")

/**
 * La localización alberga ejemplares y no puede retirarse del catálogo: 409.
 *
 * `plant.location_id` es `NOT NULL` y no tiene `ON DELETE`: una planta no puede quedarse sin
 * sitio, así que se pregunta antes de borrar en vez de convertir un caso previsible en un 500.
 */
class LocationInUseException(id: String) :
  RuntimeException("La localización '$id' alberga ejemplares y no se puede eliminar")

/** La mezcla de tierra pedida por la ruta no existe: 404. */
class SoilMixNotFoundException(id: String) :
  RuntimeException("La mezcla de tierra '$id' no existe")

/**
 * La mezcla la recomienda alguna especie y no puede retirarse del catálogo: 409.
 *
 * `species.soil_mix_id` es `NOT NULL` y no tiene `ON DELETE`, igual que `plant.species_id`: sin
 * esta comprobación el borrado reventaría contra la FK y el cliente recibiría un 500 por un caso
 * perfectamente previsible.
 */
class SoilMixInUseException(id: String) :
  RuntimeException("La mezcla de tierra '$id' la recomienda alguna especie y no se puede eliminar")

/** La lectura pedida por la ruta no existe, o no cuelga de la planta indicada: 404. */
class CareRecordNotFoundException(id: String) :
  RuntimeException("La lectura '$id' no existe")

/** Falta la recomendación de una lectura que aún no la tiene: 404. */
class RecommendationNotFoundException(careRecordId: String) :
  RuntimeException("La lectura '$careRecordId' no tiene ninguna recomendación")

/**
 * El proveedor de IA no respondió, tardó demasiado o devolvió algo ininterpretable: 502.
 *
 * Existe para que un fallo suyo **no** se confunda con un dato inválido del cliente. Sin ella, la
 * `IllegalArgumentException` que lanza un nivel de riesgo desconocido acabaría en el manejador que
 * ADR-011 traduce a 400, reprochándole al cliente algo que no hizo.
 */
class AIProviderException(message: String, cause: Throwable? = null) :
  RuntimeException(message, cause)

/** Ya hay otra localización con ese código, sin distinguir mayúsculas: 409. */
class DuplicateLocationCodeException(code: String) :
  RuntimeException("Ya existe una localización con el código '$code'")

/** Hacer a una localización hija de sí misma o de un descendiente rompería la jerarquía: 409. */
class LocationHierarchyCycleException(id: String, parentId: String) :
  RuntimeException("La localización '$id' no puede colgar de '$parentId': es ella misma o uno de sus descendientes")

/** La localización contiene otras y no puede retirarse: 409. */
class LocationHasChildrenException(id: String) :
  RuntimeException("La localización '$id' contiene sublocalizaciones y no se puede eliminar")

/** La localización figura en el historial de movimientos y no puede retirarse: 409. */
class LocationInMovementsException(id: String) :
  RuntimeException("La localización '$id' figura en el historial de movimientos y no se puede eliminar")

/** El evento pedido por la ruta no existe, no cuelga de la planta indicada o no es del tipo del recurso: 404. */
class PlantEventNotFoundException(kind: String, id: String) :
  RuntimeException("$kind '$id' no existe")

/** La vista guardada pedida por la ruta no existe: 404. */
class SavedViewNotFoundException(id: String) :
  RuntimeException("La vista '$id' no existe")

/** Ya hay otra vista con ese nombre normalizado en ese ámbito: 409. */
class DuplicateSavedViewNameException(name: String, scope: String) :
  RuntimeException("Ya existe una vista del ámbito '$scope' con el nombre '$name'")

/**
 * El resultado de una exportación supera el máximo configurado: 422 (ADR-017). Se rechaza **en lugar
 * de truncar**: un CSV parcial que parece completo es peor que ninguno. El mensaje dice cuántas
 * filas serían y cuál es el máximo, para que quien exporta sepa cuánto afinar.
 */
class ExportTooLargeException(val rows: Long, val maxRows: Int) :
  RuntimeException("$rows filas superan el máximo de $maxRows: afina los filtros")

/** La tarea pedida por la ruta no existe: 404. */
class TaskNotFoundException(id: String) :
  RuntimeException("La tarea '$id' no existe")

/**
 * La localización es el destino de alguna tarea —en cualquier estado, porque la historia conserva la
 * referencia— y no puede retirarse: 409. `task.location_id` no tiene `ON DELETE`: sin esta
 * comprobación el borrado reventaría contra la FK y el cliente recibiría un 500 previsible.
 */
class LocationHasTasksException(id: String) :
  RuntimeException("La localización '$id' es el destino de alguna tarea y no se puede eliminar: hay tareas que la usan")

/** La alerta pedida por la ruta no existe: 404. */
class AlertNotFoundException(id: String) :
  RuntimeException("La alerta '$id' no existe")

/** La alerta a la que se enlaza una tarea ya está cerrada: 409. Depende del estado, no del formato. */
class AlertClosedException(id: String) :
  RuntimeException("La alerta '$id' ya está cerrada y no admite tareas nuevas")

/** La localización tiene alertas propias y no puede retirarse: 409. */
class LocationHasAlertsException(id: String) :
  RuntimeException("La localización '$id' tiene alertas y no se puede eliminar")

/** El lote pedido por la ruta no existe: 404. */
class BatchNotFoundException(id: String) :
  RuntimeException("El lote '$id' no existe")

/**
 * El alcance de un lote supera el máximo configurado: 422, como la exportación (ADR-017). Se rechaza
 * **en lugar de truncar**: aplicar un lote «a las primeras N» sin decirlo deja plantas sin su registro
 * sin que nadie lo vea. El mensaje dice cuántas plantas serían y cuál es el máximo.
 */
class BatchTooLargeException(val plants: Long, val maxPlants: Int) :
  RuntimeException("$plants plantas superan el máximo de $maxPlants: acota el alcance")

/** La fotografía pedida por la ruta no existe, no cuelga del dueño indicado o la variante no existe: 404. */
class MediaNotFoundException(id: String) :
  RuntimeException("La fotografía '$id' no existe")

/** La subida no es válida: sin archivos, demasiados o con alguno que no es una imagen admitida: 400. */
class InvalidMediaException(message: String) : RuntimeException(message)

/** Un archivo supera el tamaño máximo: 413. La petición es válida, pero no cabe. */
class MediaTooLargeException(message: String) : RuntimeException(message)
