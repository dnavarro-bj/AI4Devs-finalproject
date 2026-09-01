package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.EmbeddedId
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.BatchSize
import org.hibernate.annotations.Generated
import org.hibernate.generator.EventType
import java.time.OffsetDateTime

@Entity
@Table(name = "plant")
class Plant(
  @EmbeddedId
  val id: PlantId = PlantId.create(),
  var nickname: String,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "location_id", nullable = false)
  var location: Location,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "species_id", nullable = false)
  var species: Species,

  /** La pone la base de datos (`DEFAULT now()`); `@Generated` la lee de vuelta tras el insert. */
  @Column(name = "created_at", insertable = false, updatable = false)
  @Generated(event = [EventType.INSERT])
  var createdAt: OffsetDateTime? = null,
) {
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
