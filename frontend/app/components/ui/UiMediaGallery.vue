<script setup lang="ts">
/**
 * La galería fotográfica de un ejemplar o de una especie (§8 del documento de producto).
 *
 * La ampliación reutiliza `UiDialog`: la retención de foco, el escape y la devolución del foco al
 * cerrar ya están resueltos y testeados ahí, y rehacerlos aquí serían dos implementaciones de lo
 * mismo, una de las cuales envejecería.
 *
 * **Toda imagen lleva texto alternativo**: es obligatorio en el tipo, no opcional. Una galería de
 * imágenes sin describir es una galería que no existe para quien no ve.
 *
 * Una galería vacía lo dice. Un hueco en blanco no distingue «no hay fotos» de «no han cargado».
 */
export interface GalleryImage {
  id: string
  src: string
  alt: string
  caption?: string
  primary?: boolean
}

withDefaults(defineProps<{
  images: GalleryImage[]
  emptyMessage?: string
}>(), { emptyMessage: 'Todavía no hay fotografías de este ejemplar.' })

const opened = ref<GalleryImage | null>(null)
</script>

<template>
  <section class="gallery" aria-label="Galería de fotografías">
    <p v-if="!images.length" class="gallery__empty">{{ emptyMessage }}</p>

    <ul v-else class="gallery__grid">
      <li
        v-for="image in images"
        :key="image.id"
        data-role="thumb"
        :data-primary="String(Boolean(image.primary))"
      >
        <button type="button" @click="opened = image">
          <img :src="image.src" :alt="image.alt">
        </button>
        <!-- La principal se lee, no solo se coloca la primera. -->
        <span v-if="image.primary" class="gallery__primary">Principal</span>
      </li>
    </ul>

    <UiDialog
      :open="opened !== null"
      :title="opened?.alt ?? ''"
      :footnote="opened?.caption"
      @close="opened = null"
    >
      <img v-if="opened" class="gallery__full" :src="opened.src" :alt="opened.alt">
    </UiDialog>
  </section>
</template>

<style scoped>
.gallery__empty {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: 0;
}

.gallery__grid {
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.gallery__grid li {
  position: relative;
}

.gallery__grid button {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  display: block;
  overflow: hidden;
  padding: 0;
  width: 100%;
}

.gallery__grid img {
  aspect-ratio: 1;
  display: block;
  object-fit: cover;
  width: 100%;
}

.gallery__primary {
  background: var(--color-brand);
  border-radius: var(--radius-pill);
  color: var(--color-sidebar-text);
  font-size: var(--font-size-11);
  font-weight: 700;
  left: var(--space-1);
  padding: 0 var(--space-2);
  position: absolute;
  top: var(--space-1);
}

.gallery__full {
  display: block;
  max-height: 70vh;
  max-width: 100%;
  object-fit: contain;
}
</style>
