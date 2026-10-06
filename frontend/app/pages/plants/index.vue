<script setup lang="ts">
/**
 * El inventario, con la composición del wireframe: barra de filtros, tabla con selección y
 * acciones masivas, y las seis columnas de la pantalla `plants`.
 *
 * **Híbrida.** Lo real es lo que el API sirve: el listado paginado, el filtro por localización y
 * por etiqueta (T-02), la ordenación y las columnas visibles. Lo que no existe —el código del
 * ejemplar (T-15), el último riego (el listado no trae lecturas), el nivel de atención (T-23), el
 * filtro por especie y por estado, y las acciones masivas (T-22, T-18)— va **marcado**, para que
 * no se confunda una columna de maqueta con un dato.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { usePlants } from '@features/plants/composables/usePlants'
import type { PlantSummary } from '@features/plants/types/plant.types'
import { useCatalogs } from '@features/catalogs/composables/useCatalogs'
import type { Location } from '@features/catalogs/types/catalog.types'
import type { PageResponse } from '@shared/types/api.types'

const { list } = usePlants()
const { listLocations } = useCatalogs()
const { set: setBreadcrumbs } = useBreadcrumbs()

setBreadcrumbs([{ label: 'Inventario' }])

const page = ref<PageResponse<PlantSummary> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const locations = ref<Location[]>([])

/**
 * El orden lo resuelve el API, no la tabla: todo listado va paginado (ADR-009), así que la tabla
 * solo tiene delante una página. Reordenar esa página en el cliente daría un resultado plausible y
 * equivocado.
 */
const sort = ref<{ key: string, direction: 'asc' | 'desc' } | null>(null)

const tagFilter = ref('')
const locationFilter = ref('')
const moreFiltersOpen = ref(false)

const selected = ref<string[]>([])

const locationName = computed(
  () => locations.value.find((location) => location.id === locationFilter.value)?.name ?? '',
)

const appliedFilters = computed(() => [
  ...(locationFilter.value ? [{ id: 'location', label: `Localización: ${locationName.value}` }] : []),
  ...(tagFilter.value ? [{ id: 'tag', label: `Etiqueta: ${tagFilter.value}` }] : []),
])

function removeFilter(id: string) {
  if (id === 'tag') tagFilter.value = ''
  if (id === 'location') locationFilter.value = ''
  load(0)
}

function clearFilters() {
  tagFilter.value = ''
  locationFilter.value = ''
  load(0)
}

function onSort(next: { key: string, direction: 'asc' | 'desc' }) {
  sort.value = next
  load(page.value?.pageNumber ?? 0)
}

watch([tagFilter, locationFilter], () => load(0))

async function load(pageNumber: number) {
  loading.value = true
  error.value = null

  const result = await list({
    page: pageNumber,
    sort: sort.value ? `${sort.value.key},${sort.value.direction}` : undefined,
    tag: tagFilter.value ? [tagFilter.value] : undefined,
    location: locationFilter.value || undefined,
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
  const result = await listLocations()
  if (result.success) locations.value = result.data!.content
})

const isEmpty = computed(() => !loading.value && !error.value && page.value?.content.length === 0)

const locationOptions = computed(() => locations.value.map((location) => ({
  value: location.id,
  label: location.name,
})))

/** Las seis columnas del wireframe. Las tres últimas son maqueta hasta su ticket. */
const COLUMNS = [
  { key: 'nickname', label: 'Planta', sortable: true },
  { key: 'species', label: 'Especie', sortable: true },
  { key: 'location', label: 'Localización', sortable: true },
  { key: 'lastWatering', label: 'Último riego' },
  { key: 'attention', label: 'Atención' },
  { key: 'actions', label: 'Acciones', visuallyHidden: true },
]

/** La identificativa no se puede ocultar, así que no aparece entre las configurables. */
const HIDEABLE = COLUMNS.slice(1)
const visibleColumns = ref(HIDEABLE.map((column) => column.key))
const columnsOpen = ref(false)

const asPlant = (row: unknown) => row as PlantSummary

/** Código de ejemplo hasta T-15: el API no expone código de inventario todavía. */
function mockCode(plant: PlantSummary) {
  const scientificName = plant.species.scientificName.toLowerCase()
  const prefix = scientificName.includes('grusonii')
    ? 'GRUSS'
    : scientificName.includes('mammillaria')
      ? 'MAMMI'
      : scientificName.includes('elegans')
        ? 'ELEG'
        : plant.species.scientificName.split(' ')[0]!.slice(0, 5).toUpperCase()

  return `CAT-${prefix}-${plant.id.slice(-2)}`
}
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
        label="Buscar"
        type="search"
        icon="⌕"
        placeholder="Código, apodo o especie · T-21"
        disabled
        data-mock="true"
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
        label="Estado"
        as="select"
        placeholder="Estado · T-16"
        :options="[]"
        disabled
        data-mock="true"
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
        <!-- Las acciones masivas llegan con T-22 y T-18: aquí solo existe su sitio. -->
        <UiButton variant="secondary" disabled data-mock="true">Crear tarea ({{ count }})</UiButton>
        <UiButton variant="secondary" disabled data-mock="true">Mover</UiButton>
        <UiButton variant="secondary" disabled data-mock="true">Etiquetar</UiButton>
      </template>

      <template #cell-nickname="{ row }">
        <UiEntityCell
          :title="asPlant(row).nickname"
          :code="mockCode(asPlant(row))"
          :to="`/plants/${asPlant(row).id}`"
          mark="♧"
          code-mock
          data-test="plant-link"
        />
      </template>

      <template #cell-species="{ row }">
        <em>{{ asPlant(row).species.scientificName }}</em>
      </template>

      <template #cell-location="{ row }">
        {{ asPlant(row).location.name }}
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
