<script setup lang="ts">
/**
 * El editor de una especie, compartido por el alta y la corrección (§5.4).
 *
 * Sigue la pantalla `species-editor` del wireframe: secciones **todas a la vista** con navegación
 * lateral que desplaza en lugar de ocultar, como el editor de planta. Ver el conjunto es parte de
 * decidir qué rellenar.
 *
 * **Los rangos se validan aquí además de en el servidor.** Es una comprobación de rango, que es lo
 * que ADR-011 permite en el borde. No sustituye al dominio ni al `CHECK`: si el API rechaza, se
 * pinta su mensaje.
 *
 * **El error de un campo va junto a su campo.** En un formulario de cuatro secciones, decir «algo
 * falla» obliga a buscar cuál, que es el problema que la navegación por secciones ya resolvió.
 *
 * La mezcla de sustrato es **obligatoria** y **real**: el API la exige por identificador, y el
 * selector se puebla de `GET /soil-mixes` desde `catalogo-sustratos`. Antes de eso este formulario
 * no se podía construir con honestidad.
 */
import { useSoilMixes } from '@features/soil-mixes/composables/useSoilMixes'
import type { SoilMix } from '@features/soil-mixes/types/soilMix.types'
import type { SpeciesInput } from '../types/species.types'

/** Un fallo del guardado, ya atribuido a un campo cuando se puede. */
export interface SpeciesSubmitError {
  field: 'scientificName' | null
  message: string
}

const props = withDefaults(defineProps<{
  initial?: SpeciesInput
  submitting?: boolean
  submitLabel?: string
  submitError?: SpeciesSubmitError | null
}>(), {
  initial: () => ({
    scientificName: '',
    commonName: '',
    minHumidity: 0,
    maxHumidity: 0,
    minTemperature: 0,
    maxTemperature: 0,
    minLightHours: 0,
    maxLightHours: 0,
    wateringGuideline: '',
    soilMixId: '',
  }),
  submitting: false,
  submitLabel: 'Guardar',
  submitError: null,
})

const emit = defineEmits<{ submit: [SpeciesInput] }>()

const { list: listSoilMixes } = useSoilMixes()

const scientificName = ref(props.initial.scientificName)
const commonName = ref(props.initial.commonName)
const wateringGuideline = ref(props.initial.wateringGuideline)
const soilMixId = ref(props.initial.soilMixId)

/**
 * Los rangos viven como texto: un `input` vacío es cadena vacía, y convertirlo a `0` demasiado
 * pronto convertiría «no lo he rellenado» en «es cero», que para una temperatura es un valor.
 */
const ranges = reactive({
  minHumidity: String(props.initial.minHumidity),
  maxHumidity: String(props.initial.maxHumidity),
  minTemperature: String(props.initial.minTemperature),
  maxTemperature: String(props.initial.maxTemperature),
  minLightHours: String(props.initial.minLightHours),
  maxLightHours: String(props.initial.maxLightHours),
})

const soilMixes = ref<SoilMix[]>([])
const loadError = ref<string | null>(null)

const errors = reactive({
  scientificName: '',
  commonName: '',
  humidity: '',
  temperature: '',
  light: '',
  watering: '',
  soilMix: '',
})

const SECTIONS = [
  { value: 'identity', label: 'Identificación' },
  { value: 'care', label: 'Condiciones de cultivo' },
  { value: 'soil', label: 'Sustrato' },
]
const section = ref('identity')

const done = computed(() => [
  ...(scientificName.value.trim() && commonName.value.trim() ? ['identity'] : []),
  ...(wateringGuideline.value.trim() ? ['care'] : []),
  ...(soilMixId.value ? ['soil'] : []),
])

