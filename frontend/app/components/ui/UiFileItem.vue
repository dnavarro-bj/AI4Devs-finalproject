<script setup lang="ts">
withDefaults(defineProps<{
  name: string
  size?: string
  detail?: string
  status?: string
  tone?: 'ok' | 'warning' | 'danger' | 'neutral'
  removable?: boolean
  kind?: string
}>(), { size: undefined, detail: undefined, status: undefined, tone: 'neutral', removable: false, kind: 'FILE' })
defineEmits<{ remove: [] }>()
</script>

<template>
  <div class="file-item">
    <span class="file-item__mark" aria-hidden="true">{{ kind }}</span>
    <span class="file-item__copy"><strong>{{ name }}</strong><small v-if="size || detail">{{ [size, detail].filter(Boolean).join(' · ') }}</small></span>
    <UiStatus v-if="status" :tone="tone">{{ status }}</UiStatus>
    <UiButton v-if="removable" variant="icon" :label="`Quitar ${name}`" @click="$emit('remove')">×</UiButton>
  </div>
</template>

<style scoped>
.file-item { align-items: center; background: var(--color-canvas); border-radius: 7px; display: grid; gap: 9px; grid-template-columns: auto minmax(0, 1fr) auto auto; padding: 10px; }
.file-item__mark { align-items: center; background: var(--color-brand-strong); border-radius: 5px 5px 5px 1px; color: var(--color-surface); display: flex; font-size: var(--font-size-11); font-weight: 900; height: 38px; justify-content: center; padding: 0 4px; min-width: 34px; }
.file-item__copy { min-width: 0; }
strong, small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
strong { font-size: var(--font-size-12); }
small { color: var(--color-ink-muted); font-size: var(--font-size-11); }
@media (max-width: 520px) { .file-item { grid-template-columns: auto minmax(0, 1fr) auto; } .file-item :deep(.status) { display: none; } }
</style>
