<script setup lang="ts">
withDefaults(defineProps<{ label?: string, context?: string, size?: 'inline' | 'page' }>(), {
  label: 'Cargando…', context: undefined, size: 'inline',
})
</script>

<template>
  <div :class="['loading-state', `loading-state--${size}`]" role="status" aria-live="polite">
    <span class="loading-state__spinner" aria-hidden="true" />
    <span><strong>{{ label }}</strong><small v-if="context">{{ context }}</small></span>
  </div>
</template>

<style scoped>
.loading-state { align-items: center; display: inline-grid; gap: 2px var(--space-3); grid-template-columns: auto 1fr; padding: var(--space-3) 0; }
.loading-state--page { display: grid; justify-content: center; min-height: 260px; padding: var(--space-8); }
.loading-state__spinner { animation: spin calc(var(--duration-page) * 4) linear infinite; border: 2px solid var(--color-line-strong); border-radius: 50%; border-right-color: var(--color-brand); grid-row: 1 / span 2; height: 28px; width: 28px; }
strong, small { display: block; }
strong { font-size: var(--font-size-13); }
small { color: var(--color-ink-muted); font-size: var(--font-size-11); margin-top: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .loading-state__spinner { animation-duration: calc(var(--duration-page) * 7); } }
</style>
