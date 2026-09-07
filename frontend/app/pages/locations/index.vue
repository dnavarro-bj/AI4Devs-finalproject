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
 * El alta va en un diálogo y no en una pantalla propia: una localización es hoy un nombre. El
 * editor completo del prototipo —padre, tipo, capacidad, exposición— llega con T-18.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useCatalogs } from '@features/catalogs/composables/useCatalogs'
import { usePlants } from '@features/plants/composables/usePlants'
import type { LocationListItem } from '@features/catalogs/types/catalog.types'
import type { TreeNode } from '@ui/UiTree.vue'
import type { PageResponse } from '@shared/types/api.types'

useHead({ title: 'Cactify · Localizaciones' })
useBreadcrumbs().set([{ label: 'Localizaciones' }])

const { listLocations, createLocation } = useCatalogs()
const { list: listPlants } = usePlants()

const page = ref<PageResponse<LocationListItem> | null>(null)
/** El total de la colección es el del inventario, no la suma de una página. */
const collectionSize = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)

const creating = ref(false)
const newName = ref('')
const saving = ref(false)
const createError = ref<string | null>(null)

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

function openCreation() {
  newName.value = ''
  createError.value = null
  creating.value = true
}

/** El mensaje del API se prefiere al nuestro: lo escribe quien conoce la regla. */
async function submitCreation() {
  saving.value = true
  createError.value = null

  const result = await createLocation(newName.value)
  saving.value = false

  if (!result.success) {
    createError.value = result.error!.message || 'No se ha podido crear la localización.'
    return
  }

  creating.value = false
  await load(page.value?.pageNumber ?? 0)
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
  children: locations.value.map((location) => ({
    id: location.id,
    label: location.name,
    count: location.plantCount,
  })),
}])

/** Qué parte de la colección vive en cada sitio. La capacidad orientativa del prototipo es T-18. */
const shareOf = (location: LocationListItem) =>
  collectionSize.value > 0 ? Math.round((location.plantCount / collectionSize.value) * 100) : 0

function openLocation(id: string) {
  if (id !== 'all') navigateTo(`/locations/${id}`)
}
</script>

