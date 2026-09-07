<script setup lang="ts">
/**
 * El catálogo de mezclas de sustrato (historia 0.8), con la composición de la pantalla
 * `soil-mixes` del prototipo.
 *
 * Dos cosas que no son adorno y que la primera versión no tenía:
 *
 * * **La composición se ve.** Una receta de sustrato *es* una proporción; verla como longitud y
 *   color se lee más rápido que sumar dos cifras. La barra va en su variante compacta, para caber
 *   en la fila sin dejar de decir el valor.
 * * **El pH se interpreta.** «5,5–6,5» no dice nada a quien no tenga la escala memorizada, así que
 *   se acompaña de su lectura cualitativa.
 *
 * **Híbrida, y marcada.** Real: nombre, composición, pH y receta. El uso por especies va marcado
 * porque el listado no lo trae —contarlo por fila sería un `N+1`, y por eso vive en la ficha—.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useSoilMixes } from '@features/soil-mixes/composables/useSoilMixes'
import { phQuality } from '@features/soil-mixes/composables/phQuality'
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
  { key: 'ph', label: 'pH recomendado' },
  { key: 'usage', label: 'Uso recomendado' },
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

/** El tono es de la pantalla, no del kit: el componente no sabe qué es «orgánico». */
const partsOf = (mix: SoilMix) => [
  { label: 'Orgánico', value: mix.organicPercentage, tone: 'warning' as const },
  { label: 'Mineral', value: mix.mineralPercentage, tone: 'info' as const },
]
</script>

<template>
  <section>
    <UiPageHeader
      title="Mezclas de sustrato"
      :context="page ? `${page.totalElements} recetas reutilizables para mantener criterios de cultivo consistentes` : undefined"
    >
      <template #actions>
        <UiButton to="/soil-mixes/new" data-test="new-soil-mix">Añadir mezcla</UiButton>
      </template>
    </UiPageHeader>

    <UiNotice
      v-if="page?.content.length"
      severity="info"
      title="Los cambios en una receta alcanzan a muchas plantas"
      class="catalog-notice"
      data-test="coverage"
    >
      Corregir una mezcla actualiza la recomendación de todas las especies que la usan; las
      mediciones y los trasplantes ya registrados no cambian.
    </UiNotice>

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
      <!-- La celda identificativa del prototipo: marca, nombre y receta. -->
      <template #cell-name="{ row }">
        <NuxtLink class="mix-cell" :to="`/soil-mixes/${asMix(row).id}`" data-test="soil-mix-link">
          <span class="mix-cell__swatch" aria-hidden="true">◒</span>
          <span>
            <strong>{{ asMix(row).name }}</strong>
            <small>{{ asMix(row).description ?? 'Sin receta anotada' }}</small>
          </span>
        </NuxtLink>
      </template>

      <template #cell-composition="{ row }">
        <div class="mix-composition" data-test="composition">
          <UiProportionBar :parts="partsOf(asMix(row))" size="compact" />
        </div>
      </template>

      <template #cell-ph="{ row }">
        <span class="mix-ph" data-test="ph">
          <strong>{{ asMix(row).phMin }}–{{ asMix(row).phMax }}</strong>
          <small>{{ phQuality(asMix(row).phMin, asMix(row).phMax) }}</small>
        </span>
      </template>

      <!-- El listado no cuenta las especies por fila: sería un N+1. El dato vive en la ficha. -->
      <template #cell-usage>
        <span data-mock="true" data-test="usage" class="cell-mock">
          — <small>en su ficha</small>
        </span>
      </template>
    </UiTable>

    <UiPagination
      :page="page?.pageNumber ?? 0"
      :total-pages="page?.totalPages ?? 0"
      :loading="loading"
      label="Paginación del catálogo de mezclas"
      @update:page="load"
    />

    <footer v-if="page?.content.length" class="catalog-foot">
      <span>{{ page.totalElements }} mezclas en el catálogo</span>
      <span class="catalog-foot__legend">
        <i class="is-organic" aria-hidden="true" /> Orgánico
        <i class="is-mineral" aria-hidden="true" /> Mineral
      </span>
    </footer>
  </section>
</template>

<style scoped>
/* `UiNotice` no trae margen propio: el hueco lo pone quien lo coloca. */
.catalog-notice {
  margin-bottom: var(--space-5);
}

.mix-cell {
  align-items: center;
  color: var(--color-ink);
  display: flex;
  gap: var(--space-2);
  text-decoration: none;
}

.mix-cell__swatch {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  color: var(--color-brand);
  display: flex;
  flex-shrink: 0;
  height: 32px;
  justify-content: center;
  width: 32px;
}

.mix-cell strong {
  display: block;
  font-size: var(--font-size-13);
}

.mix-cell small {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-11);
}

.mix-composition {
  min-width: 160px;
}

.mix-ph strong {
  display: block;
  font-size: var(--font-size-15);
}

.mix-ph small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}

.cell-mock {
  color: var(--color-ink-faint);
}

.cell-mock small {
  border: 1px dashed var(--color-line-strong);
  font-size: var(--font-size-11);
  padding: 0 2px;
}

.catalog-foot {
  border-top: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  display: flex;
  font-size: var(--font-size-12);
  gap: var(--space-4);
  justify-content: space-between;
  margin-top: var(--space-4);
  padding-top: var(--space-3);
}

.catalog-foot__legend {
  align-items: center;
  display: flex;
  gap: var(--space-2);
}

.catalog-foot__legend i {
  border-radius: 50%;
  display: inline-block;
  height: 8px;
  width: 8px;
}

.catalog-foot__legend i.is-organic {
  background: var(--color-warning);
}

.catalog-foot__legend i.is-mineral {
  background: var(--color-info);
}
</style>
