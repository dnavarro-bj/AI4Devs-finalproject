<script setup lang="ts">
/** Sección declarada y todavía sin construir: la levanta T-13. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
useHead({ title: 'Cactify · Ficha de localización' })

useBreadcrumbs().set([
  { label: 'Localizaciones', to: '/locations' },
  { label: 'Ficha de localización' },
])
</script>

<template>
  <PendingSection title="Ficha de localización" ticket="T-13" />
</template>
