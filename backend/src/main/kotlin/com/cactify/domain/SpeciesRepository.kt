package com.cactify.domain

import org.springframework.data.jpa.repository.JpaRepository

interface SpeciesRepository : JpaRepository<Species, Long> {
  fun findByScientificName(scientificName: String): Species?
}
