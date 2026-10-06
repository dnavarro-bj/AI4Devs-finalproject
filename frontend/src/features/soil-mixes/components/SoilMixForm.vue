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
import { phQuality } from '../composables/phQuality'

const props = withDefaults(defineProps<{
  initial?: SoilMixInput
  submitting?: boolean
  submitLabel?: string
  cancelTo?: string
  impact?: string
  /** El mensaje que devolvió el API, si lo hubo. Se pinta tal cual. */
  submitError?: string | null
}>(), {
  initial: () => ({
    name: '',
    organicPercentage: 20,
    mineralPercentage: 80,
    phMin: 5.8,
    phMax: 6.8,
    description: null,
  }),
  submitting: false,
  submitLabel: 'Guardar',
  cancelTo: '/soil-mixes',
  impact: 'El sustrato estará disponible en el catálogo.',
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

const SECTIONS = [
  { value: 'identity', label: 'Identificación' },
  { value: 'composition', label: 'Composición' },
  { value: 'properties', label: 'pH y propiedades' },
  { value: 'notes', label: 'Componentes y notas' },
]
const section = ref('identity')

const num = (raw: string) => {
  const parsed = Number(raw.trim())
  return Number.isFinite(parsed) ? parsed : 0
}

const parts = computed(() => [
  { label: 'Orgánico', value: num(organic.value), tone: 'warning' as const },
  { label: 'Mineral', value: num(mineral.value), tone: 'info' as const },
])

const total = computed(() => num(organic.value) + num(mineral.value))
const addsUp = computed(() => total.value === 100)
const phIsValid = computed(() => {
  const min = num(phMin.value)
  const max = num(phMax.value)
  return min >= 0 && max <= 14 && min <= max
})
const phState = computed(() => phIsValid.value
  ? `Rango válido · ${phQuality(num(phMin.value), num(phMax.value)).toLocaleLowerCase('es')}`
  : 'Revisa el rango: debe estar entre 0 y 14 y el mínimo no puede superar al máximo.')

const done = computed(() => [
  ...(name.value.trim() ? ['identity'] : []),
  ...(addsUp.value ? ['composition'] : []),
  ...(phIsValid.value ? ['properties'] : []),
])

function goToSection(value: string) {
  section.value = value
  document.getElementById(`soil-editor-${value}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function validate(): boolean {
  errors.name = name.value.trim() === '' ? 'El nombre del sustrato es obligatorio.' : ''
  const min = num(phMin.value)
  const max = num(phMax.value)
  errors.ph = min > max
    ? `El pH mínimo (${min}) no puede superar al máximo (${max}).`
    : min < 0 || max > 14
      ? 'El pH debe estar entre 0 y 14.'
      : ''

  const missing = errors.name ? 'identity' : !addsUp.value ? 'composition' : errors.ph ? 'properties' : null
  if (missing) goToSection(missing)
  return !missing
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
  <form data-test="soil-mix-form" class="editor" @submit.prevent="submit">
    <UiEditorNav
      :model-value="section"
      :sections="SECTIONS"
      :done="done"
      @update:model-value="goToSection"
    />

    <div class="editor__content">
      <UiInlineError v-if="submitError" data-test="submit-error">{{ submitError }}</UiInlineError>

      <UiFormSection
        id="soil-editor-identity"
        standalone
        title="Identificación"
        description="Usa un nombre que permita reconocer la receta al asignarla a una especie."
      >
        <div class="fields fields--single">
          <UiField
            v-model="name"
            label="Nombre del sustrato"
            :error="errors.name"
            error-test="name-error"
            data-test="name"
          />
          <UiField
            v-model="description"
            label="Descripción"
            as="textarea"
            :rows="4"
            help="Resume para qué cultivos está pensado. Puede quedarse vacía."
            data-test="description"
          />
        </div>
      </UiFormSection>

      <UiFormSection
        id="soil-editor-composition"
        standalone
        title="Composición"
        description="Los porcentajes orgánico y mineral deben sumar exactamente 100 %."
      >
        <div class="composition-editor">
          <div class="composition-preview" :class="{ 'is-invalid': !addsUp }">
            <UiProportionWheel :parts="parts" center="split" :show-legend="false" />
            <p aria-live="polite">
              <strong>{{ addsUp ? 'Composición válida' : 'Composición incompleta' }}</strong>
              <small>{{ organic || 0 }} % orgánico + {{ mineral || 0 }} % mineral = {{ total }} %</small>
            </p>
          </div>

          <div class="percentage-fields">
            <UiField
              v-model="organic"
              label="Componente orgánico"
              unit="%"
              type="number"
              min="0"
              max="100"
              inputmode="numeric"
              data-test="organic"
            />
            <UiField
              v-model="mineral"
              label="Componente mineral"
              unit="%"
              type="number"
              min="0"
              max="100"
              inputmode="numeric"
              data-test="mineral"
            />
            <div class="composition-total">
              <span>Total de la receta</span>
              <strong :class="{ 'is-invalid': !addsUp }">{{ total }} %</strong>
            </div>
            <UiProportionBar :parts="parts" />
          </div>
        </div>
      </UiFormSection>

      <UiFormSection
        id="soil-editor-properties"
        standalone
        title="pH y propiedades"
        description="El mínimo no puede superar al máximo; ambos valores deben estar entre 0 y 14."
      >
        <div class="ph-editor">
          <div class="ph-editor__range">
            <UiField
              v-model="phMin"
              label="pH mínimo"
              type="number"
              min="0"
              max="14"
              step="0.1"
              inputmode="decimal"
              data-test="ph-min"
            />
            <span aria-hidden="true">—</span>
            <UiField
              v-model="phMax"
              label="pH máximo"
              type="number"
              min="0"
              max="14"
              step="0.1"
              inputmode="decimal"
              :error="errors.ph"
              error-test="ph-error"
              data-test="ph-max"
            />
          </div>
          <p :class="{ 'is-invalid': !phIsValid }">{{ phState }}</p>
        </div>

        <div class="pending-fields" data-mock="true">
          <p><strong>API pendiente</strong> · Estas propiedades todavía no forman parte del sustrato.</p>
          <div class="fields">
            <UiField label="Drenaje esperado" as="select" placeholder="No disponible" disabled />
            <UiField label="Retención de humedad" as="select" placeholder="No disponible" disabled />
          </div>
        </div>
      </UiFormSection>

      <UiFormSection
        id="soil-editor-notes"
        standalone
        title="Componentes y preparación"
        description="Describe la receta con suficiente precisión para repetirla."
      >
        <div class="pending-fields" data-mock="true">
          <p><strong>API pendiente</strong> · El desglose y la preparación aún no se pueden guardar.</p>
          <div class="fields fields--single">
            <UiField label="Componentes orientativos" as="textarea" :rows="4" placeholder="No disponible" disabled />
            <UiField label="Notas de preparación" as="textarea" :rows="4" placeholder="No disponible" disabled />
          </div>
        </div>
      </UiFormSection>

      <footer class="editor__foot">
        <span>{{ impact }}</span>
        <div>
          <UiButton :to="cancelTo" variant="secondary">Cancelar</UiButton>
          <UiButton type="submit" :busy="submitting" data-test="submit">
            {{ submitting ? 'Guardando…' : submitLabel }}
          </UiButton>
        </div>
      </footer>
    </div>
  </form>
</template>

<style scoped>
.editor {
  align-items: start;
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 205px minmax(0, 1fr);
}

.editor__content {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

.fields {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.fields--single {
  grid-template-columns: 1fr;
}

.composition-editor {
  align-items: center;
  display: grid;
  gap: var(--space-6);
  grid-template-columns: 210px minmax(0, 1fr);
}

.composition-preview {
  align-items: center;
  background: var(--color-canvas);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 235px;
  padding: var(--space-4);
}

.composition-preview p {
  margin: var(--space-3) 0 0;
  text-align: center;
}

.composition-preview strong,
.composition-preview small {
  display: block;
}

.composition-preview strong {
  color: var(--color-brand);
  font-size: var(--font-size-12);
}

.composition-preview small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin-top: var(--space-1);
}

.composition-preview.is-invalid strong,
.composition-total strong.is-invalid {
  color: var(--color-danger);
}

.percentage-fields {
  display: grid;
  gap: var(--space-4);
}

.composition-total {
  align-items: center;
  border-top: 1px solid var(--color-line);
  display: flex;
  justify-content: space-between;
  padding-top: var(--space-3);
}

.composition-total span {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

.ph-editor {
  background: var(--color-canvas);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.ph-editor__range {
  align-items: end;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr auto 1fr;
}

.ph-editor__range > span {
  padding-bottom: var(--space-3);
}

.ph-editor > p {
  color: var(--color-brand);
  font-size: var(--font-size-12);
  font-weight: 700;
  margin: var(--space-3) 0 0;
}

.ph-editor > p.is-invalid {
  color: var(--color-danger);
}

.pending-fields {
  margin-top: var(--space-4);
}

.pending-fields > p {
  background: var(--color-surface-muted);
  border: 1px dashed var(--color-line);
  border-radius: var(--radius-sm);
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin: 0 0 var(--space-3);
  padding: var(--space-2) var(--space-3);
}

.editor__foot {
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  bottom: var(--space-3);
  box-shadow: var(--shadow-overlay);
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  position: sticky;
  z-index: 2;
}

.editor__foot > span {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

.editor__foot > div {
  display: flex;
  gap: var(--space-2);
}

@media (max-width: 900px) {
  .editor {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .composition-editor,
  .fields,
  .ph-editor__range {
    grid-template-columns: 1fr;
  }

  .composition-preview {
    min-height: 205px;
  }

  .ph-editor__range > span {
    display: none;
  }

  .editor__foot {
    align-items: stretch;
    flex-direction: column;
  }

  .editor__foot > div {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
