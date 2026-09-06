<script setup lang="ts">
/**
 * Un grupo de la navegación lateral: su encabezado y sus entradas.
 *
 * El encabezado **agrupa y no navega** (§3.1 del documento de producto): no es un enlace ni un
 * botón, para que quien recorre la navegación con el teclado no se detenga en algo que no lleva
 * a ninguna parte.
 *
 * No decide qué está activo: recibe la ruta actual y la compara. Así el layout calcula la ruta
 * una vez y todos los grupos coinciden.
 *
 * No conoce el mapa de secciones de la aplicación: declara la forma mínima que necesita pintar.
 * Un componente del kit que importara de una feature invertiría la dependencia.
 */
const props = defineProps<{
  label: string
  entries: { label: string, to: string, mark: string }[]
  activePath?: string
}>()

/** Activa la entrada que **contiene** la ruta, no solo la que coincide: `/plants/1` es Plantas. */
const isActive = (to: string) =>
  !!props.activePath && (props.activePath === to || props.activePath.startsWith(`${to}/`))
</script>

<template>
  <div class="nav-group">
    <p class="nav-group__label" data-test="group-label">{{ label }}</p>
    <NuxtLink
      v-for="entry in entries"
      :key="entry.to"
      :to="entry.to"
      :class="{ 'is-active': isActive(entry.to) }"
      :aria-current="isActive(entry.to) ? 'page' : undefined"
    >
      <span aria-hidden="true">{{ entry.mark }}</span>
      {{ entry.label }}
    </NuxtLink>
  </div>
</template>

<style scoped>
.nav-group {
  margin-bottom: var(--space-4);
}

.nav-group__label {
  color: color-mix(in srgb, var(--color-sidebar-text) 52%, transparent);
  font-size: var(--font-size-11);
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 0 0 var(--space-1);
  padding: 0 var(--space-2);
  text-transform: uppercase;
}

.nav-group a {
  align-items: center;
  border-radius: var(--radius-sm);
  color: color-mix(in srgb, var(--color-sidebar-text) 82%, transparent);
  display: grid;
  font-size: var(--font-size-13);
  gap: var(--space-2);
  grid-template-columns: 24px 1fr;
  margin: 2px 0;
  min-height: 38px;
  padding: var(--space-1) var(--space-2);
  text-decoration: none;
}

.nav-group a:hover {
  background: color-mix(in srgb, var(--color-sidebar-text) 8%, transparent);
  color: var(--color-sidebar-text);
}

/* La sección activa no se distingue solo por color: cambia también el peso y el fondo. */
.nav-group a.is-active {
  background: var(--color-brand);
  color: var(--color-sidebar-text);
  font-weight: 700;
}
</style>
