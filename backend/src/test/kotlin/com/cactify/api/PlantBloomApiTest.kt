package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Floraciones observadas» y «Retirar una floración y reglas de pertenencia». */
class PlantBloomApiTest : AbstractTimelineApiTest() {

  @Test
  fun `an open bloom is accepted and sits at its start date`() {
    val plant = createPlant()
    val start = dateDaysAgo(10)

    addBloom(plant, "en_flor", start, "flowerCount" to 4)
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.type").value("floracion"))
      .andExpect(jsonPath("$.bloom.status").value("en_flor"))
      .andExpect(jsonPath("$.bloom.startedOn").value(start.toString()))
      .andExpect(jsonPath("$.bloom.endedOn").doesNotExist())
      .andExpect(jsonPath("$.bloom.flowerCount").value(4))
      .andExpect(jsonPath("$.occurredAt").value("${start}T00:00:00Z"))
  }

  @Test
  fun `a finished bloom carries its interval`() {
    val plant = createPlant()

    addBloom(plant, "finalizada", dateDaysAgo(20), "endedOn" to dateDaysAgo(12).toString())
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.bloom.endedOn").value(dateDaysAgo(12).toString()))
  }

  @Test
  fun `a finished bloom without an end answers 400`() {
    addBloom(createPlant(), "finalizada").andExpect(status().isBadRequest)
  }

  @Test
  fun `an end while still open answers 400`() {
    addBloom(createPlant(), "en_flor", dateDaysAgo(5), "endedOn" to dateDaysAgo(2).toString()).andExpect(status().isBadRequest)
  }

  @Test
  fun `an end before the start answers 400`() {
    addBloom(createPlant(), "finalizada", dateDaysAgo(5), "endedOn" to dateDaysAgo(9).toString()).andExpect(status().isBadRequest)
  }

  @Test
  fun `a negative flower count answers 400`() {
    addBloom(createPlant(), "en_flor", dateDaysAgo(5), "flowerCount" to -1).andExpect(status().isBadRequest)
  }

  @Test
  fun `a missing start or status answers 400`() {
    val plant = createPlant()

    send("POST", "/plants/$plant/blooms", json("status" to "en_flor")).andExpect(status().isBadRequest)
    send("POST", "/plants/$plant/blooms", json("startedOn" to dateDaysAgo(1).toString())).andExpect(status().isBadRequest)
  }

  @Test
  fun `closing an open bloom by correcting it`() {
    val plant = createPlant()
    val id = idOf(addBloom(plant, "en_flor", dateDaysAgo(10)))

    send(
      "PUT", "/plants/$plant/blooms/$id",
      json("startedOn" to dateDaysAgo(10).toString(), "status" to "finalizada", "endedOn" to dateDaysAgo(3).toString()),
    )
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.bloom.status").value("finalizada"))
      .andExpect(jsonPath("$.bloom.endedOn").value(dateDaysAgo(3).toString()))
  }

  @Test
  fun `a bloom does not change the species expected flowering`() {
    val plant = createPlant()
    val before = send("GET", "/species/200001").andReturn().response.contentAsString

    addBloom(plant).andExpect(status().isCreated)

    org.junit.jupiter.api.Assertions.assertEquals(before, send("GET", "/species/200001").andReturn().response.contentAsString)
  }

  @Test
  fun `removing a bloom answers 204 and it leaves the timeline`() {
    val plant = createPlant()
    val id = idOf(addBloom(plant))

    send("DELETE", "/plants/$plant/blooms/$id").andExpect(status().isNoContent)

    timeline(plant, "type" to "floracion").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a bloom of another plant answers 404`() {
    val owner = createPlant()
    val other = createPlant()
    val id = idOf(addBloom(owner))

    send("PUT", "/plants/$other/blooms/$id", json("startedOn" to dateDaysAgo(2).toString(), "status" to "boton"))
      .andExpect(status().isNotFound)
    send("DELETE", "/plants/$other/blooms/$id").andExpect(status().isNotFound)
    timeline(owner, "type" to "floracion").andExpect(jsonPath("$.totalElements").value(1))
  }
}
