<script setup lang="ts">
/**
 * Marca de gravedad: un glifo propio por nivel **más** el texto que el llamador pone en el slot. Es la
 * respuesta a «¿cuánto de grave?» en un renglón, para listas y celdas donde una etiqueta rellena
 * ([UiPriority](./UiPriority.vue)) pesaría demasiado.
 *
 * **La gravedad no depende del color**: cada nivel tiene su forma —▲, ● y ○— y el color solo la
 * refuerza. Con `mark-only` pinta únicamente el glifo, para quien ya dice el nivel con palabras en
 * otro sitio (la marca lateral de una tarjeta).
 */
type Level = 'high' | 'medium' | 'low'

const MARKS: Record<Level, string> = { high: '▲', medium: '●', low: '○' }

withDefaults(defineProps<{ level?: Level, markOnly?: boolean }>(), { level: 'low', markOnly: false })
</script>

<template>
  <span :class="['severity-mark', `severity-mark--${level}`]">
    <span class="severity-mark__glyph" aria-hidden="true">{{ MARKS[level] }}</span>
    <template v-if="!markOnly">{{ ' ' }}<slot /></template>
  </span>
</template>

<style scoped>
.severity-mark {
  color: var(--color-ink-muted);
  white-space: nowrap;
}

.severity-mark--medium {
  color: var(--color-warning);
}

.severity-mark--high {
  color: var(--color-danger);
  font-weight: 700;
}
</style>
