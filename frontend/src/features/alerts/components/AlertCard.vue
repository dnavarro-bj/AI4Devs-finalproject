<script setup lang="ts">
/**
 * Una alerta como tarjeta: marca, categoría y severidad, título, a qué afecta, su ubicación, cuándo
 * se detectó, estado y acciones.
 *
 * **La severidad y el estado se leen.** Cada una lleva su texto y la crítica tiene además una marca
 * distinta —no es la misma que la de las demás—, de modo que no dependen del color.
 *
 * **Las acciones dependen del estado.** Una abierta ofrece crear una tarea y cerrarla; una `nueva`
 * además puede revisarse. Una cerrada **dice cómo se cerró** y no ofrece nada: no se reabre.
 *
 * No hace nada: **emite**. Quien monta la tarjeta decide qué hace cada acción y con qué fecha de
 * referencia se dice «hace dos días» (ningún componente consulta el reloj).
 */
import {
  ALERT_CATEGORY_LABELS,
  ALERT_SEVERITY_LABELS,
  ALERT_STATUS_LABELS,
  isOpen,
  type Alert,
} from '../types/alert.types'
import { alertSubject, closedText, detectedText, severityLevel, severityMarkLevel } from '../mappers/alert.mapper'

const props = defineProps<{ alert: Alert, today: string }>()
defineEmits<{ createTask: [], review: [], resolve: [], dismiss: [] }>()

const subject = computed(() => alertSubject(props.alert))
const closed = computed(() => closedText(props.alert))
</script>

<template>
  <article
    class="alert-card"
    :class="`alert-card--${alert.severity}`"
    data-test="alert-card"
    :data-id="alert.id"
    :data-severity="alert.severity"
    :data-state="alert.status"
  >
    <UiSeverityMark class="alert-card__mark" :level="severityMarkLevel(alert.severity)" mark-only data-test="alert-mark" />

    <div class="alert-card__body">
      <div class="alert-card__meta">
        <span>{{ ALERT_CATEGORY_LABELS[alert.category] }}</span>
        <UiPriority :level="severityLevel(alert.severity)">{{ ALERT_SEVERITY_LABELS[alert.severity] }}</UiPriority>
        <UiStatus :tone="alert.status === 'resuelta' ? 'ok' : 'neutral'" data-test="alert-state">
          {{ ALERT_STATUS_LABELS[alert.status] }}
        </UiStatus>
      </div>
      <h2>{{ alert.reason }}</h2>
      <p>
        <NuxtLink :to="subject.to">
          {{ subject.label }}<template v-if="subject.detail"> · <em>{{ subject.detail }}</em></template>
        </NuxtLink>
      </p>
      <small>{{ subject.where }} · <span data-test="alert-detected">{{ detectedText(alert, today) }}</span></small>
      <p v-if="alert.recommendedAction && isOpen(alert.status)" class="alert-card__action" data-test="alert-recommendation">
        {{ alert.recommendedAction }}
      </p>
      <p v-if="closed" class="alert-card__closed" data-test="alert-closed">
        <strong>{{ closed.headline }}</strong><template v-if="closed.comment"> · {{ closed.comment }}</template>
      </p>
    </div>

    <div v-if="isOpen(alert.status)" class="alert-card__actions">
      <UiButton data-test="create-task" @click="$emit('createTask')">Crear tarea</UiButton>
      <UiButton v-if="alert.status === 'nueva'" variant="secondary" data-test="review-alert" @click="$emit('review')">Revisar</UiButton>
      <UiButton variant="secondary" data-test="resolve-alert" @click="$emit('resolve')">Resolver</UiButton>
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

.alert-card--critica {
  /* Borde de acento: la tarjeta conserva su contorno neutro y señala la severidad en un lateral. */
  border-left: 4px solid var(--color-danger);
}

.alert-card__mark {
  font-weight: 700;
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

.alert-card p.alert-card__action,
.alert-card p.alert-card__closed {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin-top: var(--space-2);
}

.alert-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
