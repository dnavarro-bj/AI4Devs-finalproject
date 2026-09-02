<script setup lang="ts">
import type { CareRecord, PlantDetail } from '../../types/api'
import { ApiError } from '../../types/api'

const route = useRoute()
const plantId = String(route.params.id)
const { detail } = usePlants()

const plant = ref<PlantDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Ya montada, no en `setup`: ver ADR-013.
onMounted(async () => {
  try {
    plant.value = await detail(plantId)
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'No se ha podido cargar la planta.'
  } finally {
    loading.value = false
  }
})

/**
 * La última lectura registrada en esta sesión. La ficha la refleja en cuanto se guarda, sin que
 * el usuario recargue; el historial completo es T-06.
 */
const lastReading = ref<CareRecord | null>(null)

function onRegistered(record: CareRecord) {
  lastReading.value = record
}

const readingValues = computed(() => {
  const record = lastReading.value
  if (!record) return []
  return [
    { label: 'Humedad', value: record.humidity, unit: '%' },
    { label: 'Temperatura', value: record.temperature, unit: '°C' },
    { label: 'Horas de luz', value: record.lightHours, unit: 'h' },
    { label: 'Riego', value: record.waterAmountMl, unit: 'ml' },
    { label: 'Acidez', value: record.soilPh, unit: 'pH' },
  ].filter((entry) => entry.value != null) // `!=` a propósito: el API omite los no informados
})
</script>

<template>
  <section>
    <p v-if="loading" data-test="loading" role="status">Cargando la planta…</p>

    <div v-else-if="error">
      <p class="error" data-test="error" role="alert">{{ error }}</p>
      <NuxtLink to="/plants" data-test="back-to-inventory">Volver al inventario</NuxtLink>
    </div>

    <template v-else-if="plant">
      <header class="plant__head">
        <h1>{{ plant.nickname }}</h1>
        <p class="plant__location">{{ plant.location.name }}</p>
        <ul class="tags" data-test="tags">
          <li v-for="tag in plant.tags" :key="tag.id">{{ tag.name }}</li>
          <li v-if="!plant.tags.length" class="tags__empty">Sin tags</li>
        </ul>
      </header>

      <SpeciesRanges :species="plant.species" />

      <CareRecordForm :plant-id="plant.id" @registered="onRegistered" />

      <section v-if="lastReading" class="last-reading" data-test="last-reading">
        <h2>Lectura registrada</h2>
        <ul>
          <li v-for="entry in readingValues" :key="entry.label">
            {{ entry.label }}: {{ entry.value }} {{ entry.unit }}
          </li>
        </ul>

        <RecommendationPanel :plant-id="plant.id" :care-record="lastReading" />
      </section>
    </template>
  </section>
</template>

<style scoped>
.last-reading {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  margin-top: var(--space);
  padding: var(--space);
}

.last-reading h2 {
  font-size: 1.05rem;
  margin: 0 0 0.5rem;
}

.last-reading ul {
  margin: 0;
  padding-left: 1.1rem;
}

.plant__head {
  margin-bottom: var(--space);
}

h1 {
  margin: 0;
}

.plant__location {
  color: var(--color-muted);
  margin: 0.2rem 0;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
}

.tags li {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.85rem;
  padding: 0.15rem 0.6rem;
}

.tags__empty {
  background: none;
  border: none;
  color: var(--color-muted);
  padding-left: 0;
}

.error {
  color: var(--color-danger);
}
</style>
