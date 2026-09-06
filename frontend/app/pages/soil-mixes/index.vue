<script setup lang="ts">
/**
 * El catálogo de mezclas de sustrato (historia 0.8), la pantalla `soil-mixes` del wireframe.
 *
 * **Todo lo que muestra es real**: es el primer catálogo que se construye con su API recién hecha,
 * así que no hay ninguna columna de maqueta. La composición se ve como proporción además de
 * leerse como cifra, porque una receta de sustrato es una proporción.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useSoilMixes } from '@features/soil-mixes/composables/useSoilMixes'
import type { SoilMix } from '@features/soil-mixes/types/soilMix.types'
import type { PageResponse } from '@shared/types/api.types'

useHead({ title: 'Cactify · Mezclas de sustrato' })
useBreadcrumbs().set([{ label: 'Mezclas de sustrato' }])

const { list } = useSoilMixes()

const page = ref<PageResponse<SoilMix> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

/** El orden lo resuelve el API: la tabla solo tiene delante una página (ADR-009). */
const sort = ref<{ key: string, direction: 'asc' | 'desc' } | null>(null)

const COLUMNS = [
  { key: 'name', label: 'Mezcla', sortable: true },
  { key: 'composition', label: 'Composición' },
  { key: 'ph', label: 'Rango de pH' },
  { key: 'description', label: 'Receta' },
]

async function load(pageNumber: number) {
  loading.value = true
  error.value = null

  const result = await list(pageNumber, sort.value ? `${sort.value.key},${sort.value.direction}` : undefined)
  loading.value = false

  if (!result.success) {
    error.value = result.error!.message
    return
  }
  page.value = result.data!
}

function onSort(next: { key: string, direction: 'asc' | 'desc' }) {
  sort.value = next
  load(page.value?.pageNumber ?? 0)
}

// Ya montada, no en `setup`: la URL del API solo es válida en el navegador (ADR-013).
onMounted(() => load(0))

const isEmpty = computed(() => !loading.value && !error.value && page.value?.content.length === 0)

const asMix = (row: unknown) => row as SoilMix
</script>

<template>
  <section>
    <UiPageHeader
      title="Mezclas de sustrato"
      :context="page ? `${page.totalElements} mezclas` : undefined"
    >
      <template #actions>
        <UiButton to="/soil-mixes/new" data-test="new-soil-mix">Registrar mezcla</UiButton>
      </template>
    </UiPageHeader>

    <p v-if="loading" data-test="loading" role="status">Cargando el catálogo…</p>

    <UiInlineError v-else-if="error" data-test="error">{{ error }}</UiInlineError>

    <UiEmptyState
      v-else-if="isEmpty"
      title="Todavía no hay ninguna mezcla registrada"
      data-test="empty"
    >
      Una especie necesita una mezcla para darse de alta. Registra la primera para empezar.
      <template #action>
        <UiButton to="/soil-mixes/new">Registrar la primera mezcla</UiButton>
      </template>
    </UiEmptyState>

    <UiTable
      v-else-if="page?.content.length"
      data-test="soil-mixes-table"
      :columns="COLUMNS"
      :rows="page.content"
      row-key="id"
      :sort="sort"
      @update:sort="onSort"
    >
      <template #cell-name="{ row }">
        <NuxtLink :to="`/soil-mixes/${asMix(row).id}`" data-test="soil-mix-link">
          <strong>{{ asMix(row).name }}</strong>
        </NuxtLink>
      </template>

      <template #cell-composition="{ row }">
        <span class="composition">
          <span>{{ asMix(row).organicPercentage }}% orgánico</span>
          <span>{{ asMix(row).mineralPercentage }}% mineral</span>
        </span>
      </template>

      <template #cell-ph="{ row }">
        {{ asMix(row).phMin }} – {{ asMix(row).phMax }}
      </template>

      <template #cell-description="{ row }">
        <span class="recipe">{{ asMix(row).description ?? '—' }}</span>
      </template>
    </UiTable>

    <UiPagination
      :page="page?.pageNumber ?? 0"
      :total-pages="page?.totalPages ?? 0"
      :loading="loading"
      label="Paginación del catálogo de mezclas"
      @update:page="load"
    />
  </section>
</template>

<style scoped>
.composition {
  color: var(--color-ink-muted);
  display: grid;
  font-size: var(--font-size-12);
}

.recipe {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}
</style>
