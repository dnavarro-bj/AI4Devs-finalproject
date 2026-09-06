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
 *
 * Es un `fieldset` con su `legend`, que es el elemento que **agrupa controles de formulario**: el
 * grupo queda nombrado nativamente, sin depender de un `aria-label`. La leyenda va oculta porque
 * la barra ya se entiende por su contenido.
 */
withDefaults(defineProps<{
  applied: { id: string, label: string }[]
  label?: string
}>(), { label: 'Filtros' })

defineEmits<{ remove: [string], clear: [] }>()
</script>

<template>
  <fieldset class="filter-bar">
    <legend class="sr-only">{{ label }}</legend>

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
  </fieldset>
</template>

<style scoped>
.filter-bar {
  border: 0;
  display: grid;
  gap: var(--space-2);
  margin: 0 0 var(--space-4);
  min-width: 0;
  padding: 0;
}

/*
 * Los controles alinean **arriba**, no al centro: como el rótulo tiene altura uniforme, alinear
 * las cajas por su borde superior alinea los rótulos y, con ellos, los controles. La ayuda cuelga
 * debajo y da igual cuánto ocupe. Con `center`, un campo con ayuda desplazaba su control respecto
 * a los que no la tenían.
 */
.filter-bar__controls {
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.filter-bar__applied {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
