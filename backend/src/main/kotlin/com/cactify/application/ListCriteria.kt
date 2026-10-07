package com.cactify.application

import com.cactify.domain.Environment
import com.cactify.domain.LocationId
import com.cactify.domain.PeriodType
import com.cactify.domain.PlantStatus
import com.cactify.domain.SoilMixId
import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import com.cactify.domain.SunExposure
import com.cactify.domain.TagId
import com.cactify.domain.specs.PlantSortKeys
import com.cactify.domain.specs.SpeciesSortKeys
import com.cactify.domain.specs.SpeciesSpecs
import org.springframework.data.jpa.domain.Specification

/**
 * Los criterios de filtro del inventario, **ya interpretados**. Se construyen desde los parámetros
 * del listado —el controller— y desde la consulta de una vista guardada —[fromQuery]—, de modo que
 * «una vista no puede ser inservible» se cumple por construcción: lo que el listado rechazaría con
 * `400` (un estado desconocido, un id mal formado, una exposición fuera de lista) lo rechaza esta
 * clase al construirse, y nadie mantiene una segunda implementación de las reglas.
 */
class PlantCriteria(
  location: String? = null,
  tags: List<String> = emptyList(),
  val code: String? = null,
  statuses: List<String> = emptyList(),
  val includeDescendants: Boolean = false,
  val text: String? = null,
  species: List<String> = emptyList(),
  exposures: List<String> = emptyList(),
  environments: List<String> = emptyList(),
) {
  val locationId: LocationId? = location?.let { LocationId.from(it) }
  val tagIds: Set<TagId> = tags.map { TagId.from(it) }.toSet()
  val statuses: Set<PlantStatus> = statuses.map { PlantStatus(it) }.toSet()
  val speciesIds: Set<SpeciesId> = species.map { SpeciesId.from(it) }.toSet()
  val exposures: Set<SunExposure> = exposures.map { SunExposure(it) }.toSet()
  val environments: Set<Environment> = environments.map { Environment(it) }.toSet()

  companion object {
    /** Los parámetros de filtro que el listado de plantas conoce; con `sort`, son los de una vista. */
    val PARAMS = setOf("location", "tag", "code", "status", "includeDescendants", "q", "species", "exposure", "environment")

    /**
     * La consulta de una vista de plantas. A diferencia del listado, **no admite ruido**: un
     * parámetro que el listado no conoce se rechaza, para que una vista no guarde basura.
     */
    fun fromQuery(params: Map<String, List<String>>): PlantCriteria {
      params.rejectUnknown(PARAMS, "el inventario")
      PlantSortKeys.requireValid(params["sort"].orEmpty())
      return PlantCriteria(
        location = params.single("location"),
        tags = params["tag"].orEmpty(),
        code = params.single("code"),
        statuses = params["status"].orEmpty(),
        includeDescendants = params.single("includeDescendants")?.let(::strictBoolean) ?: false,
        text = params.single("q"),
        species = params["species"].orEmpty(),
        exposures = params["exposure"].orEmpty(),
        environments = params["environment"].orEmpty(),
      )
    }
  }
}

/** Los criterios del catálogo de especies, interpretados (ver [PlantCriteria]). */
class SpeciesCriteria(
  val code: String? = null,
  val text: String? = null,
  exposures: List<String> = emptyList(),
  environments: List<String> = emptyList(),
  soilMixIds: List<String> = emptyList(),
  val minTemperatureFrom: Int? = null,
  val minTemperatureTo: Int? = null,
  growthMonths: List<Int> = emptyList(),
  bloomMonths: List<Int> = emptyList(),
) {
  val exposures: Set<SunExposure> = exposures.map { SunExposure(it) }.toSet()
  val environments: Set<Environment> = environments.map { Environment(it) }.toSet()
  val soilMixIds: Set<SoilMixId> = soilMixIds.map { SoilMixId.from(it) }.toSet()
  val growthMonths: Set<Int> = growthMonths.toSet()
  val bloomMonths: Set<Int> = bloomMonths.toSet()

  init {
    (this.growthMonths + this.bloomMonths).forEach {
      require(it in 1..12) { "El mes $it no es válido: debe estar entre 1 y 12" }
    }
  }

  /** La especificación que evalúa estos criterios: la usa el listado y el recuento de un grupo. */
  fun toSpecification(): Specification<Species> =
    SpeciesSpecs.byCodeContaining(code)
      .and(SpeciesSpecs.byText(text))
      .and(SpeciesSpecs.byExposures(exposures))
      .and(SpeciesSpecs.byEnvironments(environments))
      .and(SpeciesSpecs.bySoilMixes(soilMixIds))
      .and(SpeciesSpecs.byMinTemperature(minTemperatureFrom, minTemperatureTo))
      .and(SpeciesSpecs.byMonthsCovered(PeriodType.Growth, growthMonths))
      .and(SpeciesSpecs.byMonthsCovered(PeriodType.Flowering, bloomMonths))

  companion object {
    val PARAMS = setOf(
      "code", "q", "exposure", "environment", "soilMix", "minTemperatureFrom", "minTemperatureTo", "growthMonth", "bloomMonth",
    )

    fun fromQuery(params: Map<String, List<String>>): SpeciesCriteria {
      params.rejectUnknown(PARAMS, "el catálogo de especies")
      SpeciesSortKeys.requireValid(params["sort"].orEmpty())
      return SpeciesCriteria(
        code = params.single("code"),
        text = params.single("q"),
        exposures = params["exposure"].orEmpty(),
        environments = params["environment"].orEmpty(),
        soilMixIds = params["soilMix"].orEmpty(),
        minTemperatureFrom = params.single("minTemperatureFrom")?.toInt(),
        minTemperatureTo = params.single("minTemperatureTo")?.toInt(),
        growthMonths = params["growthMonth"].orEmpty().map { it.toInt() },
        bloomMonths = params["bloomMonth"].orEmpty().map { it.toInt() },
      )
    }
  }
}

private fun Map<String, List<String>>.rejectUnknown(known: Set<String>, subject: String) {
  val unknown = keys - known - "sort"
  require(unknown.isEmpty()) {
    "Parámetros no admitidos para $subject: ${unknown.sorted().joinToString()}. Los admitidos son ${(known + "sort").sorted().joinToString()}"
  }
}

private fun Map<String, List<String>>.single(key: String): String? {
  val values = this[key].orEmpty()
  require(values.size <= 1) { "El parámetro '$key' no admite varios valores" }
  return values.firstOrNull()
}

private fun strictBoolean(value: String): Boolean =
  value.toBooleanStrictOrNull() ?: throw IllegalArgumentException("'$value' no es un booleano válido: true o false")
