package com.cactify.domain

import io.hypersistence.tsid.TSID
import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import java.io.Serializable

/**
 * Identificador tipado de una entidad (ADR-008). Un tipo por entidad para que el compilador
 * impida cruzar el identificador de una con el de otra, sobre el mismo TSID de 64 bits que ya
 * persiste la columna `BIGINT`: por eso el tipado no lleva migracion.
 *
 * `toString()` devuelve la representacion decimal, que es la que viaja por el API como cadena.
 */
interface EntityId<T> : Serializable {
  val id: T
}

@Embeddable
data class SoilMixId(@Column(name = "id") override val id: Long) : EntityId<Long> {
  companion object {
    fun create(): SoilMixId = SoilMixId(TSID.fast().toLong())
    fun from(value: Long): SoilMixId = SoilMixId(value)
    fun from(value: String): SoilMixId = SoilMixId(value.trim().toLong())
  }

  override fun toString(): String = id.toString()
}

@Embeddable
data class SpeciesId(@Column(name = "id") override val id: Long) : EntityId<Long> {
  companion object {
    fun create(): SpeciesId = SpeciesId(TSID.fast().toLong())
    fun from(value: Long): SpeciesId = SpeciesId(value)
    fun from(value: String): SpeciesId = SpeciesId(value.trim().toLong())
  }

  override fun toString(): String = id.toString()
}

@Embeddable
data class LocationId(@Column(name = "id") override val id: Long) : EntityId<Long> {
  companion object {
    fun create(): LocationId = LocationId(TSID.fast().toLong())
    fun from(value: Long): LocationId = LocationId(value)
    fun from(value: String): LocationId = LocationId(value.trim().toLong())
  }

  override fun toString(): String = id.toString()
}

@Embeddable
data class PlantId(@Column(name = "id") override val id: Long) : EntityId<Long> {
  companion object {
    fun create(): PlantId = PlantId(TSID.fast().toLong())
    fun from(value: Long): PlantId = PlantId(value)
    fun from(value: String): PlantId = PlantId(value.trim().toLong())
  }

  override fun toString(): String = id.toString()
}

@Embeddable
data class TagId(@Column(name = "id") override val id: Long) : EntityId<Long> {
  companion object {
    fun create(): TagId = TagId(TSID.fast().toLong())
    fun from(value: Long): TagId = TagId(value)
    fun from(value: String): TagId = TagId(value.trim().toLong())
  }

  override fun toString(): String = id.toString()
}

@Embeddable
data class CareRecordId(@Column(name = "id") override val id: Long) : EntityId<Long> {
  companion object {
    fun create(): CareRecordId = CareRecordId(TSID.fast().toLong())
    fun from(value: Long): CareRecordId = CareRecordId(value)
    fun from(value: String): CareRecordId = CareRecordId(value.trim().toLong())
  }

  override fun toString(): String = id.toString()
}

@Embeddable
data class AIRecommendationId(@Column(name = "id") override val id: Long) : EntityId<Long> {
  companion object {
    fun create(): AIRecommendationId = AIRecommendationId(TSID.fast().toLong())
    fun from(value: Long): AIRecommendationId = AIRecommendationId(value)
    fun from(value: String): AIRecommendationId = AIRecommendationId(value.trim().toLong())
  }

  override fun toString(): String = id.toString()
}

@Embeddable
data class PlantStatusChangeId(@Column(name = "id") override val id: Long) : EntityId<Long> {
  companion object {
    fun create(): PlantStatusChangeId = PlantStatusChangeId(TSID.fast().toLong())
    fun from(value: Long): PlantStatusChangeId = PlantStatusChangeId(value)
    fun from(value: String): PlantStatusChangeId = PlantStatusChangeId(value.trim().toLong())
  }

  override fun toString(): String = id.toString()
}

@Embeddable
data class SpeciesPeriodId(@Column(name = "id") override val id: Long) : EntityId<Long> {
  companion object {
    fun create(): SpeciesPeriodId = SpeciesPeriodId(TSID.fast().toLong())
    fun from(value: Long): SpeciesPeriodId = SpeciesPeriodId(value)
    fun from(value: String): SpeciesPeriodId = SpeciesPeriodId(value.trim().toLong())
  }

  override fun toString(): String = id.toString()
}

@Embeddable
data class PlantMovementId(@Column(name = "id") override val id: Long) : EntityId<Long> {
  companion object {
    fun create(): PlantMovementId = PlantMovementId(TSID.fast().toLong())
    fun from(value: Long): PlantMovementId = PlantMovementId(value)
    fun from(value: String): PlantMovementId = PlantMovementId(value.trim().toLong())
  }

  override fun toString(): String = id.toString()
}

/**
 * Identificador de un evento de la cronología. Es **uno solo** para los tres tipos —comentario,
 * intervención y floración—: comparten espina `JOINED` y el identificador de la entrada de la
 * cronología es el del evento, así que `PUT`/`DELETE` actúan por él.
 */
@Embeddable
data class PlantEventId(@Column(name = "id") override val id: Long) : EntityId<Long> {
  companion object {
    fun create(): PlantEventId = PlantEventId(TSID.fast().toLong())
    fun from(value: Long): PlantEventId = PlantEventId(value)
    fun from(value: String): PlantEventId = PlantEventId(value.trim().toLong())
  }

  override fun toString(): String = id.toString()
}

@Embeddable
data class SavedViewId(@Column(name = "id") override val id: Long) : EntityId<Long> {
  companion object {
    fun create(): SavedViewId = SavedViewId(TSID.fast().toLong())
    fun from(value: Long): SavedViewId = SavedViewId(value)
    fun from(value: String): SavedViewId = SavedViewId(value.trim().toLong())
  }

  override fun toString(): String = id.toString()
}
