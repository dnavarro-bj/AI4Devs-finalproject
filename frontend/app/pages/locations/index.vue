<script setup lang="ts">
/**
 * El catálogo de localizaciones, con la composición de la pantalla `locations` del prototipo:
 * cabecera con el recuento y el alta, **mapa del vivero** a un lado y **vista general** al otro.
 *
 * El mapa es el **árbol real**: la jerarquía se monta en cliente con todas las páginas del listado
 * (el API pagina siempre y no hay endpoint de árbol sin límite, ADR-009), y cada nodo dice los
 * ejemplares **totales**, contando a los descendientes. Seleccionar un nodo lleva la vista general
 * a esa zona, con sus sublocalizaciones como tarjetas y la carga como proporción **solo cuando hay
 * capacidad**: sin ella no se inventa una.
 *
 * Marcado con su ticket, como en el prototipo y sin dato todavía: el trabajo que requiere atención
 * (T-22, T-23).
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useLocations } from '@features/locations/composables/useLocations'
import { occupancyOf } from '@features/locations/mappers/locationInput'
import { buildLocationTree, filterLocationTree, type LocationTreeNode } from '@features/locations/mappers/locationTree'
import { LOCATION_TYPE_MARKS } from '@features/locations/types/locationVocabulary'
import type { LocationSummary } from '@features/locations/types/location.types'

useHead({ title: 'Cactify · Localizaciones' })
useBreadcrumbs().set([{ label: 'Localizaciones' }])

const { loadAll } = useLocations()

const ALL = 'all'

const rows = ref<LocationSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const selectedId = ref(ALL)
const searchText = ref('')

async function load() {
  loading.value = true
  error.value = null

  const result = await loadAll()
  loading.value = false

  if (!result.success) {
    error.value = result.error!.message
    return
  }
  rows.value = result.data!
}

// Ya montada, no en `setup`: la URL del API solo es válida en el navegador (ADR-013).
onMounted(load)

const isEmpty = computed(() => !loading.value && !error.value && rows.value.length === 0)

const roots = computed(() => rows.value.filter((row) => !row.parentId))
/** Las raíces abarcan toda la colección: cada ejemplar vive en alguna localización. */
const collectionSize = computed(() => roots.value.reduce((sum, row) => sum + row.plantCountTotal, 0))

const tree = computed(() => buildLocationTree(rows.value))

/** El mapa, encabezado por la colección completa y, al buscar, reducido a las coincidencias. */
const mapNodes = computed<LocationTreeNode[]>(() => {
  const visible = filterLocationTree(tree.value, searchText.value)
  if (searchText.value.trim() && !visible.length) return []
  return [{
    id: ALL,
    label: 'Toda la colección',
    code: '',
    count: collectionSize.value,
    detail: `${rows.value.length} localizaciones`,
    mark: '⌖',
    children: visible,
  }]
})
const searching = computed(() => searchText.value.trim() !== '')
const noMatch = computed(() => searching.value && mapNodes.value.length === 0)

const selected = computed(() => rows.value.find((row) => row.id === selectedId.value) ?? null)

/** Las zonas de la vista general: las raíces, o los hijos directos de lo seleccionado. */
const zones = computed(() => {
  const parent = selected.value?.id ?? null
  return rows.value
    .filter((row) => (parent ? row.parentId === parent : !row.parentId))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
})

const plantsLabel = (total: number) => `${total} ${total === 1 ? 'planta' : 'plantas'}`
const markOf = (row: LocationSummary) => (row.locationType ? LOCATION_TYPE_MARKS[row.locationType] : '⌖')

function summaryOf(row: LocationSummary) {
  const total = plantsLabel(row.plantCountTotal)
  return row.plantCountTotal === row.plantCount ? total : `${total} · ${row.plantCount} directas`
}

const overviewTitle = computed(() => selected.value?.name ?? 'Toda la colección')
const overviewIntro = computed(() => (selected.value
  ? `${selected.value.path} · ${plantsLabel(selected.value.plantCountTotal)} contando sus sublocalizaciones.`
  : `${collectionSize.value} ejemplares repartidos en ${rows.value.length} localizaciones.`))

