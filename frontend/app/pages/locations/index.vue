<script setup lang="ts">
/**
 * El catálogo de localizaciones (historia 0.9), con la composición de la pantalla `locations` del
 * prototipo: cabecera con el recuento y el alta, **mapa del vivero** a un lado y **vista general**
 * al otro, con una tarjeta por localización y su carga como proporción.
 *
 * **El mapa se construye aunque la jerarquía no exista.** El esquema es plano hasta T-18, así que
 * el árbol tiene un solo nivel —todo cuelga de «Toda la colección»— y la ausencia de los demás se
 * declara **dentro del propio mapa**. Sustituir el mapa por una tabla porque falta la jerarquía
 * sería recortar la pantalla para no tocar nada, que es justo lo que el bloque 0 evita.
 *
 * **Híbrida, y marcada.** Real: el nombre, la carga de cada sitio —el listado la trae, resuelta en
 * una sola consulta— y el total de la colección, que sale del propio inventario. Marcado con su
 * ticket: los niveles de la jerarquía y la capacidad orientativa (T-18), y el trabajo que requiere
 * atención (T-23).
 *
 * El alta abre el editor completo del prototipo. Solo el nombre se persiste hoy; los campos de
 * jerarquía y características permanecen visibles y marcados con T-18 en su propia pantalla.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useCatalogs } from '@features/catalogs/composables/useCatalogs'
import { usePlants } from '@features/plants/composables/usePlants'
import type { LocationListItem } from '@features/catalogs/types/catalog.types'
import type { TreeNode } from '@ui/UiTree.vue'
import type { PageResponse } from '@shared/types/api.types'

useHead({ title: 'Cactify · Localizaciones' })
useBreadcrumbs().set([{ label: 'Localizaciones' }])

const { listLocations } = useCatalogs()
const { list: listPlants } = usePlants()

const page = ref<PageResponse<LocationListItem> | null>(null)
/** El total de la colección es el del inventario, no la suma de una página. */
const collectionSize = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(pageNumber: number) {
  loading.value = true
  error.value = null

  const [locations, plants] = await Promise.all([listLocations(pageNumber), listPlants({ page: 0 })])
  loading.value = false

  if (!locations.success) {
    error.value = locations.error!.message
    return
  }
  page.value = locations.data!
  if (plants.success) collectionSize.value = plants.data!.totalElements
}

// Ya montada, no en `setup`: la URL del API solo es válida en el navegador (ADR-013).
onMounted(() => load(0))

const locations = computed(() => page.value?.content ?? [])
const isEmpty = computed(() => !loading.value && !error.value && locations.value.length === 0)

/**
 * El árbol del mapa. Un solo nivel mientras el esquema sea plano: `UiTree` recibe la jerarquía ya
 * construida y quien la construye es la feature, no el kit.
 */
const tree = computed<TreeNode[]>(() => [{
  id: 'all',
  label: 'Toda la colección',
  count: collectionSize.value,
  detail: `${page.value?.totalElements ?? 0} localizaciones`,
  mark: '⌖',
  children: locations.value.map((location) => ({
    id: location.id,
    label: location.name,
    count: location.plantCount,
    detail: `${location.plantCount} ${location.plantCount === 1 ? 'planta' : 'plantas'} · niveles T-18`,
    mark: locationMark(location.name),
  })),
}])

/** Qué parte de la colección vive en cada sitio. La capacidad orientativa del prototipo es T-18. */
const shareOf = (location: LocationListItem) =>
  collectionSize.value > 0 ? Math.round((location.plantCount / collectionSize.value) * 100) : 0

function locationMark(name: string) {
  const normalized = name.toLowerCase()
  if (normalized.includes('invernadero')) return '⌂'
  if (normalized.includes('bandeja')) return '▦'
  if (normalized.includes('exterior')) return '☼'
  if (normalized.includes('cuarentena')) return '!'
  if (normalized.includes('bancada')) return '═'
  return '⌖'
}

const workSummary = computed(() => [
  { value: '—', label: 'Tareas pendientes', note: 'Trabajo por zona · T-22', to: '/tasks', mock: true },
  { value: '—', label: 'Alertas abiertas', note: 'Incidencias · T-23', to: '/alerts', tone: 'danger' as const, mock: true },
  { value: page.value?.totalElements ?? 0, label: 'Localizaciones', note: 'Jerarquía completa · T-18' },
])

function openLocation(id: string) {
  if (id !== 'all') navigateTo(`/locations/${id}`)
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
        Localizaciones <span class="heading-count">{{ page?.totalElements ?? '—' }}</span>
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

    <div v-else-if="locations.length" class="overview">
      <aside class="nursery-map" data-test="nursery-map">
        <header>
          <div>
            <h2>Mapa del vivero</h2>
            <p data-test="collection-total">
              <strong>{{ collectionSize }}</strong> plantas en
              <strong>{{ page!.totalElements }}</strong> localizaciones
            </p>
          </div>
          <UiButton variant="icon" label="Opciones del mapa" disabled data-mock="true">•••</UiButton>
        </header>

        <label class="map-search">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Buscar localización · T-21" disabled data-mock="true">
        </label>

        <div class="map-tree">
          <UiTree
            :nodes="tree"
            selected="all"
            label="Jerarquía de localizaciones"
            @select="openLocation"
          />
        </div>

        <p class="map-pending" data-mock="true" data-test="hierarchy-pending">
          El esquema todavía es plano. Los niveles de zona, bancada y bandeja completarán este mapa
          con <strong>T-18</strong>.
        </p>
      </aside>

      <main class="overview-main">
        <header class="overview-head">
          <div>
            <span>Vista general</span>
            <h2>Toda la colección</h2>
            <p>{{ collectionSize }} ejemplares repartidos en {{ page!.totalElements }} localizaciones.</p>
          </div>
          <UiButton variant="secondary" to="/plants" data-test="all-plants">
            Ver todas las plantas
          </UiButton>
        </header>

        <UiMetricStrip :items="workSummary" label="Resumen operativo de localizaciones" />

        <div class="zones">
          <UiZoneCard
            v-for="location in locations"
            :key="location.id"
            :title="location.name"
            :summary="`${location.plantCount} ${location.plantCount === 1 ? 'planta' : 'plantas'}`"
            :to="`/locations/${location.id}`"
            :mark="locationMark(location.name)"
            :status="location.plantCount ? 'En uso' : 'Vacía'"
            :status-tone="location.plantCount ? 'ok' : 'neutral'"
            :progress="shareOf(location)"
            :progress-label="`${shareOf(location)} % de la colección`"
            data-test="zone-card"
          />
        </div>

        <p class="capacity-note" data-mock="true" data-test="capacity-pending">
          Las barras comparan hoy cada sitio con la colección. La capacidad orientativa de cada
          zona llega con <strong>T-18</strong>.
        </p>

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

    <UiPagination
      :page="page?.pageNumber ?? 0"
      :total-pages="page?.totalPages ?? 0"
      :loading="loading"
      label="Paginación del catálogo de localizaciones"
      @update:page="load"
    />

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
  color: var(--color-ink-muted);
  font: inherit;
  font-size: var(--font-size-13);
  min-width: 0;
  width: 100%;
}

.map-tree {
  border-top: 1px solid var(--color-line);
  padding: var(--space-2);
}

.map-pending {
  border-top: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin: 0;
  padding: var(--space-3) var(--space-4);
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

.zones {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: var(--space-3);
}

.capacity-note {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin: var(--space-3) 0 0;
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
