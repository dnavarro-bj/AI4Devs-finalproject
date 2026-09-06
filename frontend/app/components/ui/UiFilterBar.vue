<script setup lang="ts">
/**
 * La barra de filtros de un listado: los controles de filtrado y, debajo, los criterios ya
 * aplicados como filtros retirables.
 *
 * **No decide nada.** Emite qué criterio se ha retirado y quien lo retira de verdad es la
 * pantalla, que es la que sabe cómo se traduce a la petición del API. Por eso seguir pintando el
 * criterio después del evento no es un fallo: es que todavía está aplicado.
 *
 * Sin criterios aplicados no ofrece limpiar, porque no habría nada que limpiar.
 */
withDefaults(defineProps<{
  applied: { id: string, label: string }[]
  label?: string
}>(), { label: 'Filtros' })

defineEmits<{ remove: [string], clear: [] }>()
</script>

<template>
  <section class="filter-bar" :aria-label="label">
    <div v-if="$slots.default" class="filter-bar__controls" data-test="filter-controls">
      <slot />
    </div>

    <div v-if="applied.length" class="filter-bar__applied">
      <UiFilterChip
        v-for="criterion in applied"
        :key="criterion.id"
        :label="criterion.label"
        @remove="$emit('remove', criterion.id)"
      />
      <UiButton variant="text" data-test="clear-filters" @click="$emit('clear')">
        Limpiar filtros
      </UiButton>
    </div>
  </section>
</template>

<style scoped>
.filter-bar {
  display: grid;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.filter-bar__controls,
.filter-bar__applied {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
