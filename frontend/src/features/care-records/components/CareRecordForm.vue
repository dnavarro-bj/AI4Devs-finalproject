<script setup lang="ts">
import type { SpeciesCare } from '@features/species/types/species.types'
import { useRecommendation } from '@features/recommendations/composables/useRecommendation'
import type { CareRecord, CareRecordInput } from '../types/careRecord.types'
import { useCareRecords } from '../composables/useCareRecords'

/**
 * Formulario de lectura de cultivo, con la forma del wireframe.
 *
 * Tres cosas lo hacen usable y no son adorno:
 *
 * * **La fecha se pide, propuesta como ahora.** Una lectura se anota a menudo después de haberla
 *   tomado (§13.4). No se admite futura; si el usuario no la toca, va el momento propuesto.
 * * **El rango efectivo junto a cada magnitud**, para no tener que salir a comprobarlo. Sale de la
 *   especie, que es dato real.
 * * **Se dice cuántos valores van a guardarse** antes de confirmar, y que nada se guarda hasta
 *   entonces.
 *
 * Los cinco valores siguen siendo independientes: un campo vacío se omite, nunca se manda a cero,
 * porque `null` y `0` significan cosas distintas en el riego.
 */
const props = withDefaults(defineProps<{
  plantId: string
  /** Los rangos efectivos de la planta. Sin ellos el formulario funciona, solo orienta menos. */
  species?: SpeciesCare
  /** Ahora, en ISO. Entra por parámetro para que el formulario sea determinista en test. */
  now?: string
}>(), { species: undefined, now: undefined })

const emit = defineEmits<{ registered: [CareRecord] }>()

const { create } = useCareRecords()
const { generate } = useRecommendation()

/** `datetime-local` no lleva zona ni segundos: `YYYY-MM-DDTHH:mm`. */
function toLocalInput(iso: string): string {
  return iso.slice(0, 16)
}

const nowIso = props.now ?? new Date().toISOString()
const recordedAt = ref(toLocalInput(nowIso))
const maxRecordedAt = toLocalInput(nowIso)

/** Los cinco campos, vacíos hasta que el usuario los informa. */
const fields = reactive<Record<keyof CareRecordInput, string>>({
  humidity: '',
  temperature: '',
  lightHours: '',
  waterAmountMl: '',
  soilPh: '',
})

/** La unidad vive en el control y fuera del valor: nunca se cuela en lo que se envía. */
const FIELDS: {
  key: keyof CareRecordInput
  label: string
  unit: string
  test: string
  mark: string
  range?: (species: SpeciesCare) => string
}[] = [
  {
    key: 'humidity',
    label: 'Humedad',
    unit: '%',
    test: 'humidity',
    mark: '◫',
    range: (s) => `Recomendada ${s.minHumidity}–${s.maxHumidity} %`,
  },
  {
    key: 'temperature',
    label: 'Temperatura',
    unit: '°C',
    test: 'temperature',
    mark: '♨',
    range: (s) => `Recomendada ${s.minTemperature}–${s.maxTemperature} °C`,
  },
  {
    key: 'lightHours',
    label: 'Horas de luz',
    unit: 'h',
    test: 'lightHours',
    mark: '☼',
    range: (s) => `Recomendadas ${s.minLightHours}–${s.maxLightHours} h`,
  },
  {
    key: 'waterAmountMl',
    label: 'Cantidad de riego',
    unit: 'ml',
    test: 'waterAmountMl',
    mark: '◇',
    range: () => 'Déjalo vacío si hoy no has regado.',
  },
  { key: 'soilPh', label: 'Acidez del sustrato', unit: 'pH', test: 'soilPh', mark: 'pH' },
]

const generateAi = ref(true)
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

const readyCount = computed(() => Object.keys(toInput()).length)

const helpOf = (field: typeof FIELDS[number]) =>
  (props.species && field.range ? field.range(props.species) : undefined)

