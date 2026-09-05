<script setup lang="ts">
/**
 * Panel: agrupa **una** responsabilidad. Borde y superficie, nunca sombra —esa se reserva a lo
 * realmente superpuesto—. La cabecera alinea el título con una sola acción contextual.
 */
withDefaults(defineProps<{ title?: string, as?: string }>(), { title: undefined, as: 'section' })
</script>

<template>
  <component :is="as" class="panel">
    <header v-if="title || $slots.title">
      <h2><slot name="title">{{ title }}</slot></h2>
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
</style>
