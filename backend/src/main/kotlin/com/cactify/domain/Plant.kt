package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.Embedded
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.BatchSize
import java.time.Clock
import java.time.LocalDate

@Entity
@Table(name = "plant")
class Plant(
  @EmbeddedId
  override val id: PlantId = PlantId.create(),
  /**
   * El código de inventario (`CAT-GRUSS-01`): se asigna al darlo de alta y **no cambia nunca** —ni
   * al editar la planta ni al cambiarle la especie—, porque una etiqueta ya pegada en la maceta
   * tiene que seguir siendo válida. `val`, sin setter, y la columna no es actualizable.
   */
  @Column(name = "code", nullable = false, updatable = false)
  val code: String,
  nickname: String,
  location: Location,
  species: Species,
  description: String? = null,
  status: PlantStatus = PlantStatus.Active,
  germinationYear: Int? = null,
  germinationMonth: Int? = null,
  acquiredOn: LocalDate? = null,
  origin: PlantOrigin? = null,
  originNote: String? = null,
  careOverrides: CareOverrides? = null,
) : AbstractEntity<PlantId>() {

  var nickname: String = nickname
    private set

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "location_id", nullable = false)
  var location: Location = location
    private set

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "species_id", nullable = false)
  var species: Species = species
    private set

  /** Qué es el ejemplar, en texto libre. En blanco equivale a ausente. */
  var description: String? = description.cleaned()
    private set

  /**
   * En qué situación está. Solo cambia por [changeStatus], que deja constancia: ni la edición de la
   * ficha ni nada más lo toca, para que no haya un camino sin historial.
   */
  var status: PlantStatus = status
    private set

  /** Año de germinación, si se conoce. El mes solo tiene sentido con año: nunca se inventa uno. */
  var germinationYear: Int? = germinationYear
    private set

  var germinationMonth: Int? = germinationMonth
    private set

  var acquiredOn: LocalDate? = acquiredOn
    private set

  var origin: PlantOrigin? = origin
    private set

  /** El detalle de la procedencia que la lista cerrada no recoge: el vivero, a quién se compró. */
  var originNote: String? = originNote.cleaned()
    private set

  /**
   * Lo que sobrescribe de la pauta de su especie; `null` si no sobrescribe nada, y entonces hereda
   * todo. Cambiar la especie **lo conserva** —son decisiones sobre esta planta— y lo no sobrescrito
   * pasa a heredarse de la nueva.
   */
  @Embedded
  var careOverrides: CareOverrides? = careOverrides.normalized()
    private set

  init {
    InventoryCodes.requireValid(code, "del ejemplar", InventoryCodes.PLANT_MAX_LENGTH)
    requireCareFits(this.careOverrides, species)
    requireNickname(nickname)
    requireGermination(germinationYear, germinationMonth)
    // Un ejemplar nace en curso: «muerta» como estado inicial no tiene sentido y se rechaza.
    require(!status.isFinal) { "Un ejemplar no puede darse de alta en el estado '$status'" }
  }

  /**
   * Único camino para editar la ficha del ejemplar: es **reemplazo completo**, así que lo que no se
   * indique queda ausente. Cambia todo **o nada**: revalida las invariantes antes de asignar, de modo
   * que un fallo no deja la planta a medias. La identidad —id, código, fecha de alta, tags— y el
   * estado no se tocan; los cuidados efectivos salen de la especie, así que cambiarla los cambia sin
   * recalcular nada.
   */
  fun update(
    nickname: String,
    location: Location,
    species: Species,
    description: String?,
    germinationYear: Int?,
    germinationMonth: Int?,
    acquiredOn: LocalDate?,
    origin: PlantOrigin?,
    originNote: String?,
    careOverrides: CareOverrides?,
  ) {
    requireNickname(nickname)
    requireGermination(germinationYear, germinationMonth)
    val ownCare = careOverrides.normalized()
    requireCareFits(ownCare, species)
    this.nickname = nickname
    this.location = location
    this.species = species
    this.description = description.cleaned()
    this.germinationYear = germinationYear
    this.germinationMonth = germinationMonth
    this.acquiredOn = acquiredOn
    this.origin = origin
    this.originNote = originNote.cleaned()
    this.careOverrides = ownCare
  }

  /** El perfil que se aplica: lo propio donde lo hay y la pauta de la especie donde no. */
  fun effectiveCare(): EffectiveCare = (careOverrides ?: CareOverrides()).effective(species)

  /**
   * Cambia el estado y **devuelve el cambio** ya construido, para que el estado actual y su
   * historial no se puedan desincronizar: un solo método hace las dos cosas, todo o nada.
   *
   * Una transición que el dominio no admite lanza [InvalidPlantStatusTransitionException]. Volver a
   * `activa` desde un estado final es una **corrección** y exige motivo. El reloj entra por
   * parámetro porque la fecha del cambio es la del sistema (ADR-010).
   */
  fun changeStatus(to: PlantStatus, reason: String?, clock: Clock): PlantStatusChange {
    if (!status.canMoveTo(to)) throw InvalidPlantStatusTransitionException(status, to)
    val cleanReason = reason.cleaned()
    require(!(status.isFinal && cleanReason == null)) {
      "El motivo es obligatorio al volver a '${PlantStatus.Active}' desde '$status': es una corrección"
    }
    val change = PlantStatusChange.record(this, status, to, cleanReason, clock.instant())
    this.status = to
    return change
  }

  private fun requireNickname(nickname: String) =
    require(nickname.isNotBlank()) { "El nickname de la planta es obligatorio" }

  /** El mes sin año no significa nada; el año sin mes significa «en algún momento de ese año». */
  private fun requireGermination(year: Int?, month: Int?) {
    require(year == null || year in GERMINATION_YEARS) { "El año de germinación $year no es plausible" }
    require(month == null || month in 1..12) { "El mes de germinación debe estar entre 1 y 12, y es $month" }
    require(month == null || year != null) { "No se puede indicar el mes de germinación sin el año" }
  }

  /** Los cuidados propios tienen que encajar con la especie: si no, el perfil efectivo sería imposible. */
  private fun requireCareFits(care: CareOverrides?, species: Species) {
    try {
      care?.validateAgainst(species)
    } catch (cause: IllegalArgumentException) {
      throw IllegalArgumentException(
        "Los cuidados propios del ejemplar no encajan con la especie '${species.scientificName}': ${cause.message}",
        cause,
      )
    }
  }

  private fun String?.cleaned(): String? = this?.trim()?.takeIf { it.isNotEmpty() }

  private companion object {
    val GERMINATION_YEARS = 1900..2100
  }

  /**
   * `plant_tag` es una tabla de unión pura (sin columnas propias), así que se mapea como la
   * relación N:M y no como entidad asociativa. `@BatchSize` es lo que evita el N+1 al recorrer
   * una página del inventario: los tags de las 25 plantas se resuelven en una consulta, no en 25.
   *
   * Nunca debe entrar en un join fetch: una colección en el fetch obliga a Hibernate a paginar
   * en memoria, trayéndose el inventario entero.
   */
  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(
    name = "plant_tag",
    joinColumns = [JoinColumn(name = "plant_id")],
    inverseJoinColumns = [JoinColumn(name = "tag_id")],
  )
  @BatchSize(size = 50)
  private val tagSet: MutableSet<Tag> = mutableSetOf()

  /** Vista de solo lectura: el conjunto solo se modifica por [updateTags]. */
  val tags: Set<Tag> get() = tagSet.toSet()

  /** Reemplaza el conjunto completo de tags; la idempotencia y el vaciado salen del `Set`. */
  fun updateTags(newTags: Set<Tag>) {
    tagSet.clear()
    tagSet.addAll(newTags)
  }
}