const workSummary = computed(() => [
  { value: '—', label: 'Tareas pendientes', note: 'Trabajo por zona · T-22', to: '/tasks', mock: true },
  { value: '—', label: 'Alertas abiertas', note: 'Incidencias · T-23', to: '/alerts', tone: 'danger' as const, mock: true },
  { value: rows.value.length, label: 'Localizaciones', note: 'En el vivero' },
])

function select(id: string) {
  selectedId.value = id
}
</script>

<template>
  <section>
    <UiPageHeader
      title="Localizaciones"
      eyebrow="Colección"
      context="Organiza el vivero tal como lo recorres: de la zona a la bancada y de la bancada a la bandeja."
    >
      <template #title>
        Localizaciones <span class="heading-count">{{ loading || error ? '—' : rows.length }}</span>
      </template>
      <template #actions>
        <UiButton to="/locations/new" data-test="new-location"><span aria-hidden="true">＋</span> Añadir localización</UiButton>
      </template>
    </UiPageHeader>

    <p v-if="loading" data-test="loading" role="status">Cargando el catálogo…</p>

    <UiInlineError v-else-if="error" data-test="error">{{ error }}</UiInlineError>

    <UiEmptyState
      v-else-if="isEmpty"
      title="Todavía no hay ninguna localización"
      data-test="empty"
      mark="⌖"
    >
      Un ejemplar necesita un sitio para darse de alta. Crea la primera para empezar.
      <template #action>
        <UiButton to="/locations/new">Crear la primera localización</UiButton>
      </template>
    </UiEmptyState>

    <div v-else class="overview">
      <aside class="nursery-map" data-test="nursery-map">
        <header>
          <div>
            <h2>Mapa del vivero</h2>
            <p data-test="collection-total">
              <strong>{{ collectionSize }}</strong> plantas en
              <strong>{{ rows.length }}</strong> localizaciones
            </p>
          </div>
        </header>

        <label class="map-search">
          <span aria-hidden="true">⌕</span>
          <input
            v-model="searchText"
            type="search"
            placeholder="Buscar localización"
            aria-label="Buscar localización por nombre o código"
            data-test="map-search"
          >
        </label>

        <div class="map-tree">
          <p v-if="noMatch" class="map-empty" data-test="map-no-match">
            Ninguna localización coincide con «{{ searchText.trim() }}».
          </p>
          <UiTree
            v-else
            :nodes="mapNodes"
            :selected="selectedId"
            label="Jerarquía de localizaciones"
            @select="select"
          />
        </div>
      </aside>

      <main class="overview-main">
        <header class="overview-head">
          <div>
            <span>Vista general</span>
            <h2 data-test="overview-title">{{ overviewTitle }}</h2>
            <p>{{ overviewIntro }}</p>
          </div>
          <div class="overview-actions">
            <UiButton v-if="selected" variant="secondary" :to="`/locations/${selected.id}`" data-test="open-location">
              Abrir ficha
            </UiButton>
            <UiButton variant="secondary" to="/plants" data-test="all-plants">
              Ver todas las plantas
            </UiButton>
          </div>
        </header>

        <UiMetricStrip :items="workSummary" label="Resumen operativo de localizaciones" />

        <div v-if="zones.length" class="zones">
          <UiZoneCard
            v-for="zone in zones"
            :key="zone.id"
            :title="zone.name"
            :summary="summaryOf(zone)"
            :to="`/locations/${zone.id}`"
            :mark="markOf(zone)"
            :status="zone.plantCountTotal ? 'En uso' : 'Vacía'"
            :status-tone="zone.plantCountTotal ? 'ok' : 'neutral'"
            :progress="occupancyOf(zone.plantCountTotal, zone.capacity) ?? undefined"
            :progress-label="occupancyOf(zone.plantCountTotal, zone.capacity) !== null
              ? `${occupancyOf(zone.plantCountTotal, zone.capacity)} % de ${zone.capacity} plantas`
              : undefined"
            :note="zone.capacity ? undefined : 'Sin capacidad definida'"
            data-test="zone-card"
          />
        </div>
        <UiEmptyState v-else title="No tiene sublocalizaciones" mark="▦" class="no-children" data-test="no-children">
          Es el último nivel de esta ruta. Puedes crear una dentro desde su ficha.
          <template #action>
            <UiButton v-if="selected" variant="secondary" :to="`/locations/new?parent=${selected.id}`">Añadir dentro</UiButton>
          </template>
        </UiEmptyState>

        <section class="attention" data-mock="true" data-test="attention">
          <header>
            <h2>Requieren atención</h2>
            <p>Ordenadas por urgencia y carga de trabajo.</p>
          </header>
          <div>
            <span aria-hidden="true">○</span>
            <p>
              <strong>Sin incidencias disponibles todavía</strong>
              <small>Las alertas por localización llegan con T-23 y el trabajo pendiente con T-22.</small>
            </p>
          </div>
        </section>
      </main>
    </div>
  </section>
