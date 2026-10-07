<script setup lang="ts">
/**
 * El catálogo de especies, con la composición de la pantalla `species` del prototipo: grupos de
 * cultivo, barra de herramientas, nota de recuento y tabla con la celda identificativa.
 *
 * **Híbrida, y con dos marcas distintas a propósito.** El API sirve el catálogo paginado y sus dos
 * nombres, que es lo real. Lo demás se marca, pero no todo por el mismo motivo:
 *
 * * **«En la ficha»** — temperatura, riego y sustrato **existen**: están en `GET /species/{id}`.
 *   Lo que no los trae es el listado. Marcarlas sin más las haría parecer inventadas, cuando lo
 *   que pasa es que están a un clic.
 * * **Con su ticket** — la exposición y los ejemplares de cada fila no los trae el listado (T-17,
 *   T-21).
 *
 * Los **grupos de cultivo** son reales: una vista guardada del catálogo es un grupo, y sus miembros
 * no se guardan —son las especies que cumplen su regla al evaluarla—. «Todas» es el catálogo sin
 * criterios; un grupo está seleccionado cuando **su consulta coincide con la de la URL**.
 *
 * La distinción importa: «el listado no lo trae» y «no existe» son problemas distintos y se
 * arreglan de formas distintas.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useSearchText } from '@shared/composables/useSearchText'
import { useUrlState } from '@shared/composables/useUrlState'
import { canonicalQuery } from '@shared/utils/canonicalQuery'
import { readUrlState, toUrlQuery, type UrlSchema } from '@shared/utils/urlState'
import { useSpecies } from '@features/species/composables/useSpecies'
import { ENVIRONMENTS, SUN_EXPOSURE } from '@features/species/mappers/speciesCultivation'
import type { SpeciesSummary } from '@features/species/types/species.types'
import { useSavedViews } from '@features/views/composables/useSavedViews'
import { groupSymbol, speciesDraft, speciesRouteQuery } from '@features/views/mappers/viewState'
import SavedViewMenu from '@features/views/components/SavedViewMenu.vue'
import type { SavedView } from '@features/views/types/view.types'
import type { PageResponse, ServiceResponse } from '@shared/types/api.types'

useHead({ title: 'Cactify · Especies' })
useBreadcrumbs().set([{ label: 'Especies' }])

const { search } = useSpecies()

const page = ref<PageResponse<SpeciesSummary> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

/**
 * Las claves públicas de orden del catálogo (ADR-016). La tabla solo ordena por la celda
 * identificativa; el resto se admite para que una URL o una vista guardada con otro orden valga.
 */
const SORT_KEYS = ['code', 'scientificName', 'commonName', 'exposure']

/**
 * **El estado de la pantalla es la URL.** Los extremos de temperatura y los meses viajan tal cual
 * los entiende el API; los desplegables de «Temperatura» y «Crecimiento» son atajos con nombre sobre
 * ellos, de modo que un enlace con otros valores también se reproduce.
 */
const URL_SCHEMA = {
  q: { kind: 'text' },
  exposure: { kind: 'enum', values: SUN_EXPOSURE.map((option) => option.value) },
  minTemperatureFrom: { kind: 'text' },
  minTemperatureTo: { kind: 'text' },
  growthMonth: { kind: 'list', values: Array.from({ length: 12 }, (_, month) => String(month + 1)) },
  sort: { kind: 'enum', values: SORT_KEYS.flatMap((key) => [`${key},asc`, `${key},desc`]) },
} as const satisfies UrlSchema

const { state } = useUrlState(URL_SCHEMA)

/** El orden lo resuelve el API: la tabla solo tiene delante una página (ADR-009). */
const sort = computed(() => {
  if (!state.sort) return null
  const [key, direction] = state.sort.split(',')
  return { key: key!, direction: direction as 'asc' | 'desc' }
})

/** La caja de texto se aplica tras una pausa y se sincroniza con la URL en los dos sentidos. */
const { text: searchText, clear: clearSearch } = useSearchText(state)

