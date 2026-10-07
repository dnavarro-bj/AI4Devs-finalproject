<script setup lang="ts">
/**
 * El aviso que acompaña a una tabla con selección múltiple cuando hay **más resultados que filas**:
 * «Seleccionadas las 25 de esta página — Seleccionar los 486 resultados». Elegir ampliar no cambia
 * nada por sí mismo: emite `select-all` y quien lo usa decide qué significa «todo el resultado»
 * (en el inventario, que el alcance pasa a ser la consulta y no una lista de identificadores).
 *
 * El raíz existe siempre y lleva `aria-live`: una región que se anuncia tiene que estar en el
 * documento **antes** de que cambie su contenido, o el lector de pantalla no la lee. Lo que no se
 * muestra es lo de dentro.
 */
const props = defineProps<{
  /** Las filas seleccionadas de la página. */
  pageCount: number
  /** Todos los resultados, de todas las páginas. */
  total: number
  /** La selección ya se ha ampliado a todo el resultado. */
  allSelected: boolean
}>()

defineEmits<{ 'select-all': [], clear: [] }>()

/** Ampliada, el aviso se queda aunque la página ya no esté entera marcada; sin ampliar, solo si hay algo que ampliar. */
const visible = computed(() => props.allSelected || props.total > props.pageCount)
</script>

<template>
  <div class="selection-banner" aria-live="polite">
    <p v-if="visible" class="selection-banner__text">
      <template v-if="allSelected">Seleccionados los {{ total }} resultados.</template>
      <template v-else>Seleccionadas las {{ pageCount }} de esta página.</template>
      <button v-if="allSelected" type="button" class="selection-banner__action" @click="$emit('clear')">
        Volver a la página
      </button>
      <button v-else type="button" class="selection-banner__action" @click="$emit('select-all')">
        Seleccionar los {{ total }} resultados
      </button>
    </p>
  </div>
</template>

<style scoped>
.selection-banner__text {
  align-items: center;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  color: var(--color-ink);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--font-size-13);
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-2) var(--space-3);
}

.selection-banner__action {
  background: none;
  border: 0;
  color: var(--color-brand);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  padding: 0;
  text-decoration: underline;
}

.selection-banner__action:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}
</style>
