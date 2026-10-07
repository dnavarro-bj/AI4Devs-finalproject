package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.MapsId
import jakarta.persistence.OneToOne
import jakarta.persistence.Table

/**
 * Una fotografía de un ejemplar: de quién es, para qué se hizo y, opcionalmente, **el evento de su
 * cronología del que cuelga**. Comparte la clave de su [MediaAsset]. Borrar el evento no borra la
 * foto: la base pone `event_id` a nulo y la foto sigue en la galería.
 */
@Entity
@Table(name = "plant_media")
class PlantMedia(
  @MapsId
  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "media_id")
  val asset: MediaAsset,
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "plant_id", nullable = false, updatable = false)
  val plant: Plant,
  purpose: MediaPurpose?,
  event: PlantEvent?,
) : GalleryEntry {

  init {
    require(event == null || event.plant.id == plant.id) { "El evento no pertenece a este ejemplar" }
  }

  /** La clave **es** la del archivo (`@MapsId`): Hibernate la toma de [asset] al guardar. */
  @EmbeddedId
  private var id: MediaAssetId? = null

  override val mediaId: MediaAssetId get() = asset.id

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "event_id")
  var event: PlantEvent? = event
    private set

  @Column(name = "purpose")
  var purpose: MediaPurpose? = purpose
    private set

  @Column(name = "position", nullable = false)
  override var position: Int = 0
    private set

  @Column(name = "is_primary", nullable = false)
  override var isPrimary: Boolean = false
    private set

  override fun placeAt(position: Int) {
    require(position >= 0) { "La posición no puede ser negativa" }
    this.position = position
  }

  override fun markPrimary() {
    isPrimary = true
  }

  override fun unmarkPrimary() {
    isPrimary = false
  }

  fun correctPurpose(value: MediaPurpose?) {
    purpose = value
  }

  /** Cuelga la foto de un evento **del mismo ejemplar**, o la descuelga con `null`. */
  fun attachTo(value: PlantEvent?) {
    require(value == null || value.plant.id == plant.id) { "El evento no pertenece a este ejemplar" }
    event = value
  }
}
