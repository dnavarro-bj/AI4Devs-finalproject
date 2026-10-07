package com.cactify.application.dto

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant
import java.time.LocalDate

/**
 * Una tarea tal como la expone el API. **No lleva `overdue`**: «vencida» es una comparación contra la
 * fecha de quien pregunta, y devolverla calculada con la del servidor reintroduciría el desajuste.
 * `completion` solo viaja en las completadas y `closedReason` en las omitidas o canceladas.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class TaskResponse(
  val id: String,
  val type: String,
  val title: String,
  val priority: String,
  val status: String,
  val dueFrom: LocalDate,
  val dueTo: LocalDate,
  val notes: String?,
  val origin: String,
  val target: TaskTargetResponse,
  val completion: TaskCompletionResponse?,
  val closedReason: String?,
  val createdAt: Instant?,
  val updatedAt: Instant?,
)

/**
 * El destino: `kind` es `location` o `plants`. En una localización viaja ella con su ruta; en plantas
 * viaja su número y, **solo en el detalle**, las plantas (acotadas a 500).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class TaskTargetResponse(
  val kind: String,
  val location: TaskLocationResponse? = null,
  val plantCount: Int? = null,
  val plants: List<TaskPlantResponse>? = null,
)

data class TaskLocationResponse(val id: String, val name: String, val path: String)

data class TaskPlantResponse(val id: String, val code: String, val nickname: String)

data class TaskCompletionResponse(val completedAt: Instant, val affectedPlants: Int)

/** Una planta del alcance de una tarea: lo que el diálogo de completar muestra antes de confirmar. */
data class TaskScopePlantResponse(
  val id: String,
  val code: String,
  val nickname: String,
  val species: SpeciesSummaryResponse,
  val location: TaskLocationResponse,
)
