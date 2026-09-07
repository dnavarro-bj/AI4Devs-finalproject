<script setup lang="ts">
/**
 * Partes de un total como anillo, con la dominante en el centro.
 *
 * Es el hermano de `UiProportionBar` para cuando el reparto **es** la identidad de la cosa —la
 * composición de una mezcla de sustrato en su ficha— y no un dato más de una fila.
 *
 * Se dibuja con un `conic-gradient` y no con SVG: son sectores de un círculo, que es exactamente
 * lo que ese gradiente expresa, y así no hay que calcular arcos ni cargar una librería.
 *
 * **El dibujo no es el dato.** El anillo es decorativo para quien lo ve; lo que se anuncia es el
 * reparto completo, y las cifras se leen también como texto.
 *
 * **El tono lo decide quien la usa**: un kit que sabe qué es «orgánico» deja de ser un kit.
 */
export interface WheelPart {
  label: string
  value: number
  tone?: 'brand' | 'info' | 'warning' | 'danger' | 'neutral'
}

const props = withDefaults(defineProps<{
  parts: WheelPart[]
  total?: number
  unit?: string
}>(), { total: 100, unit: '%' })

const TONES: Record<string, string> = {
  neutral: 'var(--color-ink-muted)',
  brand: 'var(--color-brand)',
  info: 'var(--color-info)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
}

const dominant = computed(
  () => [...props.parts].sort((a, b) => b.value - a.value)[0] ?? null,
)

/** Las demás, en el orden en que llegan: el centro ya destaca a la dominante. */
const rest = computed(() => props.parts.filter((part) => part !== dominant.value))

const description = computed(
  () => props.parts.map((part) => `${part.label} ${part.value}${props.unit}`).join(', '),
)

/**
 * Los cortes del gradiente, acumulando: cada parte va de donde acabó la anterior a su propio fin.
 * Se calcula aquí y no en el template porque un `conic-gradient` a trozos es ilegible en el HTML.
 */
const gradient = computed(() => {
  let at = 0
  const stops = props.parts.map((part) => {
    const from = (at / props.total) * 360
    at += part.value
    const to = (at / props.total) * 360
    return `${TONES[part.tone ?? 'neutral']} ${from}deg ${to}deg`
  })
  return `conic-gradient(${stops.join(', ')})`
})
</script>

<template>
  <div class="wheel" role="img" :aria-label="description">
    <div class="wheel__ring" :style="{ background: gradient }">
      <span class="wheel__hole">
        <span v-if="dominant" data-test="wheel-center">
          <strong>{{ dominant.value }}<i>{{ unit }}</i></strong>
          <small>{{ dominant.label }}</small>
        </span>
      </span>
    </div>

    <ul class="wheel__legend">
      <li
        v-for="part in parts"
        :key="part.label"
        data-role="sector"
        :class="`is-${part.tone ?? 'neutral'}`"
      >
        <span class="wheel__dot" aria-hidden="true" />
        <span>{{ part.label }}</span>
        <strong>{{ part.value }}{{ unit }}</strong>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.wheel {
  align-items: center;
  display: flex;
  gap: var(--space-4);
}

.wheel__ring {
  border-radius: 50%;
  display: grid;
  flex-shrink: 0;
  height: 116px;
  place-items: center;
  width: 116px;
}

.wheel__hole {
  align-items: center;
  background: var(--color-surface);
  border-radius: 50%;
  display: flex;
  height: 78px;
  justify-content: center;
  text-align: center;
  width: 78px;
}

.wheel__hole strong {
  display: block;
  font-size: var(--font-size-24);
  line-height: 1.1;
}

.wheel__hole i {
  font-size: var(--font-size-12);
  font-style: normal;
}

.wheel__hole small {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-11);
}

.wheel__legend {
  display: grid;
  gap: var(--space-1);
  list-style: none;
  margin: 0;
  padding: 0;
}

.wheel__legend li {
  align-items: center;
  display: flex;
  font-size: var(--font-size-12);
  gap: var(--space-2);
}

.wheel__legend li > span:nth-of-type(2) {
  color: var(--color-ink-muted);
}

.wheel__dot {
  border-radius: 50%;
  display: inline-block;
  height: 10px;
  width: 10px;
  background: var(--color-ink-muted);
}

.wheel__legend li.is-brand .wheel__dot {
  background: var(--color-brand);
}

.wheel__legend li.is-info .wheel__dot {
  background: var(--color-info);
}

.wheel__legend li.is-warning .wheel__dot {
  background: var(--color-warning);
}

.wheel__legend li.is-danger .wheel__dot {
  background: var(--color-danger);
}
</style>
