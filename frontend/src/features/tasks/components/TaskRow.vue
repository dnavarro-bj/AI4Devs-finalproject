<script setup lang="ts">
/**
 * Una tarea como fila: casilla, tipo y prioridad, título, destino, cuándo y acciones.
 *
 * Es de **dominio** y no del kit porque conoce qué es una tarea. Lo usan la agenda de tareas, el
 * Dashboard y las fichas, que es lo que la saca de la pantalla: varias pantallas con la misma fila,
 * una sola fila (ADR-014).
 *
 * No hace nada: **emite**. Quien decide qué ocurre al completar o al elegir una acción es la pantalla.
 */
import { priorityLevel, targetText } from '../mappers/task.mapper'
import { TASK_PRIORITY_LABELS, TASK_TYPE_LABELS, TASK_TYPE_MARKS, type Task } from '../types/task.types'

withDefaults(defineProps<{
  task: Task
  main: string
  hint?: string
  overdue?: boolean
  /** Con acciones (editar, reprogramar, omitir, cancelar). Sin ellas, la fila solo informa. */
  editable?: boolean
}>(), { hint: '', overdue: false, editable: true })

defineEmits<{ complete: [], action: [string] }>()

const ACTIONS = [
  { id: 'edit', label: 'Editar' },
  { id: 'reschedule', label: 'Reprogramar' },
  { id: 'skip', label: 'Omitir' },
  { id: 'cancel', label: 'Cancelar tarea', tone: 'danger' as const },
]
</script>

<template>
  <article class="task-row" :class="{ 'is-overdue': overdue }" data-test="task-row">
    <button
      type="button"
      class="task-row__check"
      data-test="complete-task"
      aria-label="Completar tarea"
      @click="$emit('complete')"
    >
      ○
    </button>

    <span class="task-row__symbol" :class="`is-${task.type}`" aria-hidden="true">
      {{ TASK_TYPE_MARKS[task.type] }}
    </span>

    <div class="task-row__body">
      <div class="task-row__meta">
        <span>{{ TASK_TYPE_LABELS[task.type] }}</span>
        <!-- La prioridad se lee, no solo se ve: el texto va dentro. -->
        <UiPriority v-if="task.priority === 'alta'" :level="priorityLevel(task.priority)">
          {{ TASK_PRIORITY_LABELS[task.priority] }}
        </UiPriority>
      </div>
      <h3>{{ task.title }}</h3>
      <p>{{ targetText(task) }}</p>
    </div>

    <time :datetime="task.dueFrom">
      <strong>{{ main }}</strong>
      <small v-if="hint">{{ hint }}</small>
    </time>

    <UiActionMenu
      v-if="editable"
      label="Acciones de la tarea"
      :actions="ACTIONS"
      data-test="task-actions"
      @select="$emit('action', $event)"
    />
  </article>
</template>

<style scoped>
.task-row {
  align-items: center;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto auto 1fr auto auto;
  width: 100%;
}

.task-row__check {
  background: transparent;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-pill);
  color: var(--color-ink-muted);
  height: 28px;
  width: 28px;
}

.task-row__check:hover {
  border-color: var(--color-brand);
  color: var(--color-brand);
}

.task-row__symbol {
  align-items: center;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  color: var(--color-ink-muted);
  display: flex;
  font-size: var(--font-size-17);
  height: 38px;
  justify-content: center;
  width: 38px;
}

.task-row__symbol.is-riego {
  background: var(--color-info-soft);
  color: var(--color-info);
}

.task-row__symbol.is-proteccion_sol {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.task-row__symbol.is-cambio_maceta {
  background: var(--color-brand-soft);
  color: var(--color-brand);
}

.task-row__meta {
  align-items: center;
  color: var(--color-ink-muted);
  display: flex;
  font-size: var(--font-size-12);
  gap: var(--space-2);
}

.task-row h3 {
  font-size: var(--font-size-14);
  margin: 0;
}

.task-row p {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}

.task-row time {
  display: grid;
  font-size: var(--font-size-12);
  text-align: right;
}

.task-row time small {
  color: var(--color-ink-muted);
}

/* Lo vencido se lee además de verse: «Hace N días» va en el texto. */
.is-overdue time small {
  color: var(--color-danger);
  font-weight: 700;
}

@media (max-width: 700px) {
  .task-row {
    align-items: start;
    grid-template-columns: auto auto minmax(0, 1fr) auto;
  }

  .task-row time {
    grid-column: 3;
    text-align: left;
  }

  .task-row > :last-child {
    grid-column: 4;
    grid-row: 1;
  }
}
</style>
