package com.cactify.domain

/**
 * La regla de los rangos de cuidado, **una sola vez**: en cada rango, el mínimo no supera al máximo.
 * La usan la ficha de la especie y los cuidados propios del ejemplar, con los mismos mensajes: es la
 * misma regla y no debe existir dos veces.
 */
object CareRanges {
  fun requireCoherent(
    minHumidity: Int,
    maxHumidity: Int,
    minTemperature: Int,
    maxTemperature: Int,
    minLightHours: Int,
    maxLightHours: Int,
  ) {
    require(minHumidity <= maxHumidity) {
      "La humedad mínima ($minHumidity) no puede superar a la máxima ($maxHumidity)"
    }
    require(minTemperature <= maxTemperature) {
      "La temperatura mínima ($minTemperature) no puede superar a la máxima ($maxTemperature)"
    }
    require(minLightHours <= maxLightHours) {
      "Las horas de luz mínimas ($minLightHours) no pueden superar a las máximas ($maxLightHours)"
    }
  }
}
