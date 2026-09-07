<script setup lang="ts">
withDefaults(defineProps<{ title: string, description?: string, eyebrow?: string, count?: string | number }>(), {
  description: undefined, eyebrow: undefined, count: undefined,
})
</script>

<template>
  <header class="section-header">
    <div>
      <small v-if="eyebrow">{{ eyebrow }}</small>
      <h2>{{ title }} <span v-if="count !== undefined">{{ count }}</span></h2>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="section-header__actions"><slot name="actions" /></div>
  </header>
</template>

<style scoped>
.section-header { align-items: end; display: flex; gap: var(--space-4); justify-content: space-between; }
small { color: var(--color-brand); display: block; font-size: var(--font-size-11); font-weight: 800; letter-spacing: 0.1em; margin-bottom: 2px; text-transform: uppercase; }
h2 { font-size: var(--font-size-17); margin: 0; }
h2 span { color: var(--color-ink-faint); font-size: var(--font-size-12); font-weight: 500; margin-left: 5px; }
p { color: var(--color-ink-muted); font-size: var(--font-size-12); margin: 4px 0 0; }
.section-header__actions { align-items: center; display: flex; gap: var(--space-2); }
@media (max-width: 620px) { .section-header { align-items: start; flex-direction: column; } }
</style>
