<script setup lang="ts">
withDefaults(defineProps<{ asideWidth?: 'narrow' | 'regular' }>(), { asideWidth: 'regular' })
</script>

<template>
  <div :class="['detail-layout', `detail-layout--${asideWidth}`]">
    <main><slot /></main>
    <aside><slot name="aside" /></aside>
  </div>
</template>

<style scoped>
.detail-layout { align-items: start; display: grid; gap: var(--space-5); grid-template-columns: minmax(0, 1fr) 290px; }
.detail-layout--narrow { grid-template-columns: minmax(0, 1fr) 250px; }
main, aside { align-content: start; display: grid; gap: var(--space-4); min-width: 0; }
@media (max-width: 900px) { .detail-layout, .detail-layout--narrow { grid-template-columns: 1fr; } }
</style>