/** Atajos de temperatura mínima soportada: «sensibles al frío» es el grupo del prototipo. */
const TEMPERATURE_PRESETS = [
  { key: 'cold-sensitive', label: 'Sensibles al frío · mínima de 9 °C o más', from: '9', to: '' },
  { key: 'moderate', label: 'Mínima de 5 a 8 °C', from: '5', to: '8' },
  { key: 'hardy', label: 'Resistentes al frío · mínima de 4 °C o menos', from: '', to: '4' },
]

/** Atajos de época de crecimiento: la especie crece en **todos** los meses del atajo. */
const GROWTH_PRESETS = [
  { key: 'spring', label: 'Primavera · mar–may', months: [3, 4, 5] },
  { key: 'summer', label: 'Verano · jun–ago', months: [6, 7, 8] },
  { key: 'autumn', label: 'Otoño · sep–nov', months: [9, 10, 11] },
  { key: 'winter', label: 'Invierno · dic–feb', months: [12, 1, 2] },
]

const temperaturePreset = computed(
  () => TEMPERATURE_PRESETS.find((preset) => preset.from === state.minTemperatureFrom && preset.to === state.minTemperatureTo),
)
const growthPreset = computed(() => {
  const months = state.growthMonth.map(Number).sort((a, b) => a - b).join()
  return GROWTH_PRESETS.find((preset) => [...preset.months].sort((a, b) => a - b).join() === months)
})

const temperatureValue = computed({
  get: () => temperaturePreset.value?.key ?? '',
  set: (key: string) => {
    const preset = TEMPERATURE_PRESETS.find((option) => option.key === key)
    state.minTemperatureFrom = preset?.from ?? ''
    state.minTemperatureTo = preset?.to ?? ''
  },
})
const growthValue = computed({
  get: () => growthPreset.value?.key ?? '',
  set: (key: string) => {
    state.growthMonth = (GROWTH_PRESETS.find((option) => option.key === key)?.months ?? []).map(String)
  },
})

const exposureOptions = SUN_EXPOSURE.map(({ value, label }) => ({ value, label }))

/** Un extremo que no es un entero se ignora: una URL escrita a mano no pide lo que el API rechazaría. */
const asInteger = (value: string) => (/^-?\d+$/.test(value) ? Number(value) : undefined)

const temperatureLabel = computed(() => {
  if (temperaturePreset.value) return temperaturePreset.value.label.split(' · ')[0]
  const from = asInteger(state.minTemperatureFrom)
  const to = asInteger(state.minTemperatureTo)
  if (from !== undefined && to !== undefined) return `mínima de ${from} a ${to} °C`
  if (from !== undefined) return `mínima de ${from} °C o más`
  if (to !== undefined) return `mínima de ${to} °C o menos`
  return ''
})

const appliedFilters = computed(() => [
  ...(state.q ? [{ id: 'q', label: `Búsqueda: ${state.q}` }] : []),
  ...(state.exposure
    ? [{ id: 'exposure', label: `Exposición: ${SUN_EXPOSURE.find((option) => option.value === state.exposure)?.label}` }]
    : []),
  ...(temperatureLabel.value ? [{ id: 'temperature', label: `Temperatura: ${temperatureLabel.value}` }] : []),
  ...(state.growthMonth.length
    ? [{ id: 'growth', label: `Crecimiento: ${growthPreset.value ? growthPreset.value.label.split(' · ')[0]!.toLowerCase() : `meses ${state.growthMonth.join(', ')}`}` }]
    : []),
])

function removeFilter(id: string) {
  if (id === 'q') clearSearch()
  if (id === 'exposure') state.exposure = ''
  if (id === 'temperature') temperatureValue.value = ''
  if (id === 'growth') state.growthMonth = []
}

function clearFilters() {
  clearSearch()
  state.exposure = ''
  temperatureValue.value = ''
  state.growthMonth = []
}

/** Lo que cambia la petición. */
const request = computed(() => ({
  sort: state.sort || undefined,
  q: state.q || undefined,
  exposure: state.exposure ? [state.exposure] : undefined,
  minTemperatureFrom: asInteger(state.minTemperatureFrom),
  minTemperatureTo: asInteger(state.minTemperatureTo),
  growthMonth: state.growthMonth.length ? state.growthMonth.map(Number) : undefined,
}))

