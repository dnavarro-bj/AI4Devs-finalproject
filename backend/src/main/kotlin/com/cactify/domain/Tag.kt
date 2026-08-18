package com.cactify.domain

import io.hypersistence.tsid.TSID
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "tag")
class Tag(
  @Id
  val id: Long = TSID.Factory.getTsid().toLong(),
  var name: String,
)
