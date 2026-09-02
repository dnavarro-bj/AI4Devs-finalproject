package com.cactify.infrastructure.persistence.converters

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
