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

/**
 * La especie tiene ejemplares y no puede retirarse del catálogo: 409.
 *
 * `plant.species_id` es `NOT NULL` y no tiene `ON DELETE`: sin esta comprobación el borrado
 * reventaría contra la FK y el cliente recibiría un 500 por un caso perfectamente previsible.
 */
class SpeciesInUseException(id: String) :
  RuntimeException("La especie '$id' tiene ejemplares registrados y no se puede eliminar")

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
