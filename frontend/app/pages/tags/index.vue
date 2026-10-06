<script setup lang="ts">
/**
 * El catálogo de etiquetas (historia 0.10), con la composición de la pantalla `tags` del
 * prototipo: cabecera con el recuento y el alta, **salud del catálogo**, y el listado con el uso
 * de cada etiqueta como proporción del inventario además de como cifra.
 *
 * **El uso se ve, no solo se lee**: el catálogo existe para decidir qué etiquetas sobran y cuáles
 * se combinan, y esa decisión se toma comparando usos. Dos columnas de números obligan a comparar
 * a mano lo que una longitud enseña de un vistazo.
 *
 * **Híbrida, y marcada.** Real: el nombre, cuántas plantas tienen cada etiqueta —el listado lo
 * trae, resuelto en una sola consulta— y el total del inventario, del que sale el porcentaje.
 * Marcado con su ticket: los ejemplares de muestra (T-21), la fecha de modificación (T-20), la
 * detección de duplicados (T-21) y las acciones por lote (T-24).
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useCatalogs } from '@features/catalogs/composables/useCatalogs'
import { usePlants } from '@features/plants/composables/usePlants'
import type { TagListItem } from '@features/catalogs/types/catalog.types'
import type { PageResponse } from '@shared/types/api.types'

useHead({ title: 'Cactify · Etiquetas' })
useBreadcrumbs().set([{ label: 'Etiquetas' }])

const { listTags, createTag } = useCatalogs()
const { list: listPlants } = usePlants()

const page = ref<PageResponse<TagListItem> | null>(null)
/** El total del inventario: el porcentaje de uso es sobre la colección, no sobre la página. */
const collectionSize = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)

/** El orden lo resuelve el API: la tabla solo tiene delante una página (ADR-009). */
const sort = ref<{ key: string, direction: 'asc' | 'desc' } | null>(null)

const creating = ref(false)
const newName = ref('')
const saving = ref(false)
const createError = ref<string | null>(null)

const COLUMNS = [
  { key: 'name', label: 'Etiqueta', sortable: true },
  { key: 'usage', label: 'Uso en la colección' },
  { key: 'plants', label: 'Plantas' },
  { key: 'examples', label: 'Ejemplos' },
  { key: 'updated', label: 'Actualizada' },
]

async function load(pageNumber: number) {
  loading.value = true
  error.value = null

  const [tags, plants] = await Promise.all([
    listTags(pageNumber, sort.value ? `${sort.value.key},${sort.value.direction}` : undefined),
    listPlants({ page: 0 }),
  ])
  loading.value = false

  if (!tags.success) {
    error.value = tags.error!.message
    return
  }
  page.value = tags.data!
  if (plants.success) collectionSize.value = plants.data!.totalElements
}

function onSort(next: { key: string, direction: 'asc' | 'desc' }) {
  sort.value = next
  load(page.value?.pageNumber ?? 0)
}

function openCreation() {
  newName.value = ''
  createError.value = null
  creating.value = true
}

/** El mensaje del API se prefiere al nuestro: es quien conoce la unicidad normalizada. */
async function submitCreation() {
  saving.value = true
  createError.value = null

  const result = await createTag(newName.value)
  saving.value = false

  if (!result.success) {
    createError.value = result.error!.message || 'No se ha podido crear la etiqueta.'
    return
  }

  creating.value = false
  await load(page.value?.pageNumber ?? 0)
}

// Ya montada, no en `setup`: la URL del API solo es válida en el navegador (ADR-013).
onMounted(() => load(0))

const tags = computed(() => page.value?.content ?? [])
const isEmpty = computed(() => !loading.value && !error.value && tags.value.length === 0)

/** Cuántas plantas tiene al menos una etiqueta de esta página: el resto del bloque es T-21. */
const shareOf = (tag: TagListItem) =>
  collectionSize.value > 0 ? Math.round((tag.plantCount / collectionSize.value) * 100) : 0

