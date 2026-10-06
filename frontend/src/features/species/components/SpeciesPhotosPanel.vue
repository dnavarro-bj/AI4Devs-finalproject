<script setup lang="ts">
/**
 * La vista fotográfica de una especie antes de T-19. Conserva la composición definitiva —portada,
 * galería y subida— sin simular que hay binarios guardados ni que el botón ya funciona.
 */
defineProps<{ speciesName: string }>()
</script>

<template>
  <section class="photos" data-test="photos-view" data-mock="true">
    <UiSectionHeader
      title="Fotografías de referencia"
      :description="`Vista general, detalles distintivos y floración de ${speciesName}.`"
    >
      <template #actions>
        <UiButton disabled data-mock="true">Añadir fotografías</UiButton>
      </template>
    </UiSectionHeader>

    <div class="photos__layout">
      <div class="photos__cover" role="img" :aria-label="`Sin fotografía principal de ${speciesName}`">
        <span aria-hidden="true">✺</span>
        <div>
          <strong>Sin imagen principal</strong>
          <small>La portada se elegirá desde la galería.</small>
        </div>
      </div>

      <aside class="photos__aside">
        <UiUploadArea
          disabled
          label="Subir fotografías de referencia"
          hint="JPG, PNG o WebP · límites pendientes del ADR de fotografías"
          action-label="Seleccionar imágenes"
          accept="image/jpeg,image/png,image/webp"
        />
        <p>
          La subida, el orden, el texto alternativo y la imagen principal llegan con
          <strong>T-19</strong>.
        </p>
      </aside>
    </div>

    <div class="photos__gallery">
      <UiSectionHeader title="Galería" description="Las imágenes se ordenarán y podrán ampliarse." />
      <UiMediaGallery
        :images="[]"
        empty-message="Todavía no hay fotografías guardadas para esta especie."
      />
    </div>
  </section>
</template>

<style scoped>
.photos {
  display: grid;
  gap: var(--space-5);
  margin-top: var(--space-5);
}

.photos__layout {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
}

.photos__cover {
  align-items: end;
  aspect-ratio: 16 / 7;
  background:
    radial-gradient(circle at 50% 45%, var(--color-brand-soft) 0 18%, transparent 19% 33%),
    radial-gradient(circle at 50% 45%, var(--color-brand) 0 33%, var(--color-warning-soft) 34% 100%);
  border-radius: var(--radius-md);
  color: var(--color-surface);
  display: flex;
  justify-content: space-between;
  min-height: 260px;
  overflow: hidden;
  padding: var(--space-4);
}

.photos__cover > span {
  align-self: center;
  font-size: var(--font-size-38);
  margin: auto;
}

.photos__cover > div {
  background: color-mix(in srgb, var(--color-ink) 84%, transparent);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
}

.photos__cover strong,
.photos__cover small {
  display: block;
}

.photos__cover strong { font-size: var(--font-size-13); }
.photos__cover small { font-size: var(--font-size-11); margin-top: var(--space-1); }

.photos__aside {
  align-content: start;
  display: grid;
  gap: var(--space-3);
}

.photos__aside p {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  line-height: 1.6;
  margin: 0;
}

.photos__aside strong {
  border: 1px dashed var(--color-line-strong);
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  padding: 0 2px;
}

.photos__gallery {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

@media (max-width: 820px) {
  .photos__layout { grid-template-columns: 1fr; }
}
</style>
