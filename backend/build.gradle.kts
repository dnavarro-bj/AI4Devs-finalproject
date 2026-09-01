import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
  kotlin("jvm") version "2.3.0"
  kotlin("plugin.spring") version "2.3.0"
  kotlin("plugin.jpa") version "2.3.0"
  id("org.springframework.boot") version "3.5.9"
  id("io.spring.dependency-management") version "1.1.7"
}

group = "com.cactify"
version = "0.0.1-SNAPSHOT"
description = "Backend for Cactify"
java.sourceCompatibility = JavaVersion.VERSION_21

val testContainerVersion = "2.0.2"

dependencies {
  implementation("org.springframework.boot:spring-boot-starter-web")
  implementation("org.springframework.boot:spring-boot-starter-validation")
  implementation("org.springframework.boot:spring-boot-starter-data-jpa")
  implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
  implementation(kotlin("reflect"))
  implementation("io.hypersistence:hypersistence-tsid:2.1.4")

  implementation("org.postgresql:postgresql")
  implementation("org.flywaydb:flyway-core")
  runtimeOnly("org.flywaydb:flyway-database-postgresql")

  testImplementation(kotlin("test"))
  testImplementation("org.springframework.boot:spring-boot-starter-test") {
    exclude(group = "org.junit.vintage", module = "junit-vintage-engine")
  }
  testImplementation("org.springframework.boot:spring-boot-testcontainers")
  testImplementation("org.testcontainers:testcontainers:$testContainerVersion")
  testImplementation("org.testcontainers:testcontainers-junit-jupiter:$testContainerVersion")
  testImplementation("org.testcontainers:testcontainers-postgresql:$testContainerVersion")
}

tasks.test {
  useJUnitPlatform()
}

kotlin {
  jvmToolchain(21)
  compilerOptions {
    jvmTarget = JvmTarget.JVM_21
    freeCompilerArgs.add("-Xjsr305=strict")
  }
}

java {
  toolchain {
    languageVersion = JavaLanguageVersion.of(21)
  }
}

repositories {
  mavenCentral()
}
