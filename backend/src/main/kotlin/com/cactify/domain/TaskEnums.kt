package com.cactify.domain

/** Qué trabajo es (ADR-007). Deliberadamente pocos: «otra» recoge lo excepcional con título libre. */
enum class TaskType(val value: String) {
  Watering("riego"),
  ColdProtection("proteccion_frio"),
  SunProtection("proteccion_sol"),
  RootPruning("poda_raices"),
  Repotting("cambio_maceta"),
  Other("otra"),
  ;

  companion object {
    operator fun invoke(value: String): TaskType =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un tipo de tarea válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

/**
 * Cuánto urge (ADR-007). Es la prioridad **de una tarea**, no la [Priority] de una recomendación de
 * IA: comparten idea pero no escala ni vocabulario, y el del producto es «alta, normal, baja».
 */
enum class TaskPriority(val value: String) {
  High("alta"),
  Normal("normal"),
  Low("baja"),
  ;

  companion object {
    operator fun invoke(value: String): TaskPriority =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es una prioridad de tarea válida: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

/**
 * En qué punto está una tarea (ADR-007). «Vencida» **no es un estado**: es una tarea pendiente cuyo
 * fin ya pasó, y se calcula contra una fecha de referencia. Solo `pendiente` está abierta.
 */
enum class TaskStatus(val value: String, val isClosed: Boolean) {
  Pending("pendiente", false),
  Completed("completada", true),
  Skipped("omitida", true),
  Cancelled("cancelada", true),
  ;

  companion object {
    operator fun invoke(value: String): TaskStatus =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un estado de tarea válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

/** De dónde sale una tarea (ADR-007): a mano o desde una alerta. Una regla automática será un origen más. */
enum class TaskOrigin(val value: String) {
  Manual("manual"),
  Alert("alerta"),
  ;

  companion object {
    operator fun invoke(value: String): TaskOrigin =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un origen de tarea válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}
