<script setup lang="ts">
/**
 * Los cinco valores de una lectura —humedad, temperatura, luz, riego y acidez—, con su unidad y, si
 * se conoce la especie, su rango efectivo al lado. Es el cuerpo que comparten el formulario de una
 * lectura y el diálogo de lote: no guarda nada ni habla con el API; edita el objeto que recibe.
 */
import type { SpeciesCare } from '@features/species/types/species.types'
import { READING_FIELDS, type ReadingValues } from '../mappers/readingFields'

const props = withDefaults(defineProps<{
  modelValue: ReadingValues
  /** Los rangos efectivos de la planta. Sin ellos funciona igual, solo orienta menos. */
  species?: SpeciesCare
  /** Aclaración bajo el título; el formulario de una planta dice que son sus rangos, el lote no. */
  hint?: string
}>(), { species: undefined, hint: undefined })

const emit = defineEmits<{ 'update:modelValue': [ReadingValues] }>()

const helpOf = (field: typeof READING_FIELDS[number]) =>
  (props.species && field.range ? field.range(props.species) : undefined)

const update = (key: keyof ReadingValues, value: string | number) =>
  emit('update:modelValue', { ...props.modelValue, [key]: String(value) })
</script>

<template>
  <fieldset class="reading__grid">
    <legend>Mediciones y riego</legend>
    <p class="reading__hint">
      Introduce al menos un valor.
      <template v-if="hint">{{ hint }}</template>
    </p>

    <div v-for="field in READING_FIELDS" :key="field.key" class="reading__row">
      <span class="reading__mark" aria-hidden="true">{{ field.mark }}</span>
      <UiField
        :model-value="modelValue[field.key]"
        layout="row"
        :label="field.label"
        :unit="field.unit"
        :help="helpOf(field)"
        :data-test="field.test"
        type="number"
        inputmode="decimal"
        @update:model-value="update(field.key, $event)"
      />
    </div>
  </fieldset>
</template>

<style scoped>
.reading__grid {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  margin: 0;
  padding: var(--space-4);
}

.reading__grid legend {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 0 var(--space-1);
  text-transform: uppercase;
}

.reading__hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-3);
}

.reading__row {
  align-items: center;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 28px 1fr;
}

.reading__row + .reading__row {
  border-top: 1px solid var(--color-line);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
}

.reading__mark {
  align-items: center;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  color: var(--color-ink-muted);
  display: flex;
  font-size: var(--font-size-12);
  height: 28px;
  justify-content: center;
  width: 28px;
}
</style>
