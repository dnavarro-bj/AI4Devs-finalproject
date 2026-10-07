<script setup lang="ts">
/**
 * El historial completo de movimientos de una localización: los ejemplares que ha recibido y los
 * que ha cedido, del más reciente al más antiguo y paginado. Solo los de **esta** localización: los
 * de las sublocalizaciones están en la suya.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useLocations } from '@features/locations/composables/useLocations'
import PlantMovementList from '@features/locations/components/PlantMovementList.vue'
import { isNotFound } from '@shared/services/errorNormalizer'
import type { LocationDetail, PlantMovement } from '@features/locations/types/location.types'
import type { DomainError, PageResponse } from '@shared/types/api.types'

const route = useRoute()
const id = String(route.params.id)

const { detail, movements: listMovements } = useLocations()
const { set: setBreadcrumbs } = useBreadcrumbs()

const location = ref<LocationDetail | null>(null)
const page = ref<PageResponse<PlantMovement> | null>(null)
const loading = ref(true)
const error = ref<DomainError | null>(null)

useHead({ title: 'Cactify · Movimientos' })
setBreadcrumbs([{ label: 'Localizaciones', to: '/locations' }, { label: 'Movimientos' }])

const notFound = computed(() => !loading.value && isNotFound(error.value))

async function loadPage(pageNumber: number) {
  loading.value = true
  const result = await listMovements(id, pageNumber)
  loading.value = false

  if (!result.success) {
    error.value = result.error
    return
  }
  error.value = null
  page.value = result.data!
}

onMounted(async () => {
  const [located] = await Promise.all([detail(id), loadPage(0)])
  if (!located.success) {
    error.value = located.error
    loading.value = false
    return
  }
  location.value = located.data!
  setBreadcrumbs([
    { label: 'Localizaciones', to: '/locations' },
    ...located.data!.ancestors.map((ancestor) => ({ label: ancestor.name, to: `/locations/${ancestor.id}` })),
    { label: located.data!.name, to: `/locations/${id}` },
    { label: 'Movimientos' },
  ])
})
</script>

<template>
  <section>
    <p v-if="loading && !page" data-test="loading" role="status">Cargando los movimientos…</p>

    <UiEmptyState v-else-if="notFound" title="Esta localización no existe" data-test="not-found" mark="◌">
      Puede que se haya retirado del catálogo.
      <template #action>
        <UiButton to="/locations">Volver al catálogo</UiButton>
      </template>
    </UiEmptyState>

    <UiInlineError v-else-if="error" data-test="error">{{ error.message }}</UiInlineError>

    <template v-else-if="page">
      <UiPageHeader
        :title="`Movimientos de ${location?.name ?? 'la localización'}`"
        context="Los ejemplares que ha recibido y los que ha cedido, del más reciente al más antiguo."
      >
        <template #actions>
          <UiButton variant="secondary" :to="`/locations/${id}`" data-test="back-to-location">Volver a la ficha</UiButton>
        </template>
      </UiPageHeader>

      <UiPanel>
        <UiEmptyState v-if="!page.content.length" title="Todavía no hay movimientos" mark="⇄" data-test="no-movements">
          Ningún ejemplar se ha movido desde o hacia esta localización.
        </UiEmptyState>
        <template v-else>
          <p class="total" data-test="movements-total">{{ page.totalElements }} {{ page.totalElements === 1 ? 'movimiento' : 'movimientos' }}</p>
          <PlantMovementList :movements="page.content" :location-id="id" />
        </template>
      </UiPanel>

      <UiPagination
        :page="page.pageNumber"
        :total-pages="page.totalPages"
        :loading="loading"
        label="Paginación del historial de movimientos"
        @update:page="loadPage"
      />
    </template>
  </section>
</template>

<style scoped>
.total {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-3);
}
</style>