</template>

<style scoped>
.heading-count {
  color: var(--color-ink-muted);
  font-size: var(--font-size-17);
  font-weight: 400;
}

.overview {
  align-items: start;
  display: grid;
  gap: var(--space-5);
  grid-template-columns: clamp(280px, 30vw, 360px) minmax(0, 1fr);
  margin-bottom: var(--space-4);
}

.nursery-map {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  overflow: hidden;
  position: sticky;
  top: calc(var(--topbar-height) + var(--space-4));
}

.nursery-map > header {
  align-items: start;
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  padding: var(--space-4) var(--space-4) var(--space-2);
}

.nursery-map h2 {
  font-size: var(--font-size-17);
  margin: 0;
}

.nursery-map header p {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin: var(--space-1) 0 0;
}

.nursery-map header p strong {
  color: var(--color-ink);
}

.map-search {
  align-items: center;
  background: var(--color-canvas);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  color: var(--color-ink-muted);
  display: grid;
  gap: var(--space-2);
  grid-template-columns: auto 1fr;
  margin: var(--space-1) var(--space-3) var(--space-3);
  min-height: 38px;
  padding: 0 var(--space-2);
}

.map-search input {
  background: transparent;
  border: 0;
  color: var(--color-ink);
  font: inherit;
  font-size: var(--font-size-13);
  min-width: 0;
  width: 100%;
}

.map-tree {
  border-top: 1px solid var(--color-line);
  padding: var(--space-2);
}

.map-empty {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
  padding: var(--space-3);
}

.overview-main {
  min-width: 0;
}

.overview-head {
  align-items: end;
  display: flex;
  gap: var(--space-4);
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.overview-head > div > span {
  color: var(--color-brand);
  font-size: var(--font-size-11);
  font-weight: 800;
}

.overview-head h2 {
  font-size: var(--font-size-24);
  margin: var(--space-1) 0;
}

.overview-head p {
  color: var(--color-ink-muted);
  margin: 0;
  max-width: 570px;
}

.overview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.no-children {
  margin-top: var(--space-3);
}

.zones {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: var(--space-3);
}

.attention {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  margin-top: var(--space-5);
  overflow: hidden;
}

.attention > header {
  padding: var(--space-4) var(--space-4) var(--space-2);
}

.attention h2 {
  font-size: var(--font-size-17);
  margin: 0;
}

.attention header p,
.attention small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}

.attention header p {
  margin: var(--space-1) 0 0;
}

.attention > div {
  align-items: start;
  border-top: 1px solid var(--color-line);
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto 1fr;
  padding: var(--space-3) var(--space-4);
}

.attention > div > span {
  color: var(--color-ink-faint);
}

.attention > div p {
  margin: 0;
}

.attention strong,
.attention small {
  display: block;
}

@media (max-width: 900px) {
  .overview {
    grid-template-columns: 1fr;
  }

  .nursery-map {
    position: static;
  }
}

@media (max-width: 600px) {
  .overview-head {
    align-items: stretch;
    flex-direction: column;
  }

  .zones {
    grid-template-columns: 1fr;
  }
}
</style>
