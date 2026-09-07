<script setup lang="ts">
const props = withDefaults(defineProps<{ steps: string[], current: number, label?: string }>(), { label: 'Progreso' })
const gridStyle = computed(() => ({ gridTemplateColumns: `repeat(${Math.max(1, props.steps.length)}, minmax(0, 1fr))` }))
</script>

<template>
  <ol class="stepper" :aria-label="label" :style="gridStyle">
    <li v-for="(step, index) in steps" :key="step" :class="{ 'is-done': index < current, 'is-current': index === current }" :aria-current="index === current ? 'step' : undefined">
      <span aria-hidden="true">{{ index < current ? '✓' : index + 1 }}</span><strong>{{ step }}</strong>
    </li>
  </ol>
</template>

<style scoped>
.stepper { display: grid; list-style: none; margin: 0; padding: 0; }
li { align-items: center; color: var(--color-ink-faint); display: flex; font-size: var(--font-size-11); font-weight: 700; gap: 7px; position: relative; }
li::after { background: var(--color-line); content: ''; height: 1px; left: 30px; position: absolute; right: 8px; top: 12px; }
li:last-child::after { display: none; }
span { align-items: center; background: var(--color-surface); border: 1px solid var(--color-line-strong); border-radius: 50%; display: flex; flex: 0 0 auto; height: 24px; justify-content: center; position: relative; width: 24px; z-index: 1; }
.is-current, .is-done { color: var(--color-brand-strong); }
.is-current span, .is-done span { background: var(--color-brand); border-color: var(--color-brand); color: var(--color-surface); }
.is-done::after { background: var(--color-brand); }
@media (max-width: 520px) { strong { position: absolute; top: 30px; } .stepper { padding-bottom: var(--space-6); } }
</style>