const asTag = (row: unknown) => row as TagListItem
</script>

<template>
  <section>
    <UiPageHeader
      title="Etiquetas"
      :context="page
        ? `${page.totalElements} criterios flexibles para clasificar ejemplares y luego buscarlos`
        : undefined"
    >
      <template #actions>
        <UiButton data-test="new-tag" @click="openCreation">Añadir etiqueta</UiButton>
      </template>
    </UiPageHeader>

    <p v-if="loading" data-test="loading" role="status">Cargando el catálogo…</p>

    <UiInlineError v-else-if="error" data-test="error">{{ error }}</UiInlineError>

    <UiEmptyState
      v-else-if="isEmpty"
      title="Todavía no hay ninguna etiqueta"
      data-test="empty"
      mark="◇"
    >
      Las etiquetas clasifican los ejemplares con criterios propios. Crea la primera para empezar.
      <template #action>
        <UiButton @click="openCreation">Crear la primera etiqueta</UiButton>
      </template>
    </UiEmptyState>

    <template v-else-if="tags.length">
      <!-- «Salud del catálogo» del prototipo: lo real es el tamaño de la colección. -->
      <UiPanel class="health" data-test="catalog-health">
        <div class="health__body">
          <div class="health__summary">
            <span class="health__mark" aria-hidden="true">◇</span>
            <div>
              <strong>{{ collectionSize }} ejemplares en la colección</strong>
              <p>
                {{ page!.totalElements }}
                {{ page!.totalElements === 1 ? 'etiqueta disponible' : 'etiquetas disponibles' }}
                para clasificarlos.
              </p>
            </div>
          </div>
          <UiButton variant="secondary" to="/plants">Ver el inventario</UiButton>
          <button class="duplicate-callout" type="button" disabled data-mock="true" data-test="duplicates">
            <span class="duplicate-callout__count">—</span>
            <span><strong>Posibles duplicados</strong><small>Detección pendiente · T-21</small></span>
            <b aria-hidden="true">›</b>
          </button>
        </div>
      </UiPanel>

      <UiFilterBar :applied="[]" density="compact" data-mock="true" data-test="tag-toolbar">
        <UiToolbarField label="Buscar etiqueta" type="search" placeholder="Buscar etiqueta · T-21" icon="⌕" disabled />
        <UiToolbarField label="Filtrar por uso" as="select" placeholder="Uso · T-21" disabled />
        <UiToolbarField label="Ordenar etiquetas" as="select" placeholder="Más utilizada · T-21" disabled />
      </UiFilterBar>

      <div class="bulk" data-mock="true" data-test="bulk" aria-live="polite">
        <strong>0 seleccionadas</strong>
        <div>
          <UiButton variant="text" disabled>Combinar etiquetas</UiButton>
          <UiButton variant="text" disabled>Eliminar sin uso</UiButton>
        </div>
        <span>Selección múltiple · T-24</span>
      </div>

      <UiTable
        data-test="tags-table"
        :columns="COLUMNS"
        :rows="tags"
        row-key="id"
        :sort="sort"
        @update:sort="onSort"
      >
        <template #cell-name="{ row }">
          <UiEntityCell
            :title="asTag(row).name"
            :to="`/tags/${asTag(row).id}`"
            mark="◇"
            :detail="asTag(row).plantCount ? 'En uso' : 'Sin uso todavía'"
            data-test="tag-link"
          />
        </template>

        <template #cell-usage="{ row }">
          <div class="usage" data-test="usage">
            <UiProgressBar
              :value="asTag(row).plantCount"
              :max="collectionSize || 1"
              :show-value="false"
            />
          </div>
        </template>

        <template #cell-plants="{ row }">
          <span class="plant-count">
            <strong>{{ asTag(row).plantCount }}</strong>
            <small>{{ shareOf(asTag(row)) }} % del inventario</small>
          </span>
        </template>

        <!-- Los códigos ya existen (T-15), pero las muestras por etiqueta piden una consulta por fila: T-21. -->
        <template #cell-examples>
          <span data-mock="true" data-test="col-examples" class="cell-mock">
            — <small>T-21</small>
          </span>
        </template>

        <template #cell-updated>
          <span data-mock="true" data-test="col-updated" class="cell-mock">
            — <small>T-20</small>
          </span>
        </template>
      </UiTable>

      <UiPagination
        :page="page!.pageNumber"
        :total-pages="page!.totalPages"
        :loading="loading"
        label="Paginación del catálogo de etiquetas"
        @update:page="load"
      />
    </template>

    <UiDialog
      :open="creating"
      title="Añadir etiqueta"
      subtitle="El nombre no distingue mayúsculas ni espacios sobrantes: «Globular» y «globular » son la misma."
      data-test="new-tag-dialog"
      @close="creating = false"
    >
      <form id="new-tag-form" data-test="new-tag-submit" @submit.prevent="submitCreation">
        <UiField v-model="newName" label="Nombre" data-test="new-tag-name" />
      </form>

      <UiInlineError v-if="createError" data-test="new-tag-error">{{ createError }}</UiInlineError>

      <template #footer>
        <UiButton variant="secondary" @click="creating = false">Cancelar</UiButton>
        <UiButton type="submit" form="new-tag-form" :disabled="saving">
          {{ saving ? 'Guardando…' : 'Crear etiqueta' }}
        </UiButton>
      </template>
    </UiDialog>
  </section>
