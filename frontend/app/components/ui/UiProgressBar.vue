<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: number
  max?: number
  label?: string
  detail?: string
  tone?: 'brand' | 'warning' | 'danger'
  showValue?: boolean
}>(), { max: 100, label: undefined, detail: undefined, tone: 'brand', showValue: true })

const percent = computed(() => props.max > 0 ? Math.min(100, Math.max(0, (props.value / props.max) * 100)) : 0)
const style = computed(() => ({ width: `${percent.value}%` }))
</script>

<template>
  <div :class="['progress', `progress--${tone}`]">
    <span v-if="label || detail" class="progress__copy"><strong v-if="label">{{ label }}</strong><small v-if="detail">{{ detail }}</small></span>
    <span class="progress__track" role="progressbar" :aria-label="label" :aria-valuenow="value" aria-valuemin="0" :aria-valuemax="max"><i :style="style" /></span>
    <em v-if="showValue">{{ Math.round(percent) }}%</em>
  </div>
</template>

<style scoped>
.progress { align-items: center; display: grid; gap: var(--space-3); grid-template-columns: minmax(0, auto) minmax(80px, 1fr) auto; }
.progress__copy strong, .progress__copy small { display: block; }
.progress__copy strong { font-size: var(--font-size-12); }
.progress__copy small { color: var(--color-ink-muted); font-size: var(--font-size-11); }
.progress__track { background: var(--color-surface-muted); border-radius: var(--radius-pill); display: block; height: 7px; overflow: hidden; }
.progress__track i { background: var(--color-brand); display: block; height: 100%; }
.progress--warning .progress__track i { background: var(--color-warning); }
.progress--danger .progress__track i { background: var(--color-danger); }
em { color: var(--color-brand); font-size: var(--font-size-12); font-style: normal; font-weight: 800; }
.progress--warning em { color: var(--color-warning); }
.progress--danger em { color: var(--color-danger); }
</style>
