<script setup lang="ts">
/**
 * El editor de una planta, compartido por el alta y la edición (§5.4).
 *
 * Sigue la pantalla del wireframe: seis secciones **todas a la vista**, con una navegación lateral
 * pegada al scroll que **desplaza** hasta cada una en lugar de ocultar las demás. Es lo correcto
 * para un formulario: ver el conjunto es parte de decidir qué rellenar, y ocultar secciones
 * obliga a recorrerlas para saber si falta algo. El pie con las acciones también queda pegado,
 * para no tener que volver arriba a guardar.
 *
 * **Lo que el API guarda es real; lo que no, va marcado y deshabilitado.** `POST /plants` y
 * `PUT /plants/{id}` aceptan apodo, localización, especie, descripción, germinación, adquisición y
 * procedencia; el estado inicial solo en el alta. Las etiquetas al crear, las fotografías (T-19) y
 * los cuidados personalizados (`cuidados-por-ejemplar`) no tienen dónde guardarse todavía. Un
 * formulario que parece guardar y no guarda es peor que uno que no deja editar.
 */
import { useCatalogs } from '@features/catalogs/composables/useCatalogs'
import { useLocations } from '@features/locations/composables/useLocations'
import type { LocationSummary } from '@features/locations/types/location.types'
import type { SpeciesCare, SpeciesSummary } from '@features/species/types/species.types'
import { validateRange } from '@shared/utils/careRanges'
import { useSoilMixes } from '@features/soil-mixes/composables/useSoilMixes'
import type { SoilMix } from '@features/soil-mixes/types/soilMix.types'
import {
  EMPTY_CARE,
  INITIAL_STATUSES,
  ORIGINS,
  ORIGIN_LABELS,
  STATUS_LABELS,
  type ProfileFields,
} from '../mappers/plantProfile'
import type { PlantStatus } from '../types/plant.types'

/**
 * Lo que el formulario entrega. La ficha ampliada va como **texto**, tal y como se teclea; quien
 * guarda la convierte con `toProfile`. El estado inicial solo existe en el alta.
 */
export interface PlantFormValues extends ProfileFields {
  nickname: string
  locationId: string
  speciesId: string
  status: PlantStatus
}

const props = withDefaults(defineProps<{
  initial?: Partial<PlantFormValues>
  submitting?: boolean
  submitLabel?: string
  /** En edición el código no se regenera ni se toca. */
  lockedCode?: string
}>(), {
  initial: () => ({}),
  submitting: false,
  submitLabel: 'Guardar',
  lockedCode: undefined,
})

const emit = defineEmits<{ submit: [PlantFormValues] }>()

const { listSpecies, speciesCare } = useCatalogs()
const { loadAll: loadLocations } = useLocations()
const { list: listSoilMixes } = useSoilMixes()

const nickname = ref(props.initial.nickname ?? '')
const locationId = ref(props.initial.locationId ?? '')
const speciesId = ref(props.initial.speciesId ?? '')

/** El estado solo se elige al **dar de alta**: después cambia por su propia acción, que deja rastro. */
const creating = computed(() => props.lockedCode === undefined)
const status = ref<PlantStatus>(props.initial.status ?? 'activa')
const description = ref(props.initial.description ?? '')
const origin = ref(props.initial.origin ?? '')
const originNote = ref(props.initial.originNote ?? '')
const acquiredOn = ref(props.initial.acquiredOn ?? '')
const germinationYear = ref(props.initial.germinationYear ?? '')
const germinationMonth = ref(props.initial.germinationMonth ?? '')

const statusOptions = INITIAL_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))
const originOptions = ORIGINS.map((value) => ({ value, label: ORIGIN_LABELS[value] }))
const monthOptions = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  .map((label, index) => ({ value: String(index + 1), label: label.charAt(0).toUpperCase() + label.slice(1) }))

/** El mes sin año no significa nada: sin año no se puede elegir, y quitar el año borra el mes. */
const monthDisabled = computed(() => germinationYear.value.trim() === '')
watch(germinationYear, (year) => {
  if (year.trim() === '') germinationMonth.value = ''
})

const locations = ref<LocationSummary[]>([])
const species = ref<SpeciesSummary[]>([])
const selectedSpecies = ref<SpeciesCare | null>(null)

