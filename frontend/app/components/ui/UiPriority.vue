<script setup lang="ts">
/**
 * Prioridad: responde a *cuándo actuar*. Ver [UiStatus](./UiStatus.vue) para *cómo está*.
 */
type Level = 'routine' | 'soon' | 'immediate'

const LEVELS: Level[] = ['routine', 'soon', 'immediate']

const props = withDefaults(defineProps<{ level?: Level }>(), { level: 'routine' })

if (!LEVELS.includes(props.level)) {
  throw new Error(
    `UiPriority: «${props.level}» no es una prioridad. Las prioridades son ${LEVELS.join(', ')}; ` +
    'para «cómo está» el componente es UiStatus.',
  )
}
</script>

<template>
  <span :class="['priority', `priority--${level}`]"><slot /></span>
</template>

<style scoped>
.priority {
  border-radius: var(--radius-pill);
  display: inline-flex;
  font-size: var(--font-size-11);
  font-weight: 800;
  padding: var(--space-1) var(--space-2);
  white-space: nowrap;
}

.priority--routine {
  background: var(--color-brand-soft);
  color: var(--color-brand-strong);
}

.priority--soon {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.priority--immediate {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}
</style>
