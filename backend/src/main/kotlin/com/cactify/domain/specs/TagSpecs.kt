package com.cactify.domain.specs

import com.cactify.domain.Tag
import org.springframework.data.jpa.domain.Specification

/** Filtros del catálogo de etiquetas, con la misma convención que [PlantSpecs]: `null` = no aplica. */
object TagSpecs {

  /** Coincidencia parcial sobre el nombre, sin distinguir mayúsculas. Literal; en blanco no filtra. */
  fun byText(text: String?): Specification<Tag> =
    Specification { root, _, cb ->
      val needle = text?.trim().orEmpty()
      if (needle.isEmpty()) null else cb.like(cb.upper(root.get("name")), LikePattern.contains(needle.uppercase()), LikePattern.ESCAPE)
    }
}
