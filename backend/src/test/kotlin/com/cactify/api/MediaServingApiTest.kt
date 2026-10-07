package com.cactify.api

import com.cactify.TestImages
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.io.ByteArrayInputStream
import javax.imageio.ImageIO
import kotlin.test.assertEquals

/** Escenarios de «Servir las imágenes». */
class MediaServingApiTest : AbstractMediaApiTest() {

  @Test
  fun `a thumbnail is served with its type nosniff and an immutable cache`() {
    val id = idsOf(uploadToSpecies(speciesId, listOf(TestImages.jpeg(640, 480))).andExpect(status().isCreated)).single()

    val bytes = mockMvc.perform(get("/media/$id/thumb"))
      .andExpect(status().isOk)
      .andExpect(content().contentType("image/jpeg"))
      .andExpect(header().string("X-Content-Type-Options", "nosniff"))
      .andExpect(header().string(HttpHeaders.CACHE_CONTROL, org.hamcrest.Matchers.allOf(
        org.hamcrest.Matchers.containsString("max-age=31536000"),
        org.hamcrest.Matchers.containsString("immutable"),
        org.hamcrest.Matchers.containsString("public"),
      )))
      .andExpect(header().exists(HttpHeaders.ETAG))
      .andReturn().response.contentAsByteArray

    val image = ImageIO.read(ByteArrayInputStream(bytes))
    assertEquals(320 to 240, image.width to image.height)
  }

  @Test
  fun `the three variants have their own size`() {
    val id = idsOf(uploadToSpecies(speciesId, listOf(TestImages.jpeg(1500, 1000))).andExpect(status().isCreated)).single()

    val widths = listOf("thumb", "medium", "full").map { variant ->
      val bytes = mockMvc.perform(get("/media/$id/$variant")).andExpect(status().isOk).andReturn().response.contentAsByteArray
      ImageIO.read(ByteArrayInputStream(bytes)).width
    }

    assertEquals(listOf(320, 1280, 1500), widths)
  }

  @Test
  fun `a conditional request with the etag answers 304 without body`() {
    val id = speciesPhotos(1).single()
    val etag = mockMvc.perform(get("/media/$id/medium")).andReturn().response.getHeader(HttpHeaders.ETAG)!!

    mockMvc.perform(get("/media/$id/medium").header(HttpHeaders.IF_NONE_MATCH, etag))
      .andExpect(status().isNotModified)
      .andExpect(content().bytes(ByteArray(0)))
  }

  @Test
  fun `the etag differs per variant`() {
    val id = speciesPhotos(1).single()

    val thumb = mockMvc.perform(get("/media/$id/thumb")).andReturn().response.getHeader(HttpHeaders.ETAG)
    val full = mockMvc.perform(get("/media/$id/full")).andReturn().response.getHeader(HttpHeaders.ETAG)

    assertEquals(false, thumb == full)
  }

  @Test
  fun `an unknown image and an unknown variant answer 404`() {
    val id = speciesPhotos(1).single()

    mockMvc.perform(get("/media/999999999/thumb")).andExpect(status().isNotFound)
    mockMvc.perform(get("/media/$id/enorme")).andExpect(status().isNotFound)
    mockMvc.perform(get("/media/no-es-un-id/thumb")).andExpect(status().isNotFound)
  }

  @Test
  fun `the content type comes from what is stored and not from the client`() {
    val png = com.cactify.TestImages.png(100, 80, alpha = true)
    val id = idsOf(
      uploadRaw("/species/$speciesId/photos", listOf(png), listOf("image/jpeg"), listOf("falsa.jpg")).andExpect(status().isCreated),
    ).single()

    mockMvc.perform(get("/media/$id/full")).andExpect(status().isOk).andExpect(content().contentType("image/png"))
  }
}
