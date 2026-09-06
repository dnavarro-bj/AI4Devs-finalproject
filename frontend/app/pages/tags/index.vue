<script setup lang="ts">
/** Sección declarada y todavía sin construir: la levanta T-13. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
useHead({ title: 'Cactify · Etiquetas' })

useBreadcrumbs().set([
  { label: 'Etiquetas' },
])
</script>

<template>
  <PendingSection title="Etiquetas" ticket="T-13" />
</template>
