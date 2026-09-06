<script setup lang="ts">
/**
 * El editor de una mezcla de sustrato, compartido por el alta y la corrección (§5.4). El `PUT` es
 * reemplazo completo, así que las dos operaciones envían exactamente lo mismo y el formulario es
 * literalmente el mismo componente.
 *
 * **La composición se valida aquí además de en el servidor.** Es una comprobación de rango, que es
 * lo que ADR-011 permite en el borde: evita un viaje de ida y vuelta para algo que se sabe sin
 * preguntar. No sustituye al dominio ni al `CHECK` de la base de datos —si el API rechaza, se
 * pinta su mensaje tal cual, que lo escribe quien conoce la regla—.
 *
 * El aviso de composición aparece **mientras se escribe**, no al enviar: `UiProportionBar` ya
 * dice cuánto falta o sobra, y saberlo antes de pulsar es la diferencia entre corregir y reintentar.
 */
import type { SoilMixInput } from '../types/soilMix.types'

const props = withDefaults(defineProps<{
  initial?: SoilMixInput
  submitting?: boolean
  submitLabel?: string
  /** El mensaje que devolvió el API, si lo hubo. Se pinta tal cual. */
  submitError?: string | null
}>(), {
  initial: () => ({
    name: '',
    organicPercentage: 0,
    mineralPercentage: 0,
    phMin: 0,
    phMax: 0,
    description: null,
  }),
  submitting: false,
  submitLabel: 'Guardar',
  submitError: null,
})

const emit = defineEmits<{ submit: [SoilMixInput] }>()

/**
 * Los valores viven como texto y no como número: un `input` vacío es cadena vacía, y convertirlo
 * a `0` demasiado pronto convertiría «no lo he rellenado» en «es cero».
 */
const name = ref(props.initial.name)
const organic = ref(String(props.initial.organicPercentage))
const mineral = ref(String(props.initial.mineralPercentage))
const phMin = ref(String(props.initial.phMin))
const phMax = ref(String(props.initial.phMax))
const description = ref(props.initial.description ?? '')

const errors = reactive({ name: '', ph: '' })

const num = (raw: string) => {
  const parsed = Number(raw.trim())
  return Number.isFinite(parsed) ? parsed : 0
}

const parts = computed(() => [
  { label: 'Orgánico', value: num(organic.value) },
  { label: 'Mineral', value: num(mineral.value) },
])

const addsUp = computed(() => num(organic.value) + num(mineral.value) === 100)

function validate(): boolean {
  errors.name = name.value.trim() === '' ? 'El nombre de la mezcla es obligatorio.' : ''
  errors.ph = num(phMin.value) > num(phMax.value)
    ? `El pH mínimo (${num(phMin.value)}) no puede superar al máximo (${num(phMax.value)}).`
    : ''

  return errors.name === '' && errors.ph === '' && addsUp.value
}

function submit() {
  if (!validate()) return

  const recipe = description.value.trim()
  emit('submit', {
    name: name.value.trim(),
    organicPercentage: num(organic.value),
    mineralPercentage: num(mineral.value),
    phMin: num(phMin.value),
    phMax: num(phMax.value),
    // Vaciar la receta es un cambio legítimo: viaja como ausente, no como cadena vacía.
    description: recipe === '' ? null : recipe,
  })
}
</script>

<template>
  <form data-test="soil-mix-form" class="mix-form" @submit.prevent="submit">
    <UiInlineError v-if="submitError" data-test="submit-error">{{ submitError }}</UiInlineError>

    <UiFormSection standalone title="Identificación" description="Cómo se reconoce la mezcla en el catálogo.">
      <UiField
        v-model="name"
        label="Nombre de la mezcla"
        :error="errors.name"
        error-test="name-error"
        data-test="name"
      />
      <UiField
        v-model="description"
        label="Receta de referencia"
        as="textarea"
        :rows="2"
        help="Los componentes, en el orden en que se mezclan. Puede quedarse vacía."
        data-test="description"
      />
    </UiFormSection>

    <UiFormSection
      standalone
      title="Composición"
      description="Los porcentajes tienen que sumar 100: el catálogo no admite una receta que no cuadre."
    >
      <UiField
        v-model="organic"
        label="Parte orgánica"
        unit="%"
        type="number"
        inputmode="numeric"
        data-test="organic"
      />
      <UiField
        v-model="mineral"
        label="Parte mineral"
        unit="%"
        type="number"
        inputmode="numeric"
        data-test="mineral"
      />

      <!-- El aviso vive en la barra: dice cuánto falta o sobra mientras se rellena. -->
      <UiProportionBar :parts="parts" />
    </UiFormSection>

    <UiFormSection standalone title="Acidez" description="El rango de pH que la mezcla mantiene.">
      <UiField
        v-model="phMin"
        label="pH mínimo"
        type="number"
        step="0.1"
        inputmode="decimal"
        data-test="ph-min"
      />
      <UiField
        v-model="phMax"
        label="pH máximo"
        type="number"
        step="0.1"
        inputmode="decimal"
        :error="errors.ph"
        error-test="ph-error"
        data-test="ph-max"
      />
    </UiFormSection>

    <footer class="mix-form__foot">
      <span v-if="!addsUp" class="mix-form__hint">
        La composición todavía no suma 100 %.
      </span>
      <UiButton type="submit" :busy="submitting" data-test="submit">
        {{ submitting ? 'Guardando…' : submitLabel }}
      </UiButton>
    </footer>
  </form>
</template>

<style scoped>
.mix-form {
  display: grid;
  gap: var(--space-4);
}

.mix-form__foot {
  align-items: center;
  border-top: 1px solid var(--color-line);
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding-top: var(--space-3);
}

.mix-form__hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin-right: auto;
}
</style>
