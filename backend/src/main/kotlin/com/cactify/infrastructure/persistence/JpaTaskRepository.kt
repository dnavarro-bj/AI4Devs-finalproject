package com.cactify.infrastructure.persistence

import com.cactify.domain.LocationId
import com.cactify.domain.Task
import com.cactify.domain.TaskId
import com.cactify.domain.repos.TaskPlantCount
import com.cactify.domain.repos.TaskRepository
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface JpaTaskRepository :
  TaskRepository,
  JpaRepository<Task, TaskId>,
  JpaSpecificationExecutor<Task> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from Task t where t.id = :id")
  override fun findOneByIdForUpdate(@Param("id") id: TaskId): Task?

  @Query("select count(t) > 0 from Task t where t.location.id = :locationId")
  override fun existsByLocationId(@Param("locationId") locationId: LocationId): Boolean

  @Query("select new com.cactify.domain.repos.TaskPlantCount(t.id, count(p)) from Task t join t.plantSet p where t.id in :ids group by t.id")
  override fun countPlantsByTaskIds(@Param("ids") ids: Collection<TaskId>): List<TaskPlantCount>
}
