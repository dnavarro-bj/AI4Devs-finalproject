<script setup lang="ts">
/**
 * Las tareas (§14.5), con la composición de la pantalla `tasks` del prototipo: cabecera con la
 * acción de crear, selector de vista con el número de pendientes, barra de filtros con los criterios
 * aplicados y debajo la vista —agenda, calendario o completadas—.
 *
 * Los datos son los del API de tareas; **no queda maqueta ni marca T-22**. Lo único que sigue
 * declarado es «Completar varias» (T-24). Tarea ≠ cuidado: crear, omitir y cancelar no escriben en
 * el historial de las plantas; completar sí, y lo hace tras enseñar el alcance exacto.
 *
 * Vista, filtros y mes viven en la URL, igual que el inventario: el enlace reproduce la pantalla, y
 * `?due=overdue|today` —lo que abren las cifras del Dashboard— es un criterio más, quitable.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { usePendingAction } from '@shared/composables/usePendingAction'
import { useTasks } from '@features/tasks/composables/useTasks'
import { useTaskWorkflow } from '@features/tasks/composables/useTaskWorkflow'
import { targetText } from '@features/tasks/mappers/task.mapper'
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  type Task,
} from '@features/tasks/types/task.types'

useHead({ title: 'Cactify · Tareas' })
useBreadcrumbs().set([{ label: 'Tareas' }])

const tasks = useTasks()
const {
  today, state, view, month, loading, error, load, agendaEntries, agendaTotal, truncated, calendarItems,
  completed, completedPage, completedPages, setCompletedPage, locationOptions, typeOptions, priorityOptions,
  hasFilters, timing,
} = tasks

const workflow = useTaskWorkflow(load)
const pendingAction = usePendingAction()

onMounted(() => {
  tasks.loadLocations()
  load()
})

const DUE_LABELS: Record<string, string> = { overdue: 'Vencidas', today: 'Para hoy' }

const applied = computed(() => [
  ...(state.location
    ? [{ id: 'location', label: `Localización: ${locationOptions.value.find((option) => option.value === state.location)?.label ?? state.location}` }]
    : []),
  ...(state.plant ? [{ id: 'plant', label: 'Afectan a una planta' }] : []),
  ...(state.type ? [{ id: 'type', label: `Tipo: ${TASK_TYPE_LABELS[state.type as keyof typeof TASK_TYPE_LABELS]}` }] : []),
  ...(state.priority ? [{ id: 'priority', label: `Prioridad: ${TASK_PRIORITY_LABELS[state.priority as keyof typeof TASK_PRIORITY_LABELS]}` }] : []),
  ...(state.due ? [{ id: 'due', label: DUE_LABELS[state.due]! }] : []),
])

function removeFilter(id: string) {
  if (id === 'location') state.location = ''
  if (id === 'plant') state.plant = ''
  if (id === 'type') state.type = ''
  if (id === 'priority') state.priority = ''
  if (id === 'due') state.due = ''
}

function clearFilters() {
  state.location = ''
  state.plant = ''
  state.type = ''
  state.priority = ''
  state.due = ''
}

const tabs = computed(() => [
  { value: 'agenda', label: 'Agenda', count: agendaTotal.value },
  { value: 'calendar', label: 'Calendario' },
  { value: 'completed', label: 'Completadas' },
])

const asTask = (entry: unknown) => (entry as { task: Task }).task

/** Cuándo se cerró una tarea cerrada: la fecha de finalización si la hay; si no, su periodo. */
function closedOn(task: Task): string {
  return (task.completion?.completedAt ?? task.dueTo).slice(0, 10)
}

const noTasks = computed(() => !loading.value && !error.value && agendaTotal.value === 0 && !hasFilters.value && view.value === 'agenda')
</script>

