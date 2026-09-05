<script setup lang="ts">
import type { PageResponse, PlantSummary } from '../../types/api'
import { ApiError } from '../../types/api'

const { list } = usePlants()
const { set: setBreadcrumbs } = useBreadcrumbs()

setBreadcrumbs([{ label: 'Inventario' }])

const page = ref<PageResponse<PlantSummary> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(pageNumber: number) {
  loading.value = true
  error.value = null
  try {
    page.value = await list(pageNumber)
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'No se ha podido cargar el inventario.'
  } finally {
    loading.value = false
  }
}

// Ya montada, no en `setup`: la URL del API solo es válida en el navegador (ADR-013), así que
// una petición en renderizado de servidor no llegaría al backend.
onMounted(() => load(0))

const isEmpty = computed(() => !loading.value && !error.value && page.value?.content.length === 0)
const hasPages = computed(() => (page.value?.totalPages ?? 0) > 1)
const isFirst = computed(() => (page.value?.pageNumber ?? 0) === 0)
const isLast = computed(() => (page.value?.pageNumber ?? 0) >= (page.value?.totalPages ?? 1) - 1)

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
      <UiButton to="/plants/nueva" data-test="new-plant">Añadir planta</UiButton>
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
        <UiButton to="/plants/nueva">Añadir la primera planta</UiButton>
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

    <nav v-if="hasPages" class="pager" aria-label="Paginación del inventario">
      <UiButton
        variant="secondary"
        data-test="previous-page"
        :disabled="isFirst || loading"
        @click="load((page?.pageNumber ?? 0) - 1)"
      >
        Anterior
      </UiButton>
      <span data-test="page-indicator">
        Página {{ (page?.pageNumber ?? 0) + 1 }} de {{ page?.totalPages }}
      </span>
      <UiButton
        variant="secondary"
        data-test="next-page"
        :disabled="isLast || loading"
        @click="load((page?.pageNumber ?? 0) + 1)"
      >
        Siguiente
      </UiButton>
    </nav>
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

.pager {
  align-items: center;
  color: var(--color-ink-muted);
  display: flex;
  font-size: var(--font-size-13);
  gap: var(--space-4);
  margin-top: var(--space-4);
}
</style>
