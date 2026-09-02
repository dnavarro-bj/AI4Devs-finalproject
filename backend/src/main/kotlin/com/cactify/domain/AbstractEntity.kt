package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.EntityListeners
import jakarta.persistence.MappedSuperclass
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import java.time.Clock
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Base de toda entidad del modelo (ADR-010): identificador tipado y marcas de auditoría.
 *
 * Las marcas las gestiona [AuditingListener], no la propia entidad, para que el reloj entre por
 * inyección y un test pueda congelarlo. El `setter` es `internal`: las escribe el ciclo de vida,
 * no el código de aplicación.
 */
@MappedSuperclass
@EntityListeners(AuditingListener::class)
abstract class AbstractEntity<K : EntityId<*>> {

  abstract val id: K

  @Column(name = "created_at", nullable = false)
  lateinit var createdAt: Instant
    internal set

  @Column(name = "updated_at", nullable = false)
  lateinit var updatedAt: Instant
    internal set
}

/**
 * Sella las marcas de auditoría con el reloj del sistema.
 *
 * Vive en `domain` y no conoce Spring: quien lo construye con su [Clock] es un `@Bean` de
 * `infrastructure`, de modo que el `@EntityListeners` de la entidad apunte a una clase de su
 * propia capa y `domain` no dependa de `infrastructure` (ADR-006).
 */
class AuditingListener(private val clock: Clock) {

  /** Al crear, ambas marcas valen lo mismo: la fila no se ha modificado todavía. */
  @PrePersist
  fun onCreate(entity: AbstractEntity<*>) {
    val now = now()
    entity.createdAt = now
    entity.updatedAt = now
  }

  @PreUpdate
  fun onUpdate(entity: AbstractEntity<*>) {
    entity.updatedAt = now()
  }

  /**
   * Recortado a microsegundos, que es lo que guarda `TIMESTAMPTZ`. Sin esto, la marca que viaja
   * en la respuesta del alta lleva nanosegundos que la base de datos redondea, y una consulta
   * posterior devuelve una cadena distinta para el mismo instante.
   */
  private fun now(): Instant = clock.instant().truncatedTo(ChronoUnit.MICROS)
}
