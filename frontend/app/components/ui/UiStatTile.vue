<script setup lang="ts">
/**
 * Una cifra del Dashboard y **el camino a lo que resume**.
 *
 * El §4.2 del documento de producto lo pide explícitamente: «12 alertas importantes» abre ese
 * listado ya filtrado. Una cifra que no lleva a ninguna parte obliga a buscar a mano lo que
 * acaba de contarse.
 *
 * Sin `to` se pinta como dato y no como control: un tile que parece pulsable y no hace nada es
 * peor que uno que no lo parece.
 *
 * Una métrica en **cero se muestra**. El cero es información —«hoy no hay nada vencido»—, no
 * ausencia de dato, y ocultar el bloque dejaría al usuario sin saber si es que no hay o es que
 * no se ha mirado.
 */
type Tone = 'neutral' | 'info' | 'warning' | 'danger'

const props = withDefaults(defineProps<{
  value: number | string
  label: string
  context?: string
  to?: string
  tone?: Tone
  layout?: 'stacked' | 'row'
}>(), { context: undefined, to: undefined, tone: 'neutral', layout: 'stacked' })

/** La severidad se lee, no solo se ve: el color nunca es la única señal (ADR-014). */
const TONE_LABELS: Record<Tone, string | null> = {
  neutral: null,
  info: 'Informativo',
  warning: 'Atención',
  danger: 'Crítico',
}

const toneLabel = computed(() => TONE_LABELS[props.tone])

// Navegar es una acción: con destino, el elemento correcto es un enlace. Sin él, no es un control.
const tag = computed(() => (props.to ? resolveComponent('NuxtLink') : 'div'))
</script>

<template>
  <component
    :is="tag"
    :to="to"
    class="stat-tile"
    :class="[`is-${tone}`, `is-${layout}`, { 'is-navigable': to }]"
  >
    <span class="stat-tile__value">{{ value }}</span>
    <span class="stat-tile__body">
      <span class="stat-tile__label">{{ label }}</span>
      <span v-if="context" class="stat-tile__context">{{ context }}</span>
      <span v-if="toneLabel" class="stat-tile__tone" data-test="tone-label">{{ toneLabel }}</span>
    </span>
    <span v-if="to && layout === 'row'" class="stat-tile__arrow" aria-hidden="true">→</span>
  </component>
</template>

<style scoped>
.stat-tile {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-left: 3px solid var(--color-line-strong);
  border-radius: var(--radius-md);
  color: var(--color-ink);
  display: block;
  padding: var(--space-4);
  text-decoration: none;
}

.stat-tile.is-navigable:hover {
  border-color: var(--color-brand);
}

.stat-tile__value {
  display: block;
  font-size: var(--font-size-38);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.stat-tile__label {
  color: var(--color-ink);
  display: block;
  font-size: var(--font-size-13);
  font-weight: 700;
}

.stat-tile__body {
  display: block;
  min-width: 0;
}

.stat-tile__context {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-12);
}

/* La severidad, además del borde, en texto. */
.stat-tile__tone {
  display: inline-block;
  font-size: var(--font-size-11);
  font-weight: 700;
  letter-spacing: 0.06em;
  margin-top: var(--space-2);
  text-transform: uppercase;
}

.stat-tile.is-info {
  border-left-color: var(--color-info);
}

.stat-tile.is-info .stat-tile__tone {
  color: var(--color-info);
}

.stat-tile.is-warning {
  border-left-color: var(--color-warning);
}

.stat-tile.is-warning .stat-tile__tone {
  color: var(--color-warning);
}

.stat-tile.is-danger {
  border-left-color: var(--color-danger);
}

.stat-tile.is-danger .stat-tile__tone {
  color: var(--color-danger);
}

.stat-tile.is-row {
  align-items: center;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.stat-tile.is-row .stat-tile__value {
  min-width: var(--space-10);
}

.stat-tile__arrow {
  color: var(--color-ink-muted);
  font-size: var(--font-size-17);
}
</style>
