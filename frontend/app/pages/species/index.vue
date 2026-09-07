<script setup lang="ts">
/**
 * El catálogo de especies, con la composición de la pantalla `species` del prototipo: grupos de
 * cultivo, barra de herramientas, nota de recuento y tabla con la celda identificativa.
 *
 * **Híbrida, y con dos marcas distintas a propósito.** El API sirve el catálogo paginado y sus dos
 * nombres, que es lo real. Lo demás se marca, pero no todo por el mismo motivo:
 *
 * * **«En la ficha»** — temperatura, riego y sustrato **existen**: están en `GET /species/{id}`.
 *   Lo que no los trae es el listado. Marcarlas sin más las haría parecer inventadas, cuando lo
 *   que pasa es que están a un clic.
 * * **Con su ticket** — la exposición, el código, los ejemplares y los grupos de cultivo no
 *   existen en ningún sitio todavía (T-17, T-15, T-21).
 *
 * La distinción importa: «el listado no lo trae» y «no existe» son problemas distintos y se
 * arreglan de formas distintas.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useSpecies } from '@features/species/composables/useSpecies'
import type { SpeciesSummary } from '@features/species/types/species.types'
import type { PageResponse } from '@shared/types/api.types'

useHead({ title: 'Cactify · Especies' })
useBreadcrumbs().set([{ label: 'Especies' }])

const { list } = useSpecies()

const page = ref<PageResponse<SpeciesSummary> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

/** El orden lo resuelve el API: la tabla solo tiene delante una página (ADR-009). */
const sort = ref<{ key: string, direction: 'asc' | 'desc' } | null>(null)

const query = ref('')

const COLUMNS = [
  { key: 'scientificName', label: 'Especie', sortable: true },
  { key: 'exposure', label: 'Exposición' },
  { key: 'temperature', label: 'Temperatura' },
  { key: 'watering', label: 'Riego orientativo' },
  { key: 'soilMix', label: 'Sustrato' },
  { key: 'specimens', label: 'Ejemplares' },
]

/**
 * Los grupos dinámicos llegan con T-21, salvo «Todas», que **no es un grupo pendiente**: es el
 * estado actual del listado y su recuento sale del API. Marcarlo sería mentir en la otra
 * dirección, como pasaría con el género en la ficha.
 */
