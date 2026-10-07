<script setup lang="ts">
/**
 * La ficha de una localización, con la composición de la pantalla `location-detail` del prototipo:
 * portada con la marca del espacio, su código, su **ruta completa** y sus acciones; **fila de
 * métricas**; columna principal con lo que contiene —las sublocalizaciones— y los ejemplares que
 * alberga; y columna lateral con las características, el próximo trabajo y los últimos movimientos.
 *
 * **Real**: la ruta y los breadcrumbs (cada ancestro navegable), los recuentos directo y total, las
 * sublocalizaciones, las características con su ocupación, los ejemplares —con los de las
 * sublocalizaciones incluidos, y paginados— y los últimos movimientos. **Marcado con su ticket**:
 * las tareas y el próximo trabajo (T-22) y las alertas (T-23).
 *
 * Los ejemplares se seleccionan **aquí** para moverlos: el diálogo declara el alcance antes de
 * confirmar y, si el API rechaza el lote, la selección se conserva.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useToast } from '@shared/composables/useToast'
import { useLocations } from '@features/locations/composables/useLocations'
import { occupancyOf } from '@features/locations/mappers/locationInput'
import LocationMoveDialog from '@features/locations/components/LocationMoveDialog.vue'
import PlantMovementList from '@features/locations/components/PlantMovementList.vue'
import {
  LOCATION_ENVIRONMENT_LABELS,
  LOCATION_EXPOSURE_LABELS,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPE_MARKS,
} from '@features/locations/types/locationVocabulary'
import { usePlants } from '@features/plants/composables/usePlants'
import { STATUS_LABELS } from '@features/plants/mappers/plantProfile'
import { isNotFound } from '@shared/services/errorNormalizer'
import type { LocationDetail, PlantMovement } from '@features/locations/types/location.types'
import type { PlantSummary } from '@features/plants/types/plant.types'
import type { DomainError, PageResponse } from '@shared/types/api.types'

const MOVEMENTS_SHOWN = 4

const route = useRoute()
const id = String(route.params.id)

const { detail, remove, move, movements: listMovements } = useLocations()
const { list: listPlants } = usePlants()
const { set: setBreadcrumbs } = useBreadcrumbs()
const toast = useToast()

const location = ref<LocationDetail | null>(null)
const plants = ref<PageResponse<PlantSummary> | null>(null)
const plantsLoading = ref(false)
const plantsError = ref<string | null>(null)
const movements = ref<PlantMovement[]>([])
const movementsError = ref<string | null>(null)
const loading = ref(true)
const error = ref<DomainError | null>(null)

const confirming = ref(false)
const removing = ref(false)
const removeError = ref<string | null>(null)

const selected = ref<string[]>([])
const moveOpen = ref(false)
const movingBusy = ref(false)
const moveError = ref<string | null>(null)

setBreadcrumbs([
  { label: 'Localizaciones', to: '/locations' },
  { label: 'Ficha de localización' },
])

const notFound = computed(() => !loading.value && isNotFound(error.value))

const plantCount = computed(() => location.value?.plantCount ?? 0)
const plantTotal = computed(() => location.value?.plantCountTotal ?? 0)
const children = computed(() => location.value?.children ?? [])
const isEmpty = computed(() => plantTotal.value === 0)
const canRemove = computed(() => plantCount.value === 0 && children.value.length === 0)
const occupancy = computed(() => occupancyOf(plantTotal.value, location.value?.capacity ?? null))

const plantsLabel = (total: number) => `${total} ${total === 1 ? 'planta' : 'plantas'}`

/** El inventario filtrado por esta localización **y todo lo que cuelga de ella**. */
const filteredInventory = computed(() => `/plants?location=${id}&includeDescendants=true`)

