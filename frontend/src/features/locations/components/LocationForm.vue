<script setup lang="ts">
/**
 * El editor de localización, compartido por alta y corrección, con la composición de la pantalla
 * `location-editor` del prototipo: **posición en el vivero**, **identificación**, **características
 * del espacio** y un lateral que dice dónde se creará.
 *
 * El código se **propone** a partir del nombre y del padre mientras no se haya escrito a mano; el
 * servidor no genera nada (decisión 11 del change). Al corregir, el selector de padre **no ofrece**
 * la propia localización ni sus descendientes: el ciclo no es ni elegible, y el servidor lo rechaza
 * igualmente.
 */
import { useLocations } from '../composables/useLocations'
import type { LocationSubmitError } from '../composables/locationSubmitError'
import { suggestLocationCode } from '../mappers/locationCode'
import { descendantIds, locationOptions } from '../mappers/locationTree'
import {
  LOCATION_ENVIRONMENTS,
  LOCATION_ENVIRONMENT_LABELS,
  LOCATION_EXPOSURES,
  LOCATION_EXPOSURE_LABELS,
  LOCATION_EXPOSURE_MARKS,
  LOCATION_TYPES,
  LOCATION_TYPE_LABELS,
} from '../types/locationVocabulary'
import type {
  LocationEnvironment,
  LocationExposure,
  LocationInput,
  LocationSummary,
  LocationType,
} from '../types/location.types'

const props = withDefaults(defineProps<{
  initial: LocationInput
  /** La localización que se corrige; ausente en el alta. Sirve para excluirla a ella y a sus descendientes del selector de padre. */
  editingId?: string
  submitting?: boolean
  submitError?: LocationSubmitError | null
  submitLabel?: string
}>(), {
  editingId: undefined,
  submitting: false,
  submitError: null,
  submitLabel: 'Guardar localización',
})

const emit = defineEmits<{ submit: [input: LocationInput] }>()

const { loadAll } = useLocations()

const name = ref(props.initial.name)
const code = ref(props.initial.code)
const parentId = ref<string | null>(props.initial.parentId)
const description = ref(props.initial.description)
const locationType = ref<LocationType | ''>(props.initial.locationType ?? '')
const capacity = ref(props.initial.capacity === null ? '' : String(props.initial.capacity))
const operationalNotes = ref(props.initial.operationalNotes)
const environment = ref<LocationEnvironment | ''>(props.initial.environment ?? '')
const sunExposure = ref<LocationExposure | ''>(props.initial.sunExposure ?? '')

const errors = reactive({ name: '', code: '', capacity: '' })

const locations = ref<LocationSummary[]>([])
const loadError = ref<string | null>(null)
const picking = ref(false)
const parentQuery = ref('')

onMounted(async () => {
  const result = await loadAll()
  if (!result.success) {
    loadError.value = result.error!.message
    return
  }
  locations.value = result.data!
})

/**
 * El código solo se propone en el alta y mientras nadie lo haya tocado a mano. Al corregir ya hay
 * uno guardado, y reescribirlo en cada pulsación sería pisar un dato.
 */
const isCreation = props.initial.code === ''
const codeIsSuggested = ref(isCreation)

const parent = computed(() => locations.value.find((location) => location.id === parentId.value) ?? null)

function suggest() {
  if (codeIsSuggested.value) code.value = suggestLocationCode(name.value, parent.value?.code)
}

function onCodeInput(value: string) {
  code.value = value
  codeIsSuggested.value = isCreation && value.trim() === ''
  if (codeIsSuggested.value) suggest()
}

watch(name, suggest)
// El padre puede llegar con la lista, ya montado el formulario: la propuesta lo recoge entonces.
watch(parent, suggest)

const resultingPath = computed(() => {
  const own = name.value.trim() || (props.editingId ? props.initial.name : 'Nueva localización')
  return parent.value ? `${parent.value.path} / ${own}` : own
})

/** Al corregir, ni ella ni lo que cuelga de ella: hacerla hija de un descendiente sería un ciclo. */
const excluded = computed(() => (props.editingId ? descendantIds(locations.value, props.editingId) : new Set<string>()))
const parentOptions = computed(() => locationOptions(locations.value, excluded.value))

function pickParent(id: string | null) {
  parentId.value = id
  picking.value = false
  parentQuery.value = ''
  suggest()
}

const typeOptions = LOCATION_TYPES.map((value) => ({ value, label: LOCATION_TYPE_LABELS[value] }))
const environmentOptions = LOCATION_ENVIRONMENTS.map((value) => ({ value, label: LOCATION_ENVIRONMENT_LABELS[value] }))
const exposureOptions = LOCATION_EXPOSURES.map((value) => ({
  value,
  label: LOCATION_EXPOSURE_LABELS[value],
  mark: LOCATION_EXPOSURE_MARKS[value],
}))

