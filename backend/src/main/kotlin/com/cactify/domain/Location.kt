package com.cactify.domain

import jakarta.persistence.AttributeOverride
import jakarta.persistence.Column
import jakarta.persistence.Embedded
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table

/**
 * Un sitio del vivero. La jerarquía es solo [parentId]: la ruta y los recuentos de descendientes
 * se calculan con consultas recursivas, no se guardan. La entidad **no navega el árbol** —guarda el
 * identificador de su padre y no una asociación— para que cargar una localización no arrastre su
 * cadena; que el padre no sea un descendiente lo comprueba `LocationService`, que es quien puede
 * consultar otras filas (ADR-011).
 */
@Entity
@Table(name = "location")
class Location(
  @EmbeddedId
  override val id: LocationId = LocationId.create(),
  name: String,
  code: String,
  parentId: LocationId? = null,
  description: String? = null,
  locationType: LocationType? = null,
  capacity: Int? = null,
  operationalNotes: String? = null,
  environment: LocationEnvironment? = null,
  sunExposure: LocationExposure? = null,
) : AbstractEntity<LocationId>() {

  var name: String = name.trim()
    private set

  /** Lo escribe una persona y es único sin distinguir mayúsculas; editable siempre. */
  var code: String = code.trim()
    private set

  /** El nodo que la contiene; `null` en una raíz. */
  @Embedded
  @AttributeOverride(name = "id", column = Column(name = "parent_id"))
  var parentId: LocationId? = parentId
    private set

  var description: String? = description.cleaned()
    private set

  @Column(name = "location_type")
  var locationType: LocationType? = locationType
    private set

  /** Cuántos ejemplares caben, a título orientativo. */
  var capacity: Int? = capacity
    private set

  var operationalNotes: String? = operationalNotes.cleaned()
    private set

  var environment: LocationEnvironment? = environment
    private set

  @Column(name = "sun_exposure")
  var sunExposure: LocationExposure? = sunExposure
    private set

  init {
    requireValid(this.name, this.code, parentId, capacity)
  }

  /** Único camino para cambiar solo el nombre: revalida la invariante antes de tocar nada. */
  fun rename(name: String) {
    requireName(name.trim())
    this.name = name.trim()
  }

  /**
   * Reemplazo completo de la ficha. Cambia todo **o nada**: revalida antes de asignar, de modo que un
   * fallo no deja la localización a medias. Que el nuevo padre no sea un descendiente no se puede
   * saber desde aquí y lo comprueba el servicio antes de llamar.
   */
  fun update(
    name: String,
    code: String,
    parentId: LocationId?,
    description: String?,
    locationType: LocationType?,
    capacity: Int?,
    operationalNotes: String?,
    environment: LocationEnvironment?,
    sunExposure: LocationExposure?,
  ) {
    requireValid(name.trim(), code.trim(), parentId, capacity)
    this.name = name.trim()
    this.code = code.trim()
    this.parentId = parentId
    this.description = description.cleaned()
    this.locationType = locationType
    this.capacity = capacity
    this.operationalNotes = operationalNotes.cleaned()
    this.environment = environment
    this.sunExposure = sunExposure
  }

  private fun requireValid(name: String, code: String, parentId: LocationId?, capacity: Int?) {
    requireName(name)
    require(code.isNotBlank()) { "El código de la localización es obligatorio" }
    require(parentId == null || parentId != id) { "Una localización no puede ser su propio padre" }
    require(capacity == null || capacity > 0) { "La capacidad de la localización debe ser mayor que cero, y es $capacity" }
  }

  private fun requireName(value: String) =
    require(value.isNotBlank()) { "El nombre de la localización es obligatorio" }

  private fun String?.cleaned(): String? = this?.trim()?.takeIf { it.isNotEmpty() }
}
