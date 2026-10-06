<script setup lang="ts">
export interface SignalListItem {
  id: string
  title: string
  detail?: string
  trailing?: string
  to?: string
  tone?: 'neutral' | 'warning' | 'danger'
}

defineProps<{ items: SignalListItem[], label: string }>()

const TONE_LABELS = { neutral: 'Información', warning: 'Atención', danger: 'Crítico' }
</script>

<template>
  <ul class="signal-list" :aria-label="label">
    <li v-for="item in items" :key="item.id">
      <span class="signal-list__dot" :class="`is-${item.tone ?? 'neutral'}`" aria-hidden="true" />
      <span class="sr-only">{{ TONE_LABELS[item.tone ?? 'neutral'] }}:</span>
      <NuxtLink v-if="item.to" :to="item.to" class="signal-list__body">
        <strong>{{ item.title }}</strong>
        <small v-if="item.detail">{{ item.detail }}</small>
      </NuxtLink>
      <span v-else class="signal-list__body">
        <strong>{{ item.title }}</strong>
        <small v-if="item.detail">{{ item.detail }}</small>
      </span>
      <span v-if="item.trailing" class="signal-list__trailing">{{ item.trailing }}</span>
    </li>
  </ul>
</template>

<style scoped>
.signal-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.signal-list li {
  align-items: center;
  display: grid;
  gap: var(--space-2);
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: var(--space-3) 0;
}

.signal-list li + li {
  border-top: 1px solid var(--color-line);
}

.signal-list__dot {
  background: var(--color-ink-faint);
  border-radius: var(--radius-pill);
  height: var(--space-2);
  width: var(--space-2);
}

.signal-list__dot.is-warning { background: var(--color-warning); }
.signal-list__dot.is-danger { background: var(--color-danger); }

.signal-list__body {
  color: var(--color-ink);
  display: grid;
  min-width: 0;
  text-decoration: none;
}

.signal-list small,
.signal-list__trailing {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

.signal-list__trailing {
  text-align: right;
}
</style>