const nameError = computed(() => (props.submitError?.field === 'name' ? props.submitError.message : errors.name))
const codeError = computed(() => (props.submitError?.field === 'code' ? props.submitError.message : errors.code))
const parentError = computed(() => (props.submitError?.field === 'parent' ? props.submitError.message : ''))
/** Un error sin campo propio se dice arriba, no se pierde. */
const generalError = computed(() => (props.submitError && props.submitError.field === null ? props.submitError.message : ''))

function validate(): boolean {
  errors.name = name.value.trim() ? '' : 'Escribe un nombre para la localización.'
  errors.code = code.value.trim() ? '' : 'El código es obligatorio.'

  const raw = capacity.value.trim()
  errors.capacity = raw === '' || (/^\d+$/.test(raw) && Number(raw) > 0)
    ? ''
    : 'La capacidad es un número entero mayor que cero.'

  return !errors.name && !errors.code && !errors.capacity
}

function submit() {
  if (!validate()) return
  emit('submit', {
    name: name.value.trim(),
    code: code.value.trim(),
    parentId: parentId.value,
    description: description.value,
    locationType: locationType.value || null,
    capacity: capacity.value.trim() === '' ? null : Number(capacity.value),
    operationalNotes: operationalNotes.value,
    environment: environment.value || null,
    sunExposure: sunExposure.value || null,
  })
}
</script>

<template>
  <form class="location-form" data-test="location-form" @submit.prevent="submit">
    <div class="location-form__content">
      <UiInlineError v-if="submitError && generalError" data-test="submit-error">{{ generalError }}</UiInlineError>
      <UiInlineError v-if="loadError" data-test="load-error">{{ loadError }}</UiInlineError>

      <UiFormSection
        standalone
        title="Posición en el vivero"
        description="Selecciona dónde quedará contenida esta localización."
        data-test="position-section"
      >
        <div class="parent-preview">
          <span class="parent-preview__mark" aria-hidden="true">⌖</span>
          <span>
            <strong data-test="parent-name">{{ parent ? parent.name : 'Toda la colección' }}</strong>
            <small data-test="resulting-path">Ruta resultante: <b>{{ resultingPath }}</b></small>
          </span>
          <UiButton variant="secondary" data-test="change-parent" @click="picking = !picking">
            {{ picking ? 'Cerrar' : 'Cambiar padre' }}
          </UiButton>
        </div>

        <UiInlineError v-if="parentError" data-test="parent-error">{{ parentError }}</UiInlineError>

        <div v-if="picking" class="parent-picker" data-test="parent-picker">
          <UiButton variant="secondary" data-test="pick-root" @click="pickParent(null)">
            Sin padre: en la raíz del vivero
          </UiButton>
          <UiEntityPicker
            v-model:query="parentQuery"
            :model-value="parentId ?? undefined"
            label="Contenida en"
            placeholder="Buscar por nombre, código o ruta"
            empty-message="No hay localizaciones que puedan contener a esta."
            :options="parentOptions"
            @update:model-value="pickParent"
          />
        </div>
      </UiFormSection>

      <UiFormSection
        standalone
        title="Identificación"
        description="Un nombre breve facilita encontrarla al mover plantas o crear tareas."
        data-test="identity-section"
      >
        <div class="field-grid">
          <UiField
            v-model="name"
            label="Nombre"
            placeholder="Por ejemplo, Bancada este"
            :error="nameError"
            error-test="name-error"
            autofocus
            data-test="name"
          />
          <UiField
            :model-value="code"
            label="Código corto"
            placeholder="LOC-I1-BE"
            help="Único en todo el vivero. Se propone desde el nombre, pero puedes escribir otro."
            :error="codeError"
            error-test="code-error"
            data-test="code"
            @update:model-value="onCodeInput"
          />
          <UiField
            v-model="locationType"
            label="Tipo"
            as="select"
            placeholder="Sin definir"
            :options="typeOptions"
            data-test="type"
          />
          <UiField
            v-model="capacity"
            label="Capacidad orientativa"
            type="number"
            min="1"
            step="1"
            unit="plantas"
            help="Ayuda a detectar zonas demasiado cargadas."
            :error="errors.capacity"
            error-test="capacity-error"
            data-test="capacity"
          />
          <UiField
            v-model="description"
            class="field-grid__wide"
            label="Descripción y referencias físicas"
            as="textarea"
            :rows="4"
            placeholder="Bancada junto a la entrada este, segunda desde el pasillo central."
            data-test="description"
          />
        </div>
      </UiFormSection>

      <UiFormSection
        standalone
        title="Características del espacio"
        description="Sirven como contexto para agrupar trabajo y detectar incompatibilidades."
        data-test="characteristics-section"
      >
        <div class="characteristics">
          <div>
            <UiSegmentedControl
              v-model="environment"
              label="Entorno"
              :options="environmentOptions"
              data-test="environment"
            />
            <UiButton v-if="environment" variant="ghost" data-test="clear-environment" @click="environment = ''">
              Dejar sin definir
            </UiButton>
          </div>
          <div>
            <UiChoiceCards
              v-model="sunExposure"
              label="Exposición predominante"
              :options="exposureOptions"
              :columns="4"
              data-test="exposure"
            />
            <UiButton v-if="sunExposure" variant="ghost" data-test="clear-exposure" @click="sunExposure = ''">
              Dejar sin definir
            </UiButton>
          </div>
          <UiField
            v-model="operationalNotes"
            label="Notas operativas"
            as="textarea"
            :rows="3"
            placeholder="Malla fija de sombreo. Acceso por el pasillo central."
            data-test="notes"
          />
        </div>
      </UiFormSection>
    </div>

    <aside class="location-form__aside">
      <article class="impact-note" data-test="impact-note">
        <strong data-test="impact-title">
          {{ parent ? `Se creará dentro de ${parent.name}` : 'Se creará en la raíz del vivero' }}
        </strong>
        <p>Podrás mover plantas aquí después de guardar la localización.</p>
      </article>

      <UiPanel title="Jerarquía recomendada">
        <p>
          Usa pocos niveles y nombres que existan físicamente. Una ruta como
          «Invernadero 1 / Bancada norte / Bandeja A3» se reconoce de un vistazo.
        </p>
      </UiPanel>
    </aside>

    <UiStickyActionBar
      class="location-form__actions"
      :message="editingId ? 'Los ejemplares que alberga no cambian.' : 'La nueva localización estará vacía.'"
    >
      <template #actions>
        <UiButton variant="secondary" :to="editingId ? `/locations/${editingId}` : '/locations'">Cancelar</UiButton>
        <UiButton type="submit" :busy="submitting" data-test="submit">
          {{ submitting ? 'Guardando…' : submitLabel }}
        </UiButton>
      </template>
    </UiStickyActionBar>
  </form>
