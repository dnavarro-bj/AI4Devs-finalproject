package com.cactify.alerts

import com.cactify.AbstractApiIntegrationTest
import com.cactify.MutableClock
import com.cactify.MutableClockConfiguration
import com.cactify.application.CareRecordService
import com.cactify.application.dto.CareRecordResponse
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders
import java.math.BigDecimal
import java.time.Duration
import java.time.Instant

/**
 * Ayudas de los tests de alertas. Se usa el reloj mutable: la detección fija sus fechas con el único
 * `Clock` y los procesos de tiempo se prueban moviéndolo. Las plantas se insertan **por SQL** para
 * poder fijar su alta; el servicio las carga después, ya con sus datos.
 */
@Import(MutableClockConfiguration::class)
abstract class AbstractAlertTest : AbstractApiIntegrationTest() {

  @Autowired
  lateinit var clock: MutableClock

  @Autowired
  lateinit var careRecordService: CareRecordService

  private var sequence = 990_000L

  private lateinit var startedAt: Instant

  /** El reloj es **compartido** por todos los tests del mismo contexto: se devuelve a su sitio al terminar. */
  @BeforeEach
  fun rememberClock() {
    startedAt = clock.instant()
  }

  @AfterEach
  fun restoreClock() {
    clock.advanceBy(Duration.between(clock.instant(), startedAt))
  }

  /** Una planta de la especie 200001 (humedad 10–30, temperatura 10–35, luz 6–10) en la localización 300001. */
  protected fun newPlant(
    status: String = "activa",
    createdAt: Instant? = null,
    speciesId: Long = 200001,
    locationId: Long = 300001,
  ): String {
    val id = ++sequence
    jdbcTemplate.update(
      """
      INSERT INTO plant (id, code, nickname, species_id, location_id, status, created_at, updated_at)
      VALUES (?, ?, 'Planta', ?, ?, ?, COALESCE(?, now()), COALESCE(?, now()))
      """.trimIndent(),
      id, "TEST-AL-$id", speciesId, locationId, status,
      createdAt?.let { java.sql.Timestamp.from(it) }, createdAt?.let { java.sql.Timestamp.from(it) },
    )
    return id.toString()
  }

  protected fun reading(
    plant: String,
    humidity: Int? = null,
    temperature: Int? = null,
    light: Int? = null,
    water: Int? = null,
    ph: BigDecimal? = null,
    at: Instant? = null,
  ): CareRecordResponse = careRecordService.create(
    plant, CareRecordService.NewCareRecord(humidity, temperature, light, water, ph, at),
  )

  /** Las alertas de una planta, con lo que los tests afirman, **más antigua primero**. */
  protected fun alertsOf(plant: String): List<Map<String, Any?>> {
    flushPersistenceContext()
    return jdbcTemplate.queryForList(
      """
      SELECT id, source, category, severity, status, reason, recommended_action, occurrences, care_record_id,
             detected_at, last_detected_at, closed_at, closure_comment
        FROM alert WHERE plant_id = ? ORDER BY detected_at, id
      """.trimIndent(),
      plant.toLong(),
    )
  }

  protected fun alertsOfLocation(location: Long): List<Map<String, Any?>> {
    flushPersistenceContext()
    return jdbcTemplate.queryForList("SELECT * FROM alert WHERE location_id = ? ORDER BY detected_at, id", location)
  }

  protected fun transitionsOf(alertId: Any?): List<Map<String, Any?>> {
    flushPersistenceContext()
    return jdbcTemplate.queryForList(
      "SELECT from_status, to_status, comment, occurred_at FROM alert_transition WHERE alert_id = ? ORDER BY occurred_at, id",
      alertId,
    )
  }

  protected fun instant(value: Any?): Instant = (value as java.sql.Timestamp).toInstant()

  // ---- HTTP ----

  protected fun send(method: String, path: String, body: String? = null): ResultActions {
    val builder = when (method) {
      "POST" -> MockMvcRequestBuilders.post(path)
      "PUT" -> MockMvcRequestBuilders.put(path)
      "DELETE" -> MockMvcRequestBuilders.delete(path)
      else -> MockMvcRequestBuilders.get(path)
    }
    if (body != null) builder.contentType(MediaType.APPLICATION_JSON).content(body)
    return mockMvc.perform(builder)
  }

  protected fun idOf(result: ResultActions): String =
    objectMapper.readTree(result.andReturn().response.contentAsString).get("id").asText()

  protected fun alertsPage(vararg params: Pair<String, String>): ResultActions =
    mockMvc.perform(MockMvcRequestBuilders.get("/alerts").apply { params.forEach { (k, v) -> param(k, v) } })

  /** Anota una alerta a mano: sobre una planta o sobre una localización. */
  protected fun manualAlert(
    plant: String? = null,
    location: Long? = null,
    category: String = "otra",
    severity: String = "media",
    reason: String = "Incidencia anotada",
  ): ResultActions = send(
    "POST", "/alerts",
    json("plantId" to plant, "locationId" to location?.toString(), "category" to category, "severity" to severity, "reason" to reason),
  )

  /** Una sublocalización de verdad, con su código, colgando de otra. */
  protected fun newLocation(parent: Long? = null, name: String = "Loc"): Long {
    val id = ++locationSequence
    jdbcTemplate.update(
      "INSERT INTO location (id, name, code, parent_id) VALUES (?, ?, ?, ?)",
      id, "$name $id", "LOC-TST-$id", parent,
    )
    return id
  }

  private var locationSequence = 991_500L
}
