<script setup lang="ts">
/**
 * Estado vacío: explica qué falta y ofrece **una** sola acción útil. Más de una acción convierte
 * el vacío en un menú y deja al usuario decidiendo en lugar de avanzando.
 */
withDefaults(defineProps<{ title: string, mark?: string }>(), { mark: '♧' })
</script>

<template>
  <div class="empty-state panel">
    <span class="mark" aria-hidden="true">{{ mark }}</span>
    <h3>{{ title }}</h3>
    <p v-if="$slots.default"><slot /></p>
    <slot name="action" />
  </div>
</template>

<style scoped>
.empty-state {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: var(--space-10);
  text-align: center;
}

.mark {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: 50%;
  color: var(--color-brand);
  display: flex;
  font-size: var(--font-size-24);
  height: 48px;
  justify-content: center;
  margin: 0 auto var(--space-3);
  width: 48px;
}

.empty-state h3 {
  margin-bottom: var(--space-1);
}

.empty-state p {
  color: var(--color-ink-muted);
  margin-bottom: var(--space-4);
}
</style>
