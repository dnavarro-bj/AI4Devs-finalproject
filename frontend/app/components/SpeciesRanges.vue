<script setup lang="ts">
import type { SpeciesCare } from '../types/api'

/**
 * Los cuidados recomendados de una especie. Vienen del catálogo, nunca de la IA (historia 0.3).
 * Lo usan la ficha de la planta y el selector de especie del alta.
 */
defineProps<{ species: SpeciesCare }>()
</script>

<template>
  <UiPanel :title="`Cuidados recomendados de ${species.scientificName}`" data-test="species-ranges">
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
  </UiPanel>
</template>

<style scoped>
dl {
  display: grid;
  gap: var(--space-3) var(--space-5);
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  margin: 0;
}

dt {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

dd {
  font-weight: 700;
  margin: 0;
}
</style>
