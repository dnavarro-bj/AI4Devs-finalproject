<script setup lang="ts">
/**
 * El inventario, con la composición del wireframe: barra de filtros, tabla con selección y
 * acciones masivas, y las columnas de la pantalla `plants`.
 *
 * **Híbrida.** Lo real es lo que el API sirve: el listado paginado y sus filtros —localización,
 * etiqueta, estado, texto sobre código, apodo y especie, especie y características de cultivo de la
 * especie—, la ordenación por clave pública y las columnas visibles. Lo que no existe —el último
 * riego (el listado no trae lecturas), el orden por nivel de atención (T-24), el orden por última revisión
 * (T-20) y las acciones masivas (T-24)— va **marcado**, para que no se confunda una maqueta
 * con un dato.
 *
 * **El estado de la pantalla es la URL** (`useUrlState`): filtros, orden y columnas ocultas. Recargar
 * o compartir el enlace la reproduce, y es lo que una vista guardada guarda: guardar una vista es
 * leer ese estado y aplicarla, escribirlo. «Aplicada» es una derivación del estado, no algo que la
 * pantalla recuerde.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useSearchText } from '@shared/composables/useSearchText'
import { useUrlState } from '@shared/composables/useUrlState'
import { readUrlState, toUrlQuery, type UrlSchema } from '@shared/utils/urlState'
import { usePlants } from '@features/plants/composables/usePlants'
import { PLANT_STATUSES, STATUS_LABELS } from '@features/plants/mappers/plantProfile'
import type { PlantSummary } from '@features/plants/types/plant.types'
import { useLocations } from '@features/locations/composables/useLocations'
import type { LocationSummary } from '@features/locations/types/location.types'
import { useSpecies } from '@features/species/composables/useSpecies'
import { useExport } from '@features/exports/composables/useExport'
import { ENVIRONMENTS, SUN_EXPOSURE } from '@features/species/mappers/speciesCultivation'
import { useSavedViews } from '@features/views/composables/useSavedViews'
import { plantsDraft, plantsRouteQuery } from '@features/views/mappers/viewState'
import SavedViewMenu from '@features/views/components/SavedViewMenu.vue'
import type { SavedView } from '@features/views/types/view.types'
import { useTaskWorkflow } from '@features/tasks/composables/useTaskWorkflow'
import type { BatchActionKind, BatchPlant, BatchScope } from '@features/batches/types/batch.types'
import type { PageResponse, ServiceResponse } from '@shared/types/api.types'
import { severityMarkLevel } from '@features/alerts/mappers/alert.mapper'
import { ALERT_SEVERITY_LABELS } from '@features/alerts/types/alert.types'

const { list } = usePlants()
const { loadAll: loadLocations } = useLocations()
const { search: searchSpecies } = useSpecies()
const { set: setBreadcrumbs } = useBreadcrumbs()

setBreadcrumbs([{ label: 'Inventario' }])

const page = ref<PageResponse<PlantSummary> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const locations = ref<LocationSummary[]>([])

/** Las seis columnas del wireframe más el estado. Las dos últimas de datos son maqueta hasta su ticket. */
const COLUMNS = [
  { key: 'nickname', label: 'Planta', sortable: true },
  { key: 'species', label: 'Especie', sortable: true },
  { key: 'location', label: 'Localización', sortable: true },
  { key: 'status', label: 'Estado' },
  { key: 'lastWatering', label: 'Último riego' },
  { key: 'attention', label: 'Atención' },
  { key: 'actions', label: 'Acciones', visuallyHidden: true },
]

/** La identificativa no se puede ocultar, así que no aparece entre las configurables. */
const HIDEABLE = COLUMNS.slice(1)

/**
 * Las claves públicas de orden del inventario (ADR-016). `species` y `location` ordenan por
 * **nombre**, no por identificador: lo resuelve el API.
 */
