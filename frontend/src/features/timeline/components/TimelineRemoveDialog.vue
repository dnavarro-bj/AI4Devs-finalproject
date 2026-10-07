<script setup lang="ts">
/** Confirmar la retirada de un evento: no se borra nada hasta confirmar, y cancelar no cambia nada. */
withDefaults(defineProps<{
  open: boolean
  /** Qué se retira, en palabras: «el comentario», «la floración»… */
  what: string
  busy?: boolean
  error?: string | null
}>(), { busy: false, error: null })

defineEmits<{ confirm: [], close: [] }>()
</script>

<template>
  <UiDialog :open="open" :title="`Retirar ${what}`" @close="$emit('close')">
    <div class="remove" data-test="remove-dialog">
      <UiInlineError v-if="error" data-test="timeline-dialog-error">{{ error }}</UiInlineError>
      <p>Se retirará {{ what }} del historial del ejemplar. No se puede deshacer.</p>
      <div class="remove__actions">
        <UiButton variant="secondary" data-test="cancel-remove" @click="$emit('close')">Cancelar</UiButton>
        <UiButton variant="danger" :busy="busy" data-test="confirm-remove" @click="$emit('confirm')">Retirar</UiButton>
      </div>
    </div>
  </UiDialog>
</template>

<style scoped>
.remove {
  display: grid;
  gap: var(--space-3);
}

.remove p {
  margin: 0;
}

.remove__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
