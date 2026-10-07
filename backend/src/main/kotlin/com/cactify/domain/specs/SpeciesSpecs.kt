package com.cactify.domain.specs

import com.cactify.domain.Environment
import com.cactify.domain.PeriodType
import com.cactify.domain.SoilMix
import com.cactify.domain.SoilMixId
import com.cactify.domain.Species
import com.cactify.domain.SpeciesPeriod
import com.cactify.domain.SunExposure
import org.springframework.data.jpa.domain.Specification

/** Filtros del catálogo de especies, con la misma convención que [PlantSpecs]: `null` = no aplica. */
object SpeciesSpecs {

  /**
   * Coincidencia parcial sobre el código, sin distinguir mayúsculas. Los códigos solo llevan
   * mayúsculas, cifras y guiones, así que comparar en mayúsculas es exacto. Un texto en blanco no
   * filtra.
   */
  fun byCodeContaining(text: String?): Specification<Species> =
    Specification { root, _, cb ->
      val needle = text?.trim().orEmpty()
      if (needle.isEmpty()) {
        null
      } else {
        cb.like(cb.upper(root.get("code")), LikePattern.contains(needle.uppercase()), LikePattern.ESCAPE)
      }
    }
  /**
   * Texto libre: la especie encaja si **cualquiera** de su nombre científico, su nombre común y su
   * código contiene el texto, sin distinguir mayúsculas y con `%` y `_` como texto (ver
   * [LikePattern]). Un texto en blanco no filtra.
   */
  fun byText(text: String?): Specification<Species> =
    Specification { root, _, cb ->
      val needle = text?.trim().orEmpty()
      if (needle.isEmpty()) {
        null
      } else {
        val pattern = LikePattern.contains(needle.uppercase())
        cb.or(
          cb.like(cb.upper(root.get("scientificName")), pattern, LikePattern.ESCAPE),
          cb.like(cb.upper(root.get("commonName")), pattern, LikePattern.ESCAPE),
          cb.like(cb.upper(root.get("code")), pattern, LikePattern.ESCAPE),
        )
      }
    }

  /** Las especies con **cualquiera** de esas exposiciones. Una sin definir no encaja. Vacío = no filtra. */
  fun byExposures(exposures: Set<SunExposure>): Specification<Species> =
    Specification { root, _, _ ->
      if (exposures.isEmpty()) null else root.get<SunExposure>("sunExposure").`in`(exposures)
    }

  /** Las especies con **cualquiera** de esos entornos. Una sin definir no encaja. Vacío = no filtra. */
  fun byEnvironments(environments: Set<Environment>): Specification<Species> =
    Specification { root, _, _ ->
      if (environments.isEmpty()) null else root.get<Environment>("environment").`in`(environments)
    }

  /** Las especies que recomiendan **cualquiera** de esas mezclas. Una inexistente no da error: no encaja nada. */
  fun bySoilMixes(soilMixIds: Set<SoilMixId>): Specification<Species> =
    Specification { root, _, _ ->
      if (soilMixIds.isEmpty()) null else root.get<SoilMix>("soilMix").get<SoilMixId>("id").`in`(soilMixIds)
    }

  /** La temperatura mínima soportada está en `[from, to]`, extremos incluidos; cada extremo es opcional. */
  fun byMinTemperature(from: Int?, to: Int?): Specification<Species> =
    Specification { root, _, cb ->
      val conditions = listOfNotNull(
        from?.let { cb.greaterThanOrEqualTo(root.get<Int>("minTemperature"), it) },
        to?.let { cb.lessThanOrEqualTo(root.get<Int>("minTemperature"), it) },
      )
      if (conditions.isEmpty()) null else cb.and(*conditions.toTypedArray())
    }

  /**
   * La especie tiene un periodo de ese tipo que cubre **cada uno** de los meses (1–12). Un periodo
   * con inicio posterior al fin cruza el fin de año. Se resuelve con un `EXISTS` por mes —como
   * `PlantSpecs.byAllTags` usa una subconsulta—, sin joins que multipliquen filas ni `DISTINCT`.
   * Sin meses no filtra.
   */
  fun byMonthsCovered(type: PeriodType, months: Set<Int>): Specification<Species> =
    Specification { root, query, cb ->
      if (months.isEmpty()) {
        null
      } else {
        val exists = months.map { month ->
          val sub = query!!.subquery(Long::class.java)
          val period = sub.from(SpeciesPeriod::class.java)
          val start = period.get<Int>("startMonth")
          val end = period.get<Int>("endMonth")
          val within = cb.and(cb.le(start, end), cb.le(start, month), cb.ge(end, month))
          val crossing = cb.and(cb.gt(start, end), cb.or(cb.le(start, month), cb.ge(end, month)))
          sub.select(cb.literal(1L)).where(
            cb.equal(period.get<Species>("species"), root),
            cb.equal(period.get<PeriodType>("type"), type),
            cb.or(within, crossing),
          )
          cb.exists(sub)
        }
        cb.and(*exists.toTypedArray())
      }
    }
}
