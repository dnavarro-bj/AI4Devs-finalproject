package com.cactify

import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.context.junit.jupiter.SpringExtension
import org.springframework.transaction.annotation.Transactional
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Testcontainers
import java.nio.file.Files
import java.nio.file.Path

@SpringBootTest(properties = ["cactify.alerts.scheduler.enabled=false", "cactify.media.cleanup.enabled=false"])
@Testcontainers
@ExtendWith(SpringExtension::class)
@Transactional
abstract class AbstractIntegrationTest {

  companion object {
    @JvmStatic
    val postgres: PostgreSQLContainer<*> =
      PostgreSQLContainer("postgres:16-alpine").apply { start() }

    /** El almacén de fotografías de los tests: un directorio temporal que se borra al terminar la JVM. */
    @JvmStatic
    val mediaRoot: Path = Files.createTempDirectory("cactify-media-test").also { root ->
      Runtime.getRuntime().addShutdownHook(Thread { root.toFile().deleteRecursively() })
    }

    @JvmStatic
    @DynamicPropertySource
    fun registerDatasourceProperties(registry: DynamicPropertyRegistry) {
      registry.add("cactify.media.root") { mediaRoot.toString() }
      registry.add("spring.datasource.url", postgres::getJdbcUrl)
      registry.add("spring.datasource.username", postgres::getUsername)
      registry.add("spring.datasource.password", postgres::getPassword)
    }
  }
}
