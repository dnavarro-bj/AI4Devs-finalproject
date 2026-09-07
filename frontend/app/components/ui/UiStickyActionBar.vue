<script setup lang="ts">
withDefaults(defineProps<{ message?: string }>(), { message: undefined })
</script>

<template>
  <div class="sticky-actions">
    <div class="sticky-actions__start"><slot name="start">{{ message }}</slot></div>
    <div class="sticky-actions__actions"><slot name="actions"><slot /></slot></div>
  </div>
</template>

<style scoped>
.sticky-actions { align-items: center; background: color-mix(in srgb, var(--color-surface) 96%, transparent); border: 1px solid var(--color-line); border-radius: var(--radius-md); bottom: var(--space-4); box-shadow: var(--shadow-overlay); display: flex; gap: var(--space-3); justify-content: space-between; padding: 11px 14px; position: sticky; z-index: 15; }
.sticky-actions__start { color: var(--color-ink-muted); font-size: var(--font-size-11); }
.sticky-actions__actions { align-items: center; display: flex; gap: var(--space-2); }
@media (max-width: 620px) { .sticky-actions { align-items: stretch; flex-direction: column; } .sticky-actions__actions { display: grid; grid-template-columns: 1fr 1fr; } }
</style>