const SORT_KEYS = ['code', 'nickname', 'species', 'location', 'createdAt']

const URL_SCHEMA = {
  q: { kind: 'text' },
  location: { kind: 'text' },
  includeDescendants: { kind: 'flag' },
  tag: { kind: 'text' },
  status: { kind: 'enum', values: [...PLANT_STATUSES, 'all'] },
  species: { kind: 'text' },
  exposure: { kind: 'enum', values: SUN_EXPOSURE.map((option) => option.value) },
  environment: { kind: 'enum', values: ENVIRONMENTS.map((option) => option.value) },
  sort: { kind: 'enum', values: SORT_KEYS.flatMap((key) => [`${key},asc`, `${key},desc`]) },
  hide: { kind: 'list', values: HIDEABLE.map((column) => column.key) },
} as const satisfies UrlSchema

/** La ficha de una localización enlaza aquí con `?location=` (y `includeDescendants`): el filtro nace de la URL. */
const { state } = useUrlState(URL_SCHEMA)

/**
 * El orden lo resuelve el API, no la tabla: todo listado va paginado (ADR-009), así que la tabla
 * solo tiene delante una página. Reordenar esa página en el cliente daría un resultado plausible y
 * equivocado.
 */
const sort = computed(() => {
  if (!state.sort) return null
  const [key, direction] = state.sort.split(',')
  return { key: key!, direction: direction as 'asc' | 'desc' }
})

const SORT_OPTIONS = [
  { value: 'code,asc', label: 'Código (A–Z)' },
  { value: 'code,desc', label: 'Código (Z–A)' },
  { value: 'nickname,asc', label: 'Planta (A–Z)' },
  { value: 'nickname,desc', label: 'Planta (Z–A)' },
  { value: 'species,asc', label: 'Especie (A–Z)' },
  { value: 'species,desc', label: 'Especie (Z–A)' },
  { value: 'location,asc', label: 'Localización (A–Z)' },
  { value: 'location,desc', label: 'Localización (Z–A)' },
  // No se pueden elegir todavía: la última revisión depende de la cronología (T-20) y el orden por
  // atención llega con el Dashboard operativo (T-24); el dato ya se sirve y se pinta, solo falta ordenar.
  { value: 'lastReview', label: 'Última revisión · T-20', disabled: true },
  { value: 'attention', label: 'Nivel de atención · T-24', disabled: true },
]

/**
 * El estado: **por defecto no se pide ninguno** y el API devuelve solo lo que está en curso —lo
 * archivado no se mezcla con lo activo—. Elegir uno pide ese; `all` incluye las archivadas.
 */
const statusOptions = [
  ...PLANT_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
  { value: 'all', label: 'Todas, incluidas las archivadas' },
]
const statusQuery = computed(() => {
  if (state.status === 'all') return PLANT_STATUSES
  return state.status ? [state.status] : undefined
})

/**
 * La búsqueda de texto —código, apodo y especie— se aplica tras una pausa, no por tecla. Como los
 * demás filtros, aparece como filtro aplicado y se quita. La caja y la URL se sincronizan en los dos
 * sentidos: un enlace que llega con otro `?q=` (la búsqueda global) cambia lo escrito.
 */
const { text: searchText, clear: clearSearch } = useSearchText(state)

const moreFiltersOpen = ref(false)
const selected = ref<string[]>([])

/**
 * La selección vale para **la página**: las plantas se toman de las filas visibles, no de una lista
 * que envejece. Con la página entera marcada y más resultados que filas, se puede **ampliar a todo
 * el resultado**: entonces el alcance deja de ser una lista y pasa a ser la consulta del inventario
 * —una cadena, no cientos de identificadores—.
 */
const allResults = ref(false)
const chosen = computed(() => (page.value?.content ?? []).filter((plant) => selected.value.includes(plant.id)))
const pageAllSelected = computed(() => Boolean(page.value?.content.length) && chosen.value.length === page.value!.content.length)
const bulkCount = computed(() => (allResults.value ? page.value?.totalElements ?? 0 : chosen.value.length))
const showBanner = computed(() => allResults.value || pageAllSelected.value)

