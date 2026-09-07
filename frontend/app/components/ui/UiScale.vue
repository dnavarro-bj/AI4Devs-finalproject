<script setup lang="ts">
/**
 * Un rango situado sobre una escala continua con sus dos extremos nombrados.
 *
 * Nace para el pH de una mezcla —5,8 no dice nada a quien no tenga la escala memorizada—, pero el
 * problema es el mismo para la temperatura o la humedad de una especie, así que los límites y los
 * nombres de los extremos entran por prop: **un componente que supiera de pH dejaría de ser
 * genérico**, que es la misma regla que sigue la cronología con los tipos de evento.
 *
 * Dos cuidados que no son adorno:
 *
 * * **Un rango de un solo punto sigue viéndose.** Un mínimo igual al máximo daría anchura cero y
 *   desaparecería justo cuando el dato es más preciso.
 * * **Un rango que se sale se recorta**, no desborda la escala; el valor sigue leyéndose como
 *   texto, que es donde está el dato de verdad.
 */
const props = withDefaults(defineProps<{
  min: number
  max: number
  from: number
  to: number
  lowLabel: string
  highLabel: string
  label?: string
}>(), { label: undefined })

/** Anchura mínima del tramo, en tanto por ciento: por debajo, un rango exacto se volvería invisible. */
const MIN_SPAN = 1.5

const clamp = (value: number) => Math.min(Math.max(value, props.min), props.max)

const positionOf = (value: number) => ((clamp(value) - props.min) / (props.max - props.min)) * 100

const left = computed(() => positionOf(props.from))

const width = computed(() => Math.min(
  Math.max(positionOf(props.to) - left.value, MIN_SPAN),
  100 - left.value,
))

const description = computed(
  () => `${props.label ? `${props.label}: ` : ''}de ${props.from} a ${props.to}, en una escala de ${props.min} a ${props.max}`,
)
</script>

<template>
  <div class="scale" role="img" :aria-label="description">
    <span class="scale__end">{{ lowLabel }}</span>

    <div class="scale__track">
      <i
        class="scale__span"
        data-test="span"
        :style="{ left: `${left}%`, width: `${width}%` }"
      />
      <b class="scale__value" :style="{ left: `${left}%` }">{{ from }}</b>
      <b class="scale__value is-end" :style="{ left: `${left + width}%` }">{{ to }}</b>
    </div>

    <span class="scale__end">{{ highLabel }}</span>
  </div>
</template>

<style scoped>
.scale {
  align-items: center;
  display: flex;
  gap: var(--space-3);
  padding-bottom: var(--space-5);
}

.scale__end {
  color: var(--color-ink-muted);
  flex-shrink: 0;
  font-size: var(--font-size-11);
}

.scale__track {
  background: var(--color-surface-muted);
  border-radius: var(--radius-pill);
  flex: 1;
  height: 8px;
  position: relative;
}

.scale__span {
  background: var(--color-brand);
  border-radius: var(--radius-pill);
  display: block;
  height: 100%;
  position: absolute;
  top: 0;
}

.scale__value {
  color: var(--color-ink);
  font-size: var(--font-size-11);
  font-weight: 700;
  position: absolute;
  top: calc(100% + var(--space-1));
  transform: translateX(-50%);
  white-space: nowrap;
}
</style>
