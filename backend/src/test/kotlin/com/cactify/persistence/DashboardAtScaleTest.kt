package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.application.ActivityService
import com.cactify.application.LocationService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * La medición de `dashboard-operativo`: con 500 localizaciones, 2.000 ejemplares, 400 tareas pendientes
 * y miles de eventos, ¿hace falta algún índice para `pendingTasks` y para la actividad? Además de
 * **humo de escala**: los números son correctos y la cota —holgada a propósito— no se rebasa; los
 * tiempos reales se anotan en el design.
 */
class DashboardAtScaleTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var locationService: LocationService

  @Autowired
  lateinit var activityService: ActivityService

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  @BeforeEach
  fun seedAtScale() {
    listOf("alert_transition", "alert", "ai_recommendation", "care_record", "plant_tag", "plant_movement", "plant_event", "task_plant", "task", "plant", "batch")
      .forEach { jdbcTemplate.update("DELETE FROM $it") }
    jdbcTemplate.update("UPDATE location SET parent_id = NULL")
    jdbcTemplate.update("DELETE FROM location")
    // 5 raíces, 10 hijas cada una y 9 nietas por hija: 505 localizaciones en tres niveles.
    jdbcTemplate.update("INSERT INTO location (id, name, code) SELECT 7000000 + r, 'Raiz ' || r, 'LOC-R' || r FROM generate_series(1, 5) r")
    jdbcTemplate.update(
      """
      INSERT INTO location (id, name, code, parent_id)
      SELECT 7100000 + r * 100 + c, 'Hija ' || r || '-' || c, 'LOC-C' || r || '-' || c, 7000000 + r
        FROM generate_series(1, 5) r, generate_series(1, 10) c
      """,
    )
    jdbcTemplate.update(
      """
      INSERT INTO location (id, name, code, parent_id)
      SELECT 7200000 + r * 10000 + c * 100 + n, 'Nieta ' || r || '-' || c || '-' || n,
             'LOC-N' || r || '-' || c || '-' || n, 7100000 + r * 100 + c
        FROM generate_series(1, 5) r, generate_series(1, 10) c, generate_series(1, 9) n
      """,
    )
    jdbcTemplate.update(
      """
      INSERT INTO plant (id, nickname, location_id, species_id, code)
      SELECT 8000000 + g, 'Planta ' || g, 7200000 + (1 + g % 5) * 10000 + (1 + g % 10) * 100 + (1 + g % 9), 200001, 'CAT-D' || lpad(g::text, 4, '0')
        FROM generate_series(1, 2000) g
      """,
    )
    // 400 tareas pendientes: la mitad dirigidas a una localización y la mitad a tres plantas expresas.
    jdbcTemplate.update(
      """
      INSERT INTO task (id, task_type, title, priority, status, due_from, due_to, origin, location_id)
      SELECT 9000000 + g, 'riego', 'Tarea ' || g, 'normal', 'pendiente', date '2026-10-10', date '2026-10-12', 'manual', 7100000 + (1 + g % 5) * 100 + (1 + g % 10)
        FROM generate_series(1, 200) g
      """,
    )
    jdbcTemplate.update(
      """
      INSERT INTO task (id, task_type, title, priority, status, due_from, due_to, origin)
      SELECT 9100000 + g, 'otra', 'Tarea de plantas ' || g, 'normal', 'pendiente', date '2026-10-10', date '2026-10-12', 'manual'
        FROM generate_series(1, 200) g
      """,
    )
    jdbcTemplate.update(
      "INSERT INTO task_plant (task_id, plant_id) SELECT 9100000 + g, 8000000 + g * 3 + k FROM generate_series(1, 200) g, generate_series(0, 2) k",
    )
    jdbcTemplate.update(
      "INSERT INTO batch (id, action, scope_kind, plant_count, occurred_at) SELECT 9200000 + g, 'comentario', 'localizacion', 10, now() - (g || ' minutes')::interval FROM generate_series(1, 300) g",
    )
    jdbcTemplate.update(
      "INSERT INTO plant_event (id, plant_id, event_type, occurred_at) SELECT 9300000 + g, 8000000 + g, 'comentario', now() - (g || ' seconds')::interval FROM generate_series(1, 1500) g",
    )
    jdbcTemplate.update("INSERT INTO plant_comment (id, text) SELECT 9300000 + g, 'Nota de actividad ' || g FROM generate_series(1, 1500) g")
  }

  private fun measure(label: String, block: () -> Unit): Long {
    block()
    val times = (1..5).map {
      val start = System.nanoTime()
      block()
      (System.nanoTime() - start) / 1_000_000
    }.sorted()
    println("MEDICION $label: mediana ${times[2]} ms (min ${times.first()}, max ${times.last()})")
    return times[2]
  }

  @Test
  fun `pending tasks over 505 locations are correct and fast`() {
    val page = locationService.list(PageRequest.of(0, 500))

    assertEquals(500, page.content.size)
    val perRoot = locationService.list(PageRequest.of(0, 500), rootsOnly = true).content.associateBy { it.id }
    assertEquals(5, perRoot.size)
    assertTrue(perRoot.values.all { it.pendingTasks > 0 }, "cada raíz recoge el trabajo de lo que contiene")
    assertTrue(measure("pendingTasks sobre 500 localizaciones") { locationService.list(PageRequest.of(0, 500)) } < 1000)
  }

  @Test
  fun `recent activity over thousands of events is correct and fast`() {
    val page = activityService.recent(PageRequest.of(0, 8))

    assertEquals(8, page.content.size)
    assertEquals(1800L, page.totalElements)
    assertTrue(measure("actividad reciente (1800 entradas)") { activityService.recent(PageRequest.of(0, 8)) } < 1000)
    assertTrue(measure("actividad reciente, pagina 100 de 8") { activityService.recent(PageRequest.of(100, 8)) } < 1000)
  }
}
