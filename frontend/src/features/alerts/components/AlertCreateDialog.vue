<script setup lang="ts">
/**
 * Anotar una incidencia a mano sobre un ejemplar o una localización. Sale con `submit` y deja que
 * quien lo abre guarde: este componente no habla con el API (ADR-015), así que **un fallo no pierde
 * lo escrito**. El destino lo fija quien lo abre; aquí solo se dice a qué se anota.
 */
import {
  ALERT_CATEGORIES,
  ALERT_CATEGORY_LABELS,
  ALERT_SEVERITIES,
  ALERT_SEVERITY_LABELS,
  type AlertCategory,
  type AlertSeverity,
} from '../types/alert.types'

const props = withDefaults(defineProps<{
  open: boolean
  /** A qué se anota: «CAT-GRUSS-01» o el nombre de la localización. */
  subjectLabel: string
  busy?: boolean
  error?: string | null
}>(), { busy: false, error: null })

const emit = defineEmits<{
  submit: [input: { category: AlertCategory, severity: AlertSeverity, reason: string, recommendedAction?: string }]
  close: []
}>()

const category = ref<AlertCategory>('otra')
const severity = ref<AlertSeverity>('media')
const reason = ref('')
const action = ref('')
const reasonError = ref('')

// Cada apertura es una incidencia nueva.
watch(() => props.open, () => {
  category.value = 'otra'
  severity.value = 'media'
  reason.value = ''
  action.value = ''
  reasonError.value = ''
}, { immediate: true })

const categoryOptions = ALERT_CATEGORIES.map((value) => ({ value, label: ALERT_CATEGORY_LABELS[value] }))
const severityOptions = ALERT_SEVERITIES.map((value) => ({ value, label: ALERT_SEVERITY_LABELS[value] }))

function submit() {
  reasonError.value = reason.value.trim() === '' ? 'Cuenta qué ha pasado.' : ''
  if (reasonError.value) return
  emit('submit', {
    category: category.value,
    severity: severity.value,
    reason: reason.value.trim(),
    ...(action.value.trim() ? { recommendedAction: action.value.trim() } : {}),
  })
}
</script>

<template>
  <UiDialog
    :open="open"
    title="Anotar una alerta"
    :subtitle="subjectLabel"
    data-test="alert-create-dialog"
    @close="emit('close')"
  >
    <form class="create" data-test="alert-create-form" @submit.prevent="submit">
      <UiInlineError v-if="error" data-test="alert-create-error">{{ error }}</UiInlineError>

      <div class="create__row">
        <UiField v-model="category" label="Categoría" as="select" :options="categoryOptions" data-test="alert-category" />
        <UiField v-model="severity" label="Severidad" as="select" :options="severityOptions" data-test="alert-severity" />
      </div>
      <UiField
        v-model="reason"
        label="Motivo"
        as="textarea"
        :rows="3"
        :error="reasonError"
        error-test="alert-reason-error"
        autofocus
        data-test="alert-reason"
      />
      <UiField
        v-model="action"
        label="Acción recomendada (opcional)"
        as="textarea"
        :rows="2"
        data-test="alert-action"
      />

      <div class="create__actions">
        <UiButton variant="secondary" data-test="alert-create-cancel" @click="emit('close')">Cancelar</UiButton>
        <UiButton type="submit" :busy="busy" data-test="alert-create-submit">Anotar alerta</UiButton>
      </div>
    </form>
  </UiDialog>
</template>

<style scoped>
.create {
  display: grid;
  gap: var(--space-3);
}

.create__row {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr 1fr;
}

.create__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
