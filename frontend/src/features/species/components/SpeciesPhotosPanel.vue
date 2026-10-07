<script setup lang="ts">
/**
 * La pestaña «Fotografías» de la ficha de la especie: la galería de referencia, con subida,
 * portada, orden, texto alternativo y autoría. Es el panel común de `media` con el dueño puesto;
 * el caso de uso lo crea la ficha y lo comparte con su cabecera.
 */
import type { useMediaGallery } from '@features/media/composables/useMediaGallery'

defineProps<{
  speciesId: string
  speciesName: string
  gallery: ReturnType<typeof useMediaGallery>
}>()
</script>

<template>
  <PhotoGalleryPanel
    class="species-photos"
    :owner="{ kind: 'species', id: speciesId }"
    :subject="speciesName"
    :gallery="gallery"
    title="Fotografías de referencia"
    :description="`Vista general, detalles distintivos y floración de ${speciesName}.`"
  />
</template>

<style scoped>
.species-photos {
  margin-top: var(--space-5);
}
</style>
