package com.cactify.infrastructure.persistence.converters

import com.cactify.domain.PlantOrigin
import com.cactify.domain.PlantStatus
import com.cactify.domain.Priority
import com.cactify.domain.RiskLevel
import jakarta.persistence.AttributeConverter
import jakarta.persistence.Converter

/**
 * Bajan los enumerados de dominio a su columna de texto (ADR-007). El valor persistido es el
 * `value` explícito, no el nombre de la constante: renombrar `High` no corrompe la base de datos.
 */

@Converter(autoApply = true)
class RiskLevelConverter : AttributeConverter<RiskLevel, String> {
  override fun convertToDatabaseColumn(attribute: RiskLevel?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): RiskLevel? = dbData?.let { RiskLevel(it) }
}

@Converter(autoApply = true)
class PriorityConverter : AttributeConverter<Priority, String> {
  override fun convertToDatabaseColumn(attribute: Priority?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): Priority? = dbData?.let { Priority(it) }
}

@Converter(autoApply = true)
class PlantStatusConverter : AttributeConverter<PlantStatus, String> {
  override fun convertToDatabaseColumn(attribute: PlantStatus?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): PlantStatus? = dbData?.let { PlantStatus(it) }
}

@Converter(autoApply = true)
class PlantOriginConverter : AttributeConverter<PlantOrigin, String> {
  override fun convertToDatabaseColumn(attribute: PlantOrigin?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): PlantOrigin? = dbData?.let { PlantOrigin(it) }
}

@Converter(autoApply = true)
class SunExposureConverter : AttributeConverter<com.cactify.domain.SunExposure, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.SunExposure?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.SunExposure? =
    dbData?.let { com.cactify.domain.SunExposure(it) }
}

@Converter(autoApply = true)
class EnvironmentConverter : AttributeConverter<com.cactify.domain.Environment, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.Environment?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.Environment? =
    dbData?.let { com.cactify.domain.Environment(it) }
}

@Converter(autoApply = true)
class PeriodTypeConverter : AttributeConverter<com.cactify.domain.PeriodType, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.PeriodType?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.PeriodType? =
    dbData?.let { com.cactify.domain.PeriodType(it) }
}

@Converter(autoApply = true)
class WateringIntensityConverter : AttributeConverter<com.cactify.domain.WateringIntensity, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.WateringIntensity?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.WateringIntensity? =
    dbData?.let { com.cactify.domain.WateringIntensity(it) }
}