<template>
  <section>
    <UiPageHeader title="Tareas" eyebrow="Trabajo diario">
      <template #actions>
        <UiButton data-test="new-task" @click="workflow.openCreate()"><span aria-hidden="true">＋</span> Crear tarea</UiButton>
      </template>
    </UiPageHeader>

    <UiInlineError v-if="error" data-test="error">
      {{ error }}
      <UiButton variant="secondary" data-test="retry" @click="load">Reintentar</UiButton>
    </UiInlineError>

    <template v-else>
      <UiTabs :model-value="view" :tabs="tabs" @update:model-value="view = $event as typeof view" />

      <!-- Los filtros valen para las tres vistas: son del conjunto, no de una vista. -->
      <UiFilterBar
        :applied="applied"
        density="compact"
        data-test="applied-filters"
        @remove="removeFilter"
        @clear="clearFilters"
      >
        <UiToolbarField v-model="state.location" label="Localización" as="select" placeholder="Todas las localizaciones" :options="locationOptions" data-test="filter-location" />
        <UiToolbarField v-model="state.type" label="Tipo" as="select" placeholder="Todos los tipos" :options="typeOptions" data-test="filter-type" />
        <UiToolbarField v-model="state.priority" label="Prioridad" as="select" placeholder="Cualquier prioridad" :options="priorityOptions" data-test="filter-priority" />
        <span class="toolbar-spacer" />
        <UiButton variant="text" data-test="complete-many" @click="pendingAction('Completar varias', 'T-24')">
          Completar varias
        </UiButton>
      </UiFilterBar>

      <p v-if="loading" data-test="loading" role="status">Cargando las tareas…</p>

      <UiEmptyState v-else-if="noTasks" title="Todavía no hay ninguna tarea pendiente" data-test="empty" mark="◷">
        Aquí aparecerá el trabajo pendiente: riegos, protecciones, trasplantes. Crea la primera para empezar.
        <template #action>
          <UiButton data-test="empty-create" @click="workflow.openCreate()">Crear la primera tarea</UiButton>
        </template>
      </UiEmptyState>

      <template v-else-if="view === 'agenda'">
        <UiNotice v-if="truncated" severity="warning" title="Hay más tareas de las que se muestran" data-test="truncated">
          La agenda enseña las {{ agendaEntries.length }} primeras de {{ agendaTotal }} pendientes. Filtra por
          localización, tipo o prioridad para ver el resto.
        </UiNotice>

        <UiAgendaList
          :entries="agendaEntries"
          :today="today"
          empty-message="Ninguna tarea pendiente coincide con los filtros."
        >
          <template #entry="{ entry, overdue }">
            <TaskRow
              :task="asTask(entry)"
              :main="timing(asTask(entry)).main"
              :hint="timing(asTask(entry)).hint"
              :overdue="overdue"
              @complete="workflow.openComplete(asTask(entry))"
              @action="workflow.act(asTask(entry), $event)"
            />
          </template>
        </UiAgendaList>
      </template>

      <UiCalendarMonth
        v-else-if="view === 'calendar'"
        :month="month"
        :today="today"
        :entries="calendarItems"
        @update:month="month = $event"
        @select-day="workflow.openCreate({ dueFrom: $event })"
      />

      <template v-else>
        <ul v-if="completed.length" class="completed" data-test="completed-list">
          <li v-for="task in completed" :key="task.id" :data-status="task.status">
            <strong>{{ task.title }}</strong>
            <span>
              {{ TASK_TYPE_LABELS[task.type] }} · {{ targetText(task) }} ·
              <b data-test="completed-status">{{ TASK_STATUS_LABELS[task.status] }}</b>
              <template v-if="task.completion"> · {{ task.completion.affectedPlants }} {{ task.completion.affectedPlants === 1 ? 'planta' : 'plantas' }}</template>
              <template v-if="task.closedReason"> · {{ task.closedReason }}</template>
            </span>
            <time :datetime="closedOn(task)">{{ closedOn(task) }}</time>
          </li>
        </ul>
        <UiEmptyState v-else title="Todavía no hay trabajo cerrado" mark="✓" data-test="completed-empty">
          Aquí se consultarán las tareas completadas, omitidas y canceladas.
        </UiEmptyState>
        <UiPagination :page="completedPage" :total-pages="completedPages" label="Páginas de tareas cerradas" @update:page="setCompletedPage" />
      </template>
    </template>

    <TaskDialogs :workflow="workflow" />
  </section>
</template>

<style scoped>
.toolbar-spacer {
  flex: 1 1 auto;
}

.completed {
  list-style: none;
  margin: 0;
  padding: 0;
}

.completed li {
  border-top: 1px solid var(--color-line);
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3) 0;
}

.completed span,
.completed time {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

.completed b {
  color: var(--color-ink);
}
</style>