watch(() => JSON.stringify(request.value), () => load(0))

const COLUMNS = [
  { key: 'scientificName', label: 'Especie', sortable: true },
  { key: 'exposure', label: 'Exposición' },
  { key: 'temperature', label: 'Temperatura' },
  { key: 'watering', label: 'Riego orientativo' },
  { key: 'soilMix', label: 'Sustrato' },
  { key: 'specimens', label: 'Ejemplares' },
]

/**
 * Los grupos de cultivo. La pantalla traduce su estado a una consulta canónica del API y al revés;
 * el composable no conoce la URL. «Todas» no es una vista: es el catálogo sin criterios, y ordenar
 * no es un criterio.
 */
const savedViews = useSavedViews('species', {
  current: () => speciesDraft(toUrlQuery(URL_SCHEMA, state)),
  apply: (view) => { Object.assign(state, readUrlState(URL_SCHEMA, speciesRouteQuery(view))) },
})

const failure = (result: ServiceResponse<unknown>) => (result.success ? null : result.error!.message)
const saveGroup = async (name: string) => failure(await savedViews.saveCurrent(name))
const replaceGroup = async (view: SavedView) => failure(await savedViews.replaceWithCurrent(view))
const renameGroup = async (view: SavedView, name: string) => failure(await savedViews.rename(view, name))
const removeGroup = async (view: SavedView) => failure(await savedViews.remove(view))

/** El total del catálogo sin filtrar: lo que dice «Todas», que no es el recuento de lo que se está viendo. */
const allTotal = ref<number | null>(null)

const noCriteria = computed(() => {
  const { sort: _sort, ...criteria } = toUrlQuery(URL_SCHEMA, state)
  return canonicalQuery(criteria) === ''
})

const selectedGroup = computed(() => savedViews.applied.value?.id ?? (noCriteria.value ? 'all' : null))

const TONES: Record<string, 'warning' | 'info' | undefined> = { '☼': 'warning', '◐': 'info' }

const groupItems = computed(() => [
  { id: 'all', label: 'Todas', hint: allTotal.value === null ? '…' : `${allTotal.value} especies`, symbol: '⌘' },
  ...savedViews.views.value.map((view) => {
    const symbol = groupSymbol(view.query)
    return {
      id: view.id,
      label: view.name,
      hint: view.matchCount === undefined ? undefined : `${view.matchCount} ${view.matchCount === 1 ? 'especie' : 'especies'}`,
      symbol,
      tone: TONES[symbol],
    }
  }),
])

function selectGroup(id: string) {
  if (id === 'all') {
    Object.assign(state, readUrlState(URL_SCHEMA, {}))
    return
  }
  const view = savedViews.views.value.find((item) => item.id === id)
  if (view) savedViews.apply(view)
}

/**
 * La escala visual que ocupará la exposición real con T-17. Mientras falta el dato se muestran
 * todas las posibilidades —no una elegida al azar— y el ticket deja claro que aún no hay valor.
 */
const EXPOSURE_SCALE = [
  { mark: '◑', label: 'Sombra', tone: 'shade' },
  { mark: '◐', label: 'Semisombra', tone: 'partial' },
  { mark: '◒', label: 'Soleado', tone: 'sunny' },
  { mark: '☼', label: 'Pleno sol', tone: 'full-sun' },
]

async function load(pageNumber: number) {
  loading.value = true
  error.value = null

  const result = await search({ page: pageNumber, ...request.value })
  loading.value = false

  if (!result.success) {
    error.value = result.error!.message
    return
  }
  page.value = result.data!
  if (noCriteria.value) allTotal.value = result.data!.totalElements
}

/** Con criterios desde el primer momento (un enlace), el total sin filtrar hay que pedirlo aparte. */
async function loadAllTotal() {
  if (allTotal.value !== null) return
  const result = await search({ page: 0, size: 1 })
  if (result.success && allTotal.value === null) allTotal.value = result.data!.totalElements
}

