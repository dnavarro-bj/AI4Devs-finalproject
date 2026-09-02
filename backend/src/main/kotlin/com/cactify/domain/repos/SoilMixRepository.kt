package com.cactify.domain.repos

import com.cactify.domain.SoilMix
import com.cactify.domain.SoilMixId

/**
 * Puerto mínimo de lectura de mezclas de tierra: lo justo para resolver el `soilMixId` con el que
 * se da de alta o se edita una especie. **No** es el catálogo de mezclas (historia 0.8), que no
 * tiene endpoints todavía; por eso no hay listado ni escritura.
 */
interface SoilMixRepository {
  fun findOneById(id: SoilMixId): SoilMix?
}
