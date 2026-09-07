<script setup lang="ts">
export interface SegmentOption { value: string, label: string, disabled?: boolean }
const props = defineProps<{ label: string, options: SegmentOption[], modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const name = `segments-${useId()}`
</script>

<template>
  <fieldset class="segments">
    <legend>{{ label }}</legend>
    <label v-for="option in options" :key="option.value">
      <input :name="name" type="radio" :value="option.value" :checked="modelValue === option.value" :disabled="option.disabled" @change="emit('update:modelValue', option.value)">
      <span>{{ option.label }}</span>
    </label>
  </fieldset>
</template>

<style scoped>
.segments { border: 0; display: grid; grid-auto-columns: 1fr; grid-auto-flow: column; margin: 0; padding: 0; }
legend { color: var(--color-ink-muted); font-size: var(--font-size-12); font-weight: 700; margin-bottom: 7px; }
label { position: relative; }
input { opacity: 0; position: absolute; }
span { align-items: center; background: var(--color-surface); border: 1px solid var(--color-line); display: flex; font-size: var(--font-size-12); justify-content: center; min-height: 39px; padding: 0 var(--space-2); }
label:first-of-type span { border-radius: var(--radius-sm) 0 0 var(--radius-sm); }
label:last-of-type span { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
label + label span { border-left: 0; }
input:checked + span { background: var(--color-brand); color: var(--color-surface); font-weight: 700; }
input:focus-visible + span { box-shadow: var(--focus-ring); position: relative; z-index: 1; }
input:disabled + span { opacity: 0.46; }
</style>
