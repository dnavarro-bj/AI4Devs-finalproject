<script setup lang="ts">
/**
 * La portada de una especie o de un ejemplar: su imagen principal con el recuento de fotografías
 * (`species-detail` y `plant-detail` del prototipo).
 *
 * Es de las dos fichas, así que es del kit. **No sabe de dónde viene la imagen**: recibe la ruta y
 * el texto alternativo, que es obligatorio cuando hay imagen. El recuento puede ser un botón
 * —`countAction`— que emite `count` para llevar a la galería; quien lo usa decide adónde.
 *
 * Sin imagen dice «Sin fotografía» y **no pinta ningún recuento**: «0 fotos» o una cifra de ejemplo
 * en un hueco en blanco no distinguiría una planta sin fotos de una pantalla rota.
 */
withDefaults(defineProps<{
  src?: string
  alt?: string
  count?: number
  size?: 'sm' | 'lg'
  countAction?: boolean
}>(), { src: undefined, alt: undefined, count: 0, size: 'lg', countAction: false })

defineEmits<{ count: [] }>()
</script>

<template>
  <div
    class="cover"
    :class="`is-${size}`"
    :role="src ? undefined : 'img'"
    :aria-label="src ? undefined : 'Sin fotografía'"
  >
    <img v-if="src" class="cover__image" :src="src" :alt="alt ?? ''">
    <div v-else class="cover__empty" aria-hidden="true">
      <span class="cover__mark">✺</span>
      <small>Sin fotografía</small>
    </div>

    <template v-if="src && count > 0">
      <button v-if="countAction" type="button" class="cover__count" @click="$emit('count')">
        {{ count }} {{ count === 1 ? 'foto' : 'fotos' }}
      </button>
      <span v-else class="cover__count">{{ count }} {{ count === 1 ? 'foto' : 'fotos' }}</span>
    </template>
  </div>
</template>

<style scoped>
.cover {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  overflow: hidden;
  position: relative;
}

.cover.is-lg {
  aspect-ratio: 4 / 3;
  min-height: 200px;
  width: min(380px, 100%);
}

.cover.is-sm {
  aspect-ratio: 1;
  height: 96px;
  width: 96px;
}

.cover__image {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.cover__empty {
  align-content: center;
  color: var(--color-ink-muted);
  display: grid;
  gap: var(--space-1);
  height: 100%;
  justify-items: center;
  text-align: center;
}

.cover__mark {
  color: var(--color-brand);
  font-size: var(--font-size-24);
}

.cover__empty small {
  font-size: var(--font-size-11);
}

.cover__count {
  background: color-mix(in srgb, var(--color-ink) 84%, transparent);
  border: 0;
  border-radius: var(--radius-pill);
  bottom: var(--space-2);
  color: var(--color-surface);
  font: inherit;
  font-size: var(--font-size-11);
  font-weight: 700;
  padding: var(--space-1) var(--space-3);
  position: absolute;
  right: var(--space-2);
}

button.cover__count {
  cursor: pointer;
}

.cover.is-sm .cover__count {
  display: none;
}
</style>