</template>

<style scoped>
.location-form {
  align-items: start;
  display: grid;
  gap: var(--space-5);
  grid-template-columns: minmax(0, 1fr) 270px;
  padding-bottom: var(--space-8);
}

.location-form__content {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

.location-form__aside {
  display: grid;
  gap: var(--space-3);
  position: sticky;
  top: calc(var(--topbar-height) + var(--space-4));
}

.location-form__aside :deep(.panel p) {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  line-height: 1.6;
  margin: 0;
}

.parent-preview {
  align-items: center;
  background: var(--color-canvas);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto 1fr auto;
  padding: var(--space-3);
}

.parent-preview__mark {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  color: var(--color-brand-strong);
  display: flex;
  font-size: var(--font-size-17);
  height: 38px;
  justify-content: center;
  width: 38px;
}

.parent-preview strong,
.parent-preview small {
  display: block;
}

.parent-preview strong {
  font-size: var(--font-size-13);
}

.parent-preview small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin-top: var(--space-1);
}

.parent-preview b {
  color: var(--color-ink);
}

.parent-picker {
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.field-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-grid__wide {
  grid-column: 1 / -1;
}

.characteristics {
  display: grid;
  gap: var(--space-5);
}

.impact-note {
  background: var(--color-brand-soft);
  border-left: 4px solid var(--color-brand);
  border-radius: 4px var(--radius-md) var(--radius-md) 4px;
  padding: var(--space-4);
}

.impact-note strong {
  color: var(--color-brand-strong);
  font-size: var(--font-size-13);
}

.impact-note p {
  color: var(--color-brand-strong);
  font-size: var(--font-size-11);
  line-height: 1.5;
  margin: var(--space-1) 0 0;
}

.location-form__actions {
  grid-column: 1 / -1;
}

@media (max-width: 900px) {
  .location-form {
    grid-template-columns: minmax(0, 1fr);
  }

  .location-form__aside {
    grid-row: 2;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    position: static;
  }
}

@media (max-width: 620px) {
  .field-grid,
  .location-form__aside {
    grid-template-columns: 1fr;
  }

  .field-grid__wide {
    grid-column: auto;
  }

  .parent-preview {
    grid-template-columns: auto 1fr;
  }

  .parent-preview :deep(.button) {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
