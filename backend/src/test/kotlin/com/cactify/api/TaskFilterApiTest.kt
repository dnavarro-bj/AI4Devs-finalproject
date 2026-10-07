package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import kotlin.test.assertEquals

/** Escenarios de «Listado de tareas con filtros combinables»: tipo, prioridad, texto, intervalo, destino. */
class TaskFilterApiTest : AbstractTaskApiTest() {

  @Test
  fun `by type and by priority, repeatable`() {
    val riego = newTask("type" to "riego")
    val frio = newTask("type" to "proteccion_frio", "title" to "Cubrir")
    val maceta = newTask("type" to "cambio_maceta", "title" to "Macetas", "priority" to "alta")

    assertEquals(setOf(riego, frio), idsOf(tasks("type" to "riego", "type" to "proteccion_frio")).toSet())
    assertEquals(listOf(maceta), idsOf(tasks("priority" to "alta")))
  }

  @Test
  fun `by text, ignoring case and with wildcards as literal text`() {
    val raices = newTask("title" to "Revisar RAÍCES antes del trasplante")
    newTask("title" to "Regar")
    newTask("title" to "100% sol")

    assertEquals(listOf(raices), idsOf(tasks("q" to "raíces")))
    assertEquals(1, readTree(tasks("q" to "%")).get("totalElements").asInt())
    assertEquals(0, readTree(tasks("q" to "_")).get("totalElements").asInt())
  }

  @Test
  fun `the calendar of a month brings the tasks whose period touches it`() {
    val across = newTask("dueFrom" to "2026-09-28", "dueTo" to "2026-10-02", "title" to "Cruza")
    val inside = newTask("dueFrom" to "2026-10-15", "title" to "Dentro")
    newTask("dueFrom" to "2026-11-02", "title" to "Fuera")
    newTask("dueFrom" to "2026-09-10", "title" to "Antes")

    assertEquals(setOf(across, inside), idsOf(tasks("from" to "2026-10-01", "to" to "2026-10-31")).toSet())
  }

  @Test
  fun `an open interval brings everything from or up to a date`() {
    val early = newTask("dueFrom" to "2026-10-01", "title" to "Pronto")
    val late = newTask("dueFrom" to "2026-12-01", "title" to "Tarde")

    assertEquals(listOf(late), idsOf(tasks("from" to "2026-11-01")))
    assertEquals(listOf(early), idsOf(tasks("to" to "2026-10-31")))
  }

  @Test
  fun `a location with its sublocations, for tasks aimed at it and for tasks of plants that are there`() {
    val invernadero = createLocation("Invernadero 2")
    val bandeja = createLocation("Bandeja A3", invernadero)
    val elsewhere = createLocation("Alfeizar")
    val direct = newTask("locationId" to invernadero, "title" to "Directa")
    val inChild = newTask("locationId" to bandeja, "title" to "Hija")
    val byPlants = newTask("locationId" to null, "plantIds" to listOf(createPlantIn(bandeja)), "title" to "Plantas")
    newTask("locationId" to elsewhere, "title" to "Otra")
    newTask("locationId" to null, "plantIds" to listOf(createPlantIn(elsewhere)), "title" to "Otras plantas")

    assertEquals(
      setOf(direct, inChild, byPlants),
      idsOf(tasks("location" to invernadero, "includeDescendants" to "true")).toSet(),
    )
    assertEquals(setOf(direct), idsOf(tasks("location" to invernadero)).toSet())
  }

  @Test
  fun `the tasks that affect a plant, expressly or through its location or an ancestor`() {
    val invernadero = createLocation("Invernadero 2")
    val bandeja = createLocation("Bandeja A3", invernadero)
    val other = createLocation("Invernadero 3")
    val plant = createPlantIn(bandeja)
    val expressly = newTask("locationId" to null, "plantIds" to listOf(plant), "title" to "Ella")
    val byLocation = newTask("locationId" to bandeja, "title" to "Su bandeja")
    val byAncestor = newTask("locationId" to invernadero, "title" to "Su invernadero")
    newTask("locationId" to other, "title" to "Otro invernadero")
    newTask("locationId" to null, "plantIds" to listOf(createPlantIn(other)), "title" to "Otra planta")

    assertEquals(setOf(expressly, byLocation, byAncestor), idsOf(tasks("plant" to plant)).toSet())
  }

  @Test
  fun `by species, for tasks that name plants of it`() {
    val grusonii = newTask("locationId" to null, "plantIds" to listOf(createPlantIn("300001", "200001")), "title" to "Grusonii")
    newTask("locationId" to null, "plantIds" to listOf(createPlantIn("300001", "200002")), "title" to "Mammillaria")

    assertEquals(listOf(grusonii), idsOf(tasks("species" to "200001")))
  }

  @Test
  fun `the filters combine with AND`() {
    val match = newTask("type" to "riego", "priority" to "alta", "title" to "Regar bandejas")
    newTask("type" to "riego", "priority" to "baja", "title" to "Regar bandejas")
    newTask("type" to "poda_raices", "priority" to "alta", "title" to "Regar bandejas")

    assertEquals(
      listOf(match),
      idsOf(tasks("type" to "riego", "priority" to "alta", "q" to "bandejas", "due" to "today", "today" to today)),
    )
  }

  @Test
  fun `a filter with no match is an empty page and not an error`() {
    newTask()

    tasks("species" to "999999999").andExpect(jsonPath("$.totalElements").value(0))
    tasks("location" to "999999999").andExpect(jsonPath("$.totalElements").value(0))
  }
}
