<script setup lang="ts">
/**
 * Al completar una tarea que nació de una alerta, **propone** resolverla: la alerta señalaba un riesgo
 * y la tarea era la acción para atenderlo, pero que se haya hecho el trabajo no prueba que la
 * condición se haya resuelto (§17). Por eso el diálogo lo dice —«todavía no está resuelta»— y
 * **aceptar es una llamada explícita**, con su comentario y su transición registrada; declinar la
 * deja abierta y visible. Nada se resuelve ni se oculta por su cuenta.
 *
 * Un fallo al resolver se explica aquí y no cierra la propuesta ni pierde el comentario.
 */
import { useAlertActions } from '../composables/useAlertActions'

const props = defineProps<{ open: boolean, alertId: string | null }>()
const emit = defineEmits<{ done: [resolved: boolean] }>()

const actions = useAlertActions()
const comment = ref('')

// Cada propuesta empieza sin comentario ni error: eran de otra alerta.
watch(() => [props.open, props.alertId] as const, () => {
  comment.value = ''
  actions.reset()
}, { immediate: true })

async function accept() {
  if (!props.alertId) return
  const resolved = await actions.transition(props.alertId, 'resolve', comment.value)
  if (resolved) emit('done', true)
}
</script>

<template>
  <UiDialog
    :open="open"
    title="¿Resolver también la alerta?"
    subtitle="Esta tarea nació de una alerta"
    data-test="alert-proposal"
    @close="emit('done', false)"
  >
    <div class="proposal">
      <UiInlineError v-if="actions.error.value" data-test="alert-proposal-error">{{ actions.error.value }}</UiInlineError>

      <p>
        La tarea está completada, pero la alerta <strong>no está resuelta todavía</strong>: seguirá abierta
        y visible en la bandeja hasta que la resuelvas tú. Hacer el trabajo no prueba que la condición
        haya desaparecido.
      </p>

      <UiField
        v-model="comment"
        label="Comentario de resolución (opcional)"
        as="textarea"
        :rows="3"
        maxlength="500"
        data-test="alert-proposal-comment"
      />

      <div class="proposal__actions">
        <UiButton variant="secondary" data-test="alert-proposal-decline" @click="emit('done', false)">Dejarla abierta</UiButton>
        <UiButton :busy="actions.submitting.value" data-test="alert-proposal-accept" @click="accept">Resolver alerta</UiButton>
      </div>
    </div>
  </UiDialog>
</template>

<style scoped>
.proposal {
  display: grid;
  gap: var(--space-4);
}

.proposal p {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: 0;
}

.proposal__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
