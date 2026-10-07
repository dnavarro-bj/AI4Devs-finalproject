<script setup lang="ts">
/**
 * Registrar o corregir una floración **observada**: un intervalo con inicio, fin opcional, estado,
 * número aproximado de flores y notas. Puede seguir abierta; el fin solo se pide —y solo viaja—
 * con el estado «Finalizada», como lo exige el servidor.
 *
 * `closing` abre la corrección con el estado ya en «Finalizada»: es la forma de **cerrar** una
 * floración abierta. Sale con `submit`; un fallo no pierde lo escrito.
 */
import { BLOOM_STATUS_LABELS } from '../mappers/timeline.mapper'
import type { BloomInput, BloomStatus, TimelineEntry } from '../types/timeline.types'

const props = withDefaults(defineProps<{
  open: boolean
  entry?: TimelineEntry | null
  closing?: boolean
  busy?: boolean
  error?: string | null
}>(), { entry: null, closing: false, busy: false, error: null })

const emit = defineEmits<{ submit: [BloomInput], close: [] }>()

const STATUSES = (Object.keys(BLOOM_STATUS_LABELS) as BloomStatus[])
  .map((value) => ({ value, label: BLOOM_STATUS_LABELS[value] }))

const startedOn = ref('')
const endedOn = ref('')
const status = ref<BloomStatus>('en_flor')
const flowerCount = ref('')
const notes = ref('')
const errors = reactive({ startedOn: '', endedOn: '', flowerCount: '' })

watch(() => [props.open, props.entry, props.closing], () => {
  const current = props.entry?.bloom
  startedOn.value = current?.startedOn ?? ''
  endedOn.value = current?.endedOn ?? ''
  status.value = props.closing ? 'finalizada' : current?.status ?? 'en_flor'
  flowerCount.value = current?.flowerCount != null ? String(current.flowerCount) : ''
  notes.value = current?.notes ?? ''
  Object.assign(errors, { startedOn: '', endedOn: '', flowerCount: '' })
}, { immediate: true })

const finished = computed(() => status.value === 'finalizada')

function submit() {
  errors.startedOn = startedOn.value ? '' : 'Indica cuándo empezó la floración.'
  errors.endedOn = finished.value && !endedOn.value
    ? 'Una floración finalizada necesita su fecha de fin.'
    : finished.value && endedOn.value < startedOn.value ? 'El fin no puede ser anterior al inicio.' : ''
  errors.flowerCount = flowerCount.value !== '' && !(Number.isInteger(Number(flowerCount.value)) && Number(flowerCount.value) >= 0)
    ? 'El número de flores es un entero, cero o más.'
    : ''
  if (errors.startedOn || errors.endedOn || errors.flowerCount) return

  emit('submit', {
    startedOn: startedOn.value,
    status: status.value,
    endedOn: finished.value ? endedOn.value : undefined,
    flowerCount: flowerCount.value === '' ? undefined : Number(flowerCount.value),
    notes: notes.value.trim() || undefined,
  })
}
</script>

<template>
  <UiDialog
    :open="open"
    :title="closing ? 'Cerrar la floración' : entry ? 'Corregir la floración' : 'Registrar una floración'"
    @close="emit('close')"
  >
    <form class="dialog-form" data-test="bloom-form" @submit.prevent="submit">
      <UiInlineError v-if="error" data-test="timeline-dialog-error">{{ error }}</UiInlineError>

      <UiField v-model="status" label="Estado" as="select" :options="STATUSES" data-test="bloom-status" />
      <UiField
        v-model="startedOn"
        label="Inicio"
        type="date"
        :error="errors.startedOn"
        error-test="bloom-started-error"
        data-test="bloom-started"
      />
      <UiField
        v-if="finished"
        v-model="endedOn"
        label="Fin"
        type="date"
        :error="errors.endedOn"
        error-test="bloom-ended-error"
        data-test="bloom-ended"
      />
      <UiField
        v-model="flowerCount"
        label="Número de flores"
        type="number"
        min="0"
        help="Aproximado y opcional."
        :error="errors.flowerCount"
        error-test="bloom-flowers-error"
        data-test="bloom-flowers"
      />
      <UiField v-model="notes" label="Notas" as="textarea" :rows="3" data-test="bloom-notes" />

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
