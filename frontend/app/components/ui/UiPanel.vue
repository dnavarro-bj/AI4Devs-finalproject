<script setup lang="ts">
/**
 * Panel: agrupa **una** responsabilidad. Borde y superficie, nunca sombra —esa se reserva a lo
 * realmente superpuesto—. La cabecera alinea el título con una sola acción contextual.
 */
withDefaults(defineProps<{
  title?: string
  eyebrow?: string
  eyebrowTone?: 'neutral' | 'danger'
  as?: string
}>(), { title: undefined, eyebrow: undefined, eyebrowTone: 'neutral', as: 'section' })
</script>

<template>
  <component :is="as" class="panel">
    <header v-if="title || eyebrow || $slots.title">
      <div>
        <p v-if="eyebrow" class="panel__eyebrow" :class="`is-${eyebrowTone}`">{{ eyebrow }}</p>
        <h2><slot name="title">{{ title }}</slot></h2>
      </div>
      <slot name="action" />
    </header>
    <slot />
  </component>
</template>

<style scoped>
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: var(--space-5);
}

.panel > header {
  align-items: center;
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.panel > header h2 {
  margin: 0;
}

.panel__eyebrow {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  font-weight: 700;
  margin: 0 0 var(--space-1);
}

.panel__eyebrow.is-danger {
  color: var(--color-danger);
}
</style>
