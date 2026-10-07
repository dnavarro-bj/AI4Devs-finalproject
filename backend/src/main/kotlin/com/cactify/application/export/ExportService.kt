package com.cactify.application.export

import com.cactify.application.ExportTooLargeException
import com.cactify.application.PlantCriteria
import com.cactify.application.PlantService
import com.cactify.application.SpeciesCriteria
import com.cactify.domain.Plant
import com.cactify.domain.PlantId
import com.cactify.domain.Species
import com.cactify.domain.repos.LocationHierarchy
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.SpeciesRepository
import com.cactify.domain.specs.PlantSortKeys
import com.cactify.domain.specs.SpeciesSortKeys
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

/** Un archivo listo para descargar: su nombre fechado y su contenido. */
class ExportFile(val filename: String, val bytes: ByteArray)

/**
 * Exportación del resultado filtrado a CSV (ADR-017). Es el listado **sin paginar**: los mismos
 * criterios, las mismas `Specification` y las mismas claves de orden, de modo que «mismas filas que
 * el listado» es cierto por construcción.
 *
 * Se **cuenta antes de leer** y, si el resultado supera [maxRows], se rechaza con
 * [ExportTooLargeException] en lugar de truncar. Se lee en bloques de [BLOCK] dentro de una única
 * transacción de lectura (con `open-in-view` apagado, escribir en streaming fuera de ella dejaría la
 * sesión cerrada), y lo que no cuelga de la fila —las etiquetas, las rutas de localización, el
 * número de ejemplares— se resuelve **por bloque o de una vez**, nunca por fila.
 */
@Service
class ExportService(
  private val plantService: PlantService,
  private val plantRepository: PlantRepository,
  private val speciesRepository: SpeciesRepository,
  private val hierarchy: LocationHierarchy,
  private val clock: Clock,
  @Value("\${cactify.export.max-rows:5000}") private val maxRows: Int,
) {

  @Transactional(readOnly = true)
  fun exportPlants(criteria: PlantCriteria, sort: Sort): ExportFile {
    val spec = plantService.specification(criteria)
    // La clave de orden se valida **antes** de contar: con un resultado vacío no se leería ninguna
    // página y un `sort` ajeno pasaría por bueno.
    val ordered = PlantSortKeys.translate(PageRequest.of(0, BLOCK, sort)).sort
    val plants = readAll(plantRepository.count(spec)) { page ->
      plantRepository.findAll(spec, PageRequest.of(page, BLOCK, ordered)).content
    }

    val tagsByPlant = plants.chunked(BLOCK)
      .flatMap { block -> plantRepository.findTagNames(block.map { it.id }) }
      .groupBy({ it.plantId }, { it.name })
    val paths = hierarchy.pathsOf(plants.map { it.location.id }.toSet())

    val document = CsvDocument(PLANT_HEADER)
    plants.forEach { plant ->
      document.row(plantRow(plant, tagsByPlant[plant.id].orEmpty().sorted(), paths[plant.location.id] ?: plant.location.name))
    }
    return ExportFile(filename("plantas"), document.toBytes())
  }

  @Transactional(readOnly = true)
  fun exportSpecies(criteria: SpeciesCriteria, sort: Sort): ExportFile {
    val spec: Specification<Species> = criteria.toSpecification()
    val ordered = SpeciesSortKeys.translate(PageRequest.of(0, BLOCK, sort)).sort
    val species = readAll(speciesRepository.count(spec)) { page ->
      speciesRepository.findAll(spec, PageRequest.of(page, BLOCK, ordered)).content
    }

    val counts = species.chunked(BLOCK)
      .flatMap { block -> speciesRepository.countPlantsBySpecies(block.map { it.id }) }
      .associate { it.speciesId to it.plantCount }

    val document = CsvDocument(SPECIES_HEADER)
    species.forEach { document.row(speciesRow(it, counts[it.id] ?: 0)) }
    return ExportFile(filename("especies"), document.toBytes())
  }

  /** Cuenta, rechaza si no cabe y solo entonces lee, página a página. */
  private fun <T> readAll(total: Long, readPage: (Int) -> List<T>): List<T> {
    if (total > maxRows) throw ExportTooLargeException(total, maxRows)
    val pages = ((total + BLOCK - 1) / BLOCK).toInt()
    return (0 until pages).flatMap(readPage)
  }

  private fun filename(resource: String) = "cactify-$resource-${LocalDate.now(clock)}.csv"

  private fun plantRow(plant: Plant, tags: List<String>, locationPath: String): List<Any?> = listOf(
    plant.code,
    plant.nickname,
    plant.species.code,
    plant.species.scientificName,
    locationPath,
    plant.status.value,
    tags.joinToString(";"),
    plant.description,
    plant.germinationYear,
    plant.germinationMonth,
    plant.acquiredOn,
    plant.origin?.value,
    plant.originNote,
    plant.createdAt,
  )

  private fun speciesRow(species: Species, plantCount: Long): List<Any?> = listOf(
    species.code,
    species.scientificName,
    species.commonName,
    species.sunExposure?.value,
    species.environment?.value,
    species.soilMix.name,
    species.minTemperature,
    species.maxTemperature,
    species.minHumidity,
    species.maxHumidity,
    species.minLightHours,
    species.maxLightHours,
    species.wateringGuideline,
    plantCount,
  )

  private companion object {
    const val BLOCK = 500

    val PLANT_HEADER = listOf(
      "Código", "Apodo", "Código de especie", "Especie", "Localización", "Estado", "Etiquetas", "Descripción",
      "Año de germinación", "Mes de germinación", "Fecha de adquisición", "Procedencia", "Nota de procedencia", "Fecha de alta",
    )

    val SPECIES_HEADER = listOf(
      "Código", "Nombre científico", "Nombre común", "Exposición", "Entorno", "Mezcla de sustrato",
      "Temperatura mínima", "Temperatura máxima", "Humedad mínima", "Humedad máxima",
      "Horas de luz mínimas", "Horas de luz máximas", "Riego orientativo", "Ejemplares",
    )
  }
}