<template>
  <section>
    <UiPageHeader
      title="Localizaciones"
      :context="page
        ? `${page.totalElements} sitios donde viven los ejemplares de la colección`
        : undefined"
    >
      <template #actions>
        <UiButton data-test="new-location" @click="openCreation">Añadir localización</UiButton>
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
        <UiButton @click="openCreation">Crear la primera localización</UiButton>
      </template>
    </UiEmptyState>

    <UiDetailLayout v-else-if="locations.length" class="overview">
      <!-- Vista general: una tarjeta por sitio, con su carga como proporción. -->
      <UiPanel>
        <UiSectionHeader
          eyebrow="Vista general"
          title="Toda la colección"
          :description="`${collectionSize} ejemplares repartidos en ${page!.totalElements} localizaciones.`"
        >
          <template #actions>
            <UiButton variant="secondary" to="/plants" data-test="all-plants">
              Ver todas las plantas
            </UiButton>
          </template>
        </UiSectionHeader>

        <div class="zones">
          <NuxtLink
            v-for="location in locations"
            :key="location.id"
            class="zone"
            :to="`/locations/${location.id}`"
            data-test="zone-card"
          >
            <span class="zone__top">
              <i class="zone__mark" aria-hidden="true">⌖</i>
              <UiStatus :tone="location.plantCount ? 'ok' : 'neutral'">
                {{ location.plantCount ? 'En uso' : 'Vacía' }}
              </UiStatus>
            </span>
            <strong>{{ location.name }}</strong>
            <small>
              {{ location.plantCount }}
              {{ location.plantCount === 1 ? 'planta' : 'plantas' }}
            </small>
            <UiProgressBar
              :value="location.plantCount"
              :max="collectionSize || 1"
              :detail="`${shareOf(location)} % de la colección`"
              :show-value="false"
            />
          </NuxtLink>
        </div>

        <div class="capacity-pending" data-mock="true" data-test="capacity-pending">
          <p class="pending">
            El prototipo mide la ocupación contra la <strong>capacidad orientativa</strong> de cada
            zona. Todavía no existe como dato: llega con <strong>T-18</strong>. Hasta entonces la
            barra dice qué parte de la colección vive en cada sitio.
          </p>
        </div>
      </UiPanel>

      <UiPanel data-mock="true" data-test="attention">
        <UiSectionHeader
          title="Requieren atención"
          description="Ordenadas por urgencia y carga de trabajo."
        />
        <p class="pending">
          Las alertas abiertas por localización llegan con <strong>T-23</strong>, y el trabajo
          pendiente de cada sitio con <strong>T-22</strong>. Ninguno de los dos existe todavía como
          dato, así que aquí no se inventa ninguna incidencia.
        </p>
      </UiPanel>

      <template #aside>
        <UiPanel data-test="nursery-map">
          <UiSectionHeader
            title="Mapa del vivero"
            :description="`${collectionSize} plantas en ${page!.totalElements} localizaciones`"
          />

          <p class="collection-total" data-test="collection-total">
            <strong>{{ collectionSize }}</strong> ejemplares ·
            <strong>{{ page!.totalElements }}</strong> localizaciones
          </p>

          <UiTree :nodes="tree" label="Jerarquía de localizaciones" @select="openLocation" />

          <p class="pending" data-mock="true" data-test="hierarchy-pending">
            El vivero del prototipo se recorre de la zona a la bancada y de la bancada a la bandeja.
            El esquema es plano hoy: los niveles intermedios y la ruta completa llegan con
            <strong>T-18</strong>, y hasta entonces todo cuelga de la colección.
          </p>
        </UiPanel>
      </template>
    </UiDetailLayout>

    <UiPagination
      :page="page?.pageNumber ?? 0"
      :total-pages="page?.totalPages ?? 0"
      :loading="loading"
      label="Paginación del catálogo de localizaciones"
      @update:page="load"
    />

    <UiDialog
      :open="creating"
      title="Añadir localización"
      subtitle="Un nombre breve facilita encontrarla al mover plantas o dar de alta un ejemplar."
      data-test="new-location-dialog"
      @close="creating = false"
    >
      <form id="new-location-form" data-test="new-location-submit" @submit.prevent="submitCreation">
        <UiField
          v-model="newName"
          label="Nombre"
          help="Por ejemplo, «Invernadero 1» o «Bandeja A3»."
          data-test="new-location-name"
        />
      </form>

      <UiInlineError v-if="createError" data-test="new-location-error">{{ createError }}</UiInlineError>

      <template #footer>
        <UiButton variant="secondary" @click="creating = false">Cancelar</UiButton>
        <UiButton type="submit" form="new-location-form" :disabled="saving">
          {{ saving ? 'Guardando…' : 'Crear localización' }}
        </UiButton>
      </template>
    </UiDialog>
  </section>
</template>

<style scoped>
.overview {
  margin-bottom: var(--space-4);
}

.zones {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  margin-top: var(--space-4);
}

.zone {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  color: var(--color-ink);
  display: grid;
  gap: 4px;
  padding: var(--space-3);
  text-decoration: none;
}

.zone:hover {
  border-color: var(--color-brand);
}

.zone__top {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}

.zone__mark {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  color: var(--color-brand);
  display: flex;
  font-style: normal;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.zone strong {
  font-size: var(--font-size-13);
}

.zone small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}

.collection-total {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-3) 0;
}

.collection-total strong {
  color: var(--color-ink);
  font-size: var(--font-size-15);
}

.capacity-pending {
  border-top: 1px solid var(--color-line);
  margin-top: var(--space-4);
  padding-top: var(--space-3);
}

.pending {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-3) 0 0;
}
</style>
