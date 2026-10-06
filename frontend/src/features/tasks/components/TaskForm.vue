<script setup lang="ts">
/** Formulario compartido por el alta y la edición de la maqueta de tareas (T-22). */
import {
  TASK_PRIORITY_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPE_MARKS,
  type Task,
  type TaskPriority,
  type TaskType,
} from '../types/task.types'

export interface TaskDraft {
  type: TaskType
  priority: TaskPriority
  title: string
  location: string
  target: string
  due: string
  time: string | null
  notes: string
}

const props = withDefaults(defineProps<{
  initial?: Task | null
  today: string
  submitting?: boolean
}>(), { initial: null, submitting: false })

const emit = defineEmits<{ submit: [draft: TaskDraft], cancel: [] }>()

const type = ref<TaskType>(props.initial?.type ?? 'watering')
const priority = ref<TaskPriority>(props.initial?.priority ?? 'normal')
const title = ref(props.initial?.title ?? '')
const location = ref(props.initial?.location ?? 'Toda la colección')
const target = ref(props.initial?.target ?? 'Elige plantas o una localización')
const due = ref(props.initial?.due ?? props.today)
const time = ref(props.initial?.time ?? '')
const notes = ref('')
const errors = reactive({ title: '', due: '' })

const typeOptions = Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({ value, label }))
const priorityOptions = Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({ value, label }))

function submit() {
  errors.title = title.value.trim() ? '' : 'Escribe un título para la tarea.'
  errors.due = due.value ? '' : 'Elige cuándo debe realizarse.'
  if (errors.title || errors.due) return

  emit('submit', {
    type: type.value,
    priority: priority.value,
    title: title.value.trim(),
    location: location.value,
    target: target.value,
    due: due.value,
    time: time.value || null,
    notes: notes.value.trim(),
  })
}
</script>

<template>
  <form id="task-form" class="task-form" data-test="task-form" @submit.prevent="submit">
    <div class="task-form__grid">
      <UiField
        v-model="type"
        label="Tipo"
        as="select"
        :options="typeOptions"
        data-test="task-type"
      />
      <UiField
        v-model="priority"
        label="Prioridad"
        as="select"
        :options="priorityOptions"
        data-test="task-priority"
      />
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

      <div class="destination is-wide" data-mock="true" data-test="task-destination">
        <span>Destino</span>
        <div>
          <span class="destination__mark" aria-hidden="true">⌖</span>
          <span>
            <strong>{{ location }}</strong>
            <small>{{ target }}</small>
          </span>
          <UiButton variant="secondary" disabled>Editar destino · T-22</UiButton>
        </div>
      </div>

      <UiField
        v-model="due"
        label="Fecha"
        type="date"
        :error="errors.due"
        error-test="task-due-error"
        data-test="task-due"
      />
      <UiField v-model="time" label="Hora opcional" type="time" data-test="task-time" />
      <div class="is-wide" data-test="task-notes-field">
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
      <span :class="`is-${type}`" aria-hidden="true">{{ TASK_TYPE_MARKS[type] }}</span>
      <p>
        <strong>{{ title.trim() || 'Nueva tarea' }}</strong>
        <small>{{ TASK_TYPE_LABELS[type] }} · {{ TASK_PRIORITY_LABELS[priority] }}</small>
      </p>
    </div>

    <footer>
      <span>La tarea no registra un cuidado hasta que se complete.</span>
      <div>
        <UiButton variant="secondary" @click="emit('cancel')">Cancelar</UiButton>
        <UiButton type="submit" :busy="submitting" data-test="task-submit">
          {{ initial ? 'Guardar cambios' : 'Crear tarea' }}
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

.destination > span {
  display: block;
  font-size: var(--font-size-12);
  font-weight: 700;
  margin-bottom: var(--space-1);
}

.destination > div {
  align-items: center;
  background: var(--color-canvas);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto 1fr auto;
  min-height: 66px;
  padding: var(--space-2) var(--space-3);
}

.destination__mark,
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

.destination strong,
.destination small {
  display: block;
}

.destination strong {
  font-size: var(--font-size-12);
}

.destination small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin-top: var(--space-1);
}

.task-form__preview {
  align-items: center;
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
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

  .destination > div {
    grid-template-columns: auto 1fr;
  }

  .destination :deep(.button) {
    grid-column: 2;
    justify-self: start;
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
