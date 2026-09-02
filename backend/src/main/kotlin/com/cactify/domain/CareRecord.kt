package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit

@Entity
@Table(name = "care_record")
class CareRecord private constructor(
  @EmbeddedId
  override val id: CareRecordId = CareRecordId.create(),
  plant: Plant,
  humidity: Int?,
  temperature: Int?,
  lightHours: Int?,
  waterAmountMl: Int?,
  soilPh: BigDecimal?,
  recordedAt: Instant,
) : AbstractEntity<CareRecordId>() {

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "plant_id", nullable = false)
  var plant: Plant = plant
    private set

  var humidity: Int? = humidity
    private set

  var temperature: Int? = temperature
    private set

  var lightHours: Int? = lightHours
    private set

  @Column(name = "water_amount_ml")
  var waterAmountMl: Int? = waterAmountMl
    private set

  @Column(name = "soil_ph")
  var soilPh: BigDecimal? = soilPh
    private set

  @Column(name = "recorded_at", nullable = false)
  var recordedAt: Instant = recordedAt
    private set

  init {
    // Tolerantes a nulos: cada medida es opcional por separado y una lectura parcial es legítima.
    require(humidity == null || humidity in 0..100) { "La humedad debe estar entre 0 y 100, y es $humidity" }
    require(lightHours == null || lightHours in 0..24) { "Las horas de luz deben estar entre 0 y 24, y son $lightHours" }
    require(temperature == null || temperature in -50..80) { "La temperatura es implausible: $temperature" }
    require(waterAmountMl == null || waterAmountMl >= 0) { "La cantidad de riego no puede ser negativa, y es $waterAmountMl" }
    require(soilPh == null || soilPh in PH_MIN..PH_MAX) { "La acidez está fuera de la escala de pH: $soilPh" }
    // Lo que sí exige la fila: decir algo. Una lectura sin ninguna medida no significa nada.
    require(listOfNotNull(humidity, temperature, lightHours, waterAmountMl, soilPh).isNotEmpty()) {
      "La lectura debe llevar al menos un valor"
    }
  }

  companion object {
    private val PH_MIN: BigDecimal = BigDecimal.ZERO
    private val PH_MAX: BigDecimal = BigDecimal(14)

    /**
     * Única forma de registrar una lectura.
     *
     * Vive aquí y no en el `init` porque juzgar si la fecha es futura necesita saber qué hora es,
     * y eso la entidad no lo sabe: el reloj y el margen entran como parámetros, que son de quien
     * registra y no de la lectura. La fecha la aporta quien la tomó o, si falta, la pone el reloj;
     * en ambos casos se recorta a microsegundos, la precisión que guarda la columna (ADR-010).
     */
    fun record(
      plant: Plant,
      humidity: Int? = null,
      temperature: Int? = null,
      lightHours: Int? = null,
      waterAmountMl: Int? = null,
      soilPh: BigDecimal? = null,
      recordedAt: Instant?,
      clock: Clock,
      maxFutureSkew: Duration,
    ): CareRecord {
      val stamped = (recordedAt ?: clock.instant()).truncatedTo(ChronoUnit.MICROS)
      require(!stamped.isAfter(clock.instant().plus(maxFutureSkew))) {
        "La fecha de la lectura no puede estar en el futuro"
      }
      return CareRecord(
        plant = plant,
        humidity = humidity,
        temperature = temperature,
        lightHours = lightHours,
        waterAmountMl = waterAmountMl,
        soilPh = soilPh,
        recordedAt = stamped,
      )
    }
  }
}