function onSort(next: { key: string, direction: 'asc' | 'desc' }) {
  state.sort = `${next.key},${next.direction}`
}

// Ya montada, no en `setup`: la URL del API solo es válida en el navegador (ADR-013).
onMounted(async () => {
  savedViews.load()
  await load(0)
  if (!noCriteria.value) loadAllTotal()
})

const nothing = computed(() => !loading.value && !error.value && page.value?.content.length === 0)
/** Sin ningún criterio el catálogo está vacío; con alguno, simplemente nada coincide. */
const isEmpty = computed(() => nothing.value && appliedFilters.value.length === 0)
const noMatch = computed(() => nothing.value && appliedFilters.value.length > 0)

const asSpecies = (row: unknown) => row as SpeciesSummary
</script>

<template>
  <section>
    <UiPageHeader
      title="Especies"
      context="La base de conocimiento que heredan los ejemplares."
    >
      <template #title>
        Especies <span class="heading-count">{{ page?.totalElements ?? '—' }}</span>
      </template>
      <template #actions>
        <UiButton to="/species/new" data-test="new-species"><span aria-hidden="true">＋</span> Añadir especie</UiButton>
      </template>
    </UiPageHeader>

    <!-- La fila de grupos del prototipo: «Todas» y un grupo por vista guardada del catálogo. -->
    <UiGroupNav
      :groups="groupItems"
      :model-value="selectedGroup"
      aria-label="Grupos de cultivo guardados"
      class="species-groups"
      data-test="groups"
      @update:model-value="selectGroup"
    />
    <p v-if="!savedViews.loading.value && !savedViews.loadError.value && !savedViews.views.value.length" class="groups-note" data-test="groups-empty">
      Aún no hay grupos de cultivo. Filtra por lo que las especies tienen en común y guarda los filtros como grupo.
    </p>
    <UiInlineError v-if="savedViews.loadError.value" class="groups-note" data-test="groups-error">
      No se han podido cargar los grupos: {{ savedViews.loadError.value }}
    </UiInlineError>

    <UiFilterBar
      :applied="appliedFilters"
      label="Filtros del catálogo de especies"
      density="compact"
      @remove="removeFilter"
      @clear="clearFilters"
    >
      <UiToolbarField
        v-model="searchText"
        label="Buscar especies"
        type="search"
        icon="⌕"
        placeholder="Nombre científico, común o código"
        data-test="filter-search"
      />
      <UiToolbarField
        v-model="state.exposure"
        label="Exposición"
        as="select"
        placeholder="Exposición"
        :options="exposureOptions"
        data-test="filter-exposure"
      />
      <UiToolbarField
        v-model="temperatureValue"
        label="Temperatura"
        as="select"
        placeholder="Temperatura"
        :options="TEMPERATURE_PRESETS.map(({ key, label }) => ({ value: key, label }))"
        data-test="filter-temperature"
      />
      <!-- El riego orientativo es texto libre: un filtro sobre él sería una coincidencia de texto presentada como categoría. -->
      <UiToolbarField
        label="Riego · texto libre"
        as="select"
        :options="[]"
        disabled
        data-mock="true"
        data-test="filter-watering"
      />
      <UiToolbarField
        v-model="growthValue"
        label="Crecimiento"
        as="select"
        placeholder="Crecimiento"
        :options="GROWTH_PRESETS.map(({ key, label }) => ({ value: key, label }))"
        data-test="filter-growth"
      />
      <span class="toolbar-spacer" />
      <SavedViewMenu
        kind="group"
        :views="savedViews.views.value"
        :applied-id="savedViews.applied.value?.id ?? null"
        :modified="savedViews.modified.value"
        :loading="savedViews.loading.value"
        :error="savedViews.loadError.value"
        :save-as="saveGroup"
        :replace-with="replaceGroup"
        :rename-to="renameGroup"
        :remove-view="removeGroup"
        @apply="savedViews.apply"
      />
      <UiButton variant="icon" label="Vista de tabla" class="view-button is-selected">☷</UiButton>
      <UiButton variant="icon" label="Vista de fotografías" disabled data-mock="true">▦</UiButton>
    </UiFilterBar>

    <p v-if="loading" data-test="loading" role="status">Cargando el catálogo…</p>

    <UiInlineError v-else-if="error" data-test="error">{{ error }}</UiInlineError>

    <UiEmptyState
      v-else-if="isEmpty"
      title="Todavía no hay ninguna especie registrada"
      data-test="empty"
    >
      Una planta necesita una especie para darse de alta. Registra la primera para empezar.
      <template #action>
        <UiButton to="/species/new">Registrar la primera especie</UiButton>
      </template>
    </UiEmptyState>

    <UiEmptyState
      v-else-if="noMatch"
      title="Ninguna especie coincide"
      data-test="no-match"
      mark="⌕"
    >
      Ninguna especie cumple los filtros aplicados.
      <template #action>
        <UiButton variant="secondary" data-test="clear-all" @click="clearFilters">Limpiar filtros</UiButton>
      </template>
    </UiEmptyState>

    <template v-else-if="page?.content.length">
      <p class="result-count" data-test="result-count" aria-live="polite">
        Mostrando {{ page.content.length }} de {{ page.totalElements }} especies
      </p>

      <UiTable
        data-test="species-table"
        :columns="COLUMNS"
        :rows="page.content"
        row-key="id"
        :sort="sort"
        @update:sort="onSort"
      >
        <!-- La celda identificativa del prototipo: miniatura, código y los dos nombres. -->
        <template #cell-scientificName="{ row }">
          <NuxtLink class="species-cell" :to="`/species/${asSpecies(row).id}`" data-test="species-link">
            <span class="species-cell__thumb" aria-hidden="true">✺</span>
            <span>
              <code data-test="species-code">{{ asSpecies(row).code }}</code>
              <strong><em>{{ asSpecies(row).scientificName }}</em></strong>
              <small>{{ asSpecies(row).commonName }}</small>
            </span>
          </NuxtLink>
        </template>

        <!-- No existe en ningún endpoint: es T-17. Conserva la forma de rasgo del prototipo. -->
        <template #cell-exposure>
          <span class="exposure-pending" data-mock="true" data-test="col-exposure">
            <span class="exposure-pending__icons" aria-hidden="true">
              <i
                v-for="exposure in EXPOSURE_SCALE"
                :key="exposure.label"
                :class="`is-${exposure.tone}`"
                :title="exposure.label"
              >{{ exposure.mark }}</i>
            </span>
            <small>T-17</small>
          </span>
        </template>

        <!-- Sí existen, pero solo en la ficha: la marca lo dice para no fingir que faltan. -->
        <template #cell-temperature>
          <span class="cell-pending" data-mock="true" data-test="col-temperature">— <small>en la ficha</small></span>
        </template>

        <template #cell-watering>
          <span class="cell-pending" data-mock="true" data-test="col-watering">— <small>en la ficha</small></span>
        </template>

        <template #cell-soilMix>
          <span class="cell-pending" data-mock="true" data-test="col-soil-mix">— <small>en la ficha</small></span>
        </template>

        <template #cell-specimens>
          <span class="count-link" data-mock="true" data-test="specimens-count">
            <span><strong>—</strong> ejemplares</span>
            <small>T-21</small>
          </span>
        </template>
      </UiTable>
    </template>

    <UiPagination
      :page="page?.pageNumber ?? 0"
      :total-pages="page?.totalPages ?? 0"
      :loading="loading"
      label="Paginación del catálogo de especies"
      @update:page="load"
    />

    <p class="catalog__note">
      <strong>En la ficha</strong> señala lo que el API sirve pero este listado no trae —temperatura,
      riego y sustrato—. Lo marcado con un ticket todavía no existe en ningún sitio.
    </p>
  </section>
