<script setup lang="ts">
/**
 * El diálogo de crear y editar una tarea: el formulario con su guardado y su destino.
 *
 * Al **editar** una tarea de plantas hace falta saber cuáles son —el listado solo trae el número—,
 * así que primero pide el detalle. Un error del API se queda en el diálogo, que no se cierra ni pierde
 * lo escrito.
 */
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { useTaskEditor } from '../composables/useTaskEditor'
import { useTaskDestination } from '../composables/useTaskDestination'
import type { TaskInitial } from '../composables/useTaskWorkflow'
import type { Task, TaskInput } from '../types/task.types'

const props = defineProps<{ open: boolean, task: Task | null, initial: TaskInitial | null }>()
const emit = defineEmits<{ saved: [Task], close: [] }>()

const today = useReferenceDate()
const editor = useTaskEditor()
const destination = useTaskDestination()

/** La tarea con su destino completo, lista para editarse; `null` mientras se pide. */
const detail = ref<Task | null>(null)
const ready = ref(false)
/** Cada apertura es un formulario nuevo: no arrastra lo escrito la vez anterior. */
const generation = ref(0)

watch(() => props.open, async (open) => {
  if (!open) {
    editor.reset()
    return
  }
  generation.value += 1
  ready.value = false
  detail.value = null
  destination.loadLocations()

  if (!props.task) {
    ready.value = true
    return
  }
  detail.value = props.task.target.kind === 'plants' ? await editor.loadForEdit(props.task.id) : props.task
  ready.value = detail.value !== null
}, { immediate: true })

async function save(input: TaskInput) {
  const saved = await editor.save(props.task?.id ?? null, input)
  if (saved) emit('saved', saved)
}
</script>

<template>
  <UiDialog
    :open="open"
    :title="task ? 'Editar tarea' : 'Nueva tarea'"
    subtitle="Planificar trabajo"
    data-test="task-dialog"
    @close="emit('close')"
  >
    <UiInlineError v-if="editor.error.value" data-test="task-error">{{ editor.error.value }}</UiInlineError>
    <p v-if="open && !ready && !editor.error.value" role="status">Cargando la tarea…</p>

    <TaskForm
      v-if="open && ready"
      :key="`${task?.id ?? 'new'}-${generation}`"
      :task="detail"
      :initial="initial"
      :today="today"
      :submitting="editor.submitting.value"
      :location-options="destination.locationOptions.value"
      :location-count="destination.plantCountOf"
      :plant-results="destination.results.value"
      :plant-query="destination.query.value"
      :searching="destination.searching.value"
      :search-error="destination.error.value"
      @update:plant-query="destination.query.value = $event"
      @cancel="emit('close')"
      @submit="save"
    />
  </UiDialog>
</template>
