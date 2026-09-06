<script setup lang="ts">
import type { CareRecord } from '@features/care-records/types/careRecord.types'
import type { Priority, Recommendation, RiskLevel } from '../types/recommendation.types'
import { useRecommendation } from '../composables/useRecommendation'

/**
 * El análisis de IA de una lectura. Es la operación lenta y la que puede fallar por causa del
 * proveedor externo, así que nunca se queda sin respuesta visible y siempre se puede reintentar.
 *
 * El riesgo dice *cómo está* y la prioridad *cuándo actuar*: son las dos dimensiones del kit y se
 * pintan con sus componentes, que era lo que T-05 dejó pendiente.
 *
 * Se presenta como una **tira dentro de la entrada de la cronología**, no como un panel aparte: el
 * análisis pertenece a su lectura y separarlo en un bloque propio rompía esa relación. Es lo que
 * hace el wireframe, y por eso el resultado se lee de corrido —marca, veredicto y acción— en lugar
 * de repartirse en párrafos sueltos.
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

  const response = await generate(props.plantId, props.careRecord.id)
  generating.value = false

  if (!response.success) {
    error.value = response.error!.message
    return
  }
  result.value = response.data!
}
</script>

<template>
  <div class="analysis" :class="{ 'is-resolved': result }">
    <template v-if="result">
      <span class="analysis__mark" aria-hidden="true">✦</span>

      <div class="analysis__body">
        <p class="analysis__verdict">
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

        <p class="analysis__explanation" data-test="explanation">{{ result.explanation }}</p>
        <p class="analysis__action" data-test="action">
          <small>Acción recomendada</small>
          <strong>{{ result.recommendedAction }}</strong>
        </p>
        <p class="analysis__disclaimer">
          Orienta una revisión; no modifica cuidados, tareas ni alertas automáticamente.
        </p>
      </div>
    </template>

    <template v-else>
      <p v-if="generating" class="analysis__pending" data-test="generating" role="status">
        Generando el análisis…
      </p>

      <UiInlineError v-if="error" data-test="error" class="analysis__error">{{ error }}</UiInlineError>

      <!--
        El control no desaparece mientras genera: se deshabilita. Quitarlo dejaría al usuario sin
        saber dónde estaba lo que acaba de pulsar, y sin sitio donde reintentar si falla.
      -->
      <UiButton variant="text" data-test="generate" :disabled="generating" @click="ask">
        {{ error ? 'Reintentar el análisis' : '✦ Pedir análisis de IA de esta lectura' }}
      </UiButton>
    </template>
  </div>
</template>

<style scoped>
.analysis {
  border-radius: var(--radius-sm);
  margin-top: var(--space-2);
}

/* Con veredicto la tira gana su superficie: es un resultado, no un control pendiente. */
.analysis.is-resolved {
  align-items: start;
  background: var(--color-brand-soft);
  display: grid;
  gap: var(--space-2);
  grid-template-columns: auto 1fr;
  padding: var(--space-2) var(--space-3);
}

.analysis__mark {
  align-items: center;
  background: var(--color-brand);
  border-radius: var(--radius-sm);
  color: var(--color-sidebar-text);
  display: flex;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.analysis__verdict {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
}

.analysis__explanation {
  color: var(--color-ink);
  font-size: var(--font-size-12);
  margin: var(--space-1) 0 0;
}

.analysis__action {
  margin: var(--space-1) 0 0;
}

.analysis__action small {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-11);
}

.analysis__action strong {
  display: block;
  font-size: var(--font-size-12);
}

.analysis__disclaimer {
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  margin: var(--space-2) 0 0;
}

.analysis__pending {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}
</style>
