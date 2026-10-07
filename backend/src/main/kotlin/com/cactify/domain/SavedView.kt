package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table

/**
 * Una consulta con nombre sobre un listado: la *query string* canónica de sus filtros y orden y,
 * en el inventario, las columnas visibles. Un grupo de especies es una vista de ámbito `species`.
 *
 * La entidad es dueña de su consistencia (ADR-011): el nombre y las columnas se validan aquí, y
 * [replace] revalida **antes** de tocar nada, de modo que un reemplazo rechazado deja la vista
 * intacta. Que la consulta sea interpretable por el listado de su ámbito es una regla que consulta
 * otro código y vive en `application`.
 */
@Entity
@Table(name = "saved_view")
class SavedView(
  @EmbeddedId
  override val id: SavedViewId = SavedViewId.create(),
  scope: ViewScope,
  name: String,
  query: String,
  columns: List<String>? = null,
) : AbstractEntity<SavedViewId>() {

  @Column(name = "scope", nullable = false)
  var scope: ViewScope = scope
    private set

  @Column(name = "name", nullable = false)
  var name: String = name.trim()
    private set

  @Column(name = "query", nullable = false)
  var query: String = query
    private set

  /** Las columnas viajan en una sola columna de texto separada por comas: `null` = la vista no las guarda. */
  @Column(name = "columns")
  private var storedColumns: String? = columns?.joinToString(",")

  val columns: List<String>?
    get() = storedColumns?.let { if (it.isEmpty()) emptyList() else it.split(",") }

  init {
    validate(scope, this.name, columns)
  }

  /** Único camino para cambiar la vista: reemplazo completo, revalidado antes de tocar nada. */
  fun replace(scope: ViewScope, name: String, query: String, columns: List<String>?) {
    validate(scope, name.trim(), columns)
    this.scope = scope
    this.name = name.trim()
    this.query = query
    this.storedColumns = columns?.joinToString(",")
  }

  companion object {
    const val MAX_NAME_LENGTH = 100

    /** Las claves públicas de las columnas configurables del inventario (la identificativa no lo es). */
    val PLANT_COLUMNS: Set<String> = linkedSetOf("species", "location", "status", "lastWatering", "attention")

    private fun validate(scope: ViewScope, name: String, columns: List<String>?) {
      require(name.isNotBlank()) { "El nombre de la vista es obligatorio" }
      require(name.length <= MAX_NAME_LENGTH) { "El nombre de la vista no puede pasar de $MAX_NAME_LENGTH caracteres" }
      if (columns == null) return
      require(scope == ViewScope.Plants) { "Solo las vistas del inventario guardan columnas" }
      val unknown = columns.filter { it !in PLANT_COLUMNS }
      require(unknown.isEmpty()) {
        "Columnas no admitidas: ${unknown.joinToString()}. Las admitidas son ${PLANT_COLUMNS.joinToString()}"
      }
    }
  }
}
