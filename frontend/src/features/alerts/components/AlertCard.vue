<script setup lang="ts">
/**
 * Una alerta como tarjeta: marca, tipo y severidad, título, planta afectada, ubicación, cuándo se
 * detectó, estado y acciones.
 *
 * **La severidad y el estado se leen.** Cada una lleva su texto y la crítica tiene además una marca
 * distinta —no es la misma que la de las demás—, de modo que no dependen del color.
 *
 * No hace nada: **emite**. Revisar, descartar y crear tarea son T-23, y quien decide es la pantalla.
 */
import {
  ALERT_SEVERITY_LABELS,
  ALERT_STATE_LABELS,
  type Alert,
  type AlertSeverity,
} from '../types/alert.types'

defineProps<{ alert: Alert }>()
defineEmits<{ createTask: [], review: [], dismiss: [] }>()

const MARKS: Record<AlertSeverity, string> = { critical: '▲', medium: '●', low: '○' }
const LEVELS = { critical: 'immediate', medium: 'soon', low: 'routine' } as const
</script>

<template>
  <article
    class="alert-card"
    :class="`alert-card--${alert.severity}`"
    data-test="alert-card"
    :data-severity="alert.severity"
    :data-state="alert.state"
  >
    <span class="alert-card__mark" aria-hidden="true" data-test="alert-mark">{{ MARKS[alert.severity] }}</span>

    <div class="alert-card__body">
      <div class="alert-card__meta">
        <span>{{ alert.kind }}</span>
        <UiPriority :level="LEVELS[alert.severity]">{{ ALERT_SEVERITY_LABELS[alert.severity] }}</UiPriority>
        <UiStatus :tone="alert.state === 'resolved' ? 'ok' : 'neutral'" data-test="alert-state">
          {{ ALERT_STATE_LABELS[alert.state] }}
        </UiStatus>
      </div>
      <h2>{{ alert.title }}</h2>
      <p>
        <NuxtLink :to="`/plants/${alert.plantId}`">{{ alert.plantCode }} · <em>{{ alert.speciesName }}</em></NuxtLink>
      </p>
      <small>{{ alert.location }} · Detectada {{ alert.detected.toLowerCase() }}</small>
    </div>

    <div class="alert-card__actions">
      <UiButton data-test="create-task" @click="$emit('createTask')">Crear tarea</UiButton>
      <UiButton variant="secondary" data-test="review-alert" @click="$emit('review')">Revisar</UiButton>
      <UiButton variant="text" data-test="dismiss-alert" @click="$emit('dismiss')">Descartar</UiButton>
    </div>
  </article>
</template>

<style scoped>
.alert-card {
  align-items: start;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto 1fr auto;
  padding: var(--space-4);
}

.alert-card--critical {
  /* Borde de acento: la tarjeta conserva su contorno neutro y señala la severidad en un lateral. */
  border-left: 4px solid var(--color-danger);
}

.alert-card__mark {
  color: var(--color-ink-muted);
  font-weight: 700;
}

.alert-card--critical .alert-card__mark {
  color: var(--color-danger);
}

.alert-card__meta {
  align-items: center;
  color: var(--color-ink-muted);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--font-size-12);
  gap: var(--space-2);
}

.alert-card h2 {
  font-size: var(--font-size-16);
  margin: var(--space-1) 0;
}

.alert-card p {
  margin: 0;
}

.alert-card small {
  color: var(--color-ink-muted);
}

.alert-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