// Si ya no está marcada toda la página, «todo el resultado» deja de ser lo que se ve.
watch(pageAllSelected, (all) => { if (!all) allResults.value = false })

function clearSelection() {
  selected.value = []
  allResults.value = false
}

/** «Crear tarea» sobre la selección de la página. Una tarea admite hasta 500 plantas, no «todo el resultado». */
const taskWorkflow = useTaskWorkflow(clearSelection)

function createTaskFromSelection() {
  if (!chosen.value.length) return
  taskWorkflow.openCreate({
    plants: chosen.value.map((plant) => ({
      id: plant.id,
      code: plant.code,
      nickname: plant.nickname,
      detail: `${plant.species.scientificName} · ${plant.location.name}`,
    })),
  })
}

/** El lote que se está abriendo: su alcance se fija **al abrir**, no sigue a la selección. */
const batchDialog = reactive({
  open: false,
  action: 'reading' as BatchActionKind,
  scope: null as BatchScope | null,
  plants: [] as BatchPlant[],
})

function openBatch(action: BatchActionKind) {
  if (allResults.value) {
    batchDialog.scope = { kind: 'query', query: plantsDraft(toUrlQuery(URL_SCHEMA, state), viewContext).query }
    batchDialog.plants = []
  } else {
    if (!chosen.value.length) return
    batchDialog.scope = { kind: 'plants', plantIds: chosen.value.map((plant) => plant.id) }
    batchDialog.plants = chosen.value.map((plant) => ({
      id: plant.id,
      code: plant.code,
      nickname: plant.nickname,
      detail: `${plant.species.scientificName} · ${plant.location.name}`,
    }))
  }
  batchDialog.action = action
  batchDialog.open = true
}

async function onBatchDone() {
  batchDialog.open = false
  clearSelection()
  await load(page.value?.pageNumber ?? 0)
}

const locationName = computed(
  () => locations.value.find((location) => location.id === state.location)?.name ?? '',
)

/** Todas las especies, hasta el máximo de página del API; si hubiera más, el selector las truncaría y se avisa. */
const speciesOptions = ref<{ value: string, label: string }[]>([])
const speciesName = computed(
  () => speciesOptions.value.find((option) => option.value === state.species)?.label ?? 'seleccionada',
)

const exposureLabel = (value: string) => SUN_EXPOSURE.find((option) => option.value === value)?.label ?? value
const environmentLabel = (value: string) => ENVIRONMENTS.find((option) => option.value === value)?.label ?? value

const appliedFilters = computed(() => [
  ...(state.location ? [{ id: 'location', label: `Localización: ${locationName.value}${state.includeDescendants ? ' y sublocalizaciones' : ''}` }] : []),
  ...(state.species ? [{ id: 'species', label: `Especie: ${speciesName.value}` }] : []),
  ...(state.exposure ? [{ id: 'exposure', label: `Exposición: ${exposureLabel(state.exposure)}` }] : []),
  ...(state.environment ? [{ id: 'environment', label: `Entorno: ${environmentLabel(state.environment)}` }] : []),
  ...(state.tag ? [{ id: 'tag', label: `Etiqueta: ${state.tag}` }] : []),
  ...(state.q ? [{ id: 'q', label: `Búsqueda: ${state.q}` }] : []),
  ...(state.status
    ? [{ id: 'status', label: `Estado: ${statusOptions.find((option) => option.value === state.status)?.label}` }]
    : []),
])

function removeFilter(id: string) {
  if (id === 'tag') state.tag = ''
  if (id === 'location') {
    state.location = ''
    state.includeDescendants = false
  }
  if (id === 'q') clearSearch()
  if (id === 'status') state.status = ''
  if (id === 'species') state.species = ''
  if (id === 'exposure') state.exposure = ''
  if (id === 'environment') state.environment = ''
}

