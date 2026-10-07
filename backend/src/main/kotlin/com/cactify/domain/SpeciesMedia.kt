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
 * Una fotografía de referencia de una especie: de quién es y cómo se muestra. Comparte la clave de su
 * [MediaAsset] (que se borra en cascada con él). El orden y la portada los gobierna [MediaGallery].
 */
@Entity
@Table(name = "species_media")
class SpeciesMedia(
  @MapsId
  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "media_id")
  val asset: MediaAsset,
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "species_id", nullable = false, updatable = false)
  val species: Species,
  credit: String?,
) : GalleryEntry {

  /** La clave **es** la del archivo (`@MapsId`): Hibernate la toma de [asset] al guardar. */
  @EmbeddedId
  private var id: MediaAssetId? = null

  override val mediaId: MediaAssetId get() = asset.id

  @Column(name = "position", nullable = false)
  override var position: Int = 0
    private set

  @Column(name = "is_primary", nullable = false)
  override var isPrimary: Boolean = false
    private set

  @Column(name = "credit")
  var credit: String? = credit?.trim()?.takeIf { it.isNotEmpty() }
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

  fun correctCredit(value: String?) {
    credit = value?.trim()?.takeIf { it.isNotEmpty() }
  }
}
