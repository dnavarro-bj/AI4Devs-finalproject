<script setup lang="ts">
/**
 * El aviso de la ficha del ejemplar: su alerta abierta **más grave**, con el motivo y la acción
 * recomendada, y cuántas más hay. Sustituye al aviso de ejemplo de la ficha. Sin alertas abiertas
 * **lo dice**, en lugar de omitir el bloque: la ausencia de aviso no se distingue de un olvido.
 *
 * No hace nada: las alertas se atienden en la bandeja, a la que enlaza filtrada por el ejemplar.
 */
import { ALERT_CATEGORY_LABELS, ALERT_SEVERITY_LABELS, type AlertSummary } from '../types/alert.types'

const props = defineProps<{ alerts: AlertSummary[], plantId: string }>()

/** La lista llega ordenada de la más grave a la más leve, pero el aviso no depende de ello. */
const RANK = { critica: 3, media: 2, baja: 1 } as const
const worst = computed(() => [...props.alerts].sort((a, b) => RANK[b.severity] - RANK[a.severity])[0] ?? null)
const others = computed(() => props.alerts.length - 1)
</script>

<template>
  <UiNotice
    v-if="worst"
    :severity="worst.severity === 'critica' ? 'danger' : 'warning'"
    :title="`${ALERT_CATEGORY_LABELS[worst.category]} · ${ALERT_SEVERITY_LABELS[worst.severity]}`"
    data-test="plant-alerts"
  >
    {{ worst.reason }}
    <template v-if="worst.recommendedAction"> <em data-test="plant-alert-action">{{ worst.recommendedAction }}</em></template>
    <template v-if="others > 0"> · {{ others === 1 ? '1 alerta más' : `${others} alertas más` }}</template>
    <template #action>
      <UiButton variant="text" :to="`/alerts?plant=${plantId}`" data-test="plant-alerts-link">Ver alertas</UiButton>
    </template>
  </UiNotice>
  <p v-else class="none" data-test="plant-alerts-none">Este ejemplar no tiene ninguna alerta abierta.</p>
</template>

<style scoped>
.none {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: 0 0 var(--space-4);
}
</style>
