package com.cactify.infrastructure.persistence

import com.cactify.domain.MediaAssetId
import com.cactify.domain.PlantId
import com.cactify.domain.SpeciesId
import com.cactify.domain.repos.MediaSummaries
import com.cactify.domain.repos.PhotoSummary
import com.cactify.domain.repos.PrimaryPhoto
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.stereotype.Repository

/**
 * Portada y recuento de fotografías de una página, con **una** consulta agregada por tipo de dueño.
 * Va por `EntityManager` y no como método de un repositorio JPA porque devuelve filas calculadas, no
 * entidades; y una consulta nativa vacía antes la sesión, así que ve lo que la transacción ya cambió.
 */
@Repository
class NativeMediaSummaries : MediaSummaries {

  @PersistenceContext
  private lateinit var em: EntityManager

  override fun bySpecies(ids: Collection<SpeciesId>): Map<SpeciesId, PhotoSummary> =
    summarize("species_media", "species_id", ids.map { it.id }).mapKeys { SpeciesId.from(it.key) }

  override fun byPlant(ids: Collection<PlantId>): Map<PlantId, PhotoSummary> =
    summarize("plant_media", "plant_id", ids.map { it.id }).mapKeys { PlantId.from(it.key) }

  private fun summarize(table: String, ownerColumn: String, ids: Collection<Long>): Map<Long, PhotoSummary> {
    if (ids.isEmpty()) return emptyMap()
    @Suppress("UNCHECKED_CAST")
    val rows = em.createNativeQuery(
      """
      SELECT m.$ownerColumn,
             count(*),
             max(CASE WHEN m.is_primary THEN a.id END),
             max(CASE WHEN m.is_primary THEN a.alt_text END)
        FROM $table m JOIN media_asset a ON a.id = m.media_id
       WHERE m.$ownerColumn IN (:ids)
       GROUP BY m.$ownerColumn
      """.trimIndent(),
    ).setParameter("ids", ids).resultList as List<Array<Any?>>
    return rows.associate { row ->
      val primaryId = (row[2] as Number?)?.toLong()
      (row[0] as Number).toLong() to PhotoSummary(
        count = (row[1] as Number).toLong(),
        primary = primaryId?.let { PrimaryPhoto(MediaAssetId.from(it), row[3] as String) },
      )
    }
  }
}
