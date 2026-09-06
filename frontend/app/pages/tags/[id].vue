<script setup lang="ts">
/** Sección declarada y todavía sin construir: la levanta T-13. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
useHead({ title: 'Cactify · Ficha de etiqueta' })

useBreadcrumbs().set([
  { label: 'Etiquetas', to: '/tags' },
  { label: 'Ficha de etiqueta' },
])
</script>

<template>
  <PendingSection title="Ficha de etiqueta" ticket="T-13" />
</template>
