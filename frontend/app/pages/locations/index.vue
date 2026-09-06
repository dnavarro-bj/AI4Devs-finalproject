<script setup lang="ts">
/** Sección declarada y todavía sin construir: la levanta T-13. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
useHead({ title: 'Cactify · Localizaciones' })

useBreadcrumbs().set([
  { label: 'Localizaciones' },
])
</script>

<template>
  <PendingSection title="Localizaciones" ticket="T-13" />
</template>