</template>

<style scoped>
.heading-count {
  color: var(--color-ink-muted);
  font-size: var(--font-size-17);
  font-weight: 400;
}

.groups-note {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-2) 0 var(--space-5);
}

.species-groups {
  margin-bottom: var(--space-3);
}

.result-count {
  color: var(--color-ink-faint);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-2);
}

.toolbar-spacer {
  flex: 1 1 auto;
}

.view-button.is-selected {
  background: var(--color-brand-soft);
  color: var(--color-brand-strong);
}

/* La celda identificativa: miniatura de 43 px con su aro, como en el prototipo. */
.species-cell {
  align-items: center;
  color: var(--color-ink);
  display: flex;
  gap: var(--space-3);
  text-decoration: none;
}

.species-cell__thumb {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  color: var(--color-brand);
  display: flex;
  flex: 0 0 auto;
  font-size: var(--font-size-24);
  height: 43px;
  justify-content: center;
  position: relative;
  width: 43px;
}

/* Variación puramente visual: no inventa atributos de la especie, solo evita un catálogo monótono. */
:deep(tbody tr:nth-child(4n + 1)) .species-cell__thumb {
  background: color-mix(in srgb, var(--color-warning-soft) 62%, var(--color-brand-soft));
  color: var(--color-warning);
}

