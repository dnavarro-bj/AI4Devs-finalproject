package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.BatchSize
import java.time.Instant
import java.time.LocalDate

/**
 * A quién va dirigida una tarea: **una localización o un conjunto expreso de plantas**, nunca las
 * dos cosas ni ninguna. Es un tipo cerrado para que no exista una tarea sin destino ni con dos: la
 * regla es de conjunto y un `CHECK` no puede mirar otra tabla (ADR-011).
 */
sealed class TaskTarget {

  /** Una localización: las plantas afectadas son **las que haya en ella al completar**, no al crear. */
  data class Location(val location: com.cactify.domain.Location) : TaskTarget()

  /** De 1 a [MAX_PLANTS] plantas expresas, sin repetir. */
  class Plants(val plants: Set<Plant>) : TaskTarget() {
    init {
      require(plants.isNotEmpty()) { "Una tarea de plantas necesita al menos una planta" }
      require(plants.size <= MAX_PLANTS) {
        "Una tarea no puede nombrar más de $MAX_PLANTS plantas; para más, dirígela a una localización"
      }
    }

    companion object {
      const val MAX_PLANTS = 500
    }
  }
}

/** Una tarea que no está pendiente no admite este cambio: depende del estado actual, no del formato (409). */
class TaskNotPendingException(status: TaskStatus) :
  RuntimeException("La tarea está $status y solo una tarea pendiente admite este cambio")

/**
 * Trabajo planificado: una **intención**, no un hecho. Crearla no escribe nada en el historial de
 * ninguna planta; completarla sí, y eso lo orquesta `TaskService` porque necesita las plantas
 * afectadas en ese momento.
 *
 * El periodo son dos fechas de calendario —un día exacto es inicio = fin—. «Vencida» no existe como
 * estado: es una tarea pendiente cuyo fin ya pasó.
 *
 * La entidad es dueña de su consistencia (ADR-011): todo cambio pasa por un método que **valida
 * antes de asignar**, de modo que un rechazo no deja la tarea a medias, y solo una tarea pendiente
 * admite cambios.
 */
