<script setup lang="ts">
import type { CareRecord, CareRecordInput } from '../types/careRecord.types'
import { useCareRecords } from '../composables/useCareRecords'

/**
 * Formulario de lectura de cultivo. Los cinco valores son independientes y la fecha no se pide:
 * la sella el servidor.
 */
const props = defineProps<{ plantId: string }>()
const emit = defineEmits<{ registered: [CareRecord] }>()

const { create } = useCareRecords()

/** Los cinco campos, vacíos hasta que el usuario los informa. */
const fields = reactive<Record<keyof CareRecordInput, string>>({
  humidity: '',
  temperature: '',
  lightHours: '',
  waterAmountMl: '',
  soilPh: '',
})

/** La unidad vive en el control y fuera del valor: nunca se cuela en lo que se envía. */
const FIELDS: { key: keyof CareRecordInput, label: string, unit: string, test: string }[] = [
  { key: 'humidity', label: 'Humedad', unit: '%', test: 'humidity' },
  { key: 'temperature', label: 'Temperatura', unit: '°C', test: 'temperature' },
  { key: 'lightHours', label: 'Horas de luz', unit: 'h', test: 'lightHours' },
  { key: 'waterAmountMl', label: 'Riego', unit: 'ml', test: 'waterAmountMl' },
  { key: 'soilPh', label: 'Acidez del sustrato', unit: 'pH', test: 'soilPh' },
]

const submitting = ref(false)
const error = ref<string | null>(null)

/** Solo los valores informados: un campo vacío se omite, no se manda a cero. */
function toInput(): CareRecordInput {
  const input: CareRecordInput = {}
  for (const [field, raw] of Object.entries(fields)) {
    const value = typeof raw === 'string' ? raw.trim() : raw
    if (value === '') continue

    const parsed = Number(value)
    if (!Number.isNaN(parsed)) input[field as keyof CareRecordInput] = parsed
  }
  return input
}

async function submit() {
  error.value = null
  const input = toInput()

  if (Object.keys(input).length === 0) {
    error.value = 'Informa al menos un valor para registrar la lectura.'
    return
  }

  submitting.value = true
  const result = await create(props.plantId, input)
  submitting.value = false

  if (!result.success) {
    // Se conserva lo introducido: el usuario corrige el valor y reintenta.
    error.value = result.error!.message
    return
  }

  emit('registered', result.data!)
  for (const field of Object.keys(fields)) fields[field as keyof CareRecordInput] = ''
}
</script>

<template>
  <form data-test="care-record-form" @submit.prevent="submit">
    <UiPanel title="Nueva lectura">
      <p class="hint">La fecha la registra el sistema. Informa al menos uno de los valores.</p>

      <UiInlineError v-if="error" data-test="error" class="reading__error">{{ error }}</UiInlineError>

      <div class="reading__grid">
        <UiField
          v-for="field in FIELDS"
          :key="field.key"
          v-model="fields[field.key]"
          :label="field.label"
          :unit="field.unit"
          :data-test="field.test"
          type="number"
          step="any"
        />
      </div>

      <UiButton type="submit" :busy="submitting">
        {{ submitting ? 'Registrando…' : 'Registrar lectura' }}
      </UiButton>
    </UiPanel>
  </form>
</template>

<style scoped>
.hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-4);
}

.reading__error {
  margin-bottom: var(--space-4);
}

.reading__grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  margin-bottom: var(--space-5);
}
</style>
