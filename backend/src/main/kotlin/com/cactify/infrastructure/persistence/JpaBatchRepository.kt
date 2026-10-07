package com.cactify.infrastructure.persistence

import com.cactify.domain.Batch
import com.cactify.domain.BatchId
import com.cactify.domain.repos.BatchRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface JpaBatchRepository : BatchRepository, JpaRepository<Batch, BatchId>
