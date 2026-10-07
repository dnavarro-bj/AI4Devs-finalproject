<script setup lang="ts">
/**
 * Dos límites que forman una sola magnitud. Se usa cuando mínimo y máximo solo tienen sentido
 * juntos: temperatura, humedad, horas de luz… La unidad queda visible, pero fuera del valor.
 */
const props = withDefaults(defineProps<{
  label: string
  minValue?: string | number | null
  maxValue?: string | number | null
  minLabel?: string
  maxLabel?: string
  unit: string
  min?: string | number
  max?: string | number
  step?: string | number
  error?: string
  errorTest?: string
  minTest?: string
  maxTest?: string
  disabled?: boolean
}>(), {
  minValue: '',
  maxValue: '',
  minLabel: 'Mínima',
  maxLabel: 'Máxima',
  min: undefined,
  max: undefined,
  step: undefined,
  error: undefined,
  errorTest: undefined,
  minTest: undefined,
  maxTest: undefined,
  disabled: false,
})

const emit = defineEmits<{
  'update:minValue': [string]
  'update:maxValue': [string]
  'blur': [FocusEvent]
}>()

const uid = useId()
const minId = `range-${uid}-min`
const maxId = `range-${uid}-max`
const errorId = `range-${uid}-error`
</script>

<template>
  <fieldset :class="['range-field', { 'range-field--error': error }]">
    <legend>{{ label }}</legend>

    <div class="range-field__controls">
      <label :for="minId">
        <span>{{ minLabel }}</span>
        <span class="range-field__input">
          <input
            :id="minId"
            type="number"
            :value="minValue"
            :min="min"
            :max="max"
            :step="step"
            :disabled="disabled || undefined"
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error ? errorId : undefined"
            :data-test="minTest"
            @input="emit('update:minValue', ($event.target as HTMLInputElement).value)"
            @blur="emit('blur', $event)"
          >
          <b aria-hidden="true">{{ unit }}</b>
        </span>
      </label>

      <span class="range-field__separator" aria-hidden="true">—</span>

      <label :for="maxId">
        <span>{{ maxLabel }}</span>
        <span class="range-field__input">
          <input
            :id="maxId"
            type="number"
            :value="maxValue"
            :min="min"
            :max="max"
            :step="step"
            :disabled="disabled || undefined"
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error ? errorId : undefined"
            :data-test="maxTest"
            @input="emit('update:maxValue', ($event.target as HTMLInputElement).value)"
            @blur="emit('blur', $event)"
          >
          <b aria-hidden="true">{{ unit }}</b>
        </span>
      </label>
    </div>

    <small v-if="error" :id="errorId" data-role="error" :data-test="errorTest">{{ error }}</small>
  </fieldset>
</template>

<style scoped>
.range-field {
  background: color-mix(in srgb, var(--color-brand-soft) 58%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-brand) 12%, var(--color-line));
  border-radius: var(--radius-md);
  margin: 0;
  min-width: 0;
  padding: var(--space-3);
}

.range-field legend {
  color: var(--color-ink);
  font-size: var(--font-size-12);
  font-weight: 700;
  padding: 0 var(--space-1);
}

.range-field legend + .range-field__controls {
  margin-top: var(--space-2);
}

.range-field__controls {
  align-items: end;
  display: grid;
  gap: var(--space-2);
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}

.range-field label > span:first-child {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-11);
  margin-bottom: var(--space-1);
}

.range-field__input {
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  display: flex;
  overflow: hidden;
}

.range-field__input input {
  appearance: textfield;
  background: transparent;
  border: 0;
  min-height: 42px;
  min-width: 0;
  padding: var(--space-2);
  width: 100%;
}

.range-field__input input::-webkit-inner-spin-button,
.range-field__input input::-webkit-outer-spin-button {
  appearance: none;
  margin: 0;
}

.range-field__input b {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  padding-right: var(--space-2);
}

.range-field__separator {
  color: var(--color-ink-faint);
  padding-bottom: var(--space-3);
}

.range-field > small {
  color: var(--color-danger);
  display: block;
  font-size: var(--font-size-11);
  font-weight: 600;
  margin-top: var(--space-1);
}

.range-field--error .range-field__input {
  border-color: var(--color-danger);
}

.range-field__input:focus-within {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 2px var(--color-brand-soft);
}

.range-field__input input:focus {
  outline: 0;
}

.range-field__input input:disabled {
  background: var(--color-surface-muted);
  color: var(--color-ink-muted);
}
</style>
