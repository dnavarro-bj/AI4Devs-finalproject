<script setup lang="ts">
/**
 * La cabecera de una pantalla: su título, un contexto opcional y sus acciones principales.
 *
 * Existe para que ninguna pantalla resuelva esa composición por su cuenta; sin ella, cada una
 * elige su propio tamaño de título y su propia alineación, y la aplicación deja de parecer una.
 *
 * El título es el `h1` de la pantalla: hay exactamente uno y dice dónde está el usuario.
 */
defineProps<{ title: string, context?: string }>()
</script>

<template>
  <header class="page-header">
    <div class="page-header__text">
      <h1>{{ title }}</h1>
      <p v-if="context" class="page-header__context" data-test="page-context">{{ context }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions" data-test="page-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  align-items: flex-start;
  display: flex;
  gap: var(--space-4);
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.page-header h1 {
  font-size: var(--font-size-24);
  letter-spacing: -0.02em;
  margin: 0;
}

.page-header__context {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: var(--space-1) 0 0;
}

.page-header__actions {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: var(--space-2);
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
  }
}
</style>
