<script setup lang="ts">
/**
 * Anotar o corregir un comentario. Sale con `submit` y deja que quien lo abre guarde: este
 * componente no habla con el API (ADR-015), y por eso **un fallo no pierde lo escrito** —sigue
 * abierto con `error` explicado y el texto como estaba—.
 *
 * Al corregir solo cambia el texto: la fecha de un comentario no se reescribe, se marca «editado».
 */
import { fromLocalInput } from '../mappers/timeline.mapper'
import type { CommentInput, TimelineEntry } from '../types/timeline.types'

const props = withDefaults(defineProps<{
  open: boolean
  entry?: TimelineEntry | null
  busy?: boolean
  error?: string | null
}>(), { entry: null, busy: false, error: null })

const emit = defineEmits<{ submit: [CommentInput], close: [] }>()

const text = ref('')
const occurredAt = ref('')
const textError = ref('')

// Al abrir, se parte de cero o de lo que se corrige: lo escrito era de otro comentario.
watch(() => [props.open, props.entry], () => {
  text.value = props.entry?.comment?.text ?? ''
  occurredAt.value = ''
  textError.value = ''
}, { immediate: true })

function submit() {
  textError.value = text.value.trim() === '' ? 'El comentario no puede estar vacío.' : ''
  if (textError.value) return
  emit('submit', props.entry
    ? { text: text.value.trim() }
    : { text: text.value.trim(), occurredAt: fromLocalInput(occurredAt.value) })
}
</script>

<template>
  <UiDialog
    :open="open"
    :title="entry ? 'Corregir el comentario' : 'Añadir un comentario'"
    @close="emit('close')"
  >
    <form class="dialog-form" data-test="comment-form" @submit.prevent="submit">
      <UiInlineError v-if="error" data-test="timeline-dialog-error">{{ error }}</UiInlineError>

      <UiField
        v-model="text"
        label="Comentario"
        as="textarea"
        :rows="4"
        :error="textError"
        error-test="comment-text-error"
        data-test="comment-text"
      />
      <UiField
        v-if="!entry"
        v-model="occurredAt"
        label="Fecha"
        type="datetime-local"
        help="Opcional. Si la dejas vacía, se anota ahora."
        data-test="comment-date"
      />

      <div class="dialog-form__actions">
        <UiButton variant="secondary" data-test="cancel-event" @click="emit('close')">Cancelar</UiButton>
        <UiButton type="submit" :busy="busy" data-test="save-event">{{ entry ? 'Guardar cambios' : 'Añadir comentario' }}</UiButton>
      </div>
    </form>
  </UiDialog>
</template>

<style scoped>
.dialog-form {
  display: grid;
  gap: var(--space-3);
}

.dialog-form__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
