<script setup lang="ts">
/**
 * Las tareas (§14.5), con la composición de la pantalla `tasks` del prototipo: cabecera con la
 * acción de crear, selector de vista y **la misma lista** detrás de las tres vistas.
 *
 * **Maqueta, y declarada.** No hay entidad tarea (T-22): los datos son de ejemplo y lo dice la
 * pantalla. Crear, completar, editar y completar varias se muestran como lo que serán, **marcadas
 * con T-22**, y no cambian nada. Tarea ≠ cuidado: completar no escribirá en el historial hasta que
 * T-22 decida cómo.
 *
 * Una sola carga: alternar de vista no la repite, y los filtros se conservan.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { usePendingAction } from '@shared/composables/usePendingAction'
import { useTasks } from '@features/tasks/composables/useTasks'
import TaskForm, { type TaskDraft } from '@features/tasks/components/TaskForm.vue'
import { TASK_TYPE_LABELS, type Task } from '@features/tasks/types/task.types'

useHead({ title: 'Cactify · Tareas' })
useBreadcrumbs().set([{ label: 'Tareas' }])

const {
  today, loading, error, view, month, filters, load, pending, completed,
  agendaEntries, calendarEntries, locationOptions, typeOptions, priorityOptions,
  timing, hasTasks,
} = useTasks()

const pendingAction = usePendingAction()

// Las cifras del Dashboard abren esta pantalla ya filtradas: `?due=overdue` o `?due=today`.
const DUE_LABELS: Record<string, string> = { overdue: 'Vencidas', today: 'Para hoy' }
const dueQuery = String(useRoute().query.due ?? '')
if (dueQuery in DUE_LABELS) filters.due = dueQuery

const applied = computed(() => filters.due ? [{ id: 'due', label: DUE_LABELS[filters.due]! }] : [])

onMounted(load)

const tabs = computed(() => [
  { value: 'agenda', label: 'Agenda', count: pending.value.length },
  { value: 'calendar', label: 'Calendario' },
  { value: 'completed', label: 'Completadas' },
])

const editorOpen = ref(false)
const editingTask = ref<Task | null>(null)

function openNew() {
  editingTask.value = null
  editorOpen.value = true
}

function openEdit(task: Task) {
  editingTask.value = task
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  editingTask.value = null
}

/** El formulario fija el flujo y la composición; T-22 conectará la mutación real. */
function saveDraft(_draft: TaskDraft) {
  pendingAction(editingTask.value ? 'Guardar cambios de la tarea' : 'Crear tarea', 'T-22')
  closeEditor()
}
</script>

<template>
  <section>
    <UiPageHeader title="Tareas" eyebrow="Trabajo diario">
      <template #actions>
        <UiButton data-test="new-task" @click="openNew"><span aria-hidden="true">＋</span> Crear tarea</UiButton>
      </template>
    </UiPageHeader>

    <p v-if="loading" data-test="loading" role="status">Cargando las tareas…</p>

    <UiInlineError v-else-if="error" data-test="error">{{ error }}</UiInlineError>

    <UiEmptyState v-else-if="!hasTasks" title="Todavía no hay ninguna tarea" data-test="empty" mark="◷">
      Aquí aparecerá el trabajo pendiente: riegos, protecciones, trasplantes. Crea la primera para empezar.
      <template #action>
        <UiButton @click="openNew">Crear la primera tarea</UiButton>
      </template>
    </UiEmptyState>

    <template v-else>
      <MockNotice ticket="T-22" what="las tareas" />

      <UiTabs v-model="view" :tabs="tabs" />

      <!-- Los filtros valen para las tres vistas: son del conjunto, no de una vista. -->
      <UiFilterBar
        :applied="applied"
        density="compact"
        data-test="applied-filters"
        @remove="filters.due = ''"
        @clear="filters.due = ''"
      >
        <UiToolbarField v-model="filters.location" label="Todas las localizaciones" as="select" :options="locationOptions.slice(1)" data-test="filter-location" />
        <UiToolbarField v-model="filters.type" label="Todos los tipos" as="select" :options="typeOptions.slice(1)" data-test="filter-type" />
        <UiToolbarField v-model="filters.priority" label="Prioridad" as="select" :options="priorityOptions.slice(1)" data-test="filter-priority" />
        <span class="toolbar-spacer" />
        <UiButton variant="text" data-test="complete-many" @click="pendingAction('Completar varias', 'T-22')">
          Completar varias
        </UiButton>
        <UiButton variant="icon" label="Vista de lista" class="view-button is-selected">☷</UiButton>
        <UiButton variant="icon" label="Vista compacta" disabled data-mock="true">≡</UiButton>
      </UiFilterBar>

      <UiAgendaList
        v-if="view === 'agenda'"
        :entries="agendaEntries"
        :today="today"
        empty-message="Ninguna tarea pendiente coincide con los filtros."
      >
        <template #entry="{ entry, overdue }">
          <TaskRow
            :task="(entry as typeof agendaEntries[number]).task"
            :main="timing((entry as typeof agendaEntries[number]).task).main"
            :hint="timing((entry as typeof agendaEntries[number]).task).hint"
            :overdue="overdue"
            @complete="pendingAction('Completar tarea', 'T-22')"
            @edit="openEdit((entry as typeof agendaEntries[number]).task)"
          />
        </template>
      </UiAgendaList>

      <UiCalendarMonth
        v-else-if="view === 'calendar'"
        v-model:month="month"
        :today="today"
        :entries="calendarEntries"
      />

      <template v-else>
        <ul v-if="completed.length" class="completed" data-test="completed-list">
          <li v-for="task in completed" :key="task.id">
            <strong>{{ task.title }}</strong>
            <span>{{ TASK_TYPE_LABELS[task.type] }} · {{ task.target }} · {{ task.location }}</span>
            <time :datetime="task.due">{{ task.due }}</time>
          </li>
        </ul>
        <UiEmptyState v-else title="Trabajo completado" mark="✓" data-test="completed-empty">
          Aquí se consultarán las tareas finalizadas y el cuidado registrado en cada planta.
        </UiEmptyState>
      </template>
    </template>

    <UiDialog
      :open="editorOpen"
      :title="editingTask ? 'Editar tarea' : 'Nueva tarea'"
      subtitle="Planificar trabajo"
      data-test="task-dialog"
      @close="closeEditor"
    >
      <MockNotice ticket="T-22" what="el guardado de esta tarea" />
      <TaskForm
        :key="editingTask?.id ?? 'new'"
        :initial="editingTask"
        :today="today"
        @cancel="closeEditor"
        @submit="saveDraft"
      />
    </UiDialog>
  </section>
</template>

<style scoped>
.toolbar-spacer {
  flex: 1 1 auto;
}

.view-button.is-selected {
  background: var(--color-brand-soft);
  color: var(--color-brand-strong);
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
</style>
