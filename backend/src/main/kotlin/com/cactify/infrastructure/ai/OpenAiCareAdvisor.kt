package com.cactify.infrastructure.ai

import com.cactify.application.AIProviderException
import com.cactify.application.ports.Advice
import com.cactify.application.ports.AdviceRequest
import com.cactify.application.ports.CareAdvisor
import com.cactify.application.ports.Deviation
import com.cactify.domain.Priority
import com.cactify.domain.RiskLevel
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import java.time.Duration

/**
 * Adaptador del proveedor de análisis sobre la API de OpenAI.
 *
 * Usa el `RestClient` que ya viene con `spring-boot-starter-web`: dos llamadas HTTP no justifican
 * una dependencia nueva. Al modelo se le pide salida en JSON para que el parseo no dependa de
 * adivinar formato en prosa.
 *
 * **Captura todo lo que salga mal** —red, tiempo de espera, respuesta ininterpretable— y lo envuelve
 * en [AIProviderException]. Ese envoltorio no es cosmético: `RiskLevel("desconocido")` lanza
 * `IllegalArgumentException`, y ADR-011 la traduce a `400`. Sin envolver, una respuesta rara del
 * modelo se le reprocharía al cliente como si su petición fuera inválida.
 */
@Component
class OpenAiCareAdvisor(
  private val objectMapper: ObjectMapper,
  @Value("\${cactify.ai.api-key}") private val apiKey: String,
  @Value("\${cactify.ai.base-url}") private val baseUrl: String,
  @Value("\${cactify.ai.model}") private val model: String,
  @Value("\${cactify.ai.timeout}") private val timeout: Duration,
) : CareAdvisor {

  private val restClient: RestClient by lazy {
    RestClient.builder()
      .baseUrl(baseUrl)
      .requestFactory(JdkClientHttpRequestFactory().apply { setReadTimeout(timeout) })
      .defaultHeader("Authorization", "Bearer $apiKey")
      .build()
  }

  override fun advise(request: AdviceRequest): Advice {
    if (apiKey.isBlank()) {
      throw AIProviderException("El proveedor de análisis no está configurado")
    }
    val content = try {
      callProvider(request)
    } catch (e: AIProviderException) {
      throw e
    } catch (e: Exception) {
      throw AIProviderException("El proveedor de análisis no respondió", e)
    }
    return parse(content)
  }

  private fun callProvider(request: AdviceRequest): String {
    val body = mapOf(
      "model" to model,
      "response_format" to mapOf("type" to "json_object"),
      "messages" to listOf(
        mapOf("role" to "system", "content" to SYSTEM_PROMPT),
        mapOf("role" to "user", "content" to userPrompt(request)),
      ),
    )
    val response = restClient.post()
      .uri("/chat/completions")
      .body(body)
      .retrieve()
      .body(String::class.java)
      ?: throw AIProviderException("El proveedor de análisis devolvió una respuesta vacía")
    return objectMapper.readTree(response).path("choices").firstOrNull()
      ?.path("message")?.path("content")?.asText()
      ?: throw AIProviderException("El proveedor de análisis devolvió una respuesta sin contenido")
  }

  private fun parse(content: String): Advice = try {
    val json = objectMapper.readTree(content)
    Advice(
      riskLevel = RiskLevel(json.path("riskLevel").asText()),
      explanation = json.path("explanation").asText(),
      recommendedAction = json.path("recommendedAction").asText(),
      priority = Priority(json.path("priority").asText()),
    )
  } catch (e: Exception) {
    // Incluye la IllegalArgumentException de un nivel o una prioridad desconocidos.
    throw AIProviderException("El proveedor de análisis devolvió algo que no se puede interpretar", e)
  }

  /** El prompt completo, con su porqué, está en `docs/prompts-ia.md`. */
  private fun userPrompt(request: AdviceRequest): String = buildString {
    val s = request.species
    appendLine("Especie: ${s.commonName} (${s.scientificName}).")
    appendLine("Rangos recomendados de la especie:")
    appendLine("- Humedad: ${s.humidityRange.first}-${s.humidityRange.last} %")
    appendLine("- Temperatura: ${s.temperatureRange.first}-${s.temperatureRange.last} °C")
    appendLine("- Horas de luz: ${s.lightHoursRange.first}-${s.lightHoursRange.last} h/día")
    appendLine("- Pauta de riego: ${s.wateringGuideline}")
    appendLine()
    val r = request.reading
    appendLine("Lectura tomada el ${r.recordedAt}:")
    appendLine("- Humedad: ${r.humidity ?: "no medida"}")
    appendLine("- Temperatura: ${r.temperature ?: "no medida"}")
    appendLine("- Horas de luz: ${r.lightHours ?: "no medidas"}")
    appendLine("- Riego: ${r.waterAmountMl?.let { "$it ml" } ?: "no anotado"}")
    appendLine("- Acidez del sustrato: ${r.soilPh ?: "no medida"}")
    appendLine()
    appendLine(
      request.lastWatering
        ?.let { "Último riego registrado: ${it.amountMl} ml el ${it.at}." }
        ?: "No consta ningún riego previo de esta planta.",
    )
    appendLine()
    if (request.deviations.isEmpty()) {
      appendLine("No se ha detectado ninguna desviación respecto a los rangos de la especie.")
    } else {
      appendLine("Desviaciones detectadas respecto a los rangos de la especie:")
      request.deviations.forEach { d ->
        val sentido = if (d.direction == Deviation.Direction.BELOW) "por debajo" else "por encima"
        appendLine("- ${d.measurement}: ${d.value}, $sentido del rango ${d.expectedRange}")
      }
    }
  }

  private companion object {
    val SYSTEM_PROMPT = """
      Eres un experto en cultivo de cactus y suculentas. Interpreta la lectura que se te da a la luz
      de los rangos de la especie, que ya vienen calculados: no los inventes ni los cuestiones.
      Responde solo con un objeto JSON con estas claves:
      - riskLevel: uno de "low", "medium", "high"
      - explanation: una explicación breve, en español, de qué le pasa a la planta
      - recommendedAction: qué debe hacer el usuario, en español; si no hay que hacer nada, dilo
      - priority: uno de "immediate", "soon", "routine"
    """.trimIndent()
  }
}
