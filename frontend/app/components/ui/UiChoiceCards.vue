<script setup lang="ts">
export interface ChoiceCardOption { value: string, label: string, description?: string, mark?: string, disabled?: boolean }
const props = withDefaults(defineProps<{ label: string, options: ChoiceCardOption[], modelValue: string, columns?: number }>(), { columns: 4 })
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const name = `choices-${useId()}`
const gridStyle = computed(() => ({ gridTemplateColumns: `repeat(${Math.max(1, props.columns)}, minmax(0, 1fr))` }))
</script>

<template>
  <fieldset class="choice-cards" :style="gridStyle">
    <legend>{{ label }}</legend>
    <label v-for="option in options" :key="option.value">
      <input :name="name" type="radio" :value="option.value" :checked="modelValue === option.value" :disabled="option.disabled" @change="emit('update:modelValue', option.value)">
      <span><i v-if="option.mark" aria-hidden="true">{{ option.mark }}</i><strong>{{ option.label }}</strong><small v-if="option.description">{{ option.description }}</small></span>
    </label>
  </fieldset>
</template>

<style scoped>
.choice-cards { border: 0; display: grid; gap: var(--space-2); margin: 0; padding: 0; }
legend { color: var(--color-ink-muted); font-size: var(--font-size-12); font-weight: 700; margin-bottom: 7px; }
label { position: relative; }
input { opacity: 0; position: absolute; }
label > span { align-items: center; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: 8px; display: flex; flex-direction: column; min-height: 91px; padding: 10px; text-align: center; }
i { color: var(--color-brand); font-size: var(--font-size-24); font-style: normal; }
strong, small { display: block; }
strong { font-size: var(--font-size-12); margin-top: 4px; }
small { color: var(--color-ink-muted); font-size: var(--font-size-11); }
input:checked + span { background: var(--color-brand-soft); border-color: var(--color-brand); box-shadow: inset 0 0 0 1px var(--color-brand); color: var(--color-brand-strong); }
input:focus-visible + span { box-shadow: var(--focus-ring); }
input:disabled + span { opacity: 0.46; }
@media (max-width: 720px) { .choice-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 440px) { .choice-cards { grid-template-columns: 1fr; } }
</style>
