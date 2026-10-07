<script setup lang="ts">
/**
 * Omitir o cancelar una tarea: el mismo diálogo, con su motivo opcional y la advertencia de lo que
 * **no** pasa —la tarea se conserva como planificada y no cuenta como cuidado realizado—. Que sea un
 * diálogo y no un botón es la confirmación que pide cancelar.
 */
import { useTaskClosing } from '../composables/useTaskClosing'
import type { Task } from '../types/task.types'
import type { CloseMode } from '../composables/useTaskWorkflow'

const props = defineProps<{ open: boolean, task: Task | null, mode: CloseMode }>()
const emit = defineEmits<{ saved: [Task], close: [] }>()

const closing = useTaskClosing()
const reason = ref('')

watch(() => [props.open, props.task?.id] as const, ([open]) => {
  if (!open) return
  closing.reset()
  reason.value = ''
}, { immediate: true })

const skipping = computed(() => props.mode === 'skip')

async function submit() {
  if (!props.task) return
  const saved = skipping.value
    ? await closing.skip(props.task, reason.value)
    : await closing.cancel(props.task, reason.value)
  if (saved) emit('saved', saved)
}
</script>

<template>
  <UiDialog
    :open="open"
    :title="skipping ? 'Omitir tarea' : 'Cancelar tarea'"
    :subtitle="task?.title"
    data-test="close-dialog"
    @close="emit('close')"
  >
    <UiInlineError v-if="closing.error.value" data-test="close-error">{{ closing.error.value }}</UiInlineError>

    <form class="close" @submit.prevent="submit">
      <p data-test="close-impact">
        La tarea se conserva como planificada y <strong>no cuenta como cuidado realizado</strong>: no se
        escribe nada en el historial de las plantas.
      </p>
      <UiField
        v-model="reason"
        label="Motivo (opcional)"
        as="textarea"
        :rows="2"
        maxlength="500"
        data-test="close-reason"
      />
      <div class="close__actions">
        <UiButton variant="secondary" data-test="close-back" @click="emit('close')">Volver</UiButton>
        <UiButton :variant="skipping ? 'primary' : 'danger'" type="submit" :busy="closing.submitting.value" data-test="close-submit">
          {{ skipping ? 'Omitir tarea' : 'Cancelar tarea' }}
        </UiButton>
      </div>
    </form>
  </UiDialog>
</template>

<style scoped>
.close {
  display: grid;
  gap: var(--space-4);
}

.close p {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}

.close__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
