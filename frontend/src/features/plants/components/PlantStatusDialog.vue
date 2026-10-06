<script setup lang="ts">
/**
 * Cambiar el estado de un ejemplar, con su motivo.
 *
 * **Solo ofrece las transiciones que el dominio admite**: desde un estado en curso, cualquier otro;
 * desde uno final, solo volver a `activa`. La regla vive en el servidor y esto la espeja
 * (`plantProfile.ts`); si divergieran, el `409` del API se muestra aquí con su motivo.
 *
 * Volver a `activa` desde un estado final es una **corrección** y exige un motivo: no es una
 * resurrección silenciosa, y el historial lo conserva todo.
 *
 * **Un fallo no pierde lo escrito**: el diálogo sigue abierto con el estado y el motivo como estaban.
 */
import { usePlants } from '../composables/usePlants'
import { STATUS_LABELS, allowedTransitions, reasonRequired } from '../mappers/plantProfile'
import type { PlantDetail, PlantStatus } from '../types/plant.types'

const props = defineProps<{ open: boolean, plant: PlantDetail }>()
const emit = defineEmits<{ changed: [PlantDetail], close: [] }>()

const { changeStatus } = usePlants()

const options = computed(() => allowedTransitions(props.plant.status)
  .map((value) => ({ value, label: STATUS_LABELS[value] })))

const target = ref<PlantStatus>(options.value[0]!.value)
const reason = ref('')
const reasonError = ref('')
const saveError = ref<string | null>(null)
const saving = ref(false)

// Al abrir de nuevo sobre otro estado, los valores parten de cero: lo escrito era de otro cambio.
watch(() => [props.open, props.plant.status], () => {
  target.value = options.value[0]!.value
  reason.value = ''
  reasonError.value = ''
  saveError.value = null
})

const needsReason = computed(() => reasonRequired(props.plant.status, target.value))

async function submit() {
  saveError.value = null
  reasonError.value = needsReason.value && reason.value.trim() === ''
    ? 'El motivo es obligatorio: volver a activa desde un estado final es una corrección.'
    : ''
  if (reasonError.value) return

  saving.value = true
  const result = await changeStatus(props.plant.id, target.value, reason.value)
  saving.value = false

  if (!result.success) {
    saveError.value = result.error!.message
    return
  }
  emit('changed', result.data!)
}
</script>

<template>
  <UiDialog
    :open="open"
    title="Cambiar el estado"
    :subtitle="`${plant.code} · ${plant.nickname}`"
    @close="emit('close')"
  >
    <form class="status-form" data-test="status-form" @submit.prevent="submit">
      <p class="status-form__current">
        Estado actual: <strong>{{ STATUS_LABELS[plant.status] }}</strong>
      </p>

      <UiInlineError v-if="saveError" data-test="status-error">{{ saveError }}</UiInlineError>

      <UiField
        v-model="target"
        label="Nuevo estado"
        as="select"
        :options="options"
        data-test="new-status"
      />

      <UiField
        v-model="reason"
        label="Motivo"
        as="textarea"
        :rows="3"
        :help="needsReason ? undefined : 'Opcional. Quedará en el historial del ejemplar.'"
        :error="reasonError"
        error-test="reason-error"
        data-test="status-reason"
      />
      <p v-if="needsReason" class="status-form__required" data-test="reason-required">
        Es una corrección: explica por qué el ejemplar vuelve a estar activo.
      </p>

      <div class="status-form__actions">
        <UiButton variant="secondary" data-test="cancel-status" @click="emit('close')">Cancelar</UiButton>
        <UiButton type="submit" :busy="saving" data-test="confirm-status">Cambiar estado</UiButton>
      </div>
    </form>
  </UiDialog>
</template>

<style scoped>
.status-form {
  display: grid;
  gap: var(--space-3);
}

.status-form__current,
.status-form__required {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: 0;
}

.status-form__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
