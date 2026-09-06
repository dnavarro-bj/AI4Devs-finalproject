<script setup lang="ts">
/** Sección declarada y todavía sin construir: la levanta T-14. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
useHead({ title: 'Cactify · Tareas' })

useBreadcrumbs().set([
  { label: 'Tareas' },
])
</script>

<template>
  <PendingSection title="Tareas" ticket="T-14" />
</template>
