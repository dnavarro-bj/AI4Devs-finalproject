package com.cactify.domain

/**
 * En qué punto está una alerta (ADR-007): `nueva → revisada → resuelta | descartada`. Solo `nueva` y
 * `revisada` están **abiertas**; `resuelta` y `descartada` son finales y no se reabren: si la
 * condición reaparece, nace otra alerta con su propio historial.
 */
enum class AlertStatus(val value: String, val isOpen: Boolean) {
  New("nueva", true),
  Reviewed("revisada", true),
  Resolved("resuelta", false),
  Dismissed("descartada", false),
  ;

  /** Revisar solo sirve a una nueva; cerrar sirve a cualquier abierta; de una final no se sale. */
  fun canMoveTo(target: AlertStatus): Boolean = when (this) {
    New -> target == Reviewed || target == Resolved || target == Dismissed
    Reviewed -> target == Resolved || target == Dismissed
    Resolved, Dismissed -> false
  }

  companion object {
    val open: Set<AlertStatus> = entries.filter { it.isOpen }.toSet()

    operator fun invoke(value: String): AlertStatus =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un estado de alerta válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

/** De dónde nace una alerta (ADR-007). La IA enriquece, pero no es el único mecanismo de detección. */
enum class AlertSource(val value: String) {
  Measurement("medicion"),
  Unreviewed("sin_revisar"),
  CareOverdue("cuidado_vencido"),
  Manual("manual"),
  AiRecommendation("recomendacion_ia"),
  ;

  companion object {
    operator fun invoke(value: String): AlertSource =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un origen de alerta válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

/** Qué mide o a qué se refiere una alerta (ADR-007): el rótulo de su tarjeta, distinto de su origen. */
enum class AlertCategory(val value: String) {
  Temperature("temperatura"),
  Humidity("humedad"),
  Light("luz"),
  Watering("riego"),
  FollowUp("seguimiento"),
  Other("otra"),
  ;

  companion object {
    operator fun invoke(value: String): AlertCategory =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es una categoría de alerta válida: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

/**
 * Cuánta atención pide una alerta (ADR-007). El orden es el de [rank], no el alfabético: «baja,
 * crítica, media» sería un orden plausible y equivocado. La severidad de una alerta **sube y nunca
 * baja** por sí sola.
 */
enum class AlertSeverity(val value: String, val rank: Int) {
  Low("baja", 1),
  Medium("media", 2),
  Critical("critica", 3),
  ;

  companion object {
    operator fun invoke(value: String): AlertSeverity =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es una severidad de alerta válida: ${entries.joinToString { it.value }}")

    fun max(a: AlertSeverity, b: AlertSeverity): AlertSeverity = if (b.rank > a.rank) b else a
  }

  override fun toString(): String = value
}
