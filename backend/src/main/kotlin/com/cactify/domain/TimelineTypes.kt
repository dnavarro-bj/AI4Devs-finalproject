package com.cactify.domain

/** Qué se le hizo al ejemplar (ADR-007). Cada tipo admite solo sus datos: ver [PlantIntervention]. */
enum class InterventionType(val value: String) {
  Transplant("trasplante"),
  Substrate("sustrato"),
  Treatment("tratamiento"),
  Fertilization("fertilizacion"),
  Pruning("poda"),
  Review("revision"),
  ;

  companion object {
    operator fun invoke(value: String): InterventionType =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un tipo de intervención válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

/** En qué punto está una floración observada (ADR-007). Solo `finalizada` tiene fin. */
enum class BloomStatus(val value: String) {
  Bud("boton"),
  InBloom("en_flor"),
  Finished("finalizada"),
  ;

  companion object {
    operator fun invoke(value: String): BloomStatus =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un estado de floración válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

/** Los tipos de entrada de la cronología unificada (ADR-007); `?type=` los filtra. */
enum class TimelineType(val value: String) {
  Reading("lectura"),
  StatusChange("cambio_estado"),
  Movement("movimiento"),
  Comment("comentario"),
  Intervention("intervencion"),
  Bloom("floracion"),
  Task("tarea"),
  ;

  companion object {
    operator fun invoke(value: String): TimelineType =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un tipo de la cronología válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}
