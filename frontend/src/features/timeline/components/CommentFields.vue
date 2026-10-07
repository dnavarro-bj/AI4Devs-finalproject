<script setup lang="ts">
/**
 * El texto de un comentario. Es el cuerpo que comparten el diálogo de un comentario y el de lote:
 * no guarda nada, edita el texto que recibe y enseña el error que le dan.
 */
defineProps<{ modelValue: string, error?: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <UiField
    :model-value="modelValue"
    label="Comentario"
    as="textarea"
    :rows="4"
    :error="error"
    error-test="comment-text-error"
    data-test="comment-text"
    @update:model-value="$emit('update:modelValue', String($event))"
  />
</template>
