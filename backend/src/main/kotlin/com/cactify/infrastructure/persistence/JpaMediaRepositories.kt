package com.cactify.infrastructure.persistence

import com.cactify.domain.MediaAsset
import com.cactify.domain.MediaAssetId
import com.cactify.domain.PlantEventId
import com.cactify.domain.PlantMedia
import com.cactify.domain.SpeciesMedia
import com.cactify.domain.repos.MediaAssetRepository
import com.cactify.domain.repos.PlantMediaRepository
import com.cactify.domain.repos.SpeciesMediaRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.stereotype.Repository

@Repository
interface JpaMediaAssetRepository :
  MediaAssetRepository,
  JpaRepository<MediaAsset, MediaAssetId>

@Repository
interface JpaSpeciesMediaRepository :
  SpeciesMediaRepository,
  JpaRepository<SpeciesMedia, MediaAssetId> {

  @EntityGraph(attributePaths = ["asset"])
  override fun findAllBySpeciesIdOrderByPositionAsc(speciesId: com.cactify.domain.SpeciesId): List<SpeciesMedia>

  @EntityGraph(attributePaths = ["asset"])
  override fun findBySpeciesId(speciesId: com.cactify.domain.SpeciesId, pageable: Pageable): Page<SpeciesMedia>
}

@Repository
interface JpaPlantMediaRepository :
  PlantMediaRepository,
  JpaRepository<PlantMedia, MediaAssetId>,
  JpaSpecificationExecutor<PlantMedia> {

  @EntityGraph(attributePaths = ["asset"])
  override fun findAllByPlantIdOrderByPositionAsc(plantId: com.cactify.domain.PlantId): List<PlantMedia>

  @EntityGraph(attributePaths = ["asset"])
  override fun findAllByEventIdIn(ids: Collection<PlantEventId>): List<PlantMedia>
}
