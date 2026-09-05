<script setup lang="ts">
/**
 * Pestañas: cambian una vista **local**. No sustituyen a la navegación principal, y su estado
 * activo se distingue por forma —el subrayado— además de por color.
 */
defineProps<{ tabs: { value: string, label: string, count?: number }[], modelValue: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <div class="tabs" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      :class="{ 'is-active': tab.value === modelValue }"
      type="button"
      role="tab"
      :aria-selected="tab.value === modelValue ? 'true' : 'false'"
      @click="$emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
      <span v-if="tab.count !== undefined">{{ tab.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.tabs {
  align-items: center;
  border-bottom: 1px solid var(--color-line);
  display: flex;
  gap: var(--space-6);
  overflow-x: auto;
}

.tabs button {
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--color-ink-muted);
  min-height: 44px;
  padding: 0 var(--space-1);
  white-space: nowrap;
}

.tabs button.is-active {
  border-bottom-color: var(--color-brand);
  color: var(--color-ink);
  font-weight: 700;
}

.tabs span {
  background: var(--color-surface-muted);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-11);
  margin-left: var(--space-1);
  padding: 2px var(--space-2);
}
</style>