function clearFilters() {
  state.tag = ''
  state.location = ''
  state.includeDescendants = false
  state.status = ''
  state.species = ''
  state.exposure = ''
  state.environment = ''
  clearSearch()
}

function onSort(next: { key: string, direction: 'asc' | 'desc' }) {
  state.sort = `${next.key},${next.direction}`
}

/** Lo que cambia la petición. Las columnas visibles no: son presentación. */
const request = computed(() => ({
  sort: state.sort || undefined,
  tag: state.tag ? [state.tag] : undefined,
  location: state.location || undefined,
  includeDescendants: state.location && state.includeDescendants ? true : undefined,
  q: state.q || undefined,
  status: statusQuery.value,
  species: state.species ? [state.species] : undefined,
  exposure: state.exposure ? [state.exposure] : undefined,
  environment: state.environment ? [state.environment] : undefined,
}))

watch(() => JSON.stringify(request.value), () => load(0))

// Cambiar un filtro cambia el resultado: una selección «de todo el resultado» no puede sobrevivirle. Ordenar no lo cambia.
watch(() => JSON.stringify({ ...request.value, sort: undefined }), clearSelection)

async function load(pageNumber: number) {
  loading.value = true
  error.value = null

  const result = await list({ page: pageNumber, ...request.value })
  loading.value = false

  if (!result.success) {
    error.value = result.error!.message
    return
  }
  page.value = result.data!
}

// Ya montada, no en `setup`: la URL del API solo es válida en el navegador (ADR-013).
onMounted(async () => {
  load(0)
  savedViews.load()
  const result = await loadLocations()
  if (result.success) locations.value = result.data!

  const found = await searchSpecies({ size: 500, sort: 'scientificName,asc' })
  if (found.success) {
    const { content, totalElements } = found.data!
    speciesOptions.value = content
      .filter((species) => species.scientificName)
      .map((species) => ({ value: species.id, label: species.scientificName }))
    // Más especies que una página: el desplegable las truncaría **sin decirlo**. Se avisa; el
    // siguiente paso sería un selector con búsqueda, no subir el máximo del servidor.
    if (totalElements > content.length) {
      console.warn(`El desplegable de especies muestra ${content.length} de ${totalElements}.`)
    }
  }
})

/**
 * Las vistas guardadas. La pantalla **traduce** su estado a lo que se guarda —el lenguaje del API,
 * sin las columnas ocultas ni el pseudo-estado `all`— y al revés; el composable no conoce la URL.
 */
const viewContext = {
  statuses: PLANT_STATUSES as string[],
  // «Acciones» no es una columna de datos: una vista no habla de ella y aplicarla nunca la oculta.
  hideable: HIDEABLE.map((column) => column.key).filter((key) => key !== 'actions'),
}
const savedViews = useSavedViews('plants', {
  current: () => plantsDraft(toUrlQuery(URL_SCHEMA, state), viewContext),
  apply: (view) => { Object.assign(state, readUrlState(URL_SCHEMA, plantsRouteQuery(view, viewContext))) },
})

/**
 * Exportar es el listado con otro formato: lo que se pide es **el estado de la pantalla en lenguaje
 * del API** —el mismo que se guarda en una vista, sin las columnas ocultas ni el pseudo-estado
 * `all`—. El máximo de filas lo decide el servidor y su mensaje se muestra tal cual.
 */
const exporter = useExport('plants')
const exportQuery = () => plantsDraft(toUrlQuery(URL_SCHEMA, state), viewContext).query
const exportable = computed(() => !loading.value && !error.value && (page.value?.totalElements ?? 0) > 0)
const exportLabel = computed(() => {
  if (exporter.exporting.value) return 'Exportando…'
  const total = page.value?.totalElements
  if (total === undefined) return 'Exportar'
  return `Exportar ${total} ${total === 1 ? 'resultado' : 'resultados'}`
})
// El error de una exportación habla de lo que había en pantalla al pedirla: si cambia, ya no aplica.
watch(() => JSON.stringify(toUrlQuery(URL_SCHEMA, state)), () => exporter.clearError())

