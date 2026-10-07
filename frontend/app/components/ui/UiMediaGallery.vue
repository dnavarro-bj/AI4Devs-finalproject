<script setup lang="ts">
import type { ActionMenuItem } from './UiActionMenu.vue'

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
 *
 * **Modo de gestión** (`manage`): cada imagen gana su menú —portada, editar, mover, borrar— y la
 * galería **emite** lo que se pide (`primary`, `edit`, `remove`, `reorder` con la lista entera de
 * identificadores) sin saber qué hace cada cosa. Reordenar no depende del ratón: «Mover antes» y
 * «Mover después» son acciones del menú, que se recorre con el teclado, y tras moverse el foco
 * vuelve al menú de la imagen movida. Una imagen `uploading` o con `error` lo dice con texto y no
 * ofrece acciones. Sin el modo, la galería es la de siempre.
 */
export interface GalleryImage {
  id: string
  src: string
  /** La miniatura de la rejilla; `src` es la que se muestra al ampliar. */
  thumbSrc?: string
  alt: string
  caption?: string
  primary?: boolean
  /** Un enlace en la ampliación —por ejemplo, al evento del que cuelga la foto—. */
  link?: { label: string, to: string }
  /** Solo en el modo de gestión: una subida en curso o fallida. */
  status?: 'uploading' | 'error'
  statusText?: string
}

const props = withDefaults(defineProps<{
  images: GalleryImage[]
  emptyMessage?: string
  manage?: boolean
  /** En el modo de gestión: sin «Mover antes/después» cuando el orden lo decide otra cosa (la fecha). */
  reorderable?: boolean
  /** En el modo de gestión: sin «Editar» si quien la usa no puede corregir la imagen (fotos aún locales). */
  editable?: boolean
  /** En el modo de gestión: sin «Hacer principal» cuando no hay portada que elegir (las fotos de un evento). */
  primaryable?: boolean
  /** Cómo se llama la acción destructiva: «Borrar» por defecto; «Quitar del evento» donde la imagen no se borra. */
  removeLabel?: string
}>(), {
  emptyMessage: 'Todavía no hay fotografías de este ejemplar.',
  manage: false,
  reorderable: true,
  editable: true,
  primaryable: true,
  removeLabel: 'Borrar',
})

const emit = defineEmits<{
  primary: [id: string]
  edit: [id: string]
  remove: [id: string]
  reorder: [ids: string[]]
}>()

const opened = ref<GalleryImage | null>(null)
const root = ref<HTMLElement | null>(null)
let refocus: string | null = null

function actionsFor(image: GalleryImage, index: number): ActionMenuItem[] {
  return [
    ...(image.primary || !props.primaryable ? [] : [{ id: 'primary', label: 'Hacer principal' }]),
    ...(props.editable ? [{ id: 'edit', label: 'Editar texto y fecha' }] : []),
    ...(props.reorderable
      ? [
          { id: 'before', label: 'Mover antes', disabled: index === 0 },
          { id: 'after', label: 'Mover después', disabled: index === props.images.length - 1 },
        ]
      : []),
    { id: 'remove', label: props.removeLabel, tone: 'danger' as const },
  ]
}

function onAction(image: GalleryImage, index: number, action: string) {
  if (action === 'primary') emit('primary', image.id)
  else if (action === 'edit') emit('edit', image.id)
  else if (action === 'remove') emit('remove', image.id)
  else if (action === 'before' || action === 'after') {
    const ids = props.images.map((entry) => entry.id)
    const target = action === 'before' ? index - 1 : index + 1
    ids.splice(index, 1)
    ids.splice(target, 0, image.id)
    refocus = image.id
    emit('reorder', ids)
  }
}

/** Mover reordena los nodos: el foco se devuelve al menú de la imagen movida cuando el orden llega. */
watch(() => props.images.map((image) => image.id).join(','), async () => {
  if (!refocus) return
  const id = refocus
  refocus = null
  await nextTick()
  const trigger = [...(root.value?.querySelectorAll<HTMLElement>('[data-role="thumb"]') ?? [])]
    .find((node) => node.dataset.imageId === id)
    ?.querySelector<HTMLElement>('.action-menu__trigger')
  trigger?.focus()
})
</script>

<template>
  <section ref="root" class="gallery" aria-label="Galería de fotografías">
    <p v-if="!images.length" class="gallery__empty">{{ emptyMessage }}</p>

    <ul v-else class="gallery__grid">
      <li
        v-for="(image, index) in images"
        :key="image.id"
        data-role="thumb"
        :data-image-id="image.id"
        :data-primary="String(Boolean(image.primary))"
        :data-status="image.status"
      >
        <button type="button" @click="opened = image">
          <img :src="image.thumbSrc ?? image.src" :alt="image.alt">
        </button>
        <!-- La principal se lee, no solo se coloca la primera. -->
        <span v-if="image.primary" class="gallery__primary">Principal</span>
        <span
          v-if="image.status"
          class="gallery__status"
          :class="`is-${image.status}`"
          :role="image.status === 'error' ? 'alert' : 'status'"
        >{{ image.statusText ?? (image.status === 'uploading' ? 'Subiendo…' : 'No se ha podido subir') }}</span>
        <UiActionMenu
          v-if="manage && !image.status"
          class="gallery__menu"
          :label="`Acciones de la fotografía «${image.alt}»`"
          :actions="actionsFor(image, index)"
          @select="onAction(image, index, $event)"
        />
      </li>
    </ul>

    <UiDialog
      :open="opened !== null"
      :title="opened?.alt ?? ''"
      :footnote="opened?.caption"
      @close="opened = null"
    >
      <img v-if="opened" class="gallery__full" :src="opened.src" :alt="opened.alt">
      <p v-if="opened?.link" class="gallery__link">
        <NuxtLink :to="opened.link.to" @click="opened = null">{{ opened.link.label }}</NuxtLink>
      </p>
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

.gallery__status {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  bottom: var(--space-1);
  color: var(--color-ink);
  font-size: var(--font-size-11);
  left: var(--space-1);
  padding: var(--space-1) var(--space-2);
  position: absolute;
  right: var(--space-1);
}

.gallery__status.is-error {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.gallery__menu {
  position: absolute;
  right: var(--space-1);
  top: var(--space-1);
}

.gallery__menu :deep(.action-menu__trigger) {
  background: var(--color-surface);
  border-color: var(--color-line);
}

.gallery__link {
  margin: var(--space-3) 0 0;
}

.gallery__full {
  display: block;
  max-height: 70vh;
  max-width: 100%;
  object-fit: contain;
}
</style>
