<script setup lang="ts">
/**
 * Navegación de las secciones de un formulario largo.
 *
 * Un formulario dividido en bloques (§2.1) necesita decir **dónde estás y qué queda**: sin ella,
 * un editor de seis secciones obliga a recorrerlo entero para saber si falta algo.
 *
 * No son pestañas: las pestañas cambian de vista y esto recorre un mismo formulario, así que se
 * expone como navegación y no como `tablist`.
 */
withDefaults(defineProps<{
  sections: { value: string, label: string }[]
  modelValue: string
  /** Secciones ya completas. Se anuncian con texto, no solo con una marca visual. */
  done?: string[]
  label?: string
}>(), { done: () => [], label: 'Secciones del formulario' })

defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <nav class="editor-nav" :aria-label="label">
    <button
      v-for="section in sections"
      :key="section.value"
      type="button"
      :class="{ 'is-active': section.value === modelValue }"
      :aria-current="section.value === modelValue ? 'true' : undefined"
      :data-done="done.includes(section.value) ? 'true' : undefined"
      @click="$emit('update:modelValue', section.value)"
    >
      {{ section.label }}
      <span v-if="done.includes(section.value)" class="editor-nav__done">completa</span>
    </button>
  </nav>
</template>

<style scoped>
/*
 * Tarjeta propia y pegada al scroll: en un formulario largo la navegación tiene que seguir a la
 * vista mientras se recorre, o deja de servir justo cuando hace falta.
 */
.editor-nav {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  display: grid;
  height: fit-content;
  overflow: hidden;
  position: sticky;
  top: calc(var(--topbar-height) + var(--space-4));
}

.editor-nav button {
  align-items: center;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  display: flex;
  font: inherit;
  font-size: var(--font-size-12);
  gap: var(--space-2);
  justify-content: space-between;
  min-height: 43px;
  padding: var(--space-2) var(--space-3);
  text-align: left;
  width: 100%;
}

.editor-nav button:first-child {
  border-top: 0;
}

/* La sección actual no se distingue solo por color: gana fondo y peso. */
.editor-nav button.is-active {
  background: var(--color-brand-soft);
  color: var(--color-brand-strong);
  font-weight: 800;
}

.editor-nav__done {
  color: var(--color-brand);
  font-size: var(--font-size-11);
}
</style>
