<script setup lang="ts">
/** Sección declarada y todavía sin construir: la levanta T-14. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
useHead({ title: 'Cactify · Configuración' })

useBreadcrumbs().set([
  { label: 'Configuración' },
])
</script>

<template>
  <PendingSection title="Configuración" ticket="T-14" />
</template>
