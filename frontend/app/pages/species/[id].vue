<script setup lang="ts">
/** Sección declarada y todavía sin construir: la levanta T-13. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
useHead({ title: 'Cactify · Ficha de especie' })

useBreadcrumbs().set([
  { label: 'Especies', to: '/species' },
  { label: 'Ficha de especie' },
])
</script>

<template>
  <PendingSection title="Ficha de especie" ticket="T-13" />
</template>