const failure = (result: ServiceResponse<unknown>) => (result.success ? null : result.error!.message)
const saveView = async (name: string) => failure(await savedViews.saveCurrent(name))
const replaceView = async (view: SavedView) => failure(await savedViews.replaceWithCurrent(view))
const renameView = async (view: SavedView, name: string) => failure(await savedViews.rename(view, name))
const removeView = async (view: SavedView) => failure(await savedViews.remove(view))

const nothing = computed(() => !loading.value && !error.value && page.value?.content.length === 0)
/** Sin ningún criterio el inventario está vacío; con alguno, simplemente nada coincide. */
const isEmpty = computed(() => nothing.value && appliedFilters.value.length === 0)
const noMatch = computed(() => nothing.value && appliedFilters.value.length > 0)
const onlySearch = computed(() => appliedFilters.value.length === 1 && Boolean(state.q))

const locationOptions = computed(() => locations.value.map((location) => ({
  value: location.id,
  label: location.path || location.name,
})))

const exposureOptions = SUN_EXPOSURE.map(({ value, label }) => ({ value, label }))
const environmentOptions = ENVIRONMENTS.map(({ value, label }) => ({ value, label }))

const visibleColumns = computed({
  get: () => HIDEABLE.map((column) => column.key).filter((key) => !state.hide.includes(key)),
  set: (visible: string[]) => { state.hide = HIDEABLE.map((column) => column.key).filter((key) => !visible.includes(key)) },
})
const columnsOpen = ref(false)

const asPlant = (row: unknown) => row as PlantSummary
</script>

