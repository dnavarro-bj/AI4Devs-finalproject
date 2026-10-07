<script setup lang="ts">
/** Reprogramar una tarea pendiente: solo cambia su periodo; nada más de la tarea se toca. */
import { useTaskClosing } from '../composables/useTaskClosing'
import type { Task } from '../types/task.types'

const props = defineProps<{ open: boolean, task: Task | null }>()
const emit = defineEmits<{ saved: [Task], close: [] }>()

const closing = useTaskClosing()
const dueFrom = ref('')
const dueTo = ref('')
const errors = reactive({ dueFrom: '', dueTo: '' })

watch(() => [props.open, props.task?.id] as const, ([open]) => {
  if (!open || !props.task) return
  closing.reset()
  dueFrom.value = props.task.dueFrom
  dueTo.value = props.task.dueTo !== props.task.dueFrom ? props.task.dueTo : ''
  errors.dueFrom = ''
  errors.dueTo = ''
}, { immediate: true })

async function submit() {
  errors.dueFrom = dueFrom.value ? '' : 'Elige cuándo empieza.'
  errors.dueTo = dueTo.value && dueTo.value < dueFrom.value ? 'El fin no puede ser anterior al inicio.' : ''
  if (errors.dueFrom || errors.dueTo || !props.task) return

  const saved = await closing.reschedule(props.task, dueFrom.value, dueTo.value || undefined)
  if (saved) emit('saved', saved)
}
</script>

<template>
  <UiDialog :open="open" title="Reprogramar tarea" :subtitle="task?.title" data-test="reschedule-dialog" @close="emit('close')">
    <UiInlineError v-if="closing.error.value" data-test="reschedule-error">{{ closing.error.value }}</UiInlineError>

    <form class="reschedule" @submit.prevent="submit">
      <UiField v-model="dueFrom" label="Empieza" type="date" :error="errors.dueFrom" error-test="reschedule-from-error" data-test="reschedule-from" />
      <UiField
        v-model="dueTo"
        label="Termina (opcional)"
        type="date"
        help="Déjalo vacío si es un solo día."
        :error="errors.dueTo"
        error-test="reschedule-to-error"
        data-test="reschedule-to"
      />
      <div class="reschedule__actions">
        <UiButton variant="secondary" @click="emit('close')">Cancelar</UiButton>
        <UiButton type="submit" :busy="closing.submitting.value" data-test="reschedule-submit">Reprogramar</UiButton>
      </div>
    </form>
  </UiDialog>
</template>

<style scoped>
.reschedule {
  display: grid;
  gap: var(--space-4);
}

.reschedule__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
