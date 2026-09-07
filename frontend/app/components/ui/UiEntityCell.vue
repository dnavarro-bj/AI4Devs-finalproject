<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  code?: string
  detail?: string
  mark?: string
  to?: string
}>(), { code: undefined, detail: undefined, mark: '♧', to: undefined })

const emit = defineEmits<{ select: [] }>()
const tag = computed(() => props.to ? resolveComponent('NuxtLink') : 'button')
</script>

<template>
  <component :is="tag" class="entity-cell" :to="to" :type="to ? undefined : 'button'" @click="emit('select')">
    <span class="entity-cell__mark" aria-hidden="true"><slot name="mark">{{ mark }}</slot></span>
    <span class="entity-cell__copy">
      <code v-if="code">{{ code }}</code>
      <strong>{{ title }}</strong>
      <small v-if="detail">{{ detail }}</small>
    </span>
    <span v-if="$slots.trailing" class="entity-cell__trailing"><slot name="trailing" /></span>
  </component>
</template>

<style scoped>
.entity-cell { align-items: center; background: transparent; border: 0; color: inherit; display: grid; gap: var(--space-3); grid-template-columns: auto minmax(0, 1fr) auto; padding: 0; text-align: left; text-decoration: none; width: 100%; }
.entity-cell__mark { align-items: center; background: var(--color-brand-soft); border-radius: 7px; color: var(--color-brand); display: flex; flex: 0 0 auto; font-size: var(--font-size-17); height: 43px; justify-content: center; width: 43px; }
.entity-cell__copy { min-width: 0; }
code, strong, small { display: block; }
code { font-family: var(--font-mono); font-size: var(--font-size-11); font-weight: 700; }
strong { color: var(--color-ink); font-size: var(--font-size-13); margin: 2px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
small { color: var(--color-ink-muted); font-size: var(--font-size-11); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.entity-cell__trailing { justify-self: end; }
</style>