<template>
  <section>
    <UiPageHeader
      title="Plantas"
      eyebrow="Colección"
    >
      <template #title>
        Plantas <span class="heading-count">{{ page?.totalElements ?? '—' }}</span>
      </template>
      <template #actions>
        <UiButton to="/plants/new" data-test="new-plant"><span aria-hidden="true">＋</span> Añadir planta</UiButton>
      </template>
    </UiPageHeader>

    <UiFilterBar
      :applied="appliedFilters"
      label="Filtros del inventario"
      density="compact"
      @remove="removeFilter"
      @clear="clearFilters"
    >
      <UiToolbarField
        v-model="searchText"
        label="Buscar por código, apodo o especie"
        type="search"
        icon="⌕"
        placeholder="Código, apodo o especie"
        data-test="filter-search"
      />
      <UiToolbarField
        v-model="state.location"
        label="Localización"
        as="select"
        placeholder="Localización"
        :options="locationOptions"
        data-test="filter-location"
      />
      <UiToolbarField
        v-model="state.species"
        label="Especie"
        as="select"
        placeholder="Especie"
        :options="speciesOptions"
        data-test="filter-species"
      />
      <UiToolbarField
        v-model="state.status"
        label="Estado"
        as="select"
        placeholder="Estado: en curso"
        :options="statusOptions"
        data-test="filter-status"
      />
      <UiToolbarField
        v-model="state.sort"
        label="Ordenar por"
        as="select"
        placeholder="Orden: fecha de alta"
        :options="SORT_OPTIONS"
        data-test="sort-select"
      />
      <UiButton variant="secondary" data-test="more-filters" @click="moreFiltersOpen = !moreFiltersOpen">
        {{ moreFiltersOpen ? 'Menos filtros' : 'Más filtros' }} <span aria-hidden="true">{{ moreFiltersOpen ? '−' : '＋' }}</span>
      </UiButton>
      <SavedViewMenu
        :views="savedViews.views.value"
        :applied-id="savedViews.applied.value?.id ?? null"
        :modified="savedViews.modified.value"
        :loading="savedViews.loading.value"
        :error="savedViews.loadError.value"
        :save-as="saveView"
        :replace-with="replaceView"
        :rename-to="renameView"
        :remove-view="removeView"
        @apply="savedViews.apply"
      />
      <UiButton
        variant="secondary"
        data-test="export"
        :disabled="!exportable"
        :busy="exporter.exporting.value"
        @click="exporter.run(exportQuery())"
      >
        <span aria-hidden="true">⇩</span> {{ exportLabel }}
      </UiButton>
      <UiButton
        variant="icon"
        label="Configurar columnas"
        data-test="configure-columns"
        @click="columnsOpen = !columnsOpen"
      >
        ☷
      </UiButton>

      <div v-show="moreFiltersOpen || state.tag || state.exposure || state.environment" class="more-filters">
        <UiToolbarField
          v-model="state.exposure"
          label="Exposición de la especie"
          as="select"
          placeholder="Exposición de la especie"
          :options="exposureOptions"
          data-test="filter-exposure"
        />
        <UiToolbarField
          v-model="state.environment"
          label="Entorno de la especie"
          as="select"
          placeholder="Entorno de la especie"
          :options="environmentOptions"
          data-test="filter-environment"
        />
        <UiToolbarField v-model="state.tag" label="Etiqueta" placeholder="Etiqueta" data-test="filter-tag" />
      </div>
    </UiFilterBar>

    <UiInlineError v-if="exporter.error.value" data-test="export-error">
      No se ha podido exportar: {{ exporter.error.value }}
    </UiInlineError>

    <div v-if="columnsOpen" class="columns-picker" data-test="columns-picker">
      <label v-for="column in HIDEABLE" :key="column.key">
        <input v-model="visibleColumns" type="checkbox" :value="column.key">
        {{ column.label }}
      </label>
    </div>

    <!-- Solo con la página entera marcada (o ya ampliada): una selección a medias no ofrece ampliar nada. -->
    <UiSelectionBanner
      v-if="page?.content.length"
      :page-count="chosen.length"
      :total="showBanner ? page.totalElements : 0"
      :all-selected="allResults"
      data-test="selection-banner"
      @select-all="allResults = true"
      @clear="allResults = false"
    />

    <p v-if="loading" data-test="loading" role="status">Cargando el inventario…</p>

    <UiInlineError v-else-if="error" data-test="error">{{ error }}</UiInlineError>

    <UiEmptyState
      v-else-if="isEmpty"
      title="Todavía no hay ninguna planta registrada"
      data-test="empty"
    >
      Añade la primera para empezar a registrar sus cuidados.
      <template #action>
        <UiButton to="/plants/new">Añadir la primera planta</UiButton>
      </template>
    </UiEmptyState>

    <UiEmptyState
      v-else-if="noMatch"
      title="Ninguna planta coincide"
      data-test="no-match"
      mark="⌕"
    >
      <template v-if="onlySearch">Ninguna planta tiene «{{ state.q }}» en su código, apodo ni especie.</template>
      <template v-else>Ninguna planta cumple los filtros aplicados<template v-if="state.q"> —ni tiene «{{ state.q }}»—</template>.</template>
      <template #action>
        <UiButton v-if="onlySearch" variant="secondary" data-test="clear-search" @click="clearSearch">Quitar la búsqueda</UiButton>
        <UiButton v-else variant="secondary" data-test="clear-all" @click="clearFilters">Limpiar filtros</UiButton>
      </template>
    </UiEmptyState>

    <UiTable
      v-else-if="page?.content.length"
      v-model:selected="selected"
      data-test="plants-table"
      :columns="COLUMNS"
      :rows="page.content"
      row-key="id"
      selectable
      :sort="sort"
      :visible-columns="visibleColumns"
      @update:sort="onSort"
    >
      <template #bulk-actions>
        <UiButton variant="secondary" data-test="bulk-reading" @click="openBatch('reading')">Registrar lectura ({{ bulkCount }})</UiButton>
        <UiButton variant="secondary" data-test="bulk-intervention" @click="openBatch('intervention')">Registrar intervención ({{ bulkCount }})</UiButton>
        <UiButton variant="secondary" data-test="bulk-comment" @click="openBatch('comment')">Añadir comentario ({{ bulkCount }})</UiButton>
        <UiButton
          variant="secondary"
          :disabled="allResults"
          :title="allResults ? 'Una tarea admite hasta 500 plantas: selecciona las de la página.' : undefined"
          data-test="bulk-create-task"
          @click="createTaskFromSelection"
        >
          Crear tarea ({{ allResults ? chosen.length : bulkCount }})
        </UiButton>
        <!-- Mover y etiquetar por lote no están en T-24: mover desde la ficha de una localización ya existe (T-18). -->
        <UiButton variant="secondary" disabled data-mock="true">Mover</UiButton>
        <UiButton variant="secondary" disabled data-mock="true">Etiquetar</UiButton>
      </template>

      <template #cell-nickname="{ row }">
        <UiEntityCell
          :title="asPlant(row).nickname"
          :code="asPlant(row).code"
          :to="`/plants/${asPlant(row).id}`"
          mark="♧"
          data-test="plant-link"
        />
      </template>

      <template #cell-species="{ row }">
        <em>{{ asPlant(row).species.scientificName }}</em>
      </template>

      <template #cell-location="{ row }">
        {{ asPlant(row).location.name }}
      </template>

      <template #cell-status="{ row }">

        <span data-test="row-status">{{ STATUS_LABELS[asPlant(row).status] }}</span>

      </template>


      <template #cell-lastWatering>
        <span data-mock="true" class="cell-mock">— <small>T-20</small></span>
      </template>

      <template #cell-attention="{ row }">
        <!-- La severidad se lee: texto y marca propia por nivel, nunca solo color. Sin alertas abiertas, vacío. -->
        <UiSeverityMark v-if="asPlant(row).attention" :level="severityMarkLevel(asPlant(row).attention!)" data-test="row-attention">
          {{ ALERT_SEVERITY_LABELS[asPlant(row).attention!] }}
        </UiSeverityMark>
      </template>

      <template #cell-actions="{ row }">
        <UiButton
          variant="icon"
          disabled
          data-mock="true"
          :label="`Acciones de ${asPlant(row).nickname}`"
        >
          •••
        </UiButton>
      </template>
    </UiTable>

    <TaskDialogs :workflow="taskWorkflow" />
    <BatchDialog
      :open="batchDialog.open"
      :action="batchDialog.action"
      :scope="batchDialog.scope"
      :plants="batchDialog.plants"
      @done="onBatchDone"
      @close="batchDialog.open = false"
    />

    <UiListFooter
      v-if="page?.content.length"
      :page="page.pageNumber"
      :page-size="page.pageSize"
      :total-elements="page.totalElements"
      :total-pages="page.totalPages"
      :loading="loading"
      label="Paginación del inventario"
      @update:page="load"
    />
  </section>
</template>

<style scoped>
.columns-picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.columns-picker label {
  align-items: center;
  color: var(--color-ink-muted);
  display: inline-flex;
  font-size: var(--font-size-13);
  gap: var(--space-1);
}

.heading-count {
  color: var(--color-ink-muted);
  font-size: var(--font-size-17);
  font-weight: 400;
}

.more-filters {
  display: flex;
  flex-basis: 100%;
}

.cell-mock {
  color: var(--color-ink-faint);
}

.cell-mock small {
  border: 1px dashed var(--color-line-strong);
  font-size: var(--font-size-11);
  padding: 0 2px;
}

</style>
