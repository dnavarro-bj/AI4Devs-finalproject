<script setup lang="ts">
withDefaults(defineProps<{ label: string, tone?: 'neutral' | 'brand', removable?: boolean }>(), {
  tone: 'neutral', removable: false,
})
defineEmits<{ remove: [] }>()
</script>

<template>
  <span :class="['tag', `tag--${tone}`]">
    {{ label }}
    <button v-if="removable" type="button" :aria-label="`Quitar ${label}`" @click="$emit('remove')">×</button>
  </span>
</template>

<style scoped>
.tag { align-items: center; background: var(--color-canvas); border: 1px solid var(--color-line); border-radius: var(--radius-pill); color: var(--color-ink-muted); display: inline-flex; font-size: var(--font-size-11); gap: 6px; padding: 4px 8px; }
.tag--brand { background: var(--color-brand-soft); border-color: transparent; color: var(--color-brand-strong); }
button { background: transparent; border: 0; color: inherit; font: inherit; font-weight: 800; padding: 0; }
</style>
