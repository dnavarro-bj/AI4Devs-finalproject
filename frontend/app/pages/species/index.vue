<script setup lang="ts">
/** Sección declarada y todavía sin construir: la levanta T-13. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
useHead({ title: 'Cactify · Especies' })

useBreadcrumbs().set([
  { label: 'Especies' },
])
</script>

<template>
  <PendingSection title="Especies" ticket="T-13" />
</template>
