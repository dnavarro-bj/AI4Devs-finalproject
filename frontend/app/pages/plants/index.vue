<script setup lang="ts">
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import type { PageResponse } from '@shared/types/api.types'
import { usePlants } from '@features/plants/composables/usePlants'
import type { PlantSummary } from '@features/plants/types/plant.types'

const { list } = usePlants()
const { set: setBreadcrumbs } = useBreadcrumbs()

setBreadcrumbs([{ label: 'Inventario' }])

const page = ref<PageResponse<PlantSummary> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(pageNumber: number) {
  loading.value = true
  error.value = null

  const result = await list(pageNumber)
  loading.value = false

  if (!result.success) {
    error.value = result.error!.message
    return
  }
  page.value = result.data!
}

// Ya montada, no en `setup`: la URL del API solo es válida en el navegador (ADR-013), así que
// una petición en renderizado de servidor no llegaría al backend.
onMounted(() => load(0))

const isEmpty = computed(() => !loading.value && !error.value && page.value?.content.length === 0)
const COLUMNS = [
  { key: 'nickname', label: 'Planta' },
  { key: 'species', label: 'Especie' },
  { key: 'location', label: 'Localización' },
]
</script>

<template>
  <section>
    <header class="inventory__head">
      <h1>Inventario</h1>
      <UiButton to="/plants/new" data-test="new-plant">Añadir planta</UiButton>
    </header>

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
      data-test="plants-table"
      :columns="COLUMNS"
      :rows="page.content"
      row-key="id"
    >
      <template #cell-nickname="{ row }">
        <NuxtLink :to="`/plants/${(row as unknown as PlantSummary).id}`" data-test="plant-link">
          {{ (row as unknown as PlantSummary).nickname }}
        </NuxtLink>
      </template>
      <template #cell-species="{ row }">
        {{ (row as unknown as PlantSummary).species.scientificName }}
      </template>
      <template #cell-location="{ row }">
        {{ (row as unknown as PlantSummary).location.name }}
      </template>
    </UiTable>

    <UiPagination
      :page="page?.pageNumber ?? 0"
      :total-pages="page?.totalPages ?? 0"
      :loading="loading"
      label="Paginación del inventario"
      @update:page="load"
    />
  </section>
</template>

<style scoped>
.inventory__head {
  align-items: baseline;
  display: flex;
  gap: var(--space-4);
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.inventory__head h1 {
  margin: 0;
}

</style>
