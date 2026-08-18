package com.cactify

import com.cactify.domain.SpeciesRepository
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class EntityMappingTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var speciesRepository: SpeciesRepository

  @Test
  fun `the seeded species maps correctly through the entity, including its soil mix relation`() {
    val species = speciesRepository.findByScientificName("Echinocactus grusonii")

    assertNotNull(species, "expected the seeded species to be found through the repository")
    assertEquals("Asiento de suegra", species.commonName)
    assertEquals(20, species.soilMix.organicPercentage)
  }
}
