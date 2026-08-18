package com.cactify.domain

import io.hypersistence.tsid.TSID
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.OffsetDateTime

@Entity
@Table(name = "plant")
class Plant(
  @Id
  val id: Long = TSID.Factory.getTsid().toLong(),
  var nickname: String,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "location_id", nullable = false)
  var location: Location,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "species_id", nullable = false)
  var species: Species,

  @Column(name = "created_at", insertable = false, updatable = false)
  var createdAt: OffsetDateTime? = null,
)
