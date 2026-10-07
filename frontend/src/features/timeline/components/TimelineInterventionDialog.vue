<script setup lang="ts">
/**
 * Registrar o corregir una intervención. **Muestra solo los campos del tipo elegido** —maceta en el
 * trasplante, mezcla en el cambio de sustrato, producto en el tratamiento y la fertilización—,
 * como las admite el servidor: un dato ajeno a su tipo se rechaza, así que ni se ofrece ni viaja.
 *
 * Sale con `submit`; guardar es de quien lo abre y un fallo no pierde lo escrito.
 */
import { fromLocalInput, INTERVENTION_FIELDS, INTERVENTION_LABELS, toLocalInput } from '../mappers/timeline.mapper'
import type { InterventionInput, InterventionType, TimelineEntry } from '../types/timeline.types'

const props = withDefaults(defineProps<{
  open: boolean
  entry?: TimelineEntry | null
  /** Las mezclas para el cambio de sustrato. Las trae quien abre el diálogo. */
  soilMixes?: { id: string, name: string }[]
  busy?: boolean
  error?: string | null
}>(), { entry: null, soilMixes: () => [], busy: false, error: null })

const emit = defineEmits<{ submit: [InterventionInput], close: [] }>()

const TYPES = (Object.keys(INTERVENTION_LABELS) as InterventionType[])
  .map((value) => ({ value, label: INTERVENTION_LABELS[value] }))

const type = ref<InterventionType>('trasplante')
const potSize = ref('')
const product = ref('')
const soilMixId = ref('')
const notes = ref('')
const occurredAt = ref('')
const mixError = ref('')

watch(() => [props.open, props.entry], () => {
  const current = props.entry?.intervention
  type.value = current?.type ?? 'trasplante'
  potSize.value = current?.potSize ?? ''
  product.value = current?.product ?? ''
  soilMixId.value = current?.soilMix?.id ?? ''
  notes.value = current?.notes ?? ''
  occurredAt.value = toLocalInput(props.entry?.occurredAt)
  mixError.value = ''
}, { immediate: true })

const fields = computed(() => INTERVENTION_FIELDS[type.value])

function submit() {
  mixError.value = fields.value.soilMix && !soilMixId.value ? 'Elige la mezcla de sustrato.' : ''
  if (mixError.value) return

  emit('submit', {
    type: type.value,
    occurredAt: fromLocalInput(occurredAt.value),
    // Solo lo que el tipo admite: lo escrito para otro tipo antes de cambiar no viaja.
    potSize: fields.value.potSize ? potSize.value.trim() : undefined,
    product: fields.value.product ? product.value.trim() : undefined,
    soilMixId: fields.value.soilMix ? soilMixId.value : undefined,
    notes: notes.value.trim() || undefined,
  })
}
</script>

<template>
  <UiDialog
    :open="open"
    :title="entry ? 'Corregir la intervención' : 'Registrar una intervención'"
    @close="emit('close')"
  >
    <form class="dialog-form" data-test="intervention-form" @submit.prevent="submit">
      <UiInlineError v-if="error" data-test="timeline-dialog-error">{{ error }}</UiInlineError>

      <UiField v-model="type" label="Tipo" as="select" :options="TYPES" data-test="intervention-type" />
      <UiField v-if="fields.potSize" v-model="potSize" label="Maceta" help="Por ejemplo, «12 cm»." data-test="intervention-pot-size" />
      <UiField
        v-if="fields.soilMix"
        v-model="soilMixId"
        label="Mezcla de sustrato"
        as="select"
        placeholder="Elige una mezcla"
        :options="soilMixes.map((mix) => ({ value: mix.id, label: mix.name }))"
        :error="mixError"
        error-test="intervention-mix-error"
        data-test="intervention-soil-mix"
      />
      <UiField v-if="fields.product" v-model="product" label="Producto" data-test="intervention-product" />
      <UiField v-model="notes" label="Notas" as="textarea" :rows="3" data-test="intervention-notes" />
      <UiField
        v-model="occurredAt"
        label="Fecha"
        type="datetime-local"
        help="Opcional. Si la dejas vacía, se anota ahora."
        data-test="intervention-date"
      />

      <div class="dialog-form__actions">
        <UiButton variant="secondary" data-test="cancel-event" @click="emit('close')">Cancelar</UiButton>
        <UiButton type="submit" :busy="busy" data-test="save-event">{{ entry ? 'Guardar cambios' : 'Registrar' }}</UiButton>
      </div>
    </form>
  </UiDialog>
</template>

<style scoped>
.dialog-form {
  display: grid;
  gap: var(--space-3);
}

.dialog-form__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
