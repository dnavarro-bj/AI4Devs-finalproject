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
 * **Casi todo el editor es maqueta todavía**, y va marcado y deshabilitado: `POST /plants` acepta
 * exactamente `nickname`, `locationId` y `speciesId`. El código (T-15), el estado, la descripción,
 * el origen y la edad (T-16), las etiquetas al crear, las fotografías (T-19) y los cuidados
 * personalizados (0.7) no tienen dónde guardarse. Un formulario que parece guardar y no guarda es
 * peor que uno que no deja editar.
 */
import { useCatalogs } from '@features/catalogs/composables/useCatalogs'
import type { Location } from '@features/catalogs/types/catalog.types'
import type { SpeciesCare, SpeciesSummary } from '@features/species/types/species.types'

export interface PlantFormValues {
  nickname: string
  locationId: string
  speciesId: string
}

const props = withDefaults(defineProps<{
  initial?: PlantFormValues
  submitting?: boolean
  submitLabel?: string
  /** En edición el código no se regenera ni se toca. */
  lockedCode?: string
}>(), {
  initial: () => ({ nickname: '', locationId: '', speciesId: '' }),
  submitting: false,
  submitLabel: 'Guardar',
  lockedCode: undefined,
})

const emit = defineEmits<{ submit: [PlantFormValues] }>()

const { listLocations, listSpecies, speciesCare } = useCatalogs()

const nickname = ref(props.initial.nickname)
const locationId = ref(props.initial.locationId)
const speciesId = ref(props.initial.speciesId)

const locations = ref<Location[]>([])
const species = ref<SpeciesSummary[]>([])
const selectedSpecies = ref<SpeciesCare | null>(null)

const loading = ref(true)
const loadError = ref<string | null>(null)
const fieldErrors = reactive({ nickname: '', location: '', species: '' })

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
  const [locationsResult, speciesResult] = await Promise.all([listLocations(), listSpecies()])
  loading.value = false

  const failed = [locationsResult, speciesResult].find((result) => !result.success)
  if (failed) {
    loadError.value = failed.error!.message
    return
  }

  locations.value = locationsResult.data!.content
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

const locationOptions = computed(() => locations.value.map((location) => ({
  value: location.id,
  label: location.name,
})))

const selectedLocation = computed(
  () => locations.value.find((location) => location.id === locationId.value) ?? null,
)

/** La pauta heredada, en el mismo formato comparable que «de un vistazo». */
const inherited = computed(() => (selectedSpecies.value
  ? [
      { label: 'Humedad', value: `${selectedSpecies.value.minHumidity}–${selectedSpecies.value.maxHumidity} %` },
      { label: 'Temperatura', value: `${selectedSpecies.value.minTemperature}–${selectedSpecies.value.maxTemperature} °C` },
      { label: 'Luz', value: `${selectedSpecies.value.minLightHours}–${selectedSpecies.value.maxLightHours} h` },
      { label: 'Riego', value: selectedSpecies.value.wateringGuideline },
    ]
  : []))

/** Personalizar cuidados no tiene dónde guardarse todavía (0.7 / T-16): el interruptor lo dice. */
const overridesOpen = ref(false)

function validate(): boolean {
  fieldErrors.nickname = nickname.value.trim() === '' ? 'El nickname es obligatorio.' : ''
  fieldErrors.location = locationId.value === '' ? 'Elige una localización.' : ''
  fieldErrors.species = speciesId.value === '' ? 'Elige una especie.' : ''

  // Si falta algo, llevar a su sección: en un formulario de seis, decir «falta un campo» no basta.
  const missing = fieldErrors.species ? 'species' : fieldErrors.nickname ? 'identity' : fieldErrors.location ? 'location' : null
  if (missing) goToSection(missing)

  return !missing
}

