package com.cactify.domain.specs

import com.cactify.domain.Species
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
}
