<script setup lang="ts">
/**
 * El aviso de que un bloque sale de datos de ejemplo, con el ticket que lo sustituye.
 *
 * Existe una sola vez porque lo llevan todas las pantallas de la maqueta, y porque una marca
 * escrita a mano en cada una acaba diciendo cosas distintas. **Va en el bloque que simula**, no en
 * una advertencia general arriba que se lee una vez y se olvida: una pantalla con datos
 * inventados y sin marcar es indistinguible de una que funciona.
 */
defineProps<{
  /** El ticket que lo sustituye. «sin ticket» si ninguno del backlog lo recoge. */
  ticket: string
  /** Qué es de ejemplo, si no es todo el bloque. */
  what?: string
}>()
</script>

<template>
  <p class="mock-notice" data-test="mock-notice">
    <strong>Datos de ejemplo</strong>
    <span v-if="what"> · {{ what }}</span>
    · {{ ticket === 'sin ticket' ? 'Sin ticket que lo recoja todavía' : `Lo sustituye ${ticket}` }}
  </p>
</template>

<style scoped>
.mock-notice {
  background: var(--color-surface-muted);
  border: 1px dashed var(--color-line);
  border-radius: var(--radius-sm);
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-3);
  padding: var(--space-1) var(--space-2);
}
</style>