</template>

<style scoped>
.health {
  margin-bottom: var(--space-4);
}

.health__body {
  align-items: center;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: minmax(0, 1fr) auto minmax(210px, auto);
}

.health__summary {
  align-items: center;
  display: flex;
  gap: var(--space-3);
}

.health__body strong {
  display: block;
  font-size: var(--font-size-15);
}

.health__body p {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 2px 0 0;
}

.health__mark {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  color: var(--color-brand);
  display: flex;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.bulk {
  align-items: center;
  background: var(--color-sidebar);
  border-radius: var(--radius-sm);
  color: var(--color-sidebar-text);
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  margin-bottom: var(--space-3);
  min-height: 44px;
  padding: var(--space-1) var(--space-3);
}

.bulk > div {
  display: flex;
  gap: var(--space-2);
}

.bulk :deep(.button--text) {
  color: var(--color-sidebar-text);
}

.bulk > span {
  color: color-mix(in srgb, var(--color-sidebar-text) 67%, transparent);
  font-size: var(--font-size-11);
}

.usage {
  min-width: 120px;
}

.duplicate-callout {
  align-items: center;
  background: var(--color-warning-soft);
  border: 1px solid color-mix(in srgb, var(--color-warning) 35%, var(--color-line));
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  display: grid;
  gap: var(--space-2);
  grid-template-columns: auto 1fr auto;
  padding: var(--space-2) var(--space-3);
  text-align: left;
}

.duplicate-callout:disabled {
  cursor: not-allowed;
  opacity: 1;
}

.duplicate-callout__count {
  align-items: center;
  background: var(--color-warning);
  border-radius: 50%;
  color: var(--color-surface);
  display: flex;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.duplicate-callout strong,
.duplicate-callout small,
.plant-count strong,
.plant-count small {
  display: block;
}

.duplicate-callout strong,
.plant-count strong {
  font-size: var(--font-size-12);
}

.duplicate-callout small,
.plant-count small {
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

@media (max-width: 900px) {
  .health__body {
    grid-template-columns: 1fr;
  }

  .duplicate-callout {
    width: 100%;
  }
}

@media (max-width: 680px) {
  .bulk {
    align-items: flex-start;
    flex-direction: column;
    padding: var(--space-3);
  }
}
</style>
