<script setup lang="ts">
/**
 * Recorrido por páginas de un listado.
 *
 * `page` es 0-based, como el envelope `PageResponse` del API (ADR-009), pero lo que se muestra
 * cuenta desde uno: nadie lee «página 0 de 7».
 *
 * Emite **la página pedida**, no un incremento: quien recibe el evento no tiene que saber desde
 * dónde se saltaba, y dos clics rápidos no se suman en algo que nadie pidió.
 *
 * Con una sola página no se pinta. Un recorrido de un solo paso no es un recorrido, y ocupar sitio
 * con dos botones apagados es peor que no estar.
 */
const props = withDefaults(defineProps<{
  page: number
  totalPages: number
  loading?: boolean
  label?: string
}>(), { loading: false, label: 'Paginación' })

defineEmits<{ 'update:page': [number] }>()

const hasPages = computed(() => props.totalPages > 1)
const isFirst = computed(() => props.page <= 0)
const isLast = computed(() => props.page >= props.totalPages - 1)
</script>

<template>
  <nav v-if="hasPages" class="pager" :aria-label="label">
    <UiButton
      variant="secondary"
      data-test="previous-page"
      :disabled="isFirst || loading"
      @click="$emit('update:page', page - 1)"
    >
      Anterior
    </UiButton>

    <span data-test="page-indicator">Página {{ page + 1 }} de {{ totalPages }}</span>

    <UiButton
      variant="secondary"
      data-test="next-page"
      :disabled="isLast || loading"
      @click="$emit('update:page', page + 1)"
    >
      Siguiente
    </UiButton>
  </nav>
</template>

<style scoped>
.pager {
  align-items: center;
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  margin-top: var(--space-5);
}

.pager span {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
}
</style>
