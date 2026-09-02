package com.cactify.domain

import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity
@Table(name = "tag")
class Tag(
  @EmbeddedId
  override val id: TagId = TagId.create(),
  name: String,
) : AbstractEntity<TagId>() {

  var name: String = name
    private set

  init {
    require(name.isNotBlank()) { "El nombre del tag es obligatorio" }
  }
}
