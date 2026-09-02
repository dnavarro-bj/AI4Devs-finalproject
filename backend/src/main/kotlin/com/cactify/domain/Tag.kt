package com.cactify.domain

import jakarta.persistence.Entity
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Table

@Entity
@Table(name = "tag")
class Tag(
  @EmbeddedId
  override val id: TagId = TagId.create(),
  var name: String,
) : AbstractEntity<TagId>()
