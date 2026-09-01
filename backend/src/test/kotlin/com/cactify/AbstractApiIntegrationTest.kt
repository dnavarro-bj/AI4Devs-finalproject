package com.cactify

import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.web.servlet.MockMvc

/**
 * Base de los tests de API: ciclo HTTP completo con MockMvc sobre el PostgreSQL real de
 * [AbstractIntegrationTest] (ADR-004). Cada test corre en su propia transacción y revierte,
 * así que puede vaciar los catálogos semilla sin afectar a los demás.
 */
@AutoConfigureMockMvc
abstract class AbstractApiIntegrationTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var mockMvc: MockMvc

  @Autowired
  lateinit var objectMapper: ObjectMapper

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  @PersistenceContext
  lateinit var entityManager: EntityManager

  /**
   * Baja a la base de datos lo que la sesión tenga pendiente. Necesario antes de leer con
   * `jdbcTemplate`: los servicios de lectura son `readOnly`, así que Hibernate no auto-vacía.
   */
  protected fun flushPersistenceContext() = entityManager.flush()

  /** Deja el inventario vacío (plantas y sus tags), conservando los catálogos. */
  protected fun clearPlants() {
    jdbcTemplate.update("DELETE FROM ai_recommendation")
    jdbcTemplate.update("DELETE FROM care_record")
    jdbcTemplate.update("DELETE FROM plant_tag")
    jdbcTemplate.update("DELETE FROM plant")
  }

  /** Deja el catálogo de localizaciones vacío; exige que no queden plantas. */
  protected fun clearLocations() {
    clearPlants()
    jdbcTemplate.update("DELETE FROM location")
  }

  /** Deja el catálogo de tags vacío. */
  protected fun clearTags() {
    jdbcTemplate.update("DELETE FROM plant_tag")
    jdbcTemplate.update("DELETE FROM tag")
  }

  protected fun json(vararg pairs: Pair<String, Any?>): String =
    objectMapper.writeValueAsString(mapOf(*pairs))
}
