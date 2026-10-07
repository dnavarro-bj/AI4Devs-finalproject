<script setup lang="ts">
/**
 * La navegación de grupos: una fila de tarjetas con símbolo, nombre y subtítulo en la que **una**
 * puede estar seleccionada, como `species-groups` en el prototipo.
 *
 * No sabe qué es un grupo del producto: recibe `{ id, label, hint?, symbol?, tone? }` y emite el
 * `id` elegido. **No cambia por sí misma**: quien la usa decide qué está seleccionado, que en el
 * catálogo de especies es lo que coincide con la URL. Con `modelValue` nulo, ninguna se marca.
 *
 * Cada grupo es un botón con `aria-pressed`: se alcanza con Tab y se activa con Intro o Espacio,
 * y la selección se distingue por forma —el fondo oscuro— además de por el atributo.
 */
export interface GroupNavItem {
  id: string
  label: string
  hint?: string
  symbol?: string
  /** Matiz del símbolo; sin él, el neutro de la marca. */
  tone?: 'warning' | 'info'
}

defineProps<{ groups: GroupNavItem[], modelValue: string | null }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <nav class="group-nav" aria-label="Grupos">
    <button
      v-for="group in groups"
      :key="group.id"
      type="button"
      class="group-nav__item"
      :class="[{ 'is-selected': group.id === modelValue }, group.tone ? `is-${group.tone}` : '']"
      :aria-pressed="group.id === modelValue ? 'true' : 'false'"
      @click="$emit('update:modelValue', group.id)"
    >
      <span class="group-nav__symbol" aria-hidden="true">{{ group.symbol ?? '◇' }}</span>
      <span class="group-nav__text">
        <strong>{{ group.label }}</strong>
        <small v-if="group.hint">{{ group.hint }}</small>
      </span>
    </button>
  </nav>
</template>

<style scoped>
.group-nav {
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.group-nav__item {
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  color: var(--color-ink);
  cursor: pointer;
  display: grid;
  font: inherit;
  gap: var(--space-2);
  grid-template-columns: auto 1fr;
  min-height: 68px;
  padding: var(--space-2) var(--space-3);
  text-align: left;
}

.group-nav__item.is-selected {
  background: var(--color-brand-strong);
  border-color: var(--color-brand-strong);
  color: var(--color-surface);
}

.group-nav__text strong,
.group-nav__text small {
  display: block;
}

.group-nav__text strong {
  font-size: var(--font-size-12);
}

.group-nav__text small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin-top: 2px;
}

.group-nav__item.is-selected small {
  color: color-mix(in srgb, var(--color-surface) 75%, var(--color-brand-strong));
}

.group-nav__symbol {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: 50%;
  color: var(--color-brand);
  display: flex;
  font-size: var(--font-size-17);
  height: 36px;
  justify-content: center;
  width: 36px;
}

.group-nav__item.is-selected .group-nav__symbol {
  background: color-mix(in srgb, var(--color-surface) 18%, transparent);
  color: var(--color-surface);
}

.group-nav__item.is-warning:not(.is-selected) .group-nav__symbol {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.group-nav__item.is-info:not(.is-selected) .group-nav__symbol {
  background: var(--color-info-soft);
  color: var(--color-info);
}
</style>
