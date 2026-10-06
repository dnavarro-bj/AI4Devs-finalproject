<script setup lang="ts">
export interface InheritedItem { label: string, value: string }

withDefaults(defineProps<{
  source: string
  items: InheritedItem[]
  sourceLabel?: string
  mark?: string
}>(), { sourceLabel: 'Hereda de', mark: '✺' })
</script>

<template>
  <section class="inheritance-summary">
    <header>
      <span class="inheritance-summary__mark" aria-hidden="true">{{ mark }}</span>
      <span>
        <small>{{ sourceLabel }}</small>
        <strong><em>{{ source }}</em></strong>
      </span>
    </header>
    <dl>
      <div v-for="item in items" :key="item.label">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.inheritance-summary {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  container-type: inline-size;
  padding: var(--space-3);
}

.inheritance-summary header {
  align-items: center;
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.inheritance-summary__mark {
  align-items: center;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  color: var(--color-brand);
  display: flex;
  font-size: var(--font-size-15);
  height: 36px;
  justify-content: center;
  width: 36px;
}

.inheritance-summary header small,
.inheritance-summary header strong {
  display: block;
}

.inheritance-summary header small,
.inheritance-summary dt {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}

.inheritance-summary dl {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
  overflow: hidden;
}

.inheritance-summary dl > div {
  min-width: 0;
  padding: var(--space-2) var(--space-3);
}

.inheritance-summary dl > div + div {
  border-left: 1px solid var(--color-line);
}

.inheritance-summary dd {
  color: var(--color-ink);
  font-size: var(--font-size-12);
  font-weight: 800;
  margin: var(--space-1) 0 0;
}

@container (max-width: 600px) {
  .inheritance-summary dl {
    grid-template-columns: 1fr 1fr;
  }

  .inheritance-summary dl > div:nth-child(odd) {
    border-left: 0;
  }

  .inheritance-summary dl > div:nth-child(n+3) {
    border-top: 1px solid var(--color-line);
  }
}
</style>
