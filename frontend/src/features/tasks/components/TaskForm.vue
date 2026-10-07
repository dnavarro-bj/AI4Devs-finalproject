<script setup lang="ts">
/**
 * El formulario de una tarea, compartido por el alta y la edición: tipo, prioridad, título,
 * **destino**, periodo y notas, y al pie lo que la tarea hace y no hace.
 *
 * **Sin hora**: el periodo son días (§24.14). El prototipo trae un campo de hora opcional del que
 * este formulario se aparta a propósito. Un solo día es un inicio sin fin.
 *
 * Valida lo mínimo antes de enviar —título, fecha, orden del periodo y destino— y emite el cuerpo
 * del API (`TaskInput`); el servidor sigue siendo quien decide.
 */
import {
  TASK_PRIORITY_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPE_MARKS,
  type Task,
  type TaskInput,
  type TaskPriority,
  type TaskType,
} from '../types/task.types'
import type { TaskInitial } from '../composables/useTaskWorkflow'
import type { DestinationValue, PickablePlant } from '../composables/useTaskDestination'

const props = withDefaults(defineProps<{
  /** Editar: la tarea (con su destino completo). Sin ella, es un alta. */
  task?: Task | null
  /** Crear: lo que ya se sabe (un día, una planta, una localización). */
  initial?: TaskInitial | null
  today: string
  submitting?: boolean
  locationOptions: { value: string, label: string }[]
  locationCount: (id: string) => number | null
  plantResults: PickablePlant[]
  plantQuery: string
  searching?: boolean
  searchError?: string | null
}>(), { task: null, initial: null, submitting: false, searching: false, searchError: null })

const emit = defineEmits<{ submit: [input: TaskInput], cancel: [], 'update:plantQuery': [string] }>()

const type = ref<TaskType>(props.task?.type ?? props.initial?.type ?? 'riego')
const priority = ref<TaskPriority>(props.task?.priority ?? props.initial?.priority ?? 'normal')
const title = ref(props.task?.title ?? props.initial?.title ?? '')
const dueFrom = ref(props.task?.dueFrom ?? props.initial?.dueFrom ?? props.today)
const dueTo = ref(props.task && props.task.dueTo !== props.task.dueFrom ? props.task.dueTo : '')
const notes = ref(props.task?.notes ?? '')

function initialDestination(): DestinationValue {
  if (props.task?.target.kind === 'location') {
    return { mode: 'location', locationId: props.task.target.location.id, plants: [] }
  }
  if (props.task?.target.kind === 'plants') {
    return {
      mode: 'plants',
      locationId: '',
      plants: (props.task.target.plants ?? []).map((plant) => ({ ...plant, detail: '' })),
    }
  }
  if (props.initial?.plants?.length) return { mode: 'plants', locationId: '', plants: props.initial.plants }
  return { mode: 'location', locationId: props.initial?.locationId ?? '', plants: [] }
}

const destination = ref<DestinationValue>(initialDestination())
const errors = reactive({ title: '', dueFrom: '', dueTo: '', destination: '' })

const typeOptions = Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({ value, label }))
const priorityOptions = Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({ value, label }))

function validate(): boolean {
  errors.title = title.value.trim() ? '' : 'Escribe un título para la tarea.'
  errors.dueFrom = dueFrom.value ? '' : 'Elige cuándo empieza.'
  errors.dueTo = dueTo.value && dueTo.value < dueFrom.value ? 'El fin no puede ser anterior al inicio.' : ''
  const chosen = destination.value.mode === 'location'
    ? Boolean(destination.value.locationId)
    : destination.value.plants.length > 0
  errors.destination = chosen ? '' : 'Elige una localización o al menos una planta.'
  return !errors.title && !errors.dueFrom && !errors.dueTo && !errors.destination
}

