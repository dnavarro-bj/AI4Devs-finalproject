<script setup lang="ts">
/** Sección declarada y todavía sin construir: la levanta T-13. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
useHead({ title: 'Cactify · Mezclas de sustrato' })

useBreadcrumbs().set([
  { label: 'Mezclas de sustrato' },
])
</script>

<template>
  <PendingSection title="Mezclas de sustrato" ticket="T-13" />
</template>