const GROUPS = [
  { key: 'sun', mark: '☼', label: 'Pleno sol', tone: 'warning' },
  { key: 'shade', mark: '◐', label: 'Semisombra', tone: 'info' },
  { key: 'cold', mark: '❄', label: 'Sensibles al frío', tone: 'cold' },
  { key: 'winter', mark: '◒', label: 'Crecimiento invernal', tone: 'winter' },
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

const asSpecies = (row: unknown) => row as SpeciesSummary
</script>

<template>
  <section>
    <UiPageHeader
      title="Especies"
      context="La base de conocimiento que heredan los ejemplares."
    >
      <template #actions>
        <UiButton to="/species/new" data-test="new-species">Añadir especie</UiButton>
      </template>
    </UiPageHeader>

    <!-- Las tarjetas de grupo del prototipo. Filtran con T-21; «Todas» ya es real. -->
    <nav class="groups" data-mock="true" data-test="groups" aria-label="Grupos de cultivo">
      <span class="groups__card is-selected" data-test="group-all">
        <span class="groups__symbol" aria-hidden="true">⌘</span>
        <span>
          <strong>Todas</strong>
          <small>{{ page ? `${page.totalElements} especies` : '…' }}</small>
        </span>
      </span>

      <span
        v-for="group in GROUPS"
        :key="group.key"
        class="groups__card"
        :class="`is-${group.tone}`"
        data-mock="true"
        :data-test="`group-${group.key}`"
      >
        <span class="groups__symbol" aria-hidden="true">{{ group.mark }}</span>
        <span>
          <strong>{{ group.label }}</strong>
          <small>— <i>T-21</i></small>
        </span>
      </span>
    </nav>

    <UiFilterBar :applied="[]" label="Filtros del catálogo de especies">
      <UiField
        v-model="query"
        label="Buscar"
        placeholder="Nombre científico o común"
        disabled
        data-mock="true"
        data-test="filter-search"
        help="La búsqueda por texto llega en T-21."
      />
      <UiField
        label="Exposición"
        as="select"
        :options="[]"
        disabled
        data-mock="true"
        data-test="filter-exposure"
        help="La exposición llega en T-17."
      />
      <UiField
        label="Temperatura"
        as="select"
        :options="[]"
        disabled
        data-mock="true"
        data-test="filter-temperature"
        help="Los filtros por rango llegan en T-21."
      />
    </UiFilterBar>

    <p v-if="loading" data-test="loading" role="status">Cargando el catálogo…</p>

    <UiInlineError v-else-if="error" data-test="error">{{ error }}</UiInlineError>

    <UiEmptyState
      v-else-if="isEmpty"
      title="Todavía no hay ninguna especie registrada"
      data-test="empty"
    >
      Una planta necesita una especie para darse de alta. Registra la primera para empezar.
      <template #action>
        <UiButton to="/species/new">Registrar la primera especie</UiButton>
      </template>
    </UiEmptyState>

    <template v-else-if="page?.content.length">
      <p class="result-count" data-test="result-count" aria-live="polite">
        Mostrando {{ page.content.length }} de {{ page.totalElements }} especies
      </p>

      <UiTable
        data-test="species-table"
        :columns="COLUMNS"
        :rows="page.content"
        row-key="id"
        :sort="sort"
        @update:sort="onSort"
      >
        <!-- La celda identificativa del prototipo: miniatura, código y los dos nombres. -->
        <template #cell-scientificName="{ row }">
          <NuxtLink class="species-cell" :to="`/species/${asSpecies(row).id}`" data-test="species-link">
            <span class="species-cell__thumb" aria-hidden="true">✺</span>
            <span>
              <code data-mock="true">CAT · T-15</code>
              <strong><em>{{ asSpecies(row).scientificName }}</em></strong>
              <small>{{ asSpecies(row).commonName }}</small>
            </span>
          </NuxtLink>
        </template>

        <!-- No existe en ningún endpoint: es T-17. Conserva la forma de rasgo del prototipo. -->
        <template #cell-exposure>
          <span class="trait" data-mock="true" data-test="col-exposure">
            <i aria-hidden="true">◔</i>
            <span>— <small>T-17</small></span>
          </span>
        </template>

        <!-- Sí existen, pero solo en la ficha: la marca lo dice para no fingir que faltan. -->
        <template #cell-temperature>
          <span class="cell-pending" data-mock="true" data-test="col-temperature">— <small>en la ficha</small></span>
        </template>

        <template #cell-watering>
          <span class="cell-pending" data-mock="true" data-test="col-watering">— <small>en la ficha</small></span>
        </template>

        <template #cell-soilMix>
          <span class="cell-pending" data-mock="true" data-test="col-soil-mix">— <small>en la ficha</small></span>
        </template>

        <template #cell-specimens>
          <span class="count-link" data-mock="true" data-test="specimens-count">— <small>T-15</small></span>
        </template>
      </UiTable>
    </template>

    <UiPagination
      :page="page?.pageNumber ?? 0"
      :total-pages="page?.totalPages ?? 0"
      :loading="loading"
      label="Paginación del catálogo de especies"
      @update:page="load"
    />

    <p class="catalog__note">
      <strong>En la ficha</strong> señala lo que el API sirve pero este listado no trae —temperatura,
      riego y sustrato—. Lo marcado con un ticket todavía no existe en ningún sitio.
    </p>
  </section>
</template>

<style scoped>
/*
 * Las tarjetas de grupo del prototipo: símbolo en círculo, nombre y recuento. La seleccionada va
 * en oscuro, que es lo que hace legible de un vistazo qué se está mirando.
 *
 * No es un componente del kit todavía: quien de verdad las va a usar es T-21, y sacar el patrón
 * antes de que exista su caso real es adivinarlo.
 */
.groups {
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  margin-bottom: var(--space-5);
}

.groups__card {
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-2);
  grid-template-columns: auto 1fr;
  min-height: 68px;
  padding: var(--space-2) var(--space-3);
}

