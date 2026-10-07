package com.cactify

/**
 * Un código de localización válido derivado del nombre, para los tests que solo necesitan una
 * localización y no les importa su código: el mismo nombre da siempre el mismo código.
 */
fun locationCode(name: String): String =
  "LOC-" + name.uppercase().replace(Regex("[^A-Z0-9]+"), "-").trim('-').take(40)
