package com.cactify.application.ports

import java.io.InputStream
import java.time.Instant

/** Un archivo abierto del almacén: su contenido y su tamaño. Quien lo recibe cierra el flujo. */
class StoredObject(val content: InputStream, val size: Long)

/** Una carpeta del almacén y cuándo se tocó por última vez. */
data class StoredFolder(val key: String, val modifiedAt: Instant)

/**
 * Dónde viven los binarios de las fotografías (ADR-018, decisión 1; ADR-012). Un puerto de
 * `application` cuyo adaptador vive en `infrastructure`: pasar a un servicio de objetos es escribir
 * otro adaptador. Las **claves** las fabrica el sistema a partir de identificadores (`media/<id>/thumb`);
 * ningún nombre que venga del usuario llega nunca aquí, y el adaptador rechaza cualquier clave que
 * salga de su raíz.
 */
interface MediaStorage {
  /** Escribe de forma atómica: o queda el archivo entero o no queda nada. Sobrescribe. */
  fun save(key: String, content: ByteArray)

  fun open(key: String): StoredObject?

  fun exists(key: String): Boolean

  /** Retira un archivo y, si su carpeta queda vacía, la carpeta. Responde si existía. */
  fun delete(key: String): Boolean

  /** Retira una carpeta entera. No hace nada si no existe. */
  fun deleteFolder(key: String)

  /** Las carpetas directas de [parentKey]. */
  fun listFolders(parentKey: String): List<StoredFolder>
}
