<script setup lang="ts">
export interface MetricStripItem {
  label: string
  value: string | number
  note?: string
  to?: string
  tone?: 'default' | 'danger'
  mock?: boolean
}

defineProps<{ items: MetricStripItem[], label: string }>()
</script>

<template>
  <section class="metric-strip" :aria-label="label">
    <template v-for="item in items" :key="item.label">
      <NuxtLink
        v-if="item.to"
        :to="item.to"
        :data-mock="item.mock ? 'true' : undefined"
      >
        <strong :class="{ 'is-danger': item.tone === 'danger' }">{{ item.value }}</strong>
        <span>
          {{ item.label }}
          <small v-if="item.note">{{ item.note }}</small>
        </span>
      </NuxtLink>
      <div v-else :data-mock="item.mock ? 'true' : undefined">
        <strong :class="{ 'is-danger': item.tone === 'danger' }">{{ item.value }}</strong>
        <span>
          {{ item.label }}
          <small v-if="item.note">{{ item.note }}</small>
        </span>
      </div>
    </template>
  </section>
</template>

<style scoped>
.metric-strip {
  background: var(--color-sidebar);
  border-radius: var(--radius-md);
  color: var(--color-sidebar-text);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  overflow: hidden;
}

.metric-strip > * {
  align-items: center;
  color: inherit;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto 1fr;
  min-height: 76px;
  padding: var(--space-3) var(--space-4);
  text-decoration: none;
}

.metric-strip > * + * {
  border-left: 1px solid color-mix(in srgb, var(--color-sidebar-text) 12%, transparent);
}

.metric-strip strong {
  color: var(--color-brand-soft);
  font-size: var(--font-size-24);
}

.metric-strip strong.is-danger {
  color: var(--color-danger-soft);
}

.metric-strip span {
  font-size: var(--font-size-12);
  font-weight: 700;
}

.metric-strip small {
  color: color-mix(in srgb, var(--color-sidebar-text) 67%, transparent);
  display: block;
  font-size: var(--font-size-11);
  font-weight: 400;
  margin-top: 2px;
}

@media (max-width: 700px) {
  .metric-strip {
    grid-template-columns: 1fr;
  }

  .metric-strip > * + * {
    border-left: 0;
    border-top: 1px solid color-mix(in srgb, var(--color-sidebar-text) 12%, transparent);
  }
}
</style>