function submit() {
  if (!validate()) return

  emit('submit', {
    type: type.value,
    priority: priority.value,
    title: title.value.trim(),
    ...(!props.task && props.initial?.originAlertId ? { originAlertId: props.initial.originAlertId } : {}),
    dueFrom: dueFrom.value,
    ...(dueTo.value ? { dueTo: dueTo.value } : {}),
    ...(notes.value.trim() ? { notes: notes.value.trim() } : {}),
    ...(destination.value.mode === 'location'
      ? { locationId: destination.value.locationId }
      : { plantIds: destination.value.plants.map((plant) => plant.id) }),
  })
}
</script>

<template>
  <form id="task-form" class="task-form" data-test="task-form" @submit.prevent="submit">
    <div class="task-form__grid">
      <UiField v-model="type" label="Tipo" as="select" :options="typeOptions" data-test="task-type" />
      <UiField v-model="priority" label="Prioridad" as="select" :options="priorityOptions" data-test="task-priority" />

      <div class="is-wide">
        <UiField
          v-model="title"
          label="Título"
          :error="errors.title"
          error-test="task-title-error"
          autofocus
          data-test="task-title"
        />
      </div>

      <div class="is-wide">
        <TaskDestinationPicker
          v-model="destination"
          :location-options="locationOptions"
          :location-count="locationCount(destination.locationId)"
          :results="plantResults"
          :query="plantQuery"
          :searching="searching"
          :search-error="searchError"
          :error="errors.destination"
          @update:query="emit('update:plantQuery', $event)"
        />
      </div>

      <UiField
        v-model="dueFrom"
        label="Empieza"
        type="date"
        :error="errors.dueFrom"
        error-test="task-due-error"
        data-test="task-due"
      />
      <UiField
        v-model="dueTo"
        label="Termina (opcional)"
        type="date"
        help="Déjalo vacío si es un solo día."
        :error="errors.dueTo"
        error-test="task-due-to-error"
        data-test="task-due-to"
      />
      <div class="is-wide">
        <UiField
          v-model="notes"
          label="Notas"
          as="textarea"
          :rows="3"
          placeholder="Instrucciones o contexto adicional"
          data-test="task-notes"
        />
      </div>
    </div>

    <div class="task-form__preview" aria-live="polite">
      <span aria-hidden="true">{{ TASK_TYPE_MARKS[type] }}</span>
      <p>
        <strong>{{ title.trim() || 'Nueva tarea' }}</strong>
        <small>{{ TASK_TYPE_LABELS[type] }} · {{ TASK_PRIORITY_LABELS[priority] }}</small>
      </p>
    </div>

    <footer>
      <span data-test="task-impact">La tarea no registra un cuidado hasta que se complete.</span>
      <div>
        <UiButton variant="secondary" data-test="task-cancel" @click="emit('cancel')">Cancelar</UiButton>
        <UiButton type="submit" :busy="submitting" data-test="task-submit">
          {{ task ? 'Guardar cambios' : 'Crear tarea' }}
        </UiButton>
      </div>
    </footer>
  </form>
</template>

<style scoped>
.task-form {
  display: grid;
  gap: var(--space-5);
}

.task-form__grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.is-wide {
  grid-column: 1 / -1;
}

.task-form__preview {
  align-items: center;
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
}

.task-form__preview > span {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  color: var(--color-brand);
  display: flex;
  font-size: var(--font-size-17);
  height: 38px;
  justify-content: center;
  width: 38px;
}

.task-form__preview p,
.task-form__preview strong,
.task-form__preview small {
  display: block;
  margin: 0;
}

.task-form__preview small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin-top: var(--space-1);
}

.task-form > footer {
  align-items: center;
  border-top: 1px solid var(--color-line);
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  padding-top: var(--space-4);
}

.task-form > footer > span {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}

.task-form > footer > div {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-2);
}

@media (max-width: 620px) {
  .task-form__grid {
    grid-template-columns: 1fr;
  }

  .is-wide {
    grid-column: auto;
  }

  .task-form > footer {
    align-items: stretch;
    flex-direction: column;
  }

  .task-form > footer > div {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
