package com.cactify.application.dto

import java.math.BigDecimal

/**
 * DTOs de catálogo. Los identificadores son `String`: en el API viajan como cadena decimal para
 * que un cliente JavaScript no los redondee (ADR-008).
 */
data class LocationResponse(val id: String, val name: String)

/**
 * La localización en el catálogo: el nombre más la carga que soporta.
 *
 * El recuento viaja también aquí, y no solo en la ficha como en mezclas, porque el mapa del vivero
 * **es** la carga de cada sitio: sin ella el catálogo es una lista de nombres. Se resuelve con una
 * agregación para toda la página, no con una consulta por fila.
 */
data class LocationSummaryResponse(val id: String, val name: String, val plantCount: Long)

/**
 * La localización en su propia ficha: el nombre más **cuántos ejemplares alberga**.
 *
 * El recuento vive aquí y no en el listado a propósito, igual que en mezclas: en el catálogo
 * sería una consulta por fila, y en la ficha es la cifra que decide si la localización se puede
 * retirar y cuántas plantas habría que mover antes.
 */
data class LocationDetailResponse(val id: String, val name: String, val plantCount: Long)

data class TagResponse(val id: String, val name: String)

/**
 * La etiqueta en el catálogo: el nombre más cuántas plantas la tienen.
 *
 * El recuento viaja en el listado porque el catálogo existe para **comparar** usos —qué etiqueta
 * sobra, cuál duplica a cuál—, y esa comparación no se puede hacer entrando en cada ficha. Se
 * resuelve con una agregación para la página entera.
 */
data class TagSummaryResponse(val id: String, val name: String, val plantCount: Long)

/**
 * La etiqueta en su propia ficha: el nombre, **su forma normalizada** y cuántas plantas la tienen.
 *
 * El nombre normalizado viaja porque es lo que decide si un renombrado choca con otra etiqueta:
 * enseñarlo evita que un `409` parezca arbitrario cuando los dos nombres se ven distintos.
 */
data class TagDetailResponse(
  val id: String,
  val name: String,
  val normalizedName: String,
  val plantCount: Long,
)

/**
 * El resultado de combinar dos etiquetas: cuántas plantas se vieron afectadas y qué etiqueta
 * queda. La cifra se devuelve porque la operación es destructiva: permite confirmar lo ocurrido y
 * no solo prometerlo antes.
 */
data class TagMergeResponse(val target: TagResponse, val affectedPlants: Long)

/**
 * Mezcla de tierra en su ficha y en el catálogo: la receta completa.
 *
 * Los porcentajes suman 100 por invariante de la entidad, así que la suma no viaja: sería un dato
 * derivado que el cliente puede volver a calcular y, si algún día no cuadrara, contradecir.
 */
data class SoilMixResponse(
  val id: String,
  val name: String,
  val organicPercentage: Int,
  val mineralPercentage: Int,
  val phMin: BigDecimal,
  val phMax: BigDecimal,
  val description: String?,
)

/**
 * La mezcla en su propia ficha: la receta más **cuántas especies la recomiendan**.
 *
 * El recuento vive aquí y no en el listado a propósito: en el catálogo sería una consulta por
 * fila, y en la ficha es la cifra que decide si la mezcla se puede retirar y a cuántas especies
 * alcanza corregirla.
 */
data class SoilMixDetailResponse(
  val id: String,
  val name: String,
  val organicPercentage: Int,
  val mineralPercentage: Int,
  val phMin: BigDecimal,
  val phMax: BigDecimal,
  val description: String?,
  val speciesCount: Long,
)

/**
 * La mezcla vista desde otra ficha —la de una especie—: identificador y nombre.
 *
 * Con identificador y no solo con nombre: el nombre sirve para pintar y el identificador para
 * volver a enviar, y `PUT /species/{id}` es reemplazo completo, así que sin él la ficha no basta
 * para reconstruir la especie.
 */
data class SoilMixSummaryResponse(val id: String, val name: String)
