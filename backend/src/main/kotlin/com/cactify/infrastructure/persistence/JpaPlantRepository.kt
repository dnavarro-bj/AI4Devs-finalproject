package com.cactify.infrastructure.persistence

import com.cactify.domain.Plant
import com.cactify.domain.PlantId
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.PlantTagName
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

/** `JpaSpecificationExecutor` aporta la ejecución de las `Specification` sin escribir nada. */
@Repository
interface JpaPlantRepository :
  PlantRepository,
  JpaRepository<Plant, PlantId>,
  JpaSpecificationExecutor<Plant> {

  /** Las etiquetas de un bloque de plantas de una vez; `Tag` no conoce a sus plantas, así que se pide desde `Plant`. */
  @Query("select new com.cactify.domain.repos.PlantTagName(p.id, t.name) from Plant p join p.tagSet t where p.id in :ids")
  override fun findTagNames(@Param("ids") ids: Collection<PlantId>): List<PlantTagName>

  @Query("select p from Plant p join fetch p.location where p.id in :ids")
  override fun findAllWithLocationByIdIn(@Param("ids") ids: Collection<PlantId>): List<Plant>
}
