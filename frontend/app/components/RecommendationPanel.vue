<script setup lang="ts">
import type { CareRecord, Priority, Recommendation, RiskLevel } from '../types/api'
import { ApiError } from '../types/api'

/**
 * El análisis de IA de una lectura. Es la operación lenta y la que puede fallar por causa del
 * proveedor externo, así que nunca se queda sin respuesta visible y siempre se puede reintentar.
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
  <section class="analysis">
    <h2>Análisis de IA</h2>

    <template v-if="result">
      <p :class="['risk', `risk--${result.riskLevel}`]" data-test="risk">
        {{ RISK_LABELS[result.riskLevel] }}
      </p>
      <p data-test="explanation">{{ result.explanation }}</p>
      <p data-test="action"><strong>Acción recomendada:</strong> {{ result.recommendedAction }}</p>
      <p class="priority" data-test="priority">{{ PRIORITY_LABELS[result.priority] }}</p>
    </template>

    <template v-else>
      <p v-if="generating" data-test="generating" role="status">Generando el análisis…</p>
      <p v-if="error" class="error" data-test="error" role="alert">{{ error }}</p>
      <button type="button" data-test="generate" :disabled="generating" @click="ask">
        {{ error ? 'Reintentar' : 'Generar análisis' }}
      </button>
    </template>
  </section>
</template>

<style scoped>
.analysis {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  margin-top: var(--space);
  padding: var(--space);
}

h2 {
  font-size: 1.05rem;
  margin: 0 0 var(--space);
}

/*
 * El nivel de riesgo se muestra como texto legible con su clase: T-06 la convierte en un badge
 * de color sin tocar el marcado (decisión 8 del design).
 */
.risk {
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.priority {
  color: var(--color-muted);
}

.error {
  color: var(--color-danger);
}
</style>
