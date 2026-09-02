package com.cactify.infrastructure

import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

/**
 * Acceso del navegador al API (ADR-013). El frontend se sirve desde otro origen —`:3000` frente al
 * `:8080` del backend—, así que sin esto el navegador descarta toda respuesta.
 *
 * Es configuración del transporte, no una regla de negocio: vive en `infrastructure` y ni `domain`
 * ni `application` se enteran (ADR-006).
 *
 * Cualquier origen y **sin credenciales**: el MVP no tiene autenticación ni cookies de sesión, así
 * que no hay nada que un origen ajeno pueda hacer que no pudiera hacer con `curl`. En cuanto entre
 * autenticación o el despliegue salga de local, la lista de orígenes pasa a una variable de
 * entorno; `allowCredentials` es además incompatible con el comodín.
 */
@Configuration
class WebConfiguration : WebMvcConfigurer {

  override fun addCorsMappings(registry: CorsRegistry) {
    registry.addMapping("/**")
      .allowedOrigins("*")
      .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
      .allowedHeaders("*")
      .allowCredentials(false)
  }
}