:deep(tbody tr:nth-child(4n + 2)) .species-cell__thumb {
  background: var(--color-brand-soft);
  color: var(--color-brand);
}

:deep(tbody tr:nth-child(4n + 3)) .species-cell__thumb {
  background: color-mix(in srgb, var(--color-info-soft) 68%, var(--color-brand-soft));
  color: var(--color-info);
}

:deep(tbody tr:nth-child(4n)) .species-cell__thumb {
  background: color-mix(in srgb, var(--color-danger-soft) 38%, var(--color-warning-soft));
  color: var(--color-danger);
}

.species-cell__thumb::after {
  border: 1px solid color-mix(in srgb, var(--color-surface) 55%, transparent);
  border-radius: 50%;
  content: "";
  height: 25px;
  position: absolute;
  width: 25px;
}

.species-cell code,
.species-cell strong,
.species-cell small {
  display: block;
}

/* El código es el real: el que devuelve el API. */
.species-cell code {
  border: 1px dashed var(--color-line-strong);
  color: var(--color-ink-faint);
  font-family: var(--font-mono);
  font-size: var(--font-size-11);
  padding: 0 2px;
  width: fit-content;
}

.species-cell strong {
  color: var(--color-ink);
  font-size: var(--font-size-13);
  margin: 2px 0;
}

.species-cell small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}

/* La escala queda preparada sin adjudicar a una especie un valor que el API aún no conoce. */
.exposure-pending {
  align-items: center;
  display: inline-flex;
  gap: var(--space-1);
  white-space: nowrap;
}

.exposure-pending__icons {
  display: flex;
}

.exposure-pending__icons i {
  align-items: center;
  border: 2px solid var(--color-surface);
  border-radius: 50%;
  display: inline-flex;
  font-size: var(--font-size-11);
  font-style: normal;
  height: 25px;
  justify-content: center;
  margin-left: -5px;
  width: 25px;
}

.exposure-pending__icons i:first-child {
  margin-left: 0;
}

.exposure-pending__icons .is-shade,
.exposure-pending__icons .is-partial {
  background: var(--color-info-soft);
  color: var(--color-info);
}

.exposure-pending__icons .is-sunny,
.exposure-pending__icons .is-full-sun {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.exposure-pending small,
.cell-pending {
  color: var(--color-ink-faint);
}

.count-link {
  display: grid;
  gap: var(--space-1);
  white-space: nowrap;
}

.count-link > span {
  color: var(--color-brand);
  font-size: var(--font-size-12);
  font-weight: 800;
}

.count-link strong {
  color: var(--color-brand-strong);
  font-size: var(--font-size-15);
}

.count-link small {
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
}

.trait small,
.cell-pending small,
.count-link small {
  border: 1px dashed var(--color-line-strong);
  font-size: var(--font-size-11);
  font-weight: 400;
  padding: 0 2px;
}

.catalog__note {
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  margin-top: var(--space-5);
}
</style>
