<script setup lang="ts">
import type { CareRecord, Priority, Recommendation, RiskLevel } from '../types/api'
import { ApiError } from '../types/api'

/**
 * El análisis de IA de una lectura. Es la operación lenta y la que puede fallar por causa del
 * proveedor externo, así que nunca se queda sin respuesta visible y siempre se puede reintentar.
 *
 * El riesgo dice *cómo está* y la prioridad *cuándo actuar*: son las dos dimensiones del kit y se
 * pintan con sus componentes, que era lo que T-05 dejó pendiente.
 */
const props = defineProps<{ plantId: string, careRecord: CareRecord }>()

const { generate } = useRecommendation()

const result = ref<Recommendation | null>(props.careRecord.recommendation ?? null)
const generating = ref(false)
const error = ref<string | null>(null)

const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Riesgo bajo',
  medium: 'Riesgo medio',
  high: 'Riesgo alto',
}

const RISK_TONES: Record<RiskLevel, 'ok' | 'warning' | 'danger'> = {
  low: 'ok',
  medium: 'warning',
  high: 'danger',
}

const PRIORITY_LABELS: Record<Priority, string> = {
  immediate: 'Actuación inmediata',
  soon: 'Actuación pronto',
  routine: 'Actuación rutinaria',
}

async function ask() {
  // Sin doble envío: la petición es lenta y el servidor la persiste.
  if (generating.value) return

  generating.value = true
  error.value = null
  try {
    result.value = await generate(props.plantId, props.careRecord.id)
  } catch (cause) {
    error.value = cause instanceof ApiError
      ? cause.message
      : 'No se ha podido generar el análisis. Inténtalo de nuevo.'
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <UiPanel title="Análisis de IA" class="analysis">
    <template v-if="result">
      <p class="verdict">
        <!--
          El nivel de riesgo, además del tono del kit, se marca con su propia clase: el tono
          traduce riesgo a estado (`medium` → `warning`) y perdería el nivel de dominio.
        -->
        <UiStatus
          :tone="RISK_TONES[result.riskLevel]"
          :class="`risk--${result.riskLevel}`"
          data-test="risk"
        >
          {{ RISK_LABELS[result.riskLevel] }}
        </UiStatus>
        <UiPriority :level="result.priority" data-test="priority">
          {{ PRIORITY_LABELS[result.priority] }}
        </UiPriority>
      </p>
      <p data-test="explanation">{{ result.explanation }}</p>
      <p data-test="action"><strong>Acción recomendada:</strong> {{ result.recommendedAction }}</p>
      <p class="disclaimer">
        La recomendación orienta una revisión; no modifica cuidados, tareas ni alertas
        automáticamente.
      </p>
    </template>

    <template v-else>
      <p v-if="generating" data-test="generating" role="status">Generando el análisis…</p>
      <UiInlineError v-if="error" data-test="error" class="analysis__error">{{ error }}</UiInlineError>
      <UiButton data-test="generate" :busy="generating" @click="ask">
        {{ error ? 'Reintentar' : 'Generar análisis' }}
      </UiButton>
    </template>
  </UiPanel>
</template>

<style scoped>
.verdict {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.analysis__error {
  margin-bottom: var(--space-4);
}

.disclaimer {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-4) 0 0;
}
</style>
