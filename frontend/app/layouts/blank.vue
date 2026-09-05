<script setup lang="ts">
/**
 * Layout sin armazón de producto. Lo usa la galería del kit, que no es una sección de la
 * aplicación y no debe arrastrar ni navegación ni breadcrumbs (ADR-014).
 */
</script>

<template>
  <div class="blank">
    <slot />
  </div>
</template>

<style scoped>
.blank {
  margin: 0 auto;
  max-width: var(--content-max);
  min-height: 100vh;
  padding: var(--space-8);
}
</style>
