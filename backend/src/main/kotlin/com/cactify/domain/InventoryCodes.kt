package com.cactify.domain

/**
 * Las reglas de los códigos de inventario —`CAT-GRUSS`, `CAT-GRUSS-01`—, compartidas por la especie
 * y el ejemplar. El mismo formato lo exige el esquema con un `CHECK` ([ADR-002]): ninguna de las dos
 * capas sustituye a la otra.
 *
 * Letras mayúsculas y cifras, con guiones **entre** grupos; ni guiones al principio o al final, ni
 * dobles. Quien recibe un texto de fuera lo normaliza con [normalize] antes de construir la
 * entidad; el dominio solo valida, no corrige.
 */
object InventoryCodes {
  const val SPECIES_MAX_LENGTH = 20
  const val PLANT_MAX_LENGTH = 30

  private val FORMAT = Regex("^[A-Z0-9]+(-[A-Z0-9]+)*$")

  /** Mayúsculas y sin espacios en los extremos: lo que el usuario teclea no se rechaza por eso. */
  fun normalize(raw: String): String = raw.trim().uppercase()

  fun requireValid(code: String, what: String, maxLength: Int) {
    require(code.isNotBlank()) { "El código $what es obligatorio" }
    require(code.length <= maxLength && FORMAT.matches(code)) {
      "El código $what '$code' no es válido: letras mayúsculas y cifras, con guiones entre grupos, " +
        "hasta $maxLength caracteres"
    }
  }
}
