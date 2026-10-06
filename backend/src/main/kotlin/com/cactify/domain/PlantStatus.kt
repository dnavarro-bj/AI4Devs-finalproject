package com.cactify.domain

/**
 * La situación de un ejemplar (ADR-007). Tres estados **en curso** —la planta sigue en la
 * colección— y cuatro **finales** —ha dejado de estarlo—. Un ejemplar en un estado final **no
 * desaparece**: sigue existiendo con su código y su historial.
 *
 * Las transiciones viven aquí porque son una regla de la propia entidad que no consulta nada más
 * (ADR-011): entre estados en curso, libres; de uno en curso a uno final, libre; de uno final solo
 * se vuelve a `activa`, y eso es una **corrección**, no una resurrección silenciosa —su motivo
 * obligatorio lo exige `Plant.changeStatus`, que es quien lo recibe—.
 */
enum class PlantStatus(val value: String, val isFinal: Boolean = false) {
  Active("activa"),
  Quarantine("cuarentena"),
  Sick("enferma"),
  Given("cedida", isFinal = true),
  Sold("vendida", isFinal = true),
  Dead("muerta", isFinal = true),
  Lost("perdida", isFinal = true),
  ;

  fun canMoveTo(target: PlantStatus): Boolean = when {
    target == this -> false
    isFinal -> target == Active
    else -> true
  }

  companion object {
    /** Lo que el inventario muestra por defecto: lo archivado no se mezcla con lo que está en curso. */
    val inProgress: Set<PlantStatus> = entries.filter { !it.isFinal }.toSet()

    operator fun invoke(value: String): PlantStatus =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un estado válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

/** Una transición que el dominio no admite: 409, porque depende del estado actual de la planta. */
class InvalidPlantStatusTransitionException(from: PlantStatus, to: PlantStatus) : RuntimeException(
  when {
    from == to -> "El ejemplar ya está en estado '$to'"
    from.isFinal -> "Desde el estado '$from' solo se puede volver a '${PlantStatus.Active}'"
    else -> "No se puede pasar de '$from' a '$to'"
  },
)
