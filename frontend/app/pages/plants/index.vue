<script setup lang="ts">
import type { PageResponse, PlantSummary } from '../../types/api'
import { ApiError } from '../../types/api'

const { list } = usePlants()

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
</script>

<template>
  <section>
    <div class="inventory__head">
      <h1>Inventario</h1>
      <NuxtLink to="/plants/nueva" data-test="new-plant">Añadir planta</NuxtLink>
    </div>

    <p v-if="loading" data-test="loading" role="status">Cargando el inventario…</p>
    <p v-else-if="error" data-test="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="isEmpty" data-test="empty">
      Todavía no hay ninguna planta registrada. Añade la primera para empezar.
    </p>

    <table v-else-if="page?.content.length" data-test="plants-table">
      <thead>
        <tr>
          <th>Planta</th>
          <th>Especie</th>
          <th>Localización</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="plant in page.content" :key="plant.id">
          <td>
            <NuxtLink :to="`/plants/${plant.id}`" data-test="plant-link">{{ plant.nickname }}</NuxtLink>
          </td>
          <td>{{ plant.species.scientificName }}</td>
          <td>{{ plant.location.name }}</td>
        </tr>
      </tbody>
    </table>

    <nav v-if="hasPages" class="pager">
      <button
        type="button"
        data-test="previous-page"
        :disabled="isFirst || loading"
        @click="load((page?.pageNumber ?? 0) - 1)"
      >
        Anterior
      </button>
      <span data-test="page-indicator">
        Página {{ (page?.pageNumber ?? 0) + 1 }} de {{ page?.totalPages }}
      </span>
      <button
        type="button"
        data-test="next-page"
        :disabled="isLast || loading"
        @click="load((page?.pageNumber ?? 0) + 1)"
      >
        Siguiente
      </button>
    </nav>
  </section>
</template>

<style scoped>
.inventory__head {
  align-items: baseline;
  display: flex;
  gap: var(--space);
  justify-content: space-between;
}

table {
  background: var(--color-surface);
  border-collapse: collapse;
  width: 100%;
}

th,
td {
  border-bottom: 1px solid var(--color-border);
  padding: 0.6rem;
  text-align: left;
}

.pager {
  align-items: center;
  display: flex;
  gap: var(--space);
  margin-top: var(--space);
}

.error {
  color: var(--color-danger);
}
</style>