function submit() {
  if (!validate()) return
  emit('submit', {
    nickname: nickname.value.trim(),
    locationId: locationId.value,
    speciesId: speciesId.value,
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
        <div class="code-block" data-mock="true">
          <div class="code-block__preview">
            <span class="tag-preview">
              <small>CACTIFY · EJEMPLAR</small>
              <strong>{{ lockedCode ?? 'CAT-····-··' }}</strong>
              <em>{{ selectedSpecies?.scientificName ?? 'Elige una especie' }}</em>
            </span>
          </div>
          <div>
            <span class="code-block__label">Código de inventario</span>
            <p>
              Se asignará al guardar con el siguiente número disponible de la especie. No volverá a
              utilizarse aunque la planta se archive.
            </p>
            <span class="locked-code">
              <span aria-hidden="true">⌑</span>
              <code>{{ lockedCode ?? 'CAT-····-··' }}</code>
              <small>Dato de ejemplo hasta T-15</small>
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
          <UiField
            label="Estado inicial"
            as="select"
            :options="[{ value: 'active', label: 'Activa' }]"
            disabled
            help="El estado del ejemplar llega en T-16."
            data-mock="true"
          />
          <div class="editor__span">
            <UiField
              label="Descripción"
              as="textarea"
              :rows="4"
              disabled
              help="La descripción del ejemplar llega en T-16."
              data-mock="true"
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
            <strong>{{ selectedLocation.name }}</strong>
            <em data-mock="true">La ruta jerárquica y el recuento llegan en T-18.</em>
          </span>
        </div>
      </UiFormSection>

      <!-- 4. Origen y edad -->
      <UiFormSection id="plant-editor-origin" standalone title="Origen y edad" description="Registra lo que conozcas. El mes de germinación puede quedar sin especificar.">

        <div class="editor__grid">
          <UiField label="Procedencia" as="select" :options="[]" disabled data-mock="true" />
          <UiField label="Fecha de entrada en la colección" disabled data-mock="true" />
          <UiField label="Año de germinación" disabled data-mock="true" />
          <UiField label="Mes de germinación" as="select" :options="[]" disabled data-mock="true" />
        </div>
        <p class="editor__hint">
          El origen y la edad del ejemplar llegan en <strong>T-16</strong>: el API todavía no tiene
          dónde guardarlos.
        </p>
      </UiFormSection>

      <!-- 5. Fotografías -->
      <UiFormSection id="plant-editor-photos" standalone title="Fotografías iniciales" description="Son opcionales. La principal identificará la planta en el inventario.">

        <div data-mock="true">
          <UiUploadArea
            label="Añadir fotografías"
            accept="image/*"
            hint="JPG, PNG o WebP · hasta 10 MB cada una"
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

        <div v-if="selectedSpecies" class="inherited" data-test="species-ranges">
          <div class="inherited__from">
            <span class="species-option__thumb" aria-hidden="true">✺</span>
            <span>
              <small>Hereda de</small>
              <strong><em>{{ selectedSpecies.scientificName }}</em></strong>
            </span>
          </div>
          <UiSummaryGrid density="compact" :items="inherited" />
        </div>
        <p v-else class="editor__hint">Elige una especie para ver la pauta que heredará.</p>

        <button
          type="button"
          class="override-toggle"
          role="switch"
          :aria-checked="overridesOpen"
          data-mock="true"
          @click="overridesOpen = !overridesOpen"
        >
          <span>
            <strong>Personalizar cuidados para esta planta</strong>
            <small>
              Los cambios futuros de la especie seguirán aplicándose a los campos no personalizados.
            </small>
          </span>
          <i aria-hidden="true" />
        </button>

        <div v-if="overridesOpen" class="overrides">
          <p class="overrides__warning">
            <strong>Personalizar cuidados llega en T-16</strong>
            <small>
              La historia 0.7 necesita que el ejemplar tenga dónde guardar sus valores propios; hoy
              hereda todos los de su especie.
            </small>
          </p>
        </div>
      </UiFormSection>

      <footer class="editor__actions">
        <span class="editor__impact">
          Solo se guardan <strong>especie</strong>, <strong>apodo</strong> y
          <strong>localización</strong>: el resto llega con su ticket.
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

.inherited {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.inherited__from {
  align-items: center;
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.inherited__from small,
.inherited__from strong {
  display: block;
}

.inherited__from small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
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
