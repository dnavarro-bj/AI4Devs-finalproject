package com.cactify

import com.cactify.application.ports.MediaStorage
import com.cactify.application.ports.StoredFolder
import com.cactify.application.ports.StoredObject
import com.cactify.infrastructure.storage.DiskMediaStorage
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.beans.factory.annotation.Value
import java.io.IOException
import java.nio.file.Path

/**
 * El almacén de disco con **fallos a voluntad**, para probar que una subida o un borrado a medias no
 * dejan nada inconsistente. Escribe en la misma raíz que el almacén real de los tests.
 */
class ControllableMediaStorage(root: Path) : MediaStorage {

  private val disk = DiskMediaStorage(root)

  /** Falla en la escritura número N (1 = la primera) desde que se arma; `null` = nunca. */
  var failOnSaveNumber: Int? = null
  var failOnDelete: Boolean = false
  private var saves = 0

  fun reset() {
    failOnSaveNumber = null
    failOnDelete = false
    saves = 0
  }

  override fun save(key: String, content: ByteArray) {
    saves++
    if (failOnSaveNumber == saves) throw IOException("fallo simulado al escribir $key")
    disk.save(key, content)
  }

  override fun open(key: String): StoredObject? = disk.open(key)
  override fun exists(key: String): Boolean = disk.exists(key)

  override fun delete(key: String): Boolean {
    if (failOnDelete) throw IOException("fallo simulado al borrar $key")
    return disk.delete(key)
  }

  override fun deleteFolder(key: String) {
    if (failOnDelete) throw IOException("fallo simulado al borrar $key")
    disk.deleteFolder(key)
  }

  override fun listFolders(parentKey: String): List<StoredFolder> = disk.listFolders(parentKey)
}

/** `@Import` en los tests que necesiten fallos del almacén: sustituye el puerto por [ControllableMediaStorage]. */
@TestConfiguration
class ControllableMediaStorageConfiguration {

  @Bean
  @Primary
  fun controllableMediaStorage(@Value("\${cactify.media.root}") root: String) = ControllableMediaStorage(Path.of(root))
}
