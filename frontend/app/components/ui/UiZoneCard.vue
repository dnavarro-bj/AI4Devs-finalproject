<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  summary: string
  to: string
  mark?: string
  status: string
  statusTone?: 'ok' | 'warning' | 'danger' | 'neutral'
  progress?: number
  progressLabel?: string
  note?: string
}>(), {
  mark: '⌖',
  statusTone: 'neutral',
  progress: undefined,
  progressLabel: undefined,
  note: undefined,
})
</script>

<template>
  <NuxtLink class="zone-card" :to="to">
    <span class="zone-card__top">
      <i aria-hidden="true">{{ mark }}</i>
      <UiStatus :tone="statusTone">{{ status }}</UiStatus>
    </span>
    <strong>{{ title }}</strong>
    <small>{{ summary }}</small>
    <UiProgressBar
      v-if="progress !== undefined"
      :value="progress"
      :show-value="false"
      :detail="progressLabel"
      layout="stacked"
    />
    <span v-if="note" class="zone-card__note">{{ note }}</span>
  </NuxtLink>
</template>

<style scoped>
.zone-card {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  color: var(--color-ink);
  min-height: 156px;
  padding: var(--space-4);
  text-align: left;
  text-decoration: none;
}

.zone-card:hover {
  border-color: var(--color-brand);
}

.zone-card__top {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.zone-card__top i {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  color: var(--color-brand);
  display: flex;
  font-style: normal;
  height: 29px;
  justify-content: center;
  width: 29px;
}

.zone-card > strong,
.zone-card > small {
  display: block;
}

.zone-card > strong {
  font-size: var(--font-size-15);
}

.zone-card > small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin: var(--space-1) 0 var(--space-4);
}

.zone-card__note {
  border-top: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-11);
  margin-top: var(--space-4);
  padding-top: var(--space-3);
}
</style>
