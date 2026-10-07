package com.cactify.domain.repos

import com.cactify.domain.MediaAsset
import com.cactify.domain.MediaAssetId
import com.cactify.domain.PlantEventId
import com.cactify.domain.PlantId
import com.cactify.domain.PlantMedia
import com.cactify.domain.SpeciesId
import com.cactify.domain.SpeciesMedia
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification

/** Puerto del archivo de una fotografía. Solo se pagina: no hay listado sin límite (ADR-009). */
interface MediaAssetRepository {
  fun save(asset: MediaAsset): MediaAsset
  fun delete(asset: MediaAsset)
  fun findOneById(id: MediaAssetId): MediaAsset?

  /** Las fotografías que existen de entre esas, en **una** consulta. */
  fun findAllByIdIn(ids: Collection<MediaAssetId>): List<MediaAsset>
  fun findAll(pageable: Pageable): Page<MediaAsset>

  /** Vuelca a la base lo pendiente: el servicio lo usa para que un fallo de la fila salte **antes** de dar la subida por buena. */
  fun flush()
}

/** Puerto de la galería de una especie. Una galería está acotada (50), pero aun así se lee paginada o por su tope. */
interface SpeciesMediaRepository {
  fun save(entry: SpeciesMedia): SpeciesMedia
  fun delete(entry: SpeciesMedia)
  fun findOneById(id: MediaAssetId): SpeciesMedia?

  /** Toda la galería —acotada por el límite por dueño— en su orden manual: es sobre lo que opera [com.cactify.domain.MediaGallery]. */
  fun findAllBySpeciesIdOrderByPositionAsc(speciesId: SpeciesId): List<SpeciesMedia>
  fun findBySpeciesId(speciesId: SpeciesId, pageable: Pageable): Page<SpeciesMedia>
  fun countBySpeciesId(speciesId: SpeciesId): Long
  fun flush()
}

/** Puerto de la galería de un ejemplar. */
interface PlantMediaRepository {
  fun save(entry: PlantMedia): PlantMedia
  fun delete(entry: PlantMedia)
  fun findOneById(id: MediaAssetId): PlantMedia?
  fun findAllByPlantIdOrderByPositionAsc(plantId: PlantId): List<PlantMedia>
  fun countByPlantId(plantId: PlantId): Long
  fun findAll(spec: Specification<PlantMedia>?, pageable: Pageable): Page<PlantMedia>

  /** Las fotografías colgadas de esos eventos, con su archivo ya cargado, en **una** consulta. */
  fun findAllByEventIdIn(ids: Collection<PlantEventId>): List<PlantMedia>
  fun flush()
}

/** La portada de un dueño: lo justo para pintarla. */
data class PrimaryPhoto(val id: MediaAssetId, val altText: String)

/** Cuántas fotografías tiene un dueño y cuál es su portada (ausente si no tiene ninguna). */
data class PhotoSummary(val count: Long, val primary: PrimaryPhoto?) {
  companion object {
    val NONE = PhotoSummary(0, null)
  }
}

/**
 * Los resúmenes de fotografías de una página de especies o de ejemplares, **con una consulta
 * agregada** por página y no una por fila (ADR-009). Los dueños sin fotografías no aparecen en el mapa.
 */
interface MediaSummaries {
  fun bySpecies(ids: Collection<SpeciesId>): Map<SpeciesId, PhotoSummary>
  fun byPlant(ids: Collection<PlantId>): Map<PlantId, PhotoSummary>
}
