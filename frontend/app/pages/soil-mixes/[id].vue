<script setup lang="ts">
/** Sección declarada y todavía sin construir: la levanta T-13. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
useHead({ title: 'Cactify · Ficha de mezcla' })

useBreadcrumbs().set([
  { label: 'Mezclas de sustrato', to: '/soil-mixes' },
  { label: 'Ficha de mezcla' },
])
</script>

<template>
  <PendingSection title="Ficha de mezcla" ticket="T-13" />
</template>
