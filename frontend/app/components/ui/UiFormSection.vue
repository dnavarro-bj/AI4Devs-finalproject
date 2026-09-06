<script setup lang="ts">
/**
 * Un bloque de un formulario largo.
 *
 * Los formularios se dividen en **bloques con significado para el usuario, no según la estructura
 * interna de la base de datos** (§2.1 del documento de producto): «Identificación», «Origen y
 * edad», «Cuidados efectivos» — no «campos de la tabla plant».
 *
 * Es un `fieldset` con su `legend`, que es el elemento que **agrupa controles de formulario**: así
 * el bloque queda nombrado nativamente para las tecnologías de asistencia, sin necesidad de
 * referenciar un título con `aria-labelledby`.
 *
 * `standalone` le da superficie propia: cuando cada sección es su propia tarjeta —el editor de
 * planta— en lugar de bloques separados por una línea dentro de un panel.
 */
withDefaults(defineProps<{
  title: string
  description?: string
  standalone?: boolean
}>(), { description: undefined, standalone: false })
</script>

<template>
  <fieldset class="form-section" :class="{ 'is-standalone': standalone }">
    <legend>{{ title }}</legend>
    <p v-if="description" data-test="section-description">{{ description }}</p>
    <div class="form-section__body"><slot /></div>
  </fieldset>
</template>

<style scoped>
.form-section {
  border: 0;
  margin: 0;
  min-width: 0;
  padding: 0;
}

.form-section legend {
  font-size: var(--font-size-15);
  font-weight: 800;
  padding: 0;
}

.form-section > p {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-1) 0 0;
}

.form-section__body {
  margin-top: var(--space-4);
}

/* Dentro de un panel, las secciones se separan con una línea. */
.form-section:not(.is-standalone) + .form-section:not(.is-standalone) {
  border-top: 1px solid var(--color-line);
  margin-top: var(--space-6);
  padding-top: var(--space-6);
}

/* Con superficie propia: cada sección es una tarjeta, y deja hueco al desplazarse hasta ella. */
.form-section.is-standalone {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  scroll-margin-top: calc(var(--topbar-height) + var(--space-4));
}

.form-section.is-standalone legend {
  padding: 0 var(--space-1);
}
</style>