async function submit() {
  error.value = null
  const input = toInput()

  if (Object.keys(input).length === 0) {
    error.value = 'Informa al menos un valor para registrar la lectura.'
    return
  }

  submitting.value = true
  const result = await create(props.plantId, { ...input, recordedAt: new Date(recordedAt.value).toISOString() })

  if (!result.success) {
    submitting.value = false
    // Se conserva lo introducido: el usuario corrige el valor y reintenta.
    error.value = result.error!.message
    return
  }

  const record = result.data!

  // El análisis es opcional y **no bloquea el registro**: si falla, la lectura ya está guardada.
  if (generateAi.value) await generate(props.plantId, record.id)

  submitting.value = false
  emit('registered', record)
  for (const field of Object.keys(fields)) fields[field as keyof CareRecordInput] = ''
}
</script>

<template>
  <form data-test="care-record-form" class="reading" @submit.prevent="submit">
    <UiInlineError v-if="error" data-test="error" class="reading__error">{{ error }}</UiInlineError>

    <UiField
      v-model="recordedAt"
      label="Fecha y hora de la lectura"
      type="datetime-local"
      :max="maxRecordedAt"
      help="No puede estar en el futuro."
      data-test="recorded-at"
    />

    <fieldset class="reading__grid">
      <legend>Mediciones y riego</legend>
      <p class="reading__hint">
        Introduce al menos un valor.
        <template v-if="species">Los rangos son los efectivos para esta planta.</template>
      </p>

      <div v-for="field in FIELDS" :key="field.key" class="reading__row">
        <span class="reading__mark" aria-hidden="true">{{ field.mark }}</span>
        <UiField
          v-model="fields[field.key]"
          layout="row"
          :label="field.label"
          :unit="field.unit"
          :help="helpOf(field)"
          :data-test="field.test"
          type="number"
          inputmode="decimal"
        />
      </div>
    </fieldset>

    <!-- Los comentarios de una lectura llegan en T-20: no hay dónde guardarlos todavía. -->
    <UiField
      label="Observación"
      as="textarea"
      :rows="3"
      disabled
      help="Los comentarios de una lectura llegan en T-20."
      data-mock="true"
    />

    <label class="reading__ai">
      <input v-model="generateAi" type="checkbox" data-test="generate-ai">
      <span>
        <strong>Generar una recomendación con IA al guardar</strong>
        <small>Usará esta lectura y los rangos efectivos de la planta.</small>
      </span>
    </label>

    <footer class="reading__foot">
      <span data-test="ready-count">
        {{ readyCount === 1 ? '1 valor preparado' : `${readyCount} valores preparados` }} ·
        nada se guarda hasta confirmar.
      </span>
      <UiButton type="submit" :busy="submitting">
        {{ submitting ? 'Guardando…' : 'Guardar lectura' }}
      </UiButton>
    </footer>
  </form>
</template>

<style scoped>
.reading {
  display: grid;
  gap: var(--space-4);
}

.reading__error {
  margin: 0;
}

.reading__grid {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  margin: 0;
  padding: var(--space-4);
}

.reading__grid legend {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 0 var(--space-1);
  text-transform: uppercase;
}

.reading__hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-3);
}

.reading__row {
  align-items: center;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 28px 1fr;
}

.reading__row + .reading__row {
  border-top: 1px solid var(--color-line);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
}

.reading__mark {
  align-items: center;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  color: var(--color-ink-muted);
  display: flex;
  font-size: var(--font-size-12);
  height: 28px;
  justify-content: center;
  width: 28px;
}

.reading__ai {
  align-items: start;
  display: grid;
  gap: var(--space-2);
  grid-template-columns: auto 1fr;
}

.reading__ai small {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-11);
}

.reading__foot {
  align-items: center;
  border-top: 1px solid var(--color-line);
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  padding-top: var(--space-3);
}

.reading__foot span {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}
</style>
