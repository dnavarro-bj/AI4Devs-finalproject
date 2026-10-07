<script setup lang="ts">
/**
 * Resolver o descartar una alerta: el mismo diálogo, con su comentario opcional y la aclaración de
 * lo que **cada una significa** —descartar no es resolver—. Que sea un diálogo y no un botón es la
 * confirmación que pide cerrar algo que ya no se reabre.
 *
 * Sale con `submit` y deja que quien lo abre llame al API: este componente no habla con él
 * (ADR-015), y por eso **un fallo no pierde lo escrito** —sigue abierto con `error` explicado—.
 */
import type { Alert } from '../types/alert.types'

const props = withDefaults(defineProps<{
  open: boolean
  alert: Alert | null
  action: 'resolve' | 'dismiss'
  busy?: boolean
  error?: string | null
}>(), { busy: false, error: null })

const emit = defineEmits<{ submit: [comment: string | undefined], close: [] }>()

const comment = ref('')

// Cada apertura es un comentario nuevo: lo escrito era de otra alerta.
watch(() => [props.open, props.alert?.id] as const, () => { comment.value = '' }, { immediate: true })

const resolving = computed(() => props.action === 'resolve')

function submit() {
  emit('submit', comment.value.trim() || undefined)
}
</script>

<template>
  <UiDialog
    :open="open"
    :title="resolving ? 'Resolver alerta' : 'Descartar alerta'"
    :subtitle="alert?.reason"
    data-test="alert-close-dialog"
    @close="emit('close')"
  >
    <form class="close" data-test="alert-close-form" @submit.prevent="submit">
      <UiInlineError v-if="error" data-test="alert-close-error">{{ error }}</UiInlineError>

      <p data-test="alert-close-impact">
        <template v-if="resolving">
          La alerta queda <strong>resuelta</strong> con su fecha y su comentario. No se registra ningún
          cuidado: eso es del historial de la planta.
        </template>
        <template v-else>
          La alerta queda <strong>descartada</strong>: se conserva, pero <strong>no cuenta como resuelta</strong>,
          porque la condición que la originó no se ha atendido.
        </template>
      </p>

      <UiField
        v-model="comment"
        label="Comentario (opcional)"
        as="textarea"
        :rows="3"
        maxlength="500"
        autofocus
        data-test="alert-close-comment"
      />

      <div class="close__actions">
        <UiButton variant="secondary" data-test="alert-close-back" @click="emit('close')">Volver</UiButton>
        <UiButton type="submit" :busy="busy" :variant="resolving ? 'primary' : 'danger'" data-test="alert-close-submit">
          {{ resolving ? 'Resolver alerta' : 'Descartar alerta' }}
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
