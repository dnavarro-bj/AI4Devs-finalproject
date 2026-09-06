<script setup lang="ts">
/**
 * Partes de un total, con validación visual: la composición de una mezcla de sustrato.
 *
 * **Señala cuando la suma no cuadra**, y en cuánto. El API rechaza una mezcla cuyos porcentajes no
 * sumen 100, así que la interfaz debe decirlo antes de enviar, no después del error.
 *
 * El valor de cada parte se lee como texto además de verse como longitud: una barra sin cifra
 * obliga a estimar a ojo lo que es un dato exacto.
 */
const props = withDefaults(defineProps<{
  parts: { label: string, value: number }[]
  total?: number
  unit?: string
}>(), { total: 100, unit: '%' })

const sum = computed(() => props.parts.reduce((acc, part) => acc + part.value, 0))
const drift = computed(() => sum.value - props.total)
const percent = (value: number) => `${(value / props.total) * 100}%`
</script>

<template>
  <div class="proportion">
    <div class="proportion__track">
      <span
        v-for="part in parts"
        :key="part.label"
        class="proportion__fill"
        :style="{ width: percent(part.value) }"
        :title="part.label"
      />
    </div>

    <ul class="proportion__legend">
      <li v-for="part in parts" :key="part.label" data-role="part">
        <span>{{ part.label }}</span>
        <strong>{{ part.value }}{{ unit }}</strong>
      </li>
    </ul>

    <p v-if="drift !== 0" class="proportion__mismatch" data-test="mismatch" role="alert">
      {{ drift > 0 ? 'Se pasa en' : 'Faltan' }} {{ Math.abs(drift) }}{{ unit }}
      para sumar {{ total }}{{ unit }}.
    </p>
  </div>
</template>

<style scoped>
.proportion__track {
  background: var(--color-surface-muted);
  border-radius: var(--radius-pill);
  display: flex;
  height: 12px;
  overflow: hidden;
}

.proportion__fill {
  display: block;
}

.proportion__fill:nth-child(odd) {
  background: var(--color-brand);
}

.proportion__fill:nth-child(even) {
  background: var(--color-brand-strong);
}

.proportion__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  list-style: none;
  margin: var(--space-2) 0 0;
  padding: 0;
}

.proportion__legend li {
  font-size: var(--font-size-12);
}

.proportion__legend span {
  color: var(--color-ink-muted);
  margin-right: var(--space-1);
}

.proportion__mismatch {
  color: var(--color-danger);
  font-size: var(--font-size-12);
  font-weight: 700;
  margin: var(--space-2) 0 0;
}
</style>
