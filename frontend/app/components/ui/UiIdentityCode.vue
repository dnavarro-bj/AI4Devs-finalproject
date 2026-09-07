<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: string
  pending?: boolean
  copyable?: boolean
}>(), { pending: false, copyable: false })

const emit = defineEmits<{ copy: [string] }>()

async function copy() {
  if (!props.copyable) return
  await navigator.clipboard?.writeText(props.value)
  emit('copy', props.value)
}
</script>

<template>
  <span :class="['identity-code', { 'is-pending': pending }]">
    <code>{{ value }}</code>
    <button v-if="copyable" type="button" :aria-label="`Copiar ${value}`" @click="copy">Copiar</button>
  </span>
</template>

<style scoped>
.identity-code {
  align-items: center;
  background: var(--color-surface-muted);
  border-left: 3px solid var(--color-brand);
  border-radius: 2px var(--radius-sm) var(--radius-sm) 2px;
  display: inline-flex;
  gap: var(--space-2);
  max-width: 100%;
  padding: 6px 9px;
}

.identity-code.is-pending {
  background: transparent;
  border: 1px dashed var(--color-line-strong);
}

code {
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-size: var(--font-size-12);
  font-weight: 800;
  letter-spacing: 0.035em;
  overflow-x: auto;
  white-space: nowrap;
}

.is-pending code { color: var(--color-ink-faint); }

button {
  background: transparent;
  border: 0;
  color: var(--color-brand);
  font-size: var(--font-size-11);
  font-weight: 700;
  padding: 0;
}
</style>
