<script setup lang="ts">
import type { CareRecord } from '../types/api'
import { ApiError } from '../types/api'
import type { CareRecordInput } from '../composables/useCareRecords'

/**
 * Formulario de lectura de cultivo. Los cinco valores son independientes y la fecha no se pide:
 * la sella el servidor.
 */
const props = defineProps<{ plantId: string }>()
const emit = defineEmits<{ registered: [CareRecord] }>()

const { create } = useCareRecords()

/**
 * Los cinco campos, vacíos hasta que el usuario los informa. El valor llega como `number` y no
 * como cadena: Vue castea el `v-model` de un `<input type="number">`.
 */
const fields = reactive<Record<keyof CareRecordInput, string | number>>({
  humidity: '',
  temperature: '',
  lightHours: '',
  waterAmountMl: '',
  soilPh: '',
})

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
  try {
    emit('registered', await create(props.plantId, input))
    for (const field of Object.keys(fields)) fields[field as keyof CareRecordInput] = ''
  } catch (cause) {
    // Se conserva lo introducido: el usuario corrige el valor y reintenta.
    error.value = cause instanceof ApiError ? cause.message : 'No se ha podido registrar la lectura.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="reading" data-test="care-record-form" @submit.prevent="submit">
    <h2>Nueva lectura</h2>
    <p class="reading__hint">La fecha la registra el sistema. Informa al menos uno de los valores.</p>

    <p v-if="error" class="error" data-test="error" role="alert">{{ error }}</p>

    <div class="reading__grid">
      <div>
        <label for="humidity">Humedad (%)</label>
        <input id="humidity" v-model="fields.humidity" data-test="humidity" type="number" step="any">
      </div>
      <div>
        <label for="temperature">Temperatura (°C)</label>
        <input id="temperature" v-model="fields.temperature" data-test="temperature" type="number" step="any">
      </div>
      <div>
        <label for="lightHours">Horas de luz</label>
        <input id="lightHours" v-model="fields.lightHours" data-test="lightHours" type="number" step="any">
      </div>
      <div>
        <label for="waterAmountMl">Riego (ml)</label>
        <input id="waterAmountMl" v-model="fields.waterAmountMl" data-test="waterAmountMl" type="number" step="any">
      </div>
      <div>
        <label for="soilPh">Acidez del sustrato (pH)</label>
        <input id="soilPh" v-model="fields.soilPh" data-test="soilPh" type="number" step="any">
      </div>
    </div>

    <button type="submit" :disabled="submitting">
      {{ submitting ? 'Registrando…' : 'Registrar lectura' }}
    </button>
  </form>
</template>

<style scoped>
.reading {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  margin-top: var(--space);
  padding: var(--space);
}

h2 {
  font-size: 1.05rem;
  margin: 0 0 0.3rem;
}

.reading__hint {
  color: var(--color-muted);
  font-size: 0.85rem;
  margin: 0 0 var(--space);
}

.reading__grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  margin-bottom: var(--space);
}

.error {
  color: var(--color-danger);
}
</style>
