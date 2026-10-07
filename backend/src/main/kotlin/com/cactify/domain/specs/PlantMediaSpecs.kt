package com.cactify.domain.specs

import com.cactify.domain.MediaPurpose
import com.cactify.domain.PlantEventId
import com.cactify.domain.PlantId
import com.cactify.domain.PlantMedia
import org.springframework.data.jpa.domain.Specification

/** Filtros y orden de la galería de un ejemplar, como piezas componibles. */
object PlantMediaSpecs {

  /**
   * Las fotografías del ejemplar, con su archivo traído en la misma consulta. En la de recuento no se
   * hace `fetch`: el recuento no devuelve entidades.
   */
  fun ofPlant(plantId: PlantId): Specification<PlantMedia> =
    Specification { root, query, cb ->
      if (query?.resultType != java.lang.Long::class.java && query?.resultType != Long::class.java) root.fetch<Any, Any>("asset")
      cb.equal(root.get<Any>("plant").get<PlantId>("id"), plantId)
    }

  fun byPurpose(purpose: MediaPurpose?): Specification<PlantMedia> =
    Specification { root, _, cb -> purpose?.let { cb.equal(root.get<MediaPurpose>("purpose"), it) } }

  fun byEvent(eventId: PlantEventId?): Specification<PlantMedia> =
    Specification { root, _, cb -> eventId?.let { cb.equal(root.get<Any>("event").get<PlantEventId>("id"), it) } }

  /**
   * **La evolución**: de la más reciente a la más antigua por fecha de captura y, sin ella, por la de
   * subida. Es el orden por defecto; el manual se pide con `?sort=position`. Fija el orden en la propia
   * consulta porque `ORDER BY coalesce(...)` no se puede expresar como una propiedad de `Sort`.
   */
  fun inEvolutionOrder(): Specification<PlantMedia> =
    Specification { root, query, cb ->
      if (query != null && query.resultType != java.lang.Long::class.java && query.resultType != Long::class.java) {
        val asset = root.get<Any>("asset")
        val taken = cb.coalesce(asset.get<java.time.Instant>("capturedAt"), asset.get<java.time.Instant>("createdAt"))
        query.orderBy(cb.desc(taken), cb.desc(root.get<Any>("id").get<Long>("id")))
      }
      null
    }
}
