<script setup lang="ts">
withDefaults(defineProps<{ label: string, description?: string, modelValue: boolean, disabled?: boolean }>(), {
  description: undefined, disabled: false,
})
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
</script>

<template>
  <label class="switch">
    <span class="switch__copy"><strong>{{ label }}</strong><small v-if="description">{{ description }}</small></span>
    <input type="checkbox" :checked="modelValue" :disabled="disabled" @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)">
    <span class="switch__track" aria-hidden="true" />
    <b>{{ modelValue ? 'Activa' : 'Inactiva' }}</b>
  </label>
</template>

<style scoped>
.switch { align-items: center; border-top: 1px solid var(--color-line); display: grid; gap: var(--space-2); grid-template-columns: minmax(0, 1fr) auto auto; padding: 12px 0; position: relative; }
.switch__copy strong, .switch__copy small { display: block; }
.switch__copy strong { font-size: var(--font-size-12); }
.switch__copy small { color: var(--color-ink-muted); font-size: var(--font-size-11); margin-top: 2px; }
input { opacity: 0; position: absolute; }
.switch__track { background: var(--color-line-strong); border-radius: var(--radius-pill); display: block; height: 24px; position: relative; width: 43px; }
.switch__track::after { background: var(--color-surface); border-radius: 50%; box-shadow: var(--shadow-overlay); content: ''; height: 18px; left: 3px; position: absolute; top: 3px; transition: transform var(--duration-fast) var(--ease-standard); width: 18px; }
input:checked + .switch__track { background: var(--color-brand); }
input:checked + .switch__track::after { transform: translateX(19px); }
input:focus-visible + .switch__track { box-shadow: var(--focus-ring); }
input:disabled ~ * { opacity: 0.46; }
b { color: var(--color-brand); font-size: var(--font-size-11); }
</style>
