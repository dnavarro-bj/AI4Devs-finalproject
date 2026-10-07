package com.cactify.domain

/**
 * Los umbrales de detección y de escalada de las alertas. Viven en configuración (`cactify.alerts.*`)
 * y no como constantes sueltas: la primera versión es una heurística que se ajustará con uso real.
 *
 * Es un valor puro del dominio y **no se puede construir incoherente** (ADR-011): un umbral a
 * `critica` por debajo del de `media` haría que la escalada saltase un nivel, y una configuración así
 * debe impedir el arranque, no fallar en producción.
 */
data class AlertThresholds(
  /** Días sin ninguna observación para abrir «sin revisar». */
  val unreviewedDays: Int = 30,
  /** Días de retraso de una tarea pendiente para abrir «cuidado vencido». */
  val overdueDays: Int = 2,
  /** Ocurrencias desde las que una alerta es, al menos, `media`. */
  val mediumOccurrences: Int = 3,
  /** Ocurrencias desde las que una alerta es `critica`. */
  val criticalOccurrences: Int = 6,
  /** Distancia al rango, en proporción a su anchura, desde la que una medida es `media`. */
  val mediumDeviation: Double = 0.25,
  /** Distancia al rango, en proporción a su anchura, desde la que una medida es `critica`. */
  val criticalDeviation: Double = 0.75,
) {
  init {
    require(unreviewedDays >= 1) { "Los días sin revisar deben ser al menos 1, y son $unreviewedDays" }
    require(overdueDays >= 1) { "Los días de vencimiento deben ser al menos 1, y son $overdueDays" }
    require(mediumOccurrences >= 1) { "Las ocurrencias para escalar a media deben ser al menos 1, y son $mediumOccurrences" }
    require(criticalOccurrences >= mediumOccurrences) {
      "Las ocurrencias para escalar a crítica ($criticalOccurrences) no pueden ser menos que las de media ($mediumOccurrences)"
    }
    require(mediumDeviation > 0.0) { "La distancia al rango para media debe ser positiva, y es $mediumDeviation" }
    require(criticalDeviation >= mediumDeviation) {
      "La distancia al rango para crítica ($criticalDeviation) no puede ser menor que la de media ($mediumDeviation)"
    }
  }

  /** La severidad que sale de lo lejos que queda una medida de su rango. */
  fun severityByDeviation(distance: Double): AlertSeverity = when {
    distance >= criticalDeviation -> AlertSeverity.Critical
    distance >= mediumDeviation -> AlertSeverity.Medium
    else -> AlertSeverity.Low
  }

  /** La severidad mínima que impone haber acumulado tantas ocurrencias. */
  fun severityByOccurrences(occurrences: Int): AlertSeverity = when {
    occurrences >= criticalOccurrences -> AlertSeverity.Critical
    occurrences >= mediumOccurrences -> AlertSeverity.Medium
    else -> AlertSeverity.Low
  }
}
