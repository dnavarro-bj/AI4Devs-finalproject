<script setup lang="ts">
export interface DefinitionItem { key: string, label: string, value?: string | number | null }
defineProps<{ items: DefinitionItem[] }>()
</script>

<template>
  <dl class="definition-list">
    <div v-for="item in items" :key="item.key">
      <dt>{{ item.label }}</dt>
      <dd><slot :name="`value-${item.key}`" :item="item">{{ item.value ?? '—' }}</slot></dd>
    </div>
  </dl>
</template>

<style scoped>
.definition-list { margin: 0; }
.definition-list > div { align-items: baseline; border-top: 1px solid var(--color-line); display: flex; gap: var(--space-2); justify-content: space-between; padding: 9px 0; }
.definition-list > div:first-child { border-top: 0; padding-top: 0; }
dt { color: var(--color-ink-muted); font-size: var(--font-size-11); }
dd { font-size: var(--font-size-12); font-weight: 700; margin: 0; text-align: right; }
</style>
