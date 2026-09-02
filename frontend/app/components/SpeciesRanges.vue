<script setup lang="ts">
import type { SpeciesCare } from '../types/api'

/**
 * Los cuidados recomendados de una especie. Vienen del catálogo, nunca de la IA (historia 0.3).
 * Lo usan la ficha de la planta y el selector de especie del alta.
 */
defineProps<{ species: SpeciesCare }>()
</script>

<template>
  <div class="ranges" data-test="species-ranges">
    <h3>Cuidados recomendados de {{ species.scientificName }}</h3>
    <dl>
      <div>
        <dt>Humedad</dt>
        <dd>{{ species.minHumidity }}–{{ species.maxHumidity }} %</dd>
      </div>
      <div>
        <dt>Temperatura</dt>
        <dd>{{ species.minTemperature }}–{{ species.maxTemperature }} °C</dd>
      </div>
      <div>
        <dt>Horas de luz</dt>
        <dd>{{ species.minLightHours }}–{{ species.maxLightHours }} h</dd>
      </div>
      <div>
        <dt>Riego</dt>
        <dd>{{ species.wateringGuideline }}</dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.ranges {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space);
}

h3 {
  font-size: 1rem;
  margin: 0 0 0.5rem;
}

dl {
  display: grid;
  gap: 0.4rem 1rem;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  margin: 0;
}

dt {
  color: var(--color-muted);
  font-size: 0.85rem;
}

dd {
  margin: 0;
}
</style>
