<script setup lang="ts">
/** Sección declarada y todavía sin construir: la levanta T-14. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
useHead({ title: 'Cactify · Alertas' })

useBreadcrumbs().set([
  { label: 'Alertas' },
])
</script>

<template>
  <PendingSection title="Alertas" ticket="T-14" />
</template>
