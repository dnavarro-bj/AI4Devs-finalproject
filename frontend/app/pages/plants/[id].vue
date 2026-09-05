<script setup lang="ts">
import type { CareRecord, PlantDetail } from '../../types/api'
import { ApiError } from '../../types/api'

const route = useRoute()
const plantId = String(route.params.id)
const { detail } = usePlants()
const { set: setBreadcrumbs } = useBreadcrumbs()

const plant = ref<PlantDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

/*
 * Mientras la planta carga, el último nivel es neutro: no se inventa un nombre ni se deja el
 * hueco saltando de sitio cuando llega el dato (ADR-013, los datos llegan ya montada la página).
 */
setBreadcrumbs([{ label: 'Inventario', to: '/plants' }, { label: 'Planta' }])

onMounted(async () => {
  try {
    plant.value = await detail(plantId)
    setBreadcrumbs([{ label: 'Inventario', to: '/plants' }, { label: plant.value.nickname }])
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

    <div v-else-if="error" class="not-found">
      <UiInlineError title="No se ha podido abrir la planta" data-test="error">
        {{ error }}
        <template #action>
          <UiButton variant="secondary" to="/plants" data-test="back-to-inventory">
            Volver al inventario
          </UiButton>
        </template>
      </UiInlineError>
    </div>

    <template v-else-if="plant">
      <header class="plant__head">
        <h1>{{ plant.nickname }}</h1>
        <p class="plant__location">{{ plant.location.name }}</p>
        <ul class="tags" data-test="tags">
          <li v-for="tag in plant.tags" :key="tag.id">
            <UiStatus tone="neutral">{{ tag.name }}</UiStatus>
          </li>
          <li v-if="!plant.tags.length" class="tags__empty">Sin tags</li>
        </ul>
      </header>

      <div class="plant__stack">
        <SpeciesRanges :species="plant.species" />

        <CareRecordForm :plant-id="plant.id" @registered="onRegistered" />

        <UiPanel v-if="lastReading" title="Lectura registrada" data-test="last-reading">
          <ul class="reading-values">
            <li v-for="entry in readingValues" :key="entry.label">
              {{ entry.label }}: {{ entry.value }} {{ entry.unit }}
            </li>
          </ul>

          <RecommendationPanel
            :plant-id="plant.id"
            :care-record="lastReading"
            class="plant__analysis"
          />
        </UiPanel>
      </div>
    </template>
  </section>
</template>

<style scoped>
.plant__head {
  margin-bottom: var(--space-6);
}

.plant__head h1 {
  margin: 0;
}

.plant__location {
  color: var(--color-ink-muted);
  margin: var(--space-1) 0 0;
}

.plant__stack {
  display: grid;
  gap: var(--space-5);
}

.plant__analysis {
  margin-top: var(--space-5);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  list-style: none;
  margin: var(--space-3) 0 0;
  padding: 0;
}

.tags__empty {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

.reading-values {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.reading-values li {
  border-left: 3px solid var(--color-brand-soft);
  font-size: var(--font-size-13);
  padding-left: var(--space-3);
}

.not-found {
  display: grid;
  gap: var(--space-4);
}
</style>