.groups__card.is-selected {
  background: var(--color-brand-strong);
  border-color: var(--color-brand-strong);
  color: var(--color-surface);
}

.groups__card strong,
.groups__card small {
  display: block;
}

.groups__card strong {
  font-size: var(--font-size-12);
}

.groups__card small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin-top: 2px;
}

.groups__card.is-selected small {
  color: color-mix(in srgb, var(--color-surface) 75%, var(--color-brand-strong));
}

.groups__card small i {
  border: 1px dashed var(--color-line-strong);
  font-style: normal;
  padding: 0 2px;
}

.groups__symbol {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: 50%;
  color: var(--color-brand);
  display: flex;
  font-size: var(--font-size-15);
  height: 32px;
  justify-content: center;
  width: 32px;
}

.groups__card.is-selected .groups__symbol {
  background: color-mix(in srgb, var(--color-surface) 18%, transparent);
  color: var(--color-surface);
}

.groups__card.is-warning .groups__symbol {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.groups__card.is-info .groups__symbol,
.groups__card.is-cold .groups__symbol {
  background: var(--color-info-soft);
  color: var(--color-info);
}

.groups__card.is-winter .groups__symbol {
  background: color-mix(in srgb, var(--color-brand-soft) 60%, var(--color-surface-muted));
  color: var(--color-ink-muted);
}

.result-count {
  color: var(--color-ink-faint);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-2);
}

/* La celda identificativa: miniatura de 43 px con su aro, como en el prototipo. */
.species-cell {
  align-items: center;
  color: var(--color-ink);
  display: flex;
  gap: var(--space-3);
  text-decoration: none;
}

.species-cell__thumb {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  color: var(--color-brand);
  display: flex;
  flex: 0 0 auto;
  font-size: var(--font-size-24);
  height: 43px;
  justify-content: center;
  position: relative;
  width: 43px;
}

.species-cell__thumb::after {
  border: 1px solid color-mix(in srgb, var(--color-surface) 55%, transparent);
  border-radius: 50%;
  content: "";
  height: 25px;
  position: absolute;
  width: 25px;
}

.species-cell code,
.species-cell strong,
.species-cell small {
  display: block;
}

/* El código es de ejemplo hasta T-15: se marca, como en el inventario. */
.species-cell code {
  border: 1px dashed var(--color-line-strong);
  color: var(--color-ink-faint);
  font-family: var(--font-mono);
  font-size: var(--font-size-11);
  padding: 0 2px;
  width: fit-content;
}

.species-cell strong {
  color: var(--color-ink);
  font-size: var(--font-size-13);
  margin: 2px 0;
}

.species-cell small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}

/* El rasgo del prototipo: símbolo en círculo y su lectura al lado. */
.trait {
  align-items: center;
  display: inline-flex;
  gap: var(--space-2);
  white-space: nowrap;
}

.trait i {
  align-items: center;
  background: var(--color-surface-muted);
  border-radius: 50%;
  color: var(--color-ink-faint);
  display: inline-flex;
  font-style: normal;
  height: 24px;
  justify-content: center;
  width: 24px;
}

.trait span,
.cell-pending {
  color: var(--color-ink-faint);
}

.count-link {
  color: var(--color-ink-faint);
  font-weight: 700;
  white-space: nowrap;
}

.trait small,
.cell-pending small,
.count-link small {
  border: 1px dashed var(--color-line-strong);
  font-size: var(--font-size-11);
  font-weight: 400;
  padding: 0 2px;
}

.catalog__note {
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  margin-top: var(--space-5);
}
</style>
