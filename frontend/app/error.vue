<script setup lang="ts">
/**
 * La pantalla de una dirección que la aplicación no declara.
 *
 * No se confunde con una sección por construir: aquella existe en la navegación y llegará; esta
 * no existe y no va a llegar. Por eso ofrece salir a una sección conocida en lugar de nombrar un
 * ticket.
 *
 * `error.vue` sustituye al layout entero cuando Nuxt lo monta, así que la orientación no está
 * disponible aquí y la salida tiene que ser explícita.
 */
const props = defineProps<{ error: { statusCode: number, message?: string } }>()

const HOME = '/plants'

useHead({ title: `Cactify · ${props.error.statusCode}` })
</script>

<template>
  <div class="error-page">
    <UiEmptyState :title="`${error.statusCode} · esta dirección no existe`" mark="⌀">
      La página que buscabas no está en Cactify. Puede que el enlace esté mal escrito o que
      apunte a algo que ya no existe.
      <template #action>
        <UiButton :to="HOME">Ir a las plantas</UiButton>
      </template>
    </UiEmptyState>
  </div>
</template>

<style scoped>
.error-page {
  margin: 0 auto;
  max-width: var(--content-max);
  padding: var(--space-12) var(--space-4);
}
</style>
