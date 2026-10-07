package com.cactify.domain

/** Una galería ya tiene el máximo de fotografías de su dueño: 409. Depende del estado, no del formato. */
class GalleryFullException(val limit: Int) :
  RuntimeException("La galería ya tiene el máximo de $limit fotografías")

/** Lo que una galería necesita saber de cada fotografía: su orden y si es la portada. */
interface GalleryEntry {
  val mediaId: MediaAssetId
  val position: Int
  val isPrimary: Boolean
  fun placeAt(position: Int)
  fun markPrimary()
  fun unmarkPrimary()
}

/**
 * Las reglas de **conjunto** de las fotografías de un dueño, que no caben en un `CHECK`: la primera
 * nace principal, hay **una** principal mientras haya fotos, borrar la principal promueve a la
 * siguiente por orden y reordenar exige el conjunto exacto. La base solo defiende «una sola
 * principal» (índice único parcial); que haya una cuando hay fotos lo mantiene esta clase.
 *
 * Cambiar de principal pasa por dos escrituras que el índice único obliga a hacer **en orden**
 * —desmarcar, vaciar a la base, marcar—: por eso las operaciones reciben un gancho que el servicio
 * usa para volcar a la base entre ambos pasos.
 */
class MediaGallery<E : GalleryEntry>(
  entries: Collection<E>,
  private val limit: Int = DEFAULT_LIMIT,
) {
  private val ordered: MutableList<E> = entries.sortedBy { it.position }.toMutableList()

  /** Las fotografías en su orden manual. */
  val entries: List<E> get() = ordered.toList()

  /** Falla si añadir [count] fotografías superaría el máximo: se comprueba **antes** de escribir nada. */
  fun requireRoomFor(count: Int) = requireRoom(ordered.size, count, limit)

  /** Añade al final. La primera de la galería nace principal. */
  fun add(entry: E) {
    requireRoomFor(1)
    entry.placeAt((ordered.maxOfOrNull { it.position } ?: -1) + 1)
    if (ordered.none { it.isPrimary }) entry.markPrimary()
    ordered.add(entry)
  }

  /**
   * Elige la portada. `false` se rechaza: una galería con fotografías siempre tiene portada, así que
   * no se «quita», se elige otra. [beforeMark] se invoca tras desmarcar la anterior y antes de marcar
   * la nueva.
   */
  fun setPrimary(id: MediaAssetId, value: Boolean, beforeMark: () -> Unit = {}) {
    require(value) { "Una galería con fotografías siempre tiene portada: elige otra como principal" }
    val entry = find(id)
    if (entry.isPrimary) return
    ordered.filter { it.isPrimary }.forEach { it.unmarkPrimary() }
    beforeMark()
    entry.markPrimary()
  }

  /**
   * Retira una fotografía. Si era la principal, pasa a serlo **la que le seguía en el orden** (o la
   * primera, si era la última). [afterRemoval] se invoca antes de marcar a la sucesora, para que el
   * servicio vuelque el borrado a la base primero.
   */
  fun remove(id: MediaAssetId, afterRemoval: () -> Unit = {}): E {
    val entry = find(id)
    val wasPrimary = entry.isPrimary
    val index = ordered.indexOf(entry)
    ordered.remove(entry)
    afterRemoval()
    if (wasPrimary && ordered.isNotEmpty()) {
      ordered.getOrElse(index) { ordered.first() }.markPrimary()
    }
    return entry
  }

  /** Reordena con **todos** los identificadores, sin falta ni sobra ni repetición. Nada cambia si no encaja. */
  fun reorder(ids: List<MediaAssetId>) {
    require(ids.size == ids.toSet().size) { "El orden repite alguna fotografía" }
    require(ids.toSet() == ordered.map { it.mediaId }.toSet()) {
      "El orden debe incluir exactamente las ${ordered.size} fotografías de la galería"
    }
    val byId = ordered.associateBy { it.mediaId }
    ordered.clear()
    ids.forEachIndexed { index, id ->
      byId.getValue(id).also {
        it.placeAt(index)
        ordered.add(it)
      }
    }
  }

  private fun find(id: MediaAssetId): E =
    ordered.firstOrNull { it.mediaId == id } ?: throw NoSuchElementException("La fotografía '$id' no está en la galería")

  companion object {
    const val DEFAULT_LIMIT = 50

    /** La misma comprobación sin cargar la galería: [current] fotografías más [adding] no pasan de [limit]. */
    fun requireRoom(current: Int, adding: Int, limit: Int) {
      if (current + adding > limit) throw GalleryFullException(limit)
    }
  }
}