/**
 * El código que lleva —o llevará— el ejemplar. En edición es el real y no cambia; en el alta es el
 * de la especie elegida con el número **pendiente**, porque ese número no existe hasta guardar:
 * inventarlo aquí sería enseñar un código que luego puede ser otro.
 */
const codeLabel = computed(() => props.lockedCode
  ?? (selectedSpecies.value ? `${selectedSpecies.value.code}-··` : '····-··'))

const loading = ref(true)
const loadError = ref<string | null>(null)
const fieldErrors = reactive({ germinationYear: '', nickname: '', location: '', species: '' })

const SECTIONS = [
  { value: 'species', label: 'Especie y código' },
  { value: 'identity', label: 'Identificación' },
  { value: 'location', label: 'Localización' },
  { value: 'origin', label: 'Origen y edad' },
  { value: 'photos', label: 'Fotografías' },
  { value: 'care', label: 'Cuidados efectivos' },
]

const section = ref('species')

/** Las secciones cuyos datos ya están completos: guía sin obligar a recorrerlas todas. */
const done = computed(() => [
  ...(speciesId.value ? ['species'] : []),
  ...(nickname.value.trim() ? ['identity'] : []),
  ...(locationId.value ? ['location'] : []),
])

/** La navegación **desplaza**, no oculta: todas las secciones siguen a la vista. */
function goToSection(value: string) {
  section.value = value
  document.getElementById(`plant-editor-${value}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Ya montado, no en `setup`: ver ADR-013.
onMounted(async () => {
  const [locationsResult, speciesResult] = await Promise.all([loadLocations(), listSpecies()])
  loading.value = false

  const failed = [locationsResult, speciesResult].find((result) => !result.success)
  if (failed) {
    loadError.value = failed.error!.message
    return
  }

  locations.value = locationsResult.data!
  species.value = speciesResult.data!.content
})

// Los rangos solo están en la ficha de la especie, así que se piden al seleccionarla.
watch(speciesId, async (id) => {
  if (!id) {
    selectedSpecies.value = null
    return
  }
  const result = await speciesCare(id)
  selectedSpecies.value = result.success ? result.data! : null
}, { immediate: true })

/** Buscador de especie: filtra lo ya cargado, sin ir al API. La búsqueda real es T-21. */
const speciesQuery = ref('')

const shownSpecies = computed(() => {
  const needle = speciesQuery.value.trim().toLowerCase()
  if (!needle) return species.value
  return species.value.filter((item) =>
    `${item.scientificName} ${item.commonName}`.toLowerCase().includes(needle))
})

/** Cada opción lleva su ruta completa: dos «Bandeja A3» de invernaderos distintos no se distinguirían por el nombre. */
const locationOptions = computed(() => locations.value.map((location) => ({
  value: location.id,
  label: location.path || location.name,
})))

const selectedLocation = computed(
  () => locations.value.find((location) => location.id === locationId.value) ?? null,
)

/** La pauta heredada, en el mismo formato comparable que «de un vistazo». */
const inherited = computed(() => (selectedSpecies.value
  ? [
      { label: 'Temperatura', value: `${selectedSpecies.value.minTemperature}–${selectedSpecies.value.maxTemperature} °C` },
      { label: 'Humedad', value: `${selectedSpecies.value.minHumidity}–${selectedSpecies.value.maxHumidity} %` },
      { label: 'Riego', value: selectedSpecies.value.wateringGuideline },
      { label: 'Sustrato', value: selectedSpecies.value.soilMix.name },
    ]
  : []))

/**
 * La personalización de cuidados (historia 0.7). Desactivada, el ejemplar hereda toda la pauta de su
 * especie y no se envía nada aunque queden valores escritos; activada, solo lo que se rellene se
 * sobrescribe y lo demás se sigue heredando. La edición de un ejemplar que ya sobrescribe algo
 * llega con ella activa y con sus valores.
 */
const careEnabled = ref(props.initial.careEnabled ?? false)
const care = reactive({ ...EMPTY_CARE, ...props.initial.care })

/** Un error por rango, junto a su rango: en un editor de tres rangos, «algo falla» obliga a buscar cuál. */
const careErrors = reactive({ humidity: '', temperature: '', light: '' })

/** El catálogo de mezclas para el sustrato propio. Si no carga, el resto del editor sigue sirviendo. */
const soilMixes = ref<SoilMix[]>([])
const soilMixOptions = computed(() => soilMixes.value.map((mix) => ({ value: mix.id, label: mix.name })))

watch(careEnabled, async (enabled) => {
  if (!enabled || soilMixes.value.length) return
  const result = await listSoilMixes()
  if (result.success) soilMixes.value = result.data!.content
}, { immediate: true })

/** El valor heredado, como referencia al lado de cada campo propio. */
const inheritedCare = computed(() => selectedSpecies.value && {
  humidity: `${selectedSpecies.value.minHumidity}–${selectedSpecies.value.maxHumidity} %`,
  temperature: `${selectedSpecies.value.minTemperature}–${selectedSpecies.value.maxTemperature} °C`,
  light: `${selectedSpecies.value.minLightHours}–${selectedSpecies.value.maxLightHours} h`,
  watering: selectedSpecies.value.wateringGuideline,
  soilMix: selectedSpecies.value.soilMix.name,
})

/**
 * La misma validación al salir de un campo, para los cuidados propios: el máximo que queda por
 * debajo del mínimo, o el mínimo por encima del máximo, se señala al salir del campo. Se juzga contra
 * el otro extremo que se aplicaría —el propio si lo hay y, si no, el de la especie—. Con la
 * personalización desactivada no hay nada que validar.
 */
function blurCare(concept: 'humidity' | 'temperature' | 'light') {
  if (!careEnabled.value) {
    careErrors[concept] = ''
    return
  }
  const species = selectedSpecies.value
  const [own, inherited] = {
    humidity: [[care.minHumidity, care.maxHumidity], species && { min: species.minHumidity, max: species.maxHumidity }],
    temperature: [[care.minTemperature, care.maxTemperature], species && { min: species.minTemperature, max: species.maxTemperature }],
    light: [[care.minLightHours, care.maxLightHours], species && { min: species.minLightHours, max: species.maxLightHours }],
  }[concept] as [[string, string], { min: number, max: number } | null]
  careErrors[concept] = validateRange(concept, own[0], own[1], inherited ?? undefined)
}

// Con un error a la vista, corregir el valor lo revalida al teclear; y cambiar de especie revalida
// contra la nueva herencia.
watch(
  () => [
    care.minHumidity, care.maxHumidity, care.minTemperature, care.maxTemperature,
    care.minLightHours, care.maxLightHours, selectedSpecies.value?.id,
  ],
  () => {
    for (const concept of ['humidity', 'temperature', 'light'] as const) {
      if (careErrors[concept]) blurCare(concept)
    }
  },
)

function validate(): boolean {
  fieldErrors.nickname = nickname.value.trim() === '' ? 'El nickname es obligatorio.' : ''
  fieldErrors.location = locationId.value === '' ? 'Elige una localización.' : ''
  fieldErrors.species = speciesId.value === '' ? 'Elige una especie.' : ''
  // Una comprobación de rango, permitida en el borde: el servidor la repite.
  const year = germinationYear.value.trim()
  fieldErrors.germinationYear = year !== '' && !(Number.isInteger(Number(year)) && Number(year) >= 1900 && Number(year) <= 2100)
    ? 'El año de germinación debe estar entre 1900 y 2100.'
    : ''

  // Los cuidados propios solo se juzgan si la personalización está activa: desactivada no se envía
  // nada, así que lo que quede escrito no puede bloquear el guardado. Cada extremo se juzga contra el
  // otro que se aplicaría —el propio si lo hay y, si no, el de la especie—.
  const species = selectedSpecies.value
  if (careEnabled.value) {
    careErrors.humidity = validateRange('humidity', care.minHumidity, care.maxHumidity,
      species && { min: species.minHumidity, max: species.maxHumidity })
    careErrors.temperature = validateRange('temperature', care.minTemperature, care.maxTemperature,
      species && { min: species.minTemperature, max: species.maxTemperature })
    careErrors.light = validateRange('light', care.minLightHours, care.maxLightHours,
      species && { min: species.minLightHours, max: species.maxLightHours })
  } else {
    careErrors.humidity = careErrors.temperature = careErrors.light = ''
  }
  const careInvalid = !!(careErrors.humidity || careErrors.temperature || careErrors.light)

  // Si falta algo, llevar a su sección: en un formulario de seis, decir «falta un campo» no basta.
  const missing = fieldErrors.species
    ? 'species'
    : fieldErrors.nickname
      ? 'identity'
      : fieldErrors.location
        ? 'location'
        : fieldErrors.germinationYear ? 'origin' : careInvalid ? 'care' : null
  if (missing) goToSection(missing)

  return !missing
}

function submit() {
  if (!validate()) return
  emit('submit', {
    nickname: nickname.value.trim(),
    locationId: locationId.value,
    speciesId: speciesId.value,
    status: status.value,
    description: description.value,
    origin: origin.value,
    originNote: originNote.value,
    acquiredOn: acquiredOn.value,
    germinationYear: germinationYear.value,
    germinationMonth: germinationMonth.value,
    careEnabled: careEnabled.value,
    care: { ...care },
  })
}
</script>

<template>
  <form data-test="plant-form" class="editor" @submit.prevent="submit">
    <UiEditorNav
      :model-value="section"
      :sections="SECTIONS"
      :done="done"
      @update:model-value="goToSection"
    />

    <div class="editor__content">
      <UiInlineError v-if="loadError" data-test="catalogs-error">{{ loadError }}</UiInlineError>

      <!-- 1. Especie y código -->
      <UiFormSection id="plant-editor-species" standalone title="Especie y código" description="La especie define el código y la pauta de cuidados inicial.">

        <UiField
          v-model="speciesQuery"
          label="Buscar especie"
          help="Por nombre científico o común"
          data-test="species-search"
        />

        <p v-if="fieldErrors.species" class="editor__error" data-test="species-error">
          {{ fieldErrors.species }}
        </p>

        <div class="species-list" role="radiogroup" aria-label="Seleccionar especie">
          <button
            v-for="item in shownSpecies"
            :key="item.id"
            type="button"
            role="radio"
            class="species-option"
            :class="{ 'is-selected': item.id === speciesId }"
            :aria-checked="item.id === speciesId"
            :data-test="`species-${item.id}`"
            @click="speciesId = item.id"
          >
            <span class="species-option__thumb" aria-hidden="true">✺</span>
            <span>
              <strong><em>{{ item.scientificName }}</em></strong>
              <small>{{ item.commonName }}</small>
            </span>
            <span class="species-option__check" aria-hidden="true">✓</span>
          </button>
          <p v-if="!shownSpecies.length && !loading" class="editor__hint">
            Ninguna especie coincide con la búsqueda.
          </p>
        </div>

        <!--
          El código como etiqueta física: es el elemento característico del sistema de diseño —los
          ejemplares se etiquetan de verdad—, y ver la etiqueta antes de guardar es lo que hace
          entender que el código es permanente.
        -->
        <div class="code-block" data-test="code-block">
          <div class="code-block__preview">
            <span class="tag-preview">
              <small>CACTIFY · EJEMPLAR</small>
              <strong data-test="code-preview">{{ codeLabel }}</strong>
              <em>{{ selectedSpecies?.scientificName ?? 'Elige una especie' }}</em>
            </span>
          </div>
          <div>
            <span class="code-block__label">Código de inventario</span>
            <p v-if="lockedCode">
              El código de un ejemplar es permanente: no cambia aunque cambies su especie o su
              localización, porque la etiqueta ya pegada en la maceta tiene que seguir valiendo.
            </p>
            <p v-else>
              Se asigna <strong>al guardar</strong>, con el siguiente número disponible de la
              especie. No volverá a utilizarse aunque la planta se archive.
            </p>
            <span class="locked-code">
              <span aria-hidden="true">⌑</span>
              <code data-test="locked-code">{{ codeLabel }}</code>
            </span>
          </div>
        </div>
      </UiFormSection>

      <!-- 2. Identificación -->
      <UiFormSection id="plant-editor-identity" standalone title="Identificación" description="Datos propios de este ejemplar, no de toda la especie.">

        <div class="editor__grid">
          <UiField
            v-model="nickname"
            label="Apodo o nombre interno"
            data-test="nickname"
            :error="fieldErrors.nickname"
            error-test="nickname-error"
          />
          <!-- El estado solo se elige al dar de alta: después cambia por su propia acción, que deja rastro. -->
          <UiField
            v-if="creating"
            v-model="status"
            label="Estado inicial"
            as="select"
            :options="statusOptions"
            help="Un ejemplar nace en curso. Cambiarlo después deja constancia en su historial."
            data-test="status"
          />
          <div class="editor__span">
            <UiField
              v-model="description"
              label="Descripción"
              as="textarea"
              :rows="4"
              help="Qué es este ejemplar: rasgos, particularidades, lo que quieras recordar."
              data-test="description"
            />
          </div>
          <div class="editor__span">
            <UiField
              label="Etiquetas"
              disabled
              help="El alta no admite etiquetas todavía: se asignan desde la ficha."
              data-mock="true"
            />
          </div>
        </div>
      </UiFormSection>

      <!-- 3. Localización -->
      <UiFormSection id="plant-editor-location" standalone title="Localización" description="Su posición física. Podrás moverla más adelante conservando el historial.">

        <UiField
          v-model="locationId"
          label="Localización"
          as="select"
          placeholder="Elige una localización"
          :options="locationOptions"
          data-test="location"
          :error="fieldErrors.location"
          error-test="location-error"
        />

        <div v-if="selectedLocation" class="location-picked">
          <span class="location-picked__mark" aria-hidden="true">▦</span>
          <span>
            <small>Ubicación seleccionada</small>
            <strong>{{ selectedLocation.path || selectedLocation.name }}</strong>
            <em v-if="selectedLocation.plantCountTotal !== undefined" data-test="location-load">{{ selectedLocation.plantCountTotal }} {{ selectedLocation.plantCountTotal === 1 ? 'planta' : 'plantas' }} en esta ubicación</em>
          </span>
        </div>
      </UiFormSection>

      <!-- 4. Origen y edad -->
      <UiFormSection id="plant-editor-origin" standalone title="Origen y edad" description="Registra lo que conozcas. El mes de germinación puede quedar sin especificar.">

        <div class="editor__grid">
          <UiField
            v-model="origin"
            label="Procedencia"
            as="select"
            placeholder="Sin especificar"
            :options="originOptions"
            data-test="origin"
          />
          <UiField
            v-model="originNote"
            label="Detalle de la procedencia"
            help="El vivero, a quién se compró, con quién se intercambió…"
            data-test="origin-note"
          />
          <UiField v-model="acquiredOn" label="Fecha de entrada en la colección" type="date" data-test="acquired-on" />
          <UiField
            v-model="germinationYear"
            label="Año de germinación"
            type="number"
            min="1900"
            max="2100"
            :error="fieldErrors.germinationYear"
            error-test="germination-year-error"
            data-test="germination-year"
          />
          <UiField
            v-model="germinationMonth"
            label="Mes de germinación"
            as="select"
            placeholder="Sin especificar"
            :options="monthOptions"
            :disabled="monthDisabled"
            help="Solo con año. Si no lo conoces, déjalo sin especificar: no se inventa."
            data-test="germination-month"
          />
        </div>
      </UiFormSection>

      <!-- 5. Fotografías -->
      <UiFormSection id="plant-editor-photos" standalone title="Fotografías iniciales" description="Son opcionales. La principal identificará la planta en el inventario.">

        <div data-mock="true">
          <UiUploadArea
            label="Arrastra fotografías o selecciónalas"
            accept="image/*"
            hint="JPG, PNG o WebP · hasta 10 MB cada una"
            action-label="Seleccionar archivos"
            layout="inline"
            mark="▧"
            disabled
            data-test="plant-photo-upload"
          />
        </div>
        <ul class="photo-purpose">
          <li>Una foto general</li>
          <li>Un detalle reconocible</li>
          <li>La etiqueta física, si existe</li>
        </ul>
        <p class="editor__hint">
          El almacenamiento llega en <strong>T-19</strong>, que necesita antes su propio ADR. Lo que
          elijas aquí no se guarda.
        </p>
      </UiFormSection>

      <!-- 6. Cuidados efectivos -->
      <UiFormSection id="plant-editor-care" standalone title="Cuidados efectivos" description="La planta hereda la pauta de su especie. Personaliza solo lo que sea distinto.">

        <UiInheritanceSummary
          v-if="selectedSpecies"
          :source="selectedSpecies.scientificName"
          :items="inherited"
          data-test="species-ranges"
        />
        <p v-else class="editor__hint">Elige una especie para ver la pauta que heredará.</p>

        <button
          type="button"
          class="override-toggle"
          role="switch"
          :aria-checked="careEnabled"
          data-test="override-toggle"
          @click="careEnabled = !careEnabled"
        >
          <span>
            <strong>Personalizar cuidados para esta planta</strong>
            <small>
              Los cambios futuros de la especie seguirán aplicándose a los campos no personalizados.
            </small>
          </span>
          <i aria-hidden="true" />
        </button>

        <div v-if="careEnabled" class="overrides" data-test="care-editor">
          <p class="editor__hint">
            Rellena <strong>solo lo que sea distinto</strong> de la especie: lo que dejes vacío se
            sigue heredando.
          </p>

          <fieldset class="care-concept">
            <legend>Humedad</legend>
            <UiField v-model="care.minHumidity" @blur="blurCare('humidity')" label="Mínima (%)" type="number" min="0" max="100"
              :placeholder="selectedSpecies ? String(selectedSpecies.minHumidity) : undefined" data-test="care-min-humidity" />
            <UiField v-model="care.maxHumidity" @blur="blurCare('humidity')" label="Máxima (%)" type="number" min="0" max="100"
              :placeholder="selectedSpecies ? String(selectedSpecies.maxHumidity) : undefined" data-test="care-max-humidity" />
            <small v-if="inheritedCare" data-test="care-inherited-humidity">Heredado: {{ inheritedCare.humidity }}</small>
            <p v-if="careErrors.humidity" class="care-error" role="alert" data-test="care-humidity-error">{{ careErrors.humidity }}</p>
          </fieldset>

          <fieldset class="care-concept">
            <legend>Temperatura</legend>
            <UiField v-model="care.minTemperature" @blur="blurCare('temperature')" label="Mínima (°C)" type="number"
              :placeholder="selectedSpecies ? String(selectedSpecies.minTemperature) : undefined" data-test="care-min-temperature" />
            <UiField v-model="care.maxTemperature" @blur="blurCare('temperature')" label="Máxima (°C)" type="number"
              :placeholder="selectedSpecies ? String(selectedSpecies.maxTemperature) : undefined" data-test="care-max-temperature" />
            <small v-if="inheritedCare" data-test="care-inherited-temperature">Heredado: {{ inheritedCare.temperature }}</small>
            <p v-if="careErrors.temperature" class="care-error" role="alert" data-test="care-temperature-error">{{ careErrors.temperature }}</p>
          </fieldset>

          <fieldset class="care-concept">
            <legend>Horas de luz</legend>
            <UiField v-model="care.minLightHours" @blur="blurCare('light')" label="Mínimas (h)" type="number" min="0" max="24"
              :placeholder="selectedSpecies ? String(selectedSpecies.minLightHours) : undefined" data-test="care-min-light" />
            <UiField v-model="care.maxLightHours" @blur="blurCare('light')" label="Máximas (h)" type="number" min="0" max="24"
              :placeholder="selectedSpecies ? String(selectedSpecies.maxLightHours) : undefined" data-test="care-max-light" />
            <small v-if="inheritedCare" data-test="care-inherited-light">Heredado: {{ inheritedCare.light }}</small>
            <p v-if="careErrors.light" class="care-error" role="alert" data-test="care-light-error">{{ careErrors.light }}</p>
          </fieldset>

          <fieldset class="care-concept">
            <legend>Riego</legend>
            <UiField v-model="care.wateringGuideline" label="Pauta de riego propia"
              :placeholder="selectedSpecies?.wateringGuideline" data-test="care-watering" />
            <small v-if="inheritedCare" data-test="care-inherited-watering">Heredado: {{ inheritedCare.watering }}</small>
          </fieldset>

          <fieldset class="care-concept">
            <legend>Sustrato</legend>
            <UiField v-model="care.soilMixId" label="Sustrato propio" as="select" placeholder="El de la especie"
              :options="soilMixOptions" data-test="care-soil-mix" />
            <small v-if="inheritedCare" data-test="care-inherited-soil">Heredado: {{ inheritedCare.soilMix }}</small>
          </fieldset>

          <p class="editor__hint" data-mock="true">
            La exposición y el entorno propios llegan con <strong>T-17</strong>: la especie todavía no los tiene.
          </p>
        </div>
      </UiFormSection>

      <footer class="editor__actions">
        <span class="editor__impact">
          Se guardan <strong>especie</strong>, <strong>apodo</strong> y
          <strong>localización</strong>; los campos deshabilitados llegan con su ticket.
        </span>
        <div>
          <slot name="secondary-action">
            <UiButton variant="secondary" to="/plants">Cancelar</UiButton>
          </slot>
          <UiButton type="submit" :busy="submitting">{{ submitLabel }}</UiButton>
        </div>
      </footer>
    </div>
  </form>
</template>

<style scoped>
.editor {
  align-items: start;
  display: grid;
  gap: var(--space-5);
  grid-template-columns: 205px minmax(0, 1fr);
}

.editor__content {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}


.editor__grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 1fr 1fr;
}

.editor__span {
  grid-column: 1 / -1;
}

.editor__hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-3) 0 0;
}

.editor__error {
  color: var(--color-danger);
  font-size: var(--font-size-12);
  margin: var(--space-2) 0 0;
}

.species-list {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.species-option {
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto 1fr auto;
  min-height: 66px;
  padding: var(--space-2) var(--space-3);
  text-align: left;
  width: 100%;
}

.species-option:hover {
  border-color: var(--color-line-strong);
}

/* La elegida gana fondo, borde y una barra interior: no depende de la marca de comprobación. */
.species-option.is-selected {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
  box-shadow: inset 3px 0 var(--color-brand);
}

.species-option__thumb {
  align-items: center;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  color: var(--color-brand);
  display: flex;
  font-size: var(--font-size-17);
  height: 43px;
  justify-content: center;
  width: 43px;
}

.species-option strong,
.species-option small {
  display: block;
}

.species-option small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

/* La marca ocupa su sitio siempre: aparecer y desaparecer movería la fila entera. */
.species-option__check {
  align-items: center;
  background: var(--color-brand);
  border-radius: 50%;
  color: var(--color-sidebar-text);
  display: flex;
  font-size: var(--font-size-12);
  height: 23px;
  justify-content: center;
  opacity: 0;
  width: 23px;
}

.species-option.is-selected .species-option__check {
  opacity: 1;
}

.code-block {
  background: var(--color-sidebar);
  border-radius: var(--radius-md);
  color: var(--color-sidebar-text);
  display: grid;
  gap: var(--space-5);
  grid-template-columns: minmax(240px, 0.9fr) 1.1fr;
  margin-top: var(--space-4);
  padding: var(--space-4);
}

.code-block__preview {
  align-items: center;
  border-right: 1px solid color-mix(in srgb, var(--color-sidebar-text) 14%, transparent);
  display: flex;
  justify-content: center;
  padding-right: var(--space-4);
}

.code-block__label {
  color: color-mix(in srgb, var(--color-sidebar-text) 75%, transparent);
  display: block;
  font-size: var(--font-size-12);
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.code-block p {
  color: color-mix(in srgb, var(--color-sidebar-text) 68%, transparent);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-3);
}

/* Una etiqueta de inventario de verdad: el troquel discontinuo es lo que la hace reconocible. */
.tag-preview {
  background: var(--color-canvas);
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  display: block;
  min-height: 104px;
  padding: var(--space-3) var(--space-4);
  position: relative;
  width: min(310px, 100%);
}

.tag-preview::before {
  border: 1px dashed var(--color-line-strong);
  border-radius: 2px;
  bottom: 7px;
  content: '';
  left: 7px;
  position: absolute;
  right: 7px;
  top: 7px;
}

.tag-preview small,
.tag-preview strong,
.tag-preview em {
  display: block;
  position: relative;
  z-index: 1;
}

.tag-preview small {
  color: var(--color-ink-muted);
  font-family: var(--font-mono);
  font-size: var(--font-size-11);
  letter-spacing: 0.12em;
}

.tag-preview strong {
  font-family: var(--font-mono);
  font-size: var(--font-size-24);
  letter-spacing: 0.05em;
  margin: var(--space-4) 0 var(--space-1);
}

.tag-preview em {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

.locked-code {
  align-items: center;
  background: color-mix(in srgb, var(--color-sidebar-text) 9%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-sidebar-text) 15%, transparent);
  border-radius: var(--radius-sm);
  display: grid;
  gap: var(--space-2);
  grid-template-columns: auto auto 1fr;
  min-height: 42px;
  padding: var(--space-1) var(--space-2);
}

.locked-code code {
  color: var(--color-sidebar-text);
  font-family: var(--font-mono);
}

.locked-code small {
  color: color-mix(in srgb, var(--color-sidebar-text) 68%, transparent);
  font-size: var(--font-size-11);
  text-align: right;
}

.location-picked {
  align-items: center;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto 1fr;
  margin-top: var(--space-4);
  min-height: 70px;
  padding: var(--space-2) var(--space-3);
}

.location-picked__mark {
  align-items: center;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  display: flex;
  height: 43px;
  justify-content: center;
  width: 43px;
}

.location-picked small,
.location-picked strong,
.location-picked em {
  display: block;
}

.location-picked small,
.location-picked em {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}

.photo-purpose {
  color: var(--color-ink-faint);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--font-size-12);
  gap: var(--space-4);
  list-style: none;
  margin: var(--space-3) 0 0;
  padding: 0;
}

.photo-purpose li::before {
  color: var(--color-brand);
  content: '○';
  margin-right: var(--space-1);
}

.care-concept {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  margin: 0 0 var(--space-3);
  padding: var(--space-3);
}

.care-concept legend {
  font-weight: 700;
  padding: 0 var(--space-1);
}

.care-error {
  color: var(--color-danger);
  font-size: var(--font-size-12);
  grid-column: 1 / -1;
  margin: 0;
}

.care-concept small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  grid-column: 1 / -1;
}

.override-toggle {
  align-items: center;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--color-line);
  display: flex;
  gap: var(--space-5);
  justify-content: space-between;
  margin-top: var(--space-4);
  padding: var(--space-3) 2px 3px;
  text-align: left;
  width: 100%;
}

.override-toggle strong,
.override-toggle small {
  display: block;
}

.override-toggle small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin-top: 3px;
}

.override-toggle i {
  background: var(--color-line-strong);
  border-radius: var(--radius-pill);
  flex-shrink: 0;
  height: 24px;
  position: relative;
  transition: background var(--duration-fast) var(--ease-standard);
  width: 43px;
}

.override-toggle i::after {
  background: var(--color-surface);
  border-radius: 50%;
  content: '';
  height: 18px;
  left: 3px;
  position: absolute;
  top: 3px;
  transition: transform var(--duration-fast) var(--ease-standard);
  width: 18px;
}

.override-toggle[aria-checked="true"] i {
  background: var(--color-brand);
}

.override-toggle[aria-checked="true"] i::after {
  transform: translateX(19px);
}

.overrides__warning {
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  margin: var(--space-2) 0 0;
  padding: var(--space-2) var(--space-3);
}

.overrides__warning strong,
.overrides__warning small {
  display: block;
}

.overrides__warning small {
  font-size: var(--font-size-12);
}

/* El pie queda a la vista: en un formulario largo, guardar no debería exigir volver arriba. */
.editor__actions {
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  bottom: var(--space-3);
  box-shadow: var(--shadow-overlay);
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  position: sticky;
  z-index: 20;
}

.editor__actions > div {
  display: flex;
  gap: var(--space-2);
}

.editor__impact {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

@media (max-width: 900px) {
  .editor {
    grid-template-columns: 1fr;
  }

  .editor__grid,
  .code-block {
    grid-template-columns: 1fr;
  }

  .code-block__preview {
    border-bottom: 1px solid color-mix(in srgb, var(--color-sidebar-text) 14%, transparent);
    border-right: 0;
    padding: 0 0 var(--space-4);
  }
}
</style>
