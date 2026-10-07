package com.cactify.domain.repos

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import java.time.Instant

/** Lo que cuenta como actividad (ADR-007): lo que alguien hizo, no cada registro suelto. */
enum class ActivityType(val value: String) {
  Batch("lote"),
  Task("tarea"),
  Comment("comentario"),
  Intervention("intervencion"),
  ;

  companion object {
    operator fun invoke(value: String): ActivityType =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un tipo de actividad válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

/** Una referencia a una entrada de la actividad: su tipo, su identificador en su tabla y su instante. */
data class ActivityRef(val type: ActivityType, val id: Long, val occurredAt: Instant)

data class ActivityBatch(val id: Long, val action: String, val plantCount: Int)
data class ActivityTask(val id: Long, val type: String, val title: String, val affectedPlants: Int)
data class ActivityPlant(val id: Long, val code: String, val nickname: String)
data class ActivityComment(val eventId: Long, val plant: ActivityPlant, val text: String)
data class ActivityIntervention(val eventId: Long, val plant: ActivityPlant, val type: String)

/**
 * Puerto de la actividad reciente. Como la cronología de un ejemplar, es **una lectura que une** tablas
 * que ya existen —sin copiar nada ni tabla propia— y devuelve **referencias** de la página pedida; el
 * detalle de cada tipo se carga aparte con **una consulta por tipo**, no una por fila.
 *
 * Un comentario o una intervención que pertenece a un lote o a una tarea **no es una entrada**: ya la
 * representa su lote o su tarea. El orden lo fija el puerto: instante descendente y, a igualdad,
 * identificador descendente.
 */
interface ActivityRepository {
  fun findPage(pageable: Pageable): Page<ActivityRef>
  fun batches(ids: Collection<Long>): List<ActivityBatch>
  fun tasks(ids: Collection<Long>): List<ActivityTask>
  fun comments(eventIds: Collection<Long>): List<ActivityComment>
  fun interventions(eventIds: Collection<Long>): List<ActivityIntervention>
}
