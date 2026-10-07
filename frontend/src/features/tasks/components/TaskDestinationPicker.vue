<script setup lang="ts">
/**
 * El destino de una tarea: **una localización** o **plantas concretas** (hasta 500), nunca las dos.
 *
 * No busca ni carga nada: recibe las localizaciones, los resultados de la búsqueda y el texto, y
 * emite lo que cambia. Quien lo monta (el diálogo, vía su composable) es quien habla con el API.
 */
import { MAX_TARGET_PLANTS, type DestinationValue, type PickablePlant } from '../composables/useTaskDestination'

const props = defineProps<{
  modelValue: DestinationValue
  locationOptions: { value: string, label: string }[]
  /** Plantas que hay ahora en la localización elegida y debajo de ella; `null` si no se sabe. */
  locationCount: number | null
  results: PickablePlant[]
  query: string
  searching?: boolean
  searchError?: string | null
  /** El error de validación del destino, junto al control. */
  error?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [DestinationValue], 'update:query': [string] }>()

const MODES = [
  { value: 'location', label: 'Localización' },
  { value: 'plants', label: 'Plantas concretas' },
]

const update = (patch: Partial<DestinationValue>) => emit('update:modelValue', { ...props.modelValue, ...patch })

const picked = computed(() => new Set(props.modelValue.plants.map((plant) => plant.id)))
const available = computed(() => props.results.filter((plant) => !picked.value.has(plant.id)))
const full = computed(() => props.modelValue.plants.length >= MAX_TARGET_PLANTS)

const add = (plant: PickablePlant) => {
  if (!full.value) update({ plants: [...props.modelValue.plants, plant] })
}
const remove = (id: string) => update({ plants: props.modelValue.plants.filter((plant) => plant.id !== id) })

const countText = computed(() => {
  const count = props.modelValue.plants.length
  return `${count} ${count === 1 ? 'planta' : 'plantas'}`
})
</script>

<template>
  <div class="destination" data-test="task-destination">
    <UiSegmentedControl
      label="Destino"
      :options="MODES"
      :model-value="modelValue.mode"
      @update:model-value="update({ mode: $event as DestinationValue['mode'] })"
    />

    <template v-if="modelValue.mode === 'location'">
      <UiField
        label="Localización"
        as="select"
        placeholder="Elige una localización"
        :options="locationOptions"
        :model-value="modelValue.locationId"
        data-test="destination-location"
        @update:model-value="update({ locationId: String($event ?? '') })"
      />
      <p v-if="modelValue.locationId && locationCount !== null" class="destination__count" data-test="destination-count">
        Afecta ahora a {{ locationCount }} {{ locationCount === 1 ? 'planta' : 'plantas' }}, con las de sus sublocalizaciones.
      </p>
    </template>

    <template v-else>
      <UiField
        label="Buscar plantas"
        type="search"
        placeholder="Código, apodo o especie"
        autocomplete="off"
        :model-value="query"
        data-test="destination-search"
        @update:model-value="emit('update:query', String($event ?? ''))"
      />
      <p v-if="searching" class="destination__hint" role="status">Buscando…</p>
      <p v-else-if="searchError" class="destination__hint destination__hint--error">{{ searchError }}</p>

      <ul v-if="available.length" class="destination__results" aria-label="Resultados de la búsqueda">
        <li v-for="plant in available" :key="plant.id">
          <button type="button" :disabled="full" data-test="destination-add" @click="add(plant)">
            <code>{{ plant.code }}</code>
            <strong>{{ plant.nickname }}</strong>
            <small>{{ plant.detail }}</small>
            <span aria-hidden="true">＋</span>
          </button>
        </li>
      </ul>
      <p v-else-if="query.trim() && !searching && !searchError" class="destination__hint">Ninguna planta en curso coincide.</p>

      <ul v-if="modelValue.plants.length" class="destination__chosen" aria-label="Plantas elegidas" data-test="destination-chosen">
        <li v-for="plant in modelValue.plants" :key="plant.id">
          <code>{{ plant.code }}</code> {{ plant.nickname }}
          <button type="button" :aria-label="`Quitar ${plant.code}`" data-test="destination-remove" @click="remove(plant.id)">×</button>
        </li>
      </ul>

      <p class="destination__count" data-test="destination-count" aria-live="polite">
        {{ countText }} · máximo {{ MAX_TARGET_PLANTS }}
      </p>
    </template>

    <p v-if="error" class="destination__error" role="alert" data-test="destination-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.destination {
  display: grid;
  gap: var(--space-3);
}

.destination__count,
.destination__hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}

.destination__hint--error,
.destination__error {
  color: var(--color-danger);
  font-size: var(--font-size-12);
  margin: 0;
}

.destination__results,
.destination__chosen {
  display: grid;
  gap: var(--space-2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.destination__results button {
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: grid;
  font: inherit;
  gap: var(--space-3);
  grid-template-columns: auto auto 1fr auto;
  padding: var(--space-2) var(--space-3);
  text-align: left;
  width: 100%;
}

.destination__results button:hover:not(:disabled) {
  border-color: var(--color-brand);
}

.destination__results small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}

.destination__chosen {
  display: flex;
  flex-wrap: wrap;
}

.destination__chosen li {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-pill);
  display: inline-flex;
  font-size: var(--font-size-12);
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3);
}

.destination__chosen button {
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  font: inherit;
  height: 22px;
  width: 22px;
}

code {
  font-family: var(--font-mono);
  font-size: var(--font-size-11);
}
</style>
