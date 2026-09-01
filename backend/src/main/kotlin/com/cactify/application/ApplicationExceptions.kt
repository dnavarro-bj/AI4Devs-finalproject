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
