<script setup lang="ts">
/**
 * Los campos de una intervención. **Muestra solo los del tipo elegido** —maceta en el trasplante,
 * mezcla en el cambio de sustrato, producto en el tratamiento y la fertilización—, como los admite
 * el servidor: un dato ajeno a su tipo se rechaza, así que ni se ofrece ni viaja.
 *
 * Es el cuerpo que comparten el diálogo de una intervención y el de lote. No guarda nada ni habla
 * con el API: edita el objeto que recibe.
 */
import { INTERVENTION_FIELDS, INTERVENTION_LABELS, type InterventionValues } from '../mappers/timeline.mapper'
import type { InterventionType } from '../types/timeline.types'

const props = withDefaults(defineProps<{
  modelValue: InterventionValues
  /** Las mezclas para el cambio de sustrato. Las trae quien lo monta. */
  soilMixes?: { id: string, name: string }[]
  mixError?: string
}>(), { soilMixes: () => [], mixError: '' })

const emit = defineEmits<{ 'update:modelValue': [InterventionValues] }>()

const TYPES = (Object.keys(INTERVENTION_LABELS) as InterventionType[])
  .map((value) => ({ value, label: INTERVENTION_LABELS[value] }))

const fields = computed(() => INTERVENTION_FIELDS[props.modelValue.type])

const update = <K extends keyof InterventionValues>(key: K, value: InterventionValues[K]) =>
  emit('update:modelValue', { ...props.modelValue, [key]: value })
</script>

<template>
  <div class="intervention-fields">
    <UiField
      :model-value="modelValue.type"
      label="Tipo"
      as="select"
      :options="TYPES"
      data-test="intervention-type"
      @update:model-value="update('type', $event as InterventionType)"
    />
    <UiField
      v-if="fields.potSize"
      :model-value="modelValue.potSize"
      label="Maceta"
      help="Por ejemplo, «12 cm»."
      data-test="intervention-pot-size"
      @update:model-value="update('potSize', String($event))"
    />
    <UiField
      v-if="fields.soilMix"
      :model-value="modelValue.soilMixId"
      label="Mezcla de sustrato"
      as="select"
      placeholder="Elige una mezcla"
      :options="soilMixes.map((mix) => ({ value: mix.id, label: mix.name }))"
      :error="mixError"
      error-test="intervention-mix-error"
      data-test="intervention-soil-mix"
      @update:model-value="update('soilMixId', String($event))"
    />
    <UiField
      v-if="fields.product"
      :model-value="modelValue.product"
      label="Producto"
      data-test="intervention-product"
      @update:model-value="update('product', String($event))"
    />
    <UiField
      :model-value="modelValue.notes"
      label="Notas"
      as="textarea"
      :rows="3"
      data-test="intervention-notes"
      @update:model-value="update('notes', String($event))"
    />
  </div>
</template>

<style scoped>
.intervention-fields {
  display: grid;
  gap: var(--space-3);
}
</style>
