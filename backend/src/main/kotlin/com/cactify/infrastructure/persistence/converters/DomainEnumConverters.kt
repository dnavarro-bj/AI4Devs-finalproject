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

@Converter(autoApply = true)
class LocationTypeConverter : AttributeConverter<com.cactify.domain.LocationType, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.LocationType?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.LocationType? =
    dbData?.let { com.cactify.domain.LocationType(it) }
}

@Converter(autoApply = true)
class LocationEnvironmentConverter : AttributeConverter<com.cactify.domain.LocationEnvironment, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.LocationEnvironment?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.LocationEnvironment? =
    dbData?.let { com.cactify.domain.LocationEnvironment(it) }
}

@Converter(autoApply = true)
class LocationExposureConverter : AttributeConverter<com.cactify.domain.LocationExposure, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.LocationExposure?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.LocationExposure? =
    dbData?.let { com.cactify.domain.LocationExposure(it) }
}

@Converter(autoApply = true)
class InterventionTypeConverter : AttributeConverter<com.cactify.domain.InterventionType, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.InterventionType?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.InterventionType? =
    dbData?.let { com.cactify.domain.InterventionType(it) }
}

@Converter(autoApply = true)
class BloomStatusConverter : AttributeConverter<com.cactify.domain.BloomStatus, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.BloomStatus?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.BloomStatus? =
    dbData?.let { com.cactify.domain.BloomStatus(it) }
}

@Converter(autoApply = true)
class ViewScopeConverter : AttributeConverter<com.cactify.domain.ViewScope, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.ViewScope?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.ViewScope? =
    dbData?.let { com.cactify.domain.ViewScope(it) }
}

@Converter(autoApply = true)
class TaskTypeConverter : AttributeConverter<com.cactify.domain.TaskType, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.TaskType?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.TaskType? =
    dbData?.let { com.cactify.domain.TaskType(it) }
}

@Converter(autoApply = true)
class TaskPriorityConverter : AttributeConverter<com.cactify.domain.TaskPriority, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.TaskPriority?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.TaskPriority? =
    dbData?.let { com.cactify.domain.TaskPriority(it) }
}

@Converter(autoApply = true)
class TaskStatusConverter : AttributeConverter<com.cactify.domain.TaskStatus, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.TaskStatus?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.TaskStatus? =
    dbData?.let { com.cactify.domain.TaskStatus(it) }
}

@Converter(autoApply = true)
class TaskOriginConverter : AttributeConverter<com.cactify.domain.TaskOrigin, String> {
  override fun convertToDatabaseColumn(attribute: com.cactify.domain.TaskOrigin?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): com.cactify.domain.TaskOrigin? =
    dbData?.let { com.cactify.domain.TaskOrigin(it) }
}
