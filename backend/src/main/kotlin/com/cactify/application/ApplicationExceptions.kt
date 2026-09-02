package com.cactify.application

/**
 * Una referencia del cuerpo de la petición (especie, localización, tag) no existe. Es un dato
 * inválido del mensaje, no un recurso ausente de la ruta: el manejador global lo traduce a 400.
 */
class InvalidReferenceException(reference: String, value: String) :
  RuntimeException("$reference '$value' no existe")

/** La planta pedida por la ruta no existe: 404. */
class PlantNotFoundException(id: String) :
  RuntimeException("La planta '$id' no existe")

/** Ya hay un tag con ese nombre normalizado en el catálogo: 409. */
class DuplicateTagNameException(name: String) :
  RuntimeException("Ya existe un tag con el nombre '$name'")

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
