<script setup lang="ts">
/**
 * El inventario, con la composición del wireframe: barra de filtros, tabla con selección y
 * acciones masivas, y las seis columnas de la pantalla `plants`.
 *
 * **Híbrida.** Lo real es lo que el API sirve: el listado paginado, el filtro por localización y
 * por etiqueta (T-02), la ordenación y las columnas visibles. Lo que no existe —el código del
 * ejemplar (T-15), el último riego (el listado no trae lecturas), el nivel de atención (T-23), el
 * filtro por especie y por estado, y las acciones masivas (T-22, T-24)— va **marcado**, para que
 * no se confunda una columna de maqueta con un dato.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useDebouncedRef } from '@shared/composables/useDebouncedRef'
import { usePlants } from '@features/plants/composables/usePlants'
import { PLANT_STATUSES, STATUS_LABELS } from '@features/plants/mappers/plantProfile'
import type { PlantSummary } from '@features/plants/types/plant.types'
import { useLocations } from '@features/locations/composables/useLocations'
import type { LocationSummary } from '@features/locations/types/location.types'
import type { PageResponse } from '@shared/types/api.types'

const { list } = usePlants()
const { loadAll: loadLocations } = useLocations()
const route = useRoute()
const { set: setBreadcrumbs } = useBreadcrumbs()

setBreadcrumbs([{ label: 'Inventario' }])

const page = ref<PageResponse<PlantSummary> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const locations = ref<LocationSummary[]>([])

/**
 * El orden lo resuelve el API, no la tabla: todo listado va paginado (ADR-009), así que la tabla
 * solo tiene delante una página. Reordenar esa página en el cliente daría un resultado plausible y
 * equivocado.
 */
const sort = ref<{ key: string, direction: 'asc' | 'desc' } | null>(null)

const tagFilter = ref('')
/** La ficha de una localización enlaza aquí con `?location=` (y `includeDescendants`): el filtro nace de la URL. */
const queryLocation = route.query.location
const locationFilter = ref(typeof queryLocation === 'string' ? queryLocation : '')
const includeDescendants = ref(route.query.includeDescendants === 'true')

/**
 * La búsqueda por **código** de inventario. El texto de la caja se aplica tras una pausa, no por
 * tecla; apodo y especie son T-21. Como los demás filtros, aparece como filtro aplicado y se quita.
 */
/**
 * El estado: **por defecto no se pide ninguno** y el API devuelve solo lo que está en curso —lo
 * archivado no se mezcla con lo activo—. Elegir uno pide ese; `all` incluye las archivadas.
 */
const statusFilter = ref('')
const statusOptions = [
  ...PLANT_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
  { value: 'all', label: 'Todas, incluidas las archivadas' },
]
const statusQuery = computed(() => {
  if (statusFilter.value === 'all') return PLANT_STATUSES
  return statusFilter.value ? [statusFilter.value] : undefined
})

const searchText = ref('')
const appliedSearch = useDebouncedRef(searchText, 250)
const moreFiltersOpen = ref(false)

const selected = ref<string[]>([])

const locationName = computed(
  () => locations.value.find((location) => location.id === locationFilter.value)?.name ?? '',
)

const appliedFilters = computed(() => [
  ...(locationFilter.value ? [{ id: 'location', label: `Localización: ${locationName.value}${includeDescendants.value ? ' y sublocalizaciones' : ''}` }] : []),
  ...(tagFilter.value ? [{ id: 'tag', label: `Etiqueta: ${tagFilter.value}` }] : []),
  ...(appliedSearch.value.trim() ? [{ id: 'code', label: `Código: ${appliedSearch.value.trim()}` }] : []),
  ...(statusFilter.value
    ? [{ id: 'status', label: `Estado: ${statusOptions.find((option) => option.value === statusFilter.value)?.label}` }]
    : []),
])

/** Quitar la búsqueda se aplica **al instante**: no tiene sentido esperar la pausa para deshacerla. */
function clearSearch() {
  searchText.value = ''
  appliedSearch.value = ''
}

function removeFilter(id: string) {
  if (id === 'tag') tagFilter.value = ''
  if (id === 'location') {
    locationFilter.value = ''
    includeDescendants.value = false
  }
  if (id === 'code') clearSearch()
  if (id === 'status') statusFilter.value = ''
}

