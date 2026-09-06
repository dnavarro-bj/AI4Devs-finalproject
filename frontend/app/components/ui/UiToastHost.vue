<script setup lang="ts">
/**
 * El contenedor de las confirmaciones, montado una sola vez en el armazón. Se anuncia como estado
 * cortés: informa sin robar el foco ni interrumpir lo que el usuario esté haciendo.
 */
import { useToast } from '@shared/composables/useToast'
const { toasts } = useToast()
</script>

<template>
  <div class="toast-host" role="status" aria-live="polite">
    <p v-for="toast in toasts" :key="toast.id" class="toast">{{ toast.message }}</p>
  </div>
</template>

<style scoped>
.toast-host {
  bottom: var(--space-6);
  display: grid;
  gap: var(--space-2);
  justify-items: center;
  left: 0;
  pointer-events: none;
  position: fixed;
  right: 0;
  z-index: 120;
}

.toast:empty {
  display: none;
}

.toast {
  background: var(--color-ink);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-overlay);
  color: var(--color-sidebar-text);
  font-size: var(--font-size-13);
  margin: 0;
  padding: var(--space-3) var(--space-4);
}
</style>
