<script setup lang="ts">
/** Sección declarada y todavía sin construir: la levanta T-14. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
useHead({ title: 'Cactify · Importar / exportar' })

useBreadcrumbs().set([
  { label: 'Importar / exportar' },
])
</script>

<template>
  <PendingSection title="Importar / exportar" ticket="T-14" />
</template>
