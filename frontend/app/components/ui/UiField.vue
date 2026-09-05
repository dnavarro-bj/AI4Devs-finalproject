<script setup lang="ts">
/**
 * El campo del sistema. La etiqueta siempre está encima y asociada al control; la ayuda explica
 * formato o procedencia; la unidad vive dentro del control pero fuera del valor editable, y el
 * error dice cómo corregirlo sin perder lo introducido.
 *
 * `inheritAttrs: false` a propósito: los atributos del punto de uso —`data-test`, `type`, `step`,
 * `min`…— describen el **control**, no el envoltorio, y ahí es donde caen (ADR-014, decisión 4).
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  label: string
  modelValue?: string | number | null
  help?: string
  error?: string
  /** Unidad mostrada dentro del control; nunca forma parte del valor. */
  unit?: string
  as?: 'input' | 'select' | 'textarea'
  options?: { value: string, label: string }[]
  /** Primera opción vacía del selector. */
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  rows?: number
  /**
   * Identificador de test del mensaje de error. Hace falta porque los atributos del punto de uso
   * caen en el **control**, y el error es otro elemento.
   */
  errorTest?: string
}>(), {
  modelValue: '',
  help: undefined,
  error: undefined,
  unit: undefined,
  as: 'input',
  options: undefined,
  placeholder: undefined,
  disabled: false,
  readonly: false,
  rows: 3,
  errorTest: undefined,
})

defineEmits<{ 'update:modelValue': [string] }>()

const attrs = useAttrs()

// `useId` de Vue: el mismo identificador en servidor y en cliente, sin contador propio.
const uid = useId()
const controlId = computed(() => (attrs.id as string | undefined) ?? `field-${uid}`)
const helpId = computed(() => `${controlId.value}-help`)
const errorId = computed(() => `${controlId.value}-error`)

const describedBy = computed(() => {
  const ids = [props.error ? errorId.value : null, props.help ? helpId.value : null].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
})

const control = computed(() => ({
  ...attrs,
  'id': controlId.value,
  'disabled': props.disabled || undefined,
  'readonly': props.readonly || undefined,
  'aria-invalid': props.error ? 'true' : undefined,
  'aria-describedby': describedBy.value,
}))
</script>

<template>
  <div :class="['field', { 'field--error': error }]">
    <label :for="controlId">{{ label }}</label>

    <select
      v-if="as === 'select'"
      v-bind="control"
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="placeholder !== undefined" value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <textarea
      v-else-if="as === 'textarea'"
      v-bind="control"
      :rows="rows"
      :value="modelValue as string"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />

    <span v-else-if="unit" class="input-suffix">
      <input
        v-bind="control"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <b aria-hidden="true">{{ unit }}</b>
    </span>

    <input
      v-else
      v-bind="control"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >

    <small v-if="error" :id="errorId" data-role="error" :data-test="errorTest">{{ error }}</small>
    <small v-else-if="help" :id="helpId" data-role="help">{{ help }}</small>
  </div>
</template>

<style scoped>
.field {
  display: block;
}

.field > label {
  display: block;
  font-size: var(--font-size-12);
  font-weight: 700;
  margin-bottom: var(--space-1);
}

.field input,
.field select,
.field textarea {
  background: var(--color-surface);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  min-height: 42px;
  padding: var(--space-2) var(--space-3);
  width: 100%;
}

.field textarea {
  display: block;
  resize: vertical;
}

.field small {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-11);
  margin-top: var(--space-1);
}

/* La unidad queda dentro del control y fuera del valor: el borde lo pinta el envoltorio. */
.input-suffix {
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  display: flex;
  overflow: hidden;
}

.input-suffix input {
  border: 0;
  border-radius: 0;
  min-width: 0;
}

.input-suffix b {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  padding: 0 var(--space-3);
}

.field--error input,
.field--error select,
.field--error textarea,
.field--error .input-suffix {
  border-color: var(--color-danger);
}

.field--error .input-suffix input {
  border: 0;
}

.field--error small {
  color: var(--color-danger);
  font-weight: 600;
}

.field input:disabled,
.field select:disabled,
.field textarea:disabled {
  background: var(--color-surface-muted);
  color: var(--color-ink-muted);
}
</style>
