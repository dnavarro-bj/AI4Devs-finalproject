<script setup lang="ts">
/**
 * El perfil de cuidados que se **aplica** a un ejemplar, y de dónde viene cada valor.
 *
 * El servidor lo entrega ya resuelto (`effectiveCare`): aquí no se mezcla nada, y así el cliente no
 * puede mostrar un valor que el servidor no aplica. Cada concepto lleva su **marca en texto** —«propio»
 * o «de la especie»— y lo propio se distingue además por su forma —trazo lateral y cuadrado—, no solo
 * por el color: el color solo, como cualquier otra señal única, no lo ve todo el mundo.
 *
 * Un concepto es propio si **alguno** de sus campos lo es: sobrescribir un solo extremo de un rango
 * aparta ya a todo el rango de lo que dice la especie.
 */
import type { EffectiveCare } from '../types/plant.types'

const props = defineProps<{ care: EffectiveCare, speciesName: string }>()

interface Concept {
  key: string
  label: string
  value: string
  own: boolean
}

const has = (...fields: string[]) => fields.some((field) => props.care.overridden.includes(field))

const concepts = computed<Concept[]>(() => [
  { key: 'humidity', label: 'Humedad', value: `${props.care.minHumidity}–${props.care.maxHumidity} %`, own: has('minHumidity', 'maxHumidity') },
  { key: 'temperature', label: 'Temperatura', value: `${props.care.minTemperature}–${props.care.maxTemperature} °C`, own: has('minTemperature', 'maxTemperature') },
  { key: 'light', label: 'Horas de luz', value: `${props.care.minLightHours}–${props.care.maxLightHours} h`, own: has('minLightHours', 'maxLightHours') },
  { key: 'watering', label: 'Riego', value: props.care.wateringGuideline, own: has('wateringGuideline') },
  { key: 'soil', label: 'Sustrato', value: props.care.soilMix.name, own: has('soilMix') },
])

const ownCount = computed(() => concepts.value.filter((concept) => concept.own).length)
</script>

<template>
  <section class="effective-care" data-test="effective-care">
    <dl>
      <div
        v-for="concept in concepts"
        :key="concept.key"
        :class="{ 'is-own': concept.own }"
        :data-origin="concept.own ? 'own' : 'species'"
        :data-test="`care-${concept.key}`"
      >
        <dt>{{ concept.label }}</dt>
        <dd>
          <strong>{{ concept.value }}</strong>
          <small data-test="origin-mark">{{ concept.own ? '▪ propio' : 'de la especie' }}</small>
        </dd>
      </div>
    </dl>

    <p v-if="!ownCount" class="effective-care__note" data-test="inherits-all">
      Hereda toda la pauta de su especie, <em>{{ speciesName }}</em>.
    </p>
    <p v-else class="effective-care__note" data-test="own-summary">
      {{ ownCount }} {{ ownCount === 1 ? 'concepto se aparta' : 'conceptos se apartan' }} de la pauta de
      <em>{{ speciesName }}</em>; el resto lo hereda.
    </p>
  </section>
</template>

<style scoped>
dl {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

dl > div {
  border-left: 3px solid var(--color-line);
  display: grid;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
}

/* Lo propio, con otra forma —trazo más grueso y de otro color— además de su marca en texto. */
dl > div.is-own {
  background: var(--color-surface-muted);
  border-left: 5px solid var(--color-brand);
}

dt {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

dd {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
}

small,
.effective-care__note {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

.effective-care__note {
  margin: var(--space-3) 0 0;
}
</style>
