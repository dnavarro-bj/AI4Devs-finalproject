<script setup lang="ts">
/** Decisión binaria con contexto suficiente para entender su efecto antes de marcarla. */
defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  modelValue: boolean
  title: string
  description?: string
  disabled?: boolean
}>(), { description: undefined, disabled: false })

defineEmits<{ 'update:modelValue': [boolean] }>()
</script>

<template>
  <label class="checkbox-panel" :class="{ 'is-disabled': disabled }">
    <input
      v-bind="$attrs"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    >
    <span>
      <strong>{{ title }}</strong>
      <small v-if="description">{{ description }}</small>
    </span>
  </label>
</template>

<style scoped>
.checkbox-panel {
  align-items: flex-start;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: grid;
  gap: var(--space-2);
  grid-template-columns: auto 1fr;
  padding: var(--space-3);
}

.checkbox-panel input {
  accent-color: var(--color-brand);
  height: 17px;
  margin: 1px 0 0;
  width: 17px;
}

.checkbox-panel strong,
.checkbox-panel small {
  display: block;
}

.checkbox-panel strong {
  color: var(--color-brand-strong);
  font-size: var(--font-size-13);
}

.checkbox-panel small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin-top: var(--space-1);
}

.checkbox-panel.is-disabled {
  cursor: not-allowed;
  opacity: 0.62;
}
</style>