function clearFilters() {
  tagFilter.value = ''
  locationFilter.value = ''
  includeDescendants.value = false
  statusFilter.value = ''
  clearSearch()
}

function onSort(next: { key: string, direction: 'asc' | 'desc' }) {
  sort.value = next
  load(page.value?.pageNumber ?? 0)
}

watch([tagFilter, locationFilter, appliedSearch, statusFilter], () => load(0))

async function load(pageNumber: number) {
  loading.value = true
  error.value = null

  const result = await list({
    page: pageNumber,
    sort: sort.value ? `${sort.value.key},${sort.value.direction}` : undefined,
    tag: tagFilter.value ? [tagFilter.value] : undefined,
    location: locationFilter.value || undefined,
    includeDescendants: locationFilter.value && includeDescendants.value ? true : undefined,
    code: appliedSearch.value.trim() || undefined,
    status: statusQuery.value,
  })
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
  const result = await loadLocations()
  if (result.success) locations.value = result.data!
})

const nothing = computed(() => !loading.value && !error.value && page.value?.content.length === 0)
const isSearching = computed(() => appliedSearch.value.trim() !== '')
/** Sin búsqueda activa el inventario está vacío; con ella, simplemente nada coincide. */
const isEmpty = computed(() => nothing.value && !isSearching.value)
const noMatch = computed(() => nothing.value && isSearching.value)

const locationOptions = computed(() => locations.value.map((location) => ({
  value: location.id,
  label: location.path || location.name,
})))

/** Las seis columnas del wireframe. Las tres últimas son maqueta hasta su ticket. */
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
const visibleColumns = ref(HIDEABLE.map((column) => column.key))
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
        label="Buscar por código"
        type="search"
        icon="⌕"
        placeholder="Código de inventario · apodo y especie: T-21"
        data-test="filter-search"
      />
      <UiToolbarField
        v-model="locationFilter"
        label="Localización"
        as="select"
        placeholder="Localización"
        :options="locationOptions"
        data-test="filter-location"
      />
      <UiToolbarField
        label="Especie"
        as="select"
        placeholder="Especie · T-21"
        :options="[]"
        disabled
        data-mock="true"
        data-test="filter-species"
      />
      <UiToolbarField
        v-model="statusFilter"
        label="Estado"
        as="select"
        placeholder="Estado: en curso"
        :options="statusOptions"
        data-test="filter-status"
      />
      <UiButton variant="secondary" data-test="more-filters" @click="moreFiltersOpen = !moreFiltersOpen">
        {{ moreFiltersOpen ? 'Menos filtros' : 'Más filtros' }} <span aria-hidden="true">{{ moreFiltersOpen ? '−' : '＋' }}</span>
      </UiButton>
      <UiButton
        variant="icon"
        label="Configurar columnas"
        data-test="configure-columns"
        @click="columnsOpen = !columnsOpen"
      >
        ☷
      </UiButton>

      <div v-show="moreFiltersOpen || tagFilter" class="more-filters">
        <UiToolbarField v-model="tagFilter" label="Etiqueta" placeholder="Etiqueta" data-test="filter-tag" />
      </div>
    </UiFilterBar>

    <div v-if="columnsOpen" class="columns-picker" data-test="columns-picker">
      <label v-for="column in HIDEABLE" :key="column.key">
        <input v-model="visibleColumns" type="checkbox" :value="column.key">
        {{ column.label }}
      </label>
    </div>

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
      Ninguna planta tiene «{{ appliedSearch.trim() }}» en su código de inventario.
      <template #action>
        <UiButton variant="secondary" data-test="clear-search" @click="clearSearch">Quitar la búsqueda</UiButton>
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
      <template #bulk-actions="{ count }">
        <!-- Las acciones masivas del inventario llegan con T-22 y T-24; mover desde la ficha de una localización ya existe (T-18). -->
        <UiButton variant="secondary" disabled data-mock="true">Crear tarea ({{ count }})</UiButton>
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

      <template #cell-attention>
        <span data-mock="true" class="cell-mock">— <small>T-23</small></span>
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
