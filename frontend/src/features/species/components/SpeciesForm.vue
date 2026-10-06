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

/** Previsualizaciones de T-17: se pueden explorar, pero no forman parte del cuerpo enviado. */
const exposurePreview = ref('')
const environmentPreview = ref('')

const EXPOSURE_OPTIONS = [
  { value: 'shade', label: 'Sombra', description: 'Sin sol directo', mark: '◑' },
  { value: 'partial', label: 'Semisombra', description: 'Sol limitado', mark: '◐' },
  { value: 'sunny', label: 'Soleado', description: 'Varias horas', mark: '◒' },
  { value: 'full-sun', label: 'Pleno sol', description: 'Exposición prolongada', mark: '☼' },
]

const ENVIRONMENT_OPTIONS = [
  { value: 'inside', label: 'Interior' },
  { value: 'outside', label: 'Exterior' },
  { value: 'both', label: 'Ambos' },
  { value: 'seasonal', label: 'Estacional' },
]

const YEAR_ROWS = [
  { label: 'Crecimiento', levels: Array(12).fill(0), tone: 'brand' as const },
  { label: 'Floración', levels: Array(12).fill(0), tone: 'warning' as const },
]

const YEAR_LEGEND = [
  { tone: 'brand' as const, label: 'Crecimiento' },
  { tone: 'warning' as const, label: 'Floración habitual' },
]

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
  { value: 'photos', label: 'Fotografías' },
  { value: 'care', label: 'Condiciones de cultivo' },
  { value: 'seasons', label: 'Crecimiento y floración' },
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

      <!-- Fotografías de referencia: la composición queda lista, el almacenamiento llega en T-19. -->
      <UiFormSection
        id="species-editor-photos"
        standalone
        title="Fotografías"
        description="Añade imágenes generales de referencia. Podrás elegir la portada."
        data-test="species-photos"
      >
        <div data-mock="true">
          <UiUploadArea
            label="Subir fotografías de referencia"
            accept="image/jpeg,image/png,image/webp"
            hint="JPG, PNG o WebP · el límite se decidirá antes de T-19"
            action-label="Seleccionar imágenes"
            layout="inline"
            mark="▧"
            disabled
            data-test="species-photo-upload"
          />
        </div>

        <ul class="photo-guide">
          <li><span aria-hidden="true">◎</span><strong>Vista general</strong><small>La silueta completa de la especie.</small></li>
          <li><span aria-hidden="true">✺</span><strong>Detalle distintivo</strong><small>Espinas, costillas, hojas o areolas.</small></li>
          <li><span aria-hidden="true">✣</span><strong>Floración</strong><small>Una referencia cuando esté disponible.</small></li>
        </ul>

        <p class="editor__hint">
          El almacenamiento, la portada y los metadatos llegan con <strong>T-19</strong>, después de
          decidir su ADR. Esta sección no envía ficheros todavía.
        </p>
      </UiFormSection>

      <UiFormSection
        id="species-editor-care"
        standalone
        title="Condiciones de cultivo"
        description="La pauta que heredarán todos los ejemplares de la especie."
      >
        <div class="pending-care" data-mock="true">
          <UiChoiceCards
            v-model="exposurePreview"
            label="Exposición solar · T-17"
            :options="EXPOSURE_OPTIONS"
            :columns="4"
            data-test="species-exposure"
          />
          <UiSegmentedControl
            v-model="environmentPreview"
            label="Entorno recomendado · T-17"
            :options="ENVIRONMENT_OPTIONS"
            data-test="species-environment"
          />
          <p class="editor__hint">
            Estas elecciones permiten revisar el diseño, pero no se guardan hasta que T-17 amplíe
            el contrato de especie.
          </p>
        </div>

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

      <!-- La forma final del calendario, todavía vacío para no inventar meses de la especie. -->
      <UiFormSection
        id="species-editor-seasons"
        standalone
        title="Crecimiento y floración"
        description="Referencia anual orientativa para el clima en el que se cultiva la colección."
        data-test="species-seasons"
      >
        <div class="year-preview" data-mock="true">
          <UiYearGrid
            :rows="YEAR_ROWS"
            :legend="YEAR_LEGEND"
            data-test="species-year-grid"
          />
          <p>
            Ningún mes está seleccionado: los periodos, incluido uno que cruce diciembre, llegan
            con <strong>T-17</strong>.
          </p>
        </div>

        <div class="flowering-fields" data-mock="true">
          <UiField label="Color de la flor" placeholder="Disponible con T-17" disabled />
          <UiField label="Madurez aproximada" placeholder="Disponible con T-17" disabled />
          <UiField label="Duración habitual" placeholder="Disponible con T-17" disabled />
          <div class="flowering-fields__wide">
            <UiField
              label="Condiciones y notas"
              as="textarea"
              :rows="3"
              placeholder="Disponible con T-17"
              disabled
            />
          </div>
        </div>
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

.pending-care {
  display: grid;
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

.photo-guide {
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  list-style: none;
  margin: var(--space-4) 0;
  padding: 0;
}

.photo-guide li {
  align-items: center;
  background: var(--color-canvas);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  display: grid;
  gap: var(--space-1) var(--space-2);
  grid-template-columns: auto 1fr;
  padding: var(--space-3);
}

.photo-guide li > span {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: 50%;
  color: var(--color-brand);
  display: flex;
  grid-row: 1 / span 2;
  height: 32px;
  justify-content: center;
  width: 32px;
}

.photo-guide strong,
.photo-guide small {
  display: block;
}

.photo-guide strong {
  font-size: var(--font-size-12);
}

.photo-guide small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}

.year-preview {
  overflow-x: auto;
}

.year-preview > p {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin: var(--space-2) 0 0;
}

.flowering-fields {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: var(--space-5);
}

.flowering-fields__wide {
  grid-column: 1 / -1;
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

@media (max-width: 680px) {
  .photo-guide,
  .flowering-fields,
  .range {
    grid-template-columns: 1fr;
  }

  .flowering-fields__wide {
    grid-column: auto;
  }

  .year-preview :deep(.year) {
    min-width: 620px;
  }
}
</style>
