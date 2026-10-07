<script setup lang="ts">
import type { SpeciesCare } from '@features/species/types/species.types'
import { useRecommendation } from '@features/recommendations/composables/useRecommendation'
import type { CareRecord } from '../types/careRecord.types'
import { useCareRecords } from '../composables/useCareRecords'
import { emptyReadingValues, readingInput } from '../mappers/readingFields'

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
const fields = ref(emptyReadingValues())

const generateAi = ref(true)
const submitting = ref(false)
const error = ref<string | null>(null)

const toInput = () => readingInput(fields.value)

const readyCount = computed(() => Object.keys(toInput()).length)

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
  fields.value = emptyReadingValues()
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

    <ReadingFields
      v-model="fields"
      :species="species"
      :hint="species ? 'Los rangos son los efectivos para esta planta.' : undefined"
    />

    <!-- Los comentarios de una lectura llegan en T-20: no hay dónde guardarlos todavía. -->
    <UiField
      label="Observación"
      as="textarea"
      :rows="3"
      disabled
      help="Los comentarios de una lectura llegan en T-20."
      data-mock="true"
    />

    <UiCheckboxPanel
      v-model="generateAi"
      title="Generar una recomendación con IA al guardar"
      description="Usará esta lectura, los rangos efectivos y el historial reciente."
      data-test="generate-ai"
    />

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
