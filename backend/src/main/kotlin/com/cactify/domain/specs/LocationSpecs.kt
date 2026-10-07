package com.cactify.domain.specs

import com.cactify.domain.Location
import com.cactify.domain.LocationId
import org.springframework.data.jpa.domain.Specification

/** Filtros del catálogo de localizaciones, con la misma convención que [PlantSpecs]: `null` = no aplica. */
object LocationSpecs {

  /**
   * Coincidencia parcial sobre el **nombre o el código**, sin distinguir mayúsculas. El texto es
   * literal (ver [LikePattern]) y uno en blanco no filtra.
   */
  fun byText(text: String?): Specification<Location> =
    Specification { root, _, cb ->
      val needle = text?.trim().orEmpty()
      if (needle.isEmpty()) {
        null
      } else {
        val pattern = LikePattern.contains(needle.uppercase())
        cb.or(
          cb.like(cb.upper(root.get("name")), pattern, LikePattern.ESCAPE),
          cb.like(cb.upper(root.get("code")), pattern, LikePattern.ESCAPE),
        )
      }
    }

  /** Los hijos directos de una localización. */
  fun byParent(parentId: LocationId?): Specification<Location> =
    Specification { root, _, cb -> parentId?.let { cb.equal(root.get<LocationId>("parentId"), it) } }

  /** Solo las localizaciones sin padre. */
  fun rootsOnly(rootsOnly: Boolean): Specification<Location> =
    Specification { root, _, cb ->
      if (rootsOnly) cb.isNull(root.get<LocationId>("parentId").get<Long>("id")) else null
    }
}
