<script setup lang="ts">
/**
 * Filtro aplicado. Se retira en un solo gesto y sin abrir ningún menú; el aspa es decorativa y el
 * nombre accesible va en texto.
 */
defineProps<{ label: string }>()
defineEmits<{ remove: [] }>()
</script>

<template>
  <span class="filter-chip">
    {{ label }}
    <button type="button" @click="$emit('remove')">
      <span aria-hidden="true">×</span>
      <span class="sr-only">Quitar filtro {{ label }}</span>
    </button>
  </span>
</template>

<style scoped>
.filter-chip {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-pill);
  color: var(--color-brand-strong);
  display: inline-flex;
  font-size: var(--font-size-12);
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
}

.filter-chip button {
  background: transparent;
  border: 0;
  border-radius: var(--radius-pill);
  color: inherit;
  font-weight: 800;
  line-height: 1;
  padding: var(--space-1);
}
</style>
