<script setup lang="ts">
/**
 * Partes de un total, con validación visual: la composición de una mezcla de sustrato.
 *
 * **Señala cuando la suma no cuadra**, y en cuánto. El API rechaza una mezcla cuyos porcentajes no
 * sumen 100, así que la interfaz debe decirlo antes de enviar, no después del error.
 *
 * El valor de cada parte se lee como texto además de verse como longitud: una barra sin cifra
 * obliga a estimar a ojo lo que es un dato exacto. **Las dos variantes lo conservan**, que es lo
 * que impide que «compacto» acabe significando «con la mitad de la información».
 *
 * * `labels="inside"` rotula cada parte dentro de su tramo, para la ficha, donde la barra es la
 *   figura principal y una leyenda aparte sería redundante.
 * * `size="compact"` la reduce a la altura de una fila de tabla, para la celda del catálogo.
 *
 * **El tono lo decide quien la usa.** El componente no sabe que «orgánico» es cálido: un kit que
 * conoce el dominio deja de ser un kit, que es la misma regla que sigue la cronología con los
 * tipos de evento.
 */
export interface ProportionPart {
  label: string
  value: number
  tone?: 'brand' | 'info' | 'warning' | 'danger' | 'neutral'
}

const props = withDefaults(defineProps<{
  parts: ProportionPart[]
  total?: number
  unit?: string
  labels?: 'below' | 'inside'
  size?: 'default' | 'compact'
}>(), { total: 100, unit: '%', labels: 'below', size: 'default' })

const sum = computed(() => props.parts.reduce((acc, part) => acc + part.value, 0))
const drift = computed(() => sum.value - props.total)
const percent = (value: number) => `${(value / props.total) * 100}%`

/**
 * Por debajo de este ancho la etiqueta interior se oculta y queda el color con su título: un texto
 * recortado a la mitad es peor que ninguno, y la cifra sigue estando en el `title`.
 */
const NARROW = 18

const isNarrow = (value: number) => (value / props.total) * 100 < NARROW
</script>

<template>
  <div class="proportion" :class="[`is-${size}`, `has-labels-${labels}`]">
    <div class="proportion__track">
      <span
        v-for="part in parts"
        :key="part.label"
        class="proportion__fill"
        :class="`is-${part.tone ?? 'neutral'}`"
        :style="{ width: percent(part.value) }"
        :title="`${part.label}: ${part.value}${unit}`"
      >
        <template v-if="labels === 'inside' && !isNarrow(part.value)">
          <strong>{{ part.value }}{{ unit }}</strong>
          <small>{{ part.label }}</small>
        </template>
      </span>
    </div>

    <ul v-if="labels === 'below'" class="proportion__legend">
      <li v-for="part in parts" :key="part.label" data-role="part">
        <span class="proportion__dot" :class="`is-${part.tone ?? 'neutral'}`" aria-hidden="true" />
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

.has-labels-inside .proportion__track {
  border-radius: var(--radius-md);
  height: auto;
  min-height: 48px;
}

.is-compact .proportion__track {
  height: 8px;
}

.proportion__fill {
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  background: var(--color-brand);
  color: var(--color-surface);
}

.proportion__fill.is-neutral {
  background: var(--color-ink-muted);
}

.proportion__fill.is-brand {
  background: var(--color-brand);
}

.proportion__fill.is-info {
  background: var(--color-info);
}

.proportion__fill.is-warning {
  background: var(--color-warning);
}

.proportion__fill.is-danger {
  background: var(--color-danger);
}

.proportion__fill strong {
  font-size: var(--font-size-15);
  line-height: 1.1;
}

.proportion__fill small {
  font-size: var(--font-size-11);
  opacity: 0.85;
}

.proportion__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  list-style: none;
  margin: var(--space-2) 0 0;
  padding: 0;
}

.is-compact .proportion__legend {
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.proportion__legend li {
  align-items: center;
  display: flex;
  font-size: var(--font-size-12);
  gap: var(--space-1);
}

.is-compact .proportion__legend li {
  font-size: var(--font-size-11);
}

.proportion__legend > li > span:nth-of-type(2) {
  color: var(--color-ink-muted);
}

.proportion__dot {
  border-radius: 50%;
  display: inline-block;
  height: 8px;
  width: 8px;
  background: var(--color-ink-muted);
}

.proportion__dot.is-brand {
  background: var(--color-brand);
}

.proportion__dot.is-info {
  background: var(--color-info);
}

.proportion__dot.is-warning {
  background: var(--color-warning);
}

.proportion__dot.is-danger {
  background: var(--color-danger);
}

.proportion__mismatch {
  color: var(--color-danger);
  font-size: var(--font-size-12);
  font-weight: 700;
  margin: var(--space-2) 0 0;
}
</style>
