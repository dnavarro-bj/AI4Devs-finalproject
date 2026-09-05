<script setup lang="ts">
/**
 * Error en línea: identifica lo que ha fallado y describe el siguiente paso, sin perder lo que el
 * usuario hubiera introducido. Se anuncia como alerta, que es lo que es.
 */
withDefaults(defineProps<{ title?: string }>(), { title: undefined })
</script>

<template>
  <div :class="['inline-error', { 'inline-error--titled': title }]" role="alert">
    <span v-if="title" class="mark" aria-hidden="true">×</span>
    <div>
      <strong v-if="title">{{ title }}</strong>
      <p v-if="$slots.default"><slot /></p>
    </div>
    <slot name="action" />
  </div>
</template>

<style scoped>
.inline-error {
  align-items: center;
  border-left: 4px solid var(--color-danger);
  color: var(--color-danger);
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr auto;
  padding-left: var(--space-3);
}

.inline-error--titled {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-left: 4px solid var(--color-danger);
  border-radius: var(--radius-md);
  grid-template-columns: auto 1fr auto;
  padding: var(--space-4);
}

.mark {
  align-items: center;
  background: var(--color-danger-soft);
  border-radius: 50%;
  color: var(--color-danger);
  display: flex;
  font-weight: 800;
  height: 30px;
  justify-content: center;
  width: 30px;
}

.inline-error strong {
  color: var(--color-ink);
  display: block;
}

.inline-error p {
  margin: 0;
}

.inline-error--titled p {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin-top: var(--space-1);
}
</style>
