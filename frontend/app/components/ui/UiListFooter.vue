<script setup lang="ts">
const props = defineProps<{
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
  loading?: boolean
  label?: string
}>()

defineEmits<{ 'update:page': [number] }>()

const start = computed(() => props.totalElements ? props.page * props.pageSize + 1 : 0)
const end = computed(() => Math.min((props.page + 1) * props.pageSize, props.totalElements))
</script>

<template>
  <footer class="list-footer">
    <span>{{ start }}–{{ end }} de {{ totalElements }} resultados</span>
    <UiPagination
      :page="page"
      :total-pages="totalPages"
      :loading="loading"
      :label="label"
      @update:page="$emit('update:page', $event)"
    />
  </footer>
</template>

<style scoped>
.list-footer {
  align-items: center;
  color: var(--color-ink-muted);
  display: flex;
  font-size: var(--font-size-13);
  gap: var(--space-4);
  justify-content: space-between;
  margin-top: var(--space-3);
}

.list-footer :deep(.pager) { margin-top: 0; }
</style>
