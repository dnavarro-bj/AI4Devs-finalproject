<script setup lang="ts">
/** Control compacto para barras de búsqueda y filtrado. La etiqueta sigue disponible para lectores. */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue?: string
  label: string
  as?: 'input' | 'select'
  type?: 'text' | 'search'
  placeholder?: string
  options?: { value: string, label: string }[]
  disabled?: boolean
  icon?: string
}>(), {
  modelValue: '',
  as: 'input',
  type: 'text',
  placeholder: undefined,
  options: () => [],
  disabled: false,
  icon: undefined,
})

defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <label class="toolbar-field" :class="{ 'has-icon': icon }">
    <span class="sr-only">{{ label }}</span>
    <span v-if="icon" class="toolbar-field__icon" aria-hidden="true">{{ icon }}</span>
    <select
      v-if="as === 'select'"
      v-bind="$attrs"
      :value="modelValue"
      :disabled="disabled"
      :aria-label="label"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">{{ placeholder ?? label }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <input
      v-else
      v-bind="$attrs"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="label"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
  </label>
</template>

<style scoped>
.toolbar-field {
  flex: 1 1 105px;
  min-width: 105px;
  position: relative;
}

.toolbar-field.has-icon {
  flex-basis: 200px;
  min-width: 200px;
}

.toolbar-field input,
.toolbar-field select {
  background: var(--color-surface);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  font: inherit;
  height: 42px;
  padding: 0 var(--space-3);
  width: 100%;
}

.toolbar-field.has-icon input { padding-left: var(--space-10); }

.toolbar-field__icon {
  color: var(--color-ink-muted);
  font-size: var(--font-size-17);
  left: var(--space-3);
  position: absolute;
  top: var(--space-3);
  z-index: 1;
}

.toolbar-field input:disabled,
.toolbar-field select:disabled {
  background: var(--color-surface-muted);
  color: var(--color-ink-faint);
}

@media (max-width: 700px) {
  .toolbar-field,
  .toolbar-field.has-icon { width: 100%; }
}
</style>
