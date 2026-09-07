<script setup lang="ts">
export interface EntityPickerOption { value: string, title: string, code?: string, detail?: string, mark?: string }
const props = withDefaults(defineProps<{
  label: string
  options: EntityPickerOption[]
  modelValue?: string
  query?: string
  placeholder?: string
  emptyMessage?: string
}>(), { modelValue: undefined, query: '', placeholder: 'Buscar…', emptyMessage: 'No hay resultados.' })

const emit = defineEmits<{ 'update:modelValue': [string], 'update:query': [string] }>()
const id = `picker-${useId()}`
const filtered = computed(() => {
  const term = props.query.trim().toLocaleLowerCase('es')
  if (!term) return props.options
  return props.options.filter((option) => `${option.code ?? ''} ${option.title} ${option.detail ?? ''}`.toLocaleLowerCase('es').includes(term))
})
</script>

<template>
  <div class="entity-picker">
    <label :for="id">{{ label }}</label>
    <div class="entity-picker__search"><span aria-hidden="true">⌕</span><input :id="id" :value="query" :placeholder="placeholder" type="search" autocomplete="off" @input="emit('update:query', ($event.target as HTMLInputElement).value)"></div>
    <div v-if="filtered.length" role="listbox" :aria-label="label">
      <button v-for="option in filtered" :key="option.value" type="button" role="option" :aria-selected="modelValue === option.value" :class="{ 'is-selected': modelValue === option.value }" @click="emit('update:modelValue', option.value)">
        <span class="entity-picker__mark" aria-hidden="true">{{ option.mark ?? '♧' }}</span>
        <span><code v-if="option.code">{{ option.code }}</code><strong>{{ option.title }}</strong><small v-if="option.detail">{{ option.detail }}</small></span>
        <b v-if="modelValue === option.value" aria-hidden="true">✓</b>
      </button>
    </div>
    <p v-else>{{ emptyMessage }}</p>
  </div>
</template>

<style scoped>
.entity-picker > label { color: var(--color-ink-muted); display: block; font-size: var(--font-size-12); font-weight: 700; margin-bottom: 6px; }
.entity-picker__search { align-items: center; background: var(--color-canvas); border: 1px solid var(--color-line); border-radius: var(--radius-sm); display: flex; gap: var(--space-2); min-height: 41px; padding: 0 11px; }
input { background: transparent; border: 0; min-width: 0; outline: 0; width: 100%; }
.entity-picker > [role="listbox"] { display: grid; gap: var(--space-2); margin-top: 9px; }
[role="option"] { align-items: center; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: 8px; display: grid; gap: 11px; grid-template-columns: auto minmax(0, 1fr) auto; min-height: 66px; padding: 10px 12px; text-align: left; width: 100%; }
[role="option"]:hover { border-color: var(--color-line-strong); }
[role="option"].is-selected { background: color-mix(in srgb, var(--color-brand-soft) 45%, var(--color-surface)); border-color: var(--color-brand); box-shadow: inset 3px 0 var(--color-brand); }
.entity-picker__mark { align-items: center; background: var(--color-brand-soft); border-radius: 7px; color: var(--color-brand); display: flex; height: 43px; justify-content: center; width: 43px; }
code, strong, small { display: block; }
code { font-family: var(--font-mono); font-size: var(--font-size-11); }
strong { font-size: var(--font-size-12); margin: 2px 0; }
small, p { color: var(--color-ink-muted); font-size: var(--font-size-11); }
[role="option"] b { align-items: center; background: var(--color-brand); border-radius: 50%; color: var(--color-surface); display: flex; height: 23px; justify-content: center; width: 23px; }
</style>
