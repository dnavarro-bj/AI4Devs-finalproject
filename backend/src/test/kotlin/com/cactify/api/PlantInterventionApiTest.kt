package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Registrar intervenciones» y «Corregir y retirar una intervención». */
class PlantInterventionApiTest : AbstractTimelineApiTest() {

  @Test
  fun `a transplant keeps its pot`() {
    val plant = createPlant()

    addIntervention(plant, "trasplante", "potSize" to "12 cm", "notes" to "Maceta nueva")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.type").value("intervencion"))
      .andExpect(jsonPath("$.intervention.type").value("trasplante"))
      .andExpect(jsonPath("$.intervention.potSize").value("12 cm"))
      .andExpect(jsonPath("$.intervention.notes").value("Maceta nueva"))
  }

  @Test
  fun `a substrate change shows its mix with id and name`() {
    val plant = createPlant()

    addIntervention(plant, "sustrato", "soilMixId" to "100001")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.intervention.soilMix.id").value("100001"))
      .andExpect(jsonPath("$.intervention.soilMix.name").isNotEmpty)
  }

  @Test
  fun `a fertilisation keeps its product and touches no reading`() {
    val plant = createPlant()

    addIntervention(plant, "fertilizacion", "product" to "NPK 10-10-10").andExpect(status().isCreated)
      .andExpect(jsonPath("$.intervention.product").value("NPK 10-10-10"))

    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/plants/$plant/care-records"))
      .andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `pruning, review and treatment are accepted`() {
    val plant = createPlant()

    addIntervention(plant, "poda").andExpect(status().isCreated)
    addIntervention(plant, "revision").andExpect(status().isCreated)
    addIntervention(plant, "tratamiento", "product" to "Jabón potásico").andExpect(status().isCreated)
  }

  @Test
  fun `data that does not belong to the type answers 400 naming it`() {
    val plant = createPlant()

    addIntervention(plant, "poda", "potSize" to "12 cm")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("potSize")))
    addIntervention(plant, "trasplante", "product" to "NPK").andExpect(status().isBadRequest)
    timeline(plant).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a missing mix answers 400 and saves nothing`() {
    val plant = createPlant()

    addIntervention(plant, "sustrato", "soilMixId" to "1").andExpect(status().isBadRequest)

    timeline(plant).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `an unknown type answers 400 listing the valid ones`() {
    val plant = createPlant()

    addIntervention(plant, "riego")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("poda")))
  }

  @Test
  fun `a future date answers 400`() {
    val plant = createPlant()

    addIntervention(plant, "poda", "occurredAt" to daysAgo(-3).toString()).andExpect(status().isBadRequest)
  }

  @Test
  fun `correcting replaces everything, type included`() {
    val plant = createPlant()
    val id = idOf(addIntervention(plant, "tratamiento", "product" to "Jabón"))

    send("PUT", "/plants/$plant/interventions/$id", json("type" to "trasplante", "potSize" to "14 cm"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.intervention.type").value("trasplante"))
      .andExpect(jsonPath("$.intervention.potSize").value("14 cm"))
      .andExpect(jsonPath("$.intervention.product").doesNotExist())
  }

  @Test
  fun `an invalid correction changes nothing`() {
    val plant = createPlant()
    val id = idOf(addIntervention(plant, "tratamiento", "product" to "Jabón"))

    send("PUT", "/plants/$plant/interventions/$id", json("type" to "poda", "potSize" to "14 cm"))
      .andExpect(status().isBadRequest)

    timeline(plant)
      .andExpect(jsonPath("$.content[0].intervention.type").value("tratamiento"))
      .andExpect(jsonPath("$.content[0].intervention.product").value("Jabón"))
  }

  @Test
  fun `removing answers 204 and it disappears`() {
    val plant = createPlant()
    val id = idOf(addIntervention(plant, "poda"))

    send("DELETE", "/plants/$plant/interventions/$id").andExpect(status().isNoContent)

    timeline(plant).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `an intervention of another plant answers 404`() {
    val owner = createPlant()
    val other = createPlant()
    val id = idOf(addIntervention(owner, "poda"))

    send("PUT", "/plants/$other/interventions/$id", json("type" to "revision")).andExpect(status().isNotFound)
    send("DELETE", "/plants/$other/interventions/$id").andExpect(status().isNotFound)
    send("DELETE", "/plants/$owner/interventions/1").andExpect(status().isNotFound)
  }
}