const facts = computed(() => {
  const current = location.value
  if (!current) return []
  return [
    { key: 'type', label: 'Tipo', value: current.locationType ? LOCATION_TYPE_LABELS[current.locationType] : 'Sin definir' },
    { key: 'environment', label: 'Entorno', value: current.environment ? LOCATION_ENVIRONMENT_LABELS[current.environment] : 'Sin definir' },
    { key: 'exposure', label: 'Exposición', value: current.sunExposure ? LOCATION_EXPOSURE_LABELS[current.sunExposure] : 'Sin definir' },
    { key: 'capacity', label: 'Capacidad', value: current.capacity ? plantsLabel(current.capacity) : 'Sin definir' },
  ]
})

const COLUMNS = [
  { key: 'nickname', label: 'Planta' },
  { key: 'species', label: 'Especie' },
  { key: 'location', label: 'Ubicación exacta' },
  { key: 'status', label: 'Estado' },
]

async function loadPlants(pageNumber = 0) {
  plantsLoading.value = true
  plantsError.value = null

  const result = await listPlants({ location: id, includeDescendants: true, page: pageNumber })
  plantsLoading.value = false

  if (!result.success) {
    plantsError.value = result.error!.message
    return
  }
  plants.value = result.data!
}

async function loadMovements() {
  movementsError.value = null
  const result = await listMovements(id, 0)
  if (!result.success) {
    movementsError.value = result.error!.message
    return
  }
  movements.value = result.data!.content.slice(0, MOVEMENTS_SHOWN)
}

async function loadDetail(): Promise<boolean> {
  const result = await detail(id)
  if (!result.success) {
    error.value = result.error
    return false
  }
  location.value = result.data!

  setBreadcrumbs([
    { label: 'Localizaciones', to: '/locations' },
    ...result.data!.ancestors.map((ancestor) => ({ label: ancestor.name, to: `/locations/${ancestor.id}` })),
    { label: result.data!.name },
  ])
  useHead({ title: `Cactify · ${result.data!.name}` })
  return true
}

async function load() {
  loading.value = true
  error.value = null

  // Los ejemplares y los movimientos no bloquean la ficha: si fallan, lo dicen en su bloque.
  await Promise.all([loadDetail(), loadPlants(), loadMovements()])
  loading.value = false
}

/**
 * El `409` se traduce **aquí** y no en el service: el código es del transporte y el mensaje es del
 * dominio de esta pantalla. La carrera con un alta simultánea existe —de ahí que el conflicto se
 * muestre aunque la ficha diga cero—, y por eso el error del API tiene la última palabra.
 */
async function confirmRemoval() {
  removing.value = true
  removeError.value = null

  const result = await remove(id)
  removing.value = false

  if (!result.success) {
    removeError.value = result.error!.message
      || 'No se puede retirar mientras albergue ejemplares o contenga otras localizaciones.'
    confirming.value = false
    return
  }

  confirming.value = false
  await navigateTo('/locations')
}

function openMove() {
  moveError.value = null
  moveOpen.value = true
}

async function confirmMove(destinationId: string) {
  movingBusy.value = true
  moveError.value = null

  const result = await move(destinationId, selected.value)
  movingBusy.value = false

  // Si falla no se da por hecho: el diálogo sigue abierto y la selección intacta.
  if (!result.success) {
    moveError.value = result.error!.message || 'No se han podido mover los ejemplares.'
    return
  }

  const { moved, unchanged } = result.data!
  toast.show(`${moved} ${moved === 1 ? 'ejemplar movido' : 'ejemplares movidos'}${unchanged ? ` · ${unchanged} ya estaba${unchanged === 1 ? '' : 'n'} allí` : ''}.`)
  moveOpen.value = false
  selected.value = []
  await Promise.all([loadDetail(), loadPlants(plants.value?.pageNumber ?? 0), loadMovements()])
}

function changePage(pageNumber: number) {
  selected.value = []
  loadPlants(pageNumber)
}

// Ya montada, no en `setup`: la URL del API solo es válida en el navegador (ADR-013).
onMounted(load)

const asPlant = (row: unknown) => row as PlantSummary
</script>

