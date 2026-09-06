<script setup lang="ts">
/**
 * Un bloque de un formulario largo.
 *
 * Los formularios se dividen en **bloques con significado para el usuario, no según la estructura
 * interna de la base de datos** (§2.1 del documento de producto): «Identidad», «Cuidados»,
 * «Procedencia» — no «campos de la tabla plant».
 *
 * La sección queda nombrada por su título para las tecnologías de asistencia, de modo que recorrer
 * el formulario diga en qué bloque se está.
 */
defineProps<{ title: string, description?: string }>()

const titleId = useId()
</script>

<template>
  <section class="form-section" :aria-labelledby="titleId">
    <header>
      <h3 :id="titleId">{{ title }}</h3>
      <p v-if="description" data-test="section-description">{{ description }}</p>
    </header>
    <div class="form-section__body"><slot /></div>
  </section>
</template>

<style scoped>
.form-section + .form-section {
  border-top: 1px solid var(--color-line);
  margin-top: var(--space-6);
  padding-top: var(--space-6);
}

.form-section h3 {
  font-size: var(--font-size-15);
  margin: 0;
}

.form-section header p {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-1) 0 0;
}

.form-section__body {
  margin-top: var(--space-4);
}
</style>
