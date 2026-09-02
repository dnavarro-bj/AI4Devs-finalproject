package com.cactify.infrastructure.persistence

import com.cactify.domain.CareRecord
import com.cactify.domain.CareRecordId
import com.cactify.domain.repos.CareRecordRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface JpaCareRecordRepository :
  CareRecordRepository,
  JpaRepository<CareRecord, CareRecordId>