<template>
  <section>
    <p v-if="loading" data-test="loading" role="status">Cargando la localización…</p>

    <UiEmptyState
      v-else-if="notFound"
      title="Esta localización no existe"
      data-test="not-found"
      mark="◌"
    >
      Puede que se haya retirado del catálogo.
      <template #action>
        <UiButton to="/locations">Volver al catálogo</UiButton>
      </template>
    </UiEmptyState>

    <UiInlineError v-else-if="error" data-test="error">{{ error.message }}</UiInlineError>

    <template v-else-if="location">
      <UiEntityHero
        :title="location.name"
        :subtitle="location.locationType ? LOCATION_TYPE_LABELS[location.locationType] : 'Localización de la colección'"
        :description="location.description ?? undefined"
        data-test="location-hero"
      >
        <template #visual>
          <span class="hero-mark" aria-hidden="true">{{ location.locationType ? LOCATION_TYPE_MARKS[location.locationType] : '⌖' }}</span>
        </template>
        <template #identity>
          <UiStatus :tone="isEmpty ? 'neutral' : 'ok'">
            {{ isEmpty ? 'Vacía' : 'En uso' }}
          </UiStatus>
          <UiIdentityCode :value="location.code" data-test="space-code" />
        </template>
        <template #context>
          <p class="hero-path" data-test="location-path">
            <template v-if="location.ancestors.length">
              <template v-for="ancestor in location.ancestors" :key="ancestor.id">
                <NuxtLink :to="`/locations/${ancestor.id}`" data-test="ancestor-link">{{ ancestor.name }}</NuxtLink>
                <span aria-hidden="true"> / </span>
              </template>
              <strong>{{ location.name }}</strong>
            </template>
            <template v-else>Raíz del vivero</template>
          </p>
        </template>
        <template #actions>
          <UiButton :to="`/locations/${id}/edit`" data-test="edit-location">Editar localización</UiButton>
          <UiButton variant="secondary" disabled data-mock="true" data-test="create-task">
            Crear tarea aquí · T-22
          </UiButton>
          <UiButton variant="secondary" data-test="remove-location" @click="confirming = true">
            Retirar
          </UiButton>
        </template>
      </UiEntityHero>

      <UiInlineError v-if="removeError" class="hero-error" data-test="remove-error">
        {{ removeError }}
      </UiInlineError>

      <!--
        La fila de métricas del prototipo. Plantas y sublocalizaciones son reales; tareas y alertas
        se muestran marcadas y en su sitio, para que su ticket rellene un hueco previsto en vez de
        rehacer el layout.
      -->
      <div class="metrics" data-test="location-metrics">
        <UiStatTile
          :value="plantTotal"
          label="Plantas"
          :context="`${plantCount} directamente aquí`"
          :to="filteredInventory"
          data-test="plant-count"
        />
        <UiStatTile
          :value="children.length"
          label="Sublocalizaciones"
          :context="children.length ? children.map((child) => child.name).join(', ') : 'Ninguna dentro'"
          data-test="metric-children"
        />
        <UiStatTile value="—" label="Tareas" context="Trabajo del lugar · T-22" data-mock="true" data-test="metric-tasks" />
        <UiStatTile value="—" label="Alertas" context="Incidencias · T-23" data-mock="true" data-test="metric-alerts" />
      </div>

      <UiDetailLayout>
        <UiPanel :title="`Dentro de ${location.name}`" data-test="children">
          <UiSectionHeader
            title="Lo que contiene"
            description="Las plantas de las sublocalizaciones también forman parte de esta ubicación."
          >
            <template #actions>
              <UiButton variant="secondary" :to="`/locations/new?parent=${id}`" data-test="add-inside">
                <span aria-hidden="true">＋</span> Añadir dentro
              </UiButton>
            </template>
          </UiSectionHeader>

          <ul v-if="children.length" class="children-list">
            <li v-for="child in children" :key="child.id" data-test="child">
              <NuxtLink :to="`/locations/${child.id}`">
                <span class="children-list__mark" aria-hidden="true">{{ child.locationType ? LOCATION_TYPE_MARKS[child.locationType] : '⌖' }}</span>
                <span>
                  <strong>{{ child.name }}</strong>
                  <small>{{ plantsLabel(child.plantCountTotal) }}{{ child.plantCountTotal !== child.plantCount ? ` · ${child.plantCount} directas` : '' }}</small>
                </span>
                <UiStatus :tone="child.plantCountTotal ? 'ok' : 'neutral'">{{ child.plantCountTotal ? 'En uso' : 'Vacía' }}</UiStatus>
              </NuxtLink>
            </li>
          </ul>
          <p v-else class="hint" data-test="no-children">Todavía no contiene otras localizaciones.</p>
        </UiPanel>

        <UiPanel>
          <UiSectionHeader
            title="Plantas en esta ubicación"
            :description="isEmpty
              ? 'Ningún ejemplar vive aquí todavía.'
              : `${plantCount} directamente aquí · ${plantTotal} contando sublocalizaciones.`"
          >
            <template #actions>
              <UiButton variant="ghost" :to="filteredInventory" data-test="filtered-inventory">
                Ver inventario filtrado
              </UiButton>
            </template>
          </UiSectionHeader>

          <UiInlineError v-if="plantsError" data-test="plants-error">{{ plantsError }}</UiInlineError>

          <UiEmptyState
            v-else-if="isEmpty"
            title="Esta localización está vacía"
            data-test="no-plants"
            mark="⌖"
          >
            No alberga ningún ejemplar, así que puedes retirarla del catálogo si ya no la usas.
            <template #action>
              <UiButton variant="secondary" @click="confirming = true">Retirar localización</UiButton>
            </template>
          </UiEmptyState>

          <template v-else-if="plants?.content.length">
            <UiTable
              v-model:selected="selected"
              data-test="location-plants"
              :columns="COLUMNS"
              :rows="plants.content"
              row-key="id"
              selectable
            >
              <template #bulk-actions="{ count }">
                <UiButton variant="secondary" data-test="move-selected" @click="openMove">
                  Mover {{ count }} {{ count === 1 ? 'ejemplar' : 'ejemplares' }} a…
                </UiButton>
              </template>

              <template #cell-nickname="{ row }">
                <UiEntityCell
                  :title="asPlant(row).nickname"
                  :to="`/plants/${asPlant(row).id}`"
                  :detail="asPlant(row).code"
                  data-test="plant-link"
                />
              </template>

              <template #cell-species="{ row }">
                <em>{{ asPlant(row).species.scientificName }}</em>
              </template>

              <template #cell-location="{ row }">
                <span data-test="row-location">{{ asPlant(row).location.name }}</span>
              </template>

              <template #cell-status="{ row }">
                <span data-test="row-status">{{ STATUS_LABELS[asPlant(row).status] }}</span>
              </template>
            </UiTable>

            <UiPagination
              :page="plants.pageNumber"
              :total-pages="plants.totalPages"
              :loading="plantsLoading"
              label="Paginación de los ejemplares de la localización"
              @update:page="changePage"
            />
          </template>
        </UiPanel>

        <template #aside>
          <UiPanel title="Características del espacio" data-test="facts">
            <UiDefinitionList :items="facts" />
            <div class="occupancy" data-test="occupancy">
              <UiProgressBar
                v-if="occupancy !== null"
                :value="occupancy"
                label="Ocupación"
                :detail="`${plantTotal} de ${location.capacity} plantas`"
                :tone="occupancy > 100 ? 'danger' : 'brand'"
                layout="stacked"
              />
              <p v-else class="hint" data-test="occupancy-undefined">
                Sin capacidad definida: no se calcula la ocupación.
              </p>
            </div>
            <p v-if="location.operationalNotes" class="notes" data-test="operational-notes">{{ location.operationalNotes }}</p>
            <UiButton variant="ghost" class="panel-link" :to="`/locations/${id}/edit`" data-test="edit-facts">
              Editar características
            </UiButton>
          </UiPanel>

          <UiPanel title="Próximo trabajo" data-mock="true" data-test="tasks">
            <p class="pending">
              Las tareas del lugar llegan con <strong>T-22</strong>. Una tarea es trabajo
              pendiente, no un cuidado ya ocurrido.
            </p>
          </UiPanel>

          <UiPanel title="Últimos movimientos" data-test="movements">
            <UiInlineError v-if="movementsError" data-test="movements-error">{{ movementsError }}</UiInlineError>
            <p v-else-if="!movements.length" class="hint" data-test="no-movements">
              Ningún ejemplar se ha movido desde o hacia aquí.
            </p>
            <PlantMovementList v-else :movements="movements" :location-id="id" />
            <UiButton variant="ghost" class="panel-link" :to="`/locations/${id}/movements`" data-test="history-link">
              Ver historial completo
            </UiButton>
          </UiPanel>
        </template>
      </UiDetailLayout>

      <LocationMoveDialog
        :open="moveOpen"
        :count="selected.length"
        :origin-id="id"
        :origin-name="location.name"
        :busy="movingBusy"
        :error="moveError"
        @close="moveOpen = false"
        @confirm="confirmMove"
      />

      <UiDialog
        :open="confirming"
        title="Retirar la localización"
        data-test="remove-dialog"
        @close="confirming = false"
      >
        <p v-if="canRemove">
          «{{ location.name }}» dejará de estar disponible para nuevos ejemplares. No alberga
          ninguno ni contiene otras localizaciones, así que no afecta a ninguna ficha.
        </p>
        <p v-else-if="plantCount > 0" data-test="blocked-by-plants">
          «{{ location.name }}» alberga {{ plantCount }}
          {{ plantCount === 1 ? 'ejemplar' : 'ejemplares' }}. Una planta no puede quedarse sin
          sitio, así que hay que moverlos antes de retirarla.
        </p>
        <p v-else data-test="blocked-by-children">
          «{{ location.name }}» contiene {{ children.length }}
          {{ children.length === 1 ? 'sublocalización' : 'sublocalizaciones' }}. Hay que retirarlas
          o moverlas a otro sitio antes de retirar esta.
        </p>

        <template #footer>
          <UiButton variant="secondary" @click="confirming = false">Cancelar</UiButton>
          <UiButton v-if="canRemove" :disabled="removing" data-test="confirm-removal" @click="confirmRemoval">
            {{ removing ? 'Retirando…' : 'Retirar localización' }}
          </UiButton>
          <UiButton v-else-if="plantCount > 0" :to="`/plants?location=${id}`" data-test="see-plants">
            Ver esos ejemplares
          </UiButton>
          <UiButton v-else data-test="see-children" @click="confirming = false">
            Ver las sublocalizaciones
          </UiButton>
        </template>
      </UiDialog>
    </template>
  </section>
