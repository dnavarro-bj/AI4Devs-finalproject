package com.cactify.api

import com.cactify.TestImages
import com.cactify.application.ports.MediaStorage
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Escenarios de «Subida de fotografías» y «Almacenamiento detrás de un puerto» desde el borde HTTP. */
class MediaUploadApiTest : AbstractMediaApiTest() {

  @Autowired
  lateinit var storage: MediaStorage

  private val path get() = "/species/$speciesId/photos"

  private fun folders() = storage.listFolders("media").map { it.key }.toSet()

  @Test
  fun `a file over 10 MB answers 413 with the uniform error and stores nothing`() {
    val before = folders()

    uploadToSpecies(speciesId, listOf(ByteArray(10 * 1024 * 1024 + 1)))
      .andExpect(status().isPayloadTooLarge)
      .andExpect(jsonPath("$.status").value(413))
      .andExpect(jsonPath("$.error").value("Payload Too Large"))
      .andExpect(jsonPath("$.path").value(path))
      .andExpect(jsonPath("$.message").isString)

    assertEquals(before, folders())
  }

  @Test
  fun `eleven files answer 400 and store nothing`() {
    val before = folders()

    uploadToSpecies(speciesId, List(11) { smallJpeg(50, 50) }).andExpect(status().isBadRequest)

    assertEquals(before, folders())
    send("GET", path).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `ten files are accepted`() {
    uploadToSpecies(speciesId, List(10) { smallJpeg(50, 50) }).andExpect(status().isCreated).andExpect(jsonPath("$.length()").value(10))
  }

  @Test
  fun `a request without files answers 400`() {
    mockMvc.perform(multipart(path)).andExpect(status().isBadRequest)
    mockMvc.perform(multipart(path).param("altText", "sin archivo")).andExpect(status().isBadRequest)
  }

  @Test
  fun `one invalid file among valid ones leaves nothing behind`() {
    val before = folders()

    uploadToSpecies(speciesId, listOf(smallJpeg(), smallJpeg(), smallJpeg(), TestImages.corruptJpeg()))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("archivo 4")))

    assertEquals(before, folders())
    send("GET", path).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `the content decides and not the name or the declared type`() {
    val before = folders()

    uploadRaw(path, listOf(TestImages.text()), listOf("image/jpeg"), listOf("foto.jpg"))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("no es una imagen admitida")))
    assertEquals(before, folders())

    // Una imagen real con nombre y tipo de otra cosa se acepta por su contenido.
    uploadRaw(path, listOf(smallJpeg()), listOf("application/octet-stream"), listOf("datos.bin")).andExpect(status().isCreated)
  }

  @Test
  fun `a gif and a heic answer 400 naming the admitted formats`() {
    listOf(TestImages.gif() to "image/gif", TestImages.heic() to "image/heic").forEach { (bytes, type) ->
      uploadRaw(path, listOf(bytes), listOf(type), listOf("foto.x"))
        .andExpect(status().isBadRequest)
        .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("JPEG, PNG o WebP")))
    }
  }

  @Test
  fun `a malicious file name is never used nor exposed`() {
    val name = "../../etc/passwd.jpg"

    val result = uploadRaw(path, listOf(smallJpeg()), listOf("image/jpeg"), listOf(name)).andExpect(status().isCreated)

    val response = result.andReturn().response.contentAsString
    assertTrue(!response.contains("passwd") && !response.contains(".."), response)
    val id = idsOf(result).single()
    assertTrue(folders().contains("media/$id"))
    assertTrue(folders().none { it.contains("passwd") || it.contains("..") })
  }

  @Test
  fun `an explicit capture date and alt text apply to the whole upload`() {
    uploadToSpecies(speciesId, listOf(smallJpeg(), smallJpeg(100, 80)), "altText" to "Mamilaria", "capturedAt" to "2026-05-01T08:00:00Z")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$[0].altText").value("Mamilaria"))
      .andExpect(jsonPath("$[1].altText").value("Mamilaria"))
      .andExpect(jsonPath("$[0].capturedAt").value("2026-05-01T08:00:00Z"))
      .andExpect(jsonPath("$[1].capturedAt").value("2026-05-01T08:00:00Z"))
  }

  @Test
  fun `the capture date comes from the exif and the explicit one wins`() {
    val exif = TestImages.jpeg(200, 100, takenAt = "2020:01:02 03:04:05", gps = true)

    uploadToSpecies(speciesId, listOf(exif)).andExpect(jsonPath("$[0].capturedAt").value("2020-01-02T03:04:05Z"))
    uploadToSpecies(speciesId, listOf(exif), "capturedAt" to "2026-05-01T08:00:00Z")
      .andExpect(jsonPath("$[0].capturedAt").value("2026-05-01T08:00:00Z"))
    uploadToSpecies(speciesId, listOf(exif), "capturedAt" to "ayer").andExpect(status().isBadRequest)
    uploadToSpecies(speciesId, listOf(exif), "capturedAt" to "2999-01-01T00:00:00Z").andExpect(status().isBadRequest)
  }

  @Test
  fun `a blank alt text counts as absent and the default applies`() {
    uploadToSpecies(speciesId, listOf(smallJpeg()), "altText" to "   ")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$[0].altText").value(org.hamcrest.Matchers.containsString("Echinocactus")))
  }
}