@Entity
@Table(name = "task")
@BatchSize(size = 50)
class Task private constructor(
  @EmbeddedId
  override val id: TaskId = TaskId.create(),
  type: TaskType,
  title: String,
  priority: TaskPriority,
  dueFrom: LocalDate,
  dueTo: LocalDate,
  notes: String?,
  target: TaskTarget,
) : AbstractEntity<TaskId>() {

  @Column(name = "task_type", nullable = false)
  var type: TaskType = type
    private set

  @Column(name = "title", nullable = false)
  var title: String = title
    private set

  @Column(name = "priority", nullable = false)
  var priority: TaskPriority = priority
    private set

  @Column(name = "status", nullable = false)
  var status: TaskStatus = TaskStatus.Pending
    private set

  @Column(name = "due_from", nullable = false)
  var dueFrom: LocalDate = dueFrom
    private set

  @Column(name = "due_to", nullable = false)
  var dueTo: LocalDate = dueTo
    private set

  @Column(name = "notes")
  var notes: String? = notes
    private set

  @Column(name = "origin", nullable = false)
  var origin: TaskOrigin = TaskOrigin.Manual
    private set

  /** La localización destino, o `null` si la tarea nombra plantas. */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "location_id")
  var location: Location? = null
    private set

  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(
    name = "task_plant",
    joinColumns = [JoinColumn(name = "task_id")],
    inverseJoinColumns = [JoinColumn(name = "plant_id")],
  )
  @BatchSize(size = 50)
  private val plantSet: MutableSet<Plant> = mutableSetOf()

  /** Las plantas expresas, vacío si el destino es una localización. Solo cambia por [replace]. */
  val plants: Set<Plant> get() = plantSet.toSet()

  @Column(name = "completed_at")
  var completedAt: Instant? = null
    private set

  /** Cuántas plantas recibieron su evento al completar: lo hecho, no lo planificado. */
  @Column(name = "affected_plants")
  var affectedPlants: Int? = null
    private set

  @Column(name = "closed_reason")
  var closedReason: String? = null
    private set

  init {
    applyTarget(target)
  }

  /** Reemplazo completo de una tarea pendiente. Valida **antes** de asignar nada. */
  fun replace(
    type: TaskType,
    title: String,
    priority: TaskPriority,
    dueFrom: LocalDate,
    dueTo: LocalDate,
    notes: String?,
    target: TaskTarget,
  ) {
    requirePending()
    val cleanTitle = cleanTitle(title)
    val cleanNotes = cleanNotes(notes)
    checkPeriod(dueFrom, dueTo)
    this.type = type
    this.title = cleanTitle
    this.priority = priority
    this.dueFrom = dueFrom
    this.dueTo = dueTo
    this.notes = cleanNotes
    applyTarget(target)
  }

  /** Cambia solo el periodo. */
  fun reschedule(dueFrom: LocalDate, dueTo: LocalDate) {
    requirePending()
    checkPeriod(dueFrom, dueTo)
    this.dueFrom = dueFrom
    this.dueTo = dueTo
  }

  /** Cierra la tarea como hecha. `affectedPlants` son las que recibieron su evento: al menos una. */
  fun complete(completedAt: Instant, affectedPlants: Int) {
    requirePending()
    require(affectedPlants >= 1) { "Una tarea completada tiene que haber afectado al menos a una planta" }
    this.status = TaskStatus.Completed
    this.completedAt = completedAt
    this.affectedPlants = affectedPlants
  }

  /** Omitir conserva que estuvo planificada y no cuenta como cuidado realizado. */
  fun skip(reason: String?) = close(TaskStatus.Skipped, reason)

  /** Cancelar conserva que estuvo planificada y no cuenta como cuidado realizado. */
  fun cancel(reason: String?) = close(TaskStatus.Cancelled, reason)

  private fun close(to: TaskStatus, reason: String?) {
    requirePending()
    val clean = reason.cleaned()
    require(clean == null || clean.length <= MAX_REASON) { "El motivo no puede pasar de $MAX_REASON caracteres" }
    this.status = to
    this.closedReason = clean
  }

  private fun requirePending() {
    if (status.isClosed) throw TaskNotPendingException(status)
  }

  private fun applyTarget(target: TaskTarget) {
    when (target) {
      is TaskTarget.Location -> {
        location = target.location
        plantSet.clear()
      }
      is TaskTarget.Plants -> {
        location = null
        plantSet.clear()
        plantSet.addAll(target.plants)
      }
    }
  }

  companion object {
    const val MAX_TITLE = 120
    const val MAX_NOTES = 2000
    const val MAX_REASON = 500

    /** Única forma de crear una tarea: pendiente y manual. Valida todo antes de construir. */
    fun create(
      type: TaskType,
      title: String,
      priority: TaskPriority,
      dueFrom: LocalDate,
      dueTo: LocalDate,
      notes: String?,
      target: TaskTarget,
    ): Task {
      val cleanTitle = cleanTitle(title)
      val cleanNotes = cleanNotes(notes)
      checkPeriod(dueFrom, dueTo)
      return Task(TaskId.create(), type, cleanTitle, priority, dueFrom, dueTo, cleanNotes, target)
    }

    private fun cleanTitle(title: String): String {
      val clean = title.trim()
      require(clean.isNotEmpty()) { "El título de la tarea es obligatorio" }
      require(clean.length <= MAX_TITLE) { "El título no puede pasar de $MAX_TITLE caracteres" }
      return clean
    }

    private fun cleanNotes(notes: String?): String? {
      val clean = notes.cleaned()
      require(clean == null || clean.length <= MAX_NOTES) { "Las notas no pueden pasar de $MAX_NOTES caracteres" }
      return clean
    }

    private fun checkPeriod(dueFrom: LocalDate, dueTo: LocalDate) {
      require(!dueTo.isBefore(dueFrom)) { "El fin del periodo ($dueTo) no puede ser anterior a su inicio ($dueFrom)" }
    }

    private fun String?.cleaned(): String? = this?.trim()?.takeIf { it.isNotEmpty() }
  }
}
