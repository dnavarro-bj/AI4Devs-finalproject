<script setup lang="ts">
/**
 * La ruta hasta la pantalla actual. Todas las pantallas la tienen (components.md); el último nivel
 * es la página en la que se está y no es un enlace.
 */
defineProps<{ items: { label: string, to?: string }[] }>()
</script>

<template>
  <nav class="breadcrumbs" aria-label="Ruta de navegación">
    <ol>
      <li
        v-for="(item, index) in items"
        :key="item.label"
        :aria-current="index === items.length - 1 ? 'page' : undefined"
      >
        <NuxtLink v-if="item.to && index < items.length - 1" :to="item.to">{{ item.label }}</NuxtLink>
        <span v-else>{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumbs ol {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.breadcrumbs li {
  align-items: center;
  color: var(--color-ink-muted);
  display: flex;
  font-size: var(--font-size-12);
}

.breadcrumbs li + li::before {
  color: var(--color-ink-faint);
  content: "/";
  margin-right: var(--space-2);
}

.breadcrumbs a {
  color: var(--color-brand);
}
</style>