/** La navegación **desplaza**, no oculta: todas las secciones siguen a la vista. */
function goToSection(value: string) {
  section.value = value
  document.getElementById(`species-editor-${value}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const num = (raw: string) => {
  const parsed = Number(raw.trim())
  return Number.isFinite(parsed) ? parsed : 0
}

const soilMixOptions = computed(() => soilMixes.value.map((mix) => ({ value: mix.id, label: mix.name })))

/** El error del API mandaría sobre el propio: lo escribe quien conoce la regla. */
const scientificNameError = computed(
  () => (props.submitError?.field === 'scientificName' ? props.submitError.message : errors.scientificName),
)

const generalError = computed(
  () => (props.submitError && props.submitError.field === null ? props.submitError.message : null),
)

function rangeError(min: string, max: string, what: string): string {
  return num(min) > num(max) ? `El ${what} mínimo (${num(min)}) no puede superar al máximo (${num(max)}).` : ''
}

function validate(): boolean {
  errors.scientificName = scientificName.value.trim() === '' ? 'El nombre científico es obligatorio.' : ''
  errors.commonName = commonName.value.trim() === '' ? 'El nombre común es obligatorio.' : ''
  errors.watering = wateringGuideline.value.trim() === '' ? 'La pauta de riego es obligatoria.' : ''
  errors.soilMix = soilMixId.value === '' ? 'Elige una mezcla de sustrato.' : ''
  errors.humidity = rangeError(ranges.minHumidity, ranges.maxHumidity, 'valor de humedad')
  errors.temperature = rangeError(ranges.minTemperature, ranges.maxTemperature, 'valor de temperatura')
  errors.light = rangeError(ranges.minLightHours, ranges.maxLightHours, 'número de horas de luz')

  // Llevar a la sección que falla: en un formulario de tres, «falta un campo» no basta.
  const missing = (errors.scientificName || errors.commonName)
    ? 'identity'
    : (errors.watering || errors.humidity || errors.temperature || errors.light)
        ? 'care'
        : errors.soilMix ? 'soil' : null

  if (missing) goToSection(missing)
  return !missing
}

function submit() {
  if (!validate()) return

  emit('submit', {
    scientificName: scientificName.value.trim(),
    commonName: commonName.value.trim(),
    minHumidity: num(ranges.minHumidity),
    maxHumidity: num(ranges.maxHumidity),
    minTemperature: num(ranges.minTemperature),
    maxTemperature: num(ranges.maxTemperature),
    minLightHours: num(ranges.minLightHours),
    maxLightHours: num(ranges.maxLightHours),
    wateringGuideline: wateringGuideline.value.trim(),
    soilMixId: soilMixId.value,
  })
}

// Ya montado, no en `setup`: la URL del API solo es válida en el navegador (ADR-013).
onMounted(async () => {
  const result = await listSoilMixes()
  if (!result.success) {
    loadError.value = result.error!.message
    return
  }
  soilMixes.value = result.data!.content
})
</script>

<template>
  <form data-test="species-form" class="editor" @submit.prevent="submit">
    <UiEditorNav
      :model-value="section"
      :sections="SECTIONS"
      :done="done"
      @update:model-value="goToSection"
    />

    <div class="editor__content">
      <UiInlineError v-if="generalError" data-test="submit-error">{{ generalError }}</UiInlineError>
      <UiInlineError v-if="loadError" data-test="catalogs-error">{{ loadError }}</UiInlineError>

      <UiFormSection
        id="species-editor-identity"
        standalone
        title="Identificación"
        description="Los nombres con los que se reconoce la especie."
      >
        <UiField
          v-model="scientificName"
          label="Nombre científico"
          help="El binomio latino, con su capitalización. Es único en el catálogo."
          :error="scientificNameError"
          error-test="scientific-name-error"
          data-test="scientificName"
        />
        <UiField
          v-model="commonName"
          label="Nombre común"
          :error="errors.commonName"
          error-test="common-name-error"
          data-test="commonName"
        />
      </UiFormSection>

      <UiFormSection
        id="species-editor-care"
        standalone
        title="Condiciones de cultivo"
        description="La pauta que heredarán todos los ejemplares de la especie."
      >
        <div class="range">
          <UiField v-model="ranges.minHumidity" label="Humedad mínima" unit="%" type="number" data-test="min-humidity" />
          <UiField
            v-model="ranges.maxHumidity"
            label="Humedad máxima"
            unit="%"
            type="number"
            :error="errors.humidity"
            error-test="humidity-error"
            data-test="max-humidity"
          />
        </div>

        <div class="range">
          <UiField v-model="ranges.minTemperature" label="Temperatura mínima" unit="°C" type="number" data-test="min-temperature" />
          <UiField
            v-model="ranges.maxTemperature"
            label="Temperatura máxima"
            unit="°C"
            type="number"
            :error="errors.temperature"
            error-test="temperature-error"
            data-test="max-temperature"
          />
        </div>

        <div class="range">
          <UiField v-model="ranges.minLightHours" label="Horas de luz mínimas" unit="h" type="number" data-test="min-light" />
          <UiField
            v-model="ranges.maxLightHours"
            label="Horas de luz máximas"
            unit="h"
            type="number"
            :error="errors.light"
            error-test="light-error"
            data-test="max-light"
          />
        </div>

        <UiField
          v-model="wateringGuideline"
          label="Pauta de riego"
          as="textarea"
          :rows="2"
          help="Orientativa: la frecuencia real depende del ejemplar y de la estación."
          :error="errors.watering"
          error-test="watering-error"
          data-test="watering"
        />
      </UiFormSection>

      <UiFormSection
        id="species-editor-soil"
        standalone
        title="Sustrato"
        description="La mezcla que la especie recomienda. El catálogo la exige."
      >
        <UiField
          v-model="soilMixId"
          label="Mezcla de sustrato"
          as="select"
          placeholder="Elige una mezcla"
          :options="soilMixOptions"
          :error="errors.soilMix"
          error-test="soil-mix-error"
          data-test="soil-mix"
        />
        <p class="editor__hint">
          ¿No está la que buscas? <NuxtLink to="/soil-mixes/new">Registra una mezcla nueva</NuxtLink>.
        </p>
      </UiFormSection>

      <footer class="editor__foot">
        <UiButton type="submit" :busy="submitting" data-test="submit">
          {{ submitting ? 'Guardando…' : submitLabel }}
        </UiButton>
      </footer>
    </div>
  </form>
</template>

<style scoped>
.editor {
  align-items: start;
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 200px 1fr;
}

.editor__content {
  display: grid;
  gap: var(--space-4);
}

.range {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr 1fr;
}

.editor__hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}

.editor__foot {
  border-top: 1px solid var(--color-line);
  display: flex;
  justify-content: flex-end;
  padding-top: var(--space-3);
  position: sticky;
  bottom: 0;
  background: var(--color-canvas);
}

@media (max-width: 900px) {
  .editor {
    grid-template-columns: 1fr;
  }
}
</style>
