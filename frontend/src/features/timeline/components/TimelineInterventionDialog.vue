<script setup lang="ts">
/**
 * Registrar o corregir una intervención. **Muestra solo los campos del tipo elegido** —maceta en el
 * trasplante, mezcla en el cambio de sustrato, producto en el tratamiento y la fertilización—,
 * como las admite el servidor: un dato ajeno a su tipo se rechaza, así que ni se ofrece ni viaja.
 *
 * Sale con `submit`; guardar es de quien lo abre y un fallo no pierde lo escrito.
 */
import {
  emptyInterventionValues, fromLocalInput, interventionError, interventionPayload, toLocalInput,
  type InterventionValues,
} from '../mappers/timeline.mapper'
import type { InterventionInput, TimelineEntry } from '../types/timeline.types'

const props = withDefaults(defineProps<{
  open: boolean
  entry?: TimelineEntry | null
  /** Las mezclas para el cambio de sustrato. Las trae quien abre el diálogo. */
  soilMixes?: { id: string, name: string }[]
  busy?: boolean
  error?: string | null
}>(), { entry: null, soilMixes: () => [], busy: false, error: null })

const emit = defineEmits<{ submit: [InterventionInput], close: [] }>()

const values = ref<InterventionValues>(emptyInterventionValues())
const occurredAt = ref('')
const mixError = ref('')

watch(() => [props.open, props.entry], () => {
  const current = props.entry?.intervention
  values.value = {
    type: current?.type ?? 'trasplante',
    potSize: current?.potSize ?? '',
    product: current?.product ?? '',
    soilMixId: current?.soilMix?.id ?? '',
    notes: current?.notes ?? '',
  }
  occurredAt.value = toLocalInput(props.entry?.occurredAt)
  mixError.value = ''
}, { immediate: true })

function submit() {
  mixError.value = interventionError(values.value)
  if (mixError.value) return

  emit('submit', { ...interventionPayload(values.value), occurredAt: fromLocalInput(occurredAt.value) })
}
</script>

<template>
  <UiDialog
    :open="open"
    :title="entry ? 'Corregir la intervención' : 'Registrar una intervención'"
    @close="emit('close')"
  >
    <form class="dialog-form" data-test="intervention-form" @submit.prevent="submit">
      <UiInlineError v-if="error" data-test="timeline-dialog-error">{{ error }}</UiInlineError>

      <InterventionFields v-model="values" :soil-mixes="soilMixes" :mix-error="mixError" />
      <UiField
        v-model="occurredAt"
        label="Fecha"
        type="datetime-local"
        help="Opcional. Si la dejas vacía, se anota ahora."
        data-test="intervention-date"
      />

      <div class="dialog-form__actions">
        <UiButton variant="secondary" data-test="cancel-event" @click="emit('close')">Cancelar</UiButton>
        <UiButton type="submit" :busy="busy" data-test="save-event">{{ entry ? 'Guardar cambios' : 'Registrar' }}</UiButton>
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
