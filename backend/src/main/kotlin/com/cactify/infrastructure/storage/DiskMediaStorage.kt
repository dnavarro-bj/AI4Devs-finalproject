package com.cactify.infrastructure.storage

import com.cactify.application.ports.MediaStorage
import com.cactify.application.ports.StoredFolder
import com.cactify.application.ports.StoredObject
import java.io.IOException
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import kotlin.io.path.isDirectory

/**
 * El almacén en un directorio local (ADR-018). La escritura es atómica —un temporal en la misma
 * carpeta y un renombrado— y toda clave se resuelve contra la raíz y se rechaza si sale de ella.
 */
class DiskMediaStorage(root: Path) : MediaStorage {

  private val root: Path = root.toAbsolutePath().normalize()

  override fun save(key: String, content: ByteArray) {
    val target = resolve(key)
    Files.createDirectories(target.parent)
    val temp = Files.createTempFile(target.parent, ".upload-", ".tmp")
    try {
      Files.write(temp, content)
      try {
        Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
      } catch (_: AtomicMoveNotSupportedException) {
        Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING)
      }
    } finally {
      Files.deleteIfExists(temp)
    }
  }

  override fun open(key: String): StoredObject? {
    val path = resolve(key)
    if (!Files.isRegularFile(path)) return null
    return try {
      StoredObject(Files.newInputStream(path), Files.size(path))
    } catch (_: java.nio.file.NoSuchFileException) {
      null
    }
  }

  override fun exists(key: String): Boolean = Files.isRegularFile(resolve(key))

  override fun delete(key: String): Boolean {
    val path = resolve(key)
    val existed = Files.deleteIfExists(path)
    val parent = path.parent
    if (parent != root && parent.isDirectory()) {
      try {
        Files.deleteIfExists(parent)
      } catch (_: java.nio.file.DirectoryNotEmptyException) {
        // Aún tiene otras variantes: se retira con la última.
      }
    }
    return existed
  }

  override fun deleteFolder(key: String) {
    val folder = resolve(key)
    if (!folder.isDirectory()) return
    Files.walk(folder).use { stream ->
      stream.sorted(Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
    }
  }

  override fun listFolders(parentKey: String): List<StoredFolder> {
    val parent = resolve(parentKey)
    if (!parent.isDirectory()) return emptyList()
    return Files.list(parent).use { stream ->
      stream.filter { it.isDirectory() }
        .map { StoredFolder("$parentKey/${it.fileName}", Files.getLastModifiedTime(it).toInstant()) }
        .toList()
    }
  }

  /** La ruta de una clave, siempre **dentro** de la raíz. */
  private fun resolve(key: String): Path {
    require(key.isNotBlank()) { "La clave del almacén no puede estar vacía" }
    require(!key.startsWith("/") && !key.contains('\\') && !key.contains('\u0000')) { "La clave '$key' no es válida" }
    val path = root.resolve(key).normalize()
    if (path == root || !path.startsWith(root)) throw IllegalArgumentException("La clave '$key' sale del directorio del almacén")
    return path
  }
}
