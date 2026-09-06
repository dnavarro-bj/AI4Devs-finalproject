<script setup lang="ts">
/**
 * Un control sin rótulo que convive con campos en una misma fila —un botón de «Columnas» entre
 * filtros, por ejemplo— y queda alineado con ellos.
 *
 * El hueco lo hace **un rótulo vacío con el estilo de los rótulos de campo**, no un margen a
 * medida: así lo calcula la propia tipografía, y cambiar el tamaño del rótulo o el espaciado no
 * vuelve a descuadrarlo. Un número mágico aquí se rompe en el primer retoque del sistema.
 */
defineProps<{ label?: string }>()
</script>

<template>
  <div class="field-action">
    <label v-if="label">{{ label }}</label>
    <span v-else class="field-action__spacer" data-role="label-spacer" aria-hidden="true">&nbsp;</span>
    <slot />
  </div>
</template>

<style scoped>
.field-action {
  display: block;
}

/* Mismas métricas que `.field > label`: es lo que garantiza que el control quede a su altura. */
.field-action > label,
.field-action__spacer {
  display: block;
  font-size: var(--font-size-12);
  font-weight: 700;
  margin-bottom: var(--space-1);
}
</style>
