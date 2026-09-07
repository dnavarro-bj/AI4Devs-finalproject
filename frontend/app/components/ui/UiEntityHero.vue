<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  subtitle?: string
  description?: string
  visualPosition?: 'start' | 'end'
}>(), { subtitle: undefined, description: undefined, visualPosition: 'start' })

const slots = useSlots()
</script>

<template>
  <article :class="['entity-hero', { 'has-visual': Boolean(slots.visual), 'is-visual-end': visualPosition === 'end' }]">
    <div v-if="slots.visual" class="entity-hero__visual"><slot name="visual" /></div>
    <div class="entity-hero__identity">
      <div v-if="slots.identity" class="entity-hero__line"><slot name="identity" /></div>
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="entity-hero__subtitle">{{ subtitle }}</p>
      <p v-if="description || slots.description" class="entity-hero__description"><slot name="description">{{ description }}</slot></p>
      <div v-if="slots.context" class="entity-hero__context"><slot name="context" /></div>
    </div>
    <div v-if="slots.actions" class="entity-hero__actions"><slot name="actions" /></div>
  </article>
</template>

<style scoped>
.entity-hero {
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-5);
  grid-template-columns: minmax(0, 1fr) auto;
  margin-bottom: var(--space-4);
  padding: var(--space-5);
}

.entity-hero.has-visual { grid-template-columns: auto minmax(0, 1fr) auto; }
.entity-hero.has-visual.is-visual-end { grid-template-columns: minmax(0, 1fr) auto auto; }
.entity-hero.is-visual-end .entity-hero__visual { grid-column: 2; grid-row: 1; }
.entity-hero.is-visual-end .entity-hero__identity { grid-column: 1; grid-row: 1; }
.entity-hero.is-visual-end .entity-hero__actions { grid-column: 3; grid-row: 1; }
.entity-hero__visual { min-width: 0; }
.entity-hero__line { align-items: center; display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-2); }
h1 { font-size: var(--font-size-24); letter-spacing: -0.02em; margin: 0; }
.entity-hero__subtitle { color: var(--color-brand); font-size: var(--font-size-15); font-weight: 700; margin: var(--space-1) 0 0; }
.entity-hero__description { color: var(--color-ink-muted); font-size: var(--font-size-13); line-height: 1.6; margin: var(--space-3) 0 0; max-width: 70ch; }
.entity-hero__context { margin-top: var(--space-3); }
.entity-hero__actions { align-items: center; display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: end; }

@media (max-width: 760px) {
  .entity-hero, .entity-hero.has-visual, .entity-hero.has-visual.is-visual-end { align-items: start; grid-template-columns: 1fr; }
  .entity-hero.is-visual-end .entity-hero__visual,
  .entity-hero.is-visual-end .entity-hero__identity,
  .entity-hero.is-visual-end .entity-hero__actions { grid-column: 1; grid-row: auto; }
  .entity-hero__actions { justify-content: start; }
}
</style>
