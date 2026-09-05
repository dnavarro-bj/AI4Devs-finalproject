<script setup lang="ts">
/**
 * Estado: responde a *cómo está* algo. No es intercambiable con [UiPriority](./UiPriority.vue),
 * que responde a *cuándo actuar*; por eso cada uno rechaza el vocabulario del otro.
 */
type Tone = 'ok' | 'warning' | 'danger' | 'neutral'

const TONES: Tone[] = ['ok', 'warning', 'danger', 'neutral']

const props = withDefaults(defineProps<{ tone?: Tone }>(), { tone: 'neutral' })

if (!TONES.includes(props.tone)) {
  throw new Error(
    `UiStatus: «${props.tone}» no es un estado. Los estados son ${TONES.join(', ')}; ` +
    'para «cuándo actuar» el componente es UiPriority.',
  )
}
</script>

<template>
  <span :class="['status', `status--${tone}`]"><slot /></span>
</template>

<style scoped>
.status {
  border-radius: var(--radius-pill);
  display: inline-flex;
  font-size: var(--font-size-11);
  font-weight: 800;
  padding: var(--space-1) var(--space-2);
  white-space: nowrap;
}

.status--ok {
  background: var(--color-brand-soft);
  color: var(--color-brand-strong);
}

.status--warning {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.status--danger {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.status--neutral {
  background: var(--color-surface-muted);
  color: var(--color-ink-muted);
}
</style>