</template>

<style scoped>
.hero-mark {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-md);
  color: var(--color-brand);
  display: flex;
  font-size: var(--font-size-24);
  height: 64px;
  justify-content: center;
  width: 64px;
}

/* La ruta completa: cada ancestro es navegable. */
.hero-path {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}

.hero-path a {
  color: inherit;
}

.hero-path a:hover {
  color: var(--color-brand);
}

/* La fila de métricas del prototipo: cifras destacadas en línea, no tarjetas sueltas. */
.metrics {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  margin-bottom: var(--space-4);
}

/* `UiInlineError` no trae margen propio: el hueco lo pone quien lo coloca. */
.hero-error {
  margin-bottom: var(--space-4);
}

.hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-3) 0 0;
}

.pending {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}

.children-list {
  display: grid;
  gap: var(--space-2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.children-list a {
  align-items: center;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto 1fr auto;
  padding: var(--space-3);
  text-decoration: none;
}

.children-list a:hover {
  border-color: var(--color-line-strong);
}

.children-list__mark {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  color: var(--color-brand);
  display: flex;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.children-list strong,
.children-list small {
  display: block;
}

.children-list small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}

.notes {
  border-top: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-3) 0 0;
  padding-top: var(--space-3);
}

.occupancy {
  margin-top: var(--space-3);
}

.panel-link {
  margin-top: var(--space-3);
}
</style>
